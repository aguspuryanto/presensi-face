import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { 
  Plus, 
  Building2, 
  Clock, 
  Users, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle, 
  MapPin,
  Search,
  Download,
  FileSpreadsheet,
  BarChart3
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

import AnalyticsDashboard from './AnalyticsDashboard';

export default function AdminPanel() {
  const [activeSubTab, setActiveSubTab] = useState('analytics');
  const [offices, setOffices] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    const unsubOffices = onSnapshot(collection(db, 'offices'), (snap) => {
      setOffices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubShifts = onSnapshot(collection(db, 'shifts'), (snap) => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubLeaves = onSnapshot(query(collection(db, 'leaves'), orderBy('createdAt', 'desc')), (snap) => {
      setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubAttendance = onSnapshot(query(collection(db, 'attendance'), orderBy('timestamp', 'desc')), (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubOffices();
      unsubShifts();
      unsubUsers();
      unsubLeaves();
      unsubAttendance();
    };
  }, []);

  const handleApproveLeave = async (id: string, status: 'approved' | 'rejected') => {
    await updateDoc(doc(db, 'leaves', id), { status });
  };

  const handleUpdateUser = async (userId: string, data: any) => {
    await updateDoc(doc(db, 'users', userId), data);
  };

  const handleDelete = async (coll: string, id: string) => {
    if (window.confirm('Hapus item ini?')) {
      await deleteDoc(doc(db, coll, id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Panel</h1>
          <p className="text-slate-500 mt-1">Kelola data kantor, shift, karyawan, dan rekapitulasi.</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-slate-100 rounded-2xl w-full md:w-fit">
        {[
          { id: 'analytics', label: 'Analitik', icon: BarChart3 },
          { id: 'offices', label: 'Kantor', icon: Building2 },
          { id: 'shifts', label: 'Shift', icon: Clock },
          { id: 'users', label: 'Karyawan', icon: Users },
          { id: 'leaves', label: 'Persetujuan Izin', icon: CheckCircle },
          { id: 'recap', label: 'Rekap Absensi', icon: FileSpreadsheet },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeSubTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {activeSubTab === 'analytics' && <AnalyticsDashboard />}

      {/* Offices Tab */}
      {activeSubTab === 'offices' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah Kantor
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offices.map(office => (
              <div key={office.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete('offices', office.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{office.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{office.address}</p>
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Radius: <strong>{office.radius}m</strong></span>
                  <span className="text-slate-400">Loc: <strong>{office.location.lat.toFixed(4)}, {office.location.lng.toFixed(4)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shifts Tab */}
      {activeSubTab === 'shifts' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah Shift
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shifts.map(shift => (
              <div key={shift.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <button onClick={() => handleDelete('shifts', shift.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{shift.name}</h3>
                <p className="text-2xl font-bold text-blue-600 mt-2">{shift.startTime} - {shift.endTime}</p>
                <p className="text-xs text-slate-400 mt-4 uppercase font-bold tracking-wider">
                  Kantor: {offices.find(o => o.id === shift.officeId)?.name || 'Semua Kantor'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto hide-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Karyawan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Kantor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Shift</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm capitalize">{user.role}</td>
                  <td className="px-6 py-4">
                    <select 
                      value={user.officeId || ''} 
                      onChange={(e) => handleUpdateUser(user.id, { officeId: e.target.value })}
                      className="text-sm bg-slate-50 border-none rounded-lg p-1"
                    >
                      <option value="">Pilih Kantor</option>
                      {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={user.shiftId || ''} 
                      onChange={(e) => handleUpdateUser(user.id, { shiftId: e.target.value })}
                      className="text-sm bg-slate-50 border-none rounded-lg p-1"
                    >
                      <option value="">Pilih Shift</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete('users', user.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leaves Tab */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-6">
          {leaves.filter(l => l.status === 'pending').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {leaves.filter(l => l.status === 'pending').map(leave => (
                <div key={leave.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg uppercase tracking-wider">{leave.type}</span>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{leave.userName}</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-bold">{format(new Date(leave.createdAt), 'd MMM HH:mm')}</p>
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl italic">"{leave.reason}"</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-500">{leave.startDate} s/d {leave.endDate}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApproveLeave(leave.id, 'rejected')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => handleApproveLeave(leave.id, 'approved')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all"
                      >
                        <CheckCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-100">
              <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Semua pengajuan sudah diproses</p>
            </div>
          )}
        </div>
      )}

      {/* Recap Tab */}
      {activeSubTab === 'recap' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">Rekap Otomatis</h2>
            <button className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm w-full sm:w-auto justify-center">
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Waktu</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Karyawan</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipe</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendance.map(log => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 text-sm tabular-nums">{format(new Date(log.timestamp), 'dd/MM HH:mm')}</td>
                    <td className="px-6 py-4 text-sm font-bold">{users.find(u => u.uid === log.userId)?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-xs font-bold uppercase",
                        log.type === 'check-in' ? "text-green-600" : "text-blue-600"
                      )}>{log.type === 'check-in' ? 'Masuk' : 'Pulang'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        log.status === 'on-time' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      )}>{log.status}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {log.location?.lat.toFixed(4)}, {log.location?.lng.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals for Adding Office/Shift */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-6">Tambah {activeSubTab === 'offices' ? 'Kantor' : 'Shift'}</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              if (activeSubTab === 'offices') {
                await addDoc(collection(db, 'offices'), {
                  name: formData.get('name'),
                  address: formData.get('address'),
                  radius: parseInt(formData.get('radius') as string),
                  location: {
                    lat: parseFloat(formData.get('lat') as string),
                    lng: parseFloat(formData.get('lng') as string)
                  }
                });
              } else {
                await addDoc(collection(db, 'shifts'), {
                  name: formData.get('name'),
                  startTime: formData.get('startTime'),
                  endTime: formData.get('endTime'),
                  officeId: formData.get('officeId')
                });
              }
              setIsModalOpen(false);
            }} className="space-y-4">
              {activeSubTab === 'offices' ? (
                <>
                  <input name="name" placeholder="Nama Kantor" className="w-full p-4 bg-slate-50 rounded-2xl" required />
                  <input name="address" placeholder="Alamat" className="w-full p-4 bg-slate-50 rounded-2xl" required />
                  <input name="radius" type="number" placeholder="Radius (meter)" className="w-full p-4 bg-slate-50 rounded-2xl" required />
                  <div className="grid grid-cols-2 gap-4">
                    <input name="lat" type="number" step="any" placeholder="Latitude" className="w-full p-4 bg-slate-50 rounded-2xl" required />
                    <input name="lng" type="number" step="any" placeholder="Longitude" className="w-full p-4 bg-slate-50 rounded-2xl" required />
                  </div>
                </>
              ) : (
                <>
                  <input name="name" placeholder="Nama Shift (pagi/siang/malam)" className="w-full p-4 bg-slate-50 rounded-2xl" required />
                  <div className="grid grid-cols-2 gap-4">
                    <input name="startTime" type="time" className="w-full p-4 bg-slate-50 rounded-2xl" required />
                    <input name="endTime" type="time" className="w-full p-4 bg-slate-50 rounded-2xl" required />
                  </div>
                  <select name="officeId" className="w-full p-4 bg-slate-50 rounded-2xl">
                    <option value="">Semua Kantor</option>
                    {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </>
              )}
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">Batal</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
