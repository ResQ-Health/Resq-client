import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineCloseCircle, AiOutlineClose, AiOutlineCheckCircle } from 'react-icons/ai';
import { useVerifyOTP, useResendOTP } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

function VerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const verifyMutation = useVerifyOTP();
  const resendOTPMutation = useResendOTP();

  // Get email from location state or use default
  const email = location.state?.email || 'Joshuanasiru@yandex.com';
  const [codes, setCodes] = useState(Array(6).fill(''));
  const [notification, setNotification] = useState<'success' | 'error' | null>(null);

  const handleChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/, '').slice(-1);
    const newCodes = [...codes];
    newCodes[idx] = digit;
    setCodes(newCodes);
    if (digit && idx < 5) {
      const next = document.getElementById(`code-${idx + 1}`) as HTMLInputElement;
      next?.focus();
    }
    // If this is the last box and all filled, trigger verify
    if (idx === 5 && newCodes.every(c => c !== '')) {
      handleVerify(newCodes);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startIdx: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // Extract only digits from pasted text
    const digits = pastedText.replace(/\D/g, '').slice(0, 6);
    
    if (digits.length === 0) return;
    
    const newCodes = Array(6).fill('');
    // Always fill from the beginning when pasting a code
    for (let i = 0; i < digits.length && i < 6; i++) {
      newCodes[i] = digits[i];
    }
    
    setCodes(newCodes);
    
    // Auto-verify if all 6 digits are filled
    if (newCodes.every(c => c !== '')) {
      handleVerify(newCodes);
    } else {
      // Focus on the first empty field or the last field if all are filled
      const firstEmptyIdx = newCodes.findIndex(c => c === '');
      const focusIdx = firstEmptyIdx !== -1 ? firstEmptyIdx : 5;
      setTimeout(() => {
        const nextInput = document.getElementById(`code-${focusIdx}`) as HTMLInputElement;
        nextInput?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    // Handle backspace to go to previous field
    if (e.key === 'Backspace' && !codes[idx] && idx > 0) {
      e.preventDefault();
      const prevInput = document.getElementById(`code-${idx - 1}`) as HTMLInputElement;
      prevInput?.focus();
      // Clear the previous field
      const newCodes = [...codes];
      newCodes[idx - 1] = '';
      setCodes(newCodes);
    }
    // Handle arrow keys for navigation
    else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      const prevInput = document.getElementById(`code-${idx - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
    else if (e.key === 'ArrowRight' && idx < 5) {
      e.preventDefault();
      const nextInput = document.getElementById(`code-${idx + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  // Verify code when the 6th digit is entered
  const handleVerify = async (enteredCodes: string[]) => {
    const otp = enteredCodes.join('');

    verifyMutation.mutate(
      { email, otp },
      {
        onSuccess: (data) => {
          // Update auth context
          login(data.data.token, data.data);

          // Show success notification
          setNotification('success');

          // Navigate to sign-in page after successful verification
          setTimeout(() => {
            navigate('/Sign-in-Patient');
          }, 1500); // Small delay to show success message
        },
        onError: () => {
          setNotification('error');
          // Reset inputs on error
          setCodes(Array(6).fill(''));
        },
      }
    );
  };

  // Auto-hide notification after 4s
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const handleResendCode = () => {
    resendOTPMutation.mutate({ email });
  };

  return (
    <div className="w-full flex flex-col justify-center items-center my-[108px]">
      {/* Notification */}
      {notification === 'success' && (
        <div className="fixed top-[108px] right-4 max-w-[480px] bg-white border-l-4 border-green-500 shadow flex justify-between items-start p-4 transition-opacity duration-[500ms] ease-in z-50">
          <div className="flex items-start">
            <AiOutlineCheckCircle className="text-green-500 text-2xl mr-3 mt-1" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">Email verified!</p>
              <p className="text-sm text-gray-700">Your email has been successfully verified. Welcome aboard!</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600" onClick={() => setNotification(null)}>
            <AiOutlineClose />
          </button>
        </div>
      )}
      {notification === 'error' && (
        <div className="fixed top-[108px] right-4 max-w-[480px] bg-white border-l-4 border-red-500 shadow flex justify-between items-start p-4 transition-opacity duration-[500ms] ease-in z-50">
          <div className="flex items-start">
            <AiOutlineCloseCircle className="text-red-500 text-2xl mr-3 mt-1" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">Verification failed!</p>
              <p className="text-sm text-gray-700">Couldn't verify your email. Click below to resend the link.</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600" onClick={() => setNotification(null)}>
            <AiOutlineClose />
          </button>
        </div>
      )}

      {/* Main content */}
      <h1
        style={{ fontFamily: 'Plus Jakarta Sans' }}
        className="font-semibold text-[32px] leading-[44.3px] text-center mb-2"
      >
        We sent you a code
      </h1>
      <p className="text-sm text-gray-700 text-center mb-1">
        Please enter the verification code sent to your email address
      </p>
      <p className="text-sm font-medium text-gray-900 text-center mb-8">{email}</p>

      {/* Code inputs */}
      <div className="flex space-x-4 mb-8">
        {codes.map((c, i) => (
          <input
            key={i}
            id={`code-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={c}
            onChange={e => handleChange(e.target.value, i)}
            onPaste={e => handlePaste(e, i)}
            onKeyDown={e => handleKeyDown(e, i)}
            disabled={verifyMutation.isPending}
            className={`w-[48px] h-[48px] border rounded-[6px] text-[24px] text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${verifyMutation.isPending ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
          />
        ))}
      </div>

      {/* Loading indicator */}
      {verifyMutation.isPending && (
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">Verifying your email...</p>
        </div>
      )}

      {/* Divider */}
      <hr className="w-full max-w-[480px] border-t border-gray-300 mb-6" />

      {/* Resend link */}
      <p className="text-sm text-gray-700 text-center">
        Didn't get the mail? Check spam or{' '}
        <button
          onClick={handleResendCode}
          disabled={verifyMutation.isPending}
          className="underline text-blue-600 hover:text-blue-700 disabled:text-gray-400"
        >
          send a new code
        </button>
      </p>
    </div>
  );
}

export default VerificationPage; 