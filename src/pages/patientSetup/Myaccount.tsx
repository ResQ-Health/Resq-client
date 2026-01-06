import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import uploadIcon from '/icons/upload.png';
import favoriteIcon from '/icons/favorite.png';
import HospitalCard from '../../components/HospitalCard';
import { usePatientProfile, useUpdatePatientProfile, useUploadProfilePicture, PatientProfileRequest } from '../../services/userService';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

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
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
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
  const uploadProfilePictureMutation = useUploadProfilePicture();
  const queryClient = useQueryClient();
  
  // Track initial load to prevent toast on page refresh/navigation if already complete
  const isInitialLoad = useRef(true);

  // Calculate onboarding completion status and progress
  const calculateOnboardingProgress = () => {
    if (!profileData?.data) return { isComplete: false, progress: 0, basicComplete: false, additionalComplete: false };

    const data = profileData.data;
    const metadata = profileData.metadata;

    // Basic details completion check
    const basicDetailsComplete = !!(
      data.personal_details?.first_name &&
      data.personal_details?.last_name &&
      data.personal_details?.date_of_birth &&
      data.personal_details?.gender &&
      data.contact_details?.email_address &&
      data.contact_details?.phone_number
    );

    // Additional details completion check
    const additionalDetailsComplete = !!(
      data.location_details?.address &&
      data.location_details?.city &&
      data.location_details?.state &&
      metadata?.emergency_contact?.first_name &&
      metadata?.emergency_contact?.last_name &&
      metadata?.emergency_contact?.phone_number &&
      metadata?.emergency_contact?.relationship_to_you &&
      metadata?.next_of_kin?.first_name &&
      metadata?.next_of_kin?.last_name &&
      metadata?.next_of_kin?.phone_number &&
      metadata?.next_of_kin?.relationship_to_you
    );

    const isComplete = basicDetailsComplete && additionalDetailsComplete;
    const progress = basicDetailsComplete && additionalDetailsComplete ? 100 : basicDetailsComplete ? 50 : 0;

    return { isComplete, progress, basicComplete: basicDetailsComplete, additionalComplete: additionalDetailsComplete };
  };

  const onboardingStatus = calculateOnboardingProgress();

  // Check if user just logged in and redirect if onboarding is complete
  useEffect(() => {
    // Only check if profile data is loaded
    if (!profileData?.data || isLoading) return;

    // Check if user just logged in (flag set during Google login)
    const justLoggedIn = localStorage.getItem('justLoggedIn') === 'true';
    
    if (justLoggedIn && onboardingStatus.isComplete) {
      // User just logged in and onboarding is complete - redirect to booking history
      localStorage.removeItem('justLoggedIn'); // Clear the flag
      navigate('/booking-history', { replace: true });
    } else if (justLoggedIn) {
      // User just logged in but onboarding not complete - clear flag and stay on page
      localStorage.removeItem('justLoggedIn');
    }
    // If justLoggedIn is false, user navigated normally - don't redirect
  }, [profileData, isLoading, onboardingStatus.isComplete, navigate]);

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
      
      // Debug: Log the actual API response structure for verification
      if (import.meta.env.DEV) {
        console.log('[My Account] API Response Structure:', {
          personal_details: data.personal_details,
          contact_details: data.contact_details,
          location_details: data.location_details,
          metadata: metadata,
          email: data.email,
          phone_number: data.phone_number,
        });
      }
      
      // Ensure profile image from API displays when available
      if (data.profile_picture) {
        const url = typeof data.profile_picture === 'string' 
          ? data.profile_picture 
          : data.profile_picture.url;
        if (url) setProfileImage(url);
      }
      
      // Map API response to form fields
      // Use nested fields first, fall back to top-level fields if nested are empty
      // Handle null, undefined, and empty string values properly
      const getValue = (value: any, fallback: any = '') => {
        return value !== null && value !== undefined && value !== '' ? value : fallback;
      };

      // Format date to YYYY-MM-DD for date input (required format)
      const formatDateForInput = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        try {
          // If already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
          }
          // Try to parse and format the date
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch {
          return '';
        }
      };

      setForm({
        // Personal Details - from personal_details nested object
        firstName: getValue(data.personal_details?.first_name),
        lastName: getValue(data.personal_details?.last_name),
        dob: formatDateForInput(data.personal_details?.date_of_birth),
        gender: getValue(data.personal_details?.gender),

        // Contact Details - use nested contact_details first, fall back to top-level email/phone_number
        email: getValue(data.contact_details?.email_address) || getValue(data.email),
        phone: getValue(data.contact_details?.phone_number) || getValue(data.phone_number),

        // Location Details - from location_details nested object
        address: getValue(data.location_details?.address),
        city: getValue(data.location_details?.city),
        state: getValue(data.location_details?.state),

        // Emergency Contact - from metadata.emergency_contact
        emergencyFirstName: getValue(metadata?.emergency_contact?.first_name),
        emergencyLastName: getValue(metadata?.emergency_contact?.last_name),
        emergencyPhone: getValue(metadata?.emergency_contact?.phone_number),
        emergencyRelationship: getValue(metadata?.emergency_contact?.relationship_to_you),

        // Next of Kin - from metadata.next_of_kin
        nextOfKinFirstName: getValue(metadata?.next_of_kin?.first_name),
        nextOfKinLastName: getValue(metadata?.next_of_kin?.last_name),
        nextOfKinPhone: getValue(metadata?.next_of_kin?.phone_number),
        nextOfKinRelationship: getValue(metadata?.next_of_kin?.relationship_to_you),
        sameAsEmergency: metadata?.same_as_emergency_contact === true,
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

  // Show success message when onboarding is completed
  useEffect(() => {
    // Wait for data to be loaded
    if (!profileData?.data) return;

    // On initial data load, just set the flag state without showing toast
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      if (onboardingStatus.isComplete) {
        localStorage.setItem('onboarding_completed', 'true');
      }
      return;
    }

    if (onboardingStatus.isComplete) {
      // Only show toast if this is a NEW completion (transition from incomplete to complete)
      const wasComplete = localStorage.getItem('onboarding_completed');
      if (!wasComplete) {
        toast.success('🎉 Profile complete! You can now access all features.');
        localStorage.setItem('onboarding_completed', 'true');
      }
    } else {
      localStorage.removeItem('onboarding_completed');
    }
  }, [onboardingStatus.isComplete, profileData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setProfileImage(ev.target?.result as string);
    reader.readAsDataURL(file);

    uploadProfilePictureMutation.mutate(file);
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

    updateProfileMutation.mutate(profileData, {
      onSuccess: (responseData) => {
        // Update AuthContext with new user data
        if (responseData?.data && user) {
          const updatedUserData: Partial<typeof user> = {
            full_name: responseData.data.personal_details 
              ? `${responseData.data.personal_details.first_name || ''} ${responseData.data.personal_details.last_name || ''}`.trim()
              : user.full_name,
            phone_number: responseData.data.contact_details?.phone_number || user.phone_number,
            email: responseData.data.contact_details?.email_address || user.email,
            profile_picture: typeof responseData.data.profile_picture === 'string'
              ? { url: responseData.data.profile_picture }
              : responseData.data.profile_picture || user.profile_picture,
          };
          updateUser(updatedUserData);
        }
        
        // Invalidate and refetch profile data to update onboarding status
        queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
        
        // Check if onboarding is now complete
        const basicComplete = !!(
          form.firstName &&
          form.lastName &&
          form.dob &&
          form.gender &&
          form.email &&
          form.phone
        );
        
        const additionalComplete = !!(
          form.address &&
          form.city &&
          form.state &&
          form.emergencyFirstName &&
          form.emergencyLastName &&
          form.emergencyPhone &&
          form.emergencyRelationship &&
          form.nextOfKinFirstName &&
          form.nextOfKinLastName &&
          form.nextOfKinPhone &&
          form.nextOfKinRelationship
        );
        
        const isNowComplete = basicComplete && additionalComplete;
        
        // If on Basic details tab and basic details are now complete, navigate to Additional details
        if (activeTab === 0 && basicComplete && !isNowComplete) {
          // Wait a bit for the profile data to refresh, then switch to Additional details tab
          setTimeout(() => {
            setActiveTab(1);
          }, 500);
        }
        
        // If onboarding is now complete, redirect to booking history
        if (isNowComplete) {
          setTimeout(() => {
            toast.success('🎉 Profile complete! Redirecting to booking history...');
            navigate('/booking-history', { replace: true });
          }, 1000);
        }
      },
    });
  };

  // Handle tab switching - block if onboarding not complete
  const handleTabChange = (tabIndex: number) => {
    if (onboardingStatus.isComplete) {
      setActiveTab(tabIndex);
    } else {
      // If trying to switch to Additional details but Basic details not complete
      if (tabIndex === 1 && !onboardingStatus.basicComplete) {
        // Show a message or prevent switching
        return;
      }
      // Allow switching if basic details are complete
      if (tabIndex === 1 && onboardingStatus.basicComplete) {
        setActiveTab(tabIndex);
      }
      // Allow switching back to Basic details
      if (tabIndex === 0) {
        setActiveTab(tabIndex);
      }
    }
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
    return <LoadingSpinner />;
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

  // Always render; fall back to default avatar if image is absent

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Simple Progress Indicator */}
        {!onboardingStatus.isComplete && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Profile Completion</span>
              <span className="text-sm font-medium text-gray-900">{onboardingStatus.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-[#16202E] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${onboardingStatus.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => handleTabChange(0)}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 0
                ? 'bg-[#16202E] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              Basic details
              {onboardingStatus.basicComplete && (
                <IoCheckmarkDone className="w-4 h-4" />
              )}
            </span>
          </button>
          <button
            onClick={() => handleTabChange(1)}
            disabled={!onboardingStatus.basicComplete && !onboardingStatus.isComplete}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 1
                ? 'bg-[#16202E] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            } ${
              !onboardingStatus.basicComplete && !onboardingStatus.isComplete
                ? 'opacity-40 cursor-not-allowed'
                : ''
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              Additional details
              {onboardingStatus.additionalComplete && (
                <IoCheckmarkDone className="w-4 h-4" />
              )}
            </span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              {activeTab === 0 ? (
                // Basic Details Tab
                <div className="space-y-8">
                  {/* Profile Image Section */}
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <FaUser className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#16202E] rounded-full flex items-center justify-center hover:bg-[#1a2a3a] transition-colors"
                      >
                        <img src={uploadIcon} alt="Upload" className="w-3.5 h-3.5" />
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
                      <h3 className="text-base font-medium text-gray-900 mb-1">Profile photo</h3>
                      <p className="text-sm text-gray-500">Upload a profile photo</p>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div>
                    <h3 className="text-base font-medium text-gray-900 mb-4">Personal information</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                          <input
                            type="text"
                            name="firstName"
                            value={form.firstName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                          <input
                            type="text"
                            name="lastName"
                            value={form.lastName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            placeholder="Enter last name"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of birth</label>
                          <input
                            type="date"
                            name="dob"
                            value={form.dob}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                          <select
                            name="gender"
                            value={form.gender}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
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
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Contact information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed text-gray-600"
                          placeholder="Enter email address"
                          required
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                          placeholder="Enter phone number"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end pt-6 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="bg-[#16202E] text-white px-6 py-2.5 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-[#1a2a3a] transition-colors"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        'Save changes'
                      )}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                        <input
                          type="text"
                          name="address"
                          value={form.address}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                          placeholder="Enter address"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                          <input
                            type="text"
                            name="city"
                            value={form.city}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            placeholder="Enter city"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                          <input
                            type="text"
                            name="state"
                            value={form.state}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            placeholder="Enter state"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Emergency contact */}
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Emergency contact</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                          <input
                            type="text"
                            name="emergencyFirstName"
                            value={form.emergencyFirstName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                          <input
                            type="text"
                            name="emergencyLastName"
                            value={form.emergencyLastName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            placeholder="Enter last name"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                          <input
                            type="text"
                            name="emergencyPhone"
                            value={form.emergencyPhone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            placeholder="Enter phone number"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship to you</label>
                          <select
                            name="emergencyRelationship"
                            value={form.emergencyRelationship}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
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
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-base font-medium text-gray-900 mb-4">Next of kin</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                          <input
                            type="text"
                            name="nextOfKinFirstName"
                            value={form.nextOfKinFirstName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                          <input
                            type="text"
                            name="nextOfKinLastName"
                            value={form.nextOfKinLastName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            placeholder="Enter last name"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                          <input
                            type="text"
                            name="nextOfKinPhone"
                            value={form.nextOfKinPhone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                            placeholder="Enter phone number"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship to you</label>
                          <select
                            name="nextOfKinRelationship"
                            value={form.nextOfKinRelationship}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
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
                        <label className="inline-flex items-center text-sm text-gray-700">
                          <input
                            type="checkbox"
                            name="sameAsEmergency"
                            checked={form.sameAsEmergency}
                            onChange={handleInputChange}
                            className="mr-2 w-4 h-4 text-[#16202E] border-gray-300 rounded focus:ring-[#16202E]"
                          />
                          <span>Same as emergency contact?</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end pt-6 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="bg-[#16202E] text-white px-6 py-2.5 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-[#1a2a3a] transition-colors"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        'Save changes'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 