import { Link } from 'react-router-dom';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-2xl font-bold">H</span>
        </div>
        
        <h1 className="text-3xl font-bold text-primary-900">HelixCRM</h1>
        <p className="mt-2 text-neutral-600">Password Reset Flow Implementation</p>
        
        <div className="mt-8 space-y-4">
          <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
            <p className="text-success-700 font-medium">✅ Backend API Complete</p>
            <p className="text-success-600 text-sm mt-1">Password reset endpoints working</p>
          </div>
          
          <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-primary-700 font-medium">✅ Frontend UI Complete</p>
            <p className="text-primary-600 text-sm mt-1">Forgot & Reset password pages</p>
          </div>
          
          <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-warning-700 font-medium">🚀 Ready to Test</p>
            <p className="text-warning-600 text-sm mt-1">Test the complete flow below</p>
          </div>
        </div>
        
        <div className="mt-8 space-y-3">
          <Link
            to="/forgot-password"
            className="block w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Test Forgot Password
          </Link>
          
          <div className="text-sm text-neutral-500">
            <p>Test user: user_a@test.com</p>
            <p>Check API console for reset token</p>
          </div>
          
          <Link
            to="/"
            className="inline-block w-full text-center text-primary-600 hover:text-primary-700 font-medium py-2"
          >
            View Dashboard (Coming Soon)
          </Link>
        </div>
        
        <div className="mt-8 pt-6 border-t border-neutral-200">
          <p className="text-neutral-500 text-sm">
            Password Reset Flow • Phase 2 Complete
          </p>
        </div>
      </div>
    </div>
  );
}