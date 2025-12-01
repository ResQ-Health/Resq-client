import React, { useRef, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import uploadIcon from '/icons/upload.png';

const TABS = [
    { label: 'Basic details' },
    { label: 'Additional details' },
];

export default function AccountDetailsPage() {
    const [activeTab, setActiveTab] = useState(0);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state (for demonstration)
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        dob: '',
        gender: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
    });

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setProfileImage(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    return (
        <div className="w-full min-h-screen">
            {/* Main Content */}
            <div className="max-w-6xl mx-auto bg-white rounded-lg px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab(0)}
                            className={`px-4 py-2 rounded-lg text-base font-medium transition-all duration-300 ${activeTab === 0
                                ? 'bg-[#16202E] text-white'
                                : 'bg-[#F4F6F8] text-[#16202E]'
                                }`}
                        >
                            Basic details
                        </button>
                        <button
                            onClick={() => setActiveTab(1)}
                            className={`px-4 py-2 rounded-lg text-base font-medium transition-all duration-300 ${activeTab === 1
                                ? 'bg-[#16202E] text-white'
                                : 'bg-[#F4F6F8] text-[#16202E]'
                                }`}
                        >
                            Additional details
                        </button>
                    </div>

                    {/* Tab Content Container */}
                    <div className="bg-white rounded-lg">
                        {activeTab === 0 ? (
                            // Basic Details Tab
                            <div className="space-y-8">
                                {/* Profile Image Section */}
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                            {profileImage ? (
                                                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <FaUser className="w-12 h-12 text-gray-400" />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#16202E] rounded-full flex items-center justify-center"
                                        >
                                            <img src={uploadIcon} alt="Upload" className="w-4 h-4" />
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium mb-2">Profile photo</h3>
                                        <p className="text-gray-600 text-sm">Upload a profile photo to personalize your account</p>
                                    </div>
                                </div>

                                {/* Personal Information */}
                                <div>
                                    <h3 className="text-lg mb-6">Personal information</h3>
                                    <div className="space-y-6">
                                        <div className="flex gap-6">
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">First name</label>
                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    value={form.firstName}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                    placeholder="Enter first name"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">Last name</label>
                                                <input
                                                    type="text"
                                                    name="lastName"
                                                    value={form.lastName}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                    placeholder="Enter last name"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-6">
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">Date of birth</label>
                                                <input
                                                    type="date"
                                                    name="dob"
                                                    value={form.dob}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">Gender</label>
                                                <select
                                                    name="gender"
                                                    value={form.gender}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px] bg-white appearance-none"
                                                >
                                                    <option value="">--Select--</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div>
                                    <h3 className="text-lg mb-6">Contact information</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-gray-600 text-sm mb-2">Email address</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={form.email}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                placeholder="Enter email address"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-600 text-sm mb-2">Phone number</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={form.phone}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                placeholder="Enter phone number"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Save button */}
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="bg-[#16202E] text-white px-6 py-2.5 rounded-[6px] text-sm font-medium"
                                    >
                                        Save to account
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Additional Details Tab
                            <div className="space-y-8">
                                {/* Address Information */}
                                <div>
                                    <h3 className="text-lg mb-6">Address information</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-gray-600 text-sm mb-2">Address</label>
                                            <input
                                                type="text"
                                                name="address"
                                                value={form.address}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                placeholder="Enter address"
                                            />
                                        </div>
                                        <div className="flex gap-6">
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">City</label>
                                                <input
                                                    type="text"
                                                    name="city"
                                                    value={form.city}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                    placeholder="Enter city"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">State</label>
                                                <input
                                                    type="text"
                                                    name="state"
                                                    value={form.state}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                    placeholder="Enter state"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency contact */}
                                <div>
                                    <h3 className="text-lg mb-6">Emergency contact</h3>
                                    <div className="space-y-6">
                                        <div className="flex gap-6">
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">First name</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                    placeholder="Enter first name"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">Last name</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                    placeholder="Enter last name"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-6">
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">Phone number</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                    placeholder="Enter phone number"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">Relationship to you</label>
                                                <select className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px] bg-white appearance-none">
                                                    <option value="">--Select--</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Next of kin */}
                                <div>
                                    <h3 className="text-lg mb-6">Next of kin</h3>
                                    <div className="space-y-6">
                                        <div className="flex gap-6">
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">First name</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                    placeholder="Enter first name"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">Last name</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                    placeholder="Enter last name"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-6">
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">Phone number</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                                                    placeholder="Enter phone number"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-gray-600 text-sm mb-2">Relationship to you</label>
                                                <select className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px] bg-white appearance-none">
                                                    <option value="">--Select--</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="inline-flex items-center text-sm text-gray-600">
                                                <span className="ml-2">Same as emergency contact?</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Save button */}
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="bg-[#16202E] text-white px-6 py-2.5 rounded-[6px] text-sm font-medium"
                                    >
                                        Save to account
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 