import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MdOutlineSearch, MdArrowUpward, MdArrowDownward, MdFilterList, MdSort, MdRefresh, MdSchedule, MdCheckCircle, MdCancel, MdToday, MdEvent, MdHistory, MdClear } from 'react-icons/md';
import { 
    FaPlus, 
    FaRegClock, 
    FaHourglassHalf, 
    FaUserMd, 
    FaCopy, 
    FaCheck, 
    FaNotesMedical, 
    FaHospital, 
    FaFileInvoiceDollar, 
    FaIdCard, 
    FaUserCheck, 
    FaExclamationTriangle,
    FaClock
} from 'react-icons/fa';
import { FiEye, FiDownload } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoCheckmarkDone, IoTimeOutline } from 'react-icons/io5';
import { TiPlusOutline } from 'react-icons/ti';
import { SlHome } from 'react-icons/sl';
import { RiDeleteBinLine } from 'react-icons/ri';
import { LiaTimesCircle } from 'react-icons/lia';
import { useNavigate } from 'react-router-dom';
import { usePatientAppointments, useDeleteAppointment, Appointment } from '../../services/userService';
import { fetchPaymentReceipt, PaymentReceiptData, useInitializePayment, useConfirmAppointmentPayment } from '../../services/providerService';
import { useQueryClient } from '@tanstack/react-query';
import Pagination from '../../components/Pagination';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import logo from '/icons/Logomark (1).png';
import check from '/success.png';

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

    // Handle return from payment provider (Paystack callback)
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const reference = searchParams.get('reference') || searchParams.get('trxref');
        if (reference) {
            toast.success('Payment completed! Updating your appointments...');
            queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
            refetch();
            // Clean up query parameters from URL without reloading page
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [queryClient, refetch]);

    const deleteAppointmentMutation = useDeleteAppointment();
    const initializePaymentMutation = useInitializePayment();
    const confirmPaymentMutation = useConfirmAppointmentPayment();
    const [isPayingId, setIsPayingId] = useState<string | null>(null);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(text);
        toast.success(`${label} copied!`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // State for search, filter, sort, and pagination
    const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past' | 'today'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' = no filter
    const [sortField, setSortField] = useState<string>('date'); // Default sort by date (latest appointment first)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default desc (most recent first)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const sortDropdownRef = useRef<HTMLDivElement>(null);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
    const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);
    const [currentReceiptAppointmentId, setCurrentReceiptAppointmentId] = useState<string | null>(null);
    const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);

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

    // Helper function to extract accurate payment status
    const getPaymentInfo = (apt: any) => {
        if (!apt) return { status: 'unpaid', label: 'Unpaid', color: 'bg-red-100 text-red-800 border-red-200' };

        const rawStatus = (apt.payment?.status || apt.paymentStatus || '').toLowerCase();

        // 1. Explicitly paid or payment status is paid/completed/successful
        if (apt.isPaid === true || rawStatus === 'paid' || rawStatus === 'completed' || rawStatus === 'successful') {
            return {
                status: 'paid',
                label: 'Paid',
                color: 'bg-green-100 text-green-800 border-green-200'
            };
        }

        // 2. Pending payment
        if (rawStatus === 'pending' || (!apt.isPaid && rawStatus === 'pending') || (apt.isPaid === false && apt.paymentRequired)) {
            return {
                status: 'pending',
                label: 'Pending',
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
            };
        }

        // 3. Failed payment
        if (rawStatus === 'failed' || rawStatus === 'error') {
            return {
                status: 'failed',
                label: 'Failed',
                color: 'bg-red-100 text-red-800 border-red-200'
            };
        }

        // 4. Default / Unpaid
        return {
            status: 'unpaid',
            label: 'Unpaid',
            color: 'bg-red-100 text-red-800 border-red-200'
        };
    };

    // Helper function to extract exact payment amount from any API property
    const getAppointmentAmount = (apt: any) => {
        if (!apt) return null;
        const candidates = [
            apt.payment?.amount,
            apt.amount,
            apt.service?.price,
            apt.price,
            apt.totalAmount,
            apt.total,
            apt.fee,
            apt.formData?.amount,
            apt.formData?.price,
            apt.referral?.amount,
            apt.referral?.price,
        ];
        for (const val of candidates) {
            if (val !== undefined && val !== null && val !== '') {
                return val;
            }
        }
        return null;
    };

    const formatAmount = (val: any) => {
        if (val === undefined || val === null || val === '') return 'N/A';
        if (typeof val === 'number') return `₦${val.toLocaleString()}`;
        if (typeof val === 'string') {
            if (val.startsWith('₦') || val.startsWith('$')) return val;
            const num = Number(val);
            if (!isNaN(num)) return `₦${num.toLocaleString()}`;
            return val;
        }
        return String(val);
    };

    const appointments: Appointment[] = rawAppointments.map((apt: any) => {
        const paymentInfo = getPaymentInfo(apt);
        const bookingType = apt.bookingType || apt.contact?.bookingType || 'Self';
        const communicationPreference = apt.communicationPreference || apt.contact?.communicationPreference || 'Booker';

        return {
            ...apt,
            paymentStatus: paymentInfo.status as 'paid' | 'pending' | 'unpaid',
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

    // Helper function to safely format receipt location avoiding undefined
    const formatReceiptLocation = (receipt: PaymentReceiptData | null, targetAptId?: string | null): string => {
        if (!receipt) return 'Hospital / Facility';

        // 1. Check receipt.appointment.location
        const loc = (receipt.appointment as any)?.location;
        if (typeof loc === 'string' && loc.trim() && !loc.toLowerCase().includes('undefined') && loc !== 'null') {
            return loc.trim();
        }
        if (loc && typeof loc === 'object') {
            const parts = [loc.street, loc.city, loc.state, loc.postal_code, loc.country]
                .filter((p: any) => p && typeof p === 'string' && p.trim() && p.toLowerCase() !== 'undefined' && p.toLowerCase() !== 'null')
                .map((p: any) => p.trim());
            if (parts.length > 0) {
                return parts.join(', ');
            }
            if (loc.address && typeof loc.address === 'string' && loc.address.trim() && !loc.address.toLowerCase().includes('undefined')) {
                return loc.address.trim();
            }
            if (loc.name && typeof loc.name === 'string' && loc.name.trim() && !loc.name.toLowerCase().includes('undefined')) {
                return loc.name.trim();
            }
        }

        // 2. Fallback to matched appointment from appointments state or selectedAppointment
        const matchedApt = (targetAptId ? appointments?.find((a: any) => a.id === targetAptId) : null) ||
                           appointments?.find((a: any) => a.id === receipt.appointment?.booking_id) ||
                           selectedAppointment;

        if (matchedApt) {
            if (matchedApt.provider_name && typeof matchedApt.provider_name === 'string' && matchedApt.provider_name.trim()) {
                const prov = matchedApt.provider_name.trim();
                const addr = matchedApt.contact?.address || matchedApt.formData?.patientAddress;
                if (addr && typeof addr === 'string' && addr.trim() && !addr.toLowerCase().includes('undefined')) {
                    return `${prov}, ${addr.trim()}`;
                }
                return prov;
            }
            if (typeof matchedApt.location === 'string' && matchedApt.location.trim() && !matchedApt.location.toLowerCase().includes('undefined')) {
                return matchedApt.location.trim();
            }
            if (matchedApt.contact?.address && typeof matchedApt.contact.address === 'string' && matchedApt.contact.address.trim() && !matchedApt.contact.address.toLowerCase().includes('undefined')) {
                return matchedApt.contact.address.trim();
            }
        }

        // 3. Fallback to patient address
        if (receipt.patient?.address && typeof receipt.patient.address === 'string' && receipt.patient.address.trim() && !receipt.patient.address.toLowerCase().includes('undefined')) {
            return receipt.patient.address.trim();
        }

        return 'Hospital / Clinic Facility';
    };

    // Helper function to extract exact timestamp for latest appointment sorting
    const getAppointmentDateScore = (apt: any): number => {
        if (!apt) return 0;

        // 1. Check createdAt / created_at / bookingDate / bookedAt (when booking was made)
        const createdRaw = apt.createdAt || apt.created_at || apt.bookingDate || apt.bookedAt;
        if (createdRaw) {
            const t = new Date(createdRaw).getTime();
            if (!isNaN(t) && t > 0) return t;
        }

        // 2. Check scheduled date & start_time
        if (apt.date) {
            try {
                const d = new Date(apt.date);
                if (apt.start_time && typeof apt.start_time === 'string') {
                    const parts = apt.start_time.trim().split(' ');
                    const timePart = parts[0];
                    const period = parts[1];
                    const [hours, minutes] = timePart.split(':').map(Number);
                    let hour24 = isNaN(hours) ? 0 : hours;
                    if (period?.toLowerCase() === 'pm' && hour24 !== 12) hour24 += 12;
                    if (period?.toLowerCase() === 'am' && hour24 === 12) hour24 = 0;
                    d.setHours(hour24, isNaN(minutes) ? 0 : minutes, 0, 0);
                }
                const t = d.getTime();
                if (!isNaN(t) && t > 0) return t;
            } catch {
                // ignore
            }
        }

        // 3. Fallback to paidAt
        if (apt.payment?.paidAt) {
            const t = new Date(apt.payment.paidAt).getTime();
            if (!isNaN(t) && t > 0) return t;
        }

        return 0;
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
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter((appointment) =>
                appointment.id?.toLowerCase().includes(query) ||
                appointment.service?.name?.toLowerCase().includes(query) ||
                appointment.provider_name?.toLowerCase().includes(query) ||
                appointment.contact?.name?.toLowerCase().includes(query) ||
                appointment.contact?.email?.toLowerCase().includes(query) ||
                appointment.contact?.phone?.toLowerCase().includes(query) ||
                appointment.clinician?.name?.toLowerCase().includes(query) ||
                appointment.formData?.clinicianName?.toLowerCase().includes(query) ||
                appointment.notes?.toLowerCase().includes(query)
            );
        }

        // 3. Status filter
        if (selectedStatus !== 'all') {
            if (selectedStatus === 'rejected') {
                filtered = filtered.filter((apt) =>
                    apt.status.toLowerCase() === 'cancelled' ||
                    apt.status.toLowerCase() === 'canceled' ||
                    apt.status.toLowerCase() === 'rejected'
                );
            } else {
                filtered = filtered.filter((apt) => apt.status.toLowerCase() === selectedStatus.toLowerCase());
            }
        }

        // 4. Sorting logic: Default orders by latest appointment first
        filtered = [...filtered].sort((a, b) => {
            // Default and explicit date sort: latest appointment first
            if (sortField === 'date') {
                const aScore = getAppointmentDateScore(a);
                const bScore = getAppointmentDateScore(b);
                return sortDirection === 'desc' ? bScore - aScore : aScore - bScore;
            }

            // Sort by payment date
            if (sortField === 'paidAt') {
                const aPaidAt = a.payment?.paidAt ? new Date(a.payment.paidAt).getTime() : 0;
                const bPaidAt = b.payment?.paidAt ? new Date(b.payment.paidAt).getTime() : 0;

                if (aPaidAt > 0 && bPaidAt > 0) {
                    return sortDirection === 'desc' ? bPaidAt - aPaidAt : aPaidAt - bPaidAt;
                }
                if (aPaidAt > 0 && bPaidAt === 0) return -1;
                if (aPaidAt === 0 && bPaidAt > 0) return 1;

                const aScore = getAppointmentDateScore(a);
                const bScore = getAppointmentDateScore(b);
                return sortDirection === 'desc' ? bScore - aScore : aScore - bScore;
            }

            // Manual sort options
            if (sortField === 'service') {
                const aValue = a.service?.name || '';
                const bValue = b.service?.name || '';
                return sortDirection === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else if (sortField === 'provider') {
                const aValue = a.provider_name || '';
                const bValue = b.provider_name || '';
                return sortDirection === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else if (sortField === 'status') {
                const aStatus = a.status.toLowerCase() === 'cancelled' || a.status.toLowerCase() === 'canceled' ? 'rejected' : a.status.toLowerCase();
                const bStatus = b.status.toLowerCase() === 'cancelled' || b.status.toLowerCase() === 'canceled' ? 'rejected' : b.status.toLowerCase();
                return sortDirection === 'asc'
                    ? aStatus.localeCompare(bStatus)
                    : bStatus.localeCompare(aStatus);
            }

            // Fallback: Latest appointment first
            const aScore = getAppointmentDateScore(a);
            const bScore = getAppointmentDateScore(b);
            return bScore - aScore;
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
    const rejectedCount = appointments?.filter((apt) =>
        apt.status.toLowerCase() === 'cancelled' ||
        apt.status.toLowerCase() === 'canceled' ||
        apt.status.toLowerCase() === 'rejected'
    ).length || 0;


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
        setSortField('date');
        setSortDirection('desc');
        setCurrentPage(1);
    };

    // Check if any filters are active
    const hasActiveFilters = activeTab !== 'all' || searchTerm !== '' || selectedStatus !== 'all' || sortField !== 'date' || sortDirection !== 'desc';

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

    const handlePay = async (appointment: any) => {
        if (!appointment?.id) return;
        setIsPayingId(appointment.id);
        const toastId = toast.loading('Initializing checkout...');

        try {
            const rawAmt = getAppointmentAmount(appointment);
            const numAmount = typeof rawAmt === 'number' ? rawAmt : (rawAmt ? Number(String(rawAmt).replace(/[^0-9.]/g, '')) || undefined : undefined);

            // Option 2: Initialize Paystack checkout
            const res = await initializePaymentMutation.mutateAsync({
                appointmentId: appointment.id,
                amount: numAmount,
                email: appointment.contact?.email,
                callback_url: `${window.location.origin}/booking-history`,
            });

            if (res?.data?.authorization_url) {
                toast.success('Redirecting to checkout...', { id: toastId });
                window.location.href = res.data.authorization_url;
                return;
            }

            // Fallback: If paymentLink is available on appointment, redirect to it
            if (appointment.paymentLink) {
                toast.success('Redirecting to payment link...', { id: toastId });
                const targetUrl = appointment.paymentLink.replace(/http:\/\/(localhost|127\.0\.0\.1):517[0-9]/, window.location.origin);
                window.location.href = targetUrl;
                return;
            }

            toast.error(res?.message || 'No checkout URL returned', { id: toastId });
        } catch (err: any) {
            console.error('Payment initialization error:', err);
            // If initialize fails, check if appointment has fallback paymentLink
            if (appointment.paymentLink) {
                toast.success('Redirecting to payment link...', { id: toastId });
                const targetUrl = appointment.paymentLink.replace(/http:\/\/(localhost|127\.0\.0\.1):517[0-9]/, window.location.origin);
                window.location.href = targetUrl;
                return;
            }
            toast.error(err.response?.data?.message || 'Failed to initialize checkout', { id: toastId });
        } finally {
            setIsPayingId(null);
        }
    };

    const handleDirectConfirmPayment = async (appointment: any) => {
        if (!appointment?.id) return;
        const confirmed = window.confirm(`Confirm payment for appointment #${appointment.id}?`);
        if (!confirmed) return;

        const rawAmt = getAppointmentAmount(appointment);
        const numAmount = typeof rawAmt === 'number' ? rawAmt : (rawAmt ? Number(String(rawAmt).replace(/[^0-9.]/g, '')) || undefined : undefined);

        confirmPaymentMutation.mutate({
            appointmentId: appointment.id,
            paymentMethod: 'Card Payment',
            reference: `REF-PAY-${Date.now()}`,
            amount: numAmount,
        }, {
            onSuccess: () => {
                setSelectedAppointment((prev: any) => prev ? {
                    ...prev,
                    isPaid: true,
                    status: 'confirmed',
                    payment: {
                        ...(prev.payment || {}),
                        status: 'completed',
                        amount: numAmount,
                        method: 'Card Payment',
                        paidAt: new Date().toISOString()
                    }
                } : null);
            }
        });
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

    // Generate PDF from receipt template
    const generateReceiptPDF = async (): Promise<Blob | null> => {
        if (!receiptRef.current) return null;

        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

            const pdfBlob = pdf.output('blob');
            return pdfBlob;
        } catch (err) {
            console.error('Failed to generate receipt PDF:', err);
            return null;
        }
    };

    const handleDownloadReceipt = async (appointmentId: string) => {
        const toastId = toast.loading('Fetching receipt details...');
        setIsGeneratingReceipt(true);
        setCurrentReceiptAppointmentId(appointmentId);

        try {
            const response = await fetchPaymentReceipt(appointmentId);

            if (response.success && response.data) {
                setReceiptData(response.data);

                // Allow time for state update and rendering
                setTimeout(async () => {
                    toast.loading('Generating PDF...', { id: toastId });

                    try {
                        const pdfBlob = await generateReceiptPDF();

                        if (!pdfBlob) {
                            toast.error('Failed to generate receipt', { id: toastId });
                            return;
                        }

                        const url = URL.createObjectURL(pdfBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `ResQ-Receipt-${response.data.appointment.booking_id}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);

                        toast.success('Receipt downloaded successfully', { id: toastId });
                    } catch (genErr) {
                        console.error('PDF Generation Error:', genErr);
                        toast.error('Failed to generate PDF', { id: toastId });
                    } finally {
                        setReceiptData(null); // Clear data to hide template
                        setCurrentReceiptAppointmentId(null);
                        setIsGeneratingReceipt(false);
                    }
                }, 1000);
            } else {
                toast.error('Failed to fetch receipt details', { id: toastId });
                setCurrentReceiptAppointmentId(null);
                setIsGeneratingReceipt(false);
            }
        } catch (err) {
            console.error('Fetch Receipt Error:', err);
            toast.error('Failed to download receipt', { id: toastId });
            setCurrentReceiptAppointmentId(null);
            setIsGeneratingReceipt(false);
        }
    };

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
                        <h1 className="text-2xl md:text-3xl font-bold text-[#16202E] tracking-tight">Bookings</h1>
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
                                            { id: 'rejected', label: 'Rejected', count: rejectedCount, icon: MdCancel, color: 'text-red-600' },
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
                                            { id: 'date', label: 'Date (Latest First)' },
                                            { id: 'paidAt', label: 'Payment Date' },
                                            { id: 'service', label: 'Service' },
                                            { id: 'provider', label: 'Provider' },
                                            { id: 'status', label: 'Status' },
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
                                    <th className="text-left p-4 pl-6">Service & ID</th>
                                    <th className="text-left p-4">Provider</th>
                                    <th className="text-left p-4">Date & Time</th>
                                    <th className="text-left p-4">Patient</th>
                                    <th className="text-left p-4">Fee / Amount</th>
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
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-gray-900">{appointment.service?.name || 'Unknown Service'}</span>
                                                            <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                                #{appointment.id}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            {appointment.service?.category && (
                                                                <span className="capitalize">{appointment.service.category}</span>
                                                            )}
                                                        </div>
                                                        {(appointment.bookedByClinician || appointment.clinician || appointment.formData?.bookedByClinician) && (
                                                            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-2 py-0.5 w-fit mt-0.5">
                                                                <FaUserMd className="w-3 h-3 text-purple-600 shrink-0" />
                                                                <span className="truncate max-w-[200px]">
                                                                    Referred by {appointment.clinician?.name || appointment.formData?.clinicianName || 'Clinician'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 shrink-0">
                                                            {appointment.provider_name?.charAt(0) || 'H'}
                                                        </div>
                                                        <div className="font-medium text-gray-800 text-sm">{appointment.provider_name}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className={`font-medium text-sm ${appointmentIsToday ? 'text-blue-700 font-semibold' : 'text-gray-900'}`}>
                                                            {formatDate(appointment.date)}
                                                        </span>
                                                        <span className="text-xs text-gray-500 mt-0.5">
                                                            {appointment.start_time} - {appointment.end_time}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {appointment.contact?.name || appointment.formData?.patientName || 'N/A'}
                                                            </span>
                                                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                                                appointment.bookingType === 'Self' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
                                                            }`}>
                                                                {appointment.bookingType === 'Self' ? 'Myself' : 'Other'}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {appointment.contact?.phone || appointment.formData?.patientPhone || appointment.contact?.email || ''}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-semibold text-gray-900 text-sm">
                                                        {formatAmount(getAppointmentAmount(appointment))}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 capitalize">
                                                        {appointment.service?.price ? 'Standard Fee' : 'Consultation'}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                                                            {(appointment.status.toLowerCase() === 'cancelled' || appointment.status.toLowerCase() === 'canceled') ? 'rejected' : appointment.status}
                                                        </div>
                                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${getPaymentInfo(appointment).color}`}>
                                                            <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                                                            <span>Payment: {getPaymentInfo(appointment).label}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 pr-6">
                                                    <div className="flex items-center gap-2">
                                                        {getPaymentInfo(appointment).status !== 'paid' && (
                                                            <button
                                                                onClick={() => handlePay(appointment)}
                                                                disabled={isPayingId === appointment.id}
                                                                className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                                                                title="Pay for Appointment"
                                                            >
                                                                {isPayingId === appointment.id ? '...' : 'Pay'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleViewDetails(appointment)}
                                                            className="p-2 text-gray-400 hover:text-[#16202E] hover:bg-gray-100 rounded-lg transition-all"
                                                            title="View Details"
                                                        >
                                                            <FiEye className="w-4 h-4" />
                                                        </button>
                                                        {getPaymentInfo(appointment).status === 'paid' && (
                                                            <button
                                                                onClick={() => handleDownloadReceipt(appointment.id)}
                                                                className="p-2 text-gray-400 hover:text-[#16202E] hover:bg-gray-100 rounded-lg transition-all"
                                                                title="Download Receipt"
                                                                disabled={isGeneratingReceipt}
                                                            >
                                                                <FiDownload className="w-4 h-4" />
                                                            </button>
                                                        )}
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
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#16202E] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                    <MdEvent className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-xl font-bold text-[#16202E]">Appointment Details</h2>
                                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-0.5 text-xs font-mono text-gray-700">
                                            <span>#{selectedAppointment.id}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(selectedAppointment.id, 'Appointment ID')}
                                                className="text-gray-400 hover:text-gray-700 transition-colors ml-1"
                                                title="Copy Appointment ID"
                                            >
                                                {copiedId === selectedAppointment.id ? (
                                                    <FaCheck className="w-3 h-3 text-green-600" />
                                                ) : (
                                                    <FaCopy className="w-3 h-3" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">Complete record & clinical breakdown</p>
                                </div>
                            </div>
                            <button onClick={closeDetailsModal} className="p-2 hover:bg-gray-200/60 rounded-full transition-colors">
                                <LiaTimesCircle className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Hero Card: Service & Facility */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-2xl border border-gray-100">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 text-2xl shrink-0">
                                        🏥
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-gray-900 text-lg">{selectedAppointment.service?.name || 'Medical Service'}</h3>
                                            {selectedAppointment.service?.category && (
                                                <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 capitalize font-medium">
                                                    {selectedAppointment.service.category}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-gray-600 mt-0.5 flex items-center gap-1.5">
                                            <FaHospital className="w-3.5 h-3.5 text-gray-400" />
                                            {selectedAppointment.provider_name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex sm:flex-col items-end gap-1.5 shrink-0 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200/50">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Fee</div>
                                    <div className="text-xl font-extrabold text-[#16202E]">
                                        {formatAmount(getAppointmentAmount(selectedAppointment))}
                                    </div>
                                </div>
                            </div>

                            {/* Schedule & Status Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Time & Date */}
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <MdEvent className="w-4 h-4 text-blue-600" />
                                        Schedule & Time
                                    </h4>
                                    <div className="font-semibold text-gray-900 text-base">
                                        {new Date(selectedAppointment.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                        <FaClock className="w-3 h-3 text-gray-400" />
                                        <span>{selectedAppointment.start_time} - {selectedAppointment.end_time}</span>
                                    </div>
                                </div>

                                {/* Appointment Status */}
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <IoCheckmarkDone className="w-4 h-4 text-emerald-600" />
                                        Booking Status
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedAppointment.status)}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                                            {(selectedAppointment.status.toLowerCase() === 'cancelled' || selectedAppointment.status.toLowerCase() === 'canceled') ? 'Rejected' : selectedAppointment.status}
                                        </div>
                                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getPaymentInfo(selectedAppointment).color}`}>
                                            <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                                            <span>Payment: {getPaymentInfo(selectedAppointment).label}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5">
                                        {selectedAppointment.status.toLowerCase() === 'confirmed' ? 'Appointment is confirmed by the facility.' : 'Appointment is awaiting confirmation.'}
                                    </p>
                                </div>
                            </div>

                            {/* Referring Clinician Details (if available) */}
                            {(selectedAppointment.bookedByClinician || selectedAppointment.clinician || selectedAppointment.formData?.clinicianName) && (
                                <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-100">
                                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                        <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
                                            <FaUserMd className="w-4 h-4 text-purple-600" />
                                            Referring Clinician Details
                                        </h4>
                                        <span className="text-[11px] font-semibold bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full">
                                            Clinical Referral
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        <div className="p-2.5 bg-white rounded-lg border border-purple-100/60 shadow-xs">
                                            <span className="text-[11px] text-gray-400 block font-medium">Doctor Name</span>
                                            <span className="font-semibold text-gray-900 text-sm">
                                                {selectedAppointment.clinician?.name || selectedAppointment.formData?.clinicianName || 'Dr. Medical Clinician'}
                                            </span>
                                        </div>
                                        {(selectedAppointment.clinician?.email || selectedAppointment.formData?.clinicianEmail) && (
                                            <div className="p-2.5 bg-white rounded-lg border border-purple-100/60 shadow-xs">
                                                <span className="text-[11px] text-gray-400 block font-medium">Doctor Email</span>
                                                <span className="font-medium text-gray-900 text-sm truncate block" title={selectedAppointment.clinician?.email || selectedAppointment.formData?.clinicianEmail}>
                                                    {selectedAppointment.clinician?.email || selectedAppointment.formData?.clinicianEmail}
                                                </span>
                                            </div>
                                        )}
                                        {selectedAppointment.clinician?.phone && (
                                            <div className="p-2.5 bg-white rounded-lg border border-purple-100/60 shadow-xs">
                                                <span className="text-[11px] text-gray-400 block font-medium">Doctor Phone</span>
                                                <span className="font-medium text-gray-900 text-sm">
                                                    {selectedAppointment.clinician?.phone}
                                                </span>
                                            </div>
                                        )}
                                        {(selectedAppointment.clinician?.id || selectedAppointment.clinician_id || selectedAppointment.formData?.clinicianId) && (
                                            <div className="p-2.5 bg-white rounded-lg border border-purple-100/60 shadow-xs">
                                                <span className="text-[11px] text-gray-400 block font-medium">Clinician ID</span>
                                                <span className="font-mono text-gray-800 text-xs">
                                                    #{selectedAppointment.clinician?.id || selectedAppointment.clinician_id || selectedAppointment.formData?.clinicianId}
                                                </span>
                                            </div>
                                        )}
                                        <div className="p-2.5 bg-white rounded-lg border border-purple-100/60 shadow-xs sm:col-span-2">
                                            <span className="text-[11px] text-gray-400 block font-medium">Booking Mode</span>
                                            <span className="text-xs font-medium text-purple-800">
                                                Direct referral booked by clinician on behalf of patient
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Clinical Notes & Referral Information (if available) */}
                            {(selectedAppointment.notes || selectedAppointment.formData?.comments) && (
                                <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100">
                                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                                            <FaNotesMedical className="w-4 h-4 text-amber-600" />
                                            Clinical Notes & Referral Information
                                        </h4>
                                        {selectedAppointment.notes && (selectedAppointment.notes.toLowerCase().includes('urgent') || selectedAppointment.notes.toLowerCase().includes('emergency')) && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                                                <FaExclamationTriangle className="w-3 h-3 text-red-600" />
                                                Priority: Urgent
                                            </span>
                                        )}
                                    </div>
                                    {selectedAppointment.notes && (
                                        <div className="bg-white p-3.5 rounded-lg border border-amber-200/60 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                                            {selectedAppointment.notes}
                                        </div>
                                    )}
                                    {selectedAppointment.formData?.comments && (
                                        <div className="mt-3 bg-white p-3 rounded-lg border border-amber-200/60 text-xs text-gray-700">
                                            <span className="font-semibold text-gray-900 block mb-1">Additional Patient/Clinician Comments:</span>
                                            <p className="italic text-gray-600">{selectedAppointment.formData.comments}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Patient Profile & Visit Details */}
                            <div className="border-t border-gray-100 pt-5">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <FaIdCard className="w-4 h-4 text-gray-500" />
                                    Patient Profile & Visit Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Patient Full Name</span>
                                        <span className="font-semibold text-gray-900 text-sm">
                                            {selectedAppointment.contact?.name || selectedAppointment.formData?.patientName || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Phone Number</span>
                                        <span className="font-semibold text-gray-900 text-sm">
                                            {selectedAppointment.contact?.phone || selectedAppointment.formData?.patientPhone || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Email Address</span>
                                        <span className="font-medium text-gray-900 text-sm truncate block" title={selectedAppointment.contact?.email || selectedAppointment.formData?.patientEmail}>
                                            {selectedAppointment.contact?.email || selectedAppointment.formData?.patientEmail || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Gender</span>
                                        <span className="font-medium text-gray-900 text-sm capitalize">
                                            {selectedAppointment.contact?.gender || selectedAppointment.formData?.patientGender || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Date of Birth</span>
                                        <span className="font-medium text-gray-900 text-sm">
                                            {selectedAppointment.contact?.dob || selectedAppointment.formData?.patientDOB || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Patient History</span>
                                        {selectedAppointment.formData?.visitedBefore !== undefined ? (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                                                selectedAppointment.formData.visitedBefore
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {selectedAppointment.formData.visitedBefore ? 'Returning Patient' : 'First-time Patient'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-600 text-xs">Standard Patient</span>
                                        )}
                                    </div>
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Booking Target</span>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                            selectedAppointment.bookingType === 'Self'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-indigo-100 text-indigo-800'
                                        }`}>
                                            {selectedAppointment.bookingType === 'Self' ? 'Myself' : 'Someone else'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Communication Preference</span>
                                        <span className="font-medium text-gray-900 text-sm">
                                            {formatCommunicationPreference(selectedAppointment.communicationPreference || selectedAppointment.formData?.communicationPreference)}
                                        </span>
                                    </div>
                                    {selectedAppointment.formData?.identificationNumber && (
                                        <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                            <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Patient ID / National ID</span>
                                            <span className="font-mono text-gray-900 text-xs font-semibold">
                                                {selectedAppointment.formData.identificationNumber}
                                            </span>
                                        </div>
                                    )}
                                    {(selectedAppointment.contact?.address || selectedAppointment.formData?.patientAddress) && (
                                        <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30 sm:col-span-2 md:col-span-3">
                                            <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Address</span>
                                            <span className="font-medium text-gray-900 text-sm">
                                                {selectedAppointment.contact?.address || selectedAppointment.formData?.patientAddress}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment & Billing Breakdown */}
                            <div className="border-t border-gray-100 pt-5">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <FaFileInvoiceDollar className="w-4 h-4 text-emerald-600" />
                                    Payment & Billing Breakdown
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Total Amount</span>
                                        <span className="font-bold text-gray-900 text-base">
                                            {formatAmount(getAppointmentAmount(selectedAppointment))}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Payment Status</span>
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPaymentInfo(selectedAppointment).color}`}>
                                            {getPaymentInfo(selectedAppointment).label}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                        <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Payment Method</span>
                                        <span className="font-medium text-gray-900 text-sm">
                                            {selectedAppointment.payment?.method || selectedAppointment.payment?.paymentMethod || (getPaymentInfo(selectedAppointment).status === 'paid' ? 'Card / Online' : 'Pending')}
                                        </span>
                                    </div>
                                    {selectedAppointment.payment?.paidAt && (
                                        <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                            <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Paid At</span>
                                            <span className="font-medium text-gray-900 text-xs">
                                                {new Date(selectedAppointment.payment.paidAt).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {(selectedAppointment.payment?.paystackReference || selectedAppointment.payment?.reference) && (
                                        <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/30 sm:col-span-2">
                                            <span className="text-[11px] text-gray-400 block mb-0.5 font-medium">Payment Reference</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-gray-900 text-xs font-semibold truncate">
                                                    {selectedAppointment.payment?.paystackReference || selectedAppointment.payment?.reference}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(selectedAppointment.payment?.paystackReference || selectedAppointment.payment?.reference, 'Payment Reference')}
                                                    className="text-gray-400 hover:text-gray-700 transition-colors"
                                                    title="Copy Reference"
                                                >
                                                    {copiedId === (selectedAppointment.payment?.paystackReference || selectedAppointment.payment?.reference) ? (
                                                        <FaCheck className="w-3 h-3 text-green-600" />
                                                    ) : (
                                                        <FaCopy className="w-3 h-3" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-wrap justify-between items-center gap-3 rounded-b-2xl">
                            <div className="text-xs text-gray-400 font-mono">
                                ResQ Healthcare • Booking #{selectedAppointment.id}
                            </div>
                            <div className="flex items-center gap-3">
                                {getPaymentInfo(selectedAppointment).status !== 'paid' && (
                                    <>
                                        <button
                                            onClick={() => handlePay(selectedAppointment)}
                                            disabled={isPayingId === selectedAppointment.id}
                                            className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-xl transition-colors flex items-center gap-2 text-sm shadow-sm disabled:opacity-50"
                                        >
                                            {isPayingId === selectedAppointment.id ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Connecting...
                                                </>
                                            ) : (
                                                'Pay with Paystack'
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDirectConfirmPayment(selectedAppointment)}
                                            disabled={confirmPaymentMutation.isPending}
                                            className="px-4 py-2.5 text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 font-medium rounded-xl transition-colors text-sm disabled:opacity-50"
                                            title="Direct Payment Confirmation"
                                        >
                                            {confirmPaymentMutation.isPending ? 'Confirming...' : 'Direct Confirm'}
                                        </button>
                                    </>
                                )}
                                {getPaymentInfo(selectedAppointment).status === 'paid' && (
                                    <button
                                        onClick={() => handleDownloadReceipt(selectedAppointment.id)}
                                        disabled={isGeneratingReceipt}
                                        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-medium rounded-xl transition-colors flex items-center gap-2 text-sm"
                                    >
                                        {isGeneratingReceipt ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div> : <FiDownload className="w-4 h-4" />}
                                        Download Receipt
                                    </button>
                                )}
                                <button
                                    onClick={closeDetailsModal}
                                    className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors text-sm"
                                >
                                    Close
                                </button>
                            </div>
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
            {/* Hidden Receipt Template */}
            {receiptData && (
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    <div ref={receiptRef} className="w-[210mm] bg-white p-12 text-black font-sans">
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-gray-200 pb-6 mb-8">
                            <div className="flex items-center gap-3">
                                <img src={logo} alt="RESQ" className="w-12 h-12" />
                                <span className="text-2xl font-bold tracking-tight">RESQ</span>
                            </div>
                            <div className="text-right">
                                <h1 className="text-3xl font-bold text-gray-900">RECEIPT</h1>
                                <p className="text-gray-500 mt-1">#{receiptData.appointment.booking_id || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Date and Status */}
                        <div className="flex justify-between mb-12">
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Date Issued</p>
                                <p className="text-lg font-medium">{new Date().toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Status</p>
                                <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold mt-1">
                                    PAID
                                </span>
                            </div>
                        </div>

                        {/* Two Column Layout */}
                        <div className="flex gap-12 mb-12">
                            {/* Patient Info */}
                            <div className="flex-1">
                                <h3 className="text-gray-500 uppercase tracking-wider font-semibold text-sm mb-4 border-b pb-2">Patient Details</h3>
                                <div className="space-y-2">
                                    <p><span className="font-medium">Name:</span> {receiptData.patient.name}</p>
                                    <p><span className="font-medium">Email:</span> {receiptData.patient.email}</p>
                                    <p><span className="font-medium">Phone:</span> {receiptData.patient.mobile_number}</p>
                                </div>
                            </div>

                            {/* Appointment Info */}
                            <div className="flex-1">
                                <h3 className="text-gray-500 uppercase tracking-wider font-semibold text-sm mb-4 border-b pb-2">Appointment Details</h3>
                                <div className="space-y-2">
                                    <p><span className="font-medium">Service:</span> {receiptData.appointment.type}</p>
                                    <p><span className="font-medium">Date:</span> {new Date(receiptData.appointment.date).toLocaleDateString(undefined, {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}</p>
                                    <p><span className="font-medium">Time:</span> {receiptData.appointment.time}</p>
                                    <p><span className="font-medium">Location:</span> {formatReceiptLocation(receiptData, currentReceiptAppointmentId)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Table */}
                        <div className="mb-12">
                            <h3 className="text-gray-500 uppercase tracking-wider font-semibold text-sm mb-4">Payment Details</h3>
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-4 px-4">{receiptData.appointment.type}</td>
                                        <td className="text-right py-4 px-4">{receiptData.payment_summary.service_cost}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td className="py-4 px-4 font-bold text-right">Total</td>
                                        <td className="py-4 px-4 font-bold text-right text-xl">{receiptData.payment_summary.total}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="text-center text-gray-500 text-sm mt-20 border-t pt-8">
                            <p className="mb-2">Thank you for choosing RESQ Health.</p>
                            <p>For any inquiries, please contact us at Hello@resq.africa or +2347072779831</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 