import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MdOutlineSearch, MdArrowUpward, MdArrowDownward, MdFilterList, MdSort, MdRefresh } from 'react-icons/md';
import { FaPlus, FaRegClock } from 'react-icons/fa';
import { FiEye } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoCheckmarkDone } from 'react-icons/io5';
import { TiPlusOutline } from 'react-icons/ti';
import { SlHome } from 'react-icons/sl';

import { RiDeleteBinLine } from 'react-icons/ri';
import { LiaTimesCircle } from 'react-icons/lia';
import { useNavigate } from 'react-router-dom';
import { usePatientAppointments, useDeleteAppointment, Appointment } from '../../services/userService';
import { useQueryClient } from '@tanstack/react-query';
import Pagination from '../../components/Pagination';

export default function BookingHistoryPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: appointmentsData, isLoading, error, refetch, isFetching } = usePatientAppointments();

    // Check if user is authenticated
    const isAuthenticated = !!localStorage.getItem('authToken');

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login-patient');
        }
    }, [isAuthenticated, navigate]);

    const deleteAppointmentMutation = useDeleteAppointment();
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
    const [openStatusDropdownIndex, setOpenStatusDropdownIndex] = useState<number | null>(null);

    // State for search, filter, sort, and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [sortField, setSortField] = useState<string>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const sortDropdownRef = useRef<HTMLDivElement>(null);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // Transform API data to match component expectations
    // Handle case where data is directly the array or nested in an object (as seen in debug logs)
    const rawData = appointmentsData?.data as any;
    let rawAppointments: any[] = [];

    // Handle multiple nested structures: data.appointments, data.data.appointments, or direct array
    if (Array.isArray(rawData)) {
        rawAppointments = rawData;
    } else if (Array.isArray(rawData?.appointments)) {
        rawAppointments = rawData.appointments;
    } else if (Array.isArray(rawData?.data?.appointments)) {
        rawAppointments = rawData.data.appointments;
    }

    // Transform appointments to ensure bookingType and communicationPreference are accessible
    // They might be in contact object or at appointment level
    const appointments: Appointment[] = rawAppointments.map((apt: any) => {
        // Extract bookingType - priority: appointment level > contact object > default
        const bookingType = apt.bookingType || apt.contact?.bookingType || 'Self';

        // Extract communicationPreference - priority: appointment level > contact object > default
        const communicationPreference = apt.communicationPreference || apt.contact?.communicationPreference || 'Booker';

        return {
            ...apt,
            // Ensure bookingType is at appointment level
            bookingType: bookingType,
            // Ensure communicationPreference is at appointment level
            communicationPreference: communicationPreference,
            // Ensure contact object exists with all fields from API
            contact: {
                name: apt.contact?.name || '',
                email: apt.contact?.email || '',
                phone: apt.contact?.phone || '',
                address: apt.contact?.address || '',
                gender: apt.contact?.gender || '',
                dob: apt.contact?.dob || '',
                // Keep bookingType and communicationPreference in contact if they exist there
                bookingType: apt.contact?.bookingType || bookingType,
                communicationPreference: apt.contact?.communicationPreference || communicationPreference,
            },
        };
    });

    // Debug: Log if we still couldn't find an array
    if (rawData && (!Array.isArray(rawAppointments) || rawAppointments.length === 0)) {
        console.error('Could not extract appointments array. Raw data:', rawData);
    }

    // Debug: Log individual appointment structure
    if (appointments && appointments.length > 0) {
        console.log('First appointment structure:', appointments[0]);
        console.log('First appointment bookingType:', appointments[0].bookingType);
        console.log('First appointment contact.bookingType:', appointments[0].contact?.bookingType);
        console.log('All appointment statuses:', appointments.map((apt) => apt.status));
        console.log('Unique statuses:', [...new Set(appointments.map((apt) => apt.status))]);
    }

    // Helper function to get status colors
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'confirmed':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'cancelled':
            case 'canceled':
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'no-show':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Filter and search logic
    const filteredAppointments = useMemo(() => {
        let filtered = appointments || [];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter((appointment) =>
                appointment.service?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                appointment.provider_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                appointment.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                appointment.contact?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                appointment.contact?.phone?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (selectedStatus !== 'all') {
            if (selectedStatus === 'completed') {
                filtered = filtered.filter((apt) => apt.status === 'completed');
            } else if (selectedStatus === 'upcoming') {
                filtered = filtered.filter((apt) => ['confirmed', 'pending'].includes(apt.status.toLowerCase()));
            } else if (selectedStatus === 'cancelled') {
                filtered = filtered.filter((apt) => ['cancelled', 'rejected', 'no-show'].includes(apt.status.toLowerCase()));
            }
        }

        // Sort
        if (sortField && filtered && Array.isArray(filtered)) {
            filtered = [...filtered].sort((a, b) => {
                let aValue = a[sortField as keyof typeof a];
                let bValue = b[sortField as keyof typeof b];

                // Handle nested objects
                if (sortField === 'service') {
                    aValue = a.service?.name || '';
                    bValue = b.service?.name || '';
                } else if (sortField === 'provider') {
                    aValue = a.provider_name || '';
                    bValue = b.provider_name || '';
                } else if (sortField === 'date') {
                    aValue = new Date(a.date).getTime();
                    bValue = new Date(b.date).getTime();
                }

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortDirection === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                }

                return 0;
            });
        }

        return filtered;
    }, [appointments, searchTerm, selectedStatus, sortField, sortDirection]);

    // Pagination logic
    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

    // Calculate counts for filter tabs
    const allCount = appointments?.length || 0;
    const completedCount = appointments?.filter((apt) => apt.status.toLowerCase() === 'completed').length || 0;
    const upcomingCount = appointments?.filter((apt) => ['confirmed', 'pending'].includes(apt.status.toLowerCase())).length || 0;
    const cancelledCount = appointments?.filter((apt) => ['cancelled', 'rejected', 'no-show'].includes(apt.status.toLowerCase())).length || 0;


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
        const appointment = appointments?.[index];
        if (!appointment || !appointments) return;

        // Optimistic update
        const updatedAppointments = appointments.map((apt) =>
            apt.id === appointment.id ? { ...apt, status: status as any } : apt
        );

        // Update the cache optimistically
        queryClient.setQueryData(['patientAppointments'], (oldData: any) => ({
            ...oldData,
            data: updatedAppointments
        }));

        // TODO: Implement actual API call
        console.log('Update status for appointment:', appointment.id, 'to:', status);

        // Simulate API call with a delay
        setTimeout(() => {
            // In a real implementation, you would call the API here
            // If the API call fails, you would revert the optimistic update
            console.log('Status updated successfully');
        }, 1000);

        setOpenStatusDropdownIndex(null);
    };

    // Handler functions
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page when searching
    };

    const handleStatusFilter = (status: string) => {
        setSelectedStatus(status);
        setCurrentPage(1); // Reset to first page when filtering
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleSortSelect = (field: string) => {
        handleSort(field);
        setShowSortDropdown(false);
    };

    const handleFilterSelect = (status: string) => {
        handleStatusFilter(status);
        setShowFilterDropdown(false);
    };

    const handleViewDetails = (appointment: any) => {
        setSelectedAppointment(appointment);
        setShowDetailsModal(true);
        setOpenDropdownIndex(null);
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedAppointment(null);
        setShowDeleteConfirm(false);
    };

    const handleDeleteAppointment = () => {
        if (!selectedAppointment) return;

        // Optimistic update - remove appointment from cache
        queryClient.setQueryData(['patientAppointments'], (oldData: any) => ({
            ...oldData,
            data: oldData.data.filter((apt: any) => apt.id !== selectedAppointment.id)
        }));

        // Call the actual API
        deleteAppointmentMutation.mutate(selectedAppointment.id, {
            onSuccess: () => {
                // Close modal after successful deletion
                closeDetailsModal();
            },
            onError: () => {
                // Revert optimistic update on error
                queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
            }
        });
    };

    const confirmDelete = () => {
        setShowDeleteConfirm(true);
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setShowSortDropdown(false);
            }
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setShowFilterDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Close modal when clicking outside
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showDetailsModal) {
                closeDetailsModal();
            }
        };

        if (showDetailsModal) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [showDetailsModal]);

    // Auto-refetch appointments every 30 seconds for real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [refetch]);

    // Refetch when window regains focus (user comes back to tab)
    useEffect(() => {
        const handleFocus = () => {
            refetch();
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [refetch]);

    // Don't render if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    // Loading state - Glassmorphism modal
    if (isLoading) {
        return (
            <div className="w-full min-h-screen bg-gray-50">
                {/* Background content placeholder */}
                <div className="max-w-7xl mx-auto p-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 opacity-30">
                        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 opacity-30">
                        <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden opacity-30">
                        <div className="h-96 bg-gray-200"></div>
                    </div>
                </div>

                {/* Glassmorphism Loading Modal */}
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-2xl p-8 max-w-md mx-auto">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16202E]"></div>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Appointments</h2>
                            <p className="text-gray-600 text-sm">Please wait while we fetch your appointment history...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state - Glassmorphism modal
    if (error) {
        // Check if it's an authentication error
        const isAuthError = (error as any)?.response?.status === 401 ||
            (error as any)?.code === 'ECONNABORTED' ||
            error?.message?.includes('timeout') ||
            error?.message?.includes('401');

        return (
            <div className="w-full min-h-screen bg-gray-50">
                {/* Background content placeholder */}
                <div className="max-w-7xl mx-auto p-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 opacity-30">
                        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 opacity-30">
                        <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden opacity-30">
                        <div className="h-96 bg-gray-200"></div>
                    </div>
                </div>

                {/* Glassmorphism Error Modal */}
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-2xl p-8 max-w-md mx-auto">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100/50 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">
                                {isAuthError ? 'Authentication Required' : 'Unable to Load Appointments'}
                            </h2>
                            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                                {isAuthError
                                    ? 'Please log in to view your appointment history. Your session may have expired.'
                                    : 'We encountered an issue while loading your appointment history. Please try again.'
                                }
                            </p>
                            <div className="flex gap-3">
                                {isAuthError ? (
                                    <button
                                        onClick={() => navigate('/login-patient')}
                                        className="flex-1 bg-[#16202E]/80 backdrop-blur-sm text-white py-2 px-4 rounded-lg font-medium hover:bg-[#16202E] transition-colors duration-200 border border-white/20"
                                    >
                                        Go to Login
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => refetch()}
                                            className="flex-1 bg-[#16202E]/80 backdrop-blur-sm text-white py-2 px-4 rounded-lg font-medium hover:bg-[#16202E] transition-colors duration-200 border border-white/20"
                                        >
                                            Try Again
                                        </button>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="flex-1 bg-white/20 backdrop-blur-sm text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-white/30 transition-colors duration-200 border border-white/30"
                                        >
                                            Reload Page
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gray-50">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-6">
                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        {/* Title and Description */}
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-[#16202E] mb-2">Booking History</h1>
                            <p className="text-gray-600">Manage and track all your medical appointments in one place</p>
                        </div>

                        {/* New Appointment Button */}
                        <button
                            className='bg-[#16202E] hover:bg-[#0F1C26] flex items-center gap-2 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm'
                            onClick={() => navigate('/search')}
                        >
                            <FaPlus className="w-4 h-4" />
                            New Appointment
                        </button>
                    </div>
                </div>

                {/* Search, Filter, and Sort Controls */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Search appointments by service, provider, or contact..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16202E]/20 focus:border-[#16202E] text-sm bg-gray-50/50"
                            />
                            <MdOutlineSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>

                        {/* Filter Dropdown */}
                        <div className="relative" ref={filterDropdownRef}>
                            <button
                                onClick={() => {
                                    setShowFilterDropdown(!showFilterDropdown);
                                    setShowSortDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-4 py-3 rounded-lg border font-medium transition-all duration-200 ${selectedStatus !== 'all'
                                    ? 'bg-[#16202E] text-white border-[#16202E] shadow-sm'
                                    : 'bg-white border-gray-200 text-[#16202E] hover:bg-gray-50 hover:border-[#16202E]/30'
                                    }`}
                            >
                                <MdFilterList className="w-5 h-5" />
                                Filter
                                {selectedStatus !== 'all' && (
                                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                                        {selectedStatus === 'completed' ? 'Completed' :
                                            selectedStatus === 'upcoming' ? 'Upcoming' : 'Cancelled'}
                                    </span>
                                )}
                            </button>
                            {showFilterDropdown && (
                                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[220px] overflow-hidden">
                                    <button
                                        onClick={() => handleFilterSelect('all')}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 text-gray-700 transition-colors"
                                    >
                                        <TiPlusOutline className="w-4 h-4" />
                                        All Visits
                                        <span className="ml-auto bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{allCount}</span>
                                    </button>
                                    <button
                                        onClick={() => handleFilterSelect('completed')}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-green-50 text-green-700 transition-colors"
                                    >
                                        <IoCheckmarkDone className="w-4 h-4" />
                                        Completed
                                        <span className="ml-auto bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">{completedCount}</span>
                                    </button>
                                    <button
                                        onClick={() => handleFilterSelect('upcoming')}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-blue-50 text-blue-700 transition-colors"
                                    >
                                        <FaRegClock className="w-4 h-4" />
                                        Upcoming
                                        <span className="ml-auto bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">{upcomingCount}</span>
                                    </button>
                                    <button
                                        onClick={() => handleFilterSelect('cancelled')}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-red-50 text-red-700 transition-colors"
                                    >
                                        <SlHome className="w-4 h-4" />
                                        Cancelled
                                        <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">{cancelledCount}</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative" ref={sortDropdownRef}>
                            <button
                                onClick={() => {
                                    setShowSortDropdown(!showSortDropdown);
                                    setShowFilterDropdown(false);
                                }}
                                className={`flex items-center gap-2 px-4 py-3 rounded-lg border font-medium transition-all duration-200 ${sortField
                                    ? 'bg-[#16202E] text-white border-[#16202E] shadow-sm'
                                    : 'bg-white border-gray-200 text-[#16202E] hover:bg-gray-50 hover:border-[#16202E]/30'
                                    }`}
                            >
                                <MdSort className="w-5 h-5" />
                                Sort
                                {sortField && (
                                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                                        {sortField === 'service' ? 'Service' :
                                            sortField === 'provider' ? 'Provider' : 'Date'}
                                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                                    </span>
                                )}
                            </button>
                            {showSortDropdown && (
                                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[200px] overflow-hidden">
                                    <button
                                        onClick={() => handleSortSelect('service')}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 text-gray-700 transition-colors"
                                    >
                                        Service Name
                                        {sortField === 'service' && (
                                            sortDirection === 'asc' ?
                                                <MdArrowUpward className="w-4 h-4 ml-auto text-[#16202E]" /> :
                                                <MdArrowDownward className="w-4 h-4 ml-auto text-[#16202E]" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleSortSelect('provider')}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 text-gray-700 transition-colors"
                                    >
                                        Provider Name
                                        {sortField === 'provider' && (
                                            sortDirection === 'asc' ?
                                                <MdArrowUpward className="w-4 h-4 ml-auto text-[#16202E]" /> :
                                                <MdArrowDownward className="w-4 h-4 ml-auto text-[#16202E]" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleSortSelect('date')}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 text-gray-700 transition-colors"
                                    >
                                        Date & Time
                                        {sortField === 'date' && (
                                            sortDirection === 'asc' ?
                                                <MdArrowUpward className="w-4 h-4 ml-auto text-[#16202E]" /> :
                                                <MdArrowDownward className="w-4 h-4 ml-auto text-[#16202E]" />
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {(searchTerm || selectedStatus !== 'all' || sortField) && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-600 font-medium">Active filters:</span>
                                {searchTerm && (
                                    <span className="bg-[#16202E]/10 text-[#16202E] text-xs px-3 py-1 rounded-full font-medium">
                                        Search: "{searchTerm}"
                                    </span>
                                )}
                                {selectedStatus !== 'all' && (
                                    <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">
                                        Status: {selectedStatus}
                                    </span>
                                )}
                                {sortField && (
                                    <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-medium">
                                        Sort: {sortField} ({sortDirection})
                                    </span>
                                )}
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedStatus('all');
                                        setSortField('');
                                        setCurrentPage(1);
                                    }}
                                    className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Table Header */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#16202E]">
                                {selectedStatus === 'all' ? 'All Visits' :
                                    selectedStatus === 'completed' ? 'Completed Visits' :
                                        selectedStatus === 'upcoming' ? 'Upcoming Visits' : 'Cancelled Visits'}
                                <span className="ml-2 text-sm text-gray-500 font-normal">({filteredAppointments.length} appointments)</span>
                            </h2>
                            <div className="flex items-center gap-3">
                                {isFetching && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#16202E]"></div>
                                        <span>Updating...</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => refetch()}
                                    className="p-2 text-gray-400 hover:text-[#16202E] transition-colors"
                                    title="Refresh appointments"
                                >
                                    <MdRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-xs">
                                <tr>
                                    <th className="text-left p-4 text-gray-600 font-semibold">SN</th>
                                    <th className="text-left p-4 text-gray-600 font-semibold">
                                        <button
                                            onClick={() => handleSort('service')}
                                            className="flex items-center gap-1 hover:text-[#16202E] transition-colors"
                                        >
                                            Service
                                            {sortField === 'service' && (
                                                sortDirection === 'asc' ?
                                                    <MdArrowUpward className="w-4 h-4" /> :
                                                    <MdArrowDownward className="w-4 h-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="text-left p-4 text-gray-600 font-semibold">
                                        <button
                                            onClick={() => handleSort('provider')}
                                            className="flex items-center gap-1 hover:text-[#16202E] transition-colors"
                                        >
                                            Provider
                                            {sortField === 'provider' && (
                                                sortDirection === 'asc' ?
                                                    <MdArrowUpward className="w-4 h-4" /> :
                                                    <MdArrowDownward className="w-4 h-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="text-left p-4 text-gray-600 font-semibold">
                                        <button
                                            onClick={() => handleSort('date')}
                                            className="flex items-center gap-1 hover:text-[#16202E] transition-colors"
                                        >
                                            Date and Time
                                            {sortField === 'date' && (
                                                sortDirection === 'asc' ?
                                                    <MdArrowUpward className="w-4 h-4" /> :
                                                    <MdArrowDownward className="w-4 h-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="text-left p-4 text-gray-600 font-semibold">Contact</th>
                                    <th className="text-left p-4 text-gray-600 font-semibold">Booking For</th>
                                    <th className="text-left p-4 text-gray-600 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className='text-sm'>
                                {paginatedAppointments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-lg font-medium text-gray-900">
                                                        {(appointments?.length || 0) === 0 ? "No appointments found" : "No appointments match your search"}
                                                    </p>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {(appointments?.length || 0) === 0 ? "You haven't booked any appointments yet." : "Try adjusting your search or filter criteria."}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedAppointments.map((appointment, index) => (
                                        <tr key={appointment.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-gray-600">{startIndex + index + 1}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-[#16202E]">{appointment.service?.name || 'No service'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{appointment.provider_name}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{new Date(appointment.date).toLocaleDateString()}</div>
                                                <div className="text-gray-500 text-xs mt-1">{appointment.start_time} - {appointment.end_time}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{appointment.contact?.name || 'N/A'}</div>
                                                <div className="text-gray-500 text-xs mt-1">{appointment.contact?.phone || 'N/A'}</div>
                                                <div className="text-gray-500 text-xs">{appointment.contact?.email || 'N/A'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${appointment.bookingType === 'Self'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-indigo-100 text-indigo-800'
                                                    }`}>
                                                    {appointment.bookingType === 'Self' ? 'Myself' : 'Someone else'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 relative">
                                                    <span
                                                        onClick={(e) => toggleStatusDropdown(index, e)}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer border ${getStatusColor(appointment.status)}`}
                                                    >
                                                        {appointment.status}
                                                    </span>
                                                    {openStatusDropdownIndex === index && (
                                                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                                                            <button
                                                                onClick={() => handleStatusSelect(index, 'pending')}
                                                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-yellow-800"
                                                            >
                                                                <FaRegClock className="w-4 h-4" />
                                                                Pending
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusSelect(index, 'confirmed')}
                                                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-blue-800"
                                                            >
                                                                <IoCheckmarkDone className="w-4 h-4" />
                                                                Confirmed
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusSelect(index, 'completed')}
                                                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-green-800"
                                                            >
                                                                <IoCheckmarkDone className="w-4 h-4" />
                                                                Completed
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusSelect(index, 'cancelled')}
                                                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-red-800"
                                                            >
                                                                <LiaTimesCircle className="w-4 h-4" />
                                                                Cancelled
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusSelect(index, 'rejected')}
                                                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-red-800"
                                                            >
                                                                <LiaTimesCircle className="w-4 h-4" />
                                                                Rejected
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusSelect(index, 'no-show')}
                                                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-orange-800"
                                                            >
                                                                <LiaTimesCircle className="w-4 h-4" />
                                                                No Show
                                                            </button>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => toggleDropdown(index)}
                                                        className="relative z-10 p-1 hover:bg-gray-100 rounded transition-colors"
                                                    >
                                                        <BsThreeDotsVertical className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                    {openDropdownIndex === index && (
                                                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]">
                                                            <button
                                                                onClick={() => handleViewDetails(appointment)}
                                                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-gray-700"
                                                            >
                                                                <FiEye className="w-4 h-4" />
                                                                View details
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAppointment(appointment);
                                                                    setShowDeleteConfirm(true);
                                                                    setOpenDropdownIndex(null);
                                                                }}
                                                                className="flex items-center gap-2 w-full px-4 py-3 text-sm hover:bg-gray-50 text-red-600"
                                                            >
                                                                <RiDeleteBinLine className="w-4 h-4" />
                                                                Remove
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {filteredAppointments.length > itemsPerPage && (
                    <div className="mt-6">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            {/* Appointment Details Modal */}
            {showDetailsModal && selectedAppointment && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={closeDetailsModal}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-[#16202E]">Appointment Details</h2>
                            <button
                                onClick={closeDetailsModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Service & Provider Information */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-[#16202E] mb-3">Service & Provider</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Service Name</label>
                                        <p className="text-gray-900 font-medium">{selectedAppointment.service?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Category</label>
                                        <p className="text-gray-900">{selectedAppointment.service?.category || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Provider Name</label>
                                        <p className="text-gray-900 font-medium">{selectedAppointment.provider_name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Price</label>
                                        <p className="text-gray-900 font-medium text-lg">₦{selectedAppointment.service?.price?.toLocaleString() || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Appointment Details */}
                            <div className="bg-green-50 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-[#16202E] mb-3">Appointment Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Date</label>
                                        <p className="text-gray-900 font-medium">{new Date(selectedAppointment.date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Time</label>
                                        <p className="text-gray-900 font-medium">{selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Status</label>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedAppointment.status)}`}>
                                            {selectedAppointment.status}
                                        </span>
                                    </div>
                                </div>
                                {selectedAppointment.notes && (
                                    <div className="mt-4">
                                        <label className="text-sm font-medium text-gray-600">Notes</label>
                                        <p className="text-gray-900 mt-1 p-3 bg-white rounded border">{selectedAppointment.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Contact Information */}
                            <div className="bg-purple-50 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-[#16202E] mb-3">Contact Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Name</label>
                                        <p className="text-gray-900 font-medium">{selectedAppointment.contact?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Phone</label>
                                        <p className="text-gray-900">{selectedAppointment.contact?.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Email</label>
                                        <p className="text-gray-900">{selectedAppointment.contact?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Gender</label>
                                        <p className="text-gray-900">{selectedAppointment.contact?.gender || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                                        <p className="text-gray-900">{selectedAppointment.contact?.dob || 'N/A'}</p>
                                    </div>
                                </div>
                                {selectedAppointment.contact?.address && (
                                    <div className="mt-4">
                                        <label className="text-sm font-medium text-gray-600">Address</label>
                                        <p className="text-gray-900 mt-1">{selectedAppointment.contact.address}</p>
                                    </div>
                                )}
                            </div>

                            {/* Booking Information */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-[#16202E] mb-3">Booking Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Booking Type</label>
                                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${selectedAppointment.bookingType === 'Self'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-indigo-100 text-indigo-800'
                                            }`}>
                                            {selectedAppointment.bookingType === 'Self' ? 'Myself' : 'Someone else'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Communication Preference</label>
                                        <p className="text-gray-900">{selectedAppointment.communicationPreference || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Information */}
                            <div className="bg-yellow-50 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-[#16202E] mb-3">Payment Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Amount</label>
                                        <p className="text-gray-900 font-medium text-lg">₦{selectedAppointment.payment?.amount?.toLocaleString() || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Payment Status</label>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${selectedAppointment.payment?.amount ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {selectedAppointment.payment?.amount ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>
                                    {selectedAppointment.payment?.paidAt && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-600">Paid At</label>
                                            <p className="text-gray-900">{new Date(selectedAppointment.payment.paidAt).toLocaleString()}</p>
                                        </div>
                                    )}
                                    {selectedAppointment.payment?.paystackReference && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-600">Reference</label>
                                            <p className="text-gray-900 font-mono text-sm">{selectedAppointment.payment.paystackReference}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={confirmDelete}
                                className="px-6 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                            >
                                <RiDeleteBinLine className="w-4 h-4" />
                                Delete Appointment
                            </button>
                            <button
                                onClick={closeDetailsModal}
                                className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedAppointment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <RiDeleteBinLine className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#16202E]">Delete Appointment</h2>
                                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            <div className="bg-red-50 rounded-lg p-4 mb-4">
                                <h3 className="font-medium text-red-800 mb-2">Appointment Details:</h3>
                                <p className="text-sm text-red-700">
                                    <strong>Service:</strong> {selectedAppointment.service?.name || 'N/A'}<br />
                                    <strong>Provider:</strong> {selectedAppointment.provider_name}<br />
                                    <strong>Date:</strong> {new Date(selectedAppointment.date).toLocaleDateString()}<br />
                                    <strong>Time:</strong> {selectedAppointment.start_time} - {selectedAppointment.end_time}<br />
                                    <strong>Booking For:</strong> {selectedAppointment.bookingType === 'Self' ? 'Myself' : 'Someone else'}
                                </p>
                            </div>
                            <p className="text-gray-600 text-sm">
                                Are you sure you want to delete this appointment? This action cannot be undone and will permanently remove the appointment from your history.
                            </p>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={cancelDelete}
                                className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAppointment}
                                disabled={deleteAppointmentMutation.isPending}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deleteAppointmentMutation.isPending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <RiDeleteBinLine className="w-4 h-4" />
                                        Delete Appointment
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 