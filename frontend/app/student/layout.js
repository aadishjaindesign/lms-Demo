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

  useEffect(() => {
    // Skip auth check if we're on the login page
    if (pathname === '/student/login') {
      setIsChecking(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetchApi('/student/dashboard');
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          router.push('/student/login');
        }
      } catch (err) {
        router.push('/student/login');
      } finally {
        setIsChecking(false);
      }
    };
    
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
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm hidden md:flex">
        <div className="p-6 border-b border-gray-100 flex justify-center items-center">
          <img src="/logo@2x.png" alt="Logo" className="h-10" />
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-3">Menu</div>
          
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
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
        <header className="bg-white border-b border-gray-100 h-20 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800">{headerTitle}</h1>
          </div>
          <div className="flex items-center space-x-6">
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
