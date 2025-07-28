import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUser, FaRegCalendarAlt, FaRegHeart } from 'react-icons/fa';
import { FiSettings } from 'react-icons/fi';

const NAV_ITEMS = [
    { label: 'My account', icon: <FaUser className="w-5 h-5" />, path: '/my-account' },
    { label: 'Booking history', icon: <FaRegCalendarAlt className="w-5 h-5" />, path: '/booking-history' },
    { label: 'My favourites', icon: <FaRegHeart className="w-5 h-5" />, path: '/favourites' },
    { label: 'Settings', icon: <FiSettings className="w-5 h-5" />, path: '/settings' },
];

interface PatientLayoutProps {
    children: React.ReactNode;
}

export default function PatientLayout({ children }: PatientLayoutProps) {
    const location = useLocation();

    return (
        <div className="w-full min-h-screen">
            {/* Top navigation bar with border-y */}
            <div className="w-full flex items-center justify-center border-y-2 border-gray-200 py-4 mb-12 relative">
                <div className="flex gap-12 relative">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.label}
                            to={item.path}
                            className="flex flex-col items-center"
                        >
                            <span
                                className={`flex items-center gap-2 ${location.pathname === item.path ? 'text-[#16202E] font-semibold' : 'text-gray-400 font-normal'}`}
                            >
                                {item.icon}{item.label}
                            </span>
                        </Link>
                    ))}
                    {/* Underline for active item */}
                    <div
                        className="bg-[#16202E] h-1 rounded absolute -bottom-4 transition-all duration-300"
                        style={{
                            left: `${NAV_ITEMS.findIndex(item => item.path === location.pathname) * 120}px`,
                            width: '120px',
                            display: NAV_ITEMS.some(item => item.path === location.pathname) ? 'block' : 'none',
                        }}
                    />
                </div>
            </div>

            {/* Main Content */}
            {children}
        </div>
    );
} 