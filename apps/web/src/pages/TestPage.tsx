export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-2xl font-bold">H</span>
        </div>
        
        <h1 className="text-3xl font-bold text-primary-900">HelixCRM</h1>
        <p className="mt-2 text-neutral-600">Frontend foundation is working!</p>
        
        <div className="mt-8 space-y-4">
          <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
            <p className="text-success-700 font-medium">✅ React is working</p>
          </div>
          
          <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-primary-700 font-medium">✅ Tailwind CSS is working</p>
          </div>
          
          <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-warning-700 font-medium">⚠️ Authentication not configured</p>
          </div>
        </div>
        
        <button 
          className="mt-8 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          onClick={() => alert('Button works!')}
        >
          Test Interactive Button
        </button>
      </div>
    </div>
  );
}