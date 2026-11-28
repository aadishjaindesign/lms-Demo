"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetchApi("/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        try {
          localStorage.setItem("admin_email", email);
          if (data.token) {
            localStorage.setItem("token", data.token);
          }
        } catch (e) {
          console.warn("localStorage not available", e);
        }
        router.push("/portal-mgmt-hq-8x9q2/admin/students/");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans text-white select-none relative bg-transparent"
    >
      <div className="bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center bg-black/40 border-b border-white/10">
          <img src="/logo-white@2x.png" alt="Jains Computer" className="h-10 mx-auto mb-4 object-contain" />
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Admin Gateway</h2>
          <p className="text-gray-400 text-xs mt-1.5 font-medium">LMS Management & Core Administration</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="bg-rose-950/60 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl text-xs font-semibold text-center">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Admin Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/15 focus:border-red-500/50 focus:ring-2 focus:ring-[#D71D3A]/30 outline-none transition-all text-sm text-white placeholder-gray-500"
              placeholder="admin@jainscomputer.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/15 focus:border-red-500/50 focus:ring-2 focus:ring-[#D71D3A]/30 outline-none transition-all text-sm text-white placeholder-gray-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#D71D3A] to-[#BA142D] hover:brightness-110 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-red-950/60 disabled:opacity-50 text-sm mt-2"
          >
            {loading ? "Authenticating Gateway..." : "Access Admin Portal"}
          </button>
        </form>
      </div>
    </div>
  );
}
