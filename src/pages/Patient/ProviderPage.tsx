import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAllProviders } from '../../services/providerService';
import { createReview, likeReview, saveReview } from '../../services/providerService';
import { useReportProvider } from '../../services/providerService';
import { useAddFavoriteProvider, useRemoveFavoriteProvider, useCheckFavoriteStatus } from '../../services/userService';
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
    const addFavoriteMutation = useAddFavoriteProvider();
    const removeFavoriteMutation = useRemoveFavoriteProvider();
    const { data: favoriteStatusData } = useCheckFavoriteStatus(id || '');
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
    const [expandedServiceKey, setExpandedServiceKey] = useState<string | null>(null);
    const [showFullPolicy, setShowFullPolicy] = useState(false);

    // Review Modal states
    const [showAddReviewModal, setShowAddReviewModal] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [showSignInModal, setShowSignInModal] = useState(false);

    // Report Modal State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    // Sort/Filter states for Reviews
    const [sortBy, setSortBy] = useState('Newest');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    // Track loading states for interactions
    const [loadingInteractions, setLoadingInteractions] = useState<Set<string>>(new Set());

    // Update isFavorite when favoriteStatusData changes
    useEffect(() => {
        if (favoriteStatusData?.isFavorite !== undefined) {
            setIsFavorite(favoriteStatusData.isFavorite);
        }
    }, [favoriteStatusData]);

    // Fetch provider data
    useEffect(() => {
        if (id) {
            if (data?.data) {
                const found = data.data.find((p: any) => p._id === id || p.id === id);
                if (found) {
                    setProviderData(found);
                    setLoading(false);
                } else if (!isLoading) {
                    // Not found in the list, maybe try direct fetch or error
                    setLoading(false);
                    setError('Provider not found');
                }
            } else if (!isLoading) {
                setLoading(false);
                setError('Provider not found');
            }
        }
    }, [id, data, isLoading]);

    // Handle initial service from draft if returning
    const providerFromApi = useMemo(() => {
        if (!data?.data || !id) return null;
        return data.data.find((p: any) => p._id === id || p.id === id);
    }, [data, id]);

    useEffect(() => {
        if (isLoading) return;
        if (isError || !providerFromApi) {
            setLoading(false);
            return;
        }

        // Initialize state from API data
        // For services, we have an array of strings in providerFromApi.services
        // Let's just pick the first one as default
        let initialService = '';
        if (providerFromApi.services && providerFromApi.services.length > 0) {
            initialService = providerFromApi.services[0];
        }

        setProviderData(providerFromApi);
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
                    if (draft.providerId === id) {
                        if (draft.serviceName) {
                            setSelectedService(draft.serviceName);
                        }
                        if (draft.date && draft.time) {
                            // Only restore time if date is still valid/same (simple check)
                            // Ideally check availability again
                            setSelectedTimeSlot(draft.time);
                            }
                        } else {
                        // Draft is for another provider, clear it or ignore
                        // For better UX, maybe prompt user? For now, ignore but ensure state is clean
                        localStorage.removeItem('bookingDraft');
                    }
                }
            } catch (e) {
                console.error('Error parsing booking draft', e);
                localStorage.removeItem('bookingDraft');
            }
        }
    }, [providerData, loading, id]);

    // Helper to get sorted reviews
    const sortedReviews = useMemo(() => {
        if (!providerData?.reviews) return [];
        const reviews = [...providerData.reviews];
        switch (sortBy) {
            case 'Highest Rating':
                return reviews.sort((a: any, b: any) => b.rating - a.rating);
            case 'Lowest Rating':
                return reviews.sort((a: any, b: any) => a.rating - b.rating);
            case 'Newest':
            default:
                // Assuming reviews have date field, if not fallback to index
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
        const newIsFavorite = !isFavorite;
        setIsFavorite(newIsFavorite);

        if (newIsFavorite) {
            addFavoriteMutation.mutate(id, {
                onError: (error: any) => {
                    setIsFavorite(!newIsFavorite);
                    console.error('Failed to add favorite:', error);
                }
            });
        } else {
            removeFavoriteMutation.mutate(id, {
                onError: (error: any) => {
                    setIsFavorite(!newIsFavorite);
                    console.error('Failed to remove favorite:', error);
                }
            });
        }
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
            if (!prev || !prev.reviews) return prev;

            const updatedReviews = prev.reviews.map((review: any) => {
                if (review.id === reviewId || review._id === reviewId) {
                    const isLiked = review.isLiked;
                        return {
                            ...review,
                        isLiked: !isLiked,
                        likes: isLiked ? (review.likes - 1) : (review.likes + 1)
                        };
                    }
                    return review;
            });

            return { ...prev, reviews: updatedReviews };
        });

        try {
            await likeReview(reviewId);
            // Success - state already updated
        } catch (error) {
            console.error('Error liking review:', error);
            toast.error('Failed to like review');
            // Rollback state on error
            if (previousState) {
            setProviderData(previousState);
            }
        } finally {
            setLoadingInteractions(prev => {
                const next = new Set(prev);
                next.delete(reviewId);
                return next;
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
        setLoadingInteractions(prev => new Set(prev).add(`save-${reviewId}`));

        // Store previous state for rollback
        let previousState: any = null;

        // Apply optimistic update immediately
        setProviderData((prev: any) => {
            previousState = prev;
            if (!prev || !prev.reviews) return prev;

            const updatedReviews = prev.reviews.map((review: any) => {
                if (review.id === reviewId || review._id === reviewId) {
                        return {
                            ...review,
                        isSaved: !review.isSaved
                        };
                    }
                    return review;
            });

            return { ...prev, reviews: updatedReviews };
        });

        try {
            await saveReview(reviewId);
            const isSaved = providerData.reviews.find((r: any) => r.id === reviewId || r._id === reviewId)?.isSaved;
            toast.success(isSaved ? 'Review removed from saved' : 'Review saved');
        } catch (error) {
            console.error('Error saving review:', error);
            toast.error('Failed to save review');
            // Rollback state on error
            if (previousState) {
            setProviderData(previousState);
            }
        } finally {
            setLoadingInteractions(prev => {
                const next = new Set(prev);
                next.delete(`save-${reviewId}`);
                return next;
            });
        }
    };

    const handleSubmitReport = () => {
        if (!id) return;
        if (!reportReason) {
            toast.error('Please select a reason for reporting');
            return;
        }

        setIsSubmittingReport(true);
        reportProviderMutation.mutate({
            providerId: id,
            payload: {
                category: reportReason as any,
                message: reportDescription
            }
        }, {
            onSuccess: () => {
                toast.success('Report submitted successfully. We will review it shortly.');
                setShowReportModal(false);
                setReportReason('');
                setReportDescription('');
                setIsSubmittingReport(false);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || 'Failed to submit report. Please try again.');
                setIsSubmittingReport(false);
            }
        });
    };

    const handleBookAppointment = () => {
        if (!selectedService) {
            toast.error('Please select a service');
            return;
        }

        if (!isAuthenticated) {
            // Save booking intent to localStorage before redirecting to login
            const bookingIntent = {
                providerId: id,
                serviceName: selectedService,
                path: `/patient/booking/${id}`
            };
            localStorage.setItem('bookingIntent', JSON.stringify(bookingIntent));
            setShowSignInModal(true);
            return;
        }

        // Navigate to booking page with selected service
        // Pass service via state or query param
        navigate(`/patient/booking/${id}`, { state: { selectedService } });
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error || !providerData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Provider Not Found</h2>
                    <p className="text-gray-600 mb-4">The provider you are looking for does not exist or has been removed.</p>
                    <button
                        onClick={() => navigate('/search')}
                        className="bg-[#06202E] text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                        Back to Search
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F8FA] pb-20">
            {/* Header / Banner */}
            <div className="h-64 bg-[#06202E] relative">
                {/* Back button */}
                <div className="absolute top-6 left-6 z-10">
                            <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-white bg-black/20 hover:bg-black/40 px-4 py-2 rounded-full transition-colors backdrop-blur-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                        <span>Back</span>
                            </button>
                </div>

                {/* Banner Image */}
                {providerData.banner_image_url ? (
                    <img
                        src={providerData.banner_image_url}
                        alt="Banner"
                        className="w-full h-full object-cover opacity-60"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-[#06202E] to-[#0A3045]" />
                )}
                        </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Provider Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Header Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex flex-col sm:flex-row gap-6">
                                {/* Profile Image */}
                                <div className="flex-shrink-0">
                                    <div className="w-32 h-32 rounded-xl border-4 border-white shadow-md overflow-hidden bg-gray-100">
                                        {providerData.profile_picture_url || providerData.logo_url ? (
                                            <img
                                                src={providerData.profile_picture_url || providerData.logo_url}
                                                alt={providerData.provider_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-[#06202E] text-white text-3xl font-bold">
                                                {(providerData.provider_name || 'P').charAt(0)}
                                    </div>
                                        )}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 pt-2">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div>
                                            <h1 className="text-2xl font-bold text-[#06202E] mb-1">
                                                {providerData.provider_name}
                                            </h1>
                                            <p className="text-gray-500 mb-3">{providerData.provider_type || 'Healthcare Provider'}</p>

                                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    <span className="font-semibold text-[#06202E]">{providerData.rating || 'New'}</span>
                                                    <span>({providerData.review_count || 0} reviews)</span>
                                        </div>
                                                <div className="flex items-center gap-1.5">
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span>{providerData.address?.city || 'Lagos'}, {providerData.address?.state || 'Nigeria'}</span>
                                    </div>
                            </div>
                                        </div>

                                        <div className="flex gap-2">
                        <button
                                                onClick={handleToggleFavorite}
                                                className={`p-2 rounded-full border transition-colors ${isFavorite
                                                    ? 'bg-red-50 border-red-100 text-red-500'
                                                    : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <svg className={`w-5 h-5 ${isFavorite ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                        </button>
                            <button
                                onClick={() => {
                                                    const shareUrl = window.location.href;
                                                    navigator.clipboard.writeText(shareUrl);
                                                    toast.success('Link copied to clipboard');
                                                }}
                                                className="p-2 rounded-full bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                </svg>
                            </button>
                                    <button
                                                onClick={() => setShowReportModal(true)}
                                                className="p-2 rounded-full bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"
                                                title="Report Provider"
                                    >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                            </div>

                            {/* Quick Stats / Highlights */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-medium">Patients</p>
                                    <p className="text-lg font-bold text-[#06202E] mt-1">1000+</p>
                            </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-medium">Experience</p>
                                    <p className="text-lg font-bold text-[#06202E] mt-1">{providerData.experience || '5+'} Years</p>
                                        </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-medium">Rating</p>
                                    <p className="text-lg font-bold text-[#06202E] mt-1">{providerData.rating || 'New'}</p>
                                    </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-medium">Success</p>
                                    <p className="text-lg font-bold text-[#06202E] mt-1">98%</p>
                                    </div>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="flex border-b border-gray-100">
                                {['About', 'Services', 'Reviews', 'Gallery'].map((tab) => (
                                            <button
                                                key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                            ? 'border-[#06202E] text-[#06202E]'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab}
                                            </button>
                                        ))}
                                    </div>

                            <div className="p-6">
                                {/* About Tab */}
                                {activeTab === 'About' && (
                                    <div className="space-y-8">
                                                                        <div>
                                            <h3 className="text-lg font-bold text-[#06202E] mb-3">About Us</h3>
                                            <div className={`text-gray-600 leading-relaxed ${!showFullDescription ? 'line-clamp-3' : ''}`}>
                                                {providerData.about || 'No description available.'}
                                                                            </div>
                                            {providerData.about && providerData.about.length > 150 && (
                                                                    <button
                                                    onClick={() => setShowFullDescription(!showFullDescription)}
                                                    className="text-[#06202E] font-medium text-sm mt-2 hover:underline"
                                                                    >
                                                    {showFullDescription ? 'Read less' : 'Read more'}
                                                                    </button>
                                                                )}
                                                        </div>

                                        <div className="grid md:grid-cols-2 gap-8">
                                            {/* Contact Info */}
                                                                        <div>
                                                <h4 className="text-md font-bold text-[#06202E] mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                                    Contact Information
                                                </h4>
                                                <div className="space-y-3 text-sm text-gray-600">
                                                    <div className="flex items-start gap-3">
                                                        <span className="font-medium text-gray-900 min-w-[60px]">Address:</span>
                                                        <span>{providerData.address?.street}, {providerData.address?.city}, {providerData.address?.state}</span>
                                        </div>
                                                    <div className="flex items-start gap-3">
                                                        <span className="font-medium text-gray-900 min-w-[60px]">Phone:</span>
                                                        <span>{providerData.work_phone || providerData.phone_number || 'N/A'}</span>
                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <span className="font-medium text-gray-900 min-w-[60px]">Email:</span>
                                                        <span>{providerData.work_email || providerData.email || 'N/A'}</span>
                                    </div>
                                                    {providerData.website && (
                                                        <div className="flex items-start gap-3">
                                                            <span className="font-medium text-gray-900 min-w-[60px]">Website:</span>
                                                            <a href={providerData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                {providerData.website.replace(/^https?:\/\//, '')}
                                                            </a>
                                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Opening Hours */}
                            <div>
                                                <h4 className="text-md font-bold text-[#06202E] mb-4 flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Opening Hours
                                                </h4>
                                                <div className="space-y-2 text-sm">
                                                    {providerData.working_hours && providerData.working_hours.length > 0 ? (
                                                        providerData.working_hours.map((wh: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                                                                <span className="text-gray-600 font-medium w-24">{wh.day}</span>
                                                                <span className={wh.isAvailable ? 'text-[#06202E]' : 'text-gray-400 italic'}>
                                                                    {wh.isAvailable ? `${wh.startTime} - ${wh.endTime}` : 'Closed'}
                                                        </span>
                                    </div>
                                ))
                            ) : (
                                                        <p className="text-gray-500 italic">No working hours available</p>
                            )}
                        </div>
                            </div>
                    </div>

                                        {/* Accreditations */}
                                        <div className="pt-6 border-t border-gray-100">
                                            <h4 className="text-md font-bold text-[#06202E] mb-4 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Accreditations & Certifications
                                            </h4>
                                            <div className="flex flex-wrap gap-3">
                                                {(!providerData.practiceInfo?.accreditations || providerData.practiceInfo.accreditations.length === 0) ? (
                                                    <div className="text-gray-500 text-sm">No accreditations.</div>
                                                ) : (
                                                    providerData.practiceInfo.accreditations.map((accreditation: any, index: number) => {
                                                        if (typeof accreditation === 'string') {
                                                            return <div key={index} className="text-gray-700">{accreditation}</div>;
                                                        }
                                            return (
                                                            <div key={accreditation._id || accreditation.id || index} className="text-gray-700">
                                                                <span className="font-medium">{accreditation.name}</span>
                                                                {accreditation.issuing_body && <span className="text-gray-500 text-sm ml-2">({accreditation.issuing_body})</span>}
                                                </div>
                                            );
                                                    })
                                                )}
                                                </div>
                                                </div>
                                            </div>
                                )}

                                {/* Services Tab */}
                                {activeTab === 'Services' && (
                                        <div>
                                        <h3 className="text-lg font-bold text-[#06202E] mb-6">Our Services</h3>
                                        {providerData.services && providerData.services.length > 0 ? (
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {providerData.services.map((service: string, index: number) => (
                                                    <div key={index} className="p-4 rounded-xl border border-gray-100 hover:border-[#06202E]/20 hover:bg-gray-50 transition-all group">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#06202E] group-hover:bg-[#06202E] group-hover:text-white transition-colors">
                                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                                    </svg>
                                        </div>
                                                                <span className="font-medium text-gray-900">{service}</span>
                                                            </div>
                                            <button
                                                onClick={() => {
                                                                    setSelectedService(service);
                                                                    // Scroll to booking section
                                                                    document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                                                className="text-sm font-medium text-[#06202E] hover:underline"
                                            >
                                                                Book
                                            </button>
                                    </div>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                                                <p>No services listed yet.</p>
                                                        </div>
                                        )}
                                                    </div>
                                )}

                                {/* Reviews Tab */}
                                {activeTab === 'Reviews' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-[#06202E]">Patient Reviews</h3>
                                            <div className="relative">
                                                                    <button
                                                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#06202E]"
                                                >
                                                    Sort by: <span className="font-medium">{sortBy}</span>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                                    </button>
                                                {showSortDropdown && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1">
                                                        {['Newest', 'Highest Rating', 'Lowest Rating'].map((option) => (
                                                                    <button
                                                                key={option}
                                                                onClick={() => {
                                                                    setSortBy(option);
                                                                    setShowSortDropdown(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortBy === option ? 'text-[#06202E] font-medium bg-gray-50' : 'text-gray-600'
                                                                    }`}
                                                            >
                                                                {option}
                                                                    </button>
                                                        ))}
                                                            </div>
                                                )}
                                            </div>
                                        </div>

                                        {sortedReviews.length > 0 ? (
                                            <div className="space-y-4">
                                                {sortedReviews.map((review: any) => (
                                                    <div key={review.id} className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-[#06202E] text-white flex items-center justify-center font-bold">
                                                                    {(review.author_name || 'A').charAt(0)}
                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-900">{review.author_name || 'Anonymous'}</p>
                                                                    <p className="text-xs text-gray-500">{new Date(review.date).toLocaleDateString()}</p>
                    </div>
            </div>
                                                            <div className="flex gap-1">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <svg
                                                                        key={i}
                                                                        className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                                                        fill="currentColor"
                                                                        viewBox="0 0 20 20"
                                                                    >
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                        ))}
                                    </div>
                                </div>
                                                        <p className="text-gray-600 text-sm leading-relaxed">{review.text}</p>
                                                        
                                                        {/* Interaction Buttons */}
                                                        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200/50">
                                                <button
                                                    onClick={() => handleLikeReview(review.id)}
                                                    disabled={loadingInteractions.has(review.id)}
                                                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                                                    review.isLiked ? 'text-[#06202E]' : 'text-gray-500 hover:text-[#06202E]'
                                                        }`}
                                                >
                                                                <svg className={`w-4 h-4 ${review.isLiked ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                        </svg>
                                                                Helpful ({review.likes || 0})
                                                </button>
                                                <button
                                                    onClick={() => handleSaveReview(review.id)}
                                                                disabled={loadingInteractions.has(`save-${review.id}`)}
                                                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                                                    review.isSaved ? 'text-[#06202E]' : 'text-gray-500 hover:text-[#06202E]'
                                                                }`}
                                                            >
                                                                <svg className={`w-4 h-4 ${review.isSaved ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                        </svg>
                                                                {review.isSaved ? 'Saved' : 'Save'}
                                                </button>
                                            </div>
                                    </div>
                                ))}
                            </div>
                                        ) : (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                    </svg>
                        </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews yet</h3>
                                                <p className="text-gray-500">Be the first to share your experience with this provider.</p>
                    </div>
                                        )}
                </div>
            )}

                                {/* Gallery Tab */}
                                {activeTab === 'Gallery' && (
                            <div>
                                        <h3 className="text-lg font-bold text-[#06202E] mb-6">Gallery</h3>
                                        {providerData.gallery_image_urls && providerData.gallery_image_urls.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {providerData.gallery_image_urls.map((url: string, index: number) => (
                                                    <div key={index} className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setCurrentGalleryImage(index)}>
                                                        <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                                                    </div>
                                    ))}
                                </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                                                <p>No images available.</p>
                </div>
            )}
                </div>
            )}
                        </div>
                                        </div>
                                    </div>

                    {/* Right Column - Booking Card */}
                    <div className="lg:col-span-1">
                        <div id="booking-section" className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
                            <h3 className="text-lg font-bold text-[#06202E] mb-4">Book Appointment</h3>

                                    {/* Service Selection */}
                                    <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Service</label>
                                <div className="relative">
                                        <select
                                        value={selectedService}
                                        onChange={(e) => setSelectedService(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                                    >
                                        <option value="">Choose a service...</option>
                                        {providerData.services && providerData.services.map((service: string, idx: number) => (
                                            <option key={idx} value={service}>{service}</option>
                                        ))}
                                        </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                            </div>
                                        </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 rounded-xl p-4 mb-6">
                                <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                    <p className="text-sm text-blue-800">
                                        Please select a service to view available dates and times.
                                    </p>
                                        </div>
                                    </div>

                            {/* Book Button */}
                                    <button
                                onClick={handleBookAppointment}
                                disabled={!selectedService}
                                className="w-full bg-[#06202E] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#0a2e42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                            >
                                Continue Booking
                                    </button>

                            <p className="text-center text-xs text-gray-500 mt-4">
                                No payment required until appointment is confirmed.
                            </p>
                                </div>
                            </div>
                        </div>
                    </div>

            {/* Login Modal */}
            {/* Add LoginModal component if needed, or redirect to login page */}

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[#06202E]">Report Provider</h3>
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for report</label>
                                <select
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06202E] focus:border-transparent"
                                >
                                    <option value="">Select a reason...</option>
                                    <option value="inaccurate_info">Inaccurate Information</option>
                                    <option value="unprofessional_behavior">Unprofessional Behavior</option>
                                    <option value="spam">Spam or Fake Profile</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={reportDescription}
                                    onChange={(e) => setReportDescription(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06202E] focus:border-transparent resize-none"
                                    placeholder="Please provide more details..."
                                ></textarea>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowReportModal(false)}
                                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitReport}
                                    disabled={!reportReason || isSubmittingReport}
                                    className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
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
