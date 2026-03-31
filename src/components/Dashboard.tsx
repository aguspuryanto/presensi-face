import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../App';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

import { cn } from '../lib/utils';

interface DashboardProps {
  user: FirebaseUser;
  profile: UserProfile | null;
}

export default function Dashboard({ user, profile }: DashboardProps) {
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [office, setOffice] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);

  useEffect(() => {
    if (!profile) return;

    // Fetch office info
    if (profile.officeId) {
      getDocs(query(collection(db, 'offices'))).then(snapshot => {
        const officeData = snapshot.docs.find(doc => doc.id === profile.officeId)?.data();
        setOffice(officeData);
      });
    }

    // Fetch shift info
    if (profile.shiftId) {
      getDocs(query(collection(db, 'shifts'))).then(snapshot => {
        const shiftData = snapshot.docs.find(doc => doc.id === profile.shiftId)?.data();
        setShift(shiftData);
      });
    }

    // Fetch today's attendance
    const today = new Date();
    const qToday = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', startOfDay(today).toISOString()),
      where('timestamp', '<=', endOfDay(today).toISOString()),
      orderBy('timestamp', 'desc')
    );

    const unsubToday = onSnapshot(qToday, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTodayAttendance(logs);
    });

    // Fetch weekly attendance for chart
    const last7Days = subDays(new Date(), 7);
    const qWeek = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', last7Days.toISOString()),
      where('type', '==', 'check-in'),
      orderBy('timestamp', 'asc')
    );

    getDocs(qWeek).then(snapshot => {
      const logs = snapshot.docs.map(doc => doc.data());
      const chartData = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayStr = format(date, 'yyyy-MM-dd');
        const log = logs.find(l => l.timestamp.startsWith(dayStr));
        return {
          name: format(date, 'EEE', { locale: id }),
          status: log ? (log.status === 'on-time' ? 1 : 0.5) : 0
        };
      });
      setWeeklyData(chartData);
    });

    return () => unsubToday();
  }, [profile, user.uid]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {getTimeGreeting()}, {user.displayName?.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 mt-1">
            {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div className="pr-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Waktu Sekarang</p>
            <p className="text-lg font-bold text-slate-900 tabular-nums">{format(new Date(), 'HH:mm:ss')}</p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Lokasi Kantor</p>
              <p className="text-lg font-bold text-slate-900 truncate max-w-[150px]">{office?.name || 'Belum diatur'}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 line-clamp-1">{office?.address || 'Hubungi admin untuk penempatan kantor'}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Shift Kerja</p>
              <p className="text-lg font-bold text-slate-900">{shift?.name || 'Belum diatur'}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            {shift ? `${shift.startTime} - ${shift.endTime}` : 'Hubungi admin untuk jadwal shift'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Status Hari Ini</p>
              <p className="text-lg font-bold text-slate-900">
                {todayAttendance.length > 0 ? 'Sudah Absen' : 'Belum Absen'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {todayAttendance.some(a => a.type === 'check-in') && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg uppercase">Masuk</span>
            )}
            {todayAttendance.some(a => a.type === 'check-out') && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg uppercase">Pulang</span>
            )}
          </div>
        </div>
      </div>

      {/* Personal Analytics & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Kedisiplinan Mingguan</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [value === 1 ? 'Tepat Waktu' : value === 0.5 ? 'Terlambat' : 'Tidak Hadir', 'Status']}
                />
                <Bar dataKey="status" radius={[4, 4, 0, 0]} barSize={32}>
                  {weeklyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.status === 1 ? '#10B981' : entry.status === 0.5 ? '#F59E0B' : '#E2E8F0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-400">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Tepat Waktu</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full"></div> Terlambat</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-200 rounded-full"></div> Tidak Hadir</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Aktivitas Hari Ini</h2>
          </div>
          <div className="p-6">
            {todayAttendance.length > 0 ? (
              <div className="space-y-6">
                {todayAttendance.map((log, i) => (
                  <div key={log.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                        log.type === 'check-in' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {log.type === 'check-in' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      {i !== todayAttendance.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-2"></div>}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-900 capitalize text-sm">
                          {log.type === 'check-in' ? 'Presensi Masuk' : 'Presensi Pulang'}
                        </p>
                        <p className="text-xs font-bold text-slate-400 tabular-nums">
                          {format(new Date(log.timestamp), 'HH:mm')}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Status: <span className={cn(
                          "font-semibold",
                          log.status === 'on-time' ? "text-green-600" : "text-orange-600"
                        )}>{log.status === 'on-time' ? 'Tepat Waktu' : 'Terlambat'}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium text-sm">Belum ada aktivitas hari ini</p>
              </div>
            )}
          </div>
        </div>
      </div>

        <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-200">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-4">Tips Hari Ini</h2>
            <p className="text-blue-100 text-lg leading-relaxed mb-8">
              "Kedisiplinan adalah jembatan antara tujuan dan pencapaian. Jangan lupa untuk selalu melakukan presensi tepat waktu!"
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold">Tetap Semangat!</p>
                <p className="text-sm text-blue-100">Semoga harimu menyenangkan.</p>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl"></div>
        </div>
    </div>
  );
}
