import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import googleLogo from '/icons/googleicon.png';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { useLogin } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

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

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth
    console.log('Google login clicked');
  };

  return (
    <div className="w-full flex flex-col justify-center items-center my-auto min-h-[638px]">
      <h1
        style={{ fontFamily: 'Plus Jakarta Sans' }}
        className="font-semibold text-[32px] leading-[44.3px] tracking-normal text-center align-middle mb-8"
      >
        Welcome back
      </h1>

      {/* Google login */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{ fontFamily: 'Plus Jakarta Sans' }}
        className="flex items-center justify-center w-[480px] h-[40px] gap-2 rounded-[6px] border border-gray-300 p-2 mb-4 font-medium text-[14px] leading-[22.4px] tracking-normal align-middle hover:bg-gray-50 transition-colors"
      >
        <img src={googleLogo} alt="google" className="w-5 h-5" />
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center w-full max-w-[480px] px-[69.5px] mx-auto mb-6">
        <hr className="flex-1 w-full border-gray-300" />
        <span className="px-2 text-gray-500">or</span>
        <hr className="flex-1 border-gray-300" />
      </div>

      {/* Email & Password fields */}
      <form onSubmit={handleSubmit} className="flex flex-col w-full max-w-[480px] gap-[2px]">
        <div className="flex flex-col">
          <label htmlFor="email" className="text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Joshuanasiru@yandex.com"
            className={`w-full h-[40px] border rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
          />
          {errors.email && (
            <span className="text-red-500 text-sm mt-1">{errors.email}</span>
          )}
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
            className={`w-full h-[40px] border rounded-[6px] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
          {errors.password && (
            <span className="text-red-500 text-sm mt-1">{errors.password}</span>
          )}
        </div>

        <div className="text-left">
          <a href="/forgot-password" className="text-sm text-gray-500 underline">
            Forgot password?
          </a>
        </div>

        {/* Sign in button */}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className={`w-[480px] h-[40px] rounded-[6px] mt-6 font-medium transition-colors ${loginMutation.isPending
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Footer note (Layout covers actual Footer) */}
      {/* Footer is rendered by Layout */}
    </div>
  );
}

export default LoginPatientPage; 