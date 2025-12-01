import React, { useState } from 'react';
import { FiMail, FiBell, FiCreditCard, FiShield, FiHeadphones, FiX, FiLogOut, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { usePatientProfile } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationSettingsModal from '../../components/patient/NotificationSettingsModal';
import PaymentSetupModal from '../../components/patient/PaymentSetupModal';
import AccountSettingsModal from '../../components/patient/AccountSettingsModal';

export default function SettingsPage() {
    const { data: profileData, isLoading, error } = usePatientProfile();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    // Get email and verification status from account data
    const email = profileData?.data?.email || 'Joshuanasiru@gmail.com';
    const isEmailVerified = profileData?.data?.email_verified || false;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="w-full px-[423px]  min-h-screen bg-white">
            {/* Header */}
            <div className=" py-8">
                <h1 className="text-2xl font-bold text-black mb-2">Settings</h1>
                <p className="text-gray-500 text-sm">Lorem ipsum dolor sit amet consectetur. Tincidunt.</p>
            </div>

            {/* Settings List */}
            <div className="space-y-4 ">
                {/* Email Settings */}
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <FiMail className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-black">Email settings</h3>
                            <p className="text-sm text-gray-600">{email}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {isEmailVerified ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                Verified
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                Not verified
                            </span>
                        )}
                        <FiChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                </div>

                {/* Notifications */}
                <div
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setIsNotificationModalOpen(true)}
                >
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <FiBell className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-black">Notifications</h3>
                            <p className="text-sm text-gray-600">Loremm impsum</p>
                        </div>
                    </div>
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                </div>

                {/* Payment Setup */}
                <div
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setIsPaymentModalOpen(true)}
                >
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <FiCreditCard className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-black">Payment setup</h3>
                            <p className="text-sm text-gray-600">Loremm impsum</p>
                        </div>
                    </div>
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                </div>

                {/* Account Settings */}
                <div
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setIsAccountModalOpen(true)}
                >
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <FiShield className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-black">Account settings</h3>
                            <p className="text-sm text-gray-600">Loremm impsum</p>
                        </div>
                    </div>
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                </div>

                {/* Help & Support */}
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <FiHeadphones className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-black">Help & support</h3>
                            <p className="text-sm text-gray-600">Loremm impsum</p>
                        </div>
                    </div>
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                </div>

                {/* Close Account */}
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <FiX className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-black">Close account</h3>
                            <p className="text-sm text-gray-600">Loremm impsum</p>
                        </div>
                    </div>
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                </div>

                {/* Logout Button */}
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                    <button
                        onClick={handleLogout}
                        className="flex justify-center mx-auto w-full items-center space-x-2 text-red-600 text-[16px] font-[600] hover:text-red-700 transition-colors"
                    >
                        <FiLogOut className="w-4 h-4" />
                        <span>Log out</span>
                    </button>
                </div>
            </div>

            {/* Notification Settings Modal */}
            <NotificationSettingsModal
                isOpen={isNotificationModalOpen}
                onClose={() => setIsNotificationModalOpen(false)}
            />

            {/* Payment Setup Modal */}
            <PaymentSetupModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
            />

            {/* Account Settings Modal */}
            <AccountSettingsModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
            />
        </div>
    );
} 