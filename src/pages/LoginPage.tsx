import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import googleLogo from '/icons/googleicon.png';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { useLogin, useOAuthLogin } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const loginMutation = useLogin();
  const oauthLoginMutation = useOAuthLogin();

  const handleSuccessfulAuth = (authData: any) => {
    const token = authData?.data?.token;
    const userData = authData?.data;

    if (!token || !userData) {
      toast.error('Authentication succeeded, but user data is missing.');
      return;
    }

    const isOnboardingComplete =
      userData.is_onboarding_complete ??
      userData.provider?.profile_complete ??
      userData.profile_complete ??
      false;

    // Save token and normalized user into AuthContext
    login(token, {
      ...userData,
      is_onboarding_complete: !!isOnboardingComplete,
    });

    const userType = userData.user_type?.toLowerCase();
    const isProvider =
      userType === 'diagnosticprovider' ||
      userType === 'provider' ||
      userType === 'clinician';

    // Handle unverified emails
    if (userData.email_verified === false) {
      navigate(isProvider ? '/providers/verify' : '/verify', { replace: true });
      return;
    }

    // Role-based redirect to provider or patient sections
    if (isProvider) {
      if (isOnboardingComplete) {
        navigate('/provider/dashboard', { replace: true });
      } else {
        navigate('/welcome-provider', { replace: true });
      }
    } else {
      // Patient
      if (isOnboardingComplete) {
        localStorage.setItem('justLoggedIn', 'false');
        navigate('/booking-history', { replace: true });
      } else {
        localStorage.setItem('justLoggedIn', 'true');
        navigate('/patient/my-account', { replace: true });
      }
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    loginMutation.mutate(
      {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      },
      {
        onSuccess: (data) => {
          handleSuccessfulAuth(data);
        },
        onError: () => {
          // Error toast is handled by useLogin hook
        },
      }
    );
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      oauthLoginMutation.mutate(
        {
          idToken: idToken,
          provider: 'google',
          email: user.email || '',
          name: user.displayName || '',
          photoURL: user.photoURL || '',
          phoneNumber: user.phoneNumber || '',
        },
        {
          onSuccess: (data) => {
            handleSuccessfulAuth(data);
          },
          onError: (error: any) => {
            console.error('OAuth login error:', error);
          },
        }
      );
    } catch (error: any) {
      console.error('Error during Google sign-in:', error);

      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup was blocked. Please allow popups and try again.');
      } else {
        toast.error('An error occurred during Google sign-in. Please try again.');
      }
    }
  };

  const isPending = loginMutation.isPending || oauthLoginMutation.isPending;

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] flex flex-col items-center justify-between bg-white px-4">
      <div className="flex-1 w-full max-w-[480px] flex flex-col justify-center py-10 sm:py-14">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-bold text-[28px] sm:text-[32px] text-[#06202E] leading-tight mb-2">
            Sign in to your account
          </h1>
          <p className="text-sm text-gray-500">
            Patients and Healthcare Providers can sign in below
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isPending}
          className="flex items-center justify-center w-full h-[44px] gap-3 rounded-[8px] border border-gray-300 p-2 hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium text-sm text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed mb-5 shadow-sm"
        >
          <img src={googleLogo} alt="Google" className="w-5 h-5" />
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center w-full mb-6">
          <hr className="flex-1 border-t border-gray-200" />
          <span className="px-3 text-xs uppercase tracking-wider text-gray-400 font-medium">or</span>
          <hr className="flex-1 border-t border-gray-200" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="flex flex-col w-full gap-4">
          <div className="flex flex-col">
            <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="name@example.com"
              disabled={isPending}
              autoComplete="email"
              className={`w-full h-[42px] border rounded-[8px] px-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 transition-all ${
                errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#06202E]'
              }`}
            />
            {errors.email && (
              <span className="text-red-500 text-xs mt-1">{errors.email}</span>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-gray-500 hover:text-[#06202E] underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                disabled={isPending}
                autoComplete="current-password"
                className={`w-full h-[42px] border rounded-[8px] px-3.5 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 transition-all ${
                  errors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#06202E]'
                }`}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
              </button>
            </div>
            {errors.password && (
              <span className="text-red-500 text-xs mt-1">{errors.password}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className={`w-full h-[44px] mt-2 rounded-[8px] font-semibold text-sm text-white transition-all shadow-sm ${
              isPending
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#06202E] hover:bg-[#082a3d] active:scale-[0.99]'
            }`}
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Footer / Sign Up Switch */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account yet?{' '}
            <Link to="/" className="text-[#06202E] font-semibold underline hover:opacity-80">
              Sign up as a Patient
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
