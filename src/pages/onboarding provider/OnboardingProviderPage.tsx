import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import googleLogo from '/icons/googleicon.png';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineCheck } from 'react-icons/ai';
import { IoEye } from "react-icons/io5";
import { IoIosEyeOff, IoIosCheckmarkCircleOutline, IoIosCheckmarkCircle } from "react-icons/io";

function OnboardingProviderPage() {
  const navigate = useNavigate();
  // form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({ fullName: '', email: '', password: '' });

  /**
   * Redirect to backend OAuth
   */
  const handleContinueWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  /**
   * Create account and navigate to verification
   */
  const handleCreateAccount = async () => {
    let newErrors = { fullName: '', email: '', password: '' };
    if (!fullName) newErrors.fullName = 'Full name is required';
    if (!email) newErrors.email = 'Email address is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    if (!fullName || !email || !password || !agreed) return;

    // Navigate to verification page immediately
    navigate('/verify', { state: { email } });

    // Optionally, run the API call in the background
    try {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className=" h-[638px] mx-auto flex flex-col justify-center max-w-[480px] mt-[108.5px] items-center  ">
      <h1
        style={{ fontFamily: 'Plus Jakarta Sans', letterSpacing: '0px' }}
        className="text-xl font-medium leading-8 mb-[40px]  text-center align-middle"
      >
        Book appointments, manage your healthcare, and<br />
        connect with hospitals.
      </h1>

      {/* Social login button */}
      <div className="flex space-x-12 mb-[16px]">
        <button
          onClick={handleContinueWithGoogle}
          className="flex items-center justify-center border w-[480px] h-[40px] gap-2 rounded-[6px] border-[#06202E] p-2"
        >
          <img src={googleLogo} alt="google" className="w-5 h-5" />
          <span>Continue with Google</span>
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
          <label className="text-gray-700 mb-1">Full name</label>
          <input
            type="text"
            id="fullname"
            value={fullName}
            onChange={e => { setFullName(e.target.value); setErrors({ ...errors, fullName: '' }); }}
            placeholder="Joshua Nasiru"
            className={`w-[480px] h-[40px] border rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fullName ? 'border-red-500' : 'border-gray-300'}`}
          />
          <div className="h-5">
            {errors.fullName && <span className="text-red-500 text-xs">{errors.fullName}</span>}
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrors({ ...errors, email: '' }); }}
            placeholder="Joshuanasiru@yandex.com"
            className={`w-[480px] h-[40px] border bg-none rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
          />
          <div className="h-5">
            {errors.email && <span className="text-red-500 text-xs">{errors.email}</span>}
          </div>
        </div>

        <div className="flex flex-col relative">
          <label className="text-gray-700 mb-1">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setErrors({ ...errors, password: '' }); }}
            placeholder="Min 8 character password"
            className={`w-[480px] h-[40px] border rounded-[6px] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <IoIosEyeOff /> : <IoEye />}
          </button>
          <div className="h-5">
            {errors.password && <span className="text-red-500 text-xs">{errors.password}</span>}
          </div>
        </div>
      </div>

      {/* Terms agreement */}
      <div className="flex items-start justify-start gap-2 mt-[40px] mb-4 w-full self-start">
        {agreed ? (
          <IoIosCheckmarkCircle
            className="h-6 w-6 cursor-pointer"
            style={{ color: '#06202E' }}
            onClick={() => setAgreed(!agreed)}
          />
        ) : (
          <IoIosCheckmarkCircleOutline
            className="h-6 w-6 cursor-pointer text-gray-400"
            onClick={() => setAgreed(!agreed)}
          />
        )}
        <label className="ml-2 text-sm text-gray-700">
          Yes, I understand and agree to the{' '}
          <a href="#" className="underline">
            ResQ Health Terms of <br/> Service
          </a>, including the{' '}
          <a href="#" className="underline">
            User Agreement
          </a>{' '}
          and{' '}
          <a href="#" className="underline">
            Privacy Policy
          </a>.
        </label>
      </div>

      {/* CTA */}
      <button
        disabled={!agreed}
        onClick={handleCreateAccount}
        style={{ fontFamily: 'Plus Jakarta Sans', backgroundColor: agreed ? '#06202E' : undefined }}
        className={`w-full h-[40px] flex items-start justify-center text-center  p-[7px] rounded-[6px] font-medium text-[14px] leading-[22.4px] tracking-normal align-middle ${
          agreed ? 'text-white' : 'bg-gray-300 text-gray-500'
        }`}
      >
        Create account
      </button>

      <p className="text-sm text-gray-700 mt-4">
        Already have an account?{' '}
        <a href="/login" className="underline text-blue-600">
          Sign In
        </a>
      </p>
    </div>
  );
}

export default OnboardingProviderPage; 