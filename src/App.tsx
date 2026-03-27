import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, signInEmail, signUpEmail, resetPassword, logOut, db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { WorkDetails } from './components/WorkDetails';
import { WorkForm } from './components/WorkForm';
import { Reports } from './components/Reports';
import { DistrictManagement } from './components/DistrictManagement';
import { LogIn, Loader2, AlertCircle, Mail, Lock, UserPlus, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'add-work' | 'work-details' | 'edit-work' | 'reports' | 'districts'>('dashboard');
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  
  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot-password'>('signin');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setError(`An unexpected error occurred: ${event.message}`);
    };
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      const reason = event.reason;
      const message = reason?.userMessage || reason?.message || 'Unknown error';
      setError(`A background task failed: ${message}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          let userDoc;
          try {
            userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`);
            return; // Should not reach here as handleFirestoreError throws
          }
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            
            // Auto-upgrade all users to admin if they aren't already
            if (data.role !== 'admin') {
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
                data.role = 'admin';
              } catch (e) {
                console.error('Failed to auto-upgrade to admin:', e);
              }
            }

            // If displayName is missing, try to update it from email
            if (!data.displayName && firebaseUser.email) {
              const emailPrefix = firebaseUser.email.split('@')[0];
              const newDisplayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
              const updatedProfile = { ...data, displayName: newDisplayName };
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { displayName: newDisplayName });
              } catch (e) {
                console.error('Failed to update missing displayName:', e);
              }
              setUserProfile(updatedProfile);
            } else {
              setUserProfile(data);
            }
          } else {
            // Create initial profile for any new user
            const emailPrefix = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User';
            const defaultDisplayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
            
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || defaultDisplayName,
              role: 'admin',
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            } catch (e) {
              handleFirestoreError(e, OperationType.CREATE, `users/${firebaseUser.uid}`);
            }
            setUserProfile(newProfile);
          }
        } catch (err: any) {
          console.error('Auth state change error:', err);
          const message = err.userMessage || 'Failed to load user profile. Please try refreshing.';
          setError(message);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setCurrentView('dashboard');
        setSelectedWorkId(null);
      }
      setLoading(false);
    });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
      unsubscribe();
    };
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningIn) return;
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    setIsSigningIn(true);
    setError(null);
    try {
      if (authMode === 'signin') {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password);
      }
    } catch (err: any) {
      let message = 'Authentication failed.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      console.error('Email auth error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSigningIn) return;
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setIsSigningIn(true);
    setError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      let message = 'Failed to send reset email.';
      if (err.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      }
      setError(message);
      console.error('Reset password error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const navigateTo = (view: 'dashboard' | 'add-work' | 'work-details' | 'edit-work' | 'reports' | 'districts', workId?: string) => {
    setCurrentView(view);
    if (workId) setSelectedWorkId(workId);
    else if (['dashboard', 'add-work', 'reports', 'districts'].includes(view)) setSelectedWorkId(null);
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
            {authMode === 'forgot-password' ? (
              <KeyRound className="w-8 h-8 text-emerald-600" />
            ) : (
              <LogIn className="w-8 h-8 text-emerald-600" />
            )}
          </div>
          <h1 className="text-3xl font-serif font-medium text-stone-900 mb-2">Civil Works Management</h1>
          <p className="text-stone-500 mb-8">
            {authMode === 'signin' ? 'Sign in to manage your projects' : 
             authMode === 'signup' ? 'Create an account to get started' : 
             'Reset your password'}
          </p>

          {authMode === 'forgot-password' ? (
            resetSent ? (
              <div className="text-center space-y-6">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <p className="text-emerald-800 text-sm">
                    Password reset link has been sent to <strong>{email}</strong>. Please check your inbox.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setResetSent(false);
                  }}
                  className="text-emerald-700 font-bold text-sm hover:text-emerald-800 flex items-center justify-center gap-2 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 mb-6 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-full font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {isSigningIn ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="w-full py-2 text-stone-500 text-sm font-medium hover:text-stone-800 transition-colors"
                >
                  Cancel
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6 text-left">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Password</label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot-password');
                        setError(null);
                      }}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 uppercase tracking-wider"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-full font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isSigningIn ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  authMode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />
                )}
                {isSigningIn ? 'Processing...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-stone-100">
            <p className="text-sm text-stone-500">
              {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                className="ml-2 font-bold text-emerald-700 hover:text-emerald-800"
              >
                {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Sign-in Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-red-600 font-medium uppercase tracking-wider">Troubleshooting:</p>
                  <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                    <li>Check your internet connection.</li>
                    <li>Ensure your email and password are correct.</li>
                    <li>If signing up, ensure your password is at least 6 characters.</li>
                  </ul>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="text-xs font-bold text-red-600 hover:text-red-800 mt-4 uppercase tracking-wider"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
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
            userRole={userProfile?.role}
            onCancel={() => navigateTo('dashboard')} 
            onSuccess={() => navigateTo('dashboard')} 
          />
        )}
        {currentView === 'edit-work' && selectedWorkId && user && (
          <WorkForm 
            userId={user.uid} 
            userRole={userProfile?.role}
            workId={selectedWorkId} 
            onCancel={() => navigateTo('work-details', selectedWorkId)} 
            onSuccess={() => navigateTo('work-details', selectedWorkId)} 
          />
        )}
        {currentView === 'work-details' && selectedWorkId && (
          <WorkDetails 
            workId={selectedWorkId} 
            userRole={userProfile?.role}
            onBack={() => navigateTo('dashboard')} 
            onEdit={() => navigateTo('edit-work', selectedWorkId)}
          />
        )}
        {currentView === 'reports' && user && (
          <Reports 
            userId={user.uid} 
            onSelectWork={(id) => navigateTo('work-details', id)}
          />
        )}
        {currentView === 'districts' && user && (
          <DistrictManagement 
            onBack={() => navigateTo('dashboard')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 p-4 rounded-xl shadow-lg flex items-center gap-3 max-w-md animate-in slide-in-from-bottom-4">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs font-bold">DISMISS</button>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
