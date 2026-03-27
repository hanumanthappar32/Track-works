import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { District } from '../types';
import { Plus, Trash2, Edit3, Save, X, MapPin, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DistrictManagementProps {
  onBack: () => void;
}

export function DistrictManagement({ onBack }: DistrictManagementProps) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDistrictName, setNewDistrictName] = useState('');
  const [editFormData, setEditFormData] = useState<{ name: string; thaluks: string[] }>({ name: '', thaluks: [] });
  const [newThaluk, setNewThaluk] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'districts'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDistricts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as District)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'districts');
    });

    return () => unsubscribe();
  }, []);

  const handleAddDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDistrictName.trim()) return;

    try {
      await addDoc(collection(db, 'districts'), {
        name: newDistrictName.trim(),
        thaluks: []
      });
      setNewDistrictName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'districts');
    }
  };

  const handleStartEdit = (district: District) => {
    setEditingId(district.id!);
    setEditFormData({ name: district.name, thaluks: [...district.thaluks] });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editFormData.name.trim()) return;

    try {
      await updateDoc(doc(db, 'districts', editingId), {
        name: editFormData.name.trim(),
        thaluks: editFormData.thaluks
      });
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `districts/${editingId}`);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteDistrict = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000); // Reset after 3 seconds
      return;
    }

    try {
      await deleteDoc(doc(db, 'districts', id));
      setConfirmDeleteId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `districts/${id}`);
    }
  };

  const handleAddThaluk = () => {
    if (!newThaluk.trim()) return;
    if (editFormData.thaluks.includes(newThaluk.trim())) {
      return;
    }
    setEditFormData(prev => ({
      ...prev,
      thaluks: [...prev.thaluks, newThaluk.trim()].sort()
    }));
    setNewThaluk('');
  };

  const handleRemoveThaluk = (thaluk: string) => {
    setEditFormData(prev => ({
      ...prev,
      thaluks: prev.thaluks.filter(t => t !== thaluk)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
        <h2 className="text-3xl font-serif font-medium text-stone-900">Manage Districts & Thaluks</h2>
      </div>

      {/* Add District Form */}
      <section className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
        <h3 className="text-lg font-medium text-stone-900 mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          Add New District
        </h3>
        <form onSubmit={handleAddDistrict} className="flex gap-4">
          <input
            type="text"
            placeholder="Enter district name..."
            className="flex-1 px-4 py-3 bg-stone-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
            value={newDistrictName}
            onChange={(e) => setNewDistrictName(e.target.value)}
          />
          <button
            type="submit"
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-600/20"
          >
            Add District
          </button>
        </form>
      </section>

      {/* Districts List */}
      <div className="grid grid-cols-1 gap-6">
        {districts.map(district => (
          <motion.div
            layout
            key={district.id}
            className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden"
          >
            {editingId === district.id ? (
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    className="flex-1 text-xl font-serif font-medium px-4 py-2 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-all">
                      <Save className="w-5 h-5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Thaluks</label>
                  <div className="flex flex-wrap gap-2">
                    {editFormData.thaluks.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                        {t}
                        <button onClick={() => handleRemoveThaluk(t)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add thaluk..."
                      className="flex-1 px-4 py-2 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                      value={newThaluk}
                      onChange={(e) => setNewThaluk(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddThaluk()}
                    />
                    <button
                      onClick={handleAddThaluk}
                      className="px-4 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-stone-500" />
                    </div>
                    <div>
                      <h4 className="text-xl font-serif font-medium text-stone-900">{district.name}</h4>
                      <p className="text-stone-500 text-sm">{district.thaluks.length} Thaluks</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleStartEdit(district)} 
                      className="p-2 text-stone-400 hover:text-emerald-600 transition-all"
                      title="Edit District"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteDistrict(district.id!)} 
                      className={cn(
                        "p-2 transition-all rounded-lg flex items-center gap-2",
                        confirmDeleteId === district.id 
                          ? "bg-red-500 text-white px-4 text-[10px] font-bold uppercase tracking-wider" 
                          : "text-stone-400 hover:text-red-500"
                      )}
                      title={confirmDeleteId === district.id ? "Click again to confirm" : "Delete District"}
                    >
                      {confirmDeleteId === district.id ? (
                        <>
                          <Trash2 className="w-3 h-3" />
                          Confirm
                        </>
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {district.thaluks.length > 0 ? (
                    district.thaluks.map(t => (
                      <span key={t} className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-medium">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-stone-400 text-xs italic">No thaluks added yet.</span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {districts.length === 0 && (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-stone-200">
            <MapPin className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500">No districts added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
