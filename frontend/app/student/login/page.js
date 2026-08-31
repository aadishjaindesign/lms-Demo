"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function StudentLoginPage() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const res = await fetchApi("/student/dashboard");
        if (res.ok) {
          router.push("/student");
        }
      } catch (e) {
        // Ignored
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetchApi("/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        router.push("/student");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center bg-[#fceeed] border-b border-red-100">
          <img src="/logo@2x.png" alt="Logo" className="h-12 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#c71e22]">Student Portal</h2>
          <p className="text-red-700/80 text-sm mt-2">Sign in to access your courses</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium text-center">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Student ID</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#c71e22] focus:border-transparent outline-none transition-all"
              placeholder="Enter your student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#c71e22] focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c71e22] hover:bg-[#a5191c] text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-md shadow-red-200 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
