import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, collection, query, onSnapshot, deleteDoc, addDoc, updateDoc, orderBy, getDocs } from 'firebase/firestore';
import { Work, Bill, Photo } from '../types';
import { 
  ArrowLeft, Edit3, Trash2, Plus, DollarSign, CheckCircle2, 
  Clock, Calendar, Building2, FileText, Camera, 
  ChevronRight, AlertCircle, Loader2, MoreVertical,
  TrendingUp, Wallet, Receipt, Image as ImageIcon, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WorkDetailsProps {
  workId: string;
  userRole?: string;
  onBack: () => void;
  onEdit: () => void;
}

export function WorkDetails({ workId, userRole, onBack, onEdit }: WorkDetailsProps) {
  const [work, setWork] = useState<Work | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'physical'>('overview');
  const [showBillForm, setShowBillForm] = useState(false);
  const [showPhotoForm, setShowPhotoForm] = useState(false);

  useEffect(() => {
    const workRef = doc(db, 'works', workId);
    const billsRef = collection(db, 'works', workId, 'bills');
    const photosRef = collection(db, 'works', workId, 'photos');

    const unsubWork = onSnapshot(workRef, (doc) => {
      if (doc.exists()) setWork({ id: doc.id, ...doc.data() } as Work);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `works/${workId}`));

    const unsubBills = onSnapshot(query(billsRef, orderBy('submissionDate', 'desc')), (snapshot) => {
      setBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill)));
    });

    const unsubPhotos = onSnapshot(query(photosRef, orderBy('date', 'desc')), (snapshot) => {
      setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo)));
    });

    return () => {
      unsubWork();
      unsubBills();
      unsubPhotos();
    };
  }, [workId]);

  const totalPaid = bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + b.amount, 0);
  const totalPending = bills.filter(b => b.status === 'Pending').reduce((sum, b) => sum + b.amount, 0);
  const balance = (work?.estimatedCost || 0) - totalPaid;

  const isAdmin = userRole === 'admin';
  const isCreator = work?.createdBy === auth.currentUser?.uid;
  const canManage = isAdmin || isCreator;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteBillId, setConfirmDeleteBillId] = useState<string | null>(null);
  const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
      return;
    }

    setLoading(true);
    try {
      // 1. Delete all bills
      const billsRef = collection(db, 'works', workId, 'bills');
      const billsSnapshot = await getDocs(billsRef);
      const billDeletes = billsSnapshot.docs.map(d => deleteDoc(d.ref));
      
      // 2. Delete all photos
      const photosRef = collection(db, 'works', workId, 'photos');
      const photosSnapshot = await getDocs(photosRef);
      const photoDeletes = photosSnapshot.docs.map(d => deleteDoc(d.ref));

      // Wait for all subcollection deletes
      await Promise.all([...billDeletes, ...photoDeletes]);

      // 3. Delete the work document
      await deleteDoc(doc(db, 'works', workId));
      onBack();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `works/${workId}`);
      setLoading(false);
    }
  };

  if (loading || !work) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>
        {canManage && (
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-all font-medium"
            >
              <Edit3 className="w-4 h-4" />
              Edit Work
            </button>
            <button
              onClick={handleDelete}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border rounded-xl transition-all font-medium",
                showDeleteConfirm 
                  ? "bg-red-500 border-red-500 text-white" 
                  : "bg-white border-red-100 text-red-500 hover:bg-red-50"
              )}
            >
              <Trash2 className="w-4 h-4" />
              {showDeleteConfirm ? "Confirm Delete" : "Delete"}
            </button>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <div className="bg-stone-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              work.classification === 'Fresh' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {work.classification} Work
            </span>
            <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              work.status === 'Completed' ? 'bg-blue-500/20 text-blue-400' : 
              work.status === 'In progress' ? 'bg-emerald-500/20 text-emerald-400' : 
              'bg-stone-500/20 text-stone-400'
            }`}>
              {work.status}
            </span>
            <span className="text-stone-400 text-sm font-medium flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              FY {work.financialYear}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-medium leading-tight max-w-4xl mb-8">
            {work.name}
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/10">
            <div className="space-y-1">
              <p className="text-stone-400 text-[10px] uppercase font-bold tracking-widest">Estimated Cost</p>
              <p className="text-2xl font-serif font-medium">₹{work.estimatedCost?.toLocaleString() || '0'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-stone-400 text-[10px] uppercase font-bold tracking-widest">Total Expenditure</p>
              <p className="text-2xl font-serif font-medium text-emerald-400">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-stone-400 text-[10px] uppercase font-bold tracking-widest">Physical Progress</p>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-serif font-medium">{work.physicalProgress || 0}%</p>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${work.physicalProgress || 0}%` }}
                    className="h-full bg-emerald-500" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-8">
        {[
          { id: 'overview', label: 'Overview', icon: FileText },
          { id: 'financial', label: 'Financial Progress', icon: Wallet },
          { id: 'physical', label: 'Physical Progress', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-all font-medium ${
              activeTab === tab.id 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-8">
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-stone-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-stone-400" />
                  Agency & Agreement
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Agency Name</p>
                    <p className="text-stone-900 font-medium">{work.agencyName || 'Not Assigned'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Head of Account</p>
                    <p className="text-stone-900 font-medium">{work.headOfAccount || 'Not Assigned'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Agreement No.</p>
                    <p className="text-stone-900 font-medium">{work.agreementNo || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Agreement Date</p>
                    <p className="text-stone-900 font-medium">{work.agreementDate ? format(new Date(work.agreementDate), 'dd MMM yyyy') : 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">District</p>
                    <p className="text-stone-900 font-medium">{work.district || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Thaluk</p>
                    <p className="text-stone-900 font-medium">{work.thaluk || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-8">
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-stone-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-stone-400" />
                  Sanction Details
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      work.estimateStatus === 'Sanctioned' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {work.estimateStatus === 'Sanctioned' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {work.estimateStatus}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Sanction Year</p>
                    <p className="text-stone-900 font-medium">{work.estimateYear || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Sanction Ref No.</p>
                    <p className="text-stone-900 font-medium">{work.sanctionRefNo || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Sanction Date</p>
                    <p className="text-stone-900 font-medium">{work.sanctionDate ? format(new Date(work.sanctionDate), 'dd MMM yyyy') : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'financial' && (
          <motion.div
            key="financial"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest mb-1">Total Paid</p>
                <p className="text-2xl font-serif font-medium text-stone-900">₹{totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest mb-1">Pending Bills</p>
                <p className="text-2xl font-serif font-medium text-stone-900">₹{totalPending.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center mb-4">
                  <Wallet className="w-6 h-6 text-stone-600" />
                </div>
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest mb-1">Balance Amount</p>
                <p className="text-2xl font-serif font-medium text-stone-900">₹{balance.toLocaleString()}</p>
              </div>
            </div>

            {/* Bills List */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h3 className="text-lg font-medium text-stone-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-stone-400" />
                  Bill History
                </h3>
                <button 
                  onClick={() => setShowBillForm(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Bill
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50">
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest">Bill No.</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest">Submission Date</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest">Payment Date</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-stone-400 tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {bills.length > 0 ? bills.map(bill => (
                      <tr key={bill.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-stone-900">{bill.billNo}</td>
                        <td className="px-6 py-4 text-stone-500">{format(new Date(bill.submissionDate), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4 font-medium text-stone-900">₹{bill.amount.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-stone-500">{bill.paymentDate ? format(new Date(bill.paymentDate), 'dd MMM yyyy') : '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {bill.status === 'Pending' && (
                              <button 
                                onClick={async () => {
                                  const date = new Date().toISOString().split('T')[0];
                                  await updateDoc(doc(db, 'works', workId, 'bills', bill.id!), { 
                                    status: 'Paid', 
                                    paymentDate: date 
                                  });
                                }}
                                className="text-emerald-600 hover:text-emerald-700 text-xs font-bold uppercase tracking-wider"
                              >
                                Mark Paid
                              </button>
                            )}
                            <button 
                              onClick={async () => {
                                if (confirmDeleteBillId !== bill.id) {
                                  setConfirmDeleteBillId(bill.id!);
                                  setTimeout(() => setConfirmDeleteBillId(null), 3000);
                                  return;
                                }
                                await deleteDoc(doc(db, 'works', workId, 'bills', bill.id!));
                                setConfirmDeleteBillId(null);
                              }}
                              className={cn(
                                "transition-all",
                                confirmDeleteBillId === bill.id ? "text-red-600 font-bold text-xs uppercase" : "text-red-400 hover:text-red-600"
                              )}
                              title={confirmDeleteBillId === bill.id ? "Click again to confirm" : "Delete bill"}
                            >
                              {confirmDeleteBillId === bill.id ? "Confirm" : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic">No bills recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'physical' && (
          <motion.div
            key="physical"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Progress Update Card */}
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-stone-900 mb-1">Current Progress</h3>
                  <p className="text-stone-500 text-sm">Update the physical completion percentage and add remarks.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Completion</p>
                    <p className="text-3xl font-serif font-medium text-emerald-600">{work.physicalProgress || 0}%</p>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin-slow" style={{ clipPath: `polygon(0 0, 100% 0, 100% ${work.physicalProgress || 0}%, 0 ${work.physicalProgress || 0}%)` }} />
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={work.physicalProgress || 0}
                    onChange={async (e) => {
                      await updateDoc(doc(db, 'works', workId), { physicalProgress: parseInt(e.target.value) });
                    }}
                    className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Progress Remarks</label>
                  <textarea
                    className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                    rows={3}
                    placeholder="Describe current site status..."
                    value={work.progressRemarks || ''}
                    onBlur={async (e) => {
                      await updateDoc(doc(db, 'works', workId), { progressRemarks: e.target.value });
                    }}
                    onChange={(e) => setWork({ ...work, progressRemarks: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Photo Gallery */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-stone-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-stone-400" />
                  Site Photos
                </h3>
                <button 
                  onClick={() => setShowPhotoForm(true)}
                  className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Upload Photo
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.length > 0 ? photos.map(photo => (
                  <motion.div
                    layout
                    key={photo.id}
                    className="group bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl transition-all"
                  >
                    <div className="aspect-video relative overflow-hidden bg-stone-100">
                      <img 
                        src={photo.url} 
                        alt={photo.description} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 right-3">
                        <button 
                          onClick={async () => {
                            if (confirmDeletePhotoId !== photo.id) {
                              setConfirmDeletePhotoId(photo.id!);
                              setTimeout(() => setConfirmDeletePhotoId(null), 3000);
                              return;
                            }
                            await deleteDoc(doc(db, 'works', workId, 'photos', photo.id!));
                            setConfirmDeletePhotoId(null);
                          }}
                          className={cn(
                            "w-8 h-8 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all",
                            confirmDeletePhotoId === photo.id 
                              ? "bg-red-600 w-auto px-3 text-[10px] font-bold uppercase tracking-wider" 
                              : "bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-red-500"
                          )}
                        >
                          {confirmDeletePhotoId === photo.id ? "Confirm" : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-sm text-stone-900 font-medium line-clamp-2">{photo.description || 'No description'}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(photo.date), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="col-span-full py-20 text-center bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
                    <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <p className="text-stone-500">No photos uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showBillForm && (
          <BillModal 
            workId={workId} 
            onClose={() => setShowBillForm(false)} 
          />
        )}
        {showPhotoForm && (
          <PhotoModal 
            workId={workId} 
            onClose={() => setShowPhotoForm(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BillModal({ workId, onClose }: { workId: string, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    billNo: '',
    amount: 0 as number | string,
    submissionDate: new Date().toISOString().split('T')[0],
    status: 'Pending' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'works', workId, 'bills'), {
        ...formData,
        workId,
        createdAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `works/${workId}/bills`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8"
      >
        <h3 className="text-2xl font-serif font-medium text-stone-900 mb-6">Add New Bill</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Bill Number</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
              value={formData.billNo}
              onChange={e => setFormData({ ...formData, billNo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Amount (₹)</label>
            <input
              type="number"
              required
              className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
              value={formData.amount === '' || isNaN(formData.amount as number) ? '' : formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Submission Date</label>
            <input
              type="date"
              required
              className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
              value={formData.submissionDate}
              onChange={e => setFormData({ ...formData, submissionDate: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Record Bill
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PhotoModal({ workId, onClose }: { workId: string, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Firestore 1MB limit check (approx)
        alert('Image is too large. Please select a smaller image (under 800KB).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        setFormData(prev => ({ ...prev, url: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url) {
      alert('Please select a photo or provide a URL.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'works', workId, 'photos'), {
        ...formData,
        workId,
        createdAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `works/${workId}/photos`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
      >
        <h3 className="text-2xl font-serif font-medium text-stone-900 mb-6">Upload Site Photo</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-3xl p-6 bg-stone-50 hover:bg-stone-100 transition-all cursor-pointer group"
                 onClick={() => fileInputRef.current?.click()}>
              {preview ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white text-sm font-medium">Change Photo</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-stone-900">Take Photo or Upload</p>
                    <p className="text-xs text-stone-400 mt-1">Click to use camera or browse files</p>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-stone-400 font-bold tracking-widest">Or provide URL</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="url"
                placeholder="https://..."
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                value={formData.url.startsWith('data:') ? '' : formData.url}
                onChange={e => {
                  setFormData({ ...formData, url: e.target.value });
                  setPreview(null);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Description</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Describe the current progress shown..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Date Taken</label>
            <input
              type="date"
              required
              className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Save Photo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
