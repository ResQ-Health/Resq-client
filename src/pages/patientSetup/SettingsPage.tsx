import React, { useState } from 'react';
import {
    FiMail,
    FiBell,
    FiShield,
    FiHeadphones,
    FiX,
    FiLogOut,
    FiChevronRight,
} from 'react-icons/fi';
import { usePatientProfile } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { useDeleteAccount } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import NotificationSettingsModal from '../../components/patient/NotificationSettingsModal';
import AccountSettingsModal from '../../components/patient/AccountSettingsModal';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
    const { data: profileData } = usePatientProfile();
    const { logout } = useAuth();
    const deleteAccountMutation = useDeleteAccount();
    const navigate = useNavigate();
    
    // Modal states
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    // Derived data
    const email = profileData?.data?.email || '';
    const fullName = profileData?.data?.full_name || 'Patient';
    const isEmailVerified = profileData?.data?.email_verified || false;
    // Check various possible locations for profile picture URL
    const profilePictureUrl = typeof profileData?.data?.profile_picture === 'string' 
        ? profileData.data.profile_picture 
        : profileData?.data?.profile_picture?.url || null;

    const handleLogout = () => {
        logout();
        navigate('/sign-in-patient');
        toast.success('Logged out successfully');
    };

    const handleCloseAccount = () => {
        if (window.confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
            deleteAccountMutation.mutate();
        }
    };

    const SettingItem = ({ 
        icon: Icon, 
        title, 
        description, 
        onClick,
        isDestructive = false
    }: { 
        icon: any, 
        title: string, 
        description: string, 
        onClick: () => void,
        isDestructive?: boolean
    }) => (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-all duration-200 group text-left border-b border-gray-50 last:border-b-0`}
        >
            <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isDestructive 
                        ? 'bg-red-50 text-red-600 group-hover:bg-red-100' 
                        : 'bg-blue-50/50 text-[#06202E] group-hover:bg-[#06202E] group-hover:text-white'
                }`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className={`font-semibold ${isDestructive ? 'text-red-600' : 'text-[#06202E]'}`}>
                        {title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                </div>
            </div>
            <FiChevronRight className={`w-5 h-5 transition-colors ${
                isDestructive ? 'text-red-300 group-hover:text-red-500' : 'text-gray-300 group-hover:text-[#06202E]'
            }`} />
        </button>
    );

    return (
        <div className="min-h-screen bg-[#F6F8FA] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto space-y-6">
                
                {/* Profile Header Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                            {profilePictureUrl ? (
                                <img 
                                    src={profilePictureUrl} 
                                    alt={fullName} 
                                    className="h-16 w-16 rounded-full object-cover border-4 border-blue-50"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-[#06202E] text-white flex items-center justify-center text-2xl font-bold border-4 border-blue-50">
                                    {fullName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-bold text-[#06202E]">{fullName}</h1>
                                <p className="text-gray-500 text-sm">{email}</p>
                                <div className="mt-2">
                                    {isEmailVerified ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                            Verified Account
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={() => toast.error('Verification service temporarily unavailable')}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                                            Verify Email
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Groups */}
                <div className="space-y-6">
                    {/* General Settings */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account & Preferences</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            <SettingItem 
                                icon={FiShield}
                                title="Security"
                                description="Password, 2FA, and login activity"
                                onClick={() => setIsAccountModalOpen(true)}
                            />
                            <SettingItem 
                                icon={FiBell}
                                title="Notifications"
                                description="Manage emails, push, and SMS alerts"
                                onClick={() => setIsNotificationModalOpen(true)}
                            />
                        </div>
                    </div>

                    {/* Support & Legal */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Support</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            <SettingItem 
                                icon={FiHeadphones}
                                title="Help Center"
                                description="FAQs and customer support"
                                onClick={() => navigate('/support')}
                            />
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="divide-y divide-gray-50">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center p-4 text-gray-500 hover:text-[#06202E] hover:bg-gray-50 transition-colors font-medium text-sm gap-2"
                            >
                                <FiLogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                <div className="text-center text-xs text-gray-400 pb-8">
                    Version 1.0.0 • ResQ Health
                </div>
            </div>

            {/* Modals */}
            <NotificationSettingsModal
                isOpen={isNotificationModalOpen}
                onClose={() => setIsNotificationModalOpen(false)}
            />

            <AccountSettingsModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
            />
        </div>
    );
}
