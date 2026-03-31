import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Calendar, 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../App';
import { cn } from '../lib/utils';

interface LeavePageProps {
  user: FirebaseUser;
  profile: UserProfile | null;
}

export default function LeavePage({ user, profile }: LeavePageProps) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'ijin',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  });

  useEffect(() => {
    const q = query(
      collection(db, 'leaves'),
      where('userId', '==', user.uid),
      orderBy('startDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'leaves'), {
        userId: user.uid,
        userName: user.displayName,
        ...formData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setShowForm(false);
      setFormData({
        type: 'ijin',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        reason: ''
      });
    } catch (err) {
      console.error("Error submitting leave:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus pengajuan ini?')) {
      await deleteDoc(doc(db, 'leaves', id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-orange-100 text-orange-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      default: return 'Menunggu';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Izin & Sakit</h1>
          <p className="text-slate-500 mt-1">Kelola pengajuan izin, sakit, atau tugas luar.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100 w-full sm:w-auto justify-center"
        >
          {showForm ? <XCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? 'Batal' : 'Buat Pengajuan'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Jenis Pengajuan</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                >
                  <option value="ijin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="tl">Tugas Luar (TL)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tanggal Mulai</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tanggal Selesai</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Alasan / Keterangan</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Jelaskan alasan pengajuan Anda..."
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium min-h-[120px]"
                required
              />
            </div>
            <button
              disabled={submitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h2 className="text-xl font-bold text-slate-900">Riwayat Pengajuan</h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Jenis</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Alasan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leaves.length > 0 ? (
                leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900 uppercase text-sm tracking-tight">{leave.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-600">
                        {format(new Date(leave.startDate), 'd MMM')} - {format(new Date(leave.endDate), 'd MMM yyyy')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-500 line-clamp-1 max-w-xs">{leave.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                        getStatusColor(leave.status)
                      )}>
                        {getStatusLabel(leave.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {leave.status === 'pending' && (
                        <button
                          onClick={() => handleDelete(leave.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Belum ada riwayat pengajuan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List */}
        <div className="md:hidden p-4 space-y-4">
          {leaves.length > 0 ? (
            leaves.map((leave) => (
              <div key={leave.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 uppercase text-sm tracking-tight">{leave.type}</span>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    getStatusColor(leave.status)
                  )}>
                    {getStatusLabel(leave.status)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Tanggal</p>
                  <p className="text-sm font-medium text-slate-700">
                    {format(new Date(leave.startDate), 'd MMM')} - {format(new Date(leave.endDate), 'd MMM yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Alasan</p>
                  <p className="text-sm text-slate-600">{leave.reason}</p>
                </div>
                {leave.status === 'pending' && (
                  <div className="pt-3 border-t border-slate-200 mt-1 flex justify-end">
                    <button
                      onClick={() => handleDelete(leave.id)}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all text-sm font-bold"
                    >
                      <Trash2 className="w-4 h-4" /> Batal
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">Belum ada riwayat pengajuan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
