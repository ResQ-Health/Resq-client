import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import googleLogo from '/icons/googleicon.png';
import { IoEye } from "react-icons/io5";
import { IoIosEyeOff, IoIosCheckmarkCircleOutline, IoIosCheckmarkCircle } from "react-icons/io";
import { useRegister, useOAuthLogin, useResendOTP } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../config/api';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';
import toast from 'react-hot-toast';

// Module-level flag to prevent multiple auth checks across component instances
let globalAuthCheckInProgress = false;

function OnboardingPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const oauthLoginMutation = useOAuthLogin();
  const resendOTPMutation = useResendOTP();
  const { isAuthenticated } = useAuth();
  const hasCheckedAuth = useRef(false);
  const isNavigating = useRef(false);

  // form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({ fullName: '', email: '', password: '', phoneNumber: '' });
  const [checkingAuth, setCheckingAuth] = useState(false);

  // Check if user is already logged in and redirect accordingly
  useEffect(() => {
    // Prevent multiple checks - use both component and module-level guards
    if (hasCheckedAuth.current || isNavigating.current || globalAuthCheckInProgress) {
      return;
    }

    // Only check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token || !isAuthenticated) {
      return;
    }

    // Mark as checked at both levels immediately to prevent re-runs
    hasCheckedAuth.current = true;
    globalAuthCheckInProgress = true;
    setCheckingAuth(true);

    // Use a single API call with AbortController to prevent multiple requests
    const abortController = new AbortController();

    const checkAndRedirect = async () => {
      try {
        // Fetch user profile to check onboarding status
        const response = await apiClient.get('/api/v1/auth/me', {
          signal: abortController.signal
        });

        const profileData = response.data;
        // Check if user has completed onboarding
        const hasCompletedOnboarding = profileData?.data?.personal_details?.first_name &&
          profileData?.data?.personal_details?.last_name;

        if (isNavigating.current) {
          globalAuthCheckInProgress = false;
          return; // Already navigating
        }

        isNavigating.current = true;
        globalAuthCheckInProgress = false;

        // Check if user just logged in (flag set during Google login)
        const justLoggedIn = localStorage.getItem('justLoggedIn') === 'true';

        if (justLoggedIn) {
          // User just logged in - always go to my-account first
          // My-account will check onboarding status and redirect if complete
          navigate('/patient/my-account', { replace: true });
        } else if (hasCompletedOnboarding) {
          // User has completed onboarding and navigated normally - go to booking history
          navigate('/booking-history', { replace: true });
        } else {
          // User needs to complete onboarding - go to my account page
          navigate('/patient/my-account', { replace: true });
        }
      } catch (error: any) {
        // Ignore abort errors
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          globalAuthCheckInProgress = false;
          return;
        }

        // If token is invalid, clear it
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }

        setCheckingAuth(false);
        hasCheckedAuth.current = false; // Allow retry on error
        globalAuthCheckInProgress = false;
      }
    };

    checkAndRedirect();

    // Cleanup: abort request if component unmounts
    return () => {
      abortController.abort();
      globalAuthCheckInProgress = false;
    };
  }, [isAuthenticated, navigate]);

  /**
   * Handle Google Sign-In with Firebase
   */
  const handleContinueWithGoogle = async () => {
    try {
      // Sign in with Google using Firebase
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Get the Firebase ID token
      const idToken = await user.getIdToken();

      // Get user info from Firebase user object
      const email = user.email || '';
      const name = user.displayName || '';
      const photoURL = user.photoURL || '';
      const phoneNumber = user.phoneNumber || '';

      // Call OAuth login API with Firebase ID token
      oauthLoginMutation.mutate({
        idToken: idToken,
        provider: 'google',
        email: email,
        name: name,
        photoURL: photoURL,
        phoneNumber: phoneNumber,
      }, {
        onSuccess: (data) => {
          // Google Sign-In users don't need OTP verification
          // Set flag to indicate user just logged in (for redirect logic in my-account)
          localStorage.setItem('justLoggedIn', 'true');
          // Refresh the page after successful login (200 response) to reset state and trigger auth check
          // Reset the global flag so the auth check runs again after refresh
          globalAuthCheckInProgress = false;
          // The useEffect will handle navigation based on onboarding status
          window.location.reload();
        },
        onError: (error: any) => {
          console.error('OAuth login error:', error);
        }
      });
    } catch (error: any) {
      console.error('Error during Google sign-in:', error);

      // Handle specific Firebase errors
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup was blocked. Please allow popups and try again.');
      } else {
        toast.error('An error occurred during Google sign-in. Please try again.');
      }
    }
  };

  /**
   * Create account and navigate to verification
   */
  const handleCreateAccount = async () => {
    let newErrors = { fullName: '', email: '', password: '', phoneNumber: '' };
    if (!fullName) newErrors.fullName = 'Full name is required';
    if (!email) newErrors.email = 'Email address is required';
    if (!password) newErrors.password = 'Password is required';
    if (!phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    setErrors(newErrors);
    if (!fullName || !email || !password || !phoneNumber || !agreed) return;

    // Call the registration API
    registerMutation.mutate({
      full_name: fullName,
      email,
      password,
      phone_number: phoneNumber,
      user_type: 'Patient'
    }, {
      onSuccess: () => {
        // Navigate to verification page on success
        navigate('/verify', { state: { email } });
      }
    });
  };

  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-[638px] pb-[155px] mx-auto flex flex-col justify-center max-w-[480px] mt-[108.5px] items-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#06202E] mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className=" min-h-[638px] pb-[155px] mx-auto flex flex-col justify-center max-w-[480px] mt-[108.5px] items-center  ">
      <h1
        style={{ fontFamily: 'Plus Jakarta Sans', letterSpacing: '0px' }}
        className="text-xl font-medium leading-8 mb-[40px]  text-center align-middle"
      >
        Book appointments, manage your healthcare, and<br />
        connect with hospitals.
      </h1>

      {/* Social login button */}
      <div className="flex space-x-12 mb-[16px]">
        <button
          onClick={handleContinueWithGoogle}
          className="flex items-center justify-center border w-[480px] h-[40px] gap-2 rounded-[6px] border-[#06202E] p-2"
        >
          <img src={googleLogo} alt="google" className="w-5 h-5" />
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center mb-8 w-full max-w-[480px]">
        <hr className="flex-1 border-t-1" style={{ borderColor: '#DADCDD' }} />
        <span className="px-2 text-gray-700 font-medium">or</span>
        <hr className="flex-1 border-t-1" style={{ borderColor: '#DADCDD' }} />
      </div>

      {/* Form */}
      <div className="flex flex-col w-full gap-6">
        <div className="flex flex-col">
          <label htmlFor="fullname" className="text-gray-700 mb-1">Full name</label>
          <input
            type="text"
            id="fullname"
            value={fullName}
            onChange={e => { setFullName(e.target.value); setErrors({ ...errors, fullName: '' }); }}
            placeholder="Joshua Nasiru"
            className={`w-[480px] h-[40px] border rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fullName ? 'border-red-500' : 'border-gray-300'}`}
          />
          <div className="h-5">
            {errors.fullName && <span className="text-red-500 text-xs">{errors.fullName}</span>}
          </div>
        </div>

        <div className="flex flex-col">
          <label htmlFor="email" className="text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrors({ ...errors, email: '' }); }}
            placeholder="Joshuanasiru@yandex.com"
            className={`w-[480px] h-[40px] border bg-none rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
          />
          <div className="h-5">
            {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
          </div>
        </div>

        <div className="flex flex-col">
          <label htmlFor="phoneNumber" className="text-gray-700 mb-1">Phone number</label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={e => { setPhoneNumber(e.target.value); setErrors({ ...errors, phoneNumber: '' }); }}
            placeholder="08138966213"
            className={`w-[480px] h-[40px] border bg-none rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`}
          />
          <div className="h-5">
            {errors.phoneNumber && <span className="text-red-500 text-xs">{errors.phoneNumber}</span>}
          </div>
        </div>

        <div className="flex flex-col relative">
          <label htmlFor="password" className="text-gray-700 mb-1">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setErrors({ ...errors, password: '' }); }}
            placeholder="Min 8 character password"
            className={`w-[480px] h-[40px] border rounded-[6px] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <IoIosEyeOff /> : <IoEye />}
          </button>
          <div className="h-5">
            {errors.password && <span className="text-red-500 text-xs">{errors.password}</span>}
          </div>
        </div>
      </div>

      {/* Terms agreement */}
      <div className="flex items-start justify-start gap-2 mt-[40px] mb-4 w-full self-start">
        {agreed ? (
          <IoIosCheckmarkCircle
            className="h-6 w-6 cursor-pointer"
            style={{ color: '#06202E' }}
            onClick={() => setAgreed(!agreed)}
          />
        ) : (
          <IoIosCheckmarkCircleOutline
            className="h-6 w-6 cursor-pointer text-gray-400"
            onClick={() => setAgreed(!agreed)}
          />
        )}
        <label className="ml-2 text-sm text-gray-700">
          Yes, I understand and agree to the{' '}
          <Link to="/terms-and-policy" className="underline hover:text-blue-600">
            ResQ Health Terms of <br /> Service
          </Link>, including the{' '}
          <Link to="/terms-and-policy" className="underline hover:text-blue-600">
            User Agreement
          </Link>{' '}
          and{' '}
          <Link to="/terms-and-policy" className="underline hover:text-blue-600">
            Privacy Policy
          </Link>.
        </label>
      </div>

      {/* CTA */}
      <button
        disabled={!agreed || registerMutation.isPending}
        onClick={handleCreateAccount}
        style={{ fontFamily: 'Plus Jakarta Sans', backgroundColor: agreed && !registerMutation.isPending ? '#06202E' : undefined }}
        className={`w-full h-[40px] flex items-start justify-center text-center  p-[7px] rounded-[6px] font-medium text-[14px] leading-[22.4px] tracking-normal align-middle ${agreed && !registerMutation.isPending ? 'text-white' : 'bg-gray-300 text-gray-500'
          }`}
      >
        {registerMutation.isPending ? 'Creating account...' : 'Create account'}
      </button>

      <p className="text-sm text-gray-700 mt-4">
        Already have an account?{' '}
        <a href="/Sign-in-Patient" className="underline text-blue-600">
          Sign In
        </a>
      </p>
    </div>
  );
}

export default OnboardingPage; 