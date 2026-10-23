import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineLocationMarker,
    HiOutlineCalendar,
    HiOutlineTag,
    HiOutlineSwitchVertical,
    HiOutlineSearch,
    HiArrowRight,
    HiArrowLeft,
    HiOutlineX,
    HiOutlineShieldCheck,
} from 'react-icons/hi';
import { IoChevronDown, IoClose } from 'react-icons/io5';
import {
    FaStaffSnake,
    FaXRay,
    FaFlaskVial,
    FaHeartPulse,
    FaRibbon,
    FaHospital,
    FaStethoscope,
    FaStar,
    FaCheck,
} from 'react-icons/fa6';
import {
    TbMagnet,
    TbScan,
    TbWaveSine,
} from 'react-icons/tb';
import { useAllServices, MedicalService } from '../../services/userService';
import { useAllProviders } from '../../services/providerService';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SEO } from '../../components/SEO';

// Curated default diagnostic centers in Lagos for rich marketplace simulation
const DEFAULT_CENTERS = [
    {
        id: 'wrjz4fT6KX',
        name: 'ABC Diagnostics',
        city: 'Ikeja',
        state: 'Lagos',
        rating: 4.8,
        reviewsCount: 128,
        street: '24 Medical Center Way, Ikeja',
        availableToday: true,
    },
    {
        id: 'TOTALCARE_001',
        name: 'Totalcare Diagnostic',
        city: 'Gbagada',
        state: 'Lagos',
        rating: 4.8,
        reviewsCount: 94,
        street: '18 Gbagada Expressway, Gbagada, Lagos',
        availableToday: true,
    },
    {
        id: 'ABC_GBAGADA',
        name: 'ABC Diagnostics (Gbagada Center)',
        city: 'Gbagada',
        state: 'Lagos',
        rating: 4.9,
        reviewsCount: 82,
        street: 'Phase 2 Commercial Corridor, Gbagada, Lagos',
        availableToday: true,
    },
    {
        id: 'PHOEBE_001',
        name: 'Phoebe Medical Center',
        city: 'Victoria Island',
        state: 'Lagos',
        rating: 4.7,
        reviewsCount: 112,
        street: '12 Adeola Odeku St, Victoria Island',
        availableToday: true,
    },
    {
        id: 'LIFECARE_001',
        name: 'Lifecare Diagnostic Centre',
        city: 'Yaba',
        state: 'Lagos',
        rating: 4.6,
        reviewsCount: 68,
        street: 'Commercial Avenue, Sabo Yaba',
        availableToday: true,
    },
    {
        id: 'MEDIVIEW_001',
        name: 'Mediview Hospital',
        city: 'Lekki',
        state: 'Lagos',
        rating: 4.9,
        reviewsCount: 125,
        street: 'Admiralty Way, Lekki Phase 1',
        availableToday: true,
    },
    {
        id: 'PRIME_001',
        name: 'Prime Diagnostic Center',
        city: 'Surulere',
        state: 'Lagos',
        rating: 4.7,
        reviewsCount: 76,
        street: '52 Bode Thomas, Surulere',
        availableToday: true,
    },
    {
        id: 'LAGOON_001',
        name: 'Lagoon Hospitals',
        city: 'Apapa',
        state: 'Lagos',
        rating: 4.5,
        reviewsCount: 88,
        street: 'Marine Road, Apapa',
        availableToday: false,
    },
    {
        id: 'TOTALCARE_GBAGADA_2',
        name: 'Totalcare Health Diagnostic Annex',
        city: 'Gbagada',
        state: 'Lagos',
        rating: 4.7,
        reviewsCount: 61,
        street: 'Diya Street, Gbagada, Lagos',
        availableToday: true,
    },
];

// Available filter options
const LOCATION_OPTIONS = [
    { label: 'All Locations', value: 'all' },
    { label: 'Lagos, Nigeria', value: 'lagos' },
    { label: 'Ikeja, Lagos', value: 'ikeja' },
    { label: 'Victoria Island, Lagos', value: 'vi' },
    { label: 'Yaba, Lagos', value: 'yaba' },
    { label: 'Lekki, Lagos', value: 'lekki' },
    { label: 'Surulere, Lagos', value: 'surulere' },
    { label: 'Gbagada, Lagos', value: 'gbagada' },
    { label: 'Apapa, Lagos', value: 'apapa' },
];

const PRICE_OPTIONS = [
    { label: 'All Prices', value: 'all' },
    { label: 'Under ₦20,000', value: 'under-20k' },
    { label: '₦20,000 - ₦50,000', value: '20k-50k' },
    { label: '₦50,000 - ₦100,000', value: '50k-100k' },
    { label: 'Above ₦100,000', value: 'above-100k' },
];

const RATING_OPTIONS = [
    { label: 'All Ratings', value: 'all' },
    { label: '★ 4.8 & above', value: '4.8' },
    { label: '★ 4.6 & above', value: '4.6' },
    { label: '★ 4.5 & above', value: '4.5' },
    { label: '★ 4.0 & above', value: '4.0' },
];

const PROVIDER_OPTIONS = [
    { label: 'All Providers', value: 'all' },
    { label: 'ABC Diagnostics', value: 'abc' },
    { label: 'Phoebe Medical Center', value: 'phoebe' },
    { label: 'Lifecare Diagnostic Centre', value: 'lifecare' },
    { label: 'Mediview Hospital', value: 'mediview' },
    { label: 'Prime Diagnostic Center', value: 'prime' },
    { label: 'Reddington Hospital', value: 'reddington' },
    { label: 'Lagoon Hospitals', value: 'lagoon' },
    { label: 'St. Claire Imaging', value: 'st_claire' },
    { label: 'Totalcare Diagnostic', value: 'totalcare' },
];

const AVAILABILITY_OPTIONS = [
    { label: 'Any Availability', value: 'any' },
    { label: 'Available Today', value: 'today' },
    { label: 'Available Tomorrow', value: 'tomorrow' },
    { label: 'This Week', value: 'this-week' },
];

const SORT_OPTIONS = [
    { label: 'Sort: Recommended', value: 'recommended' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' },
    { label: 'Rating: High to Low', value: 'rating' },
];

// Modality category definitions with authentic medical clinical icons
const CATEGORY_TABS = [
    {
        key: 'all',
        label: 'All Procedures',
        icon: FaStaffSnake,
        color: 'text-[#06202E]',
        matcher: () => true,
    },
    {
        key: 'MRI',
        label: 'MRI & MRA',
        icon: TbMagnet,
        color: 'text-indigo-600',
        subtitle: 'High-field magnetic resonance imaging for brain, spine, organs, and soft tissues.',
        matcher: (s: MedicalService) => s.modality === 'MRI' || s.name.toUpperCase().includes('MRI') || s.name.toUpperCase().includes('MRA'),
    },
    {
        key: 'CT',
        label: 'CT Scan',
        icon: TbScan,
        color: 'text-amber-600',
        subtitle: 'Advanced 3D cross-sectional tomography for organs, thoracic cavity, and bone architecture.',
        matcher: (s: MedicalService) => s.modality === 'CT' || s.name.toUpperCase().startsWith('CT'),
    },
    {
        key: 'X-Ray',
        label: 'X-Ray Radiography',
        icon: FaXRay,
        color: 'text-cyan-600',
        subtitle: 'High-frequency digital radiography for skeletal joints, chest, spine, and extremity assessment.',
        matcher: (s: MedicalService) => s.modality === 'X-Ray' || s.name.toUpperCase().startsWith('X-RAY'),
    },
    {
        key: 'Ultrasound',
        label: 'Ultrasound & Echo',
        icon: TbWaveSine,
        color: 'text-emerald-600',
        subtitle: 'High-frequency non-ionizing acoustic sonography for abdominal, pelvic, vascular, and cardiac evaluation.',
        matcher: (s: MedicalService) => s.modality === 'Ultrasound' || s.name.toUpperCase().includes('ULTRASOUND') || s.name.toUpperCase().includes('ECHOCARDIOGRAM'),
    },
    {
        key: 'Mammography',
        label: 'Mammography',
        icon: FaRibbon,
        color: 'text-rose-600',
        subtitle: 'Specialized low-dose digital breast screening and targeted diagnostic imaging.',
        matcher: (s: MedicalService) => s.modality === 'Mammography' || s.name.toUpperCase().includes('MAMMOGRAPHY'),
    },
    {
        key: 'Tests',
        label: 'Clinical Lab Tests',
        icon: FaFlaskVial,
        color: 'text-purple-600',
        subtitle: 'Comprehensive diagnostic blood panels, hematology, clinical chemistry, and pathology.',
        matcher: (s: MedicalService) => s.category === 'tests' || s.service_type === 'laboratory',
    },
];

export const getServiceModalityBadge = (service: MedicalService) => {
    const name = (service.name || '').toUpperCase();
    const mod = (service.modality || '').toUpperCase();

    if (mod === 'MRI' || name.includes('MRI') || name.includes('MRA')) {
        return {
            label: 'MRI Scan',
            icon: TbMagnet,
            color: 'bg-indigo-50 text-indigo-700 border-indigo-200/90',
        };
    }
    if (mod === 'CT' || name.startsWith('CT') || name.includes('TOMOGRAPHY')) {
        return {
            label: 'CT Scan',
            icon: TbScan,
            color: 'bg-amber-50 text-amber-800 border-amber-200/90',
        };
    }
    if (mod === 'X-RAY' || name.startsWith('X-RAY') || name.includes('RADIOGRAPHY')) {
        return {
            label: 'X-Ray',
            icon: FaXRay,
            color: 'bg-cyan-50 text-cyan-800 border-cyan-200/90',
        };
    }
    if (name.includes('ECHOCARDIOGRAM') || name.includes('ECHO')) {
        return {
            label: 'Echocardiogram',
            icon: FaHeartPulse,
            color: 'bg-rose-50 text-rose-700 border-rose-200/90',
        };
    }
    if (mod === 'ULTRASOUND' || name.includes('ULTRASOUND') || name.includes('SONOGRAM')) {
        return {
            label: 'Ultrasound',
            icon: TbWaveSine,
            color: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
        };
    }
    if (mod === 'MAMMOGRAPHY' || name.includes('MAMMOGRAPHY') || name.includes('MAMMOGRAM')) {
        return {
            label: 'Mammography',
            icon: FaRibbon,
            color: 'bg-pink-50 text-pink-700 border-pink-200/90',
        };
    }
    if (service.category === 'tests' || service.service_type === 'laboratory') {
        return {
            label: 'Lab Pathology',
            icon: FaFlaskVial,
            color: 'bg-purple-50 text-purple-700 border-purple-200/90',
        };
    }
    return {
        label: 'Clinical Scan',
        icon: FaStaffSnake,
        color: 'bg-blue-50 text-blue-700 border-blue-200/90',
    };
};

interface EnrichedServiceItem {
    service: MedicalService;
    center: {
        providerId: string;
        providerName: string;
        location: string;
        city: string;
        state: string;
        cityState: string;
        rating: number;
        reviews: number;
        availableToday: boolean;
    };
}

// Pagination helper
function getPageNumbers(current: number, total: number): (number | string)[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
        return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
        return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
}

export default function SearchPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data fetching
    const { data: services = [], isLoading: isServicesLoading } = useAllServices();
    const { data: providersData } = useAllProviders();

    // Filter states
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [selectedPriceRange, setSelectedPriceRange] = useState('all');
    const [selectedRating, setSelectedRating] = useState('all');
    const [selectedProvider, setSelectedProvider] = useState('all');
    const [selectedAvailability, setSelectedAvailability] = useState('any');
    const [selectedSort, setSelectedSort] = useState('recommended');
    const [searchTerm, setSearchTerm] = useState('');

    // Active Category Tab
    const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 16;

    // Dropdown open states
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Immediate navigation to provider booking page
    const handleBookNow = (service: MedicalService, center: any) => {
        const provId = service.provider_id || center.providerId || 'wrjz4fT6KX';
        try {
            localStorage.setItem(
                'bookingDraft',
                JSON.stringify({
                    provider: { id: provId, business_name: center.providerName || 'ABC Diagnostics' },
                    service: { id: service.id || service._id, name: service.name, price: service.price },
                })
            );
        } catch { }
        navigate(`/search/provider/${provId}`);
    };

    const toggleDropdown = (key: string) => {
        setOpenDropdown(openDropdown === key ? null : key);
    };

    // Find ABC Diagnostics provider if registered in DB
    const abcDiagnosticsProvider = useMemo(() => {
        const providers = providersData?.data || [];
        return providers.find(p => (p.provider_name || '').toLowerCase().includes('abc')) || providers[0] || null;
    }, [providersData]);

    const formatNaira = (amount: number) => {
        return `₦${amount.toLocaleString()}`;
    };

    const getServiceSubtitle = (service: MedicalService) => {
        const contrast = service.procedure_details?.contrast;
        if (contrast === 'with') return 'With contrast';
        if (contrast === 'without') return 'Without contrast';
        if (contrast === 'with_and_without') return 'With or without contrast';

        if (service.body_part === 'Spine') return 'Cervical, Thoracic or Lumbar';
        if (service.procedure_details?.views) return `${service.procedure_details.views} Views`;
        if (service.procedure_details?.specimen) return `Specimen: ${service.procedure_details.specimen}`;
        return service.body_part ? `Focus: ${service.body_part}` : 'Standard Diagnostic Procedure';
    };

    // Associate realistic center information deterministically
    const enrichedServices: EnrichedServiceItem[] = useMemo(() => {
        return services.map((service, index) => {
            const str = (service.name || '') + (service.id || service._id || index);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = (hash << 5) - hash + str.charCodeAt(i);
                hash |= 0;
            }
            const center = DEFAULT_CENTERS[Math.abs(hash) % DEFAULT_CENTERS.length];

            return {
                service,
                center: {
                    providerName: center.name,
                    location: center.street,
                    city: center.city,
                    state: center.state,
                    cityState: `${center.city}, ${center.state}`,
                    rating: center.rating,
                    reviews: center.reviewsCount,
                    availableToday: center.availableToday,
                    providerId: abcDiagnosticsProvider?.id || 'wrjz4fT6KX',
                },
            };
        });
    }, [services, abcDiagnosticsProvider]);

    // Check if any filter is active
    const hasActiveFilters = useMemo(() => {
        return (
            selectedLocation !== 'all' ||
            selectedPriceRange !== 'all' ||
            selectedRating !== 'all' ||
            selectedProvider !== 'all' ||
            selectedAvailability !== 'any' ||
            selectedSort !== 'recommended' ||
            searchTerm.trim() !== '' ||
            activeCategoryTab !== 'all'
        );
    }, [selectedLocation, selectedPriceRange, selectedRating, selectedProvider, selectedAvailability, selectedSort, searchTerm, activeCategoryTab]);

    // Reset all filters
    const handleResetFilters = () => {
        setSelectedLocation('all');
        setSelectedPriceRange('all');
        setSelectedRating('all');
        setSelectedProvider('all');
        setSelectedAvailability('any');
        setSelectedSort('recommended');
        setSearchTerm('');
        setActiveCategoryTab('all');
        setCurrentPage(1);
    };

    // Filter & sort services
    const filteredAndSortedServices: EnrichedServiceItem[] = useMemo(() => {
        const filtered = enrichedServices.filter(({ service, center }) => {
            // 1. Search filter (procedure name, description, modality, body part, codes, provider)
            if (searchTerm.trim()) {
                const queryWords = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
                const codeStrings = (service.codes || []).map(c => (typeof c === 'string' ? c : c?.code || ''));
                const searchableText = [
                    service.name,
                    service.description || '',
                    service.category || '',
                    service.service_type || '',
                    service.modality || '',
                    service.body_part || '',
                    service.uses || '',
                    service.procedure_details?.contrast || '',
                    service.procedure_details?.specimen || '',
                    ...codeStrings,
                    center.providerName,
                    center.city,
                    center.state,
                    center.location,
                ].join(' ').toLowerCase();

                const matches = queryWords.every(word => searchableText.includes(word));
                if (!matches) return false;
            }

            // 2. Location filter
            if (selectedLocation !== 'all') {
                const loc = selectedLocation.toLowerCase();
                if (loc === 'lagos') {
                    const inLagos = center.state.toLowerCase().includes('lagos') ||
                        center.city.toLowerCase().includes('lagos') ||
                        center.location.toLowerCase().includes('lagos');
                    if (!inLagos) return false;
                } else if (loc === 'vi') {
                    const inVI = center.city.toLowerCase().includes('victoria') ||
                        center.city.toLowerCase().includes('vi') ||
                        center.location.toLowerCase().includes('victoria');
                    if (!inVI) return false;
                } else {
                    const inCity = center.city.toLowerCase().includes(loc) ||
                        center.location.toLowerCase().includes(loc);
                    if (!inCity) return false;
                }
            }

            // 3. Price filter
            if (selectedPriceRange !== 'all') {
                const price = service.price || 0;
                if (selectedPriceRange === 'under-20k' && price >= 20000) return false;
                if (selectedPriceRange === '20k-50k' && (price < 20000 || price > 50000)) return false;
                if (selectedPriceRange === '50k-100k' && (price < 50000 || price > 100000)) return false;
                if (selectedPriceRange === 'above-100k' && price <= 100000) return false;
            }

            // 4. Rating filter
            if (selectedRating !== 'all') {
                const minRating = parseFloat(selectedRating);
                if (!isNaN(minRating) && center.rating < minRating) return false;
            }

            // 5. Provider filter
            if (selectedProvider !== 'all') {
                const prov = selectedProvider.toLowerCase();
                const pName = center.providerName.toLowerCase();
                if (prov === 'st_claire') {
                    if (!pName.includes('claire')) return false;
                } else if (!pName.includes(prov)) {
                    return false;
                }
            }

            // 6. Availability filter
            if (selectedAvailability !== 'any') {
                if (service.is_available === false) return false;
                if (selectedAvailability === 'today' && !center.availableToday) return false;
            }

            return true;
        });

        // 7. Sort
        return [...filtered].sort((a, b) => {
            if (selectedSort === 'price-asc') {
                return (a.service.price || 0) - (b.service.price || 0);
            }
            if (selectedSort === 'price-desc') {
                return (b.service.price || 0) - (a.service.price || 0);
            }
            if (selectedSort === 'rating') {
                if (b.center.rating !== a.center.rating) {
                    return b.center.rating - a.center.rating;
                }
                return b.center.reviews - a.center.reviews;
            }
            return 0;
        });
    }, [enrichedServices, searchTerm, selectedLocation, selectedPriceRange, selectedRating, selectedProvider, selectedAvailability, selectedSort]);

    // Back handler
    const handleGoBack = () => {
        if (activeCategoryTab !== 'all') {
            setActiveCategoryTab('all');
            setCurrentPage(1);
            return;
        }
        if (searchTerm.trim()) {
            setSearchTerm('');
            setCurrentPage(1);
            return;
        }
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/booking-history');
        }
    };

    // Calculate count per category tab dynamically based on current search & filters
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: filteredAndSortedServices.length };
        CATEGORY_TABS.forEach(tab => {
            if (tab.key !== 'all') {
                counts[tab.key] = filteredAndSortedServices.filter(item => tab.matcher(item.service)).length;
            }
        });
        return counts;
    }, [filteredAndSortedServices]);

    // Active Tab Config
    const currentTabConfig = useMemo(() => {
        return CATEGORY_TABS.find(t => t.key === activeCategoryTab) || CATEGORY_TABS[0];
    }, [activeCategoryTab]);

    // Items for current view
    const isSearching = searchTerm.trim().length > 0;
    const isCategoryFiltered = activeCategoryTab !== 'all';

    // If searching or category tab is clicked, we show a paginated grid
    const itemsForGrid = useMemo(() => {
        if (isCategoryFiltered) {
            return filteredAndSortedServices.filter(item => currentTabConfig.matcher(item.service));
        }
        return filteredAndSortedServices;
    }, [filteredAndSortedServices, isCategoryFiltered, currentTabConfig]);

    const totalPages = Math.ceil(itemsForGrid.length / ITEMS_PER_PAGE);
    const paginatedGridItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return itemsForGrid.slice(start, start + ITEMS_PER_PAGE);
    }, [itemsForGrid, currentPage]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 text-gray-900" onClick={() => setOpenDropdown(null)}>
            <SEO
                title="Search Diagnostic Centers, Scans & Lab Tests"
                description="Search and compare accredited diagnostic centers across Nigeria. Find prices for MRI, CT scans, X-rays, Ultrasounds, and Lab tests. Book verified slots online."
                keywords="diagnostic centers Lagos, MRI scan price Nigeria, CT scan booking, X-ray center near me, ultrasound scan Nigeria, ResQ medical search"
                canonicalPath="/search"
            />
            {/* 1. TOP HEADER & BREADCRUMBS BAR */}
            <div className="bg-white border-b border-gray-200/80 sticky top-0 z-40 shadow-xs">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Left: Back Button & Breadcrumbs */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleGoBack}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-gray-200/90 bg-white hover:bg-slate-50 hover:border-[#06202E]/40 text-xs sm:text-sm font-semibold text-[#06202E] transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                                title="Go back to previous page"
                            >
                                <HiArrowLeft className="w-4 h-4 text-[#06202E]" />
                                <span>Back</span>
                            </button>

                            <div className="h-5 w-px bg-gray-200 hidden sm:block" />

                            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-500">
                                <span>Marketplace</span>
                                <span>/</span>
                                <span className="text-gray-900 font-semibold">
                                    {isCategoryFiltered ? currentTabConfig.label : 'Diagnostic Services'}
                                </span>
                            </div>
                        </div>

                        {/* Right: Badge & Live Procedure Counter */}
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
                                <HiOutlineShieldCheck className="w-4 h-4 text-emerald-600" />
                                <span>Verified Providers</span>
                            </span>
                            <span className="text-xs font-medium text-gray-500 hidden md:inline">
                                {services.length} Total Procedures
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. HERO SEARCH & LOCATION CARD */}
            <div className="bg-gradient-to-b from-white via-white to-gray-50/50 border-b border-gray-200/70 pt-6 pb-6">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-5">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
                                Find Diagnostic Scans &amp; Medical Tests
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl mx-auto">
                                Instant booking with top diagnostic centers and imaging hospitals across Lagos.
                            </p>
                        </div>

                        {/* Unified Search Container */}
                        <div
                            className="bg-white rounded-2xl shadow-lg border border-gray-200/90 p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center gap-2 transition-all hover:border-[#06202E]/40 focus-within:ring-4 focus-within:ring-[#06202E]/10 focus-within:border-[#06202E]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Procedure Search Box */}
                            <div className="flex-1 flex items-center px-3 py-1.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#06202E]/5 border border-[#06202E]/15 flex items-center justify-center text-[#06202E] mr-3 shrink-0">
                                    <FaStethoscope className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0 relative">
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none mb-1">
                                        Procedure or Test
                                    </label>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        placeholder="E.g. Brain MRI, CT Abdomen, CPT 70460..."
                                        className="w-full text-xs sm:text-sm font-medium text-gray-900 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-gray-400 truncate"
                                    />
                                </div>
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setCurrentPage(1);
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors ml-2 cursor-pointer"
                                        title="Clear search"
                                    >
                                        <IoClose className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="h-px md:h-10 md:w-px bg-gray-200 my-1 md:my-0 mx-2" />

                            {/* Location Dropdown inside Search Box */}
                            <div className="relative md:w-56 px-3 py-1.5 flex items-center">
                                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 mr-3 shrink-0">
                                    <HiOutlineLocationMarker className="w-4 h-4 text-[#06202E]" />
                                </div>
                                <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => toggleDropdown('hero-location')}
                                >
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none mb-1 cursor-pointer">
                                        Location
                                    </label>
                                    <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-gray-800">
                                        <span className="truncate">
                                            {LOCATION_OPTIONS.find(o => o.value === selectedLocation)?.label || 'All Locations'}
                                        </span>
                                        <IoChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1 shrink-0" />
                                    </div>
                                </div>

                                {openDropdown === 'hero-location' && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 max-h-72 overflow-y-auto">
                                        {LOCATION_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedLocation(opt.value);
                                                    setCurrentPage(1);
                                                    setOpenDropdown(null);
                                                }}
                                                className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-[#06202E]/5 transition-colors flex items-center justify-between ${selectedLocation === opt.value ? 'text-[#06202E] font-bold bg-[#06202E]/10' : 'text-gray-700'
                                                    }`}
                                            >
                                                <span>{opt.label}</span>
                                                {selectedLocation === opt.value && <FaCheck className="w-3 h-3 text-[#06202E]" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setOpenDropdown(null);
                                    window.scrollTo({ top: 380, behavior: 'smooth' });
                                }}
                                className="px-5 py-3 bg-[#06202E] hover:bg-[#0a2e42] active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                            >
                                <span>Browse</span>
                                <HiArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. CATEGORY TABS / MODALITY SELECTOR BAR */}
            <div className="bg-white border-b border-gray-200/80 sticky top-[57px] z-30 shadow-xs">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar scroll-smooth">
                        {CATEGORY_TABS.map(tab => {
                            const IconComponent = tab.icon;
                            const isActive = activeCategoryTab === tab.key;
                            const count = categoryCounts[tab.key] ?? 0;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => {
                                        setActiveCategoryTab(tab.key);
                                        setCurrentPage(1);
                                    }}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${isActive
                                        ? 'bg-[#06202E] text-white border-[#06202E] shadow-sm'
                                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200/90 hover:border-gray-300'
                                        }`}
                                >
                                    <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.color}`} />
                                    <span>{tab.label}</span>
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${isActive
                                            ? 'bg-[#0B2535] text-blue-100'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 4. REFINED FILTER CONTROLS & SORT BAR */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 py-3">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Filters Row */}
                        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Price Range Filter */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => toggleDropdown('price')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${selectedPriceRange !== 'all'
                                        ? 'border-[#06202E] bg-[#06202E]/5 text-[#06202E] font-bold'
                                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <HiOutlineTag className={`w-3.5 h-3.5 ${selectedPriceRange !== 'all' ? 'text-[#06202E]' : 'text-gray-500'}`} />
                                    <span>{PRICE_OPTIONS.find(o => o.value === selectedPriceRange)?.label || 'Price'}</span>
                                    <IoChevronDown className="w-3 h-3 text-gray-400" />
                                </button>

                                {openDropdown === 'price' && (
                                    <div className="absolute left-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
                                        {PRICE_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedPriceRange(opt.value);
                                                    setCurrentPage(1);
                                                    setOpenDropdown(null);
                                                }}
                                                className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedPriceRange === opt.value ? 'text-[#06202E] font-bold bg-[#06202E]/5' : 'text-gray-700'
                                                    }`}
                                            >
                                                <span>{opt.label}</span>
                                                {selectedPriceRange === opt.value && <FaCheck className="w-3 h-3 text-[#06202E]" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Rating Filter */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => toggleDropdown('rating')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${selectedRating !== 'all'
                                        ? 'border-[#06202E] bg-[#06202E]/5 text-[#06202E] font-bold'
                                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <FaStar className={`w-3.5 h-3.5 ${selectedRating !== 'all' ? 'text-amber-500' : 'text-amber-400'}`} />
                                    <span>{RATING_OPTIONS.find(o => o.value === selectedRating)?.label || 'Rating'}</span>
                                    <IoChevronDown className="w-3 h-3 text-gray-400" />
                                </button>

                                {openDropdown === 'rating' && (
                                    <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
                                        {RATING_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedRating(opt.value);
                                                    setCurrentPage(1);
                                                    setOpenDropdown(null);
                                                }}
                                                className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedRating === opt.value ? 'text-[#06202E] font-bold bg-[#06202E]/5' : 'text-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    {opt.value !== 'all' && <FaStar className="w-3 h-3 text-amber-400" />}
                                                    <span>{opt.label}</span>
                                                </div>
                                                {selectedRating === opt.value && <FaCheck className="w-3 h-3 text-[#06202E]" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Provider Filter */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => toggleDropdown('provider')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${selectedProvider !== 'all'
                                        ? 'border-[#06202E] bg-[#06202E]/5 text-[#06202E] font-bold'
                                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <FaHospital className={`w-3.5 h-3.5 ${selectedProvider !== 'all' ? 'text-[#06202E]' : 'text-gray-500'}`} />
                                    <span>{PROVIDER_OPTIONS.find(o => o.value === selectedProvider)?.label || 'Provider'}</span>
                                    <IoChevronDown className="w-3 h-3 text-gray-400" />
                                </button>

                                {openDropdown === 'provider' && (
                                    <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 max-h-72 overflow-y-auto">
                                        {PROVIDER_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedProvider(opt.value);
                                                    setCurrentPage(1);
                                                    setOpenDropdown(null);
                                                }}
                                                className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedProvider === opt.value ? 'text-[#06202E] font-bold bg-[#06202E]/5' : 'text-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-1.5 truncate mr-2">
                                                    {opt.value !== 'all' && <FaHospital className="w-3 h-3 text-[#06202E] shrink-0" />}
                                                    <span className="truncate">{opt.label}</span>
                                                </div>
                                                {selectedProvider === opt.value && <FaCheck className="w-3 h-3 text-[#06202E] shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Availability Filter */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => toggleDropdown('availability')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${selectedAvailability !== 'any'
                                        ? 'border-[#06202E] bg-[#06202E]/5 text-[#06202E] font-bold'
                                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <HiOutlineCalendar className={`w-3.5 h-3.5 ${selectedAvailability !== 'any' ? 'text-[#06202E]' : 'text-gray-500'}`} />
                                    <span>{AVAILABILITY_OPTIONS.find(o => o.value === selectedAvailability)?.label || 'Availability'}</span>
                                    <IoChevronDown className="w-3 h-3 text-gray-400" />
                                </button>

                                {openDropdown === 'availability' && (
                                    <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
                                        {AVAILABILITY_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAvailability(opt.value);
                                                    setCurrentPage(1);
                                                    setOpenDropdown(null);
                                                }}
                                                className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedAvailability === opt.value ? 'text-[#06202E] font-bold bg-[#06202E]/5' : 'text-gray-700'
                                                    }`}
                                            >
                                                <span>{opt.label}</span>
                                                {selectedAvailability === opt.value && <FaCheck className="w-3 h-3 text-[#06202E]" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Reset Filters button */}
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Reset all filters"
                                >
                                    <HiOutlineX className="w-3.5 h-3.5" />
                                    <span>Clear filters</span>
                                </button>
                            )}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => toggleDropdown('sort')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${selectedSort !== 'recommended'
                                    ? 'border-[#06202E] bg-[#06202E]/5 text-[#06202E] font-bold'
                                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <HiOutlineSwitchVertical className="w-3.5 h-3.5 text-gray-500" />
                                <span>{SORT_OPTIONS.find(o => o.value === selectedSort)?.label || 'Sort'}</span>
                                <IoChevronDown className="w-3 h-3 text-gray-400" />
                            </button>

                            {openDropdown === 'sort' && (
                                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
                                    {SORT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => {
                                                setSelectedSort(opt.value);
                                                setCurrentPage(1);
                                                setOpenDropdown(null);
                                            }}
                                            className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedSort === opt.value ? 'text-[#06202E] font-bold bg-[#06202E]/5' : 'text-gray-700'
                                                }`}
                                        >
                                            <span>{opt.label}</span>
                                            {selectedSort === opt.value && <FaCheck className="w-3 h-3 text-[#06202E]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Filter Chips Bar */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2 border-t border-gray-100 text-xs text-gray-600">
                            <span className="font-semibold text-gray-400 mr-1 text-[11px] uppercase tracking-wider">Active:</span>

                            {searchTerm && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#06202E]/5 text-[#06202E] border border-[#06202E]/20 font-medium">
                                    Query: &ldquo;{searchTerm}&rdquo;
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="hover:text-black cursor-pointer ml-1"
                                    >
                                        <IoClose className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            )}

                            {activeCategoryTab !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#06202E]/5 text-[#06202E] border border-[#06202E]/20 font-medium">
                                    Category: {currentTabConfig.label}
                                    <button
                                        type="button"
                                        onClick={() => setActiveCategoryTab('all')}
                                        className="hover:text-black cursor-pointer ml-1"
                                    >
                                        <IoClose className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            )}

                            {selectedLocation !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#06202E]/5 text-[#06202E] border border-[#06202E]/20 font-medium">
                                    {LOCATION_OPTIONS.find(o => o.value === selectedLocation)?.label}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedLocation('all')}
                                        className="hover:text-black cursor-pointer ml-1"
                                    >
                                        <IoClose className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            )}

                            {selectedPriceRange !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#06202E]/5 text-[#06202E] border border-[#06202E]/20 font-medium">
                                    {PRICE_OPTIONS.find(o => o.value === selectedPriceRange)?.label}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPriceRange('all')}
                                        className="hover:text-black cursor-pointer ml-1"
                                    >
                                        <IoClose className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            )}

                            {selectedRating !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-medium">
                                    {RATING_OPTIONS.find(o => o.value === selectedRating)?.label}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRating('all')}
                                        className="hover:text-amber-950 cursor-pointer ml-1"
                                    >
                                        <IoClose className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            )}

                            {selectedProvider !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#06202E]/5 text-[#06202E] border border-[#06202E]/20 font-medium">
                                    {PROVIDER_OPTIONS.find(o => o.value === selectedProvider)?.label}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProvider('all')}
                                        className="hover:text-black cursor-pointer ml-1"
                                    >
                                        <IoClose className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            )}

                            {selectedAvailability !== 'any' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#06202E]/5 text-[#06202E] border border-[#06202E]/20 font-medium">
                                    {AVAILABILITY_OPTIONS.find(o => o.value === selectedAvailability)?.label}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedAvailability('any')}
                                        className="hover:text-black cursor-pointer ml-1"
                                    >
                                        <IoClose className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 5. MAIN CONTENT DISPLAY */}
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                {isServicesLoading ? (
                    <div className="py-24 text-center">
                        <LoadingSpinner fullScreen={false} className="mx-auto" />
                        <p className="text-sm text-gray-500 mt-3 font-medium">Loading medical diagnostic services catalog...</p>
                    </div>
                ) : isSearching || isCategoryFiltered || hasActiveFilters ? (
                    /* GRID VIEW (For Search Results, Category Tab Selection, OR Filtered Views) */
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                                    {isSearching
                                        ? `Search Results for "${searchTerm}"`
                                        : selectedLocation !== 'all'
                                            ? `Procedures in ${LOCATION_OPTIONS.find(o => o.value === selectedLocation)?.label || selectedLocation}`
                                            : isCategoryFiltered
                                                ? `${currentTabConfig.label} Services`
                                                : 'Filtered Diagnostic Procedures'}
                                </h2>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                    {isSearching ? (
                                        <>Found <span className="font-semibold text-gray-900">{itemsForGrid.length}</span> matching procedures</>
                                    ) : (
                                        <>Found <span className="font-semibold text-gray-900">{itemsForGrid.length}</span> procedures matching your criteria.</>
                                    )}
                                </p>
                            </div>

                            <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#06202E]/5 text-[#06202E] border border-[#06202E]/15 self-start sm:self-auto">
                                {itemsForGrid.length} procedures available
                            </div>
                        </div>

                        {itemsForGrid.length === 0 ? (
                            <div className="py-20 text-center bg-white rounded-2xl border border-gray-200/80 p-8 shadow-xs">
                                <div className="w-16 h-16 mx-auto rounded-full bg-[#06202E]/5 border border-[#06202E]/15 flex items-center justify-center text-[#06202E] mb-4">
                                    <FaStethoscope className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">No procedures match your criteria</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                                    We couldn&rsquo;t find procedures matching your current search and filter combination. Try adjusting your filters or resetting them.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="mt-5 px-5 py-2.5 bg-[#06202E] hover:bg-[#0a2e42] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
                                >
                                    Reset all filters
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {paginatedGridItems.map(({ service, center }, sIdx) => {
                                        const subtitle = getServiceSubtitle(service);
                                        const modalityBadge = getServiceModalityBadge(service);
                                        const ModalityIcon = modalityBadge.icon;

                                        return (
                                            <div
                                                key={service.id || service._id || sIdx}
                                                className="bg-white rounded-2xl border border-gray-200/80 hover:border-[#06202E]/30 hover:shadow-xl transition-all duration-300 p-5 flex flex-col justify-between group"
                                            >
                                                <div>
                                                    {/* Clinical Modality & CPT Code Header */}
                                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${modalityBadge.color}`}>
                                                            <ModalityIcon className="w-3 h-3 shrink-0" />
                                                            <span>{modalityBadge.label}</span>
                                                        </span>
                                                        {service.codes && service.codes.length > 0 && (
                                                            <span className="text-[10px] font-mono text-gray-500 font-semibold bg-gray-50 border border-gray-200/60 px-1.5 py-0.5 rounded">
                                                                CPT {typeof service.codes[0] === 'string' ? service.codes[0] : service.codes[0]?.code}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3
                                                        className="text-base font-bold text-gray-900 group-hover:text-[#06202E] transition-colors line-clamp-1"
                                                        title={service.name}
                                                    >
                                                        {service.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-1">
                                                        {subtitle}
                                                    </p>

                                                    <div className="mt-4 space-y-1.5">
                                                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                                                            <FaHospital className="w-3.5 h-3.5 text-[#06202E] shrink-0" />
                                                            <span className="truncate">{center.providerName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                            <HiOutlineLocationMarker className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                            <span className="truncate">{center.cityState}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-xs pt-0.5">
                                                            <FaStar className="w-3.5 h-3.5 text-amber-400" />
                                                            <span className="font-bold text-gray-800">{center.rating}</span>
                                                            <span className="text-gray-400 font-normal">({center.reviews})</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-100 pt-3.5 mt-5 flex items-center justify-between gap-2">
                                                    <div className="text-lg font-extrabold text-emerald-600">
                                                        {formatNaira(service.price)}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBookNow(service, center)}
                                                        className="px-4 py-2 bg-[#06202E] hover:bg-[#0a2e42] active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:gap-2 cursor-pointer"
                                                    >
                                                        <span>Book now</span>
                                                        <HiArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="mt-10 pt-6 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-xs sm:text-sm text-gray-600">
                                            Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                                            <span className="font-semibold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, itemsForGrid.length)}</span> of{' '}
                                            <span className="font-semibold text-gray-900">{itemsForGrid.length}</span> procedures
                                        </div>

                                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCurrentPage(p => Math.max(1, p - 1));
                                                    window.scrollTo({ top: 380, behavior: 'smooth' });
                                                }}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                            >
                                                Previous
                                            </button>

                                            {getPageNumbers(currentPage, totalPages).map((pageNum, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    disabled={typeof pageNum !== 'number'}
                                                    onClick={() => {
                                                        if (typeof pageNum === 'number') {
                                                            setCurrentPage(pageNum);
                                                            window.scrollTo({ top: 380, behavior: 'smooth' });
                                                        }
                                                    }}
                                                    className={`min-w-[34px] h-[34px] text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center justify-center cursor-pointer ${pageNum === currentPage
                                                        ? 'bg-[#06202E] text-white font-bold shadow-xs'
                                                        : typeof pageNum === 'number'
                                                            ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                                            : 'text-gray-400 cursor-default'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCurrentPage(p => Math.min(totalPages, p + 1));
                                                    window.scrollTo({ top: 380, behavior: 'smooth' });
                                                }}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    /* CATEGORIZED ROWS VIEW (When on "All Procedures" without search query) */
                    <div className="space-y-12">
                        {CATEGORY_TABS.filter(t => t.key !== 'all').map(section => {
                            const sectionItems = filteredAndSortedServices.filter(item => section.matcher(item.service));
                            if (sectionItems.length === 0) return null;

                            // Display top 4 cards for each modality section
                            const displayItems = sectionItems.slice(0, 4);
                            const IconComponent = section.icon;

                            return (
                                <section key={section.key} className="space-y-3">
                                    {/* Section Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 border-b border-gray-100 pb-2.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#06202E]/5 border border-[#06202E]/15 flex items-center justify-center text-[#06202E] shrink-0">
                                                <IconComponent className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                                                    {section.label}
                                                </h2>
                                                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                                    {section.subtitle}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveCategoryTab(section.key);
                                                setCurrentPage(1);
                                                window.scrollTo({ top: 380, behavior: 'smooth' });
                                            }}
                                            className="text-xs sm:text-sm font-semibold text-[#06202E] hover:text-[#0a2e42] inline-flex items-center gap-1.5 transition-colors self-start sm:self-end mt-1 sm:mt-0 cursor-pointer group"
                                        >
                                            <span>See more ({sectionItems.length})</span>
                                            <HiArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    </div>

                                    {/* 4 Cards Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
                                        {displayItems.map(({ service, center }, sIdx) => {
                                            const subtitle = getServiceSubtitle(service);
                                            const modalityBadge = getServiceModalityBadge(service);
                                            const ModalityIcon = modalityBadge.icon;

                                            return (
                                                <div
                                                    key={service.id || service._id || sIdx}
                                                    className="bg-white rounded-2xl border border-gray-200/80 hover:border-[#06202E]/30 hover:shadow-xl transition-all duration-300 p-5 flex flex-col justify-between group"
                                                >
                                                    <div>
                                                        {/* Clinical Modality & CPT Code Header */}
                                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${modalityBadge.color}`}>
                                                                <ModalityIcon className="w-3 h-3 shrink-0" />
                                                                <span>{modalityBadge.label}</span>
                                                            </span>
                                                            {service.codes && service.codes.length > 0 && (
                                                                <span className="text-[10px] font-mono text-gray-500 font-semibold bg-gray-50 border border-gray-200/60 px-1.5 py-0.5 rounded">
                                                                    CPT {typeof service.codes[0] === 'string' ? service.codes[0] : service.codes[0]?.code}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h3
                                                            className="text-base font-bold text-gray-900 group-hover:text-[#06202E] transition-colors line-clamp-1"
                                                            title={service.name}
                                                        >
                                                            {service.name}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-1">
                                                            {subtitle}
                                                        </p>

                                                        <div className="mt-4 space-y-1.5">
                                                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                                                                <FaHospital className="w-3.5 h-3.5 text-[#06202E] shrink-0" />
                                                                <span className="truncate">{center.providerName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                                <HiOutlineLocationMarker className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                <span className="truncate">{center.cityState}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs pt-0.5">
                                                                <FaStar className="w-3.5 h-3.5 text-amber-400" />
                                                                <span className="font-bold text-gray-800">{center.rating}</span>
                                                                <span className="text-gray-400 font-normal">({center.reviews})</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="border-t border-gray-100 pt-3.5 mt-5 flex items-center justify-between gap-2">
                                                        <div className="text-lg font-extrabold text-emerald-600">
                                                            {formatNaira(service.price)}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleBookNow(service, center)}
                                                            className="px-4 py-2 bg-[#06202E] hover:bg-[#0a2e42] active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:gap-2 cursor-pointer"
                                                        >
                                                            <span>Book now</span>
                                                            <HiArrowRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}

                        {filteredAndSortedServices.length === 0 && (
                            <div className="py-20 text-center bg-white rounded-2xl border border-gray-200/80 p-8 shadow-xs">
                                <h3 className="text-lg font-bold text-gray-900">No procedures match the selected filters</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                                    Try expanding your filters for location, price, rating, or provider to see more diagnostic procedures.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="mt-4 px-5 py-2.5 bg-[#06202E] hover:bg-[#0a2e42] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
                                >
                                    Reset all filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}