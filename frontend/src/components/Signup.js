import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import Notification from './Notification';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    companyName: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [signupResult, setSignupResult] = useState(null);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [autoLoginData, setAutoLoginData] = useState(null);
  
  const { signup, login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.email || !formData.email.trim()) {
      setError('Email address is required');
      return false;
    }
    if (!formData.companyName || !formData.companyName.trim()) {
      setError('Company name is required');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    const result = await signup(formData.username, formData.email, formData.companyName, formData.password);
    
    if (result.success && result.emailVerification) {
      // Email verification required - show code input step
      setEmailSent(true);
      setVerificationStep(true);
      setSignupResult(result);
      // Show notification with verification code
      if (result.verificationCode) {
        setShowNotification(true);
      }
    } else if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
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
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-code/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          verification_code: verificationCode
        })
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        // Verification successful
        setVerificationStep(false);
        setEmailSent(false);
        setError('');
        
        // Store auto-login data and show success modal
        if (data.auto_login && data.session_created) {
          setAutoLoginData({
            user: data.user,
            message: data.message,
            session_created: true
          });
          setShowSuccessModal(true);
        } else {
          // Fallback to showing success alert and redirect
          alert('Email verified successfully! You can now log in to your account.');
          window.location.href = '/login';
        }
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleAutoLogin = async () => {
    if (!autoLoginData) return;
    
    try {
      // With session-based authentication, no token storage needed
      // The user is already logged in via the session from the backend
      
      // Close modal immediately
      setShowSuccessModal(false);
      
      // Redirect to onboarding - session is already established
      window.location.href = '/onboard';
      
    } catch (error) {
      console.error('Auto-login error:', error);
      // Fallback to manual login
      window.location.href = '/login';
    }
  };

  const SuccessModal = () => {
    if (!showSuccessModal || !autoLoginData) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <i className="fas fa-check text-green-600 text-2xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Email Verified Successfully!
            </h3>
            <p className="text-gray-600">
              Welcome to ESG Portal! Let's get your account set up.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleAutoLogin}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 font-medium"
            >
              Continue to Setup
            </button>
            
            <button
              onClick={() => {
                setShowSuccessModal(false);
                window.location.href = '/login';
              }}
              className="w-full text-gray-600 hover:text-gray-800 py-2"
            >
              Go to Login Instead
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Top-right notification for testing */}
      {showNotification && signupResult?.magic_link_url && (
        <Notification
          type="link"
          message="🧪 Testing Mode - Magic Link Generated!"
          link={signupResult.magic_link_url}
          duration={15000} // Show for 15 seconds
          onClose={() => setShowNotification(false)}
        />
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-20 w-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <i className="fas fa-leaf text-white text-2xl"></i>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {emailSent ? (verificationStep ? 'Check Your Email' : 'Account Created!') : 'Create your account'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {emailSent ? (
                verificationStep ? 'Click the verification link in your email to activate your account' : ''
              ) : (
                <>
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-purple-600 hover:text-purple-500"
                  >
                    Sign in here
                  </Link>
                </>
              )}
            </p>
          </div>
          
          {emailSent ? (
            verificationStep ? (
              // Magic link verification message
              <div className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-envelope text-blue-600 text-2xl"></i>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Verification Link Sent!
                  </h3>
                  
                  <p className="text-gray-600 mb-4">
                    We've sent a verification link to:
                  </p>
                  <p className="font-semibold text-gray-900 mb-4">{signupResult?.userEmail}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <i className="fas fa-mouse-pointer text-blue-600 mt-1 mr-3"></i>
                    <div className="text-left text-sm text-blue-800">
                      <p className="font-medium mb-2">What to do next:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Check your email inbox (and spam folder)</li>
                        <li>Click the verification link in the email</li>
                        <li>You'll be automatically logged in and redirected</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Testing notification - show magic link */}
                {signupResult?.magic_link_url && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <i className="fas fa-link text-yellow-600 mt-1 mr-3"></i>
                      <div className="text-left text-sm text-yellow-800">
                        <p className="font-medium mb-1">🧪 Testing Mode - Magic Link:</p>
                        <a 
                          href={signupResult.magic_link_url} 
                          className="text-blue-600 hover:text-blue-800 underline break-all text-xs"
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          {signupResult.magic_link_url}
                        </a>
                        <p className="text-xs mt-1">
                          {signupResult?.emailSent ? 'Also sent to your email' : 'Email sending failed - using test mode'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setVerificationStep(false);
                      setEmailSent(false);
                      setVerificationCode('');
                      setError('');
                    }}
                    className="text-sm text-purple-600 hover:text-purple-500"
                  >
                    ← Back to signup
                  </button>
                </div>
              </div>
            ) : (
              // Email verification success message
              <div className="mt-8 bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-check-circle text-green-600 text-2xl"></i>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Account Created Successfully!
                  </h3>
                  
                  <p className="text-gray-600 mb-4">
                    {signupResult?.message}
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <i className="fas fa-info-circle text-blue-600 mt-1 mr-3"></i>
                      <div className="text-left text-sm text-blue-800">
                        <p className="font-medium mb-1">What happens next:</p>
                        <ul className="space-y-1">
                          <li>• Check your email at <strong>{signupResult?.userEmail}</strong></li>
                          <li>• Click the verification link in the email</li>
                          <li>• Your account will be activated</li>
                          <li>• You can then log in to start using ESG Portal</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <Link
                      to="/login"
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Go to Login
                    </Link>
                    <button
                      onClick={() => {
                        setEmailSent(false);
                        setSignupResult(null);
                        setError('');
                      }}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      Sign Up Again
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            // Signup form
            <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  <div className="flex">
                    <i className="fas fa-exclamation-circle mt-1 mr-3 text-red-500"></i>
                    <div>
                      <strong className="font-medium">Signup Error</strong>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="fas fa-user text-gray-400"></i>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="fas fa-envelope text-gray-400"></i>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                      placeholder="Enter your company name"
                      value={formData.companyName}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="fas fa-building text-gray-400"></i>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                      placeholder="Choose a password (min 6 characters)"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="fas fa-lock text-gray-400"></i>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="fas fa-lock text-gray-400"></i>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating account...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <i className="fas fa-user-plus mr-2"></i>
                      Create account
                    </div>
                  )}
                </button>
              </div>

              <div className="text-center text-xs text-gray-600">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-purple-600 hover:text-purple-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-purple-600 hover:text-purple-500">
                  Privacy Policy
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {/* Success Modal */}
      <SuccessModal />
    </>
  );
};

export default Signup;