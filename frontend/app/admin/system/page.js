export default function SystemPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full px-4 md:px-8 py-6 md:py-8">
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 border border-gray-100">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">System Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-lg">Server Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-500">Status</span><span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Online</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Uptime</span><span className="font-medium text-gray-800">99.9%</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Version</span><span className="font-medium text-gray-800">v1.0.4</span></div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
              </div>
              <h3 className="font-semibold text-gray-800 text-lg">Database</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-500">Connection</span><span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Connected</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Type</span><span className="font-medium text-gray-800">MongoDB</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Latency</span><span className="font-medium text-gray-800">24ms</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
