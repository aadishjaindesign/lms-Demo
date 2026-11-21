"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { Suspense } from "react";

function StudentDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [student, setStudent] = useState(null);
  const [accessRecords, setAccessRecords] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingAccess, setEditingAccess] = useState(null);

  const fetchStudentData = async () => {
    setLoading(true);
    setError("");
    try {
      const [studentRes, accessRes, coursesRes] = await Promise.all([
        fetchApi(`/students/${id}`),
        fetchApi(`/students/${id}/course-access`),
        fetchApi("/courses")
      ]);

      if (!studentRes.ok) throw new Error("Failed to fetch student details");
      const studentData = await studentRes.json();
      setStudent(studentData);

      if (accessRes.ok) {
        setAccessRecords(await accessRes.json());
      }
      if (coursesRes.ok) {
        setCourses((await coursesRes.json()).filter(c => c.status === 'active'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const handleDeleteAccess = async (accessId) => {
    if (!confirm("Are you sure you want to permanently delete this course access? This action cannot be undone.")) return;
    try {
      const res = await fetchApi(`/students/${id}/course-access/${accessId}`, { method: "DELETE" });
      if (res.ok) fetchStudentData();
      else alert((await res.json()).error || "Failed to delete access");
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm("Are you sure you want to generate a new password for this student?")) return;
    
    // Generate a random 8-character password (cryptographically secure; no look-alike characters)
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const bytes = new Uint32Array(8);
    window.crypto.getRandomValues(bytes);
    const newPassword = Array.from(bytes, (n) => chars[n % chars.length]).join("");
    
    try {
      const res = await fetchApi(`/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      });
      
      if (res.ok) {
        alert(`Password reset successfully!\n\nNew Password: ${newPassword}\n\nPlease share it with the student. They have been signed out of all devices and must log in with this new password.`);
        fetchStudentData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to reset password");
      }
    } catch (e) {
      alert("An unexpected error occurred");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-[#c71e22] mb-4"></div>
        <p className="text-gray-500 font-medium text-sm">Loading student details...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <p className="text-gray-600 font-medium mb-4">{error || "Student not found"}</p>
        <Link href="/portal-mgmt-hq-8x9q2/admin/students/" className="text-[#c71e22] hover:underline font-semibold text-sm">&larr; Back to Students</Link>
      </div>
    );
  }

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto h-full text-white">
      {/* Back link */}
      <Link href="/portal-mgmt-hq-8x9q2/admin/students/" className="text-sm font-medium text-gray-400 hover:text-white inline-flex items-center gap-1.5 transition-colors w-fit">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Back to Students
      </Link>

      {/* Student Info Card */}
      <div className="bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-xl font-bold flex-shrink-0">
              {getInitial(student.name)}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">{student.name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="inline-block bg-white/5 text-gray-300 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/10">
                  {student.studentId}
                </span>
                <span className="text-gray-400 text-sm">{student.phone}</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${student.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                  {student.status}
                </span>
                {student.plainPassword && (
                  <span className="text-gray-300 text-xs ml-2 font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 select-all">
                    Password: {student.plainPassword}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Access Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg font-bold text-white">Course Access</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleResetPassword}
            className="bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 rounded-xl transition-all font-semibold text-sm flex items-center gap-2 border border-white/15"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
            Reset Password
          </button>
          <button 
            onClick={() => setIsAssignModalOpen(true)}
            className="bg-gradient-to-r from-[#D71D3A] to-[#BA142D] hover:brightness-110 active:scale-95 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-red-950/60 transition-all font-semibold text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
            Assign Course
          </button>
        </div>
      </div>

      {/* Course Access Table */}
      <div className="bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 overflow-hidden flex-1">
        {accessRecords.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            <p className="font-medium text-gray-400">No courses assigned yet.</p>
            <p className="text-sm text-gray-500 mt-1">Click &quot;Assign Course&quot; to grant syllabus access.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/50 text-gray-400 uppercase text-xs tracking-wider font-semibold border-b border-white/10">
                  <th className="py-3.5 px-6">Course Name</th>
                  <th className="py-3.5 px-6 text-center">Duration</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {accessRecords.map((record) => {
                  const isActive = record.status === 'active';
                  const isExpired = new Date() > new Date(record.expiryDate);
                  let displayStatus = record.status;
                  if (isActive && isExpired) displayStatus = "expired";

                  return (
                    <tr key={record._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-semibold text-white">
                        {record.courseId?.name || "Unknown Course"}
                      </td>
                      <td className="py-4 px-6 text-center text-gray-400 whitespace-nowrap text-sm font-mono">
                        {new Date(record.startDate).toLocaleDateString('en-GB')} 
                        <span className="mx-2 text-gray-600">→</span> 
                        <span className={isExpired ? "text-rose-400 font-semibold" : "text-gray-300"}>{new Date(record.expiryDate).toLocaleDateString('en-GB')}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize
                          ${displayStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                            displayStatus === 'expired' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                            'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-3 whitespace-nowrap">
                        <button 
                          onClick={() => setEditingAccess(record)}
                          className="text-rose-400 hover:text-rose-300 font-semibold text-sm"
                        >
                          {isActive && !isExpired ? 'Edit' : 'Extend'}
                        </button>
                        <button 
                          onClick={() => handleDeleteAccess(record._id)}
                          className="text-gray-400 hover:text-white font-semibold text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAssignModalOpen && (
        <AssignCourseModal 
          studentId={id}
          courses={courses}
          assignedCourseIds={accessRecords.map((a) => a.courseId?._id).filter(Boolean)}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => { setIsAssignModalOpen(false); fetchStudentData(); }}
        />
      )}

      {editingAccess && (
        <AssignCourseModal 
          studentId={id}
          courses={courses}
          access={editingAccess}
          onClose={() => setEditingAccess(null)}
          onSuccess={() => { setEditingAccess(null); fetchStudentData(); }}
        />
      )}
    </div>
  );
}

export default function StudentDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading student details...</div>}>
      <StudentDetailsContent />
    </Suspense>
  );
}

function AssignCourseModal({ studentId, courses, access, assignedCourseIds = [], onClose, onSuccess }) {
  const [courseId, setCourseId] = useState(access?.courseId?._id || "");
  // New assignment: several courses can be ticked and assigned in one go
  const [selectedIds, setSelectedIds] = useState(new Set());
  const toggleCourse = (cid) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(cid) ? next.delete(cid) : next.add(cid);
      return next;
    });
  const [startDate, setStartDate] = useState(
    access ? new Date(access.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  
  const getDefaultExpiry = (start) => {
    const d = new Date(start);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const [expiryDate, setExpiryDate] = useState(
    access ? new Date(access.expiryDate).toISOString().split('T')[0] : getDefaultExpiry(new Date())
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!access) {
      if (selectedIds.size === 0) {
        setError("Select at least one course");
        setLoading(false);
        return;
      }
      try {
        const results = await Promise.all(
          [...selectedIds].map(async (cid) => {
            const r = await fetchApi(`/students/${studentId}/course-access`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ courseId: cid, startDate, expiryDate }),
            });
            return r.ok ? null : ((await r.json().catch(() => ({}))).error || "Failed");
          })
        );
        const failed = results.filter(Boolean);
        if (failed.length === 0) onSuccess();
        else if (failed.length < results.length) {
          alert(`${results.length - failed.length} course(s) assigned, ${failed.length} failed: ${failed[0]}`);
          onSuccess();
        } else setError(failed[0]);
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
      return;
    }

    const payload = { courseId, startDate, expiryDate };
    const url = access 
      ? `/students/${studentId}/course-access/${access._id}` 
      : `/students/${studentId}/course-access`;
    const method = access ? "PATCH" : "POST";

    try {
      const res = await fetchApi(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || "Failed to save access");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] text-white">
        <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/40">
          <h2 className="text-lg font-bold text-white">{access ? "Edit Course Access" : "Assign Course"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {error && <div className="mb-4 text-xs font-semibold text-rose-300 bg-rose-950/60 p-3 rounded-xl border border-rose-500/30">{error}</div>}
          
          {!access ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Select Courses *</label>
                <span className="text-xs font-semibold text-white">{selectedIds.size} selected</span>
              </div>
              <div className="border border-white/10 rounded-xl divide-y divide-white/5 max-h-64 overflow-y-auto bg-black/30">
                {courses.map((c) => {
                  const has = assignedCourseIds.includes(c._id);
                  return (
                    <label key={c._id} className={`flex items-center gap-3 px-3 py-2.5 text-sm ${has ? "opacity-50" : "cursor-pointer hover:bg-white/5"}`}>
                      <input type="checkbox" disabled={has} checked={has || selectedIds.has(c._id)} onChange={() => toggleCourse(c._id)} className="w-4 h-4 accent-red-600" />
                      <span className="flex-1 min-w-0 truncate">{c.name}</span>
                      {has && <span className="text-[10px] font-bold text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">Assigned</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Course *</label>
            <select 
              required
              value={courseId} onChange={e => setCourseId(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D71D3A]/40 focus:outline-none text-white text-sm"
            >
              <option value="" disabled className="bg-[#1C1C1E]">-- Select a Course --</option>
              {courses.map(c => (
                <option key={c._id} value={c._id} className="bg-[#1C1C1E]">{c.name}</option>
              ))}
              {access && !courses.find(c => c._id === access.courseId._id) && (
                <option value={access.courseId._id} className="bg-[#1C1C1E]">{access.courseId.name} (Archived/Inactive)</option>
              )}
            </select>
          </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Start Date *</label>
            <input 
              type="date" required
              value={startDate} 
              onChange={e => {
                setStartDate(e.target.value);
                if (new Date(e.target.value) >= new Date(expiryDate)) {
                  setExpiryDate(getDefaultExpiry(e.target.value));
                }
              }}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D71D3A]/40 focus:outline-none text-sm text-white"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Expiry Date *</label>
            <input 
              type="date" required
              value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              min={startDate}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#D71D3A]/40 focus:outline-none text-sm text-white"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-medium text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-gradient-to-r from-[#D71D3A] to-[#BA142D] hover:brightness-110 active:scale-95 text-white rounded-xl shadow-lg shadow-red-950/60 transition-all disabled:opacity-50 font-semibold text-sm">
              {loading ? "Saving..." : access ? "Save Access" : `Assign ${selectedIds.size || ""} Course${selectedIds.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
