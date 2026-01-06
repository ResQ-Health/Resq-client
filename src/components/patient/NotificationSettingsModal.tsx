import React, { useState, useEffect } from 'react';
import { FiMail, FiX, FiAlertCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { usePatientProfile, useUpdatePatientProfile } from '../../services/userService';
import { toast } from 'react-hot-toast';

interface NotificationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ isOpen, onClose }) => {
    const { data: profileData } = usePatientProfile();
    const updateProfileMutation = useUpdatePatientProfile();

    const [notifications, setNotifications] = useState({
        email: true
    });

    const [showWarning, setShowWarning] = useState(false);

    // Load initial settings from metadata if available
    useEffect(() => {
        if (profileData?.metadata?.notification_settings) {
            // @ts-ignore - Assuming dynamic metadata structure
            const settings = profileData.metadata.notification_settings;
            setNotifications({
                email: settings.email ?? true
            });
        }
    }, [profileData]);

    const handleToggle = () => {
        // If currently enabled and trying to disable, show warning
        if (notifications.email) {
            setShowWarning(true);
        } else {
            // If currently disabled, just enable it
            setNotifications(prev => ({
                ...prev,
                email: !prev.email
            }));
        }
    };

    const handleConfirmDisable = () => {
        setNotifications(prev => ({
            ...prev,
            email: false
        }));
        setShowWarning(false);
    };

    const handleCancelDisable = () => {
        setShowWarning(false);
    };

    const handleSave = () => {
        if (!profileData?.data) return;

        // Construct the update payload
        // We preserve existing data and only update metadata
        const payload = {
            personal_details: profileData.data.personal_details,
            contact_details: profileData.data.contact_details,
            location_details: profileData.data.location_details,
            metadata: {
                ...profileData.metadata,
                notification_settings: notifications
            }
        };

        updateProfileMutation.mutate(payload as any, {
            onSuccess: () => {
                toast.success('Notification preferences updated');
                onClose();
            },
            onError: () => {
                toast.error('Failed to update preferences');
            }
        });
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
                        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
                    >
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-[#06202E]">Notification Settings</h2>
                                    <p className="text-sm text-gray-500 mt-1">Manage how you receive updates</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <FiX className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-6 space-y-6">
                                {/* Email Notifications */}
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between group">
                                        <div className="flex space-x-4">
                                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <FiMail className="w-5 h-5 text-[#06202E]" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-[#06202E]">Email Notifications</h3>
                                                <p className="text-sm text-gray-500 mt-1">Get booking confirmations and updates sent directly to your email.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                                            <input
                                                type="checkbox"
                                                checked={notifications.email}
                                                onChange={handleToggle}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06202E]"></div>
                                        </label>
                                    </div>

                                    {/* Warning Message */}
                                    <AnimatePresence>
                                        {showWarning && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4 overflow-hidden"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                                                        <FiAlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-semibold text-[#06202E] mb-2">
                                                            Disabling Email Notifications
                                                        </h4>
                                                        <p className="text-xs text-gray-600 mb-3">
                                                            If you disable email notifications, you will not receive:
                                                        </p>
                                                        <ul className="text-xs text-gray-600 space-y-1.5 mb-4 list-disc list-inside">
                                                            <li>Booking confirmations</li>
                                                            <li>Appointment reminders</li>
                                                            <li>Important updates about your appointments</li>
                                                            <li>Account security alerts</li>
                                                        </ul>
                                                        <p className="text-xs text-gray-600 mb-4">
                                                            You may miss critical information about your appointments.
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={handleCancelDisable}
                                                                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                            >
                                                                Keep Enabled
                                                            </button>
                                                            <button
                                                                onClick={handleConfirmDisable}
                                                                className="px-3 py-1.5 text-xs font-medium text-white bg-[#06202E] rounded-lg hover:bg-[#0a2e42] transition-colors"
                                                            >
                                                                Disable Anyway
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end space-x-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                                    disabled={updateProfileMutation.isPending}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2.5 text-white bg-[#06202E] rounded-lg hover:bg-[#0a2e42] transition-colors font-medium text-sm flex items-center justify-center min-w-[80px]"
                                    disabled={updateProfileMutation.isPending}
                                >
                                    {updateProfileMutation.isPending ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationSettingsModal;
