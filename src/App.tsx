import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, signIn, logOut, db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { WorkDetails } from './components/WorkDetails';
import { WorkForm } from './components/WorkForm';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'add-work' | 'work-details' | 'edit-work'>('dashboard');
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            // Create initial profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName,
              role: 'engineer', // Default role
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setCurrentView('dashboard');
        setSelectedWorkId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      // Ignore cancelled popup request or popup closed by user
      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        setError('Failed to sign in. Please try again.');
        console.error('Sign in error:', err);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const navigateTo = (view: 'dashboard' | 'add-work' | 'work-details' | 'edit-work', workId?: string) => {
    setCurrentView(view);
    if (workId) setSelectedWorkId(workId);
    else if (view === 'dashboard' || view === 'add-work') setSelectedWorkId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-stone-200"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-serif font-medium text-stone-900 mb-2">Civil Works Management</h1>
          <p className="text-stone-500 mb-8">Sign in to manage and monitor public works progress.</p>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSigningIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
            )}
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout 
      userProfile={userProfile} 
      onLogout={logOut} 
      onNavigate={navigateTo}
      currentView={currentView}
    >
      <AnimatePresence mode="wait">
        {currentView === 'dashboard' && user && (
          <Dashboard 
            userId={user.uid} 
            onSelectWork={(id) => navigateTo('work-details', id)} 
            onAddWork={() => navigateTo('add-work')} 
          />
        )}
        {currentView === 'add-work' && user && (
          <WorkForm 
            userId={user.uid} 
            onCancel={() => navigateTo('dashboard')} 
            onSuccess={() => navigateTo('dashboard')} 
          />
        )}
        {currentView === 'edit-work' && selectedWorkId && user && (
          <WorkForm 
            userId={user.uid} 
            workId={selectedWorkId} 
            onCancel={() => navigateTo('work-details', selectedWorkId)} 
            onSuccess={() => navigateTo('work-details', selectedWorkId)} 
          />
        )}
        {currentView === 'work-details' && selectedWorkId && (
          <WorkDetails 
            workId={selectedWorkId} 
            onBack={() => navigateTo('dashboard')} 
            onEdit={() => navigateTo('edit-work', selectedWorkId)}
          />
        )}
      </AnimatePresence>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 p-4 rounded-xl shadow-lg flex items-center gap-3 max-w-md animate-in slide-in-from-bottom-4">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs font-bold">DISMISS</button>
        </div>
      )}
    </Layout>
  );
}
