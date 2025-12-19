import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { FaRegCalendarAlt, FaStar, FaCog, FaChevronLeft, FaChevronRight, FaPlus } from 'react-icons/fa';
import { MdDashboard, MdPayment, MdMedicalServices, MdOutlineSupportAgent, MdPeople } from 'react-icons/md';
import { TbReport } from 'react-icons/tb';
import { IoNotificationsOutline } from 'react-icons/io5';
import { FiSearch } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useProviderSearch } from '../contexts/ProviderSearchContext';
import logo from '/icons/Logomark (1).png'

const NAV_ITEMS = [
  { label: 'Overview', icon: <MdDashboard size={20} />, path: '/provider/dashboard' },
  { label: 'Calendar', icon: <FaRegCalendarAlt size={20} />, path: '/provider/calendar' },
  { label: 'Patient Lists', icon: <MdPeople size={20} />, path: '/provider/patients' },
  { label: 'Services', icon: <MdMedicalServices size={20} />, path: '/provider/services' },
  { label: 'Payments', icon: <MdPayment size={20} />, path: '/provider/payments' },
  { label: 'Reports', icon: <TbReport size={20} />, path: '/provider/reports' },
  { label: 'Reviews', icon: <FaStar size={20} />, path: '/provider/reviews' },
];

const ProviderLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { searchQuery, setSearchQuery, isSearching } = useProviderSearch();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isPatientsPage = location.pathname === '/provider/patients';

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      {/* Sidebar */}
      <aside
        className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col fixed h-full z-20 transition-all duration-300 ease-in-out`}
      >
        <div className="p-6 flex items-center justify-between">
          <Link to="/provider/dashboard" className="flex items-center gap-2 overflow-hidden">
            <img src={logo} alt="RESQ" className="w-10 h-10 min-w-[40px]" />
            <span className={`text-2xl font-bold text-[#06202E] transition-opacity duration-300 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
              RESQ
            </span>
          </Link>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-9 bg-white border border-gray-200 rounded-full p-1.5 hover:bg-gray-50 text-gray-500 z-30"
        >
          {isCollapsed ? <FaChevronRight size={12} /> : <FaChevronLeft size={12} />}
        </button>

        <nav className="flex-1 px-4 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    title={isCollapsed ? item.label : ''}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                        ? 'bg-[#06202E] text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                      } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <span className="min-w-[20px]">{item.icon}</span>
                    <span className={`transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="space-y-1 mb-6">
            <Link
              to="/provider/support"
              title={isCollapsed ? 'Support' : ''}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <span className="min-w-[20px]"><MdOutlineSupportAgent size={20} /></span>
              <span className={`transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                Support
              </span>
            </Link>
            <Link
              to="/provider/settings"
              title={isCollapsed ? 'Settings' : ''}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              <span className="min-w-[20px]"><FaCog size={20} /></span>
              <span className={`transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                Settings
              </span>
            </Link>
          </div>

          <div className={`flex items-center gap-3 px-4 py-2 ${isCollapsed ? 'justify-center px-0' : ''}`}>
            <div className="w-10 h-10 min-w-[40px] rounded-full bg-gray-200 overflow-hidden">
              {user?.profile_picture?.url ? (
                <img
                  src={user.profile_picture.url}
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                  {user?.full_name?.charAt(0) || 'P'}
                </div>
              )}
            </div>
            <div className={`flex-1 min-w-0 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || 'Provider User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || 'provider@example.com'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-8 sticky top-0 z-10">
          <div className="h-full grid grid-cols-3 items-center gap-6">
            {/* Left: Page title */}
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-[#16202E] truncate">
                {NAV_ITEMS.find((i) => i.path === location.pathname)?.label ||
                  (location.pathname.startsWith('/provider/support') ? 'Support' : null) ||
                  (location.pathname.startsWith('/provider/settings') ? 'Settings' : null) ||
                  'Overview'}
              </h1>
            </div>

            {/* Center: Search */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-[720px]">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiSearch size={18} />
                  )}
                </div>
                <input
                  type="text"
                  value={isPatientsPage ? searchQuery : ''}
                  onChange={(e) => {
                    if (isPatientsPage) {
                      setSearchQuery(e.target.value);
                    }
                  }}
                  placeholder={isPatientsPage ? "Search by name, email, phone, ID, city, or state..." : "Search here..."}
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                className="w-10 h-10 bg-[#0B1F2A] text-white rounded-full flex items-center justify-center hover:bg-[#06202E] transition-colors"
                aria-label="Create"
              >
                <FaPlus size={14} />
              </button>
              <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-full">
                <IoNotificationsOutline size={24} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                {user?.profile_picture?.url ? (
                  <img
                    src={user.profile_picture.url}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                    {user?.full_name?.charAt(0) || 'P'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProviderLayout;
