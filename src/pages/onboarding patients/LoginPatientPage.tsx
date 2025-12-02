import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import googleLogo from '/icons/googleicon.png';
import { IoEye } from "react-icons/io5";
import { IoIosEyeOff } from "react-icons/io";
import { useLogin, useOAuthLogin } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';
import toast from 'react-hot-toast';

function LoginPatientPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const navigate = useNavigate();
  const { login } = useAuth();
  const loginMutation = useLogin();
  const oauthLoginMutation = useOAuthLogin();

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
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
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

    loginMutation.mutate(formData, {
      onSuccess: (data) => {
        // Update auth context
        login(data.data.token, data.data);

        // Navigate based on email verification status
        if (data.data.email_verified) {
          navigate('/patientSetup/Myaccount');
        } else {
          navigate('/verify');
        }
      },
      onError: (error) => {
        // Error message is already handled by the useLogin hook
      },
    });
  };

  /**
   * Handle Google Sign-In with Firebase
   */
  const handleGoogleLogin = async () => {
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
          // Navigate to my account page - it will check onboarding and redirect if needed
          navigate('/patient/my-account');
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

  return (
    <div className="min-h-[638px] pb-[155px] mx-auto flex flex-col justify-center max-w-[480px] mt-[108.5px] items-center">
      <h1
        style={{ fontFamily: 'Plus Jakarta Sans', letterSpacing: '0px' }}
        className="font-semibold text-[32px] leading-[44.3px] tracking-normal text-center align-middle mb-8"
      >
        Welcome back
      </h1>

      {/* Google login */}
      <div className="flex space-x-12 mb-[16px] w-full">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex items-center justify-center border w-full h-[40px] gap-2 rounded-[6px] border-[#06202E] p-2"
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

      {/* Email & Password fields */}
      <form onSubmit={handleSubmit} className="flex flex-col w-full gap-6">
        <div className="flex flex-col">
          <label htmlFor="email" className="text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Joshuanasiru@yandex.com"
            className={`w-full h-[40px] border rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <div className="h-5">
            {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
          </div>
        </div>

        <div className="flex flex-col relative">
          <label htmlFor="password" className="text-gray-700 mb-1">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Password"
            className={`w-full h-[40px] border rounded-[6px] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <IoIosEyeOff /> : <IoEye />}
          </button>
          <div className="h-5">
            {errors.password && <span className="text-red-500 text-xs">{errors.password}</span>}
          </div>
        </div>

        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-gray-600 underline hover:text-blue-600">
            Forgot password?
          </Link>
        </div>

        {/* Sign in button */}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          style={{ fontFamily: 'Plus Jakarta Sans', backgroundColor: loginMutation.isPending ? undefined : '#06202E' }}
          className={`w-full h-[40px] rounded-[6px] font-medium text-[14px] leading-[22.4px] tracking-normal align-middle transition-colors ${
            loginMutation.isPending
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'text-white hover:bg-[#06202E]/90'
          }`}
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Sign up link */}
      <p className="text-sm text-gray-700 mt-6">
        Don't have an account?{' '}
        <Link to="/" className="underline text-blue-600 hover:text-blue-700">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default LoginPatientPage; 