import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import googleLogo from '/icons/googleicon.png';
import { IoEye } from "react-icons/io5";
import { IoIosEyeOff, IoIosCheckmarkCircleOutline, IoIosCheckmarkCircle } from "react-icons/io";
import { useRegisterProvider } from '../../services/providerService';

function OnboardingProviderPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterProvider();

  // form state
  const [providerName, setProviderName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({ providerName: '', email: '', phone: '', password: '' });

  /**
   * Redirect to backend OAuth
   */
  const handleContinueWithGoogle = () => {
    window.location.href = '/api/v1/auth/google';
  };

  /**
   * Validate email format
   */
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /**
   * Validate phone format (basic validation)
   */
  const isValidPhone = (phone: string) => {
    return /^\d{10,}$/.test(phone.replace(/\D/g, ''));
  };

  /**
   * Create account and navigate to verification
   */
  const handleCreateAccount = async () => {
    let newErrors = { providerName: '', email: '', phone: '', password: '' };
    let hasError = false;

    if (!providerName.trim()) {
      newErrors.providerName = 'Provider name is required';
      hasError = true;
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
      hasError = true;
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
      hasError = true;
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
      hasError = true;
    } else if (!isValidPhone(phone)) {
      newErrors.phone = 'Please enter a valid phone number';
      hasError = true;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      hasError = true;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError || !agreed) return;

    // Use the provider service mutation
    registerMutation.mutate(
      {
        provider_name: providerName,
        work_email: email,
        work_phone: phone,
        password: password,
        user_type: 'DiagnosticProvider'
      },
      {
        onSuccess: (data) => {
          // Save email to local storage for persistence across refreshes
          localStorage.setItem('pending_email', data.data.email);

          // Navigate to verification page with email
          navigate('/providers/verify', {
            state: {
              email: data.data.email
            }
          });
        }
      }
    );
  };

  return (
    <div className="mx-auto flex flex-col justify-center max-w-[480px] mt-[60px] mb-[60px] items-center">
      <h1
        style={{ fontFamily: 'Plus Jakarta Sans', letterSpacing: '0px' }}
        className="text-xl font-medium leading-8 mb-[40px] text-center align-middle"
      >
        Streamline your operations, enhance patient care,<br />
        and connect with a growing network of patients
      </h1>

      {/* Social login button */}
      <div className="flex space-x-12 mb-[16px]">
        <button
          onClick={handleContinueWithGoogle}
          className="flex items-center justify-center border w-[480px] h-[40px] gap-2 rounded-[6px] border-[#06202E] p-2 hover:bg-gray-50 transition-colors"
        >
          <img src={googleLogo} alt="google" className="w-5 h-5" />
          <span className="font-medium">Continue with Google</span>
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center mb-8 w-full max-w-[480px]">
        <hr className="flex-1 border-t-1" style={{ borderColor: '#DADCDD' }} />
        <span className="px-2 text-gray-700 font-medium">or</span>
        <hr className="flex-1 border-t-1" style={{ borderColor: '#DADCDD' }} />
      </div>

      {/* Form */}
      <div className="flex flex-col w-full gap-6">
        <div className="flex flex-col">
          <label className="text-gray-700 mb-1">Provider name</label>
          <input
            type="text"
            id="providerName"
            value={providerName}
            onChange={e => { setProviderName(e.target.value); setErrors({ ...errors, providerName: '' }); }}
            placeholder="XYZ Diagnostics Center"
            className={`w-[480px] h-[40px] border rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-[#06202E] ${errors.providerName ? 'border-red-500' : 'border-gray-300'}`}
          />
          <div className="h-5 mt-1">
            {errors.providerName && <span className="text-red-500 text-xs">{errors.providerName}</span>}
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-gray-700 mb-1">Primary email address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrors({ ...errors, email: '' }); }}
            placeholder="Hospital@outlook.com"
            className={`w-[480px] h-[40px] border bg-none rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-[#06202E] ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
          />
          <div className="h-5 mt-1">
            {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-gray-700 mb-1">Primary phone number</label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={e => { setPhone(e.target.value); setErrors({ ...errors, phone: '' }); }}
            placeholder="09180653262"
            className={`w-[480px] h-[40px] border bg-none rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-[#06202E] ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
          />
          <div className="h-5 mt-1">
            {errors.phone && <span className="text-red-500 text-xs">{errors.phone}</span>}
          </div>
        </div>

        <div className="flex flex-col relative">
          <label className="text-gray-700 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors({ ...errors, password: '' }); }}
              placeholder="Create password"
              className={`w-[480px] h-[40px] border rounded-[6px] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#06202E] ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <IoIosEyeOff size={20} /> : <IoEye size={20} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Min 8 character password</p>
          <div className="h-5 mt-1">
            {errors.password && <span className="text-red-500 text-xs">{errors.password}</span>}
          </div>
        </div>
      </div>

      {/* Terms agreement */}
      <div className="flex items-start justify-start gap-2 mt-[20px] mb-4 w-full self-start">
        {agreed ? (
          <IoIosCheckmarkCircle
            className="h-6 w-6 cursor-pointer flex-shrink-0"
            style={{ color: '#06202E' }}
            onClick={() => setAgreed(!agreed)}
          />
        ) : (
          <IoIosCheckmarkCircleOutline
            className="h-6 w-6 cursor-pointer text-gray-400 flex-shrink-0"
            onClick={() => setAgreed(!agreed)}
          />
        )}
        <label className="ml-2 text-sm text-gray-700 leading-tight">
          Yes, I understand and agree to the{' '}
          <Link to="/terms-and-policy" className="underline font-medium hover:text-[#06202E]">
            ResQ Health Terms of Service
          </Link>, including the{' '}
          <Link to="/terms-and-policy" className="underline font-medium hover:text-[#06202E]">
            User Agreement
          </Link>{' '}
          and{' '}
          <Link to="/terms-and-policy" className="underline font-medium hover:text-[#06202E]">
            Privacy Policy
          </Link>.
        </label>
      </div>

      {/* CTA */}
      <button
        disabled={!agreed || registerMutation.isPending}
        onClick={handleCreateAccount}
        style={{ fontFamily: 'Plus Jakarta Sans', backgroundColor: agreed ? '#06202E' : undefined }}
        className={`w-full h-[48px] flex items-center justify-center text-center rounded-[6px] font-medium text-[16px] transition-colors ${agreed ? 'text-white hover:bg-[#051b26]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} ${registerMutation.isPending ? 'opacity-70 cursor-wait' : ''}`}
      >
        {registerMutation.isPending ? 'Creating account...' : 'Create account'}
      </button>

      <p className="text-sm text-gray-700 mt-6 font-medium">
        Already have an account?{' '}
        <Link to="/providers/signin" className="underline text-[#06202E] font-bold">
          Sign In
        </Link>
      </p>

      {/* Footer Links */}
      <div className="flex items-center justify-center gap-8 mt-12 text-[#5C6F7F] text-sm">
        <span>2025 MedResQ Healthcare</span>
        <Link to="/terms-and-policy" className="underline hover:text-[#06202E]">
          Privacy Policy
        </Link>
        <Link to="/support" className="underline hover:text-[#06202E]">
          Support
        </Link>
      </div>
    </div>
  );
}

export default OnboardingProviderPage;