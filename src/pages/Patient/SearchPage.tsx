import { useMemo, useState, useEffect } from 'react'
import { useFilters } from '../../contexts/FilterContext'
import HospitalCard from '../../components/HospitalCard'
import Pagination from '../../components/Pagination'
import Footer from '../../components/patient/Footer'
import AppointmentDateDropdown from '../../components/AppointmentDateDropdown'
import TimeDropdown from '../../components/TimeDropdown'
import RatingDropdown from '../../components/RatingDropdown'
import { useAllProviders } from '../../services/providerService'
import type { Hospital } from '../../data/hospitals'

const SearchPage = () => {
    const { filters, removeFilter, clearAllFilters, addFilter } = useFilters();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8; // Show 8 hospitals per page

    // Appointment date options
    const appointmentDateOptions = [
        { id: 'today', label: 'Today', value: 'today' },
        { id: 'tomorrow', label: 'Tomorrow', value: 'tomorrow' },
        { id: 'next7days', label: 'Next 7 days', value: 'next7days' },
        { id: 'nextAvailable', label: 'Next available appointment', value: 'nextAvailable' }
    ];

    // Time options
    const timeOptions = [
        { id: 'any', label: 'Any time', value: 'any' },
        { id: 'morning', label: 'Morning (6AM - 12PM)', value: 'morning' },
        { id: 'afternoon', label: 'Afternoon (12PM - 6PM)', value: 'afternoon' },
        { id: 'evening', label: 'Evening (6PM - 12AM)', value: 'evening' }
    ];

    // Rating options
    const ratingOptions = [
        { id: 'any', label: 'Any', value: 'any' },
        { id: '1star', label: '1 star', value: '1star', stars: 1 },
        { id: '2star', label: '2 stars', value: '2star', stars: 2 },
        { id: '3star', label: '3 stars', value: '3star', stars: 3 },
        { id: '4star', label: '4 stars', value: '4star', stars: 4 },
        { id: '5star', label: '5 stars', value: '5star', stars: 5 }
    ];

    // Get filter values from context or use defaults
    const dateFilter = filters.find(f => f.type === 'date');
    const timeFilter = filters.find(f => f.type === 'time');
    const ratingFilter = filters.find(f => f.type === 'rating');
    const searchFilter = filters.find(f => f.type === 'search');
    const locationFilter = filters.find(f => f.type === 'location');
    const specialOfferFilter = filters.find(f => f.type === 'special_offer');

    const [selectedAppointmentDate, setSelectedAppointmentDate] = useState(
        dateFilter?.value || 'nextAvailable'
    );
    const [selectedTime, setSelectedTime] = useState(
        timeFilter?.value || 'any'
    );
    const [selectedRating, setSelectedRating] = useState(
        ratingFilter?.value || 'any'
    );

    // Sync local state with filters from context
    useEffect(() => {
        if (dateFilter) {
            setSelectedAppointmentDate(dateFilter.value);
        } else {
            setSelectedAppointmentDate('nextAvailable');
        }
    }, [dateFilter]);

    useEffect(() => {
        if (timeFilter) {
            setSelectedTime(timeFilter.value);
        } else {
            setSelectedTime('any');
        }
    }, [timeFilter]);

    useEffect(() => {
        if (ratingFilter) {
            setSelectedRating(ratingFilter.value);
        } else {
            setSelectedRating('any');
        }
    }, [ratingFilter]);

    // Fetch providers
    const { data, isLoading, isError } = useAllProviders();

    // Map API providers to Hospital shape used by UI
    const allHospitals: Hospital[] = useMemo(() => {
        const providers = data?.data || [];
        return providers.map((p) => ({
            id: p.id || p._id || crypto.randomUUID(),
            name: p.provider_name || 'Unknown Provider',
            rating: {
                score: typeof p?.ratings?.average === 'number' ? p.ratings.average : 0,
                reviews: typeof p?.ratings?.count === 'number' ? p.ratings.count : 0,
            },
            address: [p?.address?.street, p?.address?.city, p?.address?.state].filter(Boolean).join(', ') || 'Address not available',
            openStatus: 'Open 24 hours',
            phone: p.work_phone || 'N/A',
            dateListed: new Date().toISOString().slice(0, 10),
            timeListed: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            specialOffer: false,
            image: p.banner_image_url || p.logo || undefined,
        }));
    }, [data]);

    // Filter hospitals based on active filters
    const filteredHospitals: Hospital[] = useMemo(() => {
        let filtered = [...allHospitals];

        // Search filter - filter by provider name
        if (searchFilter?.value) {
            const searchTerm = searchFilter.value.toLowerCase();
            filtered = filtered.filter(hospital =>
                hospital.name.toLowerCase().includes(searchTerm) ||
                hospital.address.toLowerCase().includes(searchTerm)
            );
        }

        // Location filter - filter by address
        if (locationFilter?.value) {
            const locationTerm = locationFilter.value.toLowerCase();
            filtered = filtered.filter(hospital =>
                hospital.address.toLowerCase().includes(locationTerm)
            );
        }

        // Rating filter - filter by minimum rating
        if (ratingFilter?.value && ratingFilter.value !== 'any') {
            const minStars = parseInt(ratingFilter.value.replace('star', ''));
            filtered = filtered.filter(hospital =>
                hospital.rating.score >= minStars
            );
        }

        // Special offer filter
        if (specialOfferFilter) {
            filtered = filtered.filter(hospital => hospital.specialOffer === true);
        }

        // Note: Date and time filters would require availability data from the API
        // For now, we'll just apply the filters that we can with the available data

        return filtered;
    }, [allHospitals, searchFilter, locationFilter, ratingFilter, specialOfferFilter]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredHospitals.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentHospitals = filteredHospitals.slice(startIndex, endIndex);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Scroll to top of results
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle date filter change
    const handleDateChange = (value: string) => {
        setSelectedAppointmentDate(value);
        // Remove existing date filter
        const existingDateFilter = filters.find(f => f.type === 'date');
        if (existingDateFilter) {
            removeFilter(existingDateFilter.id);
        }
        // Add new filter if not default
        if (value !== 'nextAvailable') {
            const option = appointmentDateOptions.find(opt => opt.value === value);
            addFilter({
                type: 'date',
                value: value,
                label: option?.label || value
            });
        }
    };

    // Handle time filter change
    const handleTimeChange = (value: string) => {
        setSelectedTime(value);
        // Remove existing time filter
        const existingTimeFilter = filters.find(f => f.type === 'time');
        if (existingTimeFilter) {
            removeFilter(existingTimeFilter.id);
        }
        // Add new filter if not default
        if (value !== 'any') {
            const option = timeOptions.find(opt => opt.value === value);
            addFilter({
                type: 'time',
                value: value,
                label: option?.label || value
            });
        }
    };

    // Handle rating filter change
    const handleRatingChange = (value: string) => {
        setSelectedRating(value);
        // Remove existing rating filter
        const existingRatingFilter = filters.find(f => f.type === 'rating');
        if (existingRatingFilter) {
            removeFilter(existingRatingFilter.id);
        }
        // Add new filter if not default
        if (value !== 'any') {
            const option = ratingOptions.find(opt => opt.value === value);
            addFilter({
                type: 'rating',
                value: value,
                label: option?.label || value
            });
        }
    };

    // Handle special offer toggle
    const handleSpecialOfferToggle = () => {
        if (specialOfferFilter) {
            removeFilter(specialOfferFilter.id);
        } else {
            addFilter({
                type: 'special_offer',
                value: 'true',
                label: 'Special offer'
            });
        }
    };

    // Calculate results count
    const totalResults = filteredHospitals.length;
    const locationDisplay = locationFilter?.value || 'Lagos';

    return (
        <div className="h-full w-full bg-gray-50 flex flex-col">
            {/* Filter Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-gray-900">Filters</h1>

                        <div className="flex items-center gap-4">
                            {/* Reset all button */}
                            <button
                                onClick={clearAllFilters}
                                className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reset all
                            </button>

                            {/* Filter tags */}
                            {filters.map((filter) => (
                                <div
                                    key={filter.id}
                                    className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-300"
                                >
                                    <span className="text-gray-700 text-sm">{filter.label}</span>
                                    <button
                                        onClick={() => removeFilter(filter.id)}
                                        className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                                    >
                                        <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}

                            {/* Dropdown filters */}
                            <div className="flex items-center gap-4">
                                <div className="w-20">
                                    <AppointmentDateDropdown
                                        title="Date"
                                        options={appointmentDateOptions}
                                        onOptionChange={handleDateChange}
                                        selectedValue={selectedAppointmentDate}
                                    />
                                </div>

                                <div className="w-20">
                                    <TimeDropdown
                                        title="Time"
                                        options={timeOptions}
                                        onOptionChange={handleTimeChange}
                                        selectedValue={selectedTime}
                                    />
                                </div>

                                <div className="w-20">
                                    <RatingDropdown
                                        title="Rating"
                                        options={ratingOptions}
                                        onOptionChange={handleRatingChange}
                                        selectedValue={selectedRating}
                                    />
                                </div>

                                <button
                                    onClick={handleSpecialOfferToggle}
                                    className={`text-sm px-3 py-1 rounded-md transition-colors ${
                                        specialOfferFilter
                                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    Special offer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full flex flex-col">
                {/* Results Count */}
                <div className="mb-6">
                    <p className="text-gray-600 text-sm">
                        {totalResults} {totalResults === 1 ? 'result' : 'results'} {locationDisplay !== 'Lagos' ? `in ${locationDisplay}` : ''}
                    </p>
                </div>

                {/* Loading / Error */}
                {isLoading && (
                    <div className="py-20 text-center text-gray-600">Loading providers...</div>
                )}
                {isError && !isLoading && (
                    <div className="py-20 text-center text-red-600">Failed to load providers.</div>
                )}

                {/* Hospital Grid */}
                {!isLoading && !isError && (
                    <>
                        {currentHospitals.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {currentHospitals.map((hospital) => (
                                    <HospitalCard key={hospital.id} hospital={hospital} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <p className="text-gray-600 text-lg mb-2">No providers found</p>
                                <p className="text-gray-500 text-sm">
                                    Try adjusting your filters or search terms
                                </p>
                                {filters.length > 0 && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="mt-4 text-blue-500 hover:text-blue-600 text-sm underline"
                                    >
                                        Clear all filters
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Pagination */}
                {!isLoading && !isError && totalPages > 1 && (
                    <div className="mt-8">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            <Footer />
        </div>
    )
}

export default SearchPage;