import React, { useState, useEffect } from 'react';
import { AiOutlineCloseCircle, AiOutlineClose, AiOutlineCheckCircle } from 'react-icons/ai';

function VerificationProviderPage() {
  // Replace with real email as needed
  const email = 'Joshuanasiru@yandex.com';
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

  // Verify code when the 6th digit is entered
  const handleVerify = async (enteredCodes: string[]) => {
    const code = enteredCodes.join('');
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) {
        setNotification('success');
      } else {
        setNotification('error');
      }
    } catch (err) {
      setNotification('error');
    }
    // Reset inputs
    setCodes(Array(6).fill(''));
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
            maxLength={1}
            value={c}
            onChange={e => handleChange(e.target.value, i)}
            className="w-[48px] h-[48px] border border-gray-300 rounded-[6px] text-[24px] text-center focus:outline-none"
          />
        ))}
      </div>

      {/* Divider */}
      <hr className="w-full max-w-[480px] border-t border-gray-300 mb-6" />

      {/* Resend link */}
      <p className="text-sm text-gray-700 text-center">
        Didn't get the mail? Check spam or{' '}
        <a href="#" className="underline text-blue-600">
          send a new code
        </a>
      </p>
    </div>
  );
}

export default VerificationProviderPage 