import { useMemo } from 'react';
import HospitalCard from '../../components/HospitalCard';
import { usePatientProfile, useAddFavoriteProvider, useRemoveFavoriteProvider } from '../../services/userService';
import { Hospital } from '../../data/hospitals';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { MdFavorite } from 'react-icons/md';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function FavouritesPage() {
    const { data: profileData, isLoading, error } = usePatientProfile();
    const removeFavoriteMutation = useRemoveFavoriteProvider();
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
        removeFavoriteMutation.mutate(providerId, {
            onSuccess: () => {
                toast.success(`${providerName} removed from favorites`);
                // Invalidate the patient profile query to refresh the list
                queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
            },
            onError: () => {
                toast.error(`Failed to remove ${providerName} from favorites`);
            }
        });
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <p className="text-red-500 mb-4">Error loading favorites</p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-[#06202E] underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F8FA] pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center gap-3 mb-8">
                    <MdFavorite className="w-8 h-8 text-[#06202E]" />
                    <h1 className="text-2xl font-bold text-[#06202E]">My Favourites</h1>
                </div>

                {favoriteHospitals.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MdFavorite className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Save providers you like to access them quickly later. Browse providers to start building your list.
                        </p>
                        <Link
                            to="/search"
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#06202E] hover:bg-[#0a2e42] transition-colors"
                        >
                            Find Providers
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favoriteHospitals.map((hospital) => (
                            <div key={hospital.id} className="relative group">
                                <HospitalCard hospital={hospital} />
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRemoveFavorite(hospital.id, hospital.name);
                                    }}
                                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50 transition-colors z-10"
                                    title="Remove from favorites"
                                >
                                    <MdFavorite className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
