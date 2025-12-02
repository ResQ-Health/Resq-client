import { useMemo } from 'react';
import HospitalCard from '../../components/HospitalCard';
import { usePatientProfile } from '../../services/userService';
import { Hospital } from '../../data/hospitals';

export default function FavouritesPage() {
    const { data: profileData, isLoading, error } = usePatientProfile();

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

    if (isLoading) {
        return (
            <div className="w-full min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto p-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16202E]"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto p-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="text-center py-12">
                            <p className="text-red-600">Failed to load favorites. Please try again.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gray-50">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h1 className="text-2xl font-bold text-[#16202E] mb-2">My favourites</h1>
                    <p className="text-gray-600 mb-8">Your favorite healthcare providers</p>

                    {favoriteHospitals.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">No favorite providers yet.</p>
                            <p className="text-gray-400 text-sm mt-2">Start exploring and add providers to your favorites!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {favoriteHospitals.map((hospital) => (
                                <HospitalCard
                                    key={hospital.id}
                                    hospital={hospital}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}