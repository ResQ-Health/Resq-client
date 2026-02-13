import React, { useState, useMemo } from 'react';
import { usePendingAppointments, useUpdateAppointmentStatus, ProviderAppointment } from '../../services/providerService';
import { format, parseISO } from 'date-fns';
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoFilter, IoRefreshOutline } from 'react-icons/io5';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const PendingAppointments: React.FC = () => {
    const { data, isLoading, refetch, isRefetching } = usePendingAppointments();
    const updateStatusMutation = useUpdateAppointmentStatus();

    // Filter State
    const [dateFilter, setDateFilter] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);

    // Filter only pending appointments
    const pendingAppointments = useMemo(() => {
        if (!data?.data) return [];

        // The endpoint returns pending appointments, so no need to filter by status on client side unless double checking
        let filtered = data.data;

        if (dateFilter) {
            filtered = filtered.filter((apt: ProviderAppointment) =>
                apt.appointment_date.startsWith(dateFilter)
            );
        }

        // Sort by appointment_date (most recent first) as fallback if created_at is missing
        return filtered.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.appointment_date).getTime();
            const dateB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.appointment_date).getTime();
            return dateB - dateA;
        });
    }, [data, dateFilter]);

    const handleAction = async (id: string, action: 'grant' | 'reject') => {
        // 'grant' -> 'confirm', 'reject' -> 'reject'
        const apiAction = action === 'grant' ? 'confirm' : 'reject';

        try {
            await updateStatusMutation.mutateAsync({ id, action: apiAction });
        } catch (error) {
            // Error handling is in the hook
        }
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-[#16202E]">Pending Appointments</h3>
                        <p className="text-sm text-gray-500">
                            {pendingAppointments.length} request{pendingAppointments.length !== 1 ? 's' : ''} waiting for action
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-gray-400 hover:text-[#16202E] transition-colors rounded-lg hover:bg-gray-50"
                        disabled={isRefetching}
                    >
                        <IoRefreshOutline className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setFilterOpen(!filterOpen)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${dateFilter ? 'border-[#16202E] text-[#16202E] bg-gray-50' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                        >
                            <IoFilter className="w-4 h-4" />
                            Filter
                        </button>

                        {filterOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-20 p-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                    <input
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16202E] focus:border-transparent"
                                    />
                                    {dateFilter && (
                                        <button
                                            onClick={() => { setDateFilter(''); setFilterOpen(false); }}
                                            className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium w-full text-center"
                                        >
                                            Clear Filter
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                {pendingAppointments.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h4 className="text-gray-900 font-medium mb-1">No pending appointments</h4>
                        <p className="text-gray-500 text-sm">All caught up! New requests will appear here.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
                                <th className="px-6 py-4">S/N</th>
                                <th className="px-6 py-4">Patient</th>
                                <th className="px-6 py-4">Service</th>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {pendingAppointments.map((apt: ProviderAppointment, index: number) => {
                                // Determine patient name (check forWhom logic or fallback)
                                const isOther = apt.formData?.forWhom === 'Other';
                                const patientName = isOther
                                    ? apt.formData?.patientName
                                    : (apt.formData?.patientName || apt.patient_name);
                                const patientEmail = apt.formData?.patientEmail;
                                const patientPhone = apt.formData?.patientPhone;

                                return (
                                    <tr key={apt.id} className="hover:bg-gray-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">{index + 1}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-[#16202E]">{patientName || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500">{patientEmail || 'No email'}</p>
                                                {patientPhone && <p className="text-xs text-gray-400">{patientPhone}</p>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                {apt.service_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {format(parseISO(apt.appointment_date), 'MMM d, yyyy')}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {apt.start_time} - {apt.end_time}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${apt.payment?.status === 'paid' || apt.payment?.status === 'completed'
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {apt.payment?.status === 'paid' || apt.payment?.status === 'completed' ? 'Paid' : 'Unpaid'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleAction(apt.id, 'grant')}
                                                    disabled={updateStatusMutation.isPending}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {updateStatusMutation.isPending ? (
                                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <IoCheckmarkCircleOutline className="w-4 h-4" />
                                                    )}
                                                    Grant
                                                </button>
                                                <button
                                                    onClick={() => handleAction(apt.id, 'reject')}
                                                    disabled={updateStatusMutation.isPending}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 text-gray-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {updateStatusMutation.isPending ? null : (
                                                        <IoCloseCircleOutline className="w-4 h-4" />
                                                    )}
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PendingAppointments;
