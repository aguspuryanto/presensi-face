import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  ChevronDown,
  Search,
  Bell,
  Clock, 
  Edit3,
  Briefcase,
  FileText,
  LayoutGrid,
  UserCheck,
  Banknote,
  Car,
  Monitor,
  Receipt,
  LogIn,
  LogOut
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../App';

import { cn } from '../lib/utils';

interface DashboardProps {
  user: FirebaseUser;
  profile: UserProfile | null;
}

export default function Dashboard({ user, profile }: DashboardProps) {
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!profile) return;

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

    return () => unsubToday();
  }, [profile, user.uid]);

  const checkInLog = todayAttendance.find(a => a.type === 'check-in');
  const checkOutLog = todayAttendance.find(a => a.type === 'check-out');

  const menuItems = [
    { label: 'Absensi', icon: Clock, bgColor: 'bg-white', iconColor: 'text-yellow-500' },
    { label: 'Manajemen Kehadiran', icon: Edit3, bgColor: 'bg-white', iconColor: 'text-green-500' },
    { label: 'Talent', icon: Briefcase, bgColor: 'bg-white', iconColor: 'text-pink-500' },
    { label: 'Report', icon: FileText, bgColor: 'bg-white', iconColor: 'text-blue-500' },
    { label: 'Spaces', icon: LayoutGrid, bgColor: 'bg-white', iconColor: 'text-yellow-500' },
    { label: 'Lembur', icon: UserCheck, bgColor: 'bg-white', iconColor: 'text-green-500' },
    { label: 'Reimburse', icon: Banknote, bgColor: 'bg-white', iconColor: 'text-pink-500' },
    { label: 'Fasilitas', icon: Car, bgColor: 'bg-white', iconColor: 'text-blue-500' },
    { label: 'Pinjaman', icon: Monitor, bgColor: 'bg-white', iconColor: 'text-yellow-500' },
    { label: 'Kasbon', icon: Receipt, bgColor: 'bg-white', iconColor: 'text-green-500' },
  ];

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
          PT. Classik Creactive
          <ChevronDown className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-4 text-blue-600">
          <Search className="w-5 h-5" />
          <div className="relative">
            <Bell className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 border border-slate-100">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">{user.displayName || 'Carlene Lim'}</h2>
            <p className="text-xs text-slate-500">{profile?.role || 'UI/UX Designer'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900">{format(currentTime, "EEEE, d MMM yyyy", { locale: id })}</p>
          <p className="text-xs text-slate-500">{format(currentTime, "HH:mm:ss")} WIB</p>
        </div>
      </div>

      {/* Attendance Card */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="grid grid-cols-2 gap-4 text-center mb-4 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-100 -translate-x-1/2"></div>
            <div>
              <p className="text-sm text-slate-500 mb-2 font-medium">Absen Masuk</p>
              <p className="text-xl font-bold text-slate-900">
                {checkInLog ? format(new Date(checkInLog.timestamp), 'HH:mm:ss') : '--:--:--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-2 font-medium">Absen Keluar</p>
              <p className="text-xl font-bold text-slate-900">
                {checkOutLog ? format(new Date(checkOutLog.timestamp), 'HH:mm:ss') : '--:--:--'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-200 transition-all">
              <LogIn className="w-5 h-5" />
              Clock In
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-200 transition-all">
              <LogOut className="w-5 h-5" />
              Clock Out
            </button>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="px-4 mt-8">
        <div className="grid grid-cols-5 gap-y-6 gap-x-2">
          {menuItems.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm transition-transform group-hover:scale-105", item.bgColor)}>
                <item.icon className={cn("w-6 h-6", item.iconColor)} />
              </div>
              <span className="text-[10px] text-center text-slate-500 font-medium leading-tight px-1">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements */}
      <div className="px-4 mt-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-lg">Pengumuman</h3>
          <a href="#" className="text-pink-500 text-sm font-bold hover:underline">Lihat Semua</a>
        </div>
        <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-100 relative h-48 group cursor-pointer">
          <img src="https://picsum.photos/seed/lomba/800/400" alt="Pengumuman" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
        </div>
      </div>
    </div>
  );
}
