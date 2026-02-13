import React, { useMemo, useState, useEffect } from 'react';
import { FiMoreVertical } from 'react-icons/fi';
import { FaPrint, FaFilter } from 'react-icons/fa';
import { IoRefreshOutline } from 'react-icons/io5';
import { format, parseISO } from 'date-fns';
import { useProviderPatients, ProviderPatient, fetchProviderPatients } from '../../services/providerService';
import { useProviderSearch } from '../../contexts/ProviderSearchContext';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

const ProviderPatientsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { searchQuery, setIsSearching } = useProviderSearch();
  const [filterName, setFilterName] = useState<string>('');
  const [filterEmail, setFilterEmail] = useState<string>('');
  const [filterPhone, setFilterPhone] = useState<string>('');
  const ITEMS_PER_PAGE = 10;

  // Fetch Patients
  const { data: patientsData, refetch, isLoading, isRefetching, isFetching } = useProviderPatients(currentPage, ITEMS_PER_PAGE, searchQuery);

  // Update searching state in context
  useEffect(() => {
    if (searchQuery && (isLoading || isRefetching || isFetching)) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [isLoading, isRefetching, isFetching, searchQuery, setIsSearching]);

  // Sort and filter patients
  const sortedPatients = useMemo(() => {
    if (!patientsData?.data) return [];
    let filtered = [...patientsData.data];

    // Client-side filtering for specific fields (API handles generic search)
    if (filterName && filterName.trim()) {
      const lowerFilter = filterName.toLowerCase().trim();
      filtered = filtered.filter(patient => {
        const name = (patient.name || '').toLowerCase();
        return name.includes(lowerFilter);
      });
    }
    if (filterEmail && filterEmail.trim()) {
      const lowerFilter = filterEmail.toLowerCase().trim();
      filtered = filtered.filter(patient => {
        const email = (patient.email || '').toLowerCase();
        return email.includes(lowerFilter);
      });
    }
    if (filterPhone && filterPhone.trim()) {
      const lowerFilter = filterPhone.toLowerCase().trim();
      filtered = filtered.filter(patient => {
        const phone = (patient.phone || '').toLowerCase();
        return phone.includes(lowerFilter);
      });
    }

    // Sort by registered date (most recent first)
    return filtered.sort((a, b) => {
      const dateA = a.registered ? new Date(a.registered).getTime() : 0;
      const dateB = b.registered ? new Date(b.registered).getTime() : 0;
      return dateB - dateA; // Descending order (most recent first)
    });
  }, [patientsData?.data, searchQuery, filterName, filterEmail, filterPhone]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handlePrint = async () => {
    try {
      const loadingToast = toast.loading('Exporting all patients...');
      let allPatients: ProviderPatient[] = [];
      let currentPageNum = 1;
      let totalPages = 1;

      const firstResponse = await fetchProviderPatients(1, 100);
      if (firstResponse.data && firstResponse.data.length > 0) {
        allPatients = [...firstResponse.data];
        totalPages = firstResponse.pagination?.pages || 1;
        currentPageNum = 2;
      } else {
        toast.dismiss(loadingToast);
        toast.error('No patients found to export');
        return;
      }

      while (currentPageNum <= totalPages) {
        const response = await fetchProviderPatients(currentPageNum, 100);
        if (response.data && response.data.length > 0) {
          allPatients = [...allPatients, ...response.data];
        }
        currentPageNum++;
      }

      toast.dismiss(loadingToast);
      let filteredPatients = allPatients;

      if (searchQuery && searchQuery.trim()) {
        allPatients = [];
        currentPageNum = 1;
        const firstResponse = await fetchProviderPatients(1, 100, searchQuery);
        if (firstResponse.data && firstResponse.data.length > 0) {
          allPatients = [...firstResponse.data];
          totalPages = firstResponse.pagination?.pages || 1;
          currentPageNum = 2;
          while (currentPageNum <= totalPages) {
            const response = await fetchProviderPatients(currentPageNum, 100, searchQuery);
            if (response.data && response.data.length > 0) {
              allPatients = [...allPatients, ...response.data];
            }
            currentPageNum++;
          }
        }
        filteredPatients = allPatients;
      }

      if (filterName && filterName.trim()) {
        const lowerFilter = filterName.toLowerCase().trim();
        filteredPatients = filteredPatients.filter(patient => (patient.name || '').toLowerCase().includes(lowerFilter));
      }
      if (filterEmail && filterEmail.trim()) {
        const lowerFilter = filterEmail.toLowerCase().trim();
        filteredPatients = filteredPatients.filter(patient => (patient.email || '').toLowerCase().includes(lowerFilter));
      }
      if (filterPhone && filterPhone.trim()) {
        const lowerFilter = filterPhone.toLowerCase().trim();
        filteredPatients = filteredPatients.filter(patient => (patient.phone || '').toLowerCase().includes(lowerFilter));
      }

      const tableData = filteredPatients.map((patient) => ({
        'Name': patient.name,
        'Email': patient.email,
        'Phone': patient.phone || 'N/A',
        'Address': patient.address || 'N/A',
        'Registered': patient.registered ? format(parseISO(patient.registered), 'MMM d, yyyy') : 'N/A',
        'Last Appointment': patient.last_appointment ? format(parseISO(patient.last_appointment), 'MMM d, yyyy') : 'N/A',
        'Next Appointment': patient.next_appointment ? format(parseISO(patient.next_appointment), 'MMM d, yyyy') : 'N/A',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(tableData);
      ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Patients');
      XLSX.writeFile(wb, `patients-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success(`Exported ${filteredPatients.length} patient${filteredPatients.length !== 1 ? 's' : ''} successfully!`);
    } catch (error) {
      console.error('Error exporting patients:', error);
      toast.error('Failed to export patients. Please try again.');
    }
  };

  useEffect(() => {
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

  const totalPatients = patientsData?.pagination?.total || 0;
  const totalPages = patientsData?.pagination?.pages || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#16202E]">Patient Lists</h2>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              {totalPatients} total patients
            </span>
          </div>
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
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#16202E] transition-colors"
          >
            <FaPrint size={14} />
            Export
          </button>
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${(filterName || filterEmail || filterPhone)
                ? 'text-[#06202E] font-semibold'
                : 'text-gray-600 hover:text-[#16202E]'
                }`}
            >
              <FaFilter size={12} />
              Filter
              {(filterName || filterEmail || filterPhone) && (
                <span className="w-2 h-2 bg-[#06202E] rounded-full"></span>
              )}
            </button>

            {/* Filter Dropdown */}
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#16202E]">Filter Patients</h3>
                    <button
                      onClick={() => {
                        setFilterName('');
                        setFilterEmail('');
                        setFilterPhone('');
                        setIsFilterOpen(false);
                      }}
                      className="text-xs text-gray-500 hover:text-[#16202E]"
                    >
                      Clear All
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="Filter by name..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="text"
                      value={filterEmail}
                      onChange={(e) => setFilterEmail(e.target.value)}
                      placeholder="Filter by email..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={filterPhone}
                      onChange={(e) => setFilterPhone(e.target.value)}
                      placeholder="Filter by phone..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium text-left w-16">S/N</th>
                <th className="px-6 py-4 font-medium text-left">Patient name</th>
                <th className="px-6 py-4 font-medium text-left">Phone</th>
                <th className="px-6 py-4 font-medium text-left">Email</th>
                <th className="px-6 py-4 font-medium text-left">Address</th>
                <th className="px-6 py-4 font-medium text-left whitespace-nowrap">Next appointment</th>
                <th className="px-6 py-4 font-medium text-left whitespace-nowrap">Last appointment</th>
                <th className="px-6 py-4 font-medium text-left">Registered</th>
                <th className="px-6 py-4 font-medium text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  </td>
                </tr>
              ) : sortedPatients && sortedPatients.length > 0 ? (
                sortedPatients.map((patient, index) => (
                  <tr key={patient.id} className="hover:bg-gray-50/40">
                    <td className="px-6 py-4 text-gray-500 font-medium">
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-[#16202E] flex items-center justify-center text-xs font-semibold">
                          {initials(patient.name)}
                        </div>
                        <span className="font-medium text-[#16202E]">{patient.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{patient.phone || '—'}</td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{patient.email}</td>
                    <td className="px-6 py-4 text-gray-700 max-w-[260px] truncate" title={patient.address}>
                      {patient.address || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                      {formatDate(patient.next_appointment)}
                    </td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                      {formatDate(patient.last_appointment)}
                    </td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                      {formatDate(patient.registered)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* View only - no actions */}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-gray-500">
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderPatientsPage;
