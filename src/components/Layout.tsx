import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LayoutDashboard, PlusCircle, LogOut, User as UserIcon, HardHat, Menu, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  userProfile: UserProfile | null;
  onLogout: () => void;
  onNavigate: (view: 'dashboard' | 'add-work' | 'work-details' | 'edit-work') => void;
  currentView: string;
}

export function Layout({ children, userProfile, onLogout, onNavigate, currentView }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (view: 'dashboard' | 'add-work' | 'work-details' | 'edit-work') => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-stone-900 text-white p-4 flex items-center justify-between border-b border-stone-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <HardHat className="text-white w-5 h-5" />
          </div>
          <h1 className="font-serif font-bold text-lg">FirePay</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-stone-900 text-stone-300 flex flex-col border-r border-stone-800 z-50 transition-transform duration-300 lg:relative lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden lg:flex items-center gap-3 border-b border-stone-800">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <HardHat className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-white font-serif font-bold text-lg leading-tight">FirePay</h1>
            <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Civil Works</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => handleNavigate('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              currentView === 'dashboard' || currentView === 'work-details' || currentView === 'edit-work'
                ? "bg-emerald-600/10 text-emerald-500 font-medium"
                : "hover:bg-stone-800 hover:text-white"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => handleNavigate('add-work')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              currentView === 'add-work'
                ? "bg-emerald-600/10 text-emerald-500 font-medium"
                : "hover:bg-stone-800 hover:text-white"
            )}
          >
            <PlusCircle className="w-5 h-5" />
            New Work
          </button>
        </nav>

        <div className="p-4 border-t border-stone-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 bg-stone-700 rounded-full flex items-center justify-center text-stone-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userProfile?.displayName || 'User'}</p>
              <p className="text-[10px] text-stone-500 uppercase font-bold">{userProfile?.role || 'Engineer'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              onLogout();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-stone-500 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
