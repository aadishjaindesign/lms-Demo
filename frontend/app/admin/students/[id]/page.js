"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function StudentDetailsPage() {
  const { id } = useParams();
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

  const handleRevoke = async (accessId) => {
    if (!confirm("Revoke this course access?")) return;
    try {
      const res = await fetchApi(`/students/${id}/course-access/${accessId}/revoke`, { method: "PATCH" });
      if (res.ok) fetchStudentData();
      else alert((await res.json()).error || "Failed to revoke");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async (accessId) => {
    try {
      const res = await fetchApi(`/students/${id}/course-access/${accessId}/restore`, { method: "PATCH" });
      if (res.ok) fetchStudentData();
      else alert((await res.json()).error || "Failed to restore");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-8 max-w-6xl mx-auto text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block font-medium">
          {error || "Student not found"}
        </div>
        <div className="mt-4">
          <Link href="/admin/students" className="text-[#c71e22] hover:underline font-medium">&larr; Back to Students</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 md:p-8 py-4 sm:py-6 text-gray-900 max-w-6xl mx-auto">
      <Link href="/admin/students" className="text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 inline-block transition-colors">
        &larr; Back to Students
      </Link>
      
      <div className="bg-white rounded-xl shadow overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-start md:justify-between gap-4 sm:gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 break-words">{student.name}</h1>
            <p className="text-gray-500 mb-3">{student.phone}</p>
            <div className="flex items-center gap-3">
              <span className="font-mono bg-gray-100 border border-gray-200 rounded text-sm px-3 py-1 font-semibold text-gray-700">
                {student.studentId}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {student.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Course Access</h2>
        <button 
          onClick={() => setIsAssignModalOpen(true)}
          className="bg-[#c71e22] hover:bg-[#a5191c] text-white px-5 py-2 rounded-lg shadow transition-colors font-medium text-sm"
        >
          + Assign Course
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {accessRecords.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No courses assigned yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs leading-normal border-b">
                  <th className="py-3 px-6">Course Name</th>
                  <th className="py-3 px-6 text-center">Duration</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-light text-gray-700">
                {accessRecords.map((record) => {
                  const isActive = record.status === 'active';
                  const isExpired = new Date() > new Date(record.expiryDate);
                  let displayStatus = record.status;
                  if (isActive && isExpired) displayStatus = "expired";

                  return (
                    <tr key={record._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-6 font-medium text-gray-800">
                        {record.courseId?.name || "Unknown Course"}
                      </td>
                      <td className="py-4 px-6 text-center text-gray-500 whitespace-nowrap">
                        {new Date(record.startDate).toLocaleDateString('en-GB')} 
                        <span className="mx-2 text-gray-300">→</span> 
                        <span className={isExpired ? "text-red-500 font-semibold" : ""}>{new Date(record.expiryDate).toLocaleDateString('en-GB')}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize
                          ${displayStatus === 'active' ? 'bg-green-100 text-green-700' : 
                            displayStatus === 'expired' ? 'bg-orange-100 text-orange-700' : 
                            'bg-red-100 text-red-700'}`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-3 whitespace-nowrap">
                        <button 
                          onClick={() => setEditingAccess(record)}
                          className="text-[#c71e22] hover:text-[#a5191c] font-medium"
                        >
                          {isActive && !isExpired ? 'Edit' : 'Extend'}
                        </button>
                        {isActive ? (
                          <button 
                            onClick={() => handleRevoke(record._id)}
                            className="text-red-500 hover:text-red-700 font-medium"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleRestore(record._id)}
                            className="text-green-500 hover:text-green-700 font-medium"
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  )
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

function AssignCourseModal({ studentId, courses, access, onClose, onSuccess }) {
  const [courseId, setCourseId] = useState(access?.courseId?._id || "");
  const [startDate, setStartDate] = useState(
    access ? new Date(access.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  
  // Default 1 Year from start date
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{access ? "Edit Course Access" : "Assign Course"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Course *</label>
            <select 
              required
              value={courseId} onChange={e => setCourseId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#c71e22] focus:outline-none bg-white"
            >
              <option value="" disabled>-- Select a Course --</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
              {access && !courses.find(c => c._id === access.courseId._id) && (
                <option value={access.courseId._id}>{access.courseId.name} (Archived/Inactive)</option>
              )}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input 
              type="date" required
              value={startDate} 
              onChange={e => {
                setStartDate(e.target.value);
                if (new Date(e.target.value) >= new Date(expiryDate)) {
                  setExpiryDate(getDefaultExpiry(e.target.value));
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#c71e22] focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
            <input 
              type="date" required
              value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              min={startDate}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#c71e22] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-1 text-center min-w-[100px]">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-[#c71e22] text-white rounded-lg hover:bg-[#a5191c] transition-colors disabled:opacity-50 flex-1 text-center min-w-[100px]">
              {loading ? "Saving..." : "Save Access"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
