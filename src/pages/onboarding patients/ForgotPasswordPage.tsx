import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineMail } from 'react-icons/ai';
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
          // Store API response message if available
          if (data?.message) {
            setApiMessage(data.message);
          }
          setEmailSent(true);
        },
        onError: () => {
          // Error is handled by the hook
        },
      }
    );
  };

  if (emailSent) {
    return (
      <div className="min-h-[638px] pb-[155px] mx-auto flex flex-col justify-center max-w-[480px] mt-[108.5px] items-center">
        <div className="w-full bg-white rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AiOutlineMail className="text-3xl text-green-600" />
          </div>
          <h1
            style={{ fontFamily: 'Plus Jakarta Sans' }}
            className="text-2xl font-semibold text-gray-900 mb-2"
          >
            Check your email
          </h1>
          <p className="text-gray-600 mb-6">
            {apiMessage || 'If an account with that email exists, a password reset link has been sent.'}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please check your inbox ({email}) and click on the link to reset your password. If you don't see the email, check your spam folder.
          </p>
          <button
            onClick={() => navigate('/Sign-in-Patient')}
            className="w-full h-[40px] bg-[#06202E] text-white rounded-[6px] font-medium hover:bg-[#06202E]/90 transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[638px] pb-[155px] mx-auto flex flex-col justify-center max-w-[480px] mt-[108.5px] items-center">
      {/* Back button */}
      <div className="w-full max-w-[480px] mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <AiOutlineArrowLeft className="mr-2" />
          Back
        </button>
      </div>

      {/* Header */}
      <h1
        style={{ fontFamily: 'Plus Jakarta Sans' }}
        className="font-semibold text-[32px] leading-[44.3px] tracking-normal text-center align-middle mb-2"
      >
        Forgot Password?
      </h1>
      <p className="text-sm text-gray-600 text-center mb-8 max-w-[400px]">
        No worries! Enter your email address and we'll send you a link to reset your password.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col w-full max-w-[480px] gap-6">
        <div className="flex flex-col">
          <label htmlFor="email" className="text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="Joshuanasiru@yandex.com"
            className={`w-full h-[40px] border rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {error && (
            <span className="text-red-500 text-sm mt-1">{error}</span>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={forgotPasswordMutation.isPending}
          className={`w-full h-[40px] rounded-[6px] font-medium transition-colors ${
            forgotPasswordMutation.isPending
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#06202E] text-white hover:bg-[#06202E]/90'
          }`}
        >
          {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPasswordPage;

