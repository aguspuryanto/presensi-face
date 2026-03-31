import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Users, Building2, Clock, Calendar, TrendingUp, 
  CheckCircle, XCircle, AlertCircle, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';

export default function AnalyticsDashboard() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [attSnap, leaveSnap, userSnap, officeSnap, shiftSnap] = await Promise.all([
        getDocs(collection(db, 'attendance')),
        getDocs(collection(db, 'leaves')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'offices')),
        getDocs(collection(db, 'shifts'))
      ]);

      setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLeaves(leaveSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setOffices(officeSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setShifts(shiftSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };

    fetchData();
  }, []);

  // 1. Attendance Trend (Last 7 Days)
  const trendData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return last7Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = attendance.filter(a => 
        a.type === 'check-in' && a.timestamp.startsWith(dayStr)
      ).length;
      return {
        name: format(day, 'EEE', { locale: id }),
        count
      };
    });
  }, [attendance]);

  // 2. Leave Distribution
  const leaveData = useMemo(() => {
    const sakit = leaves.filter(l => l.type === 'sakit').length;
    const ijin = leaves.filter(l => l.type === 'ijin').length;
    const tl = leaves.filter(l => l.type === 'tl').length;
    return [
      { name: 'Sakit', value: sakit, color: '#EF4444' },
      { name: 'Izin', value: ijin, color: '#F59E0B' },
      { name: 'Tugas Luar', value: tl, color: '#3B82F6' }
    ];
  }, [leaves]);

  // 3. Performance by Office
  const officePerformance = useMemo(() => {
    return offices.map(office => {
      const officeUsers = users.filter(u => u.officeId === office.id);
      const onTime = attendance.filter(a => 
        a.officeId === office.id && a.status === 'on-time' && a.type === 'check-in'
      ).length;
      const late = attendance.filter(a => 
        a.officeId === office.id && a.status === 'late' && a.type === 'check-in'
      ).length;
      
      return {
        name: office.name,
        onTime,
        late,
        total: onTime + late
      };
    });
  }, [offices, users, attendance]);

  if (loading) return <div className="p-8 text-center">Memuat data analitik...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Karyawan', value: users.length, icon: Users, color: 'blue' },
          { label: 'Hadir Hari Ini', value: attendance.filter(a => a.timestamp.startsWith(format(new Date(), 'yyyy-MM-dd')) && a.type === 'check-in').length, icon: CheckCircle, color: 'green' },
          { label: 'Total Izin/Sakit', value: leaves.length, icon: Calendar, color: 'orange' },
          { label: 'Total Kantor', value: offices.length, icon: Building2, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className={cn(
              "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-4",
              stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
              stat.color === 'green' ? "bg-green-50 text-green-600" :
              stat.color === 'orange' ? "bg-orange-50 text-orange-600" :
              "bg-purple-50 text-purple-600"
            )}>
              <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium">{stat.label}</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance Trend Chart */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Tren Kehadiran (7 Hari Terakhir)
            </h3>
          </div>
          <div className="h-[300px] w-full overflow-x-auto hide-scrollbar">
            <div className="min-w-[500px] h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#2563eb" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Leave Distribution Chart */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            Distribusi Izin & Sakit
          </h3>
          <div className="h-[300px] w-full flex flex-col md:flex-row items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leaveData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Office Performance Chart */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            Perbandingan Kinerja Antar Kantor
          </h3>
          <div className="h-[350px] w-full overflow-x-auto hide-scrollbar">
            <div className="min-w-[500px] h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={officePerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} width={100} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="onTime" name="Tepat Waktu" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                  <Bar dataKey="late" name="Terlambat" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Work Hour Recap (Simplified) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-lg font-bold text-slate-900">Rekapitulasi Karyawan Teraktif</h3>
        </div>
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Karyawan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kehadiran</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Rasio Tepat Waktu</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.slice(0, 5).map(user => {
                const userAtt = attendance.filter(a => a.userId === user.uid && a.type === 'check-in');
                const onTimeCount = userAtt.filter(a => a.status === 'on-time').length;
                const ratio = userAtt.length > 0 ? Math.round((onTimeCount / userAtt.length) * 100) : 0;
                
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{userAtt.length} Hari</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              ratio > 80 ? "bg-green-500" : ratio > 50 ? "bg-orange-500" : "bg-red-500"
                            )} 
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{ratio}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        ratio > 80 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {ratio > 80 ? 'Sangat Baik' : 'Perlu Evaluasi'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
