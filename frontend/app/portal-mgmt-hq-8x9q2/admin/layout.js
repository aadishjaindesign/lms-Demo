"use client";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useState } from 'react';
import SessionConflictModal from '@/components/SessionConflictModal';

const ADMIN_BASE = '/portal-mgmt-hq-8x9q2/admin';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (pathname === `${ADMIN_BASE}/login` || pathname === `${ADMIN_BASE}/login/`) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      await fetchApi('/auth/logout', { method: 'POST' });
      router.push(`${ADMIN_BASE}/login/`);
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const manageItems = [
    { 
      name: 'Students', 
      path: `${ADMIN_BASE}/students/`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
      )
    },
    { 
      name: 'Courses', 
      path: `${ADMIN_BASE}/courses/`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
      )
    },
    { 
      name: 'Attendance', 
      path: `${ADMIN_BASE}/attendance/`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
        </svg>
      )
    },
  ];

  const accountItems = [
    {
      name: 'Profile',
      path: `${ADMIN_BASE}/profile/`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
      )
    },
    {
      name: 'Change Password',
      path: `${ADMIN_BASE}/password/`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
      )
    },
    {
      name: 'System Information',
      path: `${ADMIN_BASE}/system/`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      )
    },
  ];

  const renderNavItem = (item) => {
    const isActive = item.path === ADMIN_BASE 
      ? pathname === ADMIN_BASE 
      : pathname.startsWith(item.path);
    
    return (
      <Link 
        key={item.path} 
        href={item.path}
        onClick={() => setIsSidebarOpen(false)}
        className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 group ${
          isActive 
            ? 'bg-gradient-to-r from-[#D71D3A] to-[#BA142D] text-white shadow-lg shadow-red-950/60 font-semibold' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white transition-colors'}>
            {item.icon}
          </span>
          <span>{item.name}</span>
        </div>
        {isActive && (
          <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path>
          </svg>
        )}
      </Link>
    );
  };

  return (
    <div 
      className="flex h-screen overflow-hidden font-sans text-white select-none relative bg-transparent"
    >
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-20 md:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:relative z-30 w-[240px] h-full border-r border-white/10 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{
          background: "linear-gradient(180deg, #150204 0%, #0d0102 50%, #050001 100%)",
        }}
      >
        {/* Logo Area */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-white@2x.png" alt="Jains Computer" width={140} height={36} className="object-contain" priority />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {/* Dashboard */}
          <div className="mb-5">
            {renderNavItem({ 
              name: 'Dashboard', 
              path: ADMIN_BASE,
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                </svg>
              )
            })}
          </div>

          {/* Manage Section */}
          <div className="mb-5">
            <h3 className="px-4 text-[11px] font-bold text-gray-400/80 uppercase tracking-widest mb-3">Manage</h3>
            <div className="space-y-1.5">
              {manageItems.map(renderNavItem)}
            </div>
          </div>

          {/* Account Section */}
          <div className="mb-5">
            <h3 className="px-4 text-[11px] font-bold text-gray-400/80 uppercase tracking-widest mb-3">Account</h3>
            <div className="space-y-1.5">
              {accountItems.map(renderNavItem)}
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all duration-200 group"
          >
            <svg className="w-5 h-5 mr-3 text-gray-500 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-6 bg-black/40 backdrop-blur-xl flex-shrink-0 min-w-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            {/* Admin Panel Badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-500/30 ml-2 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
              Admin Gateway HQ
            </span>
          </div>
          
          <div className="flex items-center gap-4 flex-shrink-0 ml-2">
            {/* User Info */}
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#D71D3A] to-[#BA142D] text-white font-bold flex items-center justify-center text-sm flex-shrink-0 shadow-md shadow-red-950/50">A</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-semibold text-white leading-tight">Admin</span>
                <span className="text-xs text-gray-400 font-medium">Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-5 md:p-6 relative min-w-0">
          {children}
        </div>

        {/* Footer */}
        <footer className="py-3 border-t border-white/10 flex flex-col md:flex-row items-center justify-center md:justify-between px-4 md:px-6 text-xs text-gray-500 font-medium bg-black/40 backdrop-blur-sm flex-shrink-0 gap-1 text-center">
          <span>© 2026 Jains Computer. All rights reserved.</span>
          <span>LMS Administration Core</span>
        </footer>
      </main>
      <SessionConflictModal />
    </div>
  );
}
