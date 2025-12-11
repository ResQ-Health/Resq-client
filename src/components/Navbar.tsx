import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFilters } from '../contexts/FilterContext'
import { ProfileMenu } from './ProfileMenu'
import logo from '/icons/Logomark (1).png'
// import profileIcon from '../../public/icons/profile.png'
import { usePatientProfile } from '../services/userService'

function Navbar() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { addFilter, filters, removeFilter } = useFilters();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const searchFilter = filters.find(f => f.type === 'search');
  const [searchQuery, setSearchQuery] = useState(searchFilter?.value || '');
  const { data: profileData } = usePatientProfile();
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
  const isLoginPage = ['/sign-in-patient', '/sign-in-provider', '/forgot-password'].includes(location.pathname);

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
  } else if (isLoginPage) {
    rightContent = (
      <div className="flex items-center gap-4">
        <span className="text-[#06202E] font-medium text-sm">No account?</span>
        <Link
          to="/"
          className="px-6 py-2 border border-gray-300 rounded-[6px] text-[#06202E] hover:bg-gray-50 transition-colors font-medium text-sm"
        >
          Sign up
        </Link>
      </div>
    );
  } else if (location.pathname === '/' || location.pathname === '/onboarding' || location.pathname === '/login') {
    rightContent = (
      <div className="flex items-center space-x-4">
        <span className="text-gray-700">Are you a provider?</span>
        <Link to="/sign-in-provider" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:text-gray-900">
          Sign in
        </Link>
      </div>
    );
  } else if (location.pathname === '/verify') {
    rightContent = null;
  } else {
    rightContent = (
      <div className="flex items-center space-x-4">
        <span className="text-gray-700">Are you a provider?</span>
        <Link to="/sign-in-provider" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:text-gray-900">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <nav className={`bg-white border-b border-[#E1E3E6] py-3 px-16 transition-colors duration-200`}>
        <div className="flex justify-between items-center max-w-[1440px] mx-auto">
          {/* Left section - Logo */}
          <div className={`text-lg flex items-center gap-2 font-bold w-1/4 text-[#06202E]`}>
            <img src={logo} alt="RESQ" className="w-10 h-10" />
            RESQ
          </div>

          {/* Center section - Navigation */}
          <div className="flex justify-center flex-1">
            {centerContent}
          </div>

          {/* Right section - Search and Profile/Login */}
          <div className="flex justify-end w-1/4">
            <div className="flex items-center gap-4">
              {/* Search bar - only show on search page */}
              {isSearchPage && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyPress={handleSearchSubmit}
                    placeholder="Search providers or locations..."
                    className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-[28px] leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              )}
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