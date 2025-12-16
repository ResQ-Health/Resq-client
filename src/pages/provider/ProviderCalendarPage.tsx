import React, { useState, useMemo, useEffect } from 'react';
import {
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  isToday
} from 'date-fns';
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaPrint, 
  FaFilter,
  FaTimes,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import { IoRefreshOutline } from 'react-icons/io5';
import { MdOutlineAccessTime, MdOutlineCalendarToday } from 'react-icons/md';
import { useProviderAppointments, ProviderAppointment } from '../../services/providerService';
import * as XLSX from 'xlsx';

// Derived Appointment Type for the UI
interface CalendarAppointment {
    id: string;
    title: string;
    service: string;
    time: string;
    endTime: string;
    date: Date;
    type: string;
    patient: {
      fullName: string;
      phone: string;
      email: string;
      dob: string;
      gender: string;
      address: string;
      identificationNumber: string;
    };
    appointmentId: string;
    status: string;
    generalInfo: {
      comments: string;
      visitedBefore: boolean;
      forWhom: string;
    };
    bookerInfo: {
      fullName: string;
      email: string;
      phone: string;
      profilePicture: {
        url: string;
      };
    };
    paymentStatus: string;
}

type ViewType = 'Day' | 'Week' | 'Month' | 'Appointments';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: CalendarAppointment | null;
  position?: { top: number; left: number } | null;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, appointment, position }) => {
  if (!isOpen || !appointment) return null;

  const initials = appointment.patient.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const isConfirmed = appointment.status.toLowerCase() === 'confirmed';

  return (
    <div
      className="fixed inset-0 z-50 bg-transparent"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed z-50 transition-all duration-200"
        style={{
          top: position?.top ?? 120,
          left: position?.left ?? 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-[420px] shadow-2xl rounded-[18px] overflow-hidden bg-white border border-gray-100 ring-1 ring-black/5 flex flex-col max-h-[85vh]">
          {/* Status banner */}
          <div className={`px-6 py-4 text-center text-white text-sm font-medium flex-shrink-0 ${
            isConfirmed ? 'bg-green-600' : 'bg-yellow-500'
          }`}>
            {isConfirmed ? 'Appointment is confirmed' : `Appointment is ${appointment.status}`}
          </div>

          {/* Main card */}
          <div className="bg-white flex flex-col flex-1 min-h-0">
            {/* Title row */}
            <div className="flex items-center justify-between px-6 py-5 flex-shrink-0 border-b border-gray-100">
              <h3 className="text-base font-semibold text-[#16202E]">Appointment Details</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="px-6 pb-6 overflow-y-auto flex-1">
            {/* Patient name row */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#E7E1FF] flex items-center justify-center text-[#16202E] font-semibold text-base">
                {initials || 'PT'}
              </div>
              <div>
                <p className="text-sm text-gray-500">Patient name</p>
                <p className="text-xl font-semibold text-[#16202E] leading-tight">
                  {appointment.patient.fullName}
                </p>
              </div>
            </div>

            {/* 3-up summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Appointment ID</p>
                <p className="text-sm font-medium text-[#16202E] truncate" title={appointment.appointmentId}>{appointment.appointmentId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Service</p>
                <p className="text-sm font-medium text-[#16202E] truncate" title={appointment.service}>{appointment.service}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Date and Time</p>
                <p className="text-sm font-medium text-[#16202E]">
                  {format(appointment.date, 'EEE, dd MMM')}
                </p>
                <p className="text-sm font-medium text-[#16202E]">
                  {appointment.time}–{appointment.endTime}
                </p>
              </div>
            </div>

            {/* Patient Information */}
            <div>
              <h4 className="text-lg font-semibold text-[#16202E] mb-4">Patient Information</h4>
              <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Full name</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.patient.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone number</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.patient.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date of birth</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.patient.dob}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm font-medium text-[#16202E] break-all">{appointment.patient.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Gender</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.patient.gender}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Address</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.patient.address}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Identification Number</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.patient.identificationNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* General Info Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-semibold text-[#16202E] mb-4">General Information</h4>
              <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Booking For</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.generalInfo.forWhom}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Visited Before</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.generalInfo.visitedBefore ? 'Yes' : 'No'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Comments</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.generalInfo.comments || 'No comments'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Payment Status</p>
                  <p className="text-sm font-medium text-[#16202E] capitalize">{appointment.paymentStatus}</p>
                </div>
              </div>
            </div>

            {/* Booker Info Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-lg font-semibold text-[#16202E] mb-4">Booker Information</h4>
              <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Full Name</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.bookerInfo.fullName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm font-medium text-[#16202E] break-all">{appointment.bookerInfo.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="text-sm font-medium text-[#16202E]">{appointment.bookerInfo.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

const AppointmentDetailsInline: React.FC<{ appointment: CalendarAppointment; className?: string }> = ({ appointment, className }) => {
    const isConfirmed = appointment.status.toLowerCase() === 'confirmed';

    return (
        <div className={`bg-gray-50 border-t border-gray-100 p-4 mt-2 rounded-b-lg animate-in fade-in slide-in-from-top-2 duration-200 ${className || '-mx-2 sm:-mx-6 sm:px-6'}`}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status & Basic Info */}
                <div>
                     <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 ${
                         isConfirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                     }`}>
                         {isConfirmed ? 'Confirmed' : appointment.status}
                     </div>
                     
                     <div className="space-y-3">
                         <div>
                             <p className="text-xs text-gray-500 uppercase tracking-wide">Appointment ID</p>
                             <p className="text-sm font-medium text-[#16202E]">{appointment.appointmentId}</p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500 uppercase tracking-wide">Service</p>
                             <p className="text-sm font-medium text-[#16202E]">{appointment.service}</p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                             <p className="text-sm font-medium text-[#16202E]">{appointment.time} - {appointment.endTime}</p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Status</p>
                             <p className="text-sm font-medium text-[#16202E] capitalize">{appointment.paymentStatus}</p>
                         </div>
                     </div>
                </div>

                {/* Patient Details */}
                <div>
                    <h4 className="text-sm font-bold text-[#16202E] mb-3">Patient Information</h4>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div>
                             <p className="text-xs text-gray-500">Full Name</p>
                             <p className="text-sm font-medium text-[#16202E]">{appointment.patient.fullName}</p>
                        </div>
                        <div>
                             <p className="text-xs text-gray-500">Phone</p>
                             <p className="text-sm font-medium text-[#16202E]">{appointment.patient.phone}</p>
                        </div>
                         <div>
                             <p className="text-xs text-gray-500">Email</p>
                             <p className="text-sm font-medium text-[#16202E] break-all">{appointment.patient.email}</p>
                        </div>
                        <div>
                             <p className="text-xs text-gray-500">DOB</p>
                             <p className="text-sm font-medium text-[#16202E]">{appointment.patient.dob}</p>
                        </div>
                        <div>
                             <p className="text-xs text-gray-500">Gender</p>
                             <p className="text-sm font-medium text-[#16202E]">{appointment.patient.gender}</p>
                        </div>
                        <div>
                             <p className="text-xs text-gray-500">ID Number</p>
                             <p className="text-sm font-medium text-[#16202E]">{appointment.patient.identificationNumber || 'N/A'}</p>
                        </div>
                        <div className="col-span-2">
                             <p className="text-xs text-gray-500">Address</p>
                             <p className="text-sm font-medium text-[#16202E]">{appointment.patient.address}</p>
                        </div>
                    </div>
                </div>
             </div>

             {/* General Info Section */}
             <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-bold text-[#16202E] mb-3">General Information</h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div>
                         <p className="text-xs text-gray-500">Booking For</p>
                         <p className="text-sm font-medium text-[#16202E]">{appointment.generalInfo.forWhom}</p>
                    </div>
                    <div>
                         <p className="text-xs text-gray-500">Visited Before</p>
                         <p className="text-sm font-medium text-[#16202E]">{appointment.generalInfo.visitedBefore ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="col-span-2">
                         <p className="text-xs text-gray-500">Comments</p>
                         <p className="text-sm font-medium text-[#16202E]">{appointment.generalInfo.comments || 'No comments'}</p>
                    </div>
                </div>
             </div>

             {/* Booker Info Section */}
             <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-bold text-[#16202E] mb-3">Booker Information</h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div>
                         <p className="text-xs text-gray-500">Full Name</p>
                         <p className="text-sm font-medium text-[#16202E]">{appointment.bookerInfo.fullName || 'N/A'}</p>
                    </div>
                    <div>
                         <p className="text-xs text-gray-500">Email</p>
                         <p className="text-sm font-medium text-[#16202E] break-all">{appointment.bookerInfo.email || 'N/A'}</p>
                    </div>
                    <div>
                         <p className="text-xs text-gray-500">Phone</p>
                         <p className="text-sm font-medium text-[#16202E]">{appointment.bookerInfo.phone || 'N/A'}</p>
                    </div>
                </div>
             </div>
        </div>
    );
};


const ProviderCalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('Month');
  
  // Pagination State for List View
  const [listPage, setListPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Expansion State
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);

  // Modal State (Restored for Month/Week views)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null);

  // Refresh animation state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'pending', 'confirmed', 'completed', 'cancelled'
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Determine query params based on view
  const isListView = view === 'Appointments';
  const queryPage = isListView ? listPage : 1;
  const queryLimit = isListView ? ITEMS_PER_PAGE : 1000;

  // Fetch Appointments
  const { data: appointmentsData, refetch, isLoading, isRefetching } = useProviderAppointments(queryPage, queryLimit);

  // Transform API data to CalendarAppointment format and apply filters
  const appointments = useMemo<CalendarAppointment[]>(() => {
    if (!appointmentsData?.data) return [];
    
    let filtered = appointmentsData.data
      .map((apt: ProviderAppointment) => {
        const isOther = apt.formData?.forWhom === 'Other';
        // If booking for "Other", use formData patient details, otherwise use root/account details
        const patientName = isOther ? apt.formData?.patientName : apt.patient_name;
        const patientEmail = isOther ? apt.formData?.patientEmail : apt.patient_email;
        const patientPhone = isOther ? apt.formData?.patientPhone : apt.patient_phone;
        const patientAddress = isOther ? apt.formData?.patientAddress : apt.patient_address;
        const patientGender = isOther ? apt.formData?.patientGender : apt.patient_gender;
        const patientDOB = isOther ? apt.formData?.patientDOB : apt.patient_dob;

        return {
            id: apt.id,
            title: apt.service_name,
            service: apt.service_name,
            time: apt.start_time,
            endTime: apt.end_time,
            date: parseISO(apt.appointment_date),
            type: 'medical', 
            patient: {
                fullName: patientName || 'Unknown Patient',
                phone: patientPhone || '',
                email: patientEmail || '',
                dob: patientDOB || '',
                gender: patientGender || '',
                address: patientAddress || '',
                identificationNumber: apt.formData?.identificationNumber || '',
            },
            appointmentId: apt.id,
            status: (apt.status || 'pending').charAt(0).toUpperCase() + (apt.status || 'pending').slice(1),
            generalInfo: {
                comments: apt.formData?.comments || apt.notes || '',
                visitedBefore: apt.formData?.visitedBefore || false,
                forWhom: apt.formData?.forWhom || 'Self',
            },
            bookerInfo: {
                fullName: apt.patient_name || '', // Assuming root fields are booker/account holder
                email: apt.patient_email || '',
                phone: apt.patient_phone || '',
                profilePicture: {
                url: '', // Not provided in new API response
                },
            },
            paymentStatus: apt.payment?.status || 'pending',
        };
    });

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(apt => apt.status.toLowerCase() === filterStatus.toLowerCase());
    }

    // Apply date range filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter(apt => apt.date >= fromDate);
    }

    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(apt => apt.date <= toDate);
    }

    return filtered;
  }, [appointmentsData, filterStatus, filterDateFrom, filterDateTo]);

  const navigate = (direction: 'prev' | 'next') => {
    if (view === 'Month') {
      setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    } else if (view === 'Week') {
      setCurrentDate(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    } else if (view === 'Day') {
      setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    // Min timeout to show the spinner briefly even if fetch is instant
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handlePrint = () => {
    // Close modal and collapse expansions
    setIsModalOpen(false);
    setExpandedAppointmentId(null);
    setIsFilterOpen(false);
    
    // Prepare table data
    const tableData = appointments
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(apt => ({
        'Date': format(apt.date, 'MMM d, yyyy'),
        'Time': apt.time,
        'Patient Name': apt.patient.fullName,
        'Patient Phone': apt.patient.phone,
        'Patient Email': apt.patient.email,
        'Patient DOB': apt.patient.dob,
        'Patient Gender': apt.patient.gender,
        'Patient Address': apt.patient.address,
        'ID Number': apt.patient.identificationNumber,
        'Service': apt.service,
        'Status': apt.status,
        'Payment Status': apt.paymentStatus,
        'Booking For': apt.generalInfo.forWhom,
        'Visited Before': apt.generalInfo.visitedBefore ? 'Yes' : 'No',
        'Comments': apt.generalInfo.comments,
        'Booker Name': apt.bookerInfo.fullName,
        'Booker Email': apt.bookerInfo.email,
        'Booker Phone': apt.bookerInfo.phone,
        'Appointment ID': apt.appointmentId,
      }));
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(tableData);
    
    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 12 }, // Time
      { wch: 25 }, // Patient Name
      { wch: 15 }, // Patient Phone
      { wch: 30 }, // Patient Email
      { wch: 12 }, // Patient DOB
      { wch: 10 }, // Patient Gender
      { wch: 30 }, // Patient Address
      { wch: 15 }, // ID Number
      { wch: 20 }, // Service
      { wch: 12 }, // Status
      { wch: 15 }, // Payment Status
      { wch: 12 }, // Booking For
      { wch: 12 }, // Visited Before
      { wch: 30 }, // Comments
      { wch: 25 }, // Booker Name
      { wch: 30 }, // Booker Email
      { wch: 15 }, // Booker Phone
      { wch: 20 }, // Appointment ID
    ];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Appointments');
    
    // Generate filename
    const dateRange = view === 'Day' 
      ? format(currentDate, 'yyyy-MM-dd')
      : format(currentDate, 'yyyy-MM');
    const filename = `appointments-${dateRange}-${view.toLowerCase()}.xlsx`;
    
    // Save Excel file
    XLSX.writeFile(wb, filename);
  };

  const handleFilterApply = () => {
    setIsFilterOpen(false);
    // Filters are applied in the useMemo below
  };

  const handleFilterReset = () => {
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setIsFilterOpen(false);
  };

  const toggleExpansion = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedAppointmentId(prev => prev === id ? null : id);
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Generate calendar grid days
  let calendarDays: Date[] = [];
  if (view === 'Month') {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  } else if (view === 'Week') {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
    calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  } else if (view === 'Day') {
    calendarDays = [currentDate];
  }

  const getDayAppointments = (date: Date) => {
    return appointments.filter(apt => isSameDay(apt.date, date));
  };

  const handleShowMore = (e: React.MouseEvent, day: Date) => {
      e.stopPropagation();
      setSelectedDate(day);
      setView('Day');
      setCurrentDate(day);
  };

  const handleAppointmentClick = (e: React.MouseEvent<HTMLDivElement>, apt: CalendarAppointment) => {
    e.stopPropagation();

    // If Day view or List view, use expansion (inline) logic
    if (view === 'Day') {
        toggleExpansion(e as any, apt.id);
        return;
    }

    // If Month or Week view, use Modal logic
    const rect = e.currentTarget.getBoundingClientRect();
    const MODAL_W = 420;
    const MAX_MODAL_H = window.innerHeight * 0.85; // 85% of viewport height
    const GAP = 12;
    const PADDING = 24; // Padding from viewport edges
    const BOTTOM_PADDING = 60; // Extra padding from bottom to prevent it from resting at bottom

    // Viewport dimensions
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Initial position preference: To the right of the element
    let left = rect.right + GAP;
    let top = rect.top;

    // 1. Check Horizontal Space
    if (left + MODAL_W > vw - PADDING) {
      const leftOption = rect.left - GAP - MODAL_W;
      if (leftOption > PADDING) {
        left = leftOption;
      } else {
        // Center horizontally if it doesn't fit on either side
        left = (vw - MODAL_W) / 2;
      }
    }

    // 2. Check Vertical Space - ensure modal fits within viewport with extra bottom padding
    // Try to position near the clicked element, but ensure it's fully visible
    if (top + MAX_MODAL_H > vh - BOTTOM_PADDING) {
      // If it would overflow bottom, position it higher with extra bottom padding
      top = vh - MAX_MODAL_H - BOTTOM_PADDING;
    }
    // Ensure it doesn't go above viewport
    top = Math.max(PADDING, top);
    
    // If still too tall, center it vertically but with preference to move up
    if (top + MAX_MODAL_H > vh - BOTTOM_PADDING) {
      // Center but bias upward by subtracting some offset
      const centerY = (vh - MAX_MODAL_H) / 2;
      top = Math.max(PADDING, centerY - 40); // Move up 40px from center
    }

    setModalPosition({ top, left });
    setSelectedAppointment(apt);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setModalPosition(null);
  };

  // Pagination Handlers
  const totalPages = appointmentsData?.pagination?.pages || 1;
  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setListPage(newPage);
          setExpandedAppointmentId(null); // Reset expansion on page change
      }
  };

  // Close filter dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isFilterOpen && !target.closest('.relative')) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFilterOpen]);

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] space-y-6 pt-6">

      <div className="px-8 pb-8 flex-1 flex flex-col">
          {/* Calendar Controls */}
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xl font-semibold text-[#16202E] min-w-[140px]">
                {view === 'Day' 
                  ? format(currentDate, 'MMMM d, yyyy')
                  : format(currentDate, 'MMMM yyyy')
                }
              </span>
              <div className="flex items-center gap-2">
                <button 
                    onClick={() => navigate('prev')}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                    <FaChevronLeft size={14} className="text-gray-600" />
                </button>
                <button 
                    onClick={() => navigate('next')}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                    <FaChevronRight size={14} className="text-gray-600" />
                </button>
                <button 
                    onClick={handleToday}
                    className="ml-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-[#16202E] rounded transition-colors font-medium"
                >
                    Today
                </button>
              </div>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-lg">
              {(['Day', 'Week', 'Month', 'Appointments'] as ViewType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    view === v 
                      ? 'bg-white text-[#16202E] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-[#16202E] transition-colors" 
                title="Refresh"
                disabled={isRefreshing || isLoading || isRefetching}
              >
                <IoRefreshOutline 
                    size={20} 
                    className={isRefreshing || isLoading || isRefetching ? 'animate-spin text-[#16202E]' : ''} 
                />
              </button>
              <div className="relative">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#16202E] transition-colors"
                  title="Export to Excel"
                >
                <FaPrint size={14} />
                  Export
              </button>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    filterStatus !== 'all' || filterDateFrom || filterDateTo
                      ? 'text-[#16202E] font-semibold'
                      : 'text-gray-600 hover:text-[#16202E]'
                  }`}
                >
                <FaFilter size={12} />
                Filter
                  {(filterStatus !== 'all' || filterDateFrom || filterDateTo) && (
                    <span className="w-2 h-2 bg-[#06202E] rounded-full"></span>
                  )}
                </button>
                
                {/* Filter Dropdown */}
                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                        <input
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                        <input
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleFilterApply}
                          className="flex-1 px-4 py-2 bg-[#06202E] text-white rounded-md text-sm font-medium hover:bg-[#051a26] transition-colors"
                        >
                          Apply
                        </button>
                        <button
                          onClick={handleFilterReset}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          Reset
              </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calendar Grid or List */}
          {view === 'Appointments' ? (
             <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200">
                <div className="flex-1 overflow-y-auto">
                    <div className="min-w-full">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 border-b border-gray-100 bg-gray-50 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 z-10">
                        <div className="col-span-3">Patient</div>
                        <div className="col-span-3">Service</div>
                        <div className="col-span-3">Date & Time</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-1"></div>
                    </div>
                    
                    {/* Appointments List */}
                    {isLoading ? (
                         <div className="flex justify-center py-20">
                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                         </div>
                    ) : appointments.length > 0 ? (
                        appointments
                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                        .map((apt) => {
                        const isExpanded = expandedAppointmentId === apt.id;
                        return (
                            <div 
                                key={apt.id}
                                className={`border-b border-gray-100 transition-colors ${isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                            >
                                <div 
                                    onClick={(e) => toggleExpansion(e, apt.id)}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer items-center"
                                >
                                    <div className="col-span-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#E7E1FF] flex items-center justify-center text-[#16202E] font-medium text-xs">
                                        {(apt.patient.fullName || 'PT').substring(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[#16202E]">{apt.patient.fullName}</p>
                                        <p className="text-xs text-gray-500">{apt.patient.phone}</p>
                                    </div>
                                    </div>
                                    <div className="col-span-3 text-sm text-gray-700 font-medium">
                                    {apt.service}
                                    </div>
                                    <div className="col-span-3">
                                    <p className="text-sm text-[#16202E]">{format(apt.date, 'MMM d, yyyy')}</p>
                                    <p className="text-xs text-gray-500">{apt.time} - {apt.endTime}</p>
                                    </div>
                                    <div className="col-span-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        apt.status.toLowerCase() === 'confirmed' ? 'bg-green-100 text-green-800' :
                                        apt.status.toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {apt.status}
                                    </span>
                                    </div>
                                    <div className="col-span-1 text-right">
                                    <button className="text-gray-400 hover:text-[#16202E]">
                                        {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                    </button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="px-6 pb-4">
                                        <AppointmentDetailsInline appointment={apt} />
                                    </div>
                                )}
                            </div>
                        );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <MdOutlineCalendarToday size={48} className="mb-4 text-gray-300" />
                        <p>No appointments found.</p>
                        </div>
                    )}
                    </div>
                </div>
                
                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Page <span className="font-medium">{listPage}</span> of <span className="font-medium">{totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePageChange(listPage - 1)}
                            disabled={listPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handlePageChange(listPage + 1)}
                            disabled={listPage === totalPages}
                            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
             </div>
          ) : (
          <div className="flex-1 bg-transparent flex flex-col min-h-0">
            {/* Days Header */}
              {view !== 'Day' && (
            <div className="grid grid-cols-7 gap-4 mb-4">
              {daysOfWeek.map(day => (
                <div key={day} className="text-sm font-medium text-gray-500 pl-1">
                  {day}
                </div>
              ))}
            </div>
              )}

            {/* Days Grid */}
              <div className={`grid gap-4 auto-rows-fr flex-1 ${
                view === 'Day' ? 'grid-cols-1' : 'grid-cols-7'
              }`}>
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = isSameDay(day, selectedDate);
                  const isCurrentDay = isToday(day);
                const dayApts = getDayAppointments(day);

                  // Determine visible appointments
                  const MAX_VISIBLE = view === 'Month' ? 2 : 100;
                  const visibleApts = view === 'Day' ? dayApts : dayApts.slice(0, MAX_VISIBLE);
                  const hiddenCount = dayApts.length - visibleApts.length;

                return (
                  <div 
                    key={day.toString()} 
                    onClick={() => setSelectedDate(day)}
                      className={`rounded-xl p-3 flex flex-col border border-transparent cursor-pointer transition-colors overflow-hidden ${
                        view === 'Day' 
                           ? 'bg-white h-full' 
                           : !isCurrentMonth ? 'bg-gray-100' : 'bg-white hover:border-gray-200 min-h-[140px]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span 
                        className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                            isCurrentDay
                              ? 'bg-[#06202E] text-white' 
                              : isSelected && view !== 'Day'
                                ? 'bg-gray-200 text-[#16202E]' 
                            : !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                        {view === 'Day' && (
                          <span className="text-sm text-gray-500 font-medium">{format(day, 'EEEE')}</span>
                        )}
                    </div>

                      <div className={`flex flex-col gap-1.5 flex-1 ${view === 'Day' ? 'overflow-y-auto' : ''}`}>
                        {visibleApts.length > 0 ? (
                            <>
                            {visibleApts.map((apt) => {
                              const isExpanded = expandedAppointmentId === apt.id && view === 'Day';
                              return (
                        <div 
                          key={apt.id}
                          onClick={(e) => handleAppointmentClick(e, apt)}
                                  className={`flex flex-col px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors cursor-pointer border-l-4 ${
                                    apt.status.toLowerCase() === 'confirmed' ? 'border-l-green-500' : 'border-l-yellow-500'
                                  } ${!isCurrentMonth && view !== 'Day' ? 'bg-white' : 'bg-[#F6F8FA]'}`}
                                >
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-[11px] font-semibold text-[#16202E]">{apt.time}</span>
                                    {view === 'Day' && (
                                        <span className="text-gray-400">
                                            {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                                        </span>
                                    )}
                                  </div>
                                  <span className="text-[12px] text-[#16202E] font-medium leading-tight truncate">
                                    {apt.service}
                                  </span>
                                  {view === 'Day' && (
                                    <>
                                        <span className="text-[11px] text-gray-500 mt-1">
                                            Patient: {apt.patient.fullName}
                          </span>
                                        
                                        {isExpanded && (
                                            <div onClick={e => e.stopPropagation()}>
                                                <AppointmentDetailsInline 
                                                    appointment={apt} 
                                                    className="-mx-2 mt-3 rounded-none border-t border-gray-200 bg-gray-50"
                                                />
                                            </div>
                                        )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          {hiddenCount > 0 && (
                            <div 
                                onClick={(e) => handleShowMore(e, day)}
                                className="text-xs text-gray-500 hover:text-[#16202E] font-medium px-2 py-1 cursor-pointer hover:bg-gray-100 rounded"
                            >
                                +{hiddenCount} more
                            </div>
                          )}
                          </>
                        ) : view === 'Day' ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                            <p>No appointments for this day</p>
                        </div>
                        ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
      </div>

      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        appointment={selectedAppointment}
        position={modalPosition}
      />
    </div>
  );
};

export default ProviderCalendarPage;
