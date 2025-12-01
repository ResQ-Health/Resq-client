import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hospital } from '../data/hospitals';

interface HospitalCardProps {
  hospital: Hospital;
}

const HospitalCard: React.FC<HospitalCardProps> = ({ hospital }) => {
  const navigate = useNavigate();

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

  const handleCardClick = () => {
    navigate(`/search/provider/${hospital.id}`);
  };

  return (
    <div
      className="bg-white w-[310px] p-[24px] rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Hospital Image */}
      {hospital.image ? (
        <div className="h-48 rounded-t-lg overflow-hidden">
          <img src={hospital.image} alt={hospital.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-t-lg flex items-center justify-center relative">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-blue-600 text-sm font-medium">Medical Facility</p>
          </div>
        </div>
      )}

      {/* Hospital Information */}
      <div className="p-4">
        {/* Hospital Name */}
        <h3 className="font-bold text-gray-900 text-lg mb-2">{hospital.name}</h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <span className="text-gray-700 font-medium mr-1">
            {hospital.rating.score.toFixed(1)}
          </span>
          <div className="flex gap-0.5">
            {renderStars(hospital.rating.score)}
          </div>
          <span className="text-gray-500 text-sm ml-1">
            ({hospital.rating.reviews})
          </span>
        </div>

        {/* Address */}
        <p className="text-gray-600 text-sm mb-3 leading-relaxed">{hospital.address}</p>

        {/* Open Status and Phone */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-green-600 font-medium">{hospital.openStatus}</span>
          <span className="text-gray-500 mx-2">•</span>
          <span className="text-gray-700">{hospital.phone}</span>
        </div>
      </div>
    </div>
  );
};

export default HospitalCard;