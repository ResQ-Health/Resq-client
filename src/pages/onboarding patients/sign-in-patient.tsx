import React, { useState } from 'react';
import googleLogo from '../../../public/icons/googleicon.png';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

function RegisterPatientPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full flex flex-col justify-center items-center mt-[230px] mb-[251px]">
      <h1
        style={{ fontFamily: 'Plus Jakarta Sans' }}
        className="font-semibold text-[32px] leading-[44.3px] tracking-normal text-center align-middle mb-8"
      >
        Welcome back
      </h1>

      {/* Google login */}
      <button
        style={{ fontFamily: 'Plus Jakarta Sans' }}
        className="flex items-center justify-center w-[480px] h-[40px] gap-2 rounded-[6px] border border-gray-300 p-2 mb-4 font-medium text-[14px] leading-[22.4px] tracking-normal align-middle"
      >
        <img src={googleLogo} alt="google" className="w-5 h-5" />
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center w-full max-w-[480px] px-[69.5px] mx-auto mb-6">
        <hr className="flex-1 w-full border-gray-300" />
        <span className="px-2 text-gray-500">or</span>
        <hr className="flex-1  border-gray-300" />
      </div>

      {/* Email & Password fields */}
      <div className="flex flex-col w-full max-w-[480px] gap-[2px]">
        <div className="flex flex-col">
          <label className="text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            placeholder="Joshuanasiru@yandex.com"
            className="w-full h-[40px] border border-gray-300 rounded-[6px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col relative">
          <label className="text-gray-700 mb-1">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="w-full h-[40px] border border-gray-300 rounded-[6px] px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
          </button>
        </div>
        <div className="text-left">
          <a href="/forgot-password" className="text-sm text-gray-500 underline">
            Forgot password?
          </a>
        </div>
      </div>

      {/* Sign in button */}
      <button className="w-[480px] h-[40px] bg-gray-300 text-gray-500 rounded-[6px] mt-6">
        Sign in
      </button>

      {/* Footer note (Layout covers actual Footer) */}
      {/* Footer is rendered by Layout */}
    </div>
  );
}

export default RegisterPatientPage; 