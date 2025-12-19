import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MdOutlineSearch, MdArrowUpward, MdArrowDownward, MdFilterList, MdSort, MdRefresh, MdSchedule, MdCheckCircle, MdCancel, MdToday, MdEvent, MdHistory, MdClear } from 'react-icons/md';
import { FaPlus, FaRegClock, FaHourglassHalf } from 'react-icons/fa';
import { FiEye } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoCheckmarkDone, IoTimeOutline } from 'react-icons/io5';
import { TiPlusOutline } from 'react-icons/ti';
import { SlHome } from 'react-icons/sl';
import { RiDeleteBinLine } from 'react-icons/ri';
import { LiaTimesCircle } from 'react-icons/lia';
import { useNavigate } from 'react-router-dom';
import { usePatientAppointments, useDeleteAppointment, Appointment } from '../../services/userService';
import { useQueryClient } from '@tanstack/react-query';
import Pagination from '../../components/Pagination';
import { LoadingSpinner } from '../../components/LoadingSpinner';

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

    // State for search, filter, sort, and pagination
    const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past' | 'today'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' = no filter
    const [sortField, setSortField] = useState<string>('paidAt'); // Default sort by paidAt
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default desc (most recent paid first)
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
    const rawData = appointmentsData?.data as any;
    let rawAppointments: any[] = [];

    if (Array.isArray(rawData)) {
        rawAppointments = rawData;
    } else if (Array.isArray(rawData?.appointments)) {
        rawAppointments = rawData.appointments;
    } else if (Array.isArray(rawData?.data?.appointments)) {
        rawAppointments = rawData.data.appointments;
    }

    const appointments: Appointment[] = rawAppointments.map((apt: any) => {
        const bookingType = apt.bookingType || apt.contact?.bookingType || 'Self';
        const communicationPreference = apt.communicationPreference || apt.contact?.communicationPreference || 'Booker';

        return {
            ...apt,
            bookingType: bookingType,
            communicationPreference: communicationPreference,
            contact: {
                name: apt.contact?.name || '',
                email: apt.contact?.email || '',
                phone: apt.contact?.phone || '',
                address: apt.contact?.address || '',
                gender: apt.contact?.gender || '',
                dob: apt.contact?.dob || '',
                bookingType: apt.contact?.bookingType || bookingType,
                communicationPreference: apt.contact?.communicationPreference || communicationPreference,
            },
        };
    });

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

    // Helper functions for date checks
    const isToday = (dateString: string) => {
        const appointmentDate = new Date(dateString);
        const today = new Date();
        return appointmentDate.toDateString() === today.toDateString();
    };

    const isPast = (dateString: string, timeString?: string) => {
        const appointmentDate = new Date(dateString);
        const today = new Date();

        if (appointmentDate.toDateString() === today.toDateString() && timeString) {
            const [time, period] = timeString.split(' ');
            const [hours, minutes] = time.split(':').map(Number);
            let hour24 = hours;
            if (period?.toLowerCase() === 'pm' && hours !== 12) hour24 += 12;
            if (period?.toLowerCase() === 'am' && hours === 12) hour24 = 0;

            const appointmentDateTime = new Date(today);
            appointmentDateTime.setHours(hour24, minutes, 0, 0);
            return appointmentDateTime < new Date();
        }

        appointmentDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        return appointmentDate < today;
    };

    const isUpcoming = (dateString: string, timeString?: string) => {
        return !isPast(dateString, timeString) && !isToday(dateString);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (isToday(dateString)) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
        }
    };

    // Helper function to format communication preference display
    const formatCommunicationPreference = (preference: string | undefined) => {
        if (!preference) return 'N/A';
        if (preference.toLowerCase() === 'booker') return 'You';
        return preference;
    };

    // Filter and search logic
    const filteredAppointments = useMemo(() => {
        let filtered = appointments || [];

        // 1. Tab Filter (Time-based)
        if (activeTab === 'upcoming') {
            filtered = filtered.filter(apt => isUpcoming(apt.date, apt.start_time));
        } else if (activeTab === 'past') {
            filtered = filtered.filter(apt => isPast(apt.date, apt.start_time));
        } else if (activeTab === 'today') {
            filtered = filtered.filter(apt => isToday(apt.date));
        }

        // 2. Search filter
        if (searchTerm) {
            filtered = filtered.filter((appointment) =>
                appointment.service?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                appointment.provider_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                appointment.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                appointment.contact?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                appointment.contact?.phone?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // 3. Status filter
        if (selectedStatus !== 'all') {
            filtered = filtered.filter((apt) => apt.status.toLowerCase() === selectedStatus.toLowerCase());
        }

        // 4. Sorting logic
        filtered = [...filtered].sort((a, b) => {
            // Default sort: by paidAt (most recent paid first)
            if (sortField === 'paidAt') {
                const aPaidAt = a.payment?.paidAt ? new Date(a.payment.paidAt).getTime() : 0;
                const bPaidAt = b.payment?.paidAt ? new Date(b.payment.paidAt).getTime() : 0;

                // If both have paidAt, sort by paidAt
                if (aPaidAt > 0 && bPaidAt > 0) {
                    return sortDirection === 'desc' ? bPaidAt - aPaidAt : aPaidAt - bPaidAt;
                }
                // If only one has paidAt, prioritize the one with paidAt
                if (aPaidAt > 0 && bPaidAt === 0) return -1;
                if (aPaidAt === 0 && bPaidAt > 0) return 1;
                // If neither has paidAt, sort by appointment date as fallback
                const aDate = new Date(a.date).getTime();
                const bDate = new Date(b.date).getTime();
                return sortDirection === 'desc' ? bDate - aDate : aDate - bDate;
            }

            // Manual sort options
            if (sortField && sortField !== 'date') {
                let aValue = a[sortField as keyof typeof a];
                let bValue = b[sortField as keyof typeof b];

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
            }

            // Fallback: Automatic date-based sorting: Upcoming → Today → Past
            const aIsUpcoming = isUpcoming(a.date, a.start_time);
            const bIsUpcoming = isUpcoming(b.date, b.start_time);
            const aIsToday = isToday(a.date);
            const bIsToday = isToday(b.date);
            const aIsPast = isPast(a.date, a.start_time);
            const bIsPast = isPast(b.date, b.start_time);

            // Priority order: Upcoming (1) → Today (2) → Past (3)
            const getPriority = (isUpcoming: boolean, isToday: boolean, isPast: boolean) => {
                if (isUpcoming) return 1;
                if (isToday) return 2;
                if (isPast) return 3;
                return 4; // fallback
            };

            const aPriority = getPriority(aIsUpcoming, aIsToday, aIsPast);
            const bPriority = getPriority(bIsUpcoming, bIsToday, bIsPast);

            // First sort by priority (upcoming → today → past)
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            // Within same priority, sort by date (ascending for upcoming/today, descending for past)
            const aDate = new Date(a.date).getTime();
            const bDate = new Date(b.date).getTime();

            if (aIsPast) {
                // For past appointments, show most recent first (descending)
                return bDate - aDate;
            } else {
                // For upcoming and today, show earliest first (ascending)
                return aDate - bDate;
            }
        });

        return filtered;
    }, [appointments, searchTerm, selectedStatus, sortField, sortDirection, activeTab]);

    // Pagination logic
    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

    // Calculate counts for tabs
    const allCount = appointments?.length || 0;
    const upcomingCount = appointments?.filter(apt => isUpcoming(apt.date, apt.start_time)).length || 0;
    const pastCount = appointments?.filter(apt => isPast(apt.date, apt.start_time)).length || 0;
    const todayCount = appointments?.filter(apt => isToday(apt.date)).length || 0;

    // Calculate counts for filter dropdown
    const pendingCount = appointments?.filter((apt) => apt.status.toLowerCase() === 'pending').length || 0;
    const confirmedCount = appointments?.filter((apt) => apt.status.toLowerCase() === 'confirmed').length || 0;
    const cancelledCount = appointments?.filter((apt) => apt.status.toLowerCase() === 'cancelled').length || 0;


    const toggleDropdown = (index: number) => {
        setOpenDropdownIndex(openDropdownIndex === index ? null : index);
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleStatusFilter = (status: string) => {
        setSelectedStatus(status);
        setCurrentPage(1);
    };

    const handleClearAllFilters = () => {
        setActiveTab('all');
        setSearchTerm('');
        setSelectedStatus('all');
        setSortField('paidAt');
        setSortDirection('desc');
        setCurrentPage(1);
    };

    // Check if any filters are active
    const hasActiveFilters = activeTab !== 'all' || searchTerm !== '' || selectedStatus !== 'all' || sortField !== 'paidAt' || sortDirection !== 'desc';

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

        queryClient.setQueryData(['patientAppointments'], (oldData: any) => ({
            ...oldData,
            data: oldData.data.filter((apt: any) => apt.id !== selectedAppointment.id)
        }));

        deleteAppointmentMutation.mutate(selectedAppointment.id, {
            onSuccess: () => {
                closeDetailsModal();
            },
            onError: () => {
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

    // Removed automatic refetch intervals - data will only refresh on manual refresh or page reload

    if (!isAuthenticated) return null;

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MdCancel className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Unable to Load Appointments</h2>
                    <p className="text-gray-600 mb-6">We encountered an issue while loading your appointment history.</p>
                    <button
                        onClick={() => refetch()}
                        className="bg-[#16202E] text-white py-2 px-6 rounded-lg font-medium hover:bg-[#0F1C26] transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#16202E] tracking-tight">Booking History</h1>
                        <p className="text-gray-500 mt-1">Manage and track your medical appointments</p>
                    </div>
                    <button
                        className='bg-[#16202E] hover:bg-[#0F1C26] flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-gray-200 hover:shadow-xl transform hover:-translate-y-0.5'
                        onClick={() => navigate('/search')}
                    >
                        <FaPlus className="w-3.5 h-3.5" />
                        New Appointment
                    </button>
                </div>

                {/* Tabs & Controls Container */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4 p-4">
                        {/* Tabs */}
                        <div className="flex p-1 bg-gray-100/50 rounded-xl overflow-x-auto no-scrollbar flex-1">
                            {[
                                { id: 'all', label: 'All Visits', icon: MdHistory, count: allCount },
                                { id: 'upcoming', label: 'Upcoming', icon: MdEvent, count: upcomingCount },
                                { id: 'today', label: 'Today', icon: MdToday, count: todayCount },
                                { id: 'past', label: 'Past', icon: IoTimeOutline, count: pastCount },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as any);
                                        setCurrentPage(1);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-1 justify-center ${activeTab === tab.id
                                        ? 'bg-white text-[#16202E] shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                        }`}
                                >
                                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#16202E]' : 'text-gray-400'}`} />
                                    {tab.label}
                                    <span className={`ml-1.5 text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'bg-gray-200 text-gray-600'
                                        }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search & Filters */}
                        <div className="flex gap-3 flex-wrap lg:flex-nowrap">
                            {/* Search */}
                            <div className="relative flex-1 lg:w-64">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16202E]/10 focus:border-[#16202E] text-sm bg-gray-50/30 transition-all"
                                />
                                <MdOutlineSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>

                            {/* Filter Button */}
                            <div className="relative" ref={filterDropdownRef}>
                                <button
                                    onClick={() => {
                                        setShowFilterDropdown(!showFilterDropdown);
                                        setShowSortDropdown(false);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${selectedStatus !== 'all'
                                        ? 'bg-[#16202E] text-white border-[#16202E]'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <MdFilterList className="w-4 h-4" />
                                    Filter
                                    {selectedStatus !== 'all' && (
                                        <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full capitalize ml-1">
                                            {selectedStatus}
                                        </span>
                                    )}
                                </button>
                                {showFilterDropdown && (
                                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-30 min-w-[200px] overflow-hidden py-1">
                                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Filter by Status</div>
                                        {[
                                            { id: 'all', label: 'All Statuses', count: allCount, icon: MdFilterList, color: 'text-gray-600' },
                                            { id: 'pending', label: 'Pending', count: pendingCount, icon: FaHourglassHalf, color: 'text-yellow-600' },
                                            { id: 'confirmed', label: 'Confirmed', count: confirmedCount, icon: MdCheckCircle, color: 'text-blue-600' },
                                            { id: 'cancelled', label: 'Cancelled', count: cancelledCount, icon: MdCancel, color: 'text-red-600' },
                                        ].map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => handleFilterSelect(option.id)}
                                                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === option.id ? 'bg-gray-50 font-medium' : 'text-gray-600'}`}
                                            >
                                                <option.icon className={`w-4 h-4 ${option.color}`} />
                                                {option.label}
                                                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{option.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sort Button */}
                            <div className="relative" ref={sortDropdownRef}>
                                <button
                                    onClick={() => {
                                        setShowSortDropdown(!showSortDropdown);
                                        setShowFilterDropdown(false);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${sortField
                                        ? 'bg-white border-gray-200 text-[#16202E] hover:bg-gray-50'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <MdSort className="w-4 h-4" />
                                    Sort
                                </button>
                                {showSortDropdown && (
                                    <div className="absolute top-full right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-30 min-w-[180px] overflow-hidden py-1">
                                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort by</div>
                                        {[
                                            { id: 'paidAt', label: 'Paid At' },
                                            { id: 'date', label: 'Date' },
                                            { id: 'service', label: 'Service' },
                                            { id: 'provider', label: 'Provider' },
                                        ].map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => handleSortSelect(option.id)}
                                                className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <span>{option.label}</span>
                                                {sortField === option.id && (
                                                    sortDirection === 'asc' ? <MdArrowUpward className="w-3.5 h-3.5 text-[#16202E]" /> : <MdArrowDownward className="w-3.5 h-3.5 text-[#16202E]" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Clear All Filters Button - Show when filters are active */}
                            {hasActiveFilters && (
                                <button
                                    onClick={handleClearAllFilters}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-red-200 hover:text-red-600 text-sm font-medium transition-all duration-200"
                                    title="Clear all filters"
                                >
                                    <MdClear className="w-4 h-4" />
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Table Header Info */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                                {activeTab === 'all' ? 'All Appointments' :
                                    activeTab === 'upcoming' ? 'Upcoming Appointments' :
                                        activeTab === 'today' ? "Today's Appointments" : 'Past Appointments'}
                            </span>
                            <span className="text-sm text-gray-500 font-normal">({filteredAppointments.length})</span>
                        </div>
                        <button
                            onClick={() => refetch()}
                            className="p-2 text-gray-400 hover:text-[#16202E] transition-colors rounded-lg hover:bg-gray-100"
                            title="Refresh"
                        >
                            <MdRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-medium">
                                <tr>
                                    <th className="text-left p-4 pl-6">Service</th>
                                    <th className="text-left p-4">Provider</th>
                                    <th className="text-left p-4">Date & Time</th>
                                    <th className="text-left p-4">Contact</th>
                                    <th className="text-left p-4">Booking For</th>
                                    <th className="text-left p-4">Status</th>
                                    <th className="text-left p-4 pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedAppointments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-16 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                                    <MdEvent className="w-10 h-10 text-gray-300" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-medium text-gray-900">No appointments found</p>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {searchTerm || selectedStatus !== 'all'
                                                            ? "Try adjusting your filters or search terms."
                                                            : "You don't have any appointments in this category."}
                                                    </p>
                                                </div>
                                                {hasActiveFilters && (
                                                    <button
                                                        onClick={handleClearAllFilters}
                                                        className="px-4 py-2 text-sm text-white bg-[#16202E] hover:bg-[#0F1C26] font-medium rounded-lg transition-colors"
                                                    >
                                                        Clear All Filters
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedAppointments.map((appointment, index) => {
                                        const appointmentIsToday = isToday(appointment.date);
                                        return (
                                            <tr
                                                key={appointment.id}
                                                className={`group transition-colors hover:bg-gray-50/80 ${appointmentIsToday ? 'bg-blue-50/30' : ''}`}
                                            >
                                                <td className="p-4 pl-6">
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{appointment.service?.name || 'Unknown Service'}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">{appointment.service?.category}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                                            {appointment.provider_name?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="font-medium text-gray-700">{appointment.provider_name}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className={`font-medium text-sm ${appointmentIsToday ? 'text-blue-700' : 'text-gray-900'}`}>
                                                            {formatDate(appointment.date)}
                                                        </span>
                                                        <span className="text-xs text-gray-500 mt-0.5">
                                                            {appointment.start_time} - {appointment.end_time}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm text-gray-900">{appointment.contact?.name}</div>
                                                    <div className="text-xs text-gray-500">{appointment.contact?.phone}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${appointment.bookingType === 'Self'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-indigo-100 text-indigo-700'
                                                        }`}>
                                                        {appointment.bookingType === 'Self' ? 'Myself' : 'Someone else'}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                                                        {appointment.status}
                                                    </div>
                                                </td>
                                                <td className="p-4 pr-6">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleViewDetails(appointment)}
                                                            className="p-2 text-gray-400 hover:text-[#16202E] hover:bg-gray-100 rounded-lg transition-all"
                                                            title="View Details"
                                                        >
                                                            <FiEye className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredAppointments.length > itemsPerPage && (
                        <div className="border-t border-gray-100 p-4 bg-gray-50/30">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Appointment Details Modal */}
            {showDetailsModal && selectedAppointment && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={closeDetailsModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-[#16202E]">Appointment Details</h2>
                            <button onClick={closeDetailsModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <LiaTimesCircle className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Service Info */}
                            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm text-xl">
                                    🏥
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">{selectedAppointment.service?.name}</h3>
                                    <p className="text-gray-500">{selectedAppointment.provider_name}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-sm bg-white px-2 py-1 rounded border border-gray-200 text-gray-600">
                                            {selectedAppointment.service?.category}
                                        </span>
                                        <span className="text-sm font-medium text-[#16202E]">
                                            ₦{selectedAppointment.service?.price?.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Time & Date */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Time & Date</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                            <MdEvent className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{new Date(selectedAppointment.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            <p className="text-sm text-gray-500">{selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Status</h4>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(selectedAppointment.status).replace('text-', 'bg-').replace('bg-', 'text-').split(' ')[0]} bg-opacity-10`}>
                                            <IoCheckmarkDone className={`w-5 h-5 ${getStatusColor(selectedAppointment.status).split(' ')[1]}`} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 capitalize">{selectedAppointment.status}</p>
                                            <p className="text-sm text-gray-500">Current status</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-6">
                                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <span className="text-xs text-gray-500 block mb-1">Name</span>
                                        <span className="font-medium text-gray-900">{selectedAppointment.contact?.name || 'N/A'}</span>
                                    </div>
                                    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <span className="text-xs text-gray-500 block mb-1">Phone</span>
                                        <span className="font-medium text-gray-900">{selectedAppointment.contact?.phone || 'N/A'}</span>
                                    </div>
                                    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors md:col-span-2">
                                        <span className="text-xs text-gray-500 block mb-1">Email</span>
                                        <span className="font-medium text-gray-900">{selectedAppointment.contact?.email || 'N/A'}</span>
                                    </div>
                                    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <span className="text-xs text-gray-500 block mb-1">Gender</span>
                                        <span className="font-medium text-gray-900">{selectedAppointment.contact?.gender || 'N/A'}</span>
                                    </div>
                                    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <span className="text-xs text-gray-500 block mb-1">Date of Birth</span>
                                        <span className="font-medium text-gray-900">{selectedAppointment.contact?.dob || 'N/A'}</span>
                                    </div>
                                    {selectedAppointment.contact?.address && (
                                        <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors md:col-span-2">
                                            <span className="text-xs text-gray-500 block mb-1">Address</span>
                                            <span className="font-medium text-gray-900">{selectedAppointment.contact.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Booking Information */}
                            <div className="border-t border-gray-100 pt-6">
                                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Booking Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <span className="text-xs text-gray-500 block mb-1">Booking Type</span>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${selectedAppointment.bookingType === 'Self'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-indigo-100 text-indigo-800'
                                            }`}>
                                            {selectedAppointment.bookingType === 'Self' ? 'Myself' : 'Someone else'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <span className="text-xs text-gray-500 block mb-1">Communication Preference</span>
                                        <span className="font-medium text-gray-900">{formatCommunicationPreference(selectedAppointment.communicationPreference)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Information */}
                            <div className="border-t border-gray-100 pt-6">
                                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Payment Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <span className="text-xs text-gray-500 block mb-1">Amount</span>
                                        <span className="font-medium text-gray-900 text-lg">₦{selectedAppointment.payment?.amount?.toLocaleString() || 'N/A'}</span>
                                    </div>
                                    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <span className="text-xs text-gray-500 block mb-1">Payment Status</span>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${selectedAppointment.payment?.amount ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {selectedAppointment.payment?.amount ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>
                                    {selectedAppointment.payment?.paidAt && (
                                        <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                            <span className="text-xs text-gray-500 block mb-1">Paid At</span>
                                            <span className="font-medium text-gray-900">{new Date(selectedAppointment.payment.paidAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {selectedAppointment.payment?.paystackReference && (
                                        <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                            <span className="text-xs text-gray-500 block mb-1">Reference</span>
                                            <span className="font-medium text-gray-900 font-mono text-xs">{selectedAppointment.payment.paystackReference}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={closeDetailsModal}
                                className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedAppointment && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <RiDeleteBinLine className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Appointment?</h3>
                        <p className="text-gray-500 mb-6">
                            Are you sure you want to delete this appointment with <span className="font-medium text-gray-900">{selectedAppointment.provider_name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={cancelDelete}
                                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAppointment}
                                disabled={deleteAppointmentMutation.isPending}
                                className="flex-1 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {deleteAppointmentMutation.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 