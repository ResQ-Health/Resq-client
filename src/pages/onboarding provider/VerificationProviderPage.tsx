import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AiOutlineCloseCircle, AiOutlineClose, AiOutlineCheckCircle } from 'react-icons/ai';
import { useResendOTP, useVerifyOTP } from '../../services/authService';

function VerificationProviderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get email from location state or fallback to stored user data
  const getEmail = () => {
    if (location.state?.email) return location.state.email;
    // Try pending email first (most likely for verification flow)
    const pendingEmail = localStorage.getItem('pending_email');
    if (pendingEmail) return pendingEmail;
    // Fallback to user object
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) return JSON.parse(userStr).email || '';
    } catch {}
    return '';
  };

  const email = getEmail();
  const TIMER_KEY = `resend_timer_${email}`;
  
  const [codes, setCodes] = useState(Array(6).fill(''));
  const [notification, setNotification] = useState<'verify_success' | 'resend_success' | 'error' | null>(null);
  
  // Timer state - initialized lazily to persist across refreshes
  const [countdown, setCountdown] = useState(() => {
    const savedEndTime = localStorage.getItem(TIMER_KEY);
    const now = Date.now();
    
    if (savedEndTime) {
      if (parseInt(savedEndTime) > now) {
        return Math.ceil((parseInt(savedEndTime) - now) / 1000);
      } else {
        return 0;
      }
    }
    // If no saved timer, default to 60s (fresh start logic handled in effect)
    return 60;
  });
  
  const [canResend, setCanResend] = useState(countdown === 0);
  
  const resendOTPMutation = useResendOTP();
  const verifyOTPMutation = useVerifyOTP();

  // Handle timer initialization/persistence
  useEffect(() => {
    const savedEndTime = localStorage.getItem(TIMER_KEY);
    const now = Date.now();
    
    // If no saved timer, it's a fresh visit -> start 60s timer
    if (!savedEndTime) {
      const endTime = Date.now() + 60 * 1000;
      localStorage.setItem(TIMER_KEY, endTime.toString());
      // State is already 60 from lazy init
    }
  }, [TIMER_KEY]);

  // Timer interval effect
  useEffect(() => {
    if (canResend || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [canResend, countdown]); 

  const handleResendCode = () => {
    if (!canResend) return;
    
    resendOTPMutation.mutate(
      { email },
      {
        onSuccess: () => {
          setNotification('resend_success');
          const seconds = 60;
          setCountdown(seconds);
          setCanResend(false);
          // Save end time to local storage
          const endTime = Date.now() + seconds * 1000;
          localStorage.setItem(TIMER_KEY, endTime.toString());
        },
        onError: () => {
          setNotification('error');
        }
      }
    );
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').split('').slice(0, 6);
    
    if (digits.length === 0) return;

    const newCodes = [...codes];
    // Fill codes starting from first input (or current focused one if we want that behavior, 
    // but typically paste fills from start for OTP)
    digits.forEach((digit, index) => {
      newCodes[index] = digit;
    });
    setCodes(newCodes);

    // Focus appropriate input
    const nextIndex = Math.min(digits.length, 5);
    const nextInput = document.getElementById(`code-${nextIndex}`) as HTMLInputElement;
    if (nextInput) {
      nextInput.focus();
    }

    // Auto-verify if we have all 6 digits
    if (newCodes.every(c => c !== '') && newCodes.length === 6) {
      handleVerify(newCodes);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !codes[idx] && idx > 0) {
      const prev = document.getElementById(`code-${idx - 1}`) as HTMLInputElement;
      prev?.focus();
    }
  };

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

  // Verify code when the 6th digit is entered
  const handleVerify = async (enteredCodes: string[]) => {
    const code = enteredCodes.join('');
    
    verifyOTPMutation.mutate(
      { email, otp: code },
      {
        onSuccess: () => {
          setNotification('verify_success');
          // Clear pending email and timer on success
          localStorage.removeItem('pending_email');
          localStorage.removeItem(TIMER_KEY);
          
          // Optional: Navigate to welcome page after a delay
          setTimeout(() => {
            navigate('/providers/signin');
          }, 2000);
        },
        onError: () => {
          setNotification('error');
          // Reset inputs on error
          setCodes(Array(6).fill(''));
        }
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

  return (
    <div className="w-full flex flex-col justify-center items-center my-[108px]">
      {/* Notification */}
      {notification === 'resend_success' && (
        <div className="fixed top-[108px] right-4 max-w-[480px] bg-white border-l-4 border-green-500 shadow flex justify-between items-start p-4 transition-opacity duration-[500ms] ease-in z-50">
          <div className="flex items-start">
            <AiOutlineCheckCircle className="text-green-500 text-2xl mr-3 mt-1" />
            <div>
              <p className="font-semibold text-gray-900 mb-1">Code sent!</p>
              <p className="text-sm text-gray-700">A new verification code has been sent to your email.</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600" onClick={() => setNotification(null)}>
            <AiOutlineClose />
          </button>
        </div>
      )}
      
      {notification === 'verify_success' && (
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
              <p className="font-semibold text-gray-900 mb-1">Action failed!</p>
              <p className="text-sm text-gray-700">Something went wrong. Please try again.</p>
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
            maxLength={1}
            value={c}
            onChange={e => handleChange(e.target.value, i)}
            onKeyDown={e => handleKeyDown(e, i)}
            onPaste={handlePaste}
            className="w-[48px] h-[48px] border border-gray-300 rounded-[6px] text-[24px] text-center focus:outline-none"
          />
        ))}
      </div>

      {/* Divider */}
      <hr className="w-full max-w-[480px] border-t border-gray-300 mb-6" />

      {/* Resend link */}
      <p className="text-sm text-gray-700 text-center">
        Didn't get the mail? Check spam or{' '}
        {canResend ? (
          <button 
            onClick={handleResendCode} 
            className="underline text-blue-600 font-medium hover:text-blue-800"
          >
            send a new code
          </button>
        ) : (
          <span className="text-gray-500">
            send a new code in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
          </span>
        )}
      </p>
    </div>
  );
}

export default VerificationProviderPage;