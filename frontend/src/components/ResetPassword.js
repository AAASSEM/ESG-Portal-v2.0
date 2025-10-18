import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import Notification from './Notification';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { user, resetPassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Verification code states
  const [verificationStep, setVerificationStep] = useState(true); // Start with verification
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [showNotification, setShowNotification] = useState(false);

  // If user doesn't need to reset password, redirect to dashboard
  React.useEffect(() => {
    if (user && !user.must_reset_password) {
      navigate('/dashboard');
    } else if (user && user.must_reset_password && verificationStep) {
      // Send verification code email when component loads
      sendVerificationCode();
    }
  }, [user, navigate]);

  const sendVerificationCode = async () => {
    if (!user || !user.email) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-reset-code/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: user.email
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationResult(data);
        if (data.verification_code) {
          setShowNotification(true);
        }
      } else {
        setError(data.message || 'Failed to send verification code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Error sending verification code:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: user.email,
          verification_code: verificationCode
        })
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        // Verification successful - move to password reset step
        setVerificationStep(false);
        setError('');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      setLoading(false);
      return;
    }

    try {
      const result = await resetPassword(formData.currentPassword, formData.newPassword);
      
      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show company code hint for new users
  const getCompanyCodeHint = () => {
    if (user?.role === 'super_user') {
      return null; // Super users might not have been created with company code
    }
    
    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <i className="fas fa-info-circle text-blue-600"></i>
          <div>
            <p className="text-sm font-medium text-blue-800">First time login?</p>
            <p className="text-sm text-blue-700">
              Use your company code as the current password. You can get this from your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const handleContinueToDashboard = () => {
    setShowSuccessModal(false);
    navigate('/dashboard');
  };

  // Success Modal Component
  const SuccessModal = () => {
    const modalContent = (
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      >
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <i className="fas fa-check text-green-600 text-2xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Password Reset Successfully!
            </h3>
            <p className="text-gray-600 mb-8">
              Your password has been updated successfully. You can now access the dashboard with your new password.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleContinueToDashboard}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200"
              >
                <i className="fas fa-arrow-right mr-2"></i>
                Continue to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  return (
    <>
      {/* Top-right notification for testing */}
      {showNotification && verificationResult?.verification_code && (
        <Notification
          type="code"
          message="🧪 Testing Mode - Password Reset Code Generated!"
          code={verificationResult.verification_code}
          duration={15000} // Show for 15 seconds
          onClose={() => setShowNotification(false)}
        />
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-key text-yellow-600 text-xl"></i>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              {verificationStep ? 'Verify Your Identity' : 'Reset Your Password'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {verificationStep ? 'Enter the verification code sent to your email' : 'You must reset your password to continue'}
            </p>
          </div>

          {/* Company Code Hint - only show for password reset step */}
          {!verificationStep && getCompanyCodeHint()}

          {/* Verification Code Form */}
          {verificationStep ? (
            <form className="mt-8 space-y-6" onSubmit={handleVerificationSubmit}>
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <div className="mt-1 relative">
                  <input
                    id="verificationCode"
                    name="verificationCode"
                    type="text"
                    maxLength="6"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-xl letter-spacing-wide"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value);
                      setError('');
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <i className="fas fa-shield-alt text-gray-400"></i>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Enter the 6-digit code sent to your email</p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <i className="fas fa-exclamation-circle text-red-400"></i>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle mr-2"></i>
                      Verify Code
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the code? Check your spam folder or contact your administrator
                </p>
              </div>
            </form>
          ) : (
            // Password Reset Form
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Enter your current password"
                      value={formData.currentPassword}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <i className="fas fa-lock text-gray-400"></i>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Enter your new password"
                      value={formData.newPassword}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <i className="fas fa-key text-gray-400"></i>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters long</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Confirm your new password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <i className="fas fa-check text-gray-400"></i>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <i className="fas fa-exclamation-circle text-red-400"></i>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Reset Password
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Need help? Contact your system administrator
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && <SuccessModal />}
    </>
  );
};

export default ResetPassword;