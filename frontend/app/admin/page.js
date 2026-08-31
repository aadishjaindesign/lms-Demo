"use client";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      {/* Top Full-Width Card */}
      <div className="bg-[#fceeed] rounded-[20px] p-12 flex flex-col items-center justify-center shadow-sm">
        <h2 className="text-[32px] font-medium text-gray-900 mb-2">Total Courses</h2>
        <div className="text-[40px] font-bold text-gray-900 leading-tight mb-2">32</div>
        <div className="text-green-600 font-medium flex items-center">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
          4 this month
        </div>
      </div>

      {/* Bottom Two Cards */}
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-[300px]">
        {/* Left Card */}
        <div className="bg-[#d2e7fe] rounded-[20px] p-12 flex flex-col items-center justify-center shadow-sm">
          <h2 className="text-[32px] font-medium text-gray-900 mb-2">Total Students</h2>
          <div className="text-[40px] font-bold text-gray-900 leading-tight mb-2">248</div>
          <div className="text-green-600 font-medium flex items-center">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            18 this month
          </div>
        </div>

        {/* Right Card */}
        <div className="bg-[#fcf3cc] rounded-[20px] p-12 flex flex-col items-center justify-center shadow-sm">
          <h2 className="text-[32px] font-medium text-gray-900 mb-2">Total Videos</h2>
          <div className="text-[40px] font-bold text-gray-900 leading-tight mb-2">186</div>
          <div className="text-green-600 font-medium flex items-center">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            14 this month
          </div>
        </div>
      </div>
    </div>
  );
}
