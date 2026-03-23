import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { Work } from '../types';
import { Search, Filter, Plus, Calendar, ArrowRight, HardHat, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

interface DashboardProps {
  userId: string;
  onSelectWork: (id: string) => void;
  onAddWork: () => void;
}

export function Dashboard({ userId, onSelectWork, onAddWork }: DashboardProps) {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFY, setFilterFY] = useState('All');
  const [filterClassification, setFilterClassification] = useState('All');

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const q = query(
      collection(db, 'works'), 
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const worksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Work));
      setWorks(worksData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'works');
    });

    return () => unsubscribe();
  }, [userId]);

  const filteredWorks = works.filter(work => {
    const matchesSearch = work.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (work.agencyName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesFY = filterFY === 'All' || work.financialYear === filterFY;
    const matchesClassification = filterClassification === 'All' || work.classification === filterClassification;
    return matchesSearch && matchesFY && matchesClassification;
  });

  const financialYears = ['All', ...Array.from(new Set(works.map(w => w.financialYear)))].sort().reverse();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif font-medium text-stone-900 tracking-tight">Works Dashboard</h2>
          <p className="text-stone-500 mt-2">Monitor and manage all public works projects across financial years.</p>
        </div>
        <button
          onClick={onAddWork}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Add New Work
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-stone-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by work name or agency..."
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
            <select
              className="pl-10 pr-8 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
              value={filterFY}
              onChange={(e) => setFilterFY(e.target.value)}
            >
              <option value="All">All FY</option>
              {financialYears.filter(fy => fy !== 'All').map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
          <select
            className="px-6 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
            value={filterClassification}
            onChange={(e) => setFilterClassification(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Fresh">Fresh</option>
            <option value="Spillover">Spillover</option>
          </select>
        </div>
      </div>

      {/* Works List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-stone-200 animate-pulse rounded-3xl" />
          ))
        ) : filteredWorks.length > 0 ? (
          filteredWorks.map((work) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={work.id}
              onClick={() => onSelectWork(work.id!)}
              className="group bg-white rounded-3xl p-6 border border-stone-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  work.classification === 'Fresh' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {work.classification}
                </span>
                <span className="text-stone-400 text-xs font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {work.financialYear}
                </span>
              </div>

              <h3 className="text-xl font-serif font-medium text-stone-900 mb-2 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                {work.name}
              </h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <HardHat className="w-4 h-4" />
                  <span className="truncate">{work.agencyName || 'No agency assigned'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  {work.estimateStatus === 'Sanctioned' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500" />
                  )}
                  <span>{work.estimateStatus}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <div className="flex justify-between text-[10px] font-bold text-stone-400 uppercase mb-1">
                    <span>Physical Progress</span>
                    <span>{work.physicalProgress || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${work.physicalProgress || 0}%` }}
                      className="h-full bg-emerald-500" 
                    />
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-stone-300" />
            </div>
            <h3 className="text-xl font-medium text-stone-900">No works found</h3>
            <p className="text-stone-500">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
