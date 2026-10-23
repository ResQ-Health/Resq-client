import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFilters } from '../contexts/FilterContext'
import { ProfileMenu } from './ProfileMenu'
import logo from '/icons/Logomark (1).png'
// import profileIcon from '../../public/icons/profile.png'
import { useGetUserProfile } from '../services/authService'

import { DOCTOR_REFERRAL_URL } from '../config/api'

function Navbar() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { addFilter, filters, removeFilter } = useFilters();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const searchFilter = filters.find(f => f.type === 'search');
  const [searchQuery, setSearchQuery] = useState(searchFilter?.value || '');
  const { data: profileData } = useGetUserProfile();
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

  // Check if we're on the search page
  const isSearchPage = location.pathname === '/search';

  // Check if we're on a login page
  const isLoginPage = ['/login', '/sign-in-patient', '/providers/signin', '/forgot-password'].includes(location.pathname);

  // Sync search input with filter
  React.useEffect(() => {
    if (searchFilter) {
      setSearchQuery(searchFilter.value);
    } else {
      setSearchQuery('');
    }
  }, [searchFilter]);

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmedQuery = searchQuery.trim();
      // Remove existing search filter
      if (searchFilter) {
        removeFilter(searchFilter.id);
      }
      // Add new filter if there's a search term
      if (trimmedQuery) {
        addFilter({
          type: 'search',
          value: trimmedQuery,
          label: trimmedQuery
        });
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (location.pathname === '/patientSetup/Myaccount' || isAuthenticated) {
    centerContent = (
      <div className="flex items-center gap-8">

      </div>
    );
    rightContent = (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsProfileMenuOpen(true)}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-full transition-colors"
        >
          {profileData?.data?.profile_picture?.url ? (
            <img
              src={profileData.data.profile_picture.url}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {getUserInitials()}
            </div>
          )}
          <span className="text-gray-700 font-medium">
            {user?.full_name?.split(' ')[0] || 'User'}
          </span>
          <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6l4 4 4-4" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  } else if (isLoginPage || location.pathname === '/' || location.pathname === '/onboarding' || location.pathname === '/onboardingPatient') {
    rightContent = (
      <div className="flex items-center space-x-2 sm:space-x-4">
        <a
          href={DOCTOR_REFERRAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 hover:text-gray-900 text-xs sm:text-sm hidden sm:inline transition-colors"
        >
          Are you a doctor?
        </a>
        <a
          href={DOCTOR_REFERRAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-[6px] text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors font-medium text-xs sm:text-sm whitespace-nowrap"
        >
          Sign up
        </a>
      </div>
    );
  } else if (location.pathname === '/providers/signup' || location.pathname === '/verify' || location.pathname === '/providers/verify') {
    rightContent = null;
  } else {
    rightContent = (
      <div className="flex items-center space-x-2 sm:space-x-4">
        <span className="text-gray-700 text-xs sm:text-sm hidden sm:inline">Already have an account?</span>
        <Link
          to="/login"
          className="px-3 sm:px-5 py-1.5 sm:py-2 border border-gray-300 rounded-[6px] text-[#06202E] hover:bg-gray-50 transition-colors font-medium text-xs sm:text-sm whitespace-nowrap"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <>
      <nav className={`bg-white border-b border-[#E1E3E6] py-3 px-4 sm:px-8 lg:px-16 transition-colors duration-200 sticky top-0 z-50`}>
        <div className="flex justify-between items-center max-w-[1440px] mx-auto gap-2">
          {/* Left section - Logo */}
          <div className={`text-base sm:text-lg flex items-center gap-2 font-bold shrink-0 text-[#06202E]`}>
            <img src={logo} alt="RESQ" className="w-8 h-8 sm:w-10 sm:h-10" />
            RESQ
          </div>

          {/* Center section - Navigation */}
          <div className="flex justify-center flex-1">
            {centerContent}
          </div>

          {/* Right section - Search and Profile/Login */}
          <div className="flex justify-end shrink-0">
            <div className="flex items-center gap-2 sm:gap-4">
              {rightContent}
            </div>
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