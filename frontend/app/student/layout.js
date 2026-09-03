"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useState, useEffect } from "react";

export default function StudentLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Skip auth check if we're on the login page
    if (pathname === '/student/login') {
      setIsChecking(false);
      return;
    }

    if (isAuthenticated) {
      setIsChecking(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetchApi('/student/dashboard');
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          if (res.status === 401 || res.status === 403) {
            console.error(`
[AUTO LOGOUT DEBUG]
Reason: checkAuth returned ${res.status}
HTTP status: ${res.status}
Request URL: /student/dashboard
Role: student
Timestamp: ${new Date().toISOString()}
Stack trace: ${new Error().stack}
            `);
            router.push('/student/login');
          }
          // Do not redirect on 500 or temporary network issues
        }
      } catch (err) {
        console.error(`
[AUTO LOGOUT DEBUG]
Reason: checkAuth threw an exception
Error message: ${err.message}
Request URL: /student/dashboard
Role: student
Timestamp: ${new Date().toISOString()}
Stack trace: ${err.stack}
        `);
        // Do not aggressively redirect on network errors!
        // We leave isAuthenticated as false, which might render null, 
        // but we don't want to destroy the session.
        // Actually, if it fails due to network, let's just assume authenticated for now 
        // to not break the UI, or just show a fallback error state.
        setIsAuthenticated(true);
      } finally {
        setIsChecking(false);
      }
    };
    
    // Only check auth once on initial load, or rely on global fetchApi interceptor
    // to catch subsequent 401s during navigation.
    checkAuth();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
      router.push("/student/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/student", exact: true },
    { name: "My Courses", href: "/student/courses", exact: false },
    { name: "Profile", href: "/student/profile", exact: false },
    { name: "Change Password", href: "/student/password", exact: false },
  ];

  let headerTitle = "Student Portal";
  if (pathname.includes("/student/courses")) headerTitle = "My Courses";
  else if (pathname.includes("/student/profile")) headerTitle = "Profile";
  else if (pathname.includes("/student/password")) headerTitle = "Change Password";
  else if (pathname === "/student") headerTitle = "Dashboard";

  if (pathname === '/student/login') {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c71e22] mb-4"></div>
        <div className="text-gray-500 font-medium">Loading session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-30 w-64 h-full bg-white border-r border-gray-100 flex flex-col shadow-sm transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-gray-100 flex justify-between md:justify-center items-center">
          <img src="/logo@2x.png" alt="Logo" className="h-10" />
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-3">Menu</div>
          
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive 
                    ? "bg-[#fceeed] text-[#C62026]" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 h-20 flex items-center justify-between px-3 sm:px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{headerTitle}</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-6 ml-2 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#fceeed] text-[#C62026] flex items-center justify-center font-bold">
                S
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-gray-900">Student</div>
                <div className="text-xs text-gray-500">Learner</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
