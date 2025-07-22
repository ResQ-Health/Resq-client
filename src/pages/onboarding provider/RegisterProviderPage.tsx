import React, { useState } from 'react';
import googleLogo from '/icons/googleicon.png';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineCheckCircle, AiFillCheckCircle } from 'react-icons/ai';
import { Link } from 'react-router-dom';

function RegisterProviderPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="w-full h-full mx-auto flex flex-col justify-center max-w-[480px] items-center mt-[72px] mb-[78px]">
      <h1
        style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 500, fontSize: '20px', lineHeight: '32px', letterSpacing: '0%', textAlign: 'center', verticalAlign: 'middle' }}
        className="mb-[40px]"
      >
        Streamline your operations, enhance patient care, and connect with a growing network of patients
      </h1>

      <div className="flex space-x-12 mb-[16px]">
        <button
          style={{ fontFamily: 'Plus Jakarta Sans' }}
          className="flex items-center justify-center w-[480px] h-[40px] gap-2 rounded-[6px] border border-gray-300 p-2 mb-[16px] font-medium text-[14px] leading-[22.4px] tracking-normal align-middle"
        >
          <img src={googleLogo} alt="google" className="w-5 h-5" />
          Continue with Google
        </button>
      </div>

      <div className="flex items-center w-full max-w-[480px] px-[169.5px] mx-auto mb-[16px]">
        <hr className="flex-1 border-t border-gray-300" />
        <span className="px-2 text-gray-500">or</span>
        <hr className="flex-1 border-t border-gray-300" />
      </div>

      <div className="flex flex-col w-full max-w-[480px] gap-6">
        <div className="flex flex-col">
          <label className="text-gray-700 mb-1">Provider name</label>
          <input
            type="text"
            id="providerName"
            placeholder="XYZ Diagnostics Center"
            name="providerName"
            className="w-[480px] h-[40px] border border-gray-300 rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-gray-700 mb-1">Work email address</label>
          <input
            type="email"
            id="workEmail"
            placeholder="Hospital@outlook.com"
            name="workEmail"
            className="w-[480px] h-[40px] border border-gray-300 rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-gray-700 mb-1">Work phone number</label>
          <input
            type="tel"
            id="workPhone"
            placeholder="09180653262"
            name="workPhone"
            className="w-[480px] h-[40px] border border-gray-300 rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col relative">
          <label className="text-gray-700 mb-1">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            placeholder="Create password"
            name="password"
            className="w-[480px] h-[40px] border border-gray-300 rounded-[6px] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
          <p className="text-xs text-gray-500 mt-1">Min 14 character password</p>
        </div>
      </div>

      <div className="flex items-start mt-[40px] mb-4">
        {agreed ? (
          <AiFillCheckCircle
            className="h-6 w-6 cursor-pointer text-blue-600"
            onClick={() => setAgreed(!agreed)}
          />
        ) : (
          <AiOutlineCheckCircle
            className="h-6 w-6 cursor-pointer text-gray-500"
            onClick={() => setAgreed(!agreed)}
          />
        )}
        <label className="ml-2 text-sm text-gray-700">
          Yes, I understand and agree to the{' '}
          <a href="#" className="underline">ResQ Health Terms of Service</a>, including the{' '}
          <a href="#" className="underline">User Agreement</a> and{' '}
          <a href="#" className="underline">Privacy Policy</a>.
        </label>
      </div>

      <button
        disabled={!agreed}
        style={{ fontFamily: 'Plus Jakarta Sans' }}
        className={`w-[480px] h-[40px] p-4 rounded-[6px] font-medium text-[14px] leading-[22.4px] tracking-normal align-middle ${agreed ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}
      >
       Create account
      </button>
      <p className="text-sm text-gray-700 mt-4 mb-8">
        Already have an account? <Link to="/login" className="underline text-gray-700">Sign In</Link>
      </p>
    </div>
  )
}

export default RegisterProviderPage 