"use client";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { useState } from 'react';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const manageItems = [
    { 
      name: 'Students', 
      path: '/admin/students',
      icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
    },
    { 
      name: 'Courses', 
      path: '/admin/courses',
      icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
    },
  ];

  const accountItems = [
    {
      name: 'Profile',
      path: '/admin/profile',
      icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
    },
    {
      name: 'Change Password',
      path: '/admin/password',
      icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
    },
    {
      name: 'System Information',
      path: '/admin/system',
      icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    },
  ];

  let headerTitle = "Dashboard";
  if (pathname.includes('/students')) headerTitle = "Students";
  else if (pathname.includes('/courses')) headerTitle = "Courses";
  else if (pathname.includes('/profile')) headerTitle = "Profile";
  else if (pathname.includes('/password')) headerTitle = "Change Password";
  else if (pathname.includes('/system')) headerTitle = "System Information";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-30 w-[260px] h-full bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between md:justify-center">
          <Image src="/logo@2x.png" alt="Jains Computer" width={160} height={40} className="object-contain" priority />
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <Link 
            href="/admin" 
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-6 ${pathname === '/admin' ? 'bg-[#c71e22] text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50 hover:text-[#c71e22]'}`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            Dashboard
          </Link>

          <div className="mb-6">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Manage</h3>
            <div className="space-y-1">
              {manageItems.map((item) => {
                const isActive = pathname.startsWith(item.path);
                return (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-[#fceeed] text-[#c71e22]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#c71e22]'}`}
                  >
                    <div className={`${isActive ? 'text-[#c71e22] bg-[#fceeed]' : 'text-red-300 bg-red-50'} p-1.5 rounded-md mr-3`}>
                      {item.icon}
                    </div>
                    <span className="-ml-2">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Account</h3>
            <div className="space-y-1">
              {accountItems.map((item) => {
                const isActive = pathname.startsWith(item.path);
                return (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-[#fceeed] text-[#c71e22]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#c71e22]'}`}
                  >
                    <div className={`${isActive ? 'text-[#c71e22] bg-[#fceeed]' : 'text-red-300 bg-red-50'} p-1.5 rounded-md mr-3`}>
                      {item.icon}
                    </div>
                    <span className="-ml-2">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors"
          >
            <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-white relative">
        {/* Header */}
        <header className="h-20 border-b border-gray-100 flex items-center justify-between px-4 md:px-8 bg-white flex-shrink-0 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-lg flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{headerTitle}</h1>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-6 flex-shrink-0 ml-2">
            <button className="text-gray-600 hover:text-gray-800 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            </button>
            <button className="text-gray-600 hover:text-gray-800 transition-colors relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">5</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-100 text-[#c71e22] font-bold flex items-center justify-center text-lg flex-shrink-0">A</div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-bold text-gray-800 leading-tight">Admin</span>
                <span className="text-xs text-gray-500 font-medium">Administrator</span>
              </div>
              <svg className="hidden sm:block w-4 h-4 text-gray-500 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
        </div>

        {/* Footer */}
        <footer className="py-4 border-t border-gray-100 flex flex-col md:flex-row items-center justify-center md:justify-between px-4 md:px-8 text-xs text-gray-400 font-medium bg-white flex-shrink-0 gap-1 text-center">
          <span>2025 Jains Computer. All rights reserved.</span>
          <span>LMS Admin Panel</span>
        </footer>
      </main>
    </div>
  );
}
