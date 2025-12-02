import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { IoEye } from "react-icons/io5";
import { IoIosEyeOff } from "react-icons/io";
import { useResetPassword } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from 'react-icons/ai';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resetPasswordMutation = useResetPassword();
  
  const token = searchParams.get('token');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState<{ new_password?: string; confirm_password?: string }>({});
  const [passwordReset, setPasswordReset] = useState(false);

  useEffect(() => {
    // If no token in URL, redirect to forgot password page
    if (!token) {
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const validateForm = () => {
    const newErrors: { new_password?: string; confirm_password?: string } = {};

    if (!formData.new_password) {
      newErrors.new_password = 'Password is required';
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters';
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password';
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
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

    if (!validateForm() || !token) {
      return;
    }

    resetPasswordMutation.mutate(
      {
        token: token,
        newPassword: formData.new_password,
      },
      {
        onSuccess: () => {
          setPasswordReset(true);
        },
        onError: () => {
          // Error is handled by the hook
        },
      }
    );
  };

  if (!token) {
    return null; // Will redirect in useEffect
  }

  if (passwordReset) {
    return (
      <div className="min-h-[638px] pb-[155px] mx-auto flex flex-col justify-center max-w-[480px] mt-[108.5px] items-center">
        <div className="w-full bg-white rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AiOutlineCheckCircle className="text-3xl text-green-600" />
          </div>
          <h1
            style={{ fontFamily: 'Plus Jakarta Sans' }}
            className="text-2xl font-semibold text-gray-900 mb-2"
          >
            Password Reset Successful!
          </h1>
          <p className="text-gray-600 mb-6">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <button
            onClick={() => navigate('/Sign-in-Patient')}
            className="w-full h-[40px] bg-[#06202E] text-white rounded-[6px] font-medium hover:bg-[#06202E]/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[638px] pb-[155px] mx-auto flex flex-col justify-center max-w-[480px] mt-[108.5px] items-center">
      <h1
        style={{ fontFamily: 'Plus Jakarta Sans' }}
        className="font-semibold text-[32px] leading-[44.3px] tracking-normal text-center align-middle mb-2"
      >
        Reset Password
      </h1>
      <p className="text-sm text-gray-600 text-center mb-8 max-w-[400px]">
        Enter your new password below. Make sure it's at least 8 characters long.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col w-full gap-6">
        <div className="flex flex-col relative">
          <label htmlFor="new_password" className="text-gray-700 mb-1">New Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="new_password"
            name="new_password"
            value={formData.new_password}
            onChange={handleInputChange}
            placeholder="Enter new password"
            className={`w-full h-[40px] border rounded-[6px] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.new_password ? 'border-red-500' : 'border-gray-300'
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
            {errors.new_password && (
              <span className="text-red-500 text-xs">{errors.new_password}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col relative">
          <label htmlFor="confirm_password" className="text-gray-700 mb-1">Confirm Password</label>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirm_password"
            name="confirm_password"
            value={formData.confirm_password}
            onChange={handleInputChange}
            placeholder="Confirm new password"
            className={`w-full h-[40px] border rounded-[6px] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.confirm_password ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <IoIosEyeOff /> : <IoEye />}
          </button>
          <div className="h-5">
            {errors.confirm_password && (
              <span className="text-red-500 text-xs">{errors.confirm_password}</span>
            )}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={resetPasswordMutation.isPending}
          style={{ fontFamily: 'Plus Jakarta Sans', backgroundColor: resetPasswordMutation.isPending ? undefined : '#06202E' }}
          className={`w-full h-[40px] rounded-[6px] font-medium text-[14px] leading-[22.4px] tracking-normal align-middle transition-colors ${
            resetPasswordMutation.isPending
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'text-white hover:bg-[#06202E]/90'
          }`}
        >
          {resetPasswordMutation.isPending ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </form>

      {/* Back to sign in */}
      <p className="text-sm text-gray-700 mt-6">
        Remember your password?{' '}
        <Link to="/Sign-in-Patient" className="underline text-blue-600 hover:text-blue-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default ResetPasswordPage;

