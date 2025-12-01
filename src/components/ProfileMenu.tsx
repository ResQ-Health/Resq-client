import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaCog, FaHeart, FaHistory } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

interface ProfileMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleLogout = () => {
        logout();
        navigate('/');
        onClose();
    };

    const getUserInitials = () => {
        if (!user?.full_name) return 'U';
        return user.full_name
            .split(' ')
            .map(name => name.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const menuItems = [
        {
            icon: <FaUser className="w-5 h-5" />,
            label: 'My Account',
            onClick: () => {
                navigate('/patient/my-account');
                onClose();
            }
        },
        {
            icon: <FaHistory className="w-5 h-5" />,
            label: 'Booking History',
            onClick: () => {
                navigate('/booking-history');
                onClose();
            }
        },
        {
            icon: <FaHeart className="w-5 h-5" />,
            label: 'Favourites',
            onClick: () => {
                navigate('/favourites');
                onClose();
            }
        },
        {
            icon: <FaCog className="w-5 h-5" />,
            label: 'Settings',
            onClick: () => {
                navigate('/settings');
                onClose();
            }
        }
    ];

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
            )}

            {/* Slide-out menu */}
            <div
                ref={menuRef}
                className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close menu"
                    >
                        <IoClose className="w-6 h-6 text-gray-600" />
                    </button>
                </div>

                {/* User Info */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                        {user?.profile_picture?.url ? (
                            <div className="w-16 h-16 rounded-full overflow-hidden relative" style={{ aspectRatio: '1/1' }}>
                                <img
                                    src={user.profile_picture.url}
                                    alt={`${user.full_name || 'User'}'s profile`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Hide image and show initials on error
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const initialsDiv = target.nextElementSibling as HTMLDivElement;
                                        if (initialsDiv) {
                                            initialsDiv.classList.remove('hidden');
                                        }
                                    }}
                                />
                                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold leading-none absolute inset-0 hidden" style={{ aspectRatio: '1/1' }}>
                                    {getUserInitials()}
                                </div>
                            </div>
                        ) : (
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold leading-none" style={{ aspectRatio: '1/1' }}>
                                {getUserInitials()}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 truncate">
                                {user?.full_name || 'User'}
                            </h3>
                            <p className="text-gray-600 text-sm truncate" title={user?.email || 'user@example.com'}>
                                {user?.email ?
                                    (user.email.length > 15 ?
                                        `${user.email.substring(0, 12)}...@${user.email.split('@')[1]}` :
                                        user.email
                                    ) :
                                    'user@example.com'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="p-4">
                    <nav className="space-y-2">
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={item.onClick}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {item.icon}
                                <span className="font-medium">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Logout Section */}
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <FaSignOutAlt className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}; 