import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, getDoc, doc } from 'firebase/firestore';
import { Work, District } from '../types';
import { BarChart3, PieChart, TrendingUp, CheckCircle2, Clock, PlayCircle, FileText, Download, X, ArrowRight, HardHat, Calendar, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportsProps {
  userId: string;
  onSelectWork: (id: string) => void;
}

export function Reports({ userId, onSelectWork }: ReportsProps) {
  const [works, setWorks] = useState<Work[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [drillDown, setDrillDown] = useState<{ title: string, works: Work[] } | null>(null);
  const [filterHeadOfAccount, setFilterHeadOfAccount] = useState('All');
  const [filterDistrict, setFilterDistrict] = useState('All');
  const [filterThaluk, setFilterThaluk] = useState('All');

  useEffect(() => {
    if (!userId) return;

    const checkAdminAndFetch = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const adminStatus = userDoc.exists() && userDoc.data().role === 'admin';
        const isHardcodedAdmin = ['hanumanthappar32@gmail.com', 'ramesh.h.ipad@gmail.com'].includes(auth.currentUser?.email || '');
        const finalIsAdmin = adminStatus || isHardcodedAdmin;
        setIsAdmin(finalIsAdmin);

        // We always filter by createdBy for data isolation
        const q = query(
          collection(db, 'works'),
          where('createdBy', '==', userId),
          orderBy('createdAt', 'desc')
        );

        const unsubscribeDistricts = onSnapshot(query(collection(db, 'districts'), orderBy('name', 'asc')), (snapshot) => {
          setDistricts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as District)));
        });

        const unsubscribeWorks = onSnapshot(q, (snapshot) => {
          const worksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Work));
          setWorks(worksData);
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'works');
        });

        return () => {
          unsubscribeDistricts();
          unsubscribeWorks();
        };
      } catch (err) {
        console.error("Error fetching data for reports:", err);
        setLoading(false);
      }
    };

    let unsubPromise = checkAdminAndFetch();
    return () => {
      unsubPromise.then(unsub => unsub && unsub());
    };
  }, [userId]);

  const filteredWorks = works.filter(w => {
    const matchesHeadOfAccount = filterHeadOfAccount === 'All' || w.headOfAccount === filterHeadOfAccount;
    const matchesDistrict = filterDistrict === 'All' || w.district === filterDistrict;
    const matchesThaluk = filterThaluk === 'All' || w.thaluk === filterThaluk;
    return matchesHeadOfAccount && matchesDistrict && matchesThaluk;
  });

  const headsOfAccount = ['All', ...Array.from(new Set(works.map(w => w.headOfAccount).filter(Boolean) as string[]))].sort();

  const stats = {
    total: filteredWorks.length,
    fresh: (() => {
      const total = filteredWorks.filter(w => w.classification === 'Fresh').length;
      const completed = filteredWorks.filter(w => w.classification === 'Fresh' && w.status === 'Completed').length;
      const inProgress = filteredWorks.filter(w => w.classification === 'Fresh' && w.status === 'In progress').length;
      return {
        total,
        completed,
        inProgress,
        toBeStarted: total - (completed + inProgress),
      };
    })(),
    spillover: (() => {
      const total = filteredWorks.filter(w => w.classification === 'Spillover').length;
      const completed = filteredWorks.filter(w => w.classification === 'Spillover' && w.status === 'Completed').length;
      const inProgress = filteredWorks.filter(w => w.classification === 'Spillover' && w.status === 'In progress').length;
      return {
        total,
        completed,
        inProgress,
        toBeStarted: total - (completed + inProgress),
      };
    })(),
    overall: (() => {
      const total = filteredWorks.length;
      const completed = filteredWorks.filter(w => w.status === 'Completed').length;
      const inProgress = filteredWorks.filter(w => w.status === 'In progress').length;
      return {
        completed,
        inProgress,
        toBeStarted: total - (completed + inProgress),
      };
    })(),
  };

  const handleDrillDown = (title: string, classification: string | 'All', status: string | 'All') => {
    let filtered = filteredWorks;
    if (classification !== 'All') {
      filtered = filtered.filter(w => w.classification === classification);
    }
    
    if (status === 'To be started') {
      filtered = filtered.filter(w => w.status !== 'Completed' && w.status !== 'In progress');
    } else if (status !== 'All') {
      filtered = filtered.filter(w => w.status === status);
    }
    
    setDrillDown({ title, works: filtered });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Clock className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif font-medium text-stone-900 tracking-tight">Works Report</h2>
          <p className="text-stone-500 mt-2">Comprehensive summary of all civil works projects.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all shadow-lg"
        >
          <Download className="w-5 h-5" />
          Print Report
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest flex items-center gap-2">
            <FileText className="w-3 h-3" />
            Head of Account
          </label>
          <select
            className="w-full px-4 py-2 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer text-sm"
            value={filterHeadOfAccount}
            onChange={(e) => setFilterHeadOfAccount(e.target.value)}
          >
            <option value="All">All Heads of Account</option>
            {headsOfAccount.filter(h => h !== 'All').map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" />
            District
          </label>
          <select
            className="w-full px-4 py-2 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer text-sm"
            value={filterDistrict}
            onChange={(e) => {
              setFilterDistrict(e.target.value);
              setFilterThaluk('All');
            }}
          >
            <option value="All">All Districts</option>
            {districts.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest flex items-center gap-2">
            <MapPin className="w-3 h-3" />
            Thaluk
          </label>
          <select
            className="w-full px-4 py-2 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer text-sm disabled:opacity-50"
            value={filterThaluk}
            disabled={filterDistrict === 'All'}
            onChange={(e) => setFilterThaluk(e.target.value)}
          >
            <option value="All">All Thaluks</option>
            {filterDistrict !== 'All' && districts.find(d => d.name === filterDistrict)?.thaluks.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div onClick={() => handleDrillDown('All Works', 'All', 'All')} className="cursor-pointer group">
          <SummaryCard 
            title="Total Works" 
            value={stats.total} 
            icon={FileText} 
            color="bg-stone-100 text-stone-700" 
          />
        </div>
        <div onClick={() => handleDrillDown('Overall Completed Works', 'All', 'Completed')} className="cursor-pointer group">
          <SummaryCard 
            title="Completed" 
            value={stats.overall.completed} 
            icon={CheckCircle2} 
            color="bg-emerald-100 text-emerald-700" 
          />
        </div>
        <div onClick={() => handleDrillDown('Overall In Progress Works', 'All', 'In progress')} className="cursor-pointer group">
          <SummaryCard 
            title="In Progress" 
            value={stats.overall.inProgress} 
            icon={TrendingUp} 
            color="bg-blue-100 text-blue-700" 
          />
        </div>
        <div onClick={() => handleDrillDown('Overall To be started Works', 'All', 'To be started')} className="cursor-pointer group">
          <SummaryCard 
            title="To be started" 
            value={stats.overall.toBeStarted} 
            icon={PlayCircle} 
            color="bg-amber-100 text-amber-700" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fresh Works Report */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-serif font-medium text-stone-900">Fresh Works</h3>
              <p className="text-stone-500 text-sm">New projects initiated this year</p>
            </div>
          </div>

          <div className="space-y-6">
            <div onClick={() => handleDrillDown('Total Fresh Works', 'Fresh', 'All')} className="cursor-pointer group">
              <ReportRow label="Total Fresh Works" value={stats.fresh.total} total={stats.fresh.total} color="bg-stone-600" />
            </div>
            <div onClick={() => handleDrillDown('Fresh Works: Completed', 'Fresh', 'Completed')} className="cursor-pointer group">
              <ReportRow label="Completed" value={stats.fresh.completed} total={stats.fresh.total} color="bg-emerald-500" />
            </div>
            <div onClick={() => handleDrillDown('Fresh Works: In Progress', 'Fresh', 'In progress')} className="cursor-pointer group">
              <ReportRow label="In Progress" value={stats.fresh.inProgress} total={stats.fresh.total} color="bg-blue-500" />
            </div>
            <div onClick={() => handleDrillDown('Fresh Works: To be started', 'Fresh', 'To be started')} className="cursor-pointer group">
              <ReportRow label="To be started" value={stats.fresh.toBeStarted} total={stats.fresh.total} color="bg-amber-500" />
            </div>
          </div>
        </motion.div>

        {/* Spillover Works Report */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2.5rem] p-8 border border-stone-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center text-white">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-serif font-medium text-stone-900">Spillover Works</h3>
              <p className="text-stone-500 text-sm">Projects carried forward from previous years</p>
            </div>
          </div>

          <div className="space-y-6">
            <div onClick={() => handleDrillDown('Total Spillover Works', 'Spillover', 'All')} className="cursor-pointer group">
              <ReportRow label="Total Spillover Works" value={stats.spillover.total} total={stats.spillover.total} color="bg-stone-600" />
            </div>
            <div onClick={() => handleDrillDown('Spillover Works: Completed', 'Spillover', 'Completed')} className="cursor-pointer group">
              <ReportRow label="Completed" value={stats.spillover.completed} total={stats.spillover.total} color="bg-emerald-500" />
            </div>
            <div onClick={() => handleDrillDown('Spillover Works: In Progress', 'Spillover', 'In progress')} className="cursor-pointer group">
              <ReportRow label="In Progress" value={stats.spillover.inProgress} total={stats.spillover.total} color="bg-blue-500" />
            </div>
            <div onClick={() => handleDrillDown('Spillover Works: To be started', 'Spillover', 'To be started')} className="cursor-pointer group">
              <ReportRow label="To be started" value={stats.spillover.toBeStarted} total={stats.spillover.total} color="bg-amber-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-stone-100">
          <h3 className="text-2xl font-serif font-medium text-stone-900">Detailed Classification Report</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50">
                <th className="px-8 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest border-b border-stone-200">Classification</th>
                <th className="px-8 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest border-b border-stone-200">Total</th>
                <th className="px-8 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest border-b border-stone-200">Completed</th>
                <th className="px-8 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest border-b border-stone-200">In Progress</th>
                <th className="px-8 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest border-b border-stone-200">To be started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr className="hover:bg-stone-50 transition-colors">
                <td className="px-8 py-6 font-medium text-stone-900">Fresh</td>
                <td className="px-8 py-6 text-stone-900 cursor-pointer hover:text-emerald-600 hover:underline" onClick={() => handleDrillDown('Total Fresh Works', 'Fresh', 'All')}>{stats.fresh.total}</td>
                <td className="px-8 py-6 text-emerald-600 font-bold cursor-pointer hover:underline" onClick={() => handleDrillDown('Fresh Works: Completed', 'Fresh', 'Completed')}>{stats.fresh.completed}</td>
                <td className="px-8 py-6 text-blue-600 font-bold cursor-pointer hover:underline" onClick={() => handleDrillDown('Fresh Works: In Progress', 'Fresh', 'In progress')}>{stats.fresh.inProgress}</td>
                <td className="px-8 py-6 text-amber-600 font-bold cursor-pointer hover:underline" onClick={() => handleDrillDown('Fresh Works: To be started', 'Fresh', 'To be started')}>{stats.fresh.toBeStarted}</td>
              </tr>
              <tr className="hover:bg-stone-50 transition-colors">
                <td className="px-8 py-6 font-medium text-stone-900">Spillover</td>
                <td className="px-8 py-6 text-stone-900 cursor-pointer hover:text-emerald-600 hover:underline" onClick={() => handleDrillDown('Total Spillover Works', 'Spillover', 'All')}>{stats.spillover.total}</td>
                <td className="px-8 py-6 text-emerald-600 font-bold cursor-pointer hover:underline" onClick={() => handleDrillDown('Spillover Works: Completed', 'Spillover', 'Completed')}>{stats.spillover.completed}</td>
                <td className="px-8 py-6 text-blue-600 font-bold cursor-pointer hover:underline" onClick={() => handleDrillDown('Spillover Works: In Progress', 'Spillover', 'In progress')}>{stats.spillover.inProgress}</td>
                <td className="px-8 py-6 text-amber-600 font-bold cursor-pointer hover:underline" onClick={() => handleDrillDown('Spillover Works: To be started', 'Spillover', 'To be started')}>{stats.spillover.toBeStarted}</td>
              </tr>
              <tr className="bg-stone-900 text-white">
                <td className="px-8 py-6 font-bold">Grand Total</td>
                <td className="px-8 py-6 font-bold cursor-pointer hover:text-emerald-400" onClick={() => handleDrillDown('All Works', 'All', 'All')}>{stats.total}</td>
                <td className="px-8 py-6 font-bold text-emerald-400 cursor-pointer hover:underline" onClick={() => handleDrillDown('Overall Completed Works', 'All', 'Completed')}>{stats.overall.completed}</td>
                <td className="px-8 py-6 font-bold text-blue-400 cursor-pointer hover:underline" onClick={() => handleDrillDown('Overall In Progress Works', 'All', 'In progress')}>{stats.overall.inProgress}</td>
                <td className="px-8 py-6 font-bold text-amber-400 cursor-pointer hover:underline" onClick={() => handleDrillDown('Overall To be started Works', 'All', 'To be started')}>{stats.overall.toBeStarted}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill Down Modal */}
      <AnimatePresence>
        {drillDown && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrillDown(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#f5f5f0] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 bg-white border-b border-stone-200 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-serif font-medium text-stone-900">{drillDown.title}</h3>
                  <p className="text-stone-500 text-sm">{drillDown.works.length} projects found</p>
                </div>
                <button 
                  onClick={() => setDrillDown(null)}
                  className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-4">
                {drillDown.works.length > 0 ? (
                  drillDown.works.map((work) => (
                    <div 
                      key={work.id}
                      onClick={() => {
                        onSelectWork(work.id!);
                        setDrillDown(null);
                      }}
                      className="group bg-white p-6 rounded-3xl border border-stone-200 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer flex justify-between items-center"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                            work.classification === 'Fresh' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {work.classification}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                            work.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 
                            work.status === 'In progress' ? 'bg-emerald-100 text-emerald-700' : 
                            'bg-stone-100 text-stone-700'
                          }`}>
                            {work.status}
                          </span>
                        </div>
                        <h4 className="text-lg font-serif font-medium text-stone-900 truncate group-hover:text-emerald-700 transition-colors">
                          {work.name}
                        </h4>
                        <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                          <div className="flex items-center gap-1">
                            <HardHat className="w-3 h-3" />
                            {work.agencyName || 'No agency'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {work.financialYear}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all ml-4 shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-stone-500">No works found for this category.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm flex items-center gap-4 group-hover:border-emerald-200 group-hover:shadow-md transition-all">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">{title}</p>
        <div className="flex items-baseline gap-1">
          <p className="text-2xl font-serif font-medium text-stone-900 group-hover:text-emerald-700 transition-colors">{value}</p>
          <span className="text-[10px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">VIEW</span>
        </div>
      </div>
    </div>
  );
}

function ReportRow({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2 group">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-stone-600 group-hover:text-emerald-700 transition-colors">{label}</p>
          <span className="text-[8px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">VIEW LIST</span>
        </div>
        <p className="text-lg font-serif font-medium text-stone-900 group-hover:text-emerald-700 transition-colors">{value}</p>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color} group-hover:opacity-80 transition-opacity`} 
        />
      </div>
    </div>
  );
}
