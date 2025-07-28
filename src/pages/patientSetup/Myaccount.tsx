import React, { useRef, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bookingHistoryState, setBookingHistoryState] = useState(bookingHistory);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [openStatusDropdownIndex, setOpenStatusDropdownIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState(favoriteHospitals);

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