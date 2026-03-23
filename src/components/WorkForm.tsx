import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Work } from '../types';
import { ArrowLeft, Save, Loader2, Info, Building2, FileText, Calendar, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { HeadOfAccountSelector } from './HeadOfAccountSelector';

interface WorkFormProps {
  userId: string;
  workId?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function WorkForm({ userId, workId, onCancel, onSuccess }: WorkFormProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!workId);
  const [formData, setFormData] = useState<Partial<Work>>({
    name: '',
    financialYear: `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`,
    classification: 'Fresh',
    estimateStatus: 'Submitted',
    physicalProgress: 0,
    progressRemarks: '',
  });

  useEffect(() => {
    if (workId) {
      const fetchWork = async () => {
        try {
          const workDoc = await getDoc(doc(db, 'works', workId));
          if (workDoc.exists()) {
            setFormData(workDoc.data() as Work);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `works/${workId}`);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchWork();
    }
  }, [workId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    try {
      const data = {
        ...formData,
        createdBy: userId,
        createdAt: formData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (workId) {
        await updateDoc(doc(db, 'works', workId), data);
      } else {
        await addDoc(collection(db, 'works'), data);
      }
      onSuccess();
    } catch (err) {
      handleFirestoreError(err, workId ? OperationType.UPDATE : OperationType.CREATE, 'works');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (type === 'number' || type === 'range') ? (value === '' ? undefined : parseFloat(value)) : value
    }));
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <button onClick={onCancel} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
        <h2 className="text-3xl font-serif font-medium text-stone-900">
          {workId ? 'Edit Work Details' : 'Register New Work'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center">
              <Info className="w-4 h-4 text-stone-500" />
            </div>
            <h3 className="text-lg font-medium text-stone-900">Basic Information</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Work Name</label>
              <textarea
                name="name"
                required
                rows={3}
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                placeholder="Enter full name of the work..."
                value={formData.name || ''}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Financial Year</label>
                <input
                  type="text"
                  name="financialYear"
                  required
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="e.g., 2023-24"
                  value={formData.financialYear || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Classification</label>
                <select
                  name="classification"
                  required
                  className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                  value={formData.classification || 'Fresh'}
                  onChange={handleChange}
                >
                  <option value="Fresh">Fresh Work</option>
                  <option value="Spillover">Spillover Work</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Estimate & Sanction */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-stone-500" />
            </div>
            <h3 className="text-lg font-medium text-stone-900">Estimate & Sanction</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Estimate Year</label>
              <input
                type="text"
                name="estimateYear"
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="e.g., 2023"
                value={formData.estimateYear || ''}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Estimate Status</label>
              <select
                name="estimateStatus"
                required
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                value={formData.estimateStatus || 'Submitted'}
                onChange={handleChange}
              >
                <option value="Submitted">Submitted</option>
                <option value="Sanctioned">Sanctioned</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Estimated Cost</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="number"
                  name="estimatedCost"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="0.00"
                  value={formData.estimatedCost === undefined || isNaN(formData.estimatedCost as number) ? '' : formData.estimatedCost}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Sanction Ref No.</label>
              <input
                type="text"
                name="sanctionRefNo"
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Enter reference number..."
                value={formData.sanctionRefNo || ''}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Sanction Date</label>
              <input
                type="date"
                name="sanctionDate"
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.sanctionDate || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Agency & Agreement */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-stone-500" />
            </div>
            <h3 className="text-lg font-medium text-stone-900">Agency & Agreement</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <HeadOfAccountSelector 
                value={formData.headOfAccount || ''} 
                onChange={(val) => setFormData(prev => ({ ...prev, headOfAccount: val }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Agency/Contractor Name</label>
              <input
                type="text"
                name="agencyName"
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Enter agency name..."
                value={formData.agencyName || ''}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Agreement No.</label>
              <input
                type="text"
                name="agreementNo"
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Enter agreement number..."
                value={formData.agreementNo || ''}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Agreement Date</label>
              <input
                type="date"
                name="agreementDate"
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.agreementDate || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Progress */}
        <section className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-stone-500" />
            </div>
            <h3 className="text-lg font-medium text-stone-900">Initial Progress</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Physical Progress (%)</label>
                <span className="text-lg font-bold text-emerald-600">{formData.physicalProgress}%</span>
              </div>
              <input
                type="range"
                name="physicalProgress"
                min="0"
                max="100"
                className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                value={formData.physicalProgress === undefined || isNaN(formData.physicalProgress as number) ? 0 : formData.physicalProgress}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Progress Remarks</label>
              <textarea
                name="progressRemarks"
                rows={2}
                className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                placeholder="Add any initial remarks..."
                value={formData.progressRemarks || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {workId ? 'Update Work Details' : 'Register Work'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-4 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-2xl font-bold transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
}
