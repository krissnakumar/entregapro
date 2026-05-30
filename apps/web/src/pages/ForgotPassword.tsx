import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setSubmitted(true);
    toast.success('Reset link sent successfully');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center text-primary">Reset Password</h1>
        <p className="text-gray-600 text-sm text-center mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                required
                placeholder="name@company.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white p-2 rounded-md hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="animate-spin" size={18} />}
              Send Reset Link
            </button>
            <div className="text-center mt-4">
              <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
                Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <div className="bg-green-50 text-green-800 p-4 rounded-md mb-4 text-sm">
              If an account exists for {email}, you will receive a password reset link shortly.
            </div>
            <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
