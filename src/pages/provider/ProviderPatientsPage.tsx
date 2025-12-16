import React, { useMemo, useState, useEffect } from 'react';
import { FiMoreVertical, FiX } from 'react-icons/fi';
import { FaPrint, FaFilter, FaPlus } from 'react-icons/fa';
import { IoRefreshOutline } from 'react-icons/io5';
import { format, parseISO } from 'date-fns';
import { useProviderPatients, useCreatePatient, useUpdatePatient, ProviderPatient, CreatePatientRequest, UpdatePatientRequest, fetchProviderPatients } from '../../services/providerService';
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

interface PatientFormData {
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  notes: string;
}

const ProviderPatientsPage: React.FC = () => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<ProviderPatient | null>(null);
  const [dateOfBirthError, setDateOfBirthError] = useState<string>('');
  const { searchQuery, setIsSearching } = useProviderSearch();
  const [filterName, setFilterName] = useState<string>('');
  const [filterEmail, setFilterEmail] = useState<string>('');
  const [filterPhone, setFilterPhone] = useState<string>('');
  const [formData, setFormData] = useState<PatientFormData>({
    full_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    notes: '',
  });
  const ITEMS_PER_PAGE = 10;

  // Calculate maximum date (2 years ago from today)
  const getMaxDate = () => {
    const today = new Date();
    const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
    return twoYearsAgo.toISOString().split('T')[0];
  };

  // Fetch Patients
  const { data: patientsData, refetch, isLoading, isRefetching, isFetching } = useProviderPatients(currentPage, ITEMS_PER_PAGE, searchQuery);
  
  // Update searching state in context
  useEffect(() => {
    // We consider it "searching" if we have a search query AND we are currently fetching data
    // This allows the spinner to show only when an actual search request is in flight
    if (searchQuery && (isLoading || isRefetching || isFetching)) {
        setIsSearching(true);
    } else {
        setIsSearching(false);
    }
  }, [isLoading, isRefetching, isFetching, searchQuery, setIsSearching]);

  const createPatientMutation = useCreatePatient();
  const updatePatientMutation = useUpdatePatient();

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
      // Show loading state
      const loadingToast = toast.loading('Exporting all patients...');
      
      // Fetch all patients across all pages
      let allPatients: ProviderPatient[] = [];
      let currentPageNum = 1;
      let totalPages = 1;
      let hasMore = true;

      // First fetch to get total pages
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

      // Fetch remaining pages
      while (currentPageNum <= totalPages) {
        const response = await fetchProviderPatients(currentPageNum, 100);
        if (response.data && response.data.length > 0) {
          allPatients = [...allPatients, ...response.data];
        }
        currentPageNum++;
      }

      toast.dismiss(loadingToast);

      // Apply filters if any - case insensitive
      let filteredPatients = allPatients;
      
      // Note: For export, we might want to use the API's search functionality too,
      // but fetchProviderPatients above fetches all pages. If we want to export
      // only searched results, we should pass the search query to fetchProviderPatients.
      // Current implementation exports ALL patients, then filters client-side.
      // To match the view, we should rely on the API search if provided.
      
      // If searchQuery is present, re-fetch all with search param
      if (searchQuery && searchQuery.trim()) {
         allPatients = [];
         currentPageNum = 1;
         // Reset for search-specific export
         const firstResponse = await fetchProviderPatients(1, 100, searchQuery);
          if (firstResponse.data && firstResponse.data.length > 0) {
            allPatients = [...firstResponse.data];
            totalPages = firstResponse.pagination?.pages || 1;
            currentPageNum = 2;
             // Fetch remaining pages for search results
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

      // Apply specific filters
      if (filterName && filterName.trim()) {
        const lowerFilter = filterName.toLowerCase().trim();
        filteredPatients = filteredPatients.filter(patient => {
          const name = (patient.name || '').toLowerCase();
          return name.includes(lowerFilter);
        });
      }
      if (filterEmail && filterEmail.trim()) {
        const lowerFilter = filterEmail.toLowerCase().trim();
        filteredPatients = filteredPatients.filter(patient => {
          const email = (patient.email || '').toLowerCase();
          return email.includes(lowerFilter);
        });
      }
      if (filterPhone && filterPhone.trim()) {
        const lowerFilter = filterPhone.toLowerCase().trim();
        filteredPatients = filteredPatients.filter(patient => {
          const phone = (patient.phone || '').toLowerCase();
          return phone.includes(lowerFilter);
        });
      }

      // Prepare table data
      const tableData = filteredPatients.map((patient) => ({
        'Name': patient.name,
        'Email': patient.email,
        'Phone': patient.phone || 'N/A',
        'Address': patient.address || 'N/A',
        'Registered': patient.registered ? format(parseISO(patient.registered), 'MMM d, yyyy') : 'N/A',
        'Last Appointment': patient.last_appointment ? format(parseISO(patient.last_appointment), 'MMM d, yyyy') : 'N/A',
        'Next Appointment': patient.next_appointment ? format(parseISO(patient.next_appointment), 'MMM d, yyyy') : 'N/A',
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(tableData);

      // Set column widths
      const colWidths = [
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 40 }, // Address
        { wch: 15 }, // Registered
        { wch: 18 }, // Last Appointment
        { wch: 18 }, // Next Appointment
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Patients');

      // Generate filename
      const filename = `patients-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      // Save Excel file
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${filteredPatients.length} patient${filteredPatients.length !== 1 ? 's' : ''} successfully!`);
    } catch (error) {
      console.error('Error exporting patients:', error);
      toast.error('Failed to export patients. Please try again.');
    }
  };

  // Close filter dropdown when clicking outside
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

  const handleOpenModal = (patient?: ProviderPatient) => {
    if (patient) {
      setEditingPatient(patient);
      // Parse patient data to form - note: API response may not have all fields, so we'll use what's available
      setFormData({
        full_name: patient.name || '',
        email: patient.email || '',
        phone_number: patient.phone || '',
        date_of_birth: patient.date_of_birth || '',
        gender: patient.gender || '',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        notes: '', // Not in response, will be empty
      });
    } else {
      setEditingPatient(null);
      setFormData({
        full_name: '',
        email: '',
        phone_number: '',
        date_of_birth: '',
        gender: '',
        address: '',
        city: '',
        state: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
    setOpenMenuId(null); // Close menu if open
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
    setDateOfBirthError('');
    setFormData({
      full_name: '',
      email: '',
      phone_number: '',
      date_of_birth: '',
      gender: '',
      address: '',
      city: '',
      state: '',
      notes: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Validate date of birth when it changes
    if (name === 'date_of_birth' && value) {
      validateDateOfBirth(value);
    } else if (name === 'date_of_birth' && !value) {
      setDateOfBirthError('');
    }
  };

  const validateDateOfBirth = (dateString: string) => {
    const birthDate = new Date(dateString);
    const today = new Date();
    const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
    
    if (birthDate > twoYearsAgo) {
      setDateOfBirthError('Patient must be at least 2 years old');
      return false;
    } else {
      setDateOfBirthError('');
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate date of birth before submitting
    if (formData.date_of_birth && !validateDateOfBirth(formData.date_of_birth)) {
      return; // Stop submission if validation fails
    }
    
    try {
      if (editingPatient) {
        // For update, include the patient ID in the payload
        const updatePayload: UpdatePatientRequest = {
          id: editingPatient.id,
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          notes: formData.notes || undefined,
        };
        await updatePatientMutation.mutateAsync(updatePayload);
      } else {
        // For create, use the standard payload
        const createPayload: CreatePatientRequest = {
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          notes: formData.notes || undefined,
        };
        await createPatientMutation.mutateAsync(createPayload);
      }
      handleCloseModal();
    } catch (error) {
      // Error handling is done in the mutation hooks
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
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                (filterName || filterEmail || filterPhone) 
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

                  {(filterName || filterEmail || filterPhone) && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        {sortedPatients.length} patient{sortedPatients.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#06202E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors flex items-center gap-2"
          >
            <FaPlus size={12} />
            Add Patient
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium text-left w-12">
                  <input type="checkbox" className="accent-[#06202E]" aria-label="Select all" />
                </th>
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
                sortedPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50/40">
                  <td className="px-6 py-4">
                      <input type="checkbox" className="accent-[#06202E]" aria-label={`Select ${patient.name}`} />
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
                  <td className="px-6 py-4 text-right relative">
                    <button
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                        onClick={() => setOpenMenuId((prev) => (prev === patient.id ? null : patient.id))}
                      aria-label="Row actions"
                    >
                      <FiMoreVertical />
                    </button>

                      {openMenuId === patient.id && (
                      <div
                        className="absolute right-6 top-12 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10"
                        onMouseLeave={() => setOpenMenuId(null)}
                      >
                          <button 
                            onClick={() => handleOpenModal(patient)}
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                          Edit patient details
                        </button>
                      </div>
                    )}
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

      {/* Add/Edit Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleCloseModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#16202E]">
                {editingPatient ? 'Edit Patient' : 'Add New Patient'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <FiX size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date_of_birth"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    max={getMaxDate()}
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent ${
                      dateOfBirthError ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {dateOfBirthError && (
                    <p className="mt-1 text-sm text-red-500">{dateOfBirthError}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                    placeholder="Additional notes about the patient..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPatientMutation.isPending || updatePatientMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#06202E] rounded-lg hover:bg-[#0a2e42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createPatientMutation.isPending || updatePatientMutation.isPending
                    ? 'Saving...'
                    : editingPatient
                    ? 'Update Patient'
                    : 'Create Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderPatientsPage;
