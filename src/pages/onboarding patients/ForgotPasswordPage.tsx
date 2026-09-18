import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineMail, HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';
import { useForgotPassword } from '../../services/authService';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const forgotPasswordMutation = useForgotPassword();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    forgotPasswordMutation.mutate(
      { email },
      {
        onSuccess: (data) => {
          if (data?.message) {
            setApiMessage(data.message);
          }
          setEmailSent(true);
        },
        onError: () => {
          // Handled by hook / toast
        },
      }
    );
  };

  if (emailSent) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-[#F8FAFC] flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-12">
        <div className="w-full max-w-[440px] bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 text-center">
          {/* Email Sent Badge */}
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm">
            <HiOutlineMail className="w-8 h-8" />
          </div>

          <h1 className="font-bold text-2xl sm:text-[28px] text-[#06202E] tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            {apiMessage || 'If an account with that email exists, a password reset link has been sent.'}
          </p>

          {/* Email Info Box */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 my-6 text-left flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#06202E]/5 flex items-center justify-center shrink-0 mt-0.5 text-[#06202E]">
              <HiOutlineMail className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-[#06202E] break-all">{email}</p>
              <p className="leading-relaxed">
                Click the link in the message to reset your password. If you don't see it within a few minutes, check your spam folder.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/Sign-in-Patient')}
              className="w-full h-12 bg-[#06202E] text-white rounded-xl font-medium text-sm hover:bg-[#06202E]/90 active:scale-[0.98] transition-all shadow-md shadow-[#06202E]/15 flex items-center justify-center"
            >
              Back to Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
                setError('');
              }}
              className="w-full py-2 text-xs font-medium text-slate-500 hover:text-[#06202E] transition-colors"
            >
              Didn't receive email? Try another address
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-[#F8FAFC] flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-12">
      <div className="w-full max-w-[440px]">
        {/* Mobile App Header / Back Button */}
        <div className="mb-4 sm:mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
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
              Forgot Password?
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-[320px] mx-auto">
              No worries! Enter your registered email address and we'll send you a reset link.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <HiOutlineMail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="name@example.com"
                  className={`w-full h-12 pl-11 pr-4 rounded-xl border bg-slate-50/40 text-base text-[#06202E] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#06202E] focus:ring-4 focus:ring-[#06202E]/10 transition-all ${
                    error ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20' : 'border-slate-200'
                  }`}
                />
              </div>
              {error && (
                <p className="text-red-500 text-xs mt-1.5 ml-1">{error}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={forgotPasswordMutation.isPending}
              className={`w-full h-12 rounded-xl font-medium text-sm transition-all duration-200 shadow-md shadow-[#06202E]/15 flex items-center justify-center gap-2 ${
                forgotPasswordMutation.isPending
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-[#06202E] text-white hover:bg-[#06202E]/90 active:scale-[0.98]'
              }`}
            >
              {forgotPasswordMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sending link...</span>
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-5">
            <HiOutlineShieldCheck className="w-3.5 h-3.5 text-[#06202E]/60" />
            <span>Encrypted & secure password recovery</span>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-5" />

          {/* Back to sign in */}
          <p className="text-xs sm:text-sm text-slate-600 text-center">
            Remember your password?{' '}
            <Link
              to="/Sign-in-Patient"
              className="font-semibold text-[#06202E] hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;

