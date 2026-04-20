'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [view, setView] = useState<'login' | 'signup' | 'verify' | 'forgot' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Rate Limiting Timer State
  const [resendLockTime, setResendLockTime] = useState<Date | null>(null);
  const [countdownStr, setCountdownStr] = useState<string>('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendLockTime) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = resendLockTime.getTime() - now;
        
        if (diff <= 0) {
          setCountdownStr('');
          setResendLockTime(null);
          clearInterval(interval);
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          if (minutes >= 60) {
              setCountdownStr("Try again tomorrow");
          } else {
              setCountdownStr(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendLockTime]);

  if (!isOpen) return null;

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const passToMeasure = view === 'reset' ? newPassword : password;
  const passwordScore = getPasswordStrength(passToMeasure);
  const isWeak = passToMeasure.length > 0 && passwordScore < 2;

  const getMeterColor = (index: number) => {
    if (passwordScore <= index) return 'bg-gray-200';
    if (passwordScore === 1) return 'bg-red-500';
    if (passwordScore === 2) return 'bg-orange-500';
    if (passwordScore === 3) return 'bg-yellow-400';
    return 'bg-emerald-500';
  };

  const getStrengthLabel = () => {
    if (passwordScore === 0) return '';
    if (passwordScore === 1) return 'Weak';
    if (passwordScore === 2) return 'Fair';
    if (passwordScore === 3) return 'Good';
    return 'Strong';
  };

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      toast.error('Failed to authenticate with Google');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429 && data.nextResend) {
          setResendLockTime(new Date(data.nextResend));
          toast.error(data.message);
          setView('reset');
        } else {
          toast.error(data.message || 'Error initiating password reset');
        }
      } else {
        toast.success(data.message);
        if (data.nextResend) setResendLockTime(new Date(data.nextResend));
        if (view !== 'reset') setView('reset');
      }
    } catch (error) {
      toast.error('Failed to request reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Enter the pure 6-digit code');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (isWeak) {
      toast.error('Password is too weak. Please improve it.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.message || 'Reset failed');
      } else {
        toast.success('Password successfully reset! You can now log in.');
        setView('login');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
      }
    } catch (error) {
      toast.error('Failed to finalize reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('OTP must be exactly 6 digits');
      return;
    }
    
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.message || 'Verification failed');
        return;
      }

      toast.success('Email verified successfully!');
      
      const signInRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        toast.error(signInRes.error || 'Login failed after verification');
      } else {
        onClose();
        setTimeout(() => window.location.reload(), 300);
      }
    } catch (error) {
      toast.error('An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendLockTime) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429 && data.nextResend) {
          setResendLockTime(new Date(data.nextResend));
          toast.error(data.message);
        } else {
          toast.error(data.message || 'Resend failed');
        }
      } else {
        toast.success("A fresh OTP has been dispatched to your email!");
        if (data.nextResend) setResendLockTime(new Date(data.nextResend));
      }
    } catch (error) {
      toast.error('Failed to request new code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (view === 'signup' && !name)) {
      toast.error('Please fill in all fields');
      return;
    }

    if (view === 'signup' && isWeak) {
      toast.error('Password is too weak. Please improve it.');
      return;
    }

    try {
      setIsLoading(true);
      
      if (view === 'signup') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          if (res.status === 429 && data.nextResend) {
            setResendLockTime(new Date(data.nextResend));
            toast.error("You are registering too quickly. Check email.");
            setView('verify');
            setIsLoading(false);
            return;
          }
          toast.error(data.message || 'Failed to create account');
          setIsLoading(false);
          return;
        }
        
        if (data.nextResend) setResendLockTime(new Date(data.nextResend));
        toast.success(data.message || 'Account created successfully!');
        setView('verify');
        setIsLoading(false);
        return;
      }

      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error.startsWith('unverified_email')) {
          const parts = res.error.split('_');
          if (parts.length === 3) {
            setResendLockTime(new Date(parts[2]));
          }
          toast.success("Verification required! We've sent a new OTP to your email.");
          setView('verify');
        } else {
          toast.error(res.error || 'Invalid credentials');
        }
      } else {
        toast.success('Successfully logged in!');
        onClose();
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col md:flex-row overflow-hidden transform transition-all scale-100 opacity-100">
        
        {/* Global Close Button */}
        <button 
          onClick={onClose}
          className="cursor-pointer absolute top-4 right-4 md:top-5 md:right-5 z-50 p-2 rounded-full bg-black/5 hover:bg-black/10 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        
        {/* Left Side: Auth */}
        <div className="w-full md:w-1/2 p-8 md:p-12 relative flex flex-col justify-center">
          
          <h2 className="text-3xl font-bold text-text mb-2">
            {view === 'verify' ? 'Verification Required' : 
             view === 'forgot' ? 'Reset Password' : 
             view === 'reset' ? 'Create New Password' :
             view === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-500 mb-8">
            {view === 'verify' ? 'Check your email for the 6-digit OTP code' : 
             view === 'forgot' ? 'Enter your email to receive a secure reset code' : 
             view === 'reset' ? 'Enter your newly received OTP to authorize reset' : 
             view === 'login' ? 'Sign in to your account to continue' : 'Sign up to build your perfect resume'}
          </p>

          {(view === 'login' || view === 'signup') && (
            <>
              <button
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="cursor-pointer w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <FcGoogle className="text-xl" />
                Continue with Google
              </button>

              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-gray-100"></div>
                <span className="px-4 text-sm text-gray-400">OR</span>
                <div className="flex-1 border-t border-gray-100"></div>
              </div>
            </>
          )}

          {view === 'verify' && (
            <div className="space-y-4">
              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">6-Digit Code</label>
                  <input 
                    type="text" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                    className="w-full px-4 py-4 bg-secondary border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center text-3xl tracking-[1rem] font-bold text-gray-800"
                    placeholder="------"
                    maxLength={6}
                    required 
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || otp.length < 6}
                  className="cursor-pointer w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2"
                >
                  {isLoading ? 'Verifying...' : 'Verify Email & Login'}
                </button>
              </form>

              {/* Dynamic Resend Button */}
              <div className="text-center mt-3">
                <button 
                  onClick={handleResendOTP}
                  disabled={isLoading || !!resendLockTime}
                  className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {countdownStr ? `Resend code in ${countdownStr}` : "Didn't receive code? Resend"}
                </button>
              </div>
            </div>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="you@example.com"
                  disabled={isLoading}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2"
              >
                {isLoading ? 'Initializing...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {view === 'reset' && (
            <>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reset Code from Email</label>
                  <input 
                      type="text" 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                      className="w-full mb-3 px-4 py-3 bg-secondary border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center text-xl tracking-[0.5rem] font-bold text-gray-800"
                      placeholder="------"
                      maxLength={6}
                      required 
                    />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-secondary rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-12"
                      placeholder="••••••••"
                      disabled={isLoading}
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>
                
                {/* Strength Meter purely isolated for Reset Phase */}
                {newPassword.length > 0 && (
                  <div className="w-full mt-1.5 mb-3">
                    <div className="flex gap-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className={`h-full flex-1 transition-colors duration-300 ${getMeterColor(index)}`}></div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1 px-1">
                      <span className={isWeak ? 'text-red-500 font-medium' : 'text-gray-500'}>
                        {isWeak ? 'Too Weak (add numbers & symbols)' : 'Good'}
                      </span>
                      <span className={`font-semibold ${passwordScore >= 3 ? 'text-emerald-500' : passwordScore === 2 ? 'text-orange-500' : 'text-red-500'}`}>
                        {getStrengthLabel()}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-secondary rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-12"
                      placeholder="••••••••"
                      disabled={isLoading}
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isWeak}
                  className="cursor-pointer w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 mt-2"
                >
                  {isLoading ? 'Resetting...' : 'Force Password Reset'}
                </button>
              </form>

              <div className="text-center mt-3">
                <button 
                  onClick={handleForgotPassword}
                  disabled={isLoading || !!resendLockTime}
                  className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {countdownStr ? `Resend code in ${countdownStr}` : "Didn't receive code? Resend"}
                </button>
              </div>
            </>
          )}

          {(view === 'login' || view === 'signup') && (
            <form onSubmit={handleCredentialsAuth} className="space-y-4">
              {view === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-secondary rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="John Doe"
                    disabled={isLoading}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  {view === 'login' && (
                    <span 
                      onClick={() => { setView('forgot'); setPassword(''); setOtp(''); }}
                      className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-secondary rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-12"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                
                {/* Advanced Strength Meter UI conditionally rendering only during signup */}
                {view === 'signup' && password.length > 0 && (
                  <div className="w-full mt-2">
                    <div className="flex gap-1 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className={`h-full flex-1 transition-colors duration-300 ${getMeterColor(index)}`}></div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1.5 px-1">
                      <span className={isWeak ? 'text-red-500 font-medium' : 'text-gray-500'}>
                        {isWeak ? 'Strength Required: Weak' : 'Score Passed'}
                      </span>
                      <span className={`font-semibold ${passwordScore >= 3 ? 'text-emerald-500' : passwordScore === 2 ? 'text-orange-500' : 'text-red-500'}`}>
                        {getStrengthLabel()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || (view === 'signup' && isWeak)}
                className="cursor-pointer w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2"
              >
                {isLoading 
                  ? (view === 'login' ? 'Logging in...' : 'Signing up...') 
                  : (view === 'login' ? 'Log In' : 'Sign Up')
                }
              </button>
            </form>
          )}

          {/* Master Footer Navigation */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {view === 'verify' ? (
              <span onClick={() => { setView('signup'); setOtp(''); setResendLockTime(null); }} className="text-blue-600 font-semibold hover:underline cursor-pointer">
                Back to Sign Up
              </span>
            ) : view === 'forgot' || view === 'reset' ? (
              <span onClick={() => { setView('login'); setOtp(''); }} className="text-gray-400 font-medium hover:text-gray-800 cursor-pointer">
                &larr; Return to Login
              </span>
            ) : view === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <span onClick={() => { setView('signup'); setPassword(''); }} className="text-blue-600 font-semibold hover:underline cursor-pointer">
                  Create account
                </span>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <span onClick={() => { setView('login'); setPassword(''); }} className="text-blue-600 font-semibold hover:underline cursor-pointer">
                  Log in
                </span>
              </>
            )}
          </p>
        </div>

        {/* Right Side: Illustration */}
        <div className="hidden md:flex w-1/2 p-8 bg-gradient-to-br from-blue-50 to-blue-100 flex-col justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
           <div className="absolute top-0 right-32 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
           <div className="absolute -bottom-8 left-20 w-64 h-64 bg-sky-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
          
           <div className="relative z-10 flex flex-col h-full justify-center text-center px-4">
             <div className="bg-white/60 backdrop-blur-lg rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">AI-Powered Success</h3>
                <p className="text-gray-600 leading-relaxed">
                  Join thousands of professionals who have secured interviews with our tailored resume builder.
                </p>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
};
