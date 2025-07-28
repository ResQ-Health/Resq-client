import React, { useState } from 'react';
import { FiSettings } from 'react-icons/fi';
import { FaUser, FaRegBell, FaShieldAlt, FaRegEye, FaRegCreditCard } from 'react-icons/fa';

export default function SettingsPage() {
    const [notifications, setNotifications] = useState({
        email: true,
        sms: false,
        push: true
    });

    const [privacy, setPrivacy] = useState({
        profileVisibility: 'public',
        dataSharing: false
    });

    const handleNotificationChange = (type: keyof typeof notifications) => {
        setNotifications(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const handlePrivacyChange = (setting: keyof typeof privacy, value: string | boolean) => {
        setPrivacy(prev => ({
            ...prev,
            [setting]: value
        }));
    };

    return (
        <div className="w-full min-h-screen">
            {/* Main Content */}
            <div className="max-w-6xl mx-auto bg-white rounded-lg px-6">
                <div className="py-8">
                    <h1 className="text-2xl font-semibold mb-2">Settings</h1>
                    <p className="text-gray-600 mb-8">Manage your account preferences and privacy settings</p>

                    <div className="space-y-8">
                        {/* Account Settings */}
                        <div className="border rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <FaUser className="w-5 h-5 text-[#16202E]" />
                                <h2 className="text-lg font-medium">Account Settings</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Profile Information</h3>
                                        <p className="text-sm text-gray-600">Update your personal information</p>
                                    </div>
                                    <button className="text-[#16202E] hover:underline">Edit</button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Change Password</h3>
                                        <p className="text-sm text-gray-600">Update your account password</p>
                                    </div>
                                    <button className="text-[#16202E] hover:underline">Change</button>
                                </div>
                            </div>
                        </div>

                        {/* Notification Settings */}
                        <div className="border rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <FaRegBell className="w-5 h-5 text-[#16202E]" />
                                <h2 className="text-lg font-medium">Notifications</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Email Notifications</h3>
                                        <p className="text-sm text-gray-600">Receive updates via email</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifications.email}
                                            onChange={() => handleNotificationChange('email')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#16202E]"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">SMS Notifications</h3>
                                        <p className="text-sm text-gray-600">Receive updates via SMS</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifications.sms}
                                            onChange={() => handleNotificationChange('sms')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#16202E]"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Push Notifications</h3>
                                        <p className="text-sm text-gray-600">Receive updates via push notifications</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifications.push}
                                            onChange={() => handleNotificationChange('push')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#16202E]"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Privacy Settings */}
                        <div className="border rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <FaShieldAlt className="w-5 h-5 text-[#16202E]" />
                                <h2 className="text-lg font-medium">Privacy & Security</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Profile Visibility</h3>
                                        <p className="text-sm text-gray-600">Control who can see your profile</p>
                                    </div>
                                    <select
                                        value={privacy.profileVisibility}
                                        onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                                        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option value="public">Public</option>
                                        <option value="private">Private</option>
                                        <option value="friends">Friends Only</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Data Sharing</h3>
                                        <p className="text-sm text-gray-600">Allow data sharing for better service</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={privacy.dataSharing}
                                            onChange={() => handlePrivacyChange('dataSharing', !privacy.dataSharing)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#16202E]"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Payment Settings */}
                        <div className="border rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <FaRegCreditCard className="w-5 h-5 text-[#16202E]" />
                                <h2 className="text-lg font-medium">Payment & Billing</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Payment Methods</h3>
                                        <p className="text-sm text-gray-600">Manage your payment methods</p>
                                    </div>
                                    <button className="text-[#16202E] hover:underline">Manage</button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Billing History</h3>
                                        <p className="text-sm text-gray-600">View your billing history</p>
                                    </div>
                                    <button className="text-[#16202E] hover:underline">View</button>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                            <button className="bg-[#16202E] text-white px-6 py-2.5 rounded-[6px] text-sm font-medium">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 