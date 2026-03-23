import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { HeadOfAccount } from '../types';
import { Plus, Edit2, Trash2, Check, X, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeadOfAccountSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function HeadOfAccountSelector({ value, onChange }: HeadOfAccountSelectorProps) {
  const [hoas, setHoas] = useState<HeadOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newHoa, setNewHoa] = useState({ code: '', name: '' });
  const [editHoa, setEditHoa] = useState({ code: '', name: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'headsOfAccount'), orderBy('code', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHoas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HeadOfAccount)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'headsOfAccount'));

    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!newHoa.code || !newHoa.name) return;
    try {
      await addDoc(collection(db, 'headsOfAccount'), newHoa);
      setNewHoa({ code: '', name: '' });
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'headsOfAccount');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editHoa.code || !editHoa.name) return;
    try {
      await updateDoc(doc(db, 'headsOfAccount', id), editHoa);
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'headsOfAccount');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this Head of Account?')) return;
    try {
      await deleteDoc(doc(db, 'headsOfAccount', id));
      if (value === hoas.find(h => h.id === id)?.code + ' - ' + hoas.find(h => h.id === id)?.name) {
        onChange('');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'headsOfAccount');
    }
  };

  const filteredHoas = hoas.filter(hoa => 
    hoa.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    hoa.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative space-y-2">
      <label className="text-sm font-bold text-stone-400 uppercase tracking-wider">Head of Account</label>
      
      <div className="relative">
        <div 
          className="w-full px-4 py-3 bg-stone-50 border-none rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500 transition-all flex items-center gap-2 cursor-pointer"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <Search className="w-4 h-4 text-stone-400" />
          <input
            type="text"
            className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-stone-900 placeholder:text-stone-400"
            placeholder="Select or search Head of Account..."
            value={searchTerm || value}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-stone-400" />}
        </div>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden max-h-80 flex flex-col"
            >
              <div className="overflow-y-auto flex-1">
                {filteredHoas.length === 0 && !loading && !isAdding && (
                  <div className="p-4 text-center text-stone-500 text-sm">
                    No matching Head of Account found.
                  </div>
                )}
                
                {filteredHoas.map(hoa => (
                  <div 
                    key={hoa.id}
                    className="group flex items-center gap-2 p-2 hover:bg-stone-50 transition-colors cursor-pointer"
                    onClick={() => {
                      onChange(`${hoa.code} - ${hoa.name}`);
                      setSearchTerm('');
                      setShowDropdown(false);
                    }}
                  >
                    {editingId === hoa.id ? (
                      <div className="flex-1 flex gap-2 p-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          className="w-24 px-2 py-1 text-sm bg-white border border-stone-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                          value={editHoa.code}
                          onChange={e => setEditHoa({ ...editHoa, code: e.target.value })}
                          placeholder="Code"
                        />
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 text-sm bg-white border border-stone-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                          value={editHoa.name}
                          onChange={e => setEditHoa({ ...editHoa, name: e.target.value })}
                          placeholder="Name"
                        />
                        <button 
                          onClick={() => handleUpdate(hoa.id!)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="p-1 text-stone-400 hover:bg-stone-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 px-2">
                          <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mr-2">
                            {hoa.code}
                          </span>
                          <span className="text-sm text-stone-700">{hoa.name}</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 pr-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(hoa.id!);
                              setEditHoa({ code: hoa.code, name: hoa.name });
                            }}
                            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => handleDelete(e, hoa.id!)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3 bg-stone-50 border-t border-stone-100">
                {isAdding ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="w-24 px-3 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Code"
                      value={newHoa.code}
                      onChange={e => setNewHoa({ ...newHoa, code: e.target.value })}
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Name"
                      value={newHoa.name}
                      onChange={e => setNewHoa({ ...newHoa, name: e.target.value })}
                    />
                    <button 
                      onClick={handleAdd}
                      className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setIsAdding(false)}
                      className="p-2 bg-stone-200 text-stone-600 rounded-xl hover:bg-stone-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Head of Account
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Close dropdown on click outside */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowDropdown(false);
            setSearchTerm('');
          }}
        />
      )}
    </div>
  );
}
