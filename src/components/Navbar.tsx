import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ProfileMenu } from './ProfileMenu'
import logo from '../../public/icons/Logomark (1).png'
import profileIcon from '../../public/icons/profile.png'

function Navbar() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  let centerContent;
  let rightContent;

  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    return user.full_name
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (location.pathname === '/patientSetup/Myaccount' || isAuthenticated) {
    centerContent = (
      <div className="flex items-center gap-8">
        <Link to="/services" className="text-gray-700 hover:text-gray-900 font-medium">Services</Link>
        <Link to="/about" className="text-gray-700 hover:text-gray-900 font-medium">About Us</Link>
        <Link to="/business" className="text-gray-700 hover:text-gray-900 font-medium">Business</Link>
      </div>
    );
    rightContent = (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsProfileMenuOpen(true)}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-full transition-colors"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {getUserInitials()}
          </div>
          <span className="text-gray-700 font-medium">
            {user?.full_name?.split(' ')[0] || 'User'}
          </span>
          <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6l4 4 4-4" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  } else if (location.pathname === '/' || location.pathname === '/onboarding') {
    rightContent = (
      <div className="flex items-center space-x-4">
        <span className="text-gray-700">Are you a provider?</span>
        <Link to="/login" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:text-gray-900">
          Sign in
        </Link>
      </div>
    );
  } else if (location.pathname === '/verify') {
    rightContent = null;
  } else {
    rightContent = (
      <div className="flex items-center">
        <Link to="/login" className="px-4 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-700">
          Login
        </Link>
      </div>
    );
  }

  return (
    <>
      <nav className="bg-white py-2 px-16">
        <div className="flex justify-between items-center max-w-[1440px] mx-auto">
          {/* Left section - Logo */}
          <div className="text-lg flex items-center gap-2 font-bold w-1/4">
            <img src={logo} alt="RESQ" className="w-10 h-10" />
            RESQ
          </div>

          {/* Center section - Navigation */}
          <div className="flex justify-center flex-1">
            {centerContent}
          </div>

          {/* Right section - Profile/Login */}
          <div className="flex justify-end w-1/4">
            {rightContent}
          </div>
        </div>
      </nav>

      {/* Profile Menu */}
      <ProfileMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
      />
    </>
  )
}

export default Navbar 