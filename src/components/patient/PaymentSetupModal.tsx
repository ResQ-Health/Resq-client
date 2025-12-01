import React, { useState } from 'react';
import { FiX, FiCheck, FiInfo, FiCalendar } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import paystack from '/paystack.png';
import visa from '/visa.png';

interface PaymentSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PaymentSetupModal: React.FC<PaymentSetupModalProps> = ({ isOpen, onClose }) => {
    const [paymentMethod, setPaymentMethod] = useState('add-new-card');
    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        cvv: '',
        expiryDate: '',
        nameOnCard: ''
    });

    const handlePaymentMethodChange = (method: string) => {
        setPaymentMethod(method);
    };

    const handleInputChange = (field: keyof typeof cardDetails, value: string) => {
        setCardDetails(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddPaymentMethod = () => {
        // Add payment method logic here
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
                        className="fixed top-4 right-4 h-[calc(100vh-2rem)] w-full max-w-[590px] bg-white shadow-2xl z-50 rounded-lg"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Payment Setup</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6  space-y-6">
                            {/* Choose Payment Method */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-4">Choose your payment method</h3>
                                <div className="space-y-[32px]">
                                    {/* Paystack */}
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="paystack"
                                            checked={paymentMethod === 'paystack'}
                                            onChange={() => handlePaymentMethodChange('paystack')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full peer-checked:border-[#06202E] peer-checked:bg-[#06202E] flex items-center justify-center">
                                            {paymentMethod === 'paystack' && (
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">Paystack</div>
                                            <div className="text-[12px] text-gray-600">Description impsum Loremm impsum Loremmimp</div>
                                        </div>
                                        <div className=" justify-center">
                                            <img src={paystack} alt="paystack" className=" w-[75px]" />
                                        </div>
                                    </label>

                                    {/* Credit Card */}
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="credit-card"
                                            checked={paymentMethod === 'credit-card'}
                                            onChange={() => handlePaymentMethodChange('credit-card')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full peer-checked:border-[#06202E] peer-checked:bg-[#06202E] flex items-center justify-center">
                                            {paymentMethod === 'credit-card' && (
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">Credit Card</div>
                                            <div className="text-sm text-gray-600">Description impsum Loremm impsum Loremmimp</div>
                                        </div>
                                        <div className=" justify-center">
                                            <img src={visa} alt="paystack" className=" w-[83px]" />
                                        </div>
                                    </label>

                                    {/* Add New Card */}
                                    <label className="flex items-center  space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="add-new-card"
                                            checked={paymentMethod === 'add-new-card'}
                                            onChange={() => handlePaymentMethodChange('add-new-card')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full peer-checked:border-[#06202E] peer-checked:bg-[#06202E] flex items-center justify-center">
                                            {paymentMethod === 'add-new-card' && (
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">Add New Card</div>
                                            <div className="text-sm text-gray-600">Description impsum Loremm impsum Loremmimp</div>
                                        </div>
                                        <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
                                            <span className="text-xs font-medium text-gray-600">+</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Card Details Form */}
                            {paymentMethod === 'add-new-card' && (
                                <div className="space-y-4  ">
                                    <h3 className="font-semibold text-gray-900">Card Details</h3>

                                    {/* Credit Card Number */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Credit card number
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={cardDetails.cardNumber}
                                                onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                                                placeholder="1234 5678 9012 1314"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 focus:border-[#06202E]"
                                            />
                                            <FiCheck className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-600" />
                                        </div>
                                    </div>

                                    {/* CVV */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                            CVV
                                            <FiInfo className="ml-1 w-4 h-4 text-gray-400" />
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={cardDetails.cvv}
                                                onChange={(e) => handleInputChange('cvv', e.target.value)}
                                                placeholder="123"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 focus:border-[#06202E]"
                                            />
                                            <FiCalendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Expiry Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Expiry date
                                        </label>
                                        <input
                                            type="text"
                                            value={cardDetails.expiryDate}
                                            onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                                            placeholder="MM/YY"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 focus:border-[#06202E]"
                                        />
                                    </div>

                                    {/* Name on Card */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Name on card
                                        </label>
                                        <input
                                            type="text"
                                            value={cardDetails.nameOnCard}
                                            onChange={(e) => handleInputChange('nameOnCard', e.target.value)}
                                            placeholder="Joshua Nasiru"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 focus:border-[#06202E]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0  left-0 right-0 flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-white">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPaymentMethod}
                                className="px-4 py-2 text-white bg-[#06202E] rounded-lg hover:bg-[#06202E]/90 transition-colors"
                            >
                                Add payment method
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PaymentSetupModal; 