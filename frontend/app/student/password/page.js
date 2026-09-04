"use client";
import { useState } from "react";
import { fetchApi } from "@/lib/api";

export default function PasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetchApi("/student/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Failed to change password.");
      }
    } catch (err) {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-2xl mx-auto mt-6 md:mt-10">
      <div className="bg-white rounded-[20px] p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Change Password</h2>
        <p className="text-gray-500 mb-8">Update your password to keep your account secure.</p>

        {success ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 font-medium border border-green-100 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            Password changed successfully! You will need to use this new password next time you log in.
          </div>
        ) : null}

        {error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 font-medium border border-red-100 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input 
              type="password" 
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#c71e22] focus:border-transparent transition-all min-w-0 text-gray-900"
              placeholder="Enter current password"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input 
              type="password" 
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#c71e22] focus:border-transparent transition-all min-w-0 text-gray-900"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#c71e22] focus:border-transparent transition-all min-w-0 text-gray-900"
              placeholder="Confirm new password"
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full bg-[#c71e22] text-white font-semibold px-4 sm:px-6 py-3 rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2 text-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
