import React from 'react';
import { FaStar, FaHeart } from 'react-icons/fa';
// import favoriteIcon from '../../public/icons/favorite.png';

interface HospitalCardProps {
  name: string;
  address: string;
  rating: number;
  reviews: number;
  onRemove: () => void;
}

const HospitalCard: React.FC<HospitalCardProps> = ({
  name,
  address,
  rating,
  reviews,
  onRemove
}) => {
  return (
    <div className=" rounded-lg px-2 overflow-hidden shadow-sm  gap-6  flex flex-col md:flex-row w-full">
      <img
        className="object-cover w-[199px] h-[187px] flex-shrink-0"
        src="/icons/favorite.png"
        alt={name}
      />
      <div className="flex flex-col md-h-auto  h-[187px] w-[199px] flex-1 min-w-0">
        <button
          onClick={onRemove}
          className="flex items-center gap-2 text-[#FF4D4D] text-base mb-2 hover:underline"
        >
          <FaHeart className="w-4 h-4 text-[#FF4D4D]" />
          Remove
        </button>
        <h3 className="font-semibold text-lg mb-1">{name}</h3>
        <p className="font-plus-jakarta font-normal text-sm leading-[22.4px] tracking-normal text-gray-600 mb-3">
          {address}
        </p>
        <div className="flex items-center gap-2 mb-4 text-yellow-400">
          <span className="font-plus-jakarta font-normal text-sm leading-[22.4px] tracking-normal text-black">{rating}</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar key={star} className="w-4 h-4" />
            ))}
          </div>
          <span className="font-plus-jakarta font-normal text-sm leading-[22.4px] tracking-normal text-gray-600">({reviews})</span>
        </div>
        <button className="mt-auto text-[#16202E] font-medium flex items-center gap-1 hover:text-blue-600">
          Book Now
          <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
};

export default HospitalCard; 