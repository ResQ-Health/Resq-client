import React, { useState } from 'react';
import { MdOutlineSearch, MdFilterList } from 'react-icons/md';
import { FaPlus, FaRegCalendarAlt, FaRegClock, FaStar } from 'react-icons/fa';
import { FiFilter, FiEye } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoCheckmarkDone } from 'react-icons/io5';
import { TiPlusOutline } from 'react-icons/ti';
import { SlHome } from 'react-icons/sl';
import { GoPlusCircle } from 'react-icons/go';
import { RiDeleteBinLine } from 'react-icons/ri';
import { LiaTimesCircle } from 'react-icons/lia';

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

export default function BookingHistoryPage() {
    const [bookingHistoryState, setBookingHistoryState] = useState(bookingHistory);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
    const [openStatusDropdownIndex, setOpenStatusDropdownIndex] = useState<number | null>(null);

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

    return (
        <div className="w-full min-h-screen">
            {/* Main Content */}
            <div className="max-w-6xl mx-auto bg-white rounded-lg px-6">
                <div className="flex w-full justify-between">
                    <div className="py-8">
                        <div className="flex  gap-4  justify-between py-8">
                            <div className='flex flex-col gap-[16px]'>
                                <div>
                                    <h1 className="text-xl font-semibold mb-2">Booking history</h1>
                                    <p className="text-gray-600 text-sm">Check and filter all your medical appointments here</p>
                                </div>
                                {/* Filter Tabs */}
                                <div className="flex gap-4 text-sm mb-8">
                                    <button className="flex items-center gap-2 bg-[#16202E] text-white px-4 py-2 rounded-lg">
                                        <TiPlusOutline className="w-4 text-sm h-4" />
                                        All Visits
                                        <span className="ml-2 bg-white text-[#16202E] px-2 rounded-full">7</span>
                                    </button>
                                    <button className="flex text-sm items-center gap-2 bg-[#F4F6F8] text-[#16202E] px-4 py-2 rounded-lg">
                                        <IoCheckmarkDone className="w-4 h-4" />
                                        Completed Visits
                                        <span className="ml-2 bg-white px-2 rounded-full">3</span>
                                    </button>
                                    <button className="flex text-sm items-center gap-2 bg-[#F4F6F8] text-[#16202E] px-4 py-2 rounded-lg">
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

                            </div>





                            <button className='bg-[#16202E] flex items-center gap-2  h-[36px]  text-white px-4 py-2 rounded-lg'>
                                <FaPlus className='' />
                                New Appointment
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
                                <thead className="bg-gray-50 text-[12px]">
                                    <tr>
                                        <th className="text-left p-4 text-gray-600">Appointment type</th>
                                        <th className="text-left p-4 text-gray-600">Address</th>
                                        <th className="text-left p-4 text-gray-600">Date and Time</th>
                                        <th className="text-left p-4 text-gray-600">Phone number</th>
                                        <th className="text-left p-4 text-gray-600">Rating</th>
                                        <th className="text-left p-4 text-gray-600"></th>
                                    </tr>
                                </thead>
                                <tbody className='text-[14px]'>
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
                                                                className={`w-4 h-4 ${star <= booking.rating
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
                                                        className={`px-3 py-1 rounded-full text-sm cursor-pointer ${booking.status === 'Completed' ? 'bg-green-100 text-green-800' :
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
                </div>

            </div>
        </div>
    );
} 