import React, { useState } from 'react';
import { FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [passwords, setPasswords] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPasswords, setShowPasswords] = useState({
        oldPassword: false,
        newPassword: false,
        confirmPassword: false
    });

    const handlePasswordChange = (field: keyof typeof passwords, value: string) => {
        setPasswords(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleEditProfile = () => {
        onClose();
        navigate('/patient/my-account');
    };

    const handleSave = () => {
        // Save account settings logic here
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="fixed top-4 right-4 h-[calc(100vh-2rem)] w-full max-w-md bg-white shadow-2xl z-50 rounded-lg"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Account Settings</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Edit Profile Section */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Edit Profile</h3>
                                    <p className="text-sm text-gray-600">Update your personal information</p>
                                </div>
                                <button
                                    onClick={handleEditProfile}
                                    className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                                >
                                    Edit
                                </button>
                            </div>

                            {/* Change Password Section */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900">Change password</h3>

                                {/* Old Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Input old password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.oldPassword ? "text" : "password"}
                                            value={passwords.oldPassword}
                                            onChange={(e) => handlePasswordChange('oldPassword', e.target.value)}
                                            placeholder="Enter your old password"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 focus:border-[#06202E] pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility('oldPassword')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPasswords.oldPassword ? (
                                                <FiEyeOff className="w-4 h-4" />
                                            ) : (
                                                <FiEye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Input new password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.newPassword ? "text" : "password"}
                                            value={passwords.newPassword}
                                            onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                                            placeholder="Enter your new password"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 focus:border-[#06202E] pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility('newPassword')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPasswords.newPassword ? (
                                                <FiEyeOff className="w-4 h-4" />
                                            ) : (
                                                <FiEye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm new password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.confirmPassword ? "text" : "password"}
                                            value={passwords.confirmPassword}
                                            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                                            placeholder="Confirm your new password"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 focus:border-[#06202E] pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility('confirmPassword')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPasswords.confirmPassword ? (
                                                <FiEyeOff className="w-4 h-4" />
                                            ) : (
                                                <FiEye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-white">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-white bg-[#06202E] rounded-lg hover:bg-[#06202E]/90 transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AccountSettingsModal; 