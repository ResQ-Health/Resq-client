import { useMemo } from 'react';
import HospitalCard from '../../components/HospitalCard';
import { usePatientProfile, useToggleFavoriteProvider } from '../../services/userService';
import { Hospital } from '../../data/hospitals';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { MdFavorite } from 'react-icons/md';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function FavouritesPage() {
    const { data: profileData, isLoading, error } = usePatientProfile();
    const toggleFavoriteMutation = useToggleFavoriteProvider();
    const queryClient = useQueryClient();

    // Transform favorite providers from API to Hospital format
    const favoriteHospitals = useMemo(() => {
        if (!profileData?.metadata?.favorite_providers) {
            return [];
        }

        return profileData.metadata.favorite_providers.map((provider: any): Hospital => {
            // Build address string from address object
            const addressParts = [
                provider.address?.street,
                provider.address?.city,
                provider.address?.state
            ].filter(Boolean);
            const address = addressParts.length > 0
                ? addressParts.join(', ')
                : 'Address not available';

            return {
                id: provider.id || provider._id || '',
                name: provider.provider_name || 'Unknown Provider',
                address: address,
                rating: {
                    score: provider.ratings?.average || 0,
                    reviews: provider.ratings?.count || 0,
                },
                openStatus: 'Open', // Default status, can be enhanced with working hours
                phone: provider.work_phone || 'N/A',
                dateListed: provider.created_at ? new Date(provider.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                timeListed: '10:00 AM', // Default value
                specialOffer: false, // Default value
                image: provider.banner_image_url || provider.logo || undefined,
            };
        });
    }, [profileData]);

    const handleRemoveFavorite = (providerId: string, providerName: string) => {
        toggleFavoriteMutation.mutateAsync(providerId)
            .then(() => {
                toast.success(`${providerName} removed from favorites`);
                // Invalidate the patient profile query to refresh the list
                queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
            })
            .catch(() => {
                toast.error(`Failed to remove ${providerName} from favorites`);
            });
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <MdFavorite className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load favorites</h2>
                <p className="text-gray-500 mb-6">Please try refreshing the page.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-[#16202E] text-white rounded-lg hover:bg-[#0F1C26] transition-colors"
                >
                    Refresh Page
                </button>
            </div>
        );
    }

    return (
        <div className="w-full pb-12">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-[#16202E] tracking-tight">My favourites</h1>
                <p className="text-gray-500 mt-1">Your favorite healthcare providers</p>
            </div>

            {favoriteHospitals.length === 0 ? (
                <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-100 border-dashed">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <MdFavorite className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No favorites yet</h3>
                    <p className="text-gray-500 max-w-sm mb-6">
                        Start exploring healthcare providers and add them to your favorites for quick access.
                    </p>
                    <Link
                        to="/search"
                        className="px-6 py-2.5 bg-[#16202E] text-white font-medium rounded-lg hover:bg-[#0F1C26] transition-colors shadow-sm"
                    >
                        Find Providers
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoriteHospitals.map((hospital) => (
                        <HospitalCard
                            key={hospital.id}
                            hospital={hospital}
                            variant="horizontal"
                            onRemove={() => handleRemoveFavorite(hospital.id, hospital.name)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
