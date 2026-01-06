import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiInfo, FiCalendar, FiCreditCard, FiTrash2, FiPlus } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import paystack from '/paystack.png';
import visa from '/visa.png';
import { toast } from 'react-hot-toast';
import { usePaymentMethods, useInitializePaymentMethod, useVerifyPaymentMethod } from '../../services/paymentService';

interface PaymentSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PaymentSetupModal: React.FC<PaymentSetupModalProps> = ({ isOpen, onClose }) => {
    const [view, setView] = useState<'list' | 'add'>('list');
    const [paymentProvider, setPaymentProvider] = useState<'paystack'>('paystack');
    
    // API Hooks
    const { data: methodsData, isLoading: isLoadingMethods } = usePaymentMethods();
    const initializeMutation = useInitializePaymentMethod();
    const verifyMutation = useVerifyPaymentMethod();

    // Check for transaction reference on mount (if redirected back)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const reference = urlParams.get('reference'); // Paystack standard
        const trxref = urlParams.get('trxref'); // Paystack legacy

        if ((reference || trxref) && isOpen) {
            verifyMutation.mutate({ reference: (reference || trxref)! }, {
                onSuccess: () => {
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            });
        }
    }, [isOpen]);

    const handleAddCard = () => {
        initializeMutation.mutate({ payment_provider: paymentProvider }, {
            onSuccess: (response) => {
                if (response.data?.authorization_url) {
                    // Redirect to Paystack
                    window.location.href = response.data.authorization_url;
                }
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
                        className="fixed top-0 right-0 h-full w-full max-w-[590px] bg-white shadow-2xl z-50 overflow-y-auto"
                    >
                        <div className="flex flex-col h-full">
                        {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-[#06202E]">Payment Methods</h2>
                                    <p className="text-sm text-gray-500 mt-1">Manage your saved cards</p>
                                </div>
                            <button
                                onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                    <FiX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                            <div className="flex-1 p-6 space-y-8">
                                {view === 'list' && (
                                    <>
                                        {/* Saved Cards List */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-[#06202E] text-sm uppercase tracking-wide">Saved Cards</h3>
                                            
                                            {isLoadingMethods ? (
                                                <div className="flex justify-center py-8">
                                                    <div className="w-6 h-6 border-2 border-[#06202E] border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            ) : methodsData?.data?.length === 0 ? (
                                                <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                                    <FiCreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                    <p className="text-gray-500 text-sm">No saved cards yet</p>
                                                </div>
                                            ) : (
                                                methodsData?.data?.map((card) => (
                                                    <div key={card.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                                {card.brand.toLowerCase() === 'visa' ? (
                                                                    <img src={visa} alt="Visa" className="h-4 object-contain" />
                                                                ) : (
                                                                    <FiCreditCard className="w-5 h-5 text-gray-500" />
                                            )}
                                        </div>
                                                            <div>
                                                                <div className="font-medium text-[#06202E] capitalize">
                                                                    {card.brand} •••• {card.last4}
                                        </div>
                                                                <div className="text-xs text-gray-500">
                                                                    Expires {card.expiry_month}/{card.expiry_year}
                                        </div>
                                        </div>
                                        </div>
                                                        {/* Optional: Add delete/remove button if API supports it */}
                                        </div>
                                                ))
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setView('add')}
                                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#06202E] hover:text-[#06202E] transition-colors flex items-center justify-center gap-2 font-medium"
                                        >
                                            <FiPlus /> Add New Card
                                        </button>
                                    </>
                                )}

                                {view === 'add' && (
                                    <div className="space-y-6">
                                        <button 
                                            onClick={() => setView('list')}
                                            className="text-sm text-gray-500 hover:text-[#06202E] flex items-center gap-1"
                                        >
                                            ← Back to saved cards
                                        </button>

                                        <h3 className="font-semibold text-[#06202E]">Select Provider</h3>

                                        {/* Paystack Option */}
                                        <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentProvider === 'paystack' ? 'border-[#06202E] bg-blue-50/20' : 'border-gray-100 hover:border-gray-200'}`}>
                                            <div className="flex items-center gap-4">
                                            <input
                                                    type="radio"
                                                    name="provider"
                                                    value="paystack"
                                                    checked={paymentProvider === 'paystack'}
                                                    onChange={() => setPaymentProvider('paystack')}
                                                    className="w-5 h-5 text-[#06202E] border-gray-300 focus:ring-[#06202E]"
                                                />
                                                <div>
                                                    <div className="font-medium text-[#06202E]">Paystack</div>
                                                    <div className="text-sm text-gray-500">Secure checkout</div>
                                        </div>
                                    </div>
                                            <img src={paystack} alt="Paystack" className="h-6 object-contain" />
                                        </label>

                                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                                            You will be redirected to the secure payment gateway to verify your card details. No charge will be applied.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                            {view === 'add' && (
                                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end space-x-3">
                            <button
                                        onClick={() => setView('list')}
                                        className="px-6 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                        onClick={handleAddCard}
                                        disabled={initializeMutation.isPending}
                                        className="px-6 py-2.5 text-white bg-[#06202E] rounded-lg hover:bg-[#0a2e42] transition-colors font-medium text-sm flex items-center justify-center min-w-[140px]"
                            >
                                        {initializeMutation.isPending ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        ) : null}
                                        Proceed to Pay
                            </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PaymentSetupModal; 
