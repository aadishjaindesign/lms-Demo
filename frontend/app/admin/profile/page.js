export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full px-4 md:px-8 py-6 md:py-8">
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 flex flex-col items-center justify-center min-h-[400px] border border-gray-100">
        <div className="w-24 h-24 rounded-full bg-red-100 text-[#c71e22] font-bold flex items-center justify-center text-4xl mb-6">A</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin User</h2>
        <p className="text-gray-500 mb-8">Administrator</p>
        
        <div className="w-full max-w-md space-y-4">
          <div className="flex flex-col sm:flex-row justify-between p-4 bg-gray-50 rounded-lg gap-1">
            <span className="font-medium text-gray-600">Email</span>
            <span className="text-gray-900 break-all sm:break-normal">admin@jainscomputer.com</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between p-4 bg-gray-50 rounded-lg gap-1">
            <span className="font-medium text-gray-600">Role</span>
            <span className="text-gray-900">Super Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
