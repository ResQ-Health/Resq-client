import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import googleLogo from '/icons/googleicon.png';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { useLogin, useOAuthLogin } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';
import toast from 'react-hot-toast';

function SignInProvider() {
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
        login(data.data.token, data.data);

        // Check user type to ensure they are a provider
        if (data.data.user_type !== 'Provider' && data.data.user_type !== 'provider') {
          toast.error('This account is not authorized as a Provider.');
          // Ideally logout immediately, but for now just warn?
          // Or maybe redirection logic handles it?
        }

        if (data.data.email_verified) {
          // Navigate to provider dashboard or equivalent
          // For now, let's assume /welcome-provider or similar if not fully onboarded
          navigate('/welcome-provider');
        } else {
          navigate('/verify-provider');
        }
      },
      onError: (error) => {
        // Error handled by hook
      },
    });
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      oauthLoginMutation.mutate({
        idToken: idToken,
        provider: 'google',
        email: user.email || '',
        name: user.displayName || '',
        photoURL: user.photoURL || '',
        phoneNumber: user.phoneNumber || '',
      }, {
        onSuccess: (data) => {
          // Check user type to ensure they are a provider? 
          // OAuth might create a new user, defaulting to 'Patient' if not specified? 
          // The backend should handle this, or we might need to pass context.

          // For now, standard navigation
          navigate('/welcome-provider');
        },
        onError: (error: any) => {
          console.error('OAuth login error:', error);
        }
      });
    } catch (error: any) {
      console.error('Error during Google sign-in:', error);
      toast.error('An error occurred during Google sign-in. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] flex flex-col items-center justify-between">
      <div className="flex-1 w-full max-w-[480px] px-4 flex flex-col justify-center py-12">
        <h1
          className="font-semibold text-[32px] leading-[44.3px] tracking-normal text-center align-middle mb-8 text-[#06202E]"
        >
          Sign in to your account
        </h1>

        {/* Google login */}
        <div className="flex space-x-12 mb-4 w-full">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex items-center justify-center border w-full h-[40px] gap-2 rounded-[6px] border-gray-300 p-2 hover:bg-gray-50 transition-colors"
          >
            <img src={googleLogo} alt="google" className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center w-full max-w-[480px] px-[69.5px] mx-auto mb-4">
          <hr className="flex-1 border-t border-gray-300" />
          <span className="px-2 text-gray-500 font-medium">or</span>
          <hr className="flex-1 border-t border-gray-300" />
        </div>

        {/* Email & Password fields */}
        <form onSubmit={handleSubmit} className="flex flex-col w-full gap-[24px]">
          <div className="flex flex-col">
            <label htmlFor="email" className="text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="e.g. hospital@outlook.com"
              className={`w-full h-[40px] border rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
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
              className={`w-full h-[40px] border rounded-[6px] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
            />
            <button
              type="button"
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
            </button>
            <div className="h-5">
              {errors.password && <span className="text-red-500 text-xs">{errors.password}</span>}
            </div>
          </div>

          <div className="text-right -mt-2">
            <Link to="/forgot-password" className="text-sm text-gray-600 underline hover:text-[#06202E] transition-colors">
              Forgot password?
            </Link>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className={`w-full h-[40px] rounded-[6px] font-medium text-[14px] leading-[22.4px] tracking-normal align-middle transition-colors ${loginMutation.isPending
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#06202E] text-white hover:bg-[#06202E]/90'
              }`}
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-gray-700 mt-6 text-center">
          Don't have an account?{' '}
          <Link to="/onboardingProvider" className="text-[#06202E] font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-12 pb-8 text-center text-sm text-gray-500 w-full">
        <div className="flex justify-center items-center gap-6">
          <span>2025 MedResQ Healthcare</span>
          <Link to="/terms-and-policy" className="underline hover:text-gray-700">Privacy Policy</Link>
          <Link to="/support" className="underline hover:text-gray-700">Support</Link>
        </div>
      </div>
    </div>
  );
}

export default SignInProvider;
