import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { startOfDay, endOfDay } from 'date-fns';
import { Camera, MapPin, CheckCircle, AlertCircle, Shield, RefreshCw, UserCheck } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../App';
import { calculateDistance, cn } from '../lib/utils';
import * as faceapi from 'face-api.js';

interface AttendancePageProps {
  user: FirebaseUser;
  profile: UserProfile | null;
}

export default function AttendancePage({ user, profile }: AttendancePageProps) {
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [office, setOffice] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [attendanceType, setAttendanceType] = useState<'check-in' | 'check-out'>('check-in');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading models:", err);
        setStatus({ type: 'error', message: 'Gagal memuat model pengenalan wajah.' });
      }
    };

    loadModels();
    fetchLocation();
    fetchOfficeAndShift();
    checkTodayAttendance();
  }, [profile]);

  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setStatus({ type: 'error', message: 'Gagal mendapatkan lokasi. Pastikan GPS aktif.' });
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const fetchOfficeAndShift = async () => {
    if (!profile) return;
    
    try {
      if (profile.officeId) {
        const officeSnap = await getDocs(query(collection(db, 'offices')));
        const officeData = officeSnap.docs.find(doc => doc.id === profile.officeId)?.data();
        setOffice(officeData);
      }

      if (profile.shiftId) {
        const shiftSnap = await getDocs(query(collection(db, 'shifts')));
        const shiftData = shiftSnap.docs.find(doc => doc.id === profile.shiftId)?.data();
        setShift(shiftData);
      }
    } catch (err) {
      console.error("Error fetching office/shift:", err);
    }
  };

  const checkTodayAttendance = async () => {
    const today = new Date();
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', startOfDay(today).toISOString()),
      where('timestamp', '<=', endOfDay(today).toISOString())
    );
    
    const snap = await getDocs(q);
    const logs = snap.docs.map(d => d.data());
    if (logs.some(l => l.type === 'check-in')) {
      setAttendanceType('check-out');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (location && office) {
      const dist = calculateDistance(location.lat, location.lng, office.location.lat, office.location.lng);
      setDistance(dist);
      setIsWithinRadius(dist <= office.radius);
    }
  }, [location, office]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error starting camera:", err);
      setStatus({ type: 'error', message: 'Gagal mengakses kamera.' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const detectFace = async () => {
    if (!videoRef.current || !modelsLoaded) return;

    const detections = await faceapi.detectSingleFace(
      videoRef.current,
      new faceapi.TinyFaceDetectorOptions()
    );

    setFaceDetected(!!detections);
    
    if (detections && canvasRef.current) {
      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      faceapi.matchDimensions(canvasRef.current, displaySize);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, displaySize.width, displaySize.height);
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
      }
    }
  };

  useEffect(() => {
    let interval: any;
    if (cameraActive && modelsLoaded) {
      interval = setInterval(detectFace, 500);
    }
    return () => clearInterval(interval);
  }, [cameraActive, modelsLoaded]);

  const handleAttendance = async () => {
    if (!isWithinRadius) {
      setStatus({ type: 'error', message: 'Anda berada di luar radius kantor.' });
      return;
    }

    if (!faceDetected) {
      setStatus({ type: 'error', message: 'Wajah tidak terdeteksi.' });
      return;
    }

    setIsProcessing(true);
    try {
      // Determine status (on-time/late)
      let attendanceStatus = 'on-time';
      if (attendanceType === 'check-in' && shift) {
        const now = new Date();
        const [h, m] = shift.startTime.split(':');
        const shiftStart = new Date();
        shiftStart.setHours(parseInt(h), parseInt(m), 0);
        if (now > shiftStart) attendanceStatus = 'late';
      }

      await addDoc(collection(db, 'attendance'), {
        userId: user.uid,
        timestamp: new Date().toISOString(),
        type: attendanceType,
        location: location,
        status: attendanceStatus,
        officeId: profile?.officeId,
        photoUrl: user.photoURL // In real app, capture and upload photo
      });

      setStatus({ 
        type: 'success', 
        message: `Berhasil ${attendanceType === 'check-in' ? 'Masuk' : 'Pulang'}! ${attendanceStatus === 'late' ? 'Anda terlambat.' : 'Tepat waktu.'}` 
      });
      stopCamera();
      checkTodayAttendance();
    } catch (err) {
      console.error("Error saving attendance:", err);
      setStatus({ type: 'error', message: 'Gagal menyimpan data presensi.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Memuat data...</div>;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Presensi Kehadiran</h1>
          <p className="text-slate-500 mt-1">Lakukan verifikasi wajah dan lokasi untuk absen.</p>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-2xl font-bold text-sm uppercase tracking-wider w-full sm:w-auto text-center",
          attendanceType === 'check-in' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
        )}>
          {attendanceType === 'check-in' ? 'Absen Masuk' : 'Absen Pulang'}
        </div>
      </div>

      {status && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300",
          status.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" :
          status.type === 'error' ? "bg-red-50 text-red-700 border border-red-100" :
          "bg-blue-50 text-blue-700 border border-blue-100"
        )}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p className="font-medium">{status.message}</p>
          <button onClick={() => setStatus(null)} className="ml-auto text-sm font-bold opacity-50 hover:opacity-100">Tutup</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Camera Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative aspect-[3/4] md:aspect-video bg-slate-900 flex items-center justify-center">
            {cameraActive ? (
              <>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", faceDetected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                  <span className="text-white text-xs font-bold uppercase tracking-widest">
                    {faceDetected ? 'Wajah Terdeteksi' : 'Mencari Wajah...'}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center p-8">
                <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Camera className="w-10 h-10 text-slate-600" />
                </div>
                <button
                  onClick={startCamera}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-200"
                >
                  Aktifkan Kamera
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              disabled={!cameraActive || !isWithinRadius || !faceDetected || isProcessing}
              onClick={handleAttendance}
              className={cn(
                "flex-1 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg",
                attendanceType === 'check-in' 
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-green-100" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100",
                (!cameraActive || !isWithinRadius || !faceDetected || isProcessing) && "opacity-50 cursor-not-allowed grayscale"
              )}
            >
              {isProcessing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <UserCheck className="w-6 h-6" />}
              <span className="hidden sm:inline">Konfirmasi</span> {attendanceType === 'check-in' ? 'Masuk' : 'Pulang'}
            </button>
            {cameraActive && (
              <button
                onClick={stopCamera}
                className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
              >
                Batal
              </button>
            )}
          </div>
        </div>

        {/* Status Section */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Verifikasi Keamanan
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <MapPin className={cn("w-5 h-5", isWithinRadius ? "text-green-600" : "text-red-600")} />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Radius Lokasi</p>
                    <p className="text-sm font-bold text-slate-900">
                      {distance ? `${Math.round(distance)}m dari kantor` : 'Mencari lokasi...'}
                    </p>
                  </div>
                </div>
                {isWithinRadius ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <Camera className={cn("w-5 h-5", faceDetected ? "text-green-600" : "text-red-600")} />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Deteksi Wajah</p>
                    <p className="text-sm font-bold text-slate-900">
                      {faceDetected ? 'Wajah Terverifikasi' : 'Wajah Belum Terdeteksi'}
                    </p>
                  </div>
                </div>
                {faceDetected ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-600 font-bold mb-1">INFO KANTOR</p>
              <p className="text-sm font-medium text-blue-800">
                {office ? `${office.name} (Radius: ${office.radius}m)` : 'Memuat data kantor...'}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl text-white">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              Anti Fake GPS
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sistem kami mendeteksi penggunaan aplikasi lokasi palsu. Pastikan Anda menggunakan GPS asli dan berada di lokasi kantor yang ditentukan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
