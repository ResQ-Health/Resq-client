import { useState } from 'react';
import HospitalCard from '../../components/HospitalCard';
import { hospitals } from '../../data/hospitals';

export default function FavouritesPage() {
    const [favorites] = useState(hospitals.slice(0, 6));

    return (
        <div className="w-full min-h-screen bg-gray-50">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h1 className="text-2xl font-bold text-[#16202E] mb-2">My favourites</h1>
                    <p className="text-gray-600 mb-8">Lorem ipsum dolor sit amet consectetur. Tincidunt.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map((hospital) => (
                            <HospitalCard
                                key={hospital.id}
                                hospital={hospital}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}