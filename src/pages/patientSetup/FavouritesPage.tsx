import React, { useState } from 'react';
import { FaRegHeart } from 'react-icons/fa';
import HospitalCard from '../../components/HospitalCard';

// Sample favorites data
const favoriteHospitals = [
    {
        name: "Cottage Medicare Hospital",
        address: "18 Iwaya Rd, Yaba 101245, Lagos",
        rating: 5.0,
        reviews: 60,
        image: "/hospital-image.jpg"
    },
    {
        name: "Blue Cross Hospital",
        address: "48, Ijaiye Rd, Ogba, (Beside UBA, Ikeja",
        rating: 5.0,
        reviews: 60,
        image: "/hospital-image.jpg"
    },
    {
        name: "Cottage Medicare Hospital",
        address: "18 Iwaya Rd, Yaba 101245, Lagos",
        rating: 5.0,
        reviews: 60,
        image: "/hospital-image.jpg"
    },
    {
        name: "Blue Cross Hospital",
        address: "48, Ijaiye Rd, Ogba, (Beside UBA, Ikeja",
        rating: 5.0,
        reviews: 60,
        image: "/hospital-image.jpg"
    },
    {
        name: "Cottage Medicare Hospital",
        address: "18 Iwaya Rd, Yaba 101245, Lagos",
        rating: 5.0,
        reviews: 60,
        image: "/hospital-image.jpg"
    },
    {
        name: "Cottage Medicare Hospital",
        address: "18 Iwaya Rd, Yaba 101245, Lagos",
        rating: 5.0,
        reviews: 60,
        image: "/hospital-image.jpg"
    }
];

export default function FavouritesPage() {
    const [favorites, setFavorites] = useState(favoriteHospitals);

    const handleRemoveFavorite = (index: number) => {
        const updatedFavorites = favorites.filter((_, i) => i !== index);
        setFavorites(updatedFavorites);
    };

    return (
        <div className="w-full px-[64px] min-h-screen">
            {/* Main Content */}
            <div className=" mx-auto bg-white rounded-lg px-6">
                <div className="py-8">
                    <h1 className="text-2xl font-semibold mb-2">My favourites</h1>
                    <p className="text-gray-600 mb-8">Lorem ipsum dolor sit amet consectetur. Tincidunt.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map((hospital, index) => (
                            <HospitalCard
                                key={index}
                                name={hospital.name}
                                address={hospital.address}
                                rating={hospital.rating}
                                reviews={hospital.reviews}
                                onRemove={() => handleRemoveFavorite(index)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 