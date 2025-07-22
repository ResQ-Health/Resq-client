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

const NAV_ITEMS = [
  { label: 'My account', icon: <FaUser className="w-5 h-5" /> },
  { label: 'Booking history', icon: <FaRegCalendarAlt className="w-5 h-5" /> },
  { label: 'My favourites', icon: <FaRegHeart className="w-5 h-5" /> },
  { label: 'Settings', icon: <FiSettings className="w-5 h-5" /> },
];

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
  const [activeNav, setActiveNav] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
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

  React.useEffect(() => {
    // Calculate underline position and width
    const el = navRefs.current[activeNav];
    if (el) {
      setUnderlineStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [activeNav]);

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
      {/* Top navigation bar with border-y */}
      <div className="w-full flex items-center justify-center border-y-2 border-gray-200 py-4 mb-12 relative">
        <div className="flex gap-12 relative">
          {NAV_ITEMS.map((item, idx) => (
            <div
              key={item.label}
              ref={el => { navRefs.current[idx] = el; }}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => setActiveNav(idx)}
            >
              <span className={`flex items-center gap-2 ${activeNav === idx ? 'text-[#16202E] font-semibold' : 'text-gray-400 font-normal'}`}>
                {item.icon}{item.label}
              </span>
            </div>
          ))}
          {/* Underline for active item */}
          <div
            className="bg-[#16202E] h-1 rounded absolute -bottom-4 transition-all duration-300"
            style={{ left: underlineStyle.left, width: underlineStyle.width }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto bg-white rounded-lg px-6">
        {activeNav === 0 ? (
          // My Account Content
          <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab(0)}
                className={`px-4 py-2 rounded-lg text-base font-medium transition-all duration-300 ${
                  activeTab === 0
                    ? 'bg-[#16202E] text-white'
                    : 'bg-[#F4F6F8] text-[#16202E]'
                }`}
              >
                Basic details
              </button>
              <button
                onClick={() => setActiveTab(1)}
                className={`px-4 py-2 rounded-lg text-base font-medium transition-all duration-300 ${
                  activeTab === 1
                    ? 'bg-[#16202E] text-white'
                    : 'bg-[#F4F6F8] text-[#16202E]'
                }`}
              >
                Additional details
              </button>
            </div>

            {/* Tab Content Container */}
            <div className="relative min-h-[600px]">
              {/* Basic Details Tab */}
              <div 
                className={`absolute w-full transition-all duration-300 ${
                  activeTab === 0 
                    ? 'opacity-100 translate-x-0' 
                    : 'opacity-0 -translate-x-full pointer-events-none'
                }`}
              >
                {/* Profile Picture Section */}
                <div className="flex gap-16 mb-8">
                  {/* Left side - Profile Image */}
                  <div className="flex-shrink-0">
                    <div className="w-[100px] h-[100px] rounded-full bg-[#F4F6F8] overflow-hidden">
                      {profileImage ? (
                        <img 
                          src={profileImage} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full" />
                      )}
                    </div>
                  </div>

                  {/* Right side - Text and Buttons */}
                  <div>
                    <h2 className="text-[#16202E] text-base font-medium">Profile picture</h2>
                    <p className="text-sm text-gray-600 mb-4">Select a 200 x 200 px image, up to 10 MB in size</p>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#F4F6F8] rounded-[6px] text-sm font-medium text-[#16202E]"
                      >
                        <img src={uploadIcon} alt="Upload" className="w-4 h-4" />
                        Upload
                      </button>
                      <button
                        onClick={() => setProfileImage(null)}
                        className="px-4 py-2 border border-gray-300 rounded-[6px] text-sm font-medium text-[#16202E] hover:bg-gray-50"
                      >
                        Remove
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Basic Details Form */}
                <form className="space-y-8">
                  {/* Personal details */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Personal details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 mb-1">First name</label>
                        <input 
                          name="firstName" 
                          value={form.firstName} 
                          onChange={handleInputChange} 
                          placeholder="Enter your first name"
                          className="w-full border border-gray-300 rounded px-4 py-2" 
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1">Last name</label>
                        <input 
                          name="lastName" 
                          value={form.lastName} 
                          onChange={handleInputChange} 
                          placeholder="Enter your last name"
                          className="w-full border border-gray-300 rounded px-4 py-2" 
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1">Date of birth</label>
                        <input 
                          name="dob" 
                          value={form.dob} 
                          onChange={handleInputChange} 
                          placeholder="DD/MM/YYYY" 
                          className="w-full border border-gray-300 rounded px-4 py-2" 
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1">Gender</label>
                        <select 
                          name="gender" 
                          value={form.gender} 
                          onChange={handleInputChange} 
                          className="w-full border border-gray-300 rounded px-4 py-2"
                        >
                          <option value="">Select your gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  {/* Contact details */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Contact details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 mb-1">Email address</label>
                        <input 
                          name="email" 
                          value={form.email} 
                          onChange={handleInputChange} 
                          placeholder="Enter your email address"
                          className="w-full border border-gray-300 rounded px-4 py-2" 
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1">Phone number</label>
                        <input 
                          name="phone" 
                          value={form.phone} 
                          onChange={handleInputChange} 
                          placeholder="Enter your phone number"
                          className="w-full border border-gray-300 rounded px-4 py-2" 
                        />
                      </div>
                    </div>
                  </div>
                  {/* Location details */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Location details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 mb-1">Address</label>
                        <input 
                          name="address" 
                          value={form.address} 
                          onChange={handleInputChange} 
                          placeholder="Street name, apt, suite, floor..." 
                          className="w-full border border-gray-300 rounded px-4 py-2" 
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1">City</label>
                        <input 
                          name="city" 
                          value={form.city} 
                          onChange={handleInputChange} 
                          placeholder="Enter your city"
                          className="w-full border border-gray-300 rounded px-4 py-2" 
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1">State</label>
                        <select 
                          name="state" 
                          value={form.state} 
                          onChange={handleInputChange} 
                          className="w-full border border-gray-300 rounded px-4 py-2"
                        >
                          <option value="">Select your state</option>
                          <option value="lagos">Lagos</option>
                          <option value="abuja">Abuja</option>
                          <option value="kano">Kano</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </form>
                <div className="flex items-end">
                  <div className="w-[299px]"></div>
                  <button 
                    type="submit" 
                    className="bg-[#16202E] text-white px-6 py-2.5 rounded-[6px] text-sm font-medium"
                  >
                    Save to account
                  </button>
                </div>
              </div>

              {/* Additional Details Tab */}
              <div 
                className={`absolute w-full transition-all duration-300 ${
                  activeTab === 1 
                    ? 'opacity-100 translate-x-0' 
                    : 'opacity-0 translate-x-full pointer-events-none'
                }`}
              >
                {/* Emergency contact */}
                <div className="mb-12">
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
                        <select 
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px] bg-white appearance-none"
                        >
                          <option value="">--Select--</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next of kin */}
                <div className="mb-12">
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
                        <select 
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-[4px] bg-white appearance-none"
                        >
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
            </div>
          </div>
        ) : activeNav === 1 ? (
          // Booking History Content
          <div className="py-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-semibold mb-2">Booking history</h1>
                <p className="text-gray-600">Check and filter all your medical appointments here</p>
              </div>
              <button className="flex items-center gap-2 bg-[#16202E] text-white px-4 py-2 rounded-lg">
                <GoPlusCircle className="w-5 h-5" />
                New appointment
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-4 mb-8">
              <button className="flex items-center gap-2 bg-[#16202E] text-white px-4 py-2 rounded-lg">
                <TiPlusOutline className="w-4 h-4" />
                All Visits
                <span className="ml-2 bg-white text-[#16202E] px-2 rounded-full">7</span>
              </button>
              <button className="flex items-center gap-2 bg-[#F4F6F8] text-[#16202E] px-4 py-2 rounded-lg">
                <IoCheckmarkDone className="w-4 h-4" />
                Completed Visits
                <span className="ml-2 bg-white px-2 rounded-full">3</span>
              </button>
              <button className="flex items-center gap-2 bg-[#F4F6F8] text-[#16202E] px-4 py-2 rounded-lg">
                <FaRegClock className="w-4 h-4" />
                Upcoming Visits
                <span className="ml-2 bg-white px-2 rounded-full">2</span>
              </button>
              <button className="flex items-center gap-2 bg-[#F4F6F8] text-[#16202E] px-4 py-2 rounded-lg">
                <SlHome className="w-4 h-4" />
                Cancelled Visits
                <span className="ml-2 bg-white px-2 rounded-full">2</span>
              </button>
            </div>

            {/* Table Header */}
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-lg font-medium">All Visits</h2>
              <div className="flex gap-6">
                <button className="flex items-center gap-2 text-gray-600">
                  <MdOutlineSearch className="w-5 h-5" />
                  Search
                </button>
                <button className="flex items-center gap-2 text-gray-600">
                  <MdFilterList className="w-5 h-5" />
                  Filter
                </button>
                <button className="flex items-center gap-2 text-gray-600">
                  <FiFilter className="w-5 h-5" />
                  Sort
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 text-gray-600">Service type</th>
                    <th className="text-left p-4 text-gray-600">Address</th>
                    <th className="text-left p-4 text-gray-600">Date and Time</th>
                    <th className="text-left p-4 text-gray-600">Phone number</th>
                    <th className="text-left p-4 text-gray-600">Rating</th>
                    <th className="text-left p-4 text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {bookingHistoryState.map((booking, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-4">
                        <div className="font-medium">{booking.serviceType}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{booking.hospital}</div>
                        <div className="text-gray-600 text-sm">{booking.address}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{booking.date}</div>
                        <div className="text-gray-600">{booking.time}</div>
                      </td>
                      <td className="p-4">{booking.phone}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRatingChange(index, star)}
                              className="focus:outline-none"
                            >
                              <FaStar 
                                className={`w-4 h-4 ${
                                  star <= booking.rating 
                                    ? 'text-yellow-400' 
                                    : 'text-gray-300'
                                }`} 
                              />
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 relative">
                          <span
                            onClick={(e) => toggleStatusDropdown(index, e)}
                            className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                              booking.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {booking.status}
                          </span>
                          {openStatusDropdownIndex === index && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-20 min-w-[160px]">
                              <button
                                onClick={() => handleStatusSelect(index, 'Completed')}
                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-green-800"
                              >
                                <IoCheckmarkDone className="w-4 h-4" />
                                Completed
                              </button>
                              <button
                                onClick={() => handleStatusSelect(index, 'Upcoming')}
                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-blue-800"
                              >
                                <FaRegClock className="w-4 h-4" />
                                Upcoming
                              </button>
                              <button
                                onClick={() => handleStatusSelect(index, 'Cancelled')}
                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-red-800"
                              >
                                <LiaTimesCircle className="w-4 h-4" />
                                Cancelled
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => toggleDropdown(index)}
                            className="relative z-10"
                          >
                            <BsThreeDotsVertical className="w-4 h-4 text-gray-400" />
                          </button>
                          {openDropdownIndex === index && (
                            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-20 min-w-[160px]">
                              <button
                                onClick={() => {
                                  // Handle view details
                                  setOpenDropdownIndex(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-gray-700"
                              >
                                <FiEye className="w-5 h-5" />
                                View details
                              </button>
                              <button
                                onClick={() => {
                                  // Handle remove
                                  setOpenDropdownIndex(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-[#FF4D4D]"
                              >
                                <RiDeleteBinLine className="w-5 h-5" />
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeNav === 2 ? (
          // My Favourites Content
          <div className="py-8">
            <h1 className="text-2xl font-semibold mb-2">My favourites</h1>
            <p className="text-gray-600 mb-8">Lorem ipsum dolor sit amet consectetur. Tincidunt.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((hospital, index) => (
                <HospitalCard
                  key={index}
                  name={hospital.name}
                  address={hospital.address}
                  rating={hospital.rating}
                  reviews={hospital.reviews}
                  onRemove={() => handleRemoveFavorite(index)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
} 