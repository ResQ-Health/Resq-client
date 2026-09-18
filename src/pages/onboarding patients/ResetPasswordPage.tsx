import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { IoEye } from "react-icons/io5";
import { IoIosEyeOff } from "react-icons/io";
import { HiOutlineArrowLeft, HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineCheckCircle } from 'react-icons/hi';
import { useResetPassword } from '../../services/authService';

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
          // Handled by hook
        },
      }
    );
  };

  if (!token) {
    return null; // Redirects in useEffect
  }

  if (passwordReset) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-[#F8FAFC] flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-12">
        <div className="w-full max-w-[440px] bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 text-center">
          {/* Success Badge */}
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm">
            <HiOutlineCheckCircle className="w-8 h-8" />
          </div>

          <h1 className="font-bold text-2xl sm:text-[28px] text-[#06202E] tracking-tight">
            Password Reset!
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Your password has been successfully updated. You can now sign in with your new credentials.
          </p>

          <div className="mt-6">
            <button
              onClick={() => navigate('/Sign-in-Patient')}
              className="w-full h-12 bg-[#06202E] text-white rounded-xl font-medium text-sm hover:bg-[#06202E]/90 active:scale-[0.98] transition-all shadow-md shadow-[#06202E]/15 flex items-center justify-center"
            >
              Sign In Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#F8FAFC] flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-12">
      <div className="w-full max-w-[440px]">
        {/* Top Back Navigation */}
        <div className="mb-4 sm:mb-6">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="w-10 h-10 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-[#06202E] hover:bg-slate-50 active:scale-95 transition-all"
            aria-label="Go back"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Elevated Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
          {/* Lock Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-[#06202E]/5 border border-[#06202E]/10 flex items-center justify-center mx-auto mb-4 text-[#06202E] shadow-xs">
            <HiOutlineLockClosed className="w-7 h-7" />
          </div>

          {/* Title & Description */}
          <div className="text-center mb-6">
            <h1 className="font-bold text-2xl sm:text-[28px] text-[#06202E] tracking-tight">
              Create New Password
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-[320px] mx-auto">
              Please choose a secure password with at least 8 characters.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="new_password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <HiOutlineLockClosed className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new_password"
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  className={`w-full h-12 pl-11 pr-12 rounded-xl border bg-slate-50/40 text-base text-[#06202E] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#06202E] focus:ring-4 focus:ring-[#06202E]/10 transition-all ${
                    errors.new_password ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IoIosEyeOff className="w-5 h-5" /> : <IoEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.new_password && (
                <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.new_password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm_password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <HiOutlineLockClosed className="w-5 h-5" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirm_password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  className={`w-full h-12 pl-11 pr-12 rounded-xl border bg-slate-50/40 text-base text-[#06202E] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#06202E] focus:ring-4 focus:ring-[#06202E]/10 transition-all ${
                    errors.confirm_password ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <IoIosEyeOff className="w-5 h-5" /> : <IoEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.confirm_password}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={resetPasswordMutation.isPending}
              className={`w-full h-12 rounded-xl font-medium text-sm transition-all duration-200 shadow-md shadow-[#06202E]/15 flex items-center justify-center gap-2 mt-2 ${
                resetPasswordMutation.isPending
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-[#06202E] text-white hover:bg-[#06202E]/90 active:scale-[0.98]'
              }`}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Resetting Password...</span>
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-5">
            <HiOutlineShieldCheck className="w-3.5 h-3.5 text-[#06202E]/60" />
            <span>Encrypted & secure connection</span>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-5" />

          {/* Back to sign in */}
          <p className="text-xs sm:text-sm text-slate-600 text-center">
            Remember your password?{' '}
            <Link to="/Sign-in-Patient" className="font-semibold text-[#06202E] hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;

