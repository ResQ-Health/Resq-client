import React, { useRef, useState, useEffect } from 'react';
import { MdKeyboardArrowDown, MdOutlineSearch, MdFilterList } from 'react-icons/md';
import { FaUser, FaRegCalendarAlt, FaRegHeart, FaRegClock, FaStar } from 'react-icons/fa';
import { FiSettings, FiFilter, FiEye } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoCheckmarkDone } from 'react-icons/io5';
import { TiPlusOutline } from 'react-icons/ti';
import { SlHome } from 'react-icons/sl';
import { GoPlusCircle } from 'react-icons/go';
import { RiDeleteBinLine } from 'react-icons/ri';
import { LiaTimesCircle } from 'react-icons/lia';
import uploadIcon from '../../../public/icons/upload.png';
import favoriteIcon from '../../../public/icons/favorite.png';
import HospitalCard from '../../components/HospitalCard';
import { usePatientProfile, useUpdatePatientProfile, PatientProfileRequest } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';

const TABS = [
  { label: 'Basic details' },
  { label: 'Additional details' },
];

// Sample booking history data
const bookingHistory = [
  {
    serviceType: "General Check-up",
    hospital: "Cottage Medicare Hospital",
    address: "18 Iwaya Rd, Yaba 101245, Lagos",
    date: "06 Feb, 2025",
    time: "1:00 PM",
    phone: "09172524106",
    rating: 5,
    status: "Completed"
  },
  {
    serviceType: "Screening Mammography",
    hospital: "Blue Cross Hospital",
    address: "48, Ijaiye road, Ogba, (Beside WAEC Office)",
    date: "16 Feb, 2025",
    time: "12:00 PM",
    phone: "09024221066",
    rating: 5,
    status: "Completed"
  },
  {
    serviceType: "Extremity X-Ray",
    hospital: "First City Hospital",
    address: "1B, Williams Street, Off Diya Street",
    date: "02 Mar, 2025",
    time: "12:00 PM",
    phone: "09193058014",
    rating: 5,
    status: "Completed"
  },
  {
    serviceType: "Specialist Consultation",
    hospital: "First Dominican Hospital",
    address: "27, Aljahi Masha Road, By Masha B/Stop",
    date: "20 Mar, 2025",
    time: "12:00 PM",
    phone: "08013536834",
    rating: 5,
    status: "Cancelled"
  },
  {
    serviceType: "Echocardiogram",
    hospital: "First City Hospital",
    address: "1B, Williams Street, Off Diya Street",
    date: "25 Mar, 2025",
    time: "12:00 PM",
    phone: "08139768591",
    rating: 5,
    status: "Cancelled"
  },
  {
    serviceType: "CT Scan",
    hospital: "Cottage Medicare Hospital",
    address: "18 Iwaya Rd, Yaba 101245, Lagos",
    date: "25 Mar, 2025",
    time: "12:00 PM",
    phone: "09011904045",
    rating: 4,
    status: "Upcoming"
  },
  {
    serviceType: "Ultrasound",
    hospital: "First Dominican Hospital",
    address: "27, Aljahi Masha Road, By Masha B/Stop",
    date: "01 Apr, 2025",
    time: "12:00 PM",
    phone: "09112218152",
    rating: 5,
    status: "Upcoming"
  }
];

// Sample favorites data
const favoriteHospitals = [
  {
    name: "Cottage Medicare Hospital",
    address: "18 Iwaya Rd, Yaba 101245, Lagos",
    rating: 5.0,
    reviews: 60,
    image: "/hospital-image.jpg"
  },
  {
    name: "Blue Cross Hospital",
    address: "48, Ijaiye Rd, Ogba, (Beside UBA, Ikeja",
    rating: 5.0,
    reviews: 60,
    image: "/hospital-image.jpg"
  },
  {
    name: "Cottage Medicare Hospital",
    address: "18 Iwaya Rd, Yaba 101245, Lagos",
    rating: 5.0,
    reviews: 60,
    image: "/hospital-image.jpg"
  },
  {
    name: "Blue Cross Hospital",
    address: "48, Ijaiye Rd, Ogba, (Beside UBA, Ikeja",
    rating: 5.0,
    reviews: 60,
    image: "/hospital-image.jpg"
  },
  {
    name: "Cottage Medicare Hospital",
    address: "18 Iwaya Rd, Yaba 101245, Lagos",
    rating: 5.0,
    reviews: 60,
    image: "/hospital-image.jpg"
  },
  {
    name: "Cottage Medicare Hospital",
    address: "18 Iwaya Rd, Yaba 101245, Lagos",
    rating: 5.0,
    reviews: 60,
    image: "/hospital-image.jpg"
  }
];

export default function Myaccount() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bookingHistoryState, setBookingHistoryState] = useState(bookingHistory);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [openStatusDropdownIndex, setOpenStatusDropdownIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState(favoriteHospitals);

  // React Query hooks
  const { data: profileData, isLoading, error } = usePatientProfile();
  const updateProfileMutation = useUpdatePatientProfile();

  // Form state
  const [form, setForm] = useState({
    // Personal Details
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',

    // Contact Details
    email: '',
    phone: '',

    // Location Details
    address: '',
    city: '',
    state: '',

    // Emergency Contact
    emergencyFirstName: '',
    emergencyLastName: '',
    emergencyPhone: '',
    emergencyRelationship: '',

    // Next of Kin
    nextOfKinFirstName: '',
    nextOfKinLastName: '',
    nextOfKinPhone: '',
    nextOfKinRelationship: '',
    sameAsEmergency: false,
  });

  // Load data from API when available
  useEffect(() => {
    if (profileData?.data) {
      const data = profileData.data;
      const metadata = profileData.metadata;
      setForm({
        // Personal Details
        firstName: data.personal_details?.first_name || '',
        lastName: data.personal_details?.last_name || '',
        dob: data.personal_details?.date_of_birth || '',
        gender: data.personal_details?.gender || '',

        // Contact Details
        email: data.contact_details?.email_address || '',
        phone: data.contact_details?.phone_number || '',

        // Location Details
        address: data.location_details?.address || '',
        city: data.location_details?.city || '',
        state: data.location_details?.state || '',

        // Emergency Contact
        emergencyFirstName: metadata?.emergency_contact?.first_name || '',
        emergencyLastName: metadata?.emergency_contact?.last_name || '',
        emergencyPhone: metadata?.emergency_contact?.phone_number || '',
        emergencyRelationship: metadata?.emergency_contact?.relationship_to_you || '',

        // Next of Kin
        nextOfKinFirstName: metadata?.next_of_kin?.first_name || '',
        nextOfKinLastName: metadata?.next_of_kin?.last_name || '',
        nextOfKinPhone: metadata?.next_of_kin?.phone_number || '',
        nextOfKinRelationship: metadata?.next_of_kin?.relationship_to_you || '',
        sameAsEmergency: metadata?.same_as_emergency_contact || false,
      });
    }
  }, [profileData]);

  // Handle same as emergency contact checkbox
  useEffect(() => {
    if (form.sameAsEmergency) {
      setForm(prev => ({
        ...prev,
        nextOfKinFirstName: prev.emergencyFirstName,
        nextOfKinLastName: prev.emergencyLastName,
        nextOfKinPhone: prev.emergencyPhone,
        nextOfKinRelationship: prev.emergencyRelationship,
      }));
    }
  }, [form.sameAsEmergency, form.emergencyFirstName, form.emergencyLastName, form.emergencyPhone, form.emergencyRelationship]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setProfileImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const profileData: PatientProfileRequest = {
      personal_details: {
        first_name: form.firstName,
        last_name: form.lastName,
        date_of_birth: form.dob,
        gender: form.gender,
      },
      contact_details: {
        email_address: form.email,
        phone_number: form.phone,
      },
      location_details: {
        address: form.address,
        city: form.city,
        state: form.state,
      },
      metadata: {
        emergency_contact: {
          first_name: form.emergencyFirstName,
          last_name: form.emergencyLastName,
          phone_number: form.emergencyPhone,
          relationship_to_you: form.emergencyRelationship,
        },
        next_of_kin: {
          first_name: form.nextOfKinFirstName,
          last_name: form.nextOfKinLastName,
          phone_number: form.nextOfKinPhone,
          relationship_to_you: form.nextOfKinRelationship,
        },
        same_as_emergency_contact: form.sameAsEmergency,
      },
    };

    updateProfileMutation.mutate(profileData);
  };

  const handleRatingChange = (index: number, newRating: number) => {
    const updatedBookings = [...bookingHistoryState];
    updatedBookings[index] = {
      ...updatedBookings[index],
      rating: newRating
    };
    setBookingHistoryState(updatedBookings);
  };

  const handleStatusChange = (index: number) => {
    const updatedBookings = [...bookingHistoryState];
    const currentStatus = updatedBookings[index].status;

    // Cycle through statuses: Completed -> Upcoming -> Cancelled -> Completed
    const nextStatus = {
      'Completed': 'Upcoming',
      'Upcoming': 'Cancelled',
      'Cancelled': 'Completed'
    }[currentStatus] || 'Completed';

    updatedBookings[index] = {
      ...updatedBookings[index],
      status: nextStatus
    };
    setBookingHistoryState(updatedBookings);
  };

  const toggleDropdown = (index: number) => {
    setOpenDropdownIndex(openDropdownIndex === index ? null : index);
    // Close status dropdown if open
    if (openStatusDropdownIndex !== null) {
      setOpenStatusDropdownIndex(null);
    }
  };

  const toggleStatusDropdown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    setOpenStatusDropdownIndex(openStatusDropdownIndex === index ? null : index);
    // Close action dropdown if open
    if (openDropdownIndex !== null) {
      setOpenDropdownIndex(null);
    }
  };

  const handleStatusSelect = (index: number, status: string) => {
    const updated = [...bookingHistoryState];
    updated[index].status = status;
    setBookingHistoryState(updated);
    setOpenStatusDropdownIndex(null);
  };

  const handleRemoveFavorite = (index: number) => {
    const updatedFavorites = favorites.filter((_, i) => i !== index);
    setFavorites(updatedFavorites);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Error Content */}
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Unable to Load Profile</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              We encountered an issue while loading your profile information. This might be due to a temporary network issue or server problem.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-[#16202E] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#1a2a3a] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Go Back
              </button>
            </div>

            {/* Support Info */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                If the problem persists, please contact our support team
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safety check for data structure
  if (!profileData?.data || !profileData?.metadata) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
            {/* Warning Icon */}
            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Warning Content */}
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Profile Data Unavailable</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              We couldn't retrieve your profile information. This could be due to a connection issue or incomplete data.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-[#16202E] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#1a2a3a] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:ring-offset-2"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                Return to Previous Page
              </button>
            </div>

            {/* Support Info */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Check your internet connection and try again
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto bg-white rounded-lg px-6">
        {/* My Account Content */}
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
          <div className={`bg-white rounded-lg transition-all duration-300 ${updateProfileMutation.isPending ? 'bg-green-50' : ''}`}>
            <form onSubmit={handleSubmit}>
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
                        type="button"
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
                            required
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
                            required
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
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-gray-600 text-sm mb-2">Gender</label>
                          <select
                            name="gender"
                            value={form.gender}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px] bg-white appearance-none"
                            required
                          >
                            <option value="">--Select--</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
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
                          required
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
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end items-center">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="bg-[#16202E] text-white px-6 py-2.5 rounded-[6px] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        'Save to account'
                      )}
                    </button>
                    {updateProfileMutation.isPending && (
                      <div className="ml-3 flex items-center text-sm text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        Updating...
                      </div>
                    )}
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
                          required
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
                            required
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
                            required
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
                            name="emergencyFirstName"
                            value={form.emergencyFirstName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-gray-600 text-sm mb-2">Last name</label>
                          <input
                            type="text"
                            name="emergencyLastName"
                            value={form.emergencyLastName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                            placeholder="Enter last name"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="flex-1">
                          <label className="block text-gray-600 text-sm mb-2">Phone number</label>
                          <input
                            type="text"
                            name="emergencyPhone"
                            value={form.emergencyPhone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                            placeholder="Enter phone number"
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-gray-600 text-sm mb-2">Relationship to you</label>
                          <select
                            name="emergencyRelationship"
                            value={form.emergencyRelationship}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px] bg-white appearance-none"
                            required
                          >
                            <option value="">--Select--</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Child">Child</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Friend">Friend</option>
                            <option value="Other">Other</option>
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
                            name="nextOfKinFirstName"
                            value={form.nextOfKinFirstName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-gray-600 text-sm mb-2">Last name</label>
                          <input
                            type="text"
                            name="nextOfKinLastName"
                            value={form.nextOfKinLastName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                            placeholder="Enter last name"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="flex-1">
                          <label className="block text-gray-600 text-sm mb-2">Phone number</label>
                          <input
                            type="text"
                            name="nextOfKinPhone"
                            value={form.nextOfKinPhone}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px]"
                            placeholder="Enter phone number"
                            required
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-gray-600 text-sm mb-2">Relationship to you</label>
                          <select
                            name="nextOfKinRelationship"
                            value={form.nextOfKinRelationship}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px] bg-white appearance-none"
                            required
                          >
                            <option value="">--Select--</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Parent">Parent</option>
                            <option value="Child">Child</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Friend">Friend</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="inline-flex items-center text-sm text-gray-600">
                          <input
                            type="checkbox"
                            name="sameAsEmergency"
                            checked={form.sameAsEmergency}
                            onChange={handleInputChange}
                            className="mr-2"
                          />
                          <span>Same as emergency contact?</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end items-center">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="bg-[#16202E] text-white px-6 py-2.5 rounded-[6px] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        'Save to account'
                      )}
                    </button>
                    {updateProfileMutation.isPending && (
                      <div className="ml-3 flex items-center text-sm text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        Updating...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 