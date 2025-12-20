import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAllProviders } from '../../services/providerService';
import { createReview, likeReview, saveReview } from '../../services/providerService';
import { useReportProvider } from '../../services/providerService';
import { useToggleFavoriteProvider, useFavoriteStatus } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

// Provider data in JSON format - this will be replaced with dynamic data
// removed dummy getProviderData; will map from API

const ProviderPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { data, isLoading, isError } = useAllProviders();
    const toggleFavoriteMutation = useToggleFavoriteProvider();
    const { data: favoriteStatusData } = useFavoriteStatus(id);
    const reportProviderMutation = useReportProvider();
    const [providerData, setProviderData] = useState<any>(null);
    const [selectedService, setSelectedService] = useState('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Practice Information states
    const [currentGalleryImage, setCurrentGalleryImage] = useState(0);
    const [activeServiceTab, setActiveServiceTab] = useState('scans');
    const [activeTab, setActiveTab] = useState('About');
    const [showAllServices, setShowAllServices] = useState(false);
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    const [showAddReviewModal, setShowAddReviewModal] = useState(false);
    const [showSignInModal, setShowSignInModal] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportCategory, setReportCategory] = useState<string>('');
    const [reportMessage, setReportMessage] = useState('');
    const [reportAnonymous, setReportAnonymous] = useState(false);
    const [selectedRating, setSelectedRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingSelectedService, setBookingSelectedService] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`;
    });
    const [selectedTime, setSelectedTime] = useState('');
    const [showDateTimeError, setShowDateTimeError] = useState(false);
    const today = useMemo(() => new Date(), []);
    const [calendarMonth, setCalendarMonth] = useState<number>(today.getMonth()); // 0-indexed
    const [calendarYear, setCalendarYear] = useState<number>(today.getFullYear());

    // Review interaction states
    const [sortBy, setSortBy] = useState('newest');
    const [loadingInteractions, setLoadingInteractions] = useState<Set<string>>(new Set());

    // Scroll spy functionality
    useEffect(() => {
        const handleScroll = () => {
            const sections = ['About', 'Practice Information', 'Contact'];
            const scrollPosition = window.scrollY + 100; // Offset for header

            for (let i = sections.length - 1; i >= 0; i--) {
                const element = document.getElementById(sections[i]);
                if (element && element.offsetTop <= scrollPosition) {
                    setActiveTab(sections[i]);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Helper functions for extracting review data
    const extractAuthor = (r: any): string => {
        // Check for patient.full_name first (from API response)
        if (r?.patient?.full_name) {
            return r.patient.full_name;
        }

        const user = r?.user || r?.created_by || r?.author_details;
        const nameFromParts =
            (user?.first_name && user?.last_name)
                ? `${user.first_name} ${user.last_name}`
                : '';
        return (
            r?.patient_name ||
            r?.author ||
            r?.user_name ||
            user?.full_name ||
            user?.fullname ||
            nameFromParts ||
            user?.name ||
            user?.email ||
            'Anonymous'
        );
    };

    const extractText = (r: any): string => r?.comment || r?.text || r?.content || '';
    const extractRating = (r: any): number => typeof r?.rating === 'number' ? r.rating : (typeof r?.stars === 'number' ? r.stars : 0);
    const extractDate = (r: any): string => r?.created_at || r?.updated_at || r?.date || '';

    const providerFromApi = useMemo(() => {
        const providers = data?.data || [];
        return providers.find((p: any) => p.id === id || p._id === id);
    }, [data, id]);

    useEffect(() => {
        if (isLoading) {
            setLoading(true);
            return;
        }
        if (isError) {
            setError('Failed to load provider');
            setLoading(false);
            return;
        }
        if (!providerFromApi) {
            setError('Provider not found');
            setLoading(false);
            return;
        }

        const p = providerFromApi as any;

        const addressStr = [p?.address?.street, p?.address?.city, p?.address?.state]
            .filter(Boolean)
            .join(', ');

        const openingHours: Record<string, string> = {};
        (p?.working_hours || []).forEach((wh: any) => {
            const key = String(wh.day || '').toLowerCase();
            openingHours[key] = wh.isAvailable && wh.startTime && wh.endTime ? `${wh.startTime}-${wh.endTime}` : 'Closed';
        });

        const gallery: string[] = Array.isArray(p?.gallery_image_urls) && p.gallery_image_urls.length > 0
            ? p.gallery_image_urls
            : [p?.banner_image_url, p?.logo].filter(Boolean) as string[];

        // Map services by category
        const servicesByCat: Record<string, any[]> = {
            scans: [],
            tests: [],
            consultation: [],
        };

        // Normalize services from API: services can be objects (preferred) or strings (legacy)
        const rawServices = p?.services || [];
        const normalizedServices: Array<{
            id?: string;
            name: string;
            category?: string;
            description?: string;
            uses?: string;
            price_number?: number;
            price?: string;
        }> = [];

        if (Array.isArray(rawServices)) {
            rawServices.forEach((s: any) => {
                if (!s) return;
                if (typeof s === 'string') {
                    normalizedServices.push({ id: s, name: s });
                    return;
                }
                if (typeof s === 'object') {
                    const priceNumber = typeof s?.price === 'number' ? s.price : undefined;
                    normalizedServices.push({
                        id: s?.id || s?._id || s?.service_id,
                        name: s?.name || s?.serviceName || s?.service || String(s),
                        category: s?.category,
                        description: s?.description,
                        uses: s?.uses,
                        price_number: priceNumber,
                        price: typeof priceNumber === 'number' ? `₦${priceNumber.toLocaleString()}` : (s?.price ? String(s.price) : ''),
                    });
                }
            });
        }

        normalizedServices.forEach((svc) => {
            const category = String(svc?.category || '').toLowerCase();
            const serviceItem = {
                id: svc.id,
                name: svc.name,
                description: svc.description,
                uses: svc.uses,
                price: svc.price || '',
                price_number: svc.price_number,
                category: svc.category,
            };

            if (category === 'scans' || category === 'scan' || category.includes('scan')) {
                servicesByCat.scans.push(serviceItem);
            } else if (category === 'tests' || category === 'test' || category.includes('test')) {
                servicesByCat.tests.push(serviceItem);
            } else {
                servicesByCat.consultation.push(serviceItem);
            }
        });

        // Flat list of service names for dropdowns / selection
        const serviceNames = Array.from(
            new Set(
                normalizedServices
                    .map((s) => s?.name)
                    .filter(Boolean)
            )
        );


        const mapped = {
            id: p.id || p._id,
            name: p.provider_name || 'Unknown Provider',
            address: addressStr || 'Address not available',
            rating: {
                score: typeof p?.ratings?.average === 'number' ? p.ratings.average : 0,
                reviews: typeof p?.ratings?.count === 'number' ? p.ratings.count : 0,
            },
            openStatus: 'Open',
            // Use the provider's real "about" field (fallback to older shapes)
            description: (typeof p?.about === 'string' && p.about.trim())
                ? p.about.trim()
                : ((typeof p?.description === 'string' && p.description.trim()) ? p.description.trim() : `${p.provider_name || 'This provider'} healthcare provider`),
            policy: typeof p?.policy === 'string' ? p.policy : '',
            image: p.banner_image_url || p.logo || '/hospital.jpg',
            services: serviceNames,
            reviews: Array.isArray(p?.reviews)
                ? p.reviews
                    .map((r: any) => {
                        // Get current user ID for checking likes/saves
                        const currentUserId = user?.id;
                        const likesArray = Array.isArray(r.likes) ? r.likes : [];
                        const savedByArray = Array.isArray(r.saved_by) ? r.saved_by : [];

                        return {
                            id: r._id || r.id,
                            rating: extractRating(r),
                            text: extractText(r),
                            author: extractAuthor(r),
                            date: extractDate(r),
                            profilePicture: r?.patient?.profile_picture?.url || r.patient_profile_picture_url || null,
                            likes: likesArray, // Array of user IDs (strings)
                            dislikes: r.dislikes || [],
                            savedBy: savedByArray, // Array of user IDs (strings)
                            isLiked: r.is_liked !== undefined ? r.is_liked : (currentUserId ? likesArray.includes(currentUserId) : false),
                            isSaved: r.is_saved !== undefined ? r.is_saved : (currentUserId ? savedByArray.includes(currentUserId) : false),
                            likesCount: r.likes_count !== undefined ? r.likes_count : likesArray.length,
                            savedCount: r.saved_count !== undefined ? r.saved_count : savedByArray.length,
                        };
                    })
                    .sort((a: any, b: any) => {
                        // Sort by most recent first (newest date first)
                        const dateA = new Date(a.date).getTime();
                        const dateB = new Date(b.date).getTime();
                        return dateB - dateA; // Descending order (newest first)
                    })
                : Array.isArray(p?.comments)
                    ? p.comments
                        .map((r: any) => {
                            // Get current user ID for checking likes/saves
                            const currentUserId = user?.id;
                            const likesArray = Array.isArray(r.likes) ? r.likes : [];
                            const savedByArray = Array.isArray(r.saved_by) ? r.saved_by : [];

                            return {
                                id: r._id || r.id,
                                rating: extractRating(r),
                                text: extractText(r),
                                author: extractAuthor(r),
                                date: extractDate(r),
                                profilePicture: r?.patient?.profile_picture?.url || r.patient_profile_picture_url || null,
                                likes: likesArray, // Array of user IDs (strings)
                                dislikes: r.dislikes || [],
                                savedBy: savedByArray, // Array of user IDs (strings)
                                isLiked: r.is_liked !== undefined ? r.is_liked : (currentUserId ? likesArray.includes(currentUserId) : false),
                                isSaved: r.is_saved !== undefined ? r.is_saved : (currentUserId ? savedByArray.includes(currentUserId) : false),
                                likesCount: r.likes_count !== undefined ? r.likes_count : likesArray.length,
                                savedCount: r.saved_count !== undefined ? r.saved_count : savedByArray.length,
                            };
                        })
                        .sort((a: any, b: any) => {
                            // Sort by most recent first (newest date first)
                            const dateA = new Date(a.date).getTime();
                            const dateB = new Date(b.date).getTime();
                            return dateB - dateA; // Descending order (newest first)
                        })
                    : [],
            timeSlots: {},
            practiceInfo: {
                gallery,
                services: servicesByCat,
                contactDetails: {
                    address: addressStr || 'Address not available',
                    phone: p.work_phone || '',
                    email: p.work_email || '',
                    website: p?.social_links?.website || p.website || '',
                },
                socialMedia: {
                    facebook: p?.social_links?.facebook || '',
                    instagram: p?.social_links?.instagram || '',
                    twitter: p?.social_links?.twitter || '',
                },
                openingHours,
                accreditations: Array.isArray(p?.accreditations) ? p.accreditations : [],
            },
        };

        setProviderData(mapped);

        // Initialize booking selected service to first available from the API response
        let initialService = '';
        if (mapped.services && mapped.services.length > 0) {
            // mapped.services is a string[] (service names)
            initialService = mapped.services[0] || '';
        }

        setBookingSelectedService(initialService);
        setSelectedService(initialService);
        setLoading(false);
    }, [isLoading, isError, providerFromApi, user?.id]); // Add user?.id as dependency to update isLiked/isSaved when user changes

    // Restore data from draft AFTER provider data is loaded (in a separate effect to not override default immediately if undesired)
    useEffect(() => {
        if (providerData && !loading) {
            // Re-calculate the default initial service to fallback to if draft has no service
            let initialService = '';
            if (providerData.services && providerData.services.length > 0) {
                // providerData.services is a string[] (service names)
                initialService = providerData.services[0] || '';
            }

            // Restore from localStorage if available and matches this provider
            try {
                const draftRaw = localStorage.getItem('bookingDraft');
                if (draftRaw) {
                    const draft = JSON.parse(draftRaw);
                    // Check if draft belongs to current provider
                    const draftProviderId = draft.provider?.id || draft.provider?._id;
                    if (draftProviderId === id) {
                        // Restore service
                        if (draft.service) {
                            const draftSvc = draft.service;
                            let serviceToSet = '';
                            if (typeof draftSvc === 'string') {
                                serviceToSet = draftSvc;
                            } else if (draftSvc && typeof draftSvc === 'object') {
                                serviceToSet = draftSvc.name || draftSvc.serviceName || draftSvc.title || draftSvc;
                            }

                            if (serviceToSet) {
                                setBookingSelectedService(serviceToSet);
                                setSelectedService(serviceToSet);
                            }
                        } else {
                            // Draft exists but no service set? fallback to default
                            setBookingSelectedService(initialService);
                            setSelectedService(initialService);
                        }

                        // Restore date
                        if (draft.date) {
                            setSelectedDate(draft.date);
                            // Update calendar view to match selected date
                            // Explicitly handle YYYY-MM-DD format to avoid timezone shifts
                            let dateObj;
                            if (typeof draft.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
                                const [y, m, d] = draft.date.split('-').map(Number);
                                dateObj = new Date(y, m - 1, d);
                            } else {
                                dateObj = new Date(draft.date);
                            }

                            if (!isNaN(dateObj.getTime())) {
                                setCalendarMonth(dateObj.getMonth());
                                setCalendarYear(dateObj.getFullYear());
                            }
                        }

                        // Restore time
                        if (draft.time) {
                            setSelectedTime(draft.time);
                        }
                    } else {
                        // Draft is for another provider, ensure we stick with the default first service for THIS provider
                        setBookingSelectedService(initialService);
                        setSelectedService(initialService);
                    }
                }
            } catch (e) {
                console.error('Error parsing draft:', e);
            }
        }
    }, [providerData, loading, id]);

    // Set initial favorite state when favorite status data loads
    useEffect(() => {
        if (favoriteStatusData?.data?.is_favorite !== undefined) {
            setIsFavorite(favoriteStatusData.data.is_favorite);
        }
    }, [favoriteStatusData]);

    // Ensure services are set when booking modal opens
    useEffect(() => {
        if (showBookingModal && providerData) {
            // Ensure services are available
            if (providerData.services && providerData.services.length > 0) {
                // Set bookingSelectedService if not already set
                if (!bookingSelectedService && providerData.services[0]) {
                    setBookingSelectedService(providerData.services[0]);
                }
            } else if (providerFromApi?.services) {
                // Extract services from API if not in providerData
                const servicesFromApi = (providerFromApi.services || []).map((s: any) => {
                    if (typeof s === 'string') {
                        return s;
                    } else if (s && typeof s === 'object') {
                        return s.name || s.serviceName || String(s);
                    }
                    return String(s);
                });

                if (servicesFromApi.length > 0) {
                    setProviderData((prev: any) => ({
                        ...prev,
                        services: servicesFromApi
                    }));
                    if (!bookingSelectedService) {
                        setBookingSelectedService(servicesFromApi[0]);
                    }
                }
            }
        }
    }, [showBookingModal, providerData, providerFromApi, bookingSelectedService]);

    const ratingDistribution = useMemo(() => {
        if (!providerData?.reviews || providerData.reviews.length === 0) {
            return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        }
        const counts = providerData.reviews.reduce((acc: Record<number, number>, review: any) => {
            const rating = Math.round(review.rating);
            if (rating >= 1 && rating <= 5) {
                acc[rating] = (acc[rating] || 0) + 1;
            }
            return acc;
        }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

        const total = providerData.reviews.length;
        const percentages: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (let i = 1; i <= 5; i++) {
            percentages[i] = total > 0 ? (counts[i] / total) * 100 : 0;
        }
        return percentages;
    }, [providerData?.reviews]);

    // Sort reviews based on selected criteria
    const sortedReviews = useMemo(() => {
        if (!providerData?.reviews) return [];

        const reviews = [...providerData.reviews];

        switch (sortBy) {
            case 'newest':
                return reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            case 'oldest':
                return reviews.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            case 'highest_rating':
                return reviews.sort((a, b) => b.rating - a.rating);
            case 'lowest_rating':
                return reviews.sort((a, b) => a.rating - b.rating);
            case 'most_helpful':
                // Sort by likes count (most helpful)
                return reviews.sort((a: any, b: any) => (b.likes?.length || 0) - (a.likes?.length || 0));
            default:
                // Default: Sort by most recent first (newest date first)
                return reviews.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
    }, [providerData?.reviews, sortBy]);

    // Handle favorite toggle - instant update
    const handleToggleFavorite = () => {
        if (!id || !user) {
            toast.error('Please log in to add favorites');
            return;
        }

        // Instant optimistic update - no waiting for API
        setIsFavorite(!isFavorite);

        // Fire and forget API call in background
        toggleFavoriteMutation.mutate(id, {
            onError: (error) => {
                // Only rollback on error - most of the time it will succeed
                setIsFavorite(!isFavorite);
                console.error('Failed to toggle favorite:', error);
            }
        });
    };

    // Handle review interactions with optimistic updates

    const handleLikeReview = async (reviewId: string) => {
        if (!reviewId) return;

        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        if (!token) {
            toast.error('Please log in to like reviews.');
            return;
        }

        // Add to loading state
        setLoadingInteractions(prev => new Set(prev).add(reviewId));

        // Store previous state for rollback
        let previousState: any = null;

        // Apply optimistic update immediately
        setProviderData((prev: any) => {
            previousState = prev;
            if (!user?.id) return prev;

            return {
                ...prev,
                reviews: prev.reviews.map((review: any) => {
                    if (review.id === reviewId) {
                        // Toggle like state optimistically
                        // likes is an array of user IDs (strings)
                        const currentLikes = Array.isArray(review.likes) ? review.likes : [];
                        const isCurrentlyLiked = currentLikes.includes(user.id);

                        let newLikes: string[] = [...currentLikes];
                        let newLikesCount = review.likesCount || currentLikes.length;

                        if (isCurrentlyLiked) {
                            // Remove like - filter out current user ID
                            newLikes = newLikes.filter((userId: string) => userId !== user.id);
                            newLikesCount = Math.max(0, newLikesCount - 1);
                        } else {
                            // Add like - add current user ID if not already present
                            if (!newLikes.includes(user.id)) {
                                newLikes.push(user.id);
                                newLikesCount = newLikesCount + 1;
                            }
                        }

                        return {
                            ...review,
                            likes: newLikes,
                            isLiked: !isCurrentlyLiked,
                            likesCount: newLikesCount,
                        };
                    }
                    return review;
                }),
            };
        });

        try {
            const response = await likeReview(reviewId);
            if (response.success) {
                // Update with server response data
                setProviderData((prev: any) => ({
                    ...prev,
                    reviews: prev.reviews.map((review: any) => {
                        if (review.id === reviewId) {
                            const serverData: any = response.data || {};
                            return {
                                ...review,
                                likes: Array.isArray(serverData.likes) ? serverData.likes : review.likes,
                                isLiked: serverData.is_liked !== undefined ? serverData.is_liked : review.isLiked,
                                likesCount: serverData.likes_count !== undefined ? serverData.likes_count : (Array.isArray(serverData.likes) ? serverData.likes.length : review.likesCount),
                            };
                        }
                        return review;
                    }),
                }));

                // Show appropriate success message
                const actionMessage = response.message || 'Review interaction updated!';
                toast.success(actionMessage);
            } else {
                // Only throw error if response.success is false
                throw new Error(response?.message || 'Failed to update review interaction');
            }
        } catch (error: any) {
            console.error('Failed to like review:', error);

            // Rollback optimistic update
            setProviderData(previousState);

            // Handle different types of errors
            let errorMessage = 'Failed to update review interaction. Please try again.';

            if (error.response?.status === 401) {
                errorMessage = 'Please log in to like reviews.';
            } else if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to like reviews.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
        } finally {
            // Remove from loading state
            setLoadingInteractions(prev => {
                const newSet = new Set(prev);
                newSet.delete(reviewId);
                return newSet;
            });
        }
    };

    const handleSaveReview = async (reviewId: string) => {
        if (!reviewId) return;

        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        if (!token) {
            toast.error('Please log in to save reviews.');
            return;
        }

        // Add to loading state
        setLoadingInteractions(prev => new Set(prev).add(reviewId));

        // Store previous state for rollback
        let previousState: any = null;

        // Apply optimistic update immediately
        setProviderData((prev: any) => {
            previousState = prev;
            if (!user?.id) return prev;

            return {
                ...prev,
                reviews: prev.reviews.map((review: any) => {
                    if (review.id === reviewId) {
                        // Toggle save state optimistically
                        // savedBy is an array of user IDs (strings)
                        const currentSavedBy = Array.isArray(review.savedBy) ? review.savedBy : [];
                        const isCurrentlySaved = currentSavedBy.includes(user.id);

                        let newSavedBy: string[] = [...currentSavedBy];
                        let newSavedCount = review.savedCount || currentSavedBy.length;

                        if (isCurrentlySaved) {
                            // Remove save - filter out current user ID
                            newSavedBy = newSavedBy.filter((userId: string) => userId !== user.id);
                            newSavedCount = Math.max(0, newSavedCount - 1);
                        } else {
                            // Add save - add current user ID if not already present
                            if (!newSavedBy.includes(user.id)) {
                                newSavedBy.push(user.id);
                                newSavedCount = newSavedCount + 1;
                            }
                        }

                        return {
                            ...review,
                            savedBy: newSavedBy,
                            isSaved: !isCurrentlySaved,
                            savedCount: newSavedCount,
                        };
                    }
                    return review;
                }),
            };
        });

        try {
            const response = await saveReview(reviewId);
            if (response.success) {
                // Update with server response data
                setProviderData((prev: any) => ({
                    ...prev,
                    reviews: prev.reviews.map((review: any) => {
                        if (review.id === reviewId) {
                            const serverData: any = response.data || {};
                            return {
                                ...review,
                                savedBy: Array.isArray(serverData.saved_by) ? serverData.saved_by : review.savedBy,
                                isSaved: serverData.is_saved !== undefined ? serverData.is_saved : review.isSaved,
                                savedCount: serverData.saved_count !== undefined ? serverData.saved_count : (Array.isArray(serverData.saved_by) ? serverData.saved_by.length : review.savedCount),
                            };
                        }
                        return review;
                    }),
                }));

                // Show appropriate success message
                const actionMessage = response.message || 'Review saved!';
                toast.success(actionMessage);
            } else {
                // Only throw error if response.success is false
                throw new Error(response?.message || 'Failed to save review');
            }
        } catch (error: any) {
            console.error('Failed to save review:', error);

            // Rollback optimistic update
            setProviderData(previousState);

            // Handle different types of errors
            let errorMessage = 'Failed to save review. Please try again.';

            if (error.response?.status === 401) {
                errorMessage = 'Please log in to save reviews.';
            } else if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to save reviews.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
        } finally {
            // Remove from loading state
            setLoadingInteractions(prev => {
                const newSet = new Set(prev);
                newSet.delete(reviewId);
                return newSet;
            });
        }
    };


    const renderStars = (score: number) => {
        return Array.from({ length: 5 }, (_, index) => (
            <svg
                key={index}
                className={`w-4 h-4 ${index < score ? 'text-yellow-400' : 'text-gray-300'}`}
                fill={index < score ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
            </svg>
        ));
    };

    const handleTimeSlotSelect = (timeSlot: string) => {
        setSelectedTimeSlot(timeSlot);
    };


    const nextGalleryImage = () => {
        if (providerData?.practiceInfo?.gallery) {
            setCurrentGalleryImage((prev) =>
                prev === providerData.practiceInfo.gallery.length - 1 ? 0 : prev + 1
            );
        }
    };

    const prevGalleryImage = () => {
        if (providerData?.practiceInfo?.gallery) {
            setCurrentGalleryImage((prev) =>
                prev === 0 ? providerData.practiceInfo.gallery.length - 1 : prev - 1
            );
        }
    };

    // Parse YYYY-MM-DD as a local date to avoid UTC day shifts
    const parseLocalDate = (iso: string) => {
        const [y, m, d] = iso.split('-').map((v) => parseInt(v, 10));
        return new Date(y, (m || 1) - 1, d || 1);
    };

    // Build a set of available weekdays from provider working_hours
    const availableDaysSet = useMemo(() => {
        const wh = (providerFromApi as any)?.working_hours || [];
        const set = new Set<string>();
        wh.forEach((w: any) => {
            if (w?.isAvailable && w?.day) set.add(String(w.day).toLowerCase());
        });
        return set;
    }, [providerFromApi]);

    // Generate availability slots directly from working hours (no API call needed)
    const availabilityByDate: Record<string, string[]> = useMemo(() => {
        const result: Record<string, string[]> = {};
        const workingHours: any[] = (providerFromApi as any)?.working_hours || [];

        if (workingHours.length === 0) {
            return result;
        }

        // Helper to convert time string to minutes
        const toMinutes = (timeStr: string) => {
            if (!timeStr) return 0;
            const [time, mer] = timeStr.split(' ');
            const [hh, mm] = time.split(':').map(Number);
            let h = hh % 12;
            if ((mer || '').toUpperCase().startsWith('P')) h += 12;
            return h * 60 + (mm || 0);
        };

        // Helper to format minutes to time string
        const formatTime = (minutes: number) => {
            const h24 = Math.floor(minutes / 60);
            const mm = minutes % 60;
            const mer = h24 >= 12 ? 'pm' : 'am';
            let h = h24 % 12;
            if (h === 0) h = 12;
            const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
            return `${h}:${pad(mm)} ${mer}`;
        };

        // Get day name from date
        const dayName = (date: Date) => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[date.getDay()].toLowerCase();
        };

        // Generate slots for the current calendar month
        const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(calendarYear, calendarMonth, day);
            const dayNameStr = dayName(date);

            // Find working hours for this day
            const wh = workingHours.find((w: any) =>
                w?.isAvailable &&
                String(w.day || '').toLowerCase() === dayNameStr
            );

            if (!wh || !wh.startTime || !wh.endTime) {
                continue;
            }

            // Generate time slots (every 60 minutes)
            const startMinutes = toMinutes(wh.startTime);
            const endMinutes = toMinutes(wh.endTime);
            const times: string[] = [];

            for (let m = startMinutes; m + 30 <= endMinutes; m += 60) {
                times.push(formatTime(m));
            }

            if (times.length > 0) {
                const isoDate = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                result[isoDate] = times;
            }
        }

        return result;
    }, [providerFromApi, calendarMonth, calendarYear]);

    // Helpers for Today/Tomorrow rendering
    const todayISO = useMemo(() => {
        const d = new Date(today);
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, [today]);
    const tomorrowISO = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, [today]);

    const workingHoursMap = useMemo(() => {
        const wh = (providerFromApi as any)?.working_hours || [];
        const map = new Map<string, any>();
        wh.forEach((w: any) => {
            if (w?.day) map.set(String(w.day).toLowerCase(), w);
        });
        return map;
    }, [providerFromApi]);

    const getWHForDate = (isoDate: string) => {
        const d = parseLocalDate(isoDate);
        const name = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()].toLowerCase();
        return workingHoursMap.get(name);
    };

    // Generate fallback slots strictly from working_hours when API doesn't return times
    const toMinutes = (t: string) => {
        const [time, merRaw] = (t || '').trim().split(/\s+/);
        if (!time) return NaN;
        const [hh, mm] = time.split(':').map((v) => parseInt(v || '0', 10));
        let h = (hh || 0) % 12;
        const mer = (merRaw || '').toLowerCase();
        if (mer.startsWith('p')) h += 12;
        return h * 60 + (mm || 0);
    };

    const fmtTime = (m: number) => {
        const h24 = Math.floor(m / 60);
        const mm = m % 60;
        const mer = h24 >= 12 ? 'pm' : 'am';
        let h = h24 % 12; if (h === 0) h = 12;
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        return `${h}:${pad(mm)} ${mer}`;
    };

    const generateSlotsFromWH = (isoDate: string): string[] => {
        const wh = getWHForDate(isoDate);
        if (!wh?.isAvailable || !wh?.startTime || !wh?.endTime) return [];
        const start = toMinutes(wh.startTime);
        const end = toMinutes(wh.endTime);
        if (isNaN(start) || isNaN(end) || start >= end) return [];
        const times: string[] = [];
        for (let m = start; m + 30 <= end; m += 60) {
            times.push(fmtTime(m));
        }
        return times;
    };

    const slotsForDate = (isoDate: string): string[] => {
        const daySlots = availabilityByDate[isoDate] || [];
        if (daySlots.length > 0) return daySlots;
        // fallback to working hours if available
        return generateSlotsFromWH(isoDate);
    };

    const sortedAvailabilityDates = useMemo(() => {
        return Object.keys(availabilityByDate).sort();
    }, [availabilityByDate]);

    const nextAvailableISO = useMemo(() => {
        const start = new Date(selectedDate);
        for (let i = 1; i <= 30; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const y = d.getFullYear();
            const m = `${d.getMonth() + 1}`.padStart(2, '0');
            const day = `${d.getDate()}`.padStart(2, '0');
            const iso = `${y}-${m}-${day}`;
            const wh = getWHForDate(iso);
            if (wh?.isAvailable) return iso;
        }
        return null;
    }, [selectedDate, workingHoursMap]);

    // Stable next available date relative to Tomorrow (for the Availability Card)
    const nextAvailableFromTomorrowISO = useMemo(() => {
        const start = new Date(tomorrowISO);
        for (let i = 1; i <= 30; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const y = d.getFullYear();
            const m = `${d.getMonth() + 1}`.padStart(2, '0');
            const day = `${d.getDate()}`.padStart(2, '0');
            const iso = `${y}-${m}-${day}`;
            const wh = getWHForDate(iso);
            if (wh?.isAvailable) return iso;
        }
        return null;
    }, [tomorrowISO, workingHoursMap]);

    const timeStringToMinutes = (timeStr: string): number => {
        // Supports formats like "10:00 AM" or "10:00 am"
        const [time, merRaw] = timeStr.trim().split(/\s+/);
        if (!time) return 0;
        const [hhStr, mmStr] = time.split(':');
        let h = parseInt(hhStr || '0', 10);
        const m = parseInt(mmStr || '0', 10);
        const mer = (merRaw || '').toLowerCase();
        h = h % 12;
        if (mer.startsWith('p')) h += 12;
        return h * 60 + (isNaN(m) ? 0 : m);
    };

    const isPastForToday = (dateISO: string, timeStr: string): boolean => {
        if (dateISO !== todayISO) return false;
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const slotMinutes = timeStringToMinutes(timeStr);
        return slotMinutes <= nowMinutes; // past or equal not selectable
    };

    const monthLabel = useMemo(() => {
        return new Date(calendarYear, calendarMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }, [calendarMonth, calendarYear]);

    const calendarCells = useMemo(() => {
        const firstDay = new Date(calendarYear, calendarMonth, 1);
        const startDayIndex = (firstDay.getDay() + 6) % 7; // make Monday=0
        const totalCells = 35; // keep layout as 5 rows
        const baseDate = new Date(calendarYear, calendarMonth, 1 - startDayIndex);
        return Array.from({ length: totalCells }, (_, index) => {
            const date = new Date(baseDate);
            date.setDate(baseDate.getDate() + index);
            return date;
        });
    }, [calendarMonth, calendarYear]);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error || !providerData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Provider Not Found</h1>
                    <p className="text-gray-600 mb-4">{error || 'The provider you are looking for does not exist.'}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gray-50">
            {/* Header Banner with Overlapping Availability Card */}
            <div className="relative  ">
                {/* Banner Background */}
                <div className="relative h-64 bg-cover bg-center" style={{ backgroundImage: `url(${providerData.image})` }}>
                    <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                    <div className="relative h-full flex items-center justify-between p-6">
                        <div className="text-white">
                            <h1 className="text-3xl font-bold mb-2">{providerData.name}</h1>
                            <p className="text-lg mb-2">{providerData.address}</p>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{providerData.rating.score.toFixed(1)}</span>
                                <div className="flex gap-0.5">
                                    {renderStars(providerData.rating.score)}
                                </div>
                                <span className="text-sm">({providerData.rating.reviews})</span>
                            </div>
                            <p className="text-sm">{providerData.openStatus}</p>
                        </div>
                        <div className="flex items-center gap-4 mr-[420px]">
                            <button
                                onClick={() => {
                                    if (!isAuthenticated) {
                                        setShowSignInModal(true);
                                        return;
                                    }
                                    const userType = (user?.user_type || '').toLowerCase();
                                    if (userType !== 'patient') {
                                        toast.error('Only patients can report a provider.');
                                        return;
                                    }
                                    setShowReportModal(true);
                                }}
                                className="bg-white/15 hover:bg-white/20 border border-white/25 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Report
                            </button>

                            <button
                                onClick={handleToggleFavorite}
                                className="text-white hover:text-red-400 transition-colors"
                                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <svg className="w-8 h-8" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Overlapping Availability Card */}
                <div className="absolute top-[40px] z-[30] right-10 w-96">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">Availability</h3>
                        <div className="border-b border-gray-200 mb-4"></div>

                        {/* Service Dropdown */}
                        <div className="mb-6">
                            <div className="relative">
                                <select
                                    value={selectedService}
                                    onChange={(e) => setSelectedService(e.target.value)}
                                    disabled={!providerData.services || providerData.services.length === 0}
                                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 ${(!providerData.services || providerData.services.length === 0) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                >
                                    {(!providerData.services || providerData.services.length === 0) ? (
                                        <option value="">No services available</option>
                                    ) : (
                                        providerData.services.map((service: string) => (
                                            <option key={service} value={service}>
                                                {service}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Time Slots */}
                        {(!providerData.services || providerData.services.length === 0) ? (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg text-center my-6">
                                <p className="font-medium">No services available</p>
                                <p className="text-sm mt-1">This provider has not listed any services yet. Booking is currently unavailable.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Today */}
                                <div>
                                    <h4 className="text-base font-medium text-gray-900 mb-3">Today</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {slotsForDate(todayISO).slice(0, 6).map((slot: string) => (
                                            <button
                                                key={`today-${slot}`}
                                                onClick={() => {
                                                    setSelectedDate(todayISO);
                                                    handleTimeSlotSelect(slot);
                                                    setShowBookingModal(true);
                                                    setBookingSelectedService(selectedService);
                                                    setSelectedTime(slot);
                                                }}
                                                className={`px-2 py-2 rounded-full text-xs border transition-colors text-center ${selectedDate === todayISO && selectedTime && timeStringToMinutes(selectedTime) === timeStringToMinutes(slot)
                                                    ? 'bg-[#06202E] text-white border-[#06202E]'
                                                    : 'border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                                                    }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                        {slotsForDate(todayISO).length === 0 && (
                                            <div className="col-span-3 text-sm text-gray-500 italic">No slots available</div>
                                        )}
                                    </div>
                                </div>

                                {/* Tomorrow */}
                                <div>
                                    <h4 className="text-base font-medium text-gray-900 mb-3">
                                        {new Date(tomorrowISO).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}, Tomorrow
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {slotsForDate(tomorrowISO).slice(0, 6).map((slot: string) => (
                                            <button
                                                key={`tomorrow-${slot}`}
                                                onClick={() => {
                                                    setSelectedDate(tomorrowISO);
                                                    handleTimeSlotSelect(slot);
                                                    setShowBookingModal(true);
                                                    setBookingSelectedService(selectedService);
                                                    setSelectedTime(slot);
                                                }}
                                                className={`px-2 py-2 rounded-full text-xs border transition-colors text-center ${selectedDate === tomorrowISO && selectedTime && timeStringToMinutes(selectedTime) === timeStringToMinutes(slot)
                                                    ? 'bg-[#06202E] text-white border-[#06202E]'
                                                    : 'border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                                                    }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                        {slotsForDate(tomorrowISO).length === 0 && (
                                            <div className="col-span-3 text-sm text-gray-500 italic">No slots available</div>
                                        )}
                                    </div>
                                </div>

                                {/* Next Available Day */}
                                {nextAvailableFromTomorrowISO && (
                                    <div>
                                        <h4 className="text-base font-medium text-gray-900 mb-3">
                                            {new Date(nextAvailableFromTomorrowISO).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
                                        </h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {slotsForDate(nextAvailableFromTomorrowISO).slice(0, 6).map((slot: string) => (
                                                <button
                                                    key={`next-${slot}`}
                                                    onClick={() => {
                                                        setSelectedDate(nextAvailableFromTomorrowISO);
                                                        handleTimeSlotSelect(slot);
                                                        setShowBookingModal(true);
                                                        setBookingSelectedService(selectedService);
                                                        setSelectedTime(slot);
                                                    }}
                                                    className={`px-2 py-2 rounded-full text-xs border transition-colors text-center ${selectedDate === nextAvailableFromTomorrowISO && selectedTime && timeStringToMinutes(selectedTime) === timeStringToMinutes(slot)
                                                        ? 'bg-[#06202E] text-white border-[#06202E]'
                                                        : 'border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                                                        }`}
                                                >
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* See all appointments button */}
                        <button
                            onClick={() => {
                                setShowBookingModal(true);
                                setBookingSelectedService(selectedService);
                                setShowDateTimeError(false);
                            }}
                            disabled={!providerData.services || providerData.services.length === 0}
                            className={`w-full mt-8 py-3 px-4 rounded-lg font-medium text-sm transition-colors ${(!providerData.services || providerData.services.length === 0)
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300'
                                : 'bg-[#06202E] text-white hover:bg-[#06202E]/90'
                                }`}
                        >
                            See all appointments
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white px-16 border-b sticky top-0 z-20">
                <div className="max-w-7xl">
                    <div className="flex space-x-8">
                        {['About', 'Practice Information', 'Contact'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    const element = document.getElementById(tab);
                                    if (element) {
                                        element.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab
                                    ? 'border-[#06202E] text-[#06202E]'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[850px] w-full bg-white px-8 py-8">
                {/* About Section */}
                <section id="About" className="mb-16">
                    <div className="flex items-start border-b border-gray-200 pb-8">
                        <div className="flex-1 p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                About {providerData.name}
                            </h2>

                            <div className="flex gap-6">
                                <div className="flex-1">
                                    <p className="text-gray-700 leading-relaxed mb-4">
                                        {showFullDescription
                                            ? providerData.description
                                            : providerData.description.substring(0, 200) + '...'
                                        }
                                    </p>
                                    <button
                                        onClick={() => setShowFullDescription(!showFullDescription)}
                                        className="text-[#06202E] hover:text-[#06202E]/80 font-medium"
                                    >
                                        {showFullDescription ? 'Show less' : 'Show more'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="w-48 h-44 bg-gray-200 rounded-lg flex-shrink-0">
                            <img
                                src={providerData.image}
                                alt={providerData.name}
                                className="w-full h-full object-cover rounded-lg"
                            />
                        </div>
                    </div>
                </section>

                {/* Practice Information Section */}
                <section id="Practice Information" className="mb-16">
                    <div className="space-y-8">
                        {/* Practice Gallery */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Practice gallery</h3>
                            </div>

                            <div className="relative">
                                {providerData.practiceInfo?.gallery && providerData.practiceInfo.gallery.length > 0 ? (
                                    <div className="relative h-64 bg-gray-200 rounded-lg overflow-hidden">
                                        <img
                                            src={providerData.practiceInfo.gallery[currentGalleryImage]}
                                            alt={`Gallery image ${currentGalleryImage + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Navigation Arrows */}
                                        <button
                                            onClick={prevGalleryImage}
                                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100 transition-all"
                                        >
                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={nextGalleryImage}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100 transition-all"
                                        >
                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>

                                        {/* Pagination Dots */}
                                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                            {providerData.practiceInfo.gallery.map((_: string, index: number) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setCurrentGalleryImage(index)}
                                                    className={`w-2 h-2 rounded-full transition-colors ${index === currentGalleryImage ? 'bg-white' : 'bg-white bg-opacity-50'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-32 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
                                        <svg className="w-10 h-10 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p>No images available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Practice Information */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Practice Information</h3>

                            {/* Services Section */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-md font-medium text-gray-900">Services</h4>
                                    <button
                                        onClick={() => setShowAllServices(!showAllServices)}
                                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                                    >
                                        {showAllServices ? 'Show by category' : 'Show all'}
                                    </button>
                                </div>

                                {/* Service Tabs - Hide when showing all */}
                                {!showAllServices && (
                                    <div className="flex space-x-1 mb-4">
                                        {['scans', 'tests', 'consultation'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveServiceTab(tab)}
                                                className={`px-4 py-2 text-sm rounded-md transition-colors ${activeServiceTab === tab
                                                    ? 'bg-gray-800 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Service List */}
                                <div className="space-y-3">
                                    {showAllServices ? (
                                        // Show all services from all categories
                                        (() => {
                                            const allServices: { name: string; price: string; category?: string }[] = [];
                                            const serviceNamesSet = new Set<string>(); // To avoid duplicates

                                            // First, get services from practiceInfo.services (categorized)
                                            const practiceServices = providerData.practiceInfo?.services;
                                            if (practiceServices && typeof practiceServices === 'object') {
                                                Object.entries(practiceServices).forEach(([category, serviceList]: [string, any]) => {
                                                    if (Array.isArray(serviceList)) {
                                                        serviceList.forEach((service: { name: string; price: string }) => {
                                                            if (service.name && !serviceNamesSet.has(service.name)) {
                                                                allServices.push({ ...service, category });
                                                                serviceNamesSet.add(service.name);
                                                            }
                                                        });
                                                    }
                                                });
                                            }

                                            // Also add services from providerData.services (flat array) if not already included
                                            if (providerData.services && Array.isArray(providerData.services)) {
                                                providerData.services.forEach((service: any) => {
                                                    const serviceName = typeof service === 'string' ? service : (service?.name || String(service));
                                                    if (serviceName && !serviceNamesSet.has(serviceName)) {
                                                        const servicePrice = typeof service === 'object' && service?.price ? service.price : '';
                                                        allServices.push({ name: serviceName, price: servicePrice });
                                                        serviceNamesSet.add(serviceName);
                                                    }
                                                });
                                            }

                                            // Also check providerFromApi as additional source
                                            if (providerFromApi?.services && Array.isArray(providerFromApi.services)) {
                                                providerFromApi.services.forEach((service: any) => {
                                                    const serviceName = typeof service === 'string' ? service : (service?.name || service?.serviceName || String(service));
                                                    if (serviceName && !serviceNamesSet.has(serviceName)) {
                                                        const servicePrice = typeof service === 'object' && service?.price ? service.price : '';
                                                        allServices.push({ name: serviceName, price: servicePrice });
                                                        serviceNamesSet.add(serviceName);
                                                    }
                                                });
                                            }

                                            if (allServices.length === 0) {
                                                return (
                                                    <div className="text-gray-500 text-sm py-4 bg-gray-50 rounded-lg text-center">
                                                        <p>No services available</p>
                                                    </div>
                                                );
                                            }

                                            return allServices.map((service, index) => (
                                                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-700">{service.name}</span>
                                                        {service.category && (
                                                            <span className="text-xs text-gray-500 capitalize">{service.category}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-4">
                                                        {service.price && (
                                                            <span className="text-gray-900 font-medium">{service.price}</span>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setShowBookingModal(true);
                                                                setBookingSelectedService(service.name);
                                                                setShowDateTimeError(false);
                                                            }}
                                                            className="bg-[#06202E] text-white px-3 py-1 rounded text-sm hover:bg-[#06202E]/90 transition-colors"
                                                        >
                                                            Book
                                                        </button>
                                                    </div>
                                                </div>
                                            ));
                                        })()
                                    ) : (
                                        // Show services for active tab
                                        (() => {
                                            const servicesForTab = providerData.practiceInfo?.services[activeServiceTab as keyof typeof providerData.practiceInfo.services];
                                            if (!servicesForTab || servicesForTab.length === 0) {
                                                return (
                                                    <div className="text-gray-500 text-sm py-4 bg-gray-50 rounded-lg text-center">
                                                        <p>No services available</p>
                                                    </div>
                                                );
                                            }

                                            return servicesForTab.map((service: any, index: number) => (
                                                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-700">{service.name}</span>
                                                        {(service.description || service.uses) && (
                                                            <span className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                                {service.description || service.uses}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-4">
                                                        <span className="text-gray-900 font-medium">{service.price}</span>
                                                        <button
                                                            onClick={() => {
                                                                setShowBookingModal(true);
                                                                setBookingSelectedService(service.name);
                                                                setShowDateTimeError(false);
                                                            }}
                                                            className="bg-[#06202E] text-white px-3 py-1 rounded text-sm hover:bg-[#06202E]/90 transition-colors"
                                                        >
                                                            Book
                                                        </button>
                                                    </div>
                                                </div>
                                            ));
                                        })()
                                    )}
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="mb-8">
                                <h4 className="text-md font-medium text-gray-900 mb-4">Contact details</h4>
                                <div className="space-y-3">
                                    <div className="flex items-start space-x-3">
                                        <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <div>
                                            <p className="text-gray-700">{providerData.practiceInfo?.contactDetails.address}</p>
                                            <button
                                                onClick={() => {
                                                    const address = providerData.practiceInfo?.contactDetails.address;
                                                    if (address) {
                                                        // Open Google Maps with the address
                                                        const encodedAddress = encodeURIComponent(address);
                                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
                                                    }
                                                }}
                                                className="text-blue-600 hover:text-blue-800 text-sm underline"
                                            >
                                                View in map
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <span className="text-gray-700">{providerData.practiceInfo?.contactDetails.phone}</span>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-gray-700">{providerData.practiceInfo?.contactDetails.email || ''}</span>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                                        </svg>
                                        <span className="text-gray-700">{providerData.practiceInfo?.contactDetails.website || ''}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Social Media */}
                            <div className="mb-8">
                                <h4 className="text-md font-medium text-gray-900 mb-4">Social media</h4>
                                <div className="flex space-x-4">
                                    {!!providerData.practiceInfo?.socialMedia.facebook && (
                                        <a
                                            href={providerData.practiceInfo.socialMedia.facebook}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[#06202E] hover:text-[#06202E]/80"
                                        >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                        </svg>
                                        </a>
                                    )}
                                    {!!providerData.practiceInfo?.socialMedia.instagram && (
                                        <a
                                            href={providerData.practiceInfo.socialMedia.instagram}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[#06202E] hover:text-[#06202E]/80"
                                        >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z" />
                                        </svg>
                                        </a>
                                    )}
                                    {!!providerData.practiceInfo?.socialMedia.twitter && (
                                        <a
                                            href={providerData.practiceInfo.socialMedia.twitter}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[#06202E] hover:text-[#06202E]/80"
                                        >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                        </svg>
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Opening Hours */}
                            <div className="mb-8">
                                <h4 className="text-md font-medium text-gray-900 mb-4">Opening hours</h4>
                                <div className="space-y-2">
                                    {Object.entries((providerData.practiceInfo?.openingHours || {}) as Record<string, string>).map(([day, hours]) => (
                                        <div key={day} className="flex justify-between">
                                            <span className="text-gray-700 capitalize">{day}</span>
                                            <span className="text-gray-900">{hours as string}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Accreditations */}
                            <div className="mb-8">
                                <h4 className="text-md font-medium text-gray-900 mb-4">Accreditations</h4>
                                <div className="space-y-2">
                                    {providerData.practiceInfo?.accreditations.map((accreditation: string, index: number) => (
                                        <div key={index} className="text-gray-700">{accreditation}</div>
                                    ))}
                                </div>
                            </div>
                        </div>


                    </div>
                </section>

                {/* Contact Section */}
                <section id="Contact" className="mb-16">
                    {/* Ratings and Reviews Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">Ratings and Reviews</h4>
                                <p className="text-gray-500 text-sm">Share insights about your experience with others</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (!isAuthenticated) {
                                        setShowSignInModal(true);
                                    } else {
                                        setShowAddReviewModal(true);
                                    }
                                }}
                                className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
                            >
                                Write a review
                            </button>
                        </div>

                        {/* Dynamic Reviews */}
                        <div className="space-y-6">
                            {providerData.reviews && providerData.reviews.length > 0 ? (
                                providerData.reviews.slice(0, 1).map((r: any, idx: number) => (
                                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-start space-x-3 mb-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                                {r.profilePicture ? (
                                                    <img
                                                        src={r.profilePicture}
                                                        alt={r.author || 'User'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                                                        <span className="text-blue-600 font-medium text-sm">
                                                            {r.author ? r.author.charAt(0).toUpperCase() : 'U'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h6 className="text-sm font-bold text-gray-900">{r.author || 'Anonymous User'}</h6>
                                                    <span className="text-xs text-gray-500">{r.date ? new Date(r.date).toLocaleDateString() : ''}</span>
                                                </div>
                                                <div className="flex items-center space-x-1 mb-2">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <svg key={i} className={`w-4 h-4 ${i < (r.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    ))}
                                                </div>
                                                <p className="text-gray-700 text-sm leading-relaxed">{r.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-500 text-sm">No reviews yet.</div>
                            )}
                        </div>
                        {providerData.reviews && providerData.reviews.length > 3 && (
                            <div className="mt-4">
                                <button
                                    onClick={() => setShowReviewsModal(true)}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    See all
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Booking Policy Section - Outside Grid */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                        <h4 className="text-lg font-bold text-gray-900 mb-3">Booking Policy</h4>
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <p className="text-gray-700 text-sm">
                                    {providerData.policy || 'No booking policy provided.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Reviews Modal */}
            {showReviewsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Ratings and reviews</h2>
                            <button
                                onClick={() => setShowReviewsModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {/* Overall Rating Summary */}
                            <div className="flex items-start space-x-8 mb-6">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-gray-900 mb-1">{providerData.rating.score.toFixed(1)}</div>
                                    <div className="text-sm text-gray-600">{providerData.rating.reviews} RATINGS</div>
                                </div>

                                {/* Rating Breakdown */}
                                <div className="flex-1">
                                    <div className="space-y-2">
                                        {[5, 4, 3, 2, 1].map((stars) => (
                                            <div key={stars} className="flex items-center space-x-3">
                                                <div className="flex items-center space-x-1 w-8">
                                                    <span className="text-sm text-gray-600">{stars}</span>
                                                    <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-orange-400 h-2 rounded-full"
                                                        style={{ width: `${ratingDistribution[stars as keyof typeof ratingDistribution]}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Sort by:</span>
                                    <div className="relative">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-800 transition-colors text-sm font-medium appearance-none pr-8 cursor-pointer"
                                        >
                                            <option value="most_helpful">Most helpful</option>
                                            <option value="newest">Newest</option>
                                            <option value="oldest">Oldest</option>
                                            <option value="highest_rating">Highest rating</option>
                                            <option value="lowest_rating">Lowest rating</option>
                                        </select>
                                        <svg className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!isAuthenticated) {
                                            setShowSignInModal(true);
                                        } else {
                                            setShowAddReviewModal(true);
                                        }
                                    }}
                                    className="bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-800 transition-colors text-sm font-medium"
                                >
                                    Add a review
                                </button>
                            </div>

                            {/* Reviews List */}
                            <div className="max-h-96 overflow-y-auto space-y-6">
                                {sortedReviews.map((review: any, index: number) => (
                                    <div key={review.id || index} className="border-b border-gray-200 pb-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                {/* User Avatar */}
                                                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                                    {review.profilePicture ? (
                                                        <img
                                                            src={review.profilePicture}
                                                            alt={review.author || 'User'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                                                            <span className="text-blue-600 font-medium text-sm">
                                                                {review.author ? review.author.charAt(0).toUpperCase() : 'U'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* User Name and Rating */}
                                                <div className="flex flex-col">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            {review.author || 'Anonymous User'}
                                                        </span>
                                                        <div className="flex items-center space-x-1">
                                                            <span className="text-sm font-medium text-gray-900">{review.rating.toFixed(1)}</span>
                                                            {renderStars(review.rating)}
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {review.date ? new Date(review.date).toLocaleDateString() : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {/* Like Button */}
                                                <button
                                                    onClick={() => handleLikeReview(review.id)}
                                                    disabled={loadingInteractions.has(review.id)}
                                                    className={`flex items-center space-x-1 p-1 transition-colors disabled:opacity-50 ${review.isLiked
                                                        ? 'text-green-600 hover:text-green-700'
                                                        : 'text-gray-400 hover:text-green-600'
                                                        }`}
                                                >
                                                    {loadingInteractions.has(review.id) ? (
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                        </svg>
                                                    )}
                                                    <span className="text-xs">{review.likesCount || 0}</span>
                                                </button>


                                                {/* Save Button */}
                                                <button
                                                    onClick={() => handleSaveReview(review.id)}
                                                    disabled={loadingInteractions.has(review.id)}
                                                    className={`flex items-center space-x-1 p-1 transition-colors disabled:opacity-50 ${review.isSaved
                                                        ? 'text-blue-600 hover:text-blue-700'
                                                        : 'text-gray-400 hover:text-blue-600'
                                                        }`}
                                                >
                                                    {loadingInteractions.has(review.id) ? (
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                        </svg>
                                                    )}
                                                    <span className="text-xs">{review.savedCount || 0}</span>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-gray-700 text-sm leading-relaxed">{review.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Review Modal */}
            {showAddReviewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-md">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Review and Rating</h2>
                            <p className="text-gray-600 text-sm mt-1">Give feedback on your experience.</p>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Rating Section */}
                            <div>
                                <h3 className="text-gray-900 font-medium mb-3">How would you rate your experience?</h3>
                                <div className="flex space-x-2">
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <button
                                            key={rating}
                                            onClick={() => setSelectedRating(rating)}
                                            className={`w-12 h-12 rounded-md border-2 font-medium transition-colors ${selectedRating === rating
                                                ? 'bg-gray-900 text-white border-gray-900'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                                }`}
                                        >
                                            {rating}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback Section */}
                            <div>
                                <h3 className="text-gray-900 font-medium mb-3">Anything that can be improved?</h3>
                                <textarea
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    placeholder="Your review (Optional)"
                                    className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowAddReviewModal(false);
                                        setSelectedRating(5);
                                        setReviewText('');
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSubmittingReview || !reviewText.trim()}
                                    onClick={async () => {
                                        if (!id) return;

                                        const tempId = `temp_${Date.now()}`;
                                        const createdAtIso = new Date().toISOString();

                                        // Create optimistic review item
                                        const optimisticReview = {
                                            id: tempId,
                                            rating: selectedRating,
                                            text: reviewText,
                                            author: user?.full_name || 'You',
                                            profilePicture: user?.profile_picture?.url || null,
                                            date: createdAtIso,
                                            likes: [],
                                            dislikes: [],
                                            savedBy: [],
                                            isLiked: false,
                                            isSaved: false,
                                            likesCount: 0,
                                            savedCount: 0,
                                        };

                                        setIsSubmittingReview(true);

                                        // Store previous state for rollback
                                        let previousState: any = null;

                                        // Apply optimistic update immediately
                                        setProviderData((prev: any) => {
                                            previousState = prev;

                                            // Calculate new rating average
                                            const currentReviews = prev?.reviews || [];
                                            const currentCount = currentReviews.length;
                                            const currentAvg = prev?.rating?.score || 0;

                                            const newCount = currentCount + 1;
                                            const newAvg = currentCount > 0
                                                ? ((currentAvg * currentCount) + selectedRating) / newCount
                                                : selectedRating;

                                            return {
                                                ...prev,
                                                reviews: [optimisticReview, ...currentReviews],
                                                rating: {
                                                    score: newAvg,
                                                    reviews: newCount,
                                                },
                                            };
                                        });

                                        // Close modal immediately for better UX
                                        setShowAddReviewModal(false);
                                        setSelectedRating(5);
                                        setReviewText('');

                                        try {
                                            // Submit to API
                                            const payload = {
                                                provider_id: id,
                                                rating: selectedRating,
                                                comment: reviewText
                                            };

                                            const response = await createReview(payload);

                                            if (response?.success && response.data) {
                                                // Replace optimistic review with server response
                                                const serverReview: any = response.data;

                                                // Get profile picture from user or server response
                                                const profilePictureUrl =
                                                    serverReview.patient?.profile_picture?.url ||
                                                    user?.profile_picture?.url ||
                                                    null;

                                                // Get author name from server response or user
                                                const authorName =
                                                    serverReview.patient?.full_name ||
                                                    serverReview.patient_name ||
                                                    user?.full_name ||
                                                    'You';

                                                // Extract likes and saved_by arrays (should be arrays of user IDs)
                                                const likesArray = Array.isArray(serverReview.likes) ? serverReview.likes : [];
                                                const savedByArray = Array.isArray(serverReview.saved_by) ? serverReview.saved_by : [];
                                                const currentUserId = user?.id;

                                                const finalReview = {
                                                    id: serverReview._id || serverReview.id || tempId,
                                                    rating: serverReview.rating || selectedRating,
                                                    text: serverReview.comment || serverReview.text || reviewText,
                                                    author: authorName,
                                                    profilePicture: profilePictureUrl,
                                                    date: serverReview.created_at || serverReview.updated_at || createdAtIso,
                                                    likes: likesArray,
                                                    dislikes: serverReview.dislikes || [],
                                                    savedBy: savedByArray,
                                                    isLiked: serverReview.is_liked !== undefined
                                                        ? serverReview.is_liked
                                                        : (currentUserId ? likesArray.includes(currentUserId) : false),
                                                    isSaved: serverReview.is_saved !== undefined
                                                        ? serverReview.is_saved
                                                        : (currentUserId ? savedByArray.includes(currentUserId) : false),
                                                    likesCount: serverReview.likes_count !== undefined
                                                        ? serverReview.likes_count
                                                        : likesArray.length,
                                                    savedCount: serverReview.saved_count !== undefined
                                                        ? serverReview.saved_count
                                                        : savedByArray.length,
                                                };

                                                setProviderData((prev: any) => ({
                                                    ...prev,
                                                    reviews: (prev?.reviews || []).map((r: any) =>
                                                        r.id === tempId ? finalReview : r
                                                    ),
                                                }));

                                                toast.success('Review submitted successfully!');
                                            } else {
                                                throw new Error(response?.message || 'Failed to submit review');
                                            }
                                        } catch (error: any) {
                                            console.error('Failed to create review:', error);

                                            // Rollback optimistic update
                                            setProviderData(previousState);

                                            // Show error message
                                            const errorMessage = error.response?.data?.message ||
                                                error.message ||
                                                'Failed to submit review. Please try again.';
                                            toast.error(errorMessage);

                                            // Reopen modal for retry
                                            setShowAddReviewModal(true);
                                            setSelectedRating(selectedRating);
                                            setReviewText(reviewText);
                                        } finally {
                                            setIsSubmittingReview(false);
                                        }
                                    }}
                                    className={`flex-1 px-4 py-2 rounded-md transition-colors font-medium ${isSubmittingReview || !reviewText.trim() ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                                >
                                    {isSubmittingReview ? 'Submitting…' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sign In Required Modal */}
            {showSignInModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowSignInModal(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200 relative">
                            <button
                                onClick={() => setShowSignInModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <h2 className="text-xl font-bold text-gray-900 pr-8">Sign In Required</h2>
                            <p className="text-gray-600 text-sm mt-1">You need to sign in to add a review.</p>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-center text-gray-700 mb-6">
                                Please sign in to your account to share your experience and add a review.
                            </p>

                            {/* Action Buttons */}
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowSignInModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSignInModal(false);
                                        navigate('/sign-in-patient', { state: { from: window.location.pathname } });
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
                                >
                                    Sign In
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Modal */}
            {showBookingModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">{providerData.name}</h2>
                            <button
                                onClick={() => setShowBookingModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Calendar Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">Select Date <span className="text-red-500">*</span></h3>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4">Choose a date for your appointment</p>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">{monthLabel}</h3>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => {
                                                    if (calendarMonth === 0) {
                                                        setCalendarMonth(11);
                                                        setCalendarYear((y) => y - 1);
                                                    } else {
                                                        setCalendarMonth((m) => m - 1);
                                                    }
                                                }}
                                                className="p-1 text-gray-400 hover:text-gray-600"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (calendarMonth === 11) {
                                                        setCalendarMonth(0);
                                                        setCalendarYear((y) => y + 1);
                                                    } else {
                                                        setCalendarMonth((m) => m + 1);
                                                    }
                                                }}
                                                className="p-1 text-gray-400 hover:text-gray-600"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {/* Day Headers */}
                                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                                            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                                {day}
                                            </div>
                                        ))}

                                        {/* Calendar Days */}
                                        {calendarCells.map((date, index) => {
                                            const isCurrentMonth = date.getMonth() === calendarMonth;
                                            const isToday = date.toDateString() === today.toDateString();
                                            const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                            const isPastDay = date < startOfToday;
                                            const y = date.getFullYear();
                                            const m = `${date.getMonth() + 1}`.padStart(2, '0');
                                            const d2 = `${date.getDate()}`.padStart(2, '0');
                                            const iso = `${y}-${m}-${d2}`;
                                            const isSelected = selectedDate === iso;
                                            const wh = getWHForDate(iso);
                                            const isWeekdayAvailable = !!wh?.isAvailable;
                                            const baseClasses = 'p-2 text-sm rounded-md transition-colors';
                                            let stateClasses = '';
                                            if (!isCurrentMonth) {
                                                stateClasses = 'text-gray-400';
                                            } else if (isPastDay && !isToday) {
                                                stateClasses = 'text-gray-300 bg-gray-50 cursor-not-allowed';
                                            } else if (isToday) {
                                                stateClasses = 'bg-blue-100 text-blue-900 font-semibold';
                                            } else if (!isWeekdayAvailable) {
                                                stateClasses = 'text-gray-300 bg-gray-50 cursor-not-allowed';
                                            } else if (isSelected) {
                                                stateClasses = 'bg-gray-900 text-white';
                                            } else {
                                                stateClasses = 'text-gray-900 hover:bg-gray-100';
                                            }
                                            return (
                                                <button
                                                    key={`${iso}-${index}`}
                                                    onClick={() => {
                                                        if ((!isPastDay || isToday) && isWeekdayAvailable) {
                                                            setSelectedDate(iso);
                                                            setShowDateTimeError(false);
                                                            // Clear time selection when date changes
                                                            setSelectedTime('');
                                                        }
                                                    }}
                                                    disabled={(isPastDay && !isToday) || !isWeekdayAvailable}
                                                    className={`${baseClasses} ${stateClasses}`}
                                                >
                                                    {date.getDate()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Appointment Section */}
                                <div>
                                    {/* Service Selection */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
                                        <select
                                            value={bookingSelectedService}
                                            onChange={(e) => setBookingSelectedService(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            {(!providerData?.services || providerData.services.length === 0) ? (
                                                <option value="">No services available</option>
                                            ) : (
                                                providerData.services.map((service: string, idx: number) => (
                                                    <option key={`${service}-${idx}`} value={service}>
                                                        {service}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>

                                    {/* Next Available */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Time <span className="text-red-500">*</span></h3>
                                        <p className="text-xs text-gray-500 mb-4">Choose a time slot for your appointment</p>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Next available</h3>

                                        {/* Selected Day */}
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-medium text-gray-900">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                                                {selectedDate === todayISO && (
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">TODAY</span>
                                                )}
                                                {selectedDate === tomorrowISO && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">TOMORROW</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {slotsForDate(selectedDate).map((time, i) => {
                                                    const disabled = isPastForToday(selectedDate, time);
                                                    const isSelected = selectedTime && timeStringToMinutes(selectedTime) === timeStringToMinutes(time);
                                                    return (
                                                        <button
                                                            key={`${time}-${i}`}
                                                            onClick={() => {
                                                                if (!disabled) {
                                                                    setSelectedTime(time);
                                                                    setShowDateTimeError(false);
                                                                }
                                                            }}
                                                            disabled={disabled}
                                                            className={`px-3 py-2 text-sm rounded-full border transition-colors ${disabled
                                                                ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                                                : isSelected
                                                                    ? 'bg-[#06202E] text-white border-[#06202E]'
                                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-500 hover:text-blue-600'
                                                                }`}
                                                        >
                                                            {time}
                                                        </button>
                                                    );
                                                })}
                                                {slotsForDate(selectedDate).length === 0 && (
                                                    <div className="col-span-3 text-sm text-gray-500 italic">No slots for this day.</div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col space-y-3 pt-6 mt-auto border-t border-gray-200">
                                {/* Error Message */}
                                {showDateTimeError && (!selectedDate || !selectedTime) && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            <span>Please select both a date and time for your appointment before continuing.</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => {
                                            setShowBookingModal(false);
                                            setShowDateTimeError(false);
                                        }}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Validate that both date and time are selected
                                            if (!selectedDate || !selectedTime) {
                                                setShowDateTimeError(true);
                                                toast.error('Please select both a date and time for your appointment');
                                                return;
                                            }

                                            // Persist booking draft to localStorage
                                            try {
                                                const svcFromApi = ((providerFromApi as any)?.services || []).find((s: any) => {
                                                    if (!s) return false;
                                                    const name = s?.name || String(s);
                                                    return name === bookingSelectedService;
                                                });
                                                const draft = {
                                                    provider: {
                                                        id,
                                                        name: providerData.name,
                                                        address: providerData.address,
                                                        image: providerData.image,
                                                    },
                                                    service: svcFromApi || { name: bookingSelectedService },
                                                    date: selectedDate,
                                                    time: selectedTime,
                                                };
                                                localStorage.setItem('bookingDraft', JSON.stringify(draft));
                                            } catch { }

                                            // Navigate to booking page with provider ID
                                            navigate(`/patient/booking/${id}`, {
                                                state: {
                                                    provider: {
                                                        id,
                                                        name: providerData.name,
                                                        address: providerData.address,
                                                        image: providerData.image,
                                                    },
                                                    service: bookingSelectedService,
                                                    date: selectedDate,
                                                    time: selectedTime,
                                                }
                                            });
                                            setShowBookingModal(false);
                                            setShowDateTimeError(false);
                                        }}
                                        disabled={!selectedDate || !selectedTime}
                                        className={`px-4 py-2 rounded-md transition-colors ${!selectedDate || !selectedTime
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-900 text-white hover:bg-gray-800'
                                            }`}
                                    >
                                        Book Appointment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Provider Modal (Patient only) */}
            {showReportModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-semibold text-[#16202E]">Report {providerData?.name}</h3>
                                <p className="text-sm text-gray-500">Submit a report about this provider.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowReportModal(false);
                                    setReportCategory('');
                                    setReportMessage('');
                                    setReportAnonymous(false);
                                }}
                                className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-2">Category (optional)</label>
                                <select
                                    value={reportCategory}
                                    onChange={(e) => setReportCategory(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                                >
                                    <option value="">Select category</option>
                                    <option value="Service quality">Service quality</option>
                                    <option value="Fraud/Scam">Fraud/Scam</option>
                                    <option value="Abuse/Harassment">Abuse/Harassment</option>
                                    <option value="No show">No show</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-2">Message (required)</label>
                                <textarea
                                    value={reportMessage}
                                    onChange={(e) => setReportMessage(e.target.value)}
                                    rows={5}
                                    placeholder="Describe what happened (min 10 characters)"
                                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                    {reportMessage.trim().length}/10 minimum
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
                                <input
                                    type="checkbox"
                                    className="accent-[#06202E]"
                                    checked={reportAnonymous}
                                    onChange={(e) => setReportAnonymous(e.target.checked)}
                                />
                                Submit anonymously (provider won’t see your details)
                            </label>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowReportModal(false);
                                        setReportCategory('');
                                        setReportMessage('');
                                        setReportAnonymous(false);
                                    }}
                                    className="px-5 py-3 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                                    disabled={reportProviderMutation.isPending}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={reportProviderMutation.isPending}
                                    onClick={() => {
                                        if (!id) {
                                            toast.error('Missing provider id');
                                            return;
                                        }
                                        const userType = (user?.user_type || '').toLowerCase();
                                        if (userType !== 'patient') {
                                            toast.error('Only patients can report a provider.');
                                            return;
                                        }
                                        const msg = reportMessage.trim();
                                        if (msg.length < 10) {
                                            toast.error('Message must be at least 10 characters');
                                            return;
                                        }

                                        reportProviderMutation.mutate(
                                            {
                                                providerId: id,
                                                payload: {
                                                    message: msg,
                                                    anonymous: reportAnonymous,
                                                    ...(reportCategory ? { category: reportCategory as any } : {}),
                                                },
                                            },
                                            {
                                                onSuccess: () => {
                                                    setShowReportModal(false);
                                                    setReportCategory('');
                                                    setReportMessage('');
                                                    setReportAnonymous(false);
                                                },
                                            }
                                        );
                                    }}
                                    className="px-5 py-3 rounded-lg text-sm font-medium bg-[#06202E] text-white hover:bg-[#0a2e42] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {reportProviderMutation.isPending ? 'Submitting…' : 'Submit report'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProviderPage;