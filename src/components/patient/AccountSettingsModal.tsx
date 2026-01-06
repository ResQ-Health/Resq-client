import React, { useState } from 'react';
import { FiX, FiEye, FiEyeOff, FiLock } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useChangePassword } from '../../services/authService';
import { toast } from 'react-hot-toast';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
    const changePasswordMutation = useChangePassword();
    
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState({
        old: false,
        new: false,
        confirm: false
    });

    const toggleShow = (field: keyof typeof showPassword) => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (formData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        changePasswordMutation.mutate({
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword
        }, {
            onSuccess: () => {
                setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        onClose();
            }
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
                    >
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-[#06202E]">Change Password</h2>
                                    <p className="text-sm text-gray-500 mt-1">Update your login credentials</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <FiX className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 p-6">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3">
                                        <FiLock className="w-5 h-5 text-[#06202E] mt-0.5 flex-shrink-0" />
                                        <div className="text-sm text-gray-600">
                                            Choose a strong password with at least 8 characters.
                                        </div>
                                    </div>

                                <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                    <div className="relative">
                                        <input
                                                type={showPassword.old ? "text" : "password"}
                                                name="oldPassword"
                                                value={formData.oldPassword}
                                                onChange={handleChange}
                                                className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06202E]/10 focus:border-[#06202E] transition-all outline-none"
                                                placeholder="Enter current password"
                                                required
                                        />
                                        <button
                                            type="button"
                                                onClick={() => toggleShow('old')}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                                {showPassword.old ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                    <div className="relative">
                                        <input
                                                type={showPassword.new ? "text" : "password"}
                                                name="newPassword"
                                                value={formData.newPassword}
                                                onChange={handleChange}
                                                className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06202E]/10 focus:border-[#06202E] transition-all outline-none"
                                                placeholder="Enter new password"
                                                required
                                                minLength={8}
                                        />
                                        <button
                                            type="button"
                                                onClick={() => toggleShow('new')}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                                {showPassword.new ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                                type={showPassword.confirm ? "text" : "password"}
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#06202E]/10 focus:border-[#06202E] transition-all outline-none"
                                                placeholder="Confirm new password"
                                                required
                                                minLength={8}
                                        />
                                        <button
                                            type="button"
                                                onClick={() => toggleShow('confirm')}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                                {showPassword.confirm ? <FiEyeOff /> : <FiEye />}
                                        </button>
                                    </div>
                                </div>
                                </form>
                        </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end space-x-3">
                            <button
                                onClick={onClose}
                                    className="px-6 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                                    disabled={changePasswordMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                    onClick={handleSubmit}
                                    className="px-6 py-2.5 text-white bg-[#06202E] rounded-lg hover:bg-[#0a2e42] transition-colors font-medium text-sm flex items-center justify-center min-w-[140px]"
                                    disabled={changePasswordMutation.isPending}
                            >
                                    {changePasswordMutation.isPending ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    ) : null}
                                    Change Password
                            </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AccountSettingsModal; 
