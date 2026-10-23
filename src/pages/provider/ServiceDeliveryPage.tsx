import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  useProviderAppointments,
  useUpdateAppointmentDeliveryStatus,
  ProviderAppointment,
  TrackingStep,
} from '../../services/providerService';
import { format } from 'date-fns';
import {
  FaCheck,
  FaArrowRight,
  FaSpinner,
  FaHistory,
  FaSearch,
  FaTimes,
  FaPhoneAlt,
  FaCalendarAlt,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaThList,
  FaThLarge,
  FaDownload,
  FaEnvelope,
  FaIdCard,
} from 'react-icons/fa';
import {
  MdOutlineTimeline,
  MdOutlineRefresh,
  MdOutlineAssignmentTurnedIn,
  MdPendingActions,
  MdBiotech,
  MdOutlineFactCheck,
  MdOutlineCheckCircle,
} from 'react-icons/md';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const getDeliveryStatusLabel = (status: string) => {
  const s = (status || '').toLowerCase().replace(/_/g, '-');
  switch (s) {
    case 'scheduled':
    case 'confirmed':
      return 'Scheduled';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'report-processing':
      return 'Report Processing';
    case 'report-ready':
      return 'Report Ready';
    case 'report-delivered':
      return 'Report Delivered';
    case 'no-show':
      return 'No Show';
    case 'cancelled':
    case 'canceled':
      return 'Cancelled';
    case 'rejected':
      return 'Rejected';
    case 'pending':
      return 'Booking Requested';
    case 'accepted':
      return 'Accepted';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Scheduled';
  }
};

export const getDeliveryStatusColor = (status: string) => {
  const s = (status || '').toLowerCase().replace(/_/g, '-');
  switch (s) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'confirmed':
    case 'accepted':
    case 'scheduled':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'in-progress':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'report-processing':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'report-ready':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'report-delivered':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'pending':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'cancelled':
    case 'canceled':
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'no-show':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const LINEAR_STAGES = [
  { key: 'scheduled', label: 'Scheduled', shortLabel: 'Scheduled', actionLabel: 'Schedule' },
  { key: 'in-progress', label: 'In Progress', shortLabel: 'Exam Active', actionLabel: 'Start Exam' },
  { key: 'completed', label: 'Completed Exam', shortLabel: 'Exam Done', actionLabel: 'Complete Scan' },
  { key: 'report-processing', label: 'Report Processing', shortLabel: 'Processing', actionLabel: 'Send to Lab' },
  { key: 'report-ready', label: 'Report Ready', shortLabel: 'Report Ready', actionLabel: 'Mark Ready' },
  { key: 'report-delivered', label: 'Report Delivered', shortLabel: 'Delivered', actionLabel: 'Deliver Report' },
];

export interface PatientDetailInfo {
  name: string;
  phone: string;
  email: string;
  dob?: string;
  gender?: string;
  address?: string;
  identificationNumber?: string;
  isOther: boolean;
  bookerName?: string;
  comments?: string;
}

export const extractPatientDetails = (apt: ProviderAppointment): PatientDetailInfo => {
  const isOther = apt.formData?.forWhom === 'Other';

  // Resolving Patient Name
  // 1. Explicitly entered in Patient Details formData
  // 2. Root patient_name returned by server
  // 3. Nested patient object full_name
  // 4. Nested personal_details first/last name
  // 5. Fallback
  const explicitFormName = apt.formData?.patientName?.trim();
  const rootPatientName = apt.patient_name?.trim();
  const nestedFullName = apt.patient?.full_name?.trim();
  const personalName = `${apt.patient?.personal_details?.first_name || ''} ${apt.patient?.personal_details?.last_name || ''}`.trim();
  const anyName = (apt.patient as any)?.name?.trim() || (apt as any).patientName?.trim();

  let name = 'Patient';
  if (explicitFormName) {
    name = explicitFormName;
  } else if (rootPatientName) {
    name = rootPatientName;
  } else if (nestedFullName) {
    name = nestedFullName;
  } else if (personalName) {
    name = personalName;
  } else if (anyName) {
    name = anyName;
  }

  // Booker name (if booked for other and root patient_name is different from patient name)
  let bookerName: string | undefined = undefined;
  if (isOther && rootPatientName && rootPatientName.toLowerCase() !== name.toLowerCase()) {
    bookerName = rootPatientName;
  }

  // Phone
  const phone =
    apt.formData?.patientPhone?.trim() ||
    apt.patient_phone?.trim() ||
    apt.patient?.contact_details?.phone_number?.trim() ||
    apt.patient?.phone_number?.trim() ||
    '';

  // Email
  const email =
    apt.formData?.patientEmail?.trim() ||
    apt.patient_email?.trim() ||
    apt.patient?.contact_details?.email_address?.trim() ||
    apt.patient?.email?.trim() ||
    '';

  // Date of Birth
  const dob =
    apt.formData?.patientDOB?.trim() ||
    apt.patient_dob?.trim() ||
    apt.patient?.personal_details?.date_of_birth?.trim() ||
    '';

  // Gender
  const gender =
    apt.formData?.patientGender?.trim() ||
    apt.patient_gender?.trim() ||
    apt.patient?.personal_details?.gender?.trim() ||
    '';

  // Address
  const address =
    apt.formData?.patientAddress?.trim() ||
    apt.patient_address?.trim() ||
    (apt.patient?.location_details
      ? `${apt.patient.location_details.address || ''}, ${apt.patient.location_details.city || ''}`.replace(/^,\s*|,\s*$/g, '')
      : '') ||
    '';

  // Identification Number
  const identificationNumber =
    apt.formData?.identificationNumber?.trim() ||
    (apt.patient as any)?.metadata?.identification_number?.trim() ||
    '';

  // Comments / Notes
  const comments = apt.formData?.comments?.trim() || '';

  return {
    name,
    phone,
    email,
    dob,
    gender,
    address,
    identificationNumber,
    isOther,
    bookerName,
    comments,
  };
};

export const getInitials = (name: string): string => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'PT';
};

export const ServiceDeliveryPage: React.FC = () => {
  // Real-time automatic background synchronization (3s polling interval)
  const { data: appointmentsData, isLoading, refetch, isRefetching } = useProviderAppointments(
    1,
    1000,
    {
      refetchInterval: 3000,
      staleTime: 1000,
    }
  );
  const updateDeliveryStatusMutation = useUpdateAppointmentDeliveryStatus();

  // View state: 'card' vs 'table'
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Filters
  const [selectedStageTab, setSelectedStageTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'tomorrow'>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Modal State for custom updates & audit logs
  const [activeModalAppointment, setActiveModalAppointment] = useState<ProviderAppointment | null>(null);
  const [manualTargetStage, setManualTargetStage] = useState<string>('');
  const [manualNote, setManualNote] = useState<string>('');

  // Normalize raw appointments list
  const rawList: ProviderAppointment[] = useMemo(() => {
    if (!appointmentsData?.data) return [];
    return appointmentsData.data;
  }, [appointmentsData]);

  // Compute counts for top operational KPI cards
  const stats = useMemo(() => {
    let total = 0;
    let pendingRequests = 0;
    let scheduled = 0;
    let inProgress = 0;
    let reportProcessing = 0;
    let reportReady = 0;
    let delivered = 0;
    let cancelled = 0;

    rawList.forEach((apt) => {
      const s = (apt.status || 'scheduled').toLowerCase().replace(/_/g, '-');
      total++;
      if (s === 'pending') pendingRequests++;
      else if (s === 'scheduled' || s === 'confirmed') scheduled++;
      else if (s === 'in-progress') inProgress++;
      else if (s === 'report-processing' || s === 'completed') reportProcessing++;
      else if (s === 'report-ready') reportReady++;
      else if (s === 'report-delivered') delivered++;
      else if (s === 'cancelled' || s === 'canceled' || s === 'rejected' || s === 'no-show') cancelled++;
    });

    return { total, pendingRequests, scheduled, inProgress, reportProcessing, reportReady, delivered, cancelled };
  }, [rawList]);

  // Handle Quick Date Presets
  const handleDatePreset = (preset: 'all' | 'today' | 'tomorrow') => {
    setDatePreset(preset);
    setCurrentPage(1);
    if (preset === 'all') {
      setDateFilter('');
    } else if (preset === 'today') {
      setDateFilter(new Date().toISOString().split('T')[0]);
    } else if (preset === 'tomorrow') {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      setDateFilter(tmrw.toISOString().split('T')[0]);
    }
  };

  // Reset to page 1 when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStageTab, dateFilter, itemsPerPage]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return rawList.filter((apt) => {
      const status = (apt.status || 'scheduled').toLowerCase().replace(/_/g, '-');
      const normalizedStatus = 
        status === 'confirmed' ? 'scheduled' : 
        status === 'completed' ? 'report-processing' : 
        status;

      // Tab filter
      if (selectedStageTab === 'active') {
        if (['report-delivered', 'cancelled', 'rejected', 'no-show', 'pending'].includes(normalizedStatus)) {
          return false;
        }
      } else if (selectedStageTab === 'pending') {
        if (normalizedStatus !== 'pending') return false;
      } else if (selectedStageTab !== 'all') {
        if (normalizedStatus !== selectedStageTab) return false;
      }

      // Date filter
      if (dateFilter) {
        const aptDate = apt.appointment_date ? new Date(apt.appointment_date).toISOString().split('T')[0] : '';
        if (aptDate !== dateFilter) return false;
      }

      // Search query (patient name, service name, id, phone, email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const p = extractPatientDetails(apt);
        const patientSearchStr = `${p.name} ${p.bookerName || ''} ${apt.patient_name || ''} ${apt.formData?.patientName || ''}`.toLowerCase();
        const serviceName = (apt.service?.name || apt.formData?.serviceName || apt.service_name || '').toLowerCase();
        const id = (apt.id || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const email = (p.email || '').toLowerCase();

        return (
          patientSearchStr.includes(q) ||
          serviceName.includes(q) ||
          id.includes(q) ||
          phone.includes(q) ||
          email.includes(q)
        );
      }

      return true;
    });
  }, [rawList, selectedStageTab, dateFilter, searchQuery]);

  // Paginated Slices
  const totalItems = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAppointments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAppointments, currentPage, itemsPerPage]);

  // Quick Advance Stage
  const handleQuickAdvance = async (apt: ProviderAppointment, targetStage: string, customNote?: string) => {
    try {
      await updateDeliveryStatusMutation.mutateAsync({
        id: apt.id,
        status: targetStage,
        note: customNote || `Advanced stage to ${getDeliveryStatusLabel(targetStage)}`,
      });
    } catch (_) {}
  };

  // Manual Update Submit from Modal
  const handleManualSubmit = async () => {
    if (!activeModalAppointment || !manualTargetStage) return;
    const aptId = activeModalAppointment.id;
    const targetStage = manualTargetStage;
    const note = manualNote.trim() || undefined;
    setManualNote('');
    setManualTargetStage('');
    setActiveModalAppointment(null);
    try {
      await updateDeliveryStatusMutation.mutateAsync({
        id: aptId,
        status: targetStage,
        note,
      });
    } catch (_) {}
  };

  // Helper to get next logical stage
  const getNextStage = (currentStatusRaw: string) => {
    const s = currentStatusRaw.toLowerCase().replace(/_/g, '-');
    const cur = s === 'confirmed' ? 'scheduled' : s;

    if (cur === 'pending') return { key: 'scheduled', label: 'Accept Booking' };
    if (cur === 'scheduled') return { key: 'in-progress', label: 'Start Exam' };
    if (cur === 'in-progress') return { key: 'completed', label: 'Complete Scan' };
    if (cur === 'completed') return { key: 'report-processing', label: 'Send to Lab' };
    if (cur === 'report-processing') return { key: 'report-ready', label: 'Mark Ready' };
    if (cur === 'report-ready') return { key: 'report-delivered', label: 'Deliver Report' };
    return null;
  };

  // Export Filtered Table to CSV
  const handleExportCSV = () => {
    if (filteredAppointments.length === 0) return;
    const headers = ['Booking ID', 'Patient Name', 'Phone', 'Email', 'Service', 'Date', 'Time', 'Status', 'Payment'];
    const rows = filteredAppointments.map((apt) => {
      const p = extractPatientDetails(apt);
      return [
        apt.id,
        `"${p.name}"`,
        p.phone || '',
        p.email || '',
        `"${apt.service?.name || apt.formData?.serviceName || apt.service_name || 'Service'}"`,
        apt.appointment_date ? format(new Date(apt.appointment_date), 'yyyy-MM-dd') : '',
        apt.start_time || '',
        getDeliveryStatusLabel(apt.status || 'scheduled'),
        apt.payment?.status || 'pending',
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `service_delivery_runsheet_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && rawList.length === 0) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner />
        <p className="text-sm font-semibold text-[#06202E]">Loading live clinical delivery pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. EXECUTIVE OPERATIONAL HEADER */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              <span>Clinical Operations</span>
              <span>•</span>
              <span className="text-[#06202E] font-bold">Diagnostic Delivery Pipeline</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#06202E] text-white flex items-center justify-center shrink-0 shadow-sm">
                <MdOutlineTimeline size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#06202E] tracking-tight">
                  Service Delivery Pipeline
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Real-time lifecycle tracking: patient reception, scan progress, clinical diagnostics, and report delivery.
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Center */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Manual Refresh */}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              title="Force instant refresh"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200/90 hover:bg-gray-50 text-xs font-semibold text-[#06202E] rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <MdOutlineRefresh size={15} className={isRefetching ? 'animate-spin text-blue-600' : 'text-gray-600'} />
              <span>{isRefetching ? 'Syncing…' : 'Refresh'}</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredAppointments.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200/90 hover:bg-gray-50 text-xs font-semibold text-gray-700 rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-40"
              title="Download filtered run sheet as CSV"
            >
              <FaDownload className="w-3 h-3 text-gray-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL MILESTONE BAROMETER (KPI STRIP) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Scheduled / Check-In */}
        <button
          type="button"
          onClick={() => setSelectedStageTab('scheduled')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStageTab === 'scheduled'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-blue-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Scheduled</span>
            <span className="p-1 rounded-lg bg-blue-100/70 text-blue-700">
              <FaCalendarAlt size={12} />
            </span>
          </div>
          <p className="text-2xl font-black text-[#06202E]">{stats.scheduled}</p>
          <span className="text-[11px] text-gray-400 font-medium">Awaiting arrival</span>
        </button>

        {/* KPI 2: In Progress */}
        <button
          type="button"
          onClick={() => setSelectedStageTab('in-progress')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStageTab === 'in-progress'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-amber-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">In Progress</span>
            <span className="p-1 rounded-lg bg-amber-100/70 text-amber-700">
              <MdPendingActions size={14} />
            </span>
          </div>
          <p className="text-2xl font-black text-amber-700">{stats.inProgress}</p>
          <span className="text-[11px] text-amber-600 font-medium">Active exam</span>
        </button>

        {/* KPI 3: Scan / Lab Processing */}
        <button
          type="button"
          onClick={() => setSelectedStageTab('report-processing')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStageTab === 'report-processing'
              ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-indigo-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Processing</span>
            <span className="p-1 rounded-lg bg-indigo-100/70 text-indigo-700">
              <MdBiotech size={14} />
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-700">{stats.reportProcessing}</p>
          <span className="text-[11px] text-indigo-600 font-medium">Lab &amp; analysis</span>
        </button>

        {/* KPI 4: Report Ready */}
        <button
          type="button"
          onClick={() => setSelectedStageTab('report-ready')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStageTab === 'report-ready'
              ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-purple-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Report Ready</span>
            <span className="p-1 rounded-lg bg-purple-100/70 text-purple-700">
              <MdOutlineFactCheck size={14} />
            </span>
          </div>
          <p className="text-2xl font-black text-purple-700">{stats.reportReady}</p>
          <span className="text-[11px] text-purple-600 font-medium">Ready to dispatch</span>
        </button>

        {/* KPI 5: Delivered */}
        <button
          type="button"
          onClick={() => setSelectedStageTab('report-delivered')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStageTab === 'report-delivered'
              ? 'bg-teal-50/80 border-teal-300 ring-2 ring-teal-500/20 shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-teal-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Delivered</span>
            <span className="p-1 rounded-lg bg-teal-100/70 text-teal-700">
              <MdOutlineAssignmentTurnedIn size={14} />
            </span>
          </div>
          <p className="text-2xl font-black text-teal-700">{stats.delivered}</p>
          <span className="text-[11px] text-teal-600 font-medium">Complete visits</span>
        </button>

        {/* KPI 6: Pending Requests / Booking Requests Alert */}
        <button
          type="button"
          onClick={() => setSelectedStageTab('pending')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedStageTab === 'pending'
              ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/20 shadow-xs'
              : stats.pendingRequests > 0
              ? 'bg-orange-50/40 border-orange-200 hover:bg-orange-50 hover:shadow-xs'
              : 'bg-white border-gray-200/80 hover:border-gray-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700">Requests</span>
            <span className="p-1 rounded-lg bg-orange-100 text-orange-700 font-bold text-xs">
              {stats.pendingRequests}
            </span>
          </div>
          <p className="text-2xl font-black text-orange-700">{stats.pendingRequests}</p>
          <span className="text-[11px] text-orange-600 font-medium">Awaiting approval</span>
        </button>
      </div>

      {/* 3. MAIN WORKFLOW CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
        {/* Stage Navigation Segmented Bar */}
        <div className="border-b border-gray-100 px-4 sm:px-6 pt-3 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'all', label: 'All Bookings', count: stats.total },
              { id: 'active', label: 'Active Pipeline', count: stats.scheduled + stats.inProgress + stats.reportProcessing + stats.reportReady },
              ...(stats.pendingRequests > 0 ? [{ id: 'pending', label: 'Booking Requested', count: stats.pendingRequests }] : []),
              { id: 'scheduled', label: 'Scheduled', count: stats.scheduled },
              { id: 'in-progress', label: 'In Progress', count: stats.inProgress },
              { id: 'report-processing', label: 'Processing', count: stats.reportProcessing },
              { id: 'report-ready', label: 'Report Ready', count: stats.reportReady },
              { id: 'report-delivered', label: 'Delivered', count: stats.delivered },
              { id: 'cancelled', label: 'Cancelled', count: stats.cancelled },
            ].map((tab) => {
              const isActive = selectedStageTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStageTab(tab.id)}
                  className={`flex items-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#06202E] text-white shadow-xs'
                      : 'bg-transparent text-gray-600 hover:text-[#06202E] hover:bg-gray-100/80'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-[#0B2535] text-blue-100' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Toggle (Cards vs Dense Table) */}
          <div className="hidden sm:flex items-center bg-gray-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'card' ? 'bg-white text-[#06202E] shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Card view with milestone timeline"
            >
              <FaThLarge size={12} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#06202E] shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Compact operational table"
            >
              <FaThList size={12} />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Integrated Filter & Search Toolbar */}
        <div className="p-3.5 sm:p-4 bg-gray-50/70 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search by patient name, service, scan, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 focus:border-[#06202E]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <FaTimes size={12} />
              </button>
            )}
          </div>

          {/* Quick Date Presets & Custom Date */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-white border border-gray-200/90 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleDatePreset('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  datePreset === 'all' && !dateFilter ? 'bg-[#06202E] text-white' : 'text-gray-600 hover:text-[#06202E]'
                }`}
              >
                All Dates
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('today')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  datePreset === 'today' ? 'bg-[#06202E] text-white' : 'text-gray-600 hover:text-[#06202E]'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('tomorrow')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  datePreset === 'tomorrow' ? 'bg-[#06202E] text-white' : 'text-gray-600 hover:text-[#06202E]'
                }`}
              >
                Tomorrow
              </button>
            </div>

            {/* Custom Date Picker */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200/90 rounded-xl px-2.5 py-1 text-xs text-gray-700 shadow-2xs">
              <FaFilter className="text-gray-400 w-3 h-3" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setDatePreset('all');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none cursor-pointer"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('');
                    setDatePreset('all');
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer ml-1"
                >
                  <FaTimes size={10} />
                </button>
              )}
            </div>

            {/* Per-Page Selector */}
            <div className="flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200/90 rounded-xl px-2.5 py-1 shadow-2xs">
              <span className="font-semibold text-gray-400">Rows:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. CONTENT DISPLAY (CARDS VIEW OR TABLE VIEW) */}
        {totalItems === 0 ? (
          <div className="py-24 text-center px-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
              <MdOutlineTimeline size={32} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No procedures found in this stage</h3>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-md mx-auto">
              No appointments match your active filter combination. Try resetting your stage tab, search term, or date range.
            </p>
            {(searchQuery || dateFilter || selectedStageTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('');
                  setDatePreset('all');
                  setSelectedStageTab('all');
                }}
                className="mt-4 px-4 py-2 bg-[#06202E] hover:bg-[#0a2e42] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          /* CARD WORKFLOW VIEW */
          <div className="divide-y divide-gray-100">
            {paginatedAppointments.map((apt) => {
              const rawStatus = (apt.status || 'scheduled').toLowerCase().replace(/_/g, '-');
              const currentStatus = rawStatus === 'confirmed' ? 'scheduled' : rawStatus;
              const currentIndex = LINEAR_STAGES.findIndex((s) => s.key === currentStatus);
              const nextStage = getNextStage(currentStatus);
              const isBranch = ['no-show', 'cancelled', 'canceled', 'rejected'].includes(currentStatus);

              const p = extractPatientDetails(apt);
              const initials = getInitials(p.name);
              const serviceName = apt.service?.name || apt.formData?.serviceName || apt.service_name || 'Diagnostic Service';
              const aptDateFormatted = apt.appointment_date ? format(new Date(apt.appointment_date), 'dd MMM yyyy') : '';
              const latestNote = Array.isArray(apt.tracking) && apt.tracking.length > 0 ? apt.tracking[apt.tracking.length - 1].note : null;

              return (
                <div key={apt.id} className="p-5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* Patient & Examination Info */}
                    <div className="flex items-start gap-3.5 min-w-[300px] flex-1">
                      <div
                        onClick={() => {
                          setActiveModalAppointment(apt);
                          setManualTargetStage(apt.status || 'scheduled');
                        }}
                        className="w-12 h-12 rounded-2xl bg-[#06202E]/5 border border-[#06202E]/15 text-[#06202E] font-extrabold flex items-center justify-center shrink-0 shadow-2xs cursor-pointer hover:bg-[#06202E]/10 transition-colors"
                        title={`Click to view patient details for ${p.name}`}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            onClick={() => {
                              setActiveModalAppointment(apt);
                              setManualTargetStage(apt.status || 'scheduled');
                            }}
                            className="text-sm font-bold text-[#06202E] truncate cursor-pointer hover:text-blue-700 transition-colors"
                            title={`Click to view patient details for ${p.name}`}
                          >
                            {p.name}
                          </h3>
                          {p.isOther && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                              title={p.bookerName ? `Booked by account holder: ${p.bookerName}` : 'Booked for dependent/other'}
                            >
                              {p.bookerName ? `For Other (by ${p.bookerName})` : 'Dependent / Other'}
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${getDeliveryStatusColor(currentStatus)}`}>
                            {getDeliveryStatusLabel(currentStatus)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            apt.payment?.status === 'completed' || apt.payment?.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {apt.payment?.status === 'completed' || apt.payment?.status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-gray-800 mt-1 truncate">
                          {serviceName}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 mt-1.5">
                          <span className="font-mono text-gray-700 font-medium">ID: {apt.id}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium text-gray-700">
                            <FaCalendarAlt className="w-2.5 h-2.5 text-gray-400" />
                            {aptDateFormatted} {apt.start_time ? `• ${apt.start_time}` : ''}
                          </span>
                          {p.phone && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-medium text-gray-700">
                                <FaPhoneAlt className="w-2.5 h-2.5 text-gray-400" />
                                {p.phone}
                              </span>
                            </>
                          )}
                          {p.email && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 truncate max-w-[200px]" title={p.email}>
                                <FaEnvelope className="w-2.5 h-2.5 text-gray-400" />
                                {p.email}
                              </span>
                            </>
                          )}
                          {p.gender && (
                            <>
                              <span>•</span>
                              <span className="capitalize text-gray-600">{p.gender}</span>
                            </>
                          )}
                        </div>

                        {latestNote && (
                          <div className="text-[11px] text-gray-600 mt-2 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200/80 shadow-2xs w-fit max-w-full truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#06202E] shrink-0" />
                            <span className="truncate italic">{latestNote}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visual 6-Stage Clinical Stepper */}
                    <div className="w-full xl:w-[480px] shrink-0 py-1">
                      <div className="grid grid-cols-6 gap-1.5">
                        {LINEAR_STAGES.map((st, sIdx) => {
                          const isDone = !isBranch && currentIndex >= 0 && sIdx < currentIndex;
                          const isCur = !isBranch && currentIndex === sIdx;

                          return (
                            <div
                              key={st.key}
                              className={`p-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                                isCur
                                  ? 'bg-[#06202E] text-white border-[#06202E] shadow-xs'
                                  : isDone
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-white text-gray-400 border-gray-200/80 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-center mb-0.5">
                                {isDone ? (
                                  <FaCheck className="w-2.5 h-2.5 text-emerald-600" />
                                ) : (
                                  <span className="text-[10px] font-bold">{sIdx + 1}</span>
                                )}
                              </div>
                              <span className="text-[9px] font-bold truncate max-w-full leading-tight">
                                {st.shortLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end xl:self-center">
                      {/* Accept Booking Quick Action */}
                      {currentStatus === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={updateDeliveryStatusMutation.isPending}
                            onClick={() => handleQuickAdvance(apt, 'scheduled', 'Booking request accepted & scheduled')}
                            className="px-3.5 py-2 bg-[#06202E] hover:bg-[#0a2e42] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {updateDeliveryStatusMutation.isPending ? (
                              <FaSpinner className="w-3 h-3 animate-spin" />
                            ) : (
                              <FaCheck className="w-3 h-3 text-emerald-400" />
                            )}
                            <span>Accept Booking</span>
                          </button>
                          <button
                            type="button"
                            disabled={updateDeliveryStatusMutation.isPending}
                            onClick={() => handleQuickAdvance(apt, 'rejected', 'Booking request declined by provider')}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {/* Advance Linear Stage Button */}
                      {nextStage && currentStatus !== 'pending' && (
                        <button
                          type="button"
                          disabled={updateDeliveryStatusMutation.isPending}
                          onClick={() => handleQuickAdvance(apt, nextStage.key)}
                          className="px-3.5 py-2 bg-[#06202E] hover:bg-[#0a2e42] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {updateDeliveryStatusMutation.isPending ? (
                            <FaSpinner className="w-3 h-3 animate-spin" />
                          ) : (
                            <FaArrowRight className="w-3 h-3 text-blue-300" />
                          )}
                          <span>{nextStage.label}</span>
                        </button>
                      )}

                      {/* Manage & Audit Trail Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModalAppointment(apt);
                          setManualTargetStage(apt.status || 'scheduled');
                        }}
                        className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200/90 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="View patient details & manage milestones"
                      >
                        <FaIdCard className="w-3 h-3 text-gray-400" />
                        <span>Patient Details &amp; Milestone</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* DENSE OPERATIONAL TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Diagnostic Procedure</th>
                  <th className="py-3 px-4">Scheduled Slot</th>
                  <th className="py-3 px-4">Delivery Stage</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Operational Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedAppointments.map((apt) => {
                  const rawStatus = (apt.status || 'scheduled').toLowerCase().replace(/_/g, '-');
                  const currentStatus = rawStatus === 'confirmed' ? 'scheduled' : rawStatus;
                  const nextStage = getNextStage(currentStatus);
                  const p = extractPatientDetails(apt);
                  const serviceName = apt.service?.name || apt.formData?.serviceName || apt.service_name || 'Diagnostic Service';
                  const aptDateFormatted = apt.appointment_date ? format(new Date(apt.appointment_date), 'dd MMM') : '';

                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-800 whitespace-nowrap">
                        {apt.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => {
                            setActiveModalAppointment(apt);
                            setManualTargetStage(apt.status || 'scheduled');
                          }}
                          className="font-bold text-[#06202E] hover:text-blue-700 cursor-pointer transition-colors"
                          title={`Click to view patient details for ${p.name}`}
                        >
                          {p.name}
                        </div>
                        <div className="text-[11px] text-gray-500 flex flex-col gap-0.5 mt-0.5">
                          {p.phone && <span>{p.phone}</span>}
                          {p.email && <span className="text-gray-400 truncate max-w-[180px]" title={p.email}>{p.email}</span>}
                          {p.isOther && p.bookerName && (
                            <span className="text-[10px] text-blue-600 font-medium">Booker: {p.bookerName}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-800 max-w-xs truncate">
                        {serviceName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-medium">
                        {aptDateFormatted} {apt.start_time ? `• ${apt.start_time}` : ''}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${getDeliveryStatusColor(currentStatus)}`}>
                          {getDeliveryStatusLabel(currentStatus)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          apt.payment?.status === 'completed' || apt.payment?.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {apt.payment?.status === 'completed' || apt.payment?.status === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {nextStage && (
                            <button
                              type="button"
                              disabled={updateDeliveryStatusMutation.isPending}
                              onClick={() => handleQuickAdvance(apt, nextStage.key)}
                              className="px-3 py-1.5 bg-[#06202E] hover:bg-[#0a2e42] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <span>{nextStage.label}</span>
                              <FaArrowRight size={10} className="text-blue-300" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModalAppointment(apt);
                              setManualTargetStage(apt.status || 'scheduled');
                            }}
                            className="px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium cursor-pointer shadow-2xs"
                            title="View patient details & manage milestones"
                          >
                            Details &amp; Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. STANDARD RESPONSIVE PAGINATION BAR */}
        {totalItems > 0 && (
          <div className="p-4 bg-gray-50/80 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-600">
              Showing <span className="font-bold text-[#06202E]">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-bold text-[#06202E]">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
              <span className="font-bold text-[#06202E]">{totalItems}</span> procedures
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="First Page"
              >
                First
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                <FaChevronLeft size={10} />
                <span>Prev</span>
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((pageNum, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && pageNum - prev > 1;

                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsis && <span className="px-1 text-gray-400 text-xs">…</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[32px] h-[32px] text-xs font-bold rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                          pageNum === currentPage
                            ? 'bg-[#06202E] text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <FaChevronRight size={10} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Last Page"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. CLINICAL AUDIT TRAIL & DELIVERY CONTROL MODAL */}
      {activeModalAppointment && (() => {
        const modalPatient = extractPatientDetails(activeModalAppointment);
        return (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setActiveModalAppointment(null)}
          >
            <div
              className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#06202E] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>Manage Clinical Delivery</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 font-mono">
                      ID: {activeModalAppointment.id}
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-gray-300">Patient:</span>
                    <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
                      {modalPatient.name}
                    </span>
                    {modalPatient.isOther && (
                      <span className="text-[10px] text-blue-200 bg-blue-500/30 px-2 py-0.5 rounded-full border border-blue-400/30">
                        {modalPatient.bookerName ? `Booked by ${modalPatient.bookerName}` : 'Dependent / Other'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModalAppointment(null)}
                  className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <FaTimes size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                {/* 1. Full Patient Details Card */}
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                    <h4 className="text-xs font-bold text-[#06202E] uppercase tracking-wider flex items-center gap-1.5">
                      <FaIdCard className="text-[#06202E]" />
                      <span>Patient Details</span>
                    </h4>
                    <span className="text-[11px] font-semibold text-gray-600 truncate max-w-[220px]">
                      {activeModalAppointment.service_name || activeModalAppointment.service?.name || activeModalAppointment.formData?.serviceName || 'Diagnostic Service'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Patient Name</span>
                      <span className="font-bold text-[#06202E] block truncate" title={modalPatient.name}>{modalPatient.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Phone</span>
                      <span className="font-semibold text-gray-800 block">{modalPatient.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Email</span>
                      <span className="font-semibold text-gray-800 block truncate" title={modalPatient.email}>{modalPatient.email || 'N/A'}</span>
                    </div>
                    {modalPatient.gender && (
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Gender</span>
                        <span className="font-semibold text-gray-800 capitalize block">{modalPatient.gender}</span>
                      </div>
                    )}
                    {modalPatient.dob && (
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">Date of Birth</span>
                        <span className="font-semibold text-gray-800 block">{modalPatient.dob}</span>
                      </div>
                    )}
                    {modalPatient.identificationNumber && (
                      <div>
                        <span className="text-[10px] text-gray-400 block font-medium">ID / Referral #</span>
                        <span className="font-semibold text-gray-800 font-mono block">{modalPatient.identificationNumber}</span>
                      </div>
                    )}
                    {modalPatient.address && (
                      <div className="col-span-2 sm:col-span-3">
                        <span className="text-[10px] text-gray-400 block font-medium">Address</span>
                        <span className="font-semibold text-gray-800 block">{modalPatient.address}</span>
                      </div>
                    )}
                    {modalPatient.isOther && modalPatient.bookerName && (
                      <div className="col-span-2 sm:col-span-3 bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                        <span className="text-[10px] text-blue-700 font-bold block uppercase tracking-wide">Account Holder / Booker</span>
                        <span className="font-semibold text-gray-800 block">{modalPatient.bookerName}</span>
                      </div>
                    )}
                    {modalPatient.comments && (
                      <div className="col-span-2 sm:col-span-3 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100">
                        <span className="text-[10px] text-amber-800 font-bold block uppercase tracking-wide">Patient Notes / Booking Instructions</span>
                        <span className="font-medium text-gray-700 italic block">{modalPatient.comments}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Status Pill */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200/90">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Pipeline Stage:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${getDeliveryStatusColor(
                      activeModalAppointment.status || 'scheduled'
                    )}`}
                  >
                    {getDeliveryStatusLabel(activeModalAppointment.status || 'scheduled')}
                  </span>
                </div>

                {/* Set New Stage Form */}
                <div className="space-y-3 bg-[#06202E]/5 p-4 rounded-xl border border-[#06202E]/15">
                  <h4 className="text-xs font-bold text-[#06202E] uppercase tracking-wider flex items-center gap-1.5">
                    <MdOutlineTimeline size={16} />
                    <span>Update Procedure Milestone</span>
                  </h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Target Milestone</label>
                    <select
                      value={manualTargetStage}
                      onChange={(e) => setManualTargetStage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 focus:border-[#06202E]"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed Exam</option>
                      <option value="report-processing">Report Processing</option>
                      <option value="report-ready">Report Ready</option>
                      <option value="report-delivered">Report Delivered</option>
                      <option value="no-show">No Show</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Clinical Note / Reason (Optional)</label>
                    <textarea
                      rows={2}
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      placeholder="E.g., Contrast administration completed; scan clear; reports dispatched to referring physician..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 focus:border-[#06202E]"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={updateDeliveryStatusMutation.isPending}
                    onClick={handleManualSubmit}
                    className="w-full py-2.5 bg-[#06202E] hover:bg-[#0a2e42] text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {updateDeliveryStatusMutation.isPending && <FaSpinner className="w-3 h-3 animate-spin" />}
                    <span>Save Milestone Update</span>
                  </button>
                </div>

                {/* Tracking History Audit Trail */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FaHistory className="w-3 h-3 text-gray-500" />
                      <span>Audit Trail &amp; Milestone Log</span>
                    </h4>
                    <span className="text-[11px] text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">
                      {Array.isArray(activeModalAppointment.tracking) ? activeModalAppointment.tracking.length : 0} logs
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Array.isArray(activeModalAppointment.tracking) && activeModalAppointment.tracking.length > 0 ? (
                      activeModalAppointment.tracking.map((step: TrackingStep, idx: number) => {
                        const dateObj = new Date(step.timestamp);
                        const isAuto = String(step.updatedBy || '').toLowerCase().includes('auto');

                        return (
                          <div
                            key={idx}
                            className="p-3 bg-white rounded-xl border border-gray-200 text-xs flex items-start justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-[#06202E] mt-1 shrink-0" />
                              <div>
                                <div className="font-bold text-gray-900 flex items-center gap-2">
                                  <span>{step.label || getDeliveryStatusLabel(step.status)}</span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      isAuto ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {isAuto ? '⚡ System Auto-Approval' : step.updatedBy || 'Provider'}
                                  </span>
                                </div>
                                {step.note && <p className="text-gray-500 mt-0.5 text-[11px]">{step.note}</p>}
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono shrink-0 whitespace-nowrap">
                              {!isNaN(dateObj.getTime()) ? format(dateObj, 'dd MMM, HH:mm') : ''}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-gray-400 italic p-3 text-center bg-gray-50 rounded-xl">
                        No tracking milestones recorded yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                <button
                  type="button"
                  onClick={() => setActiveModalAppointment(null)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ServiceDeliveryPage;
