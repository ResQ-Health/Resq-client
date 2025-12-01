import React, { useState, useRef, useEffect } from 'react';

interface RatingOption {
    id: string;
    label: string;
    value: string;
    stars?: number;
}

interface RatingDropdownProps {
    title: string;
    options: RatingOption[];
    selectedValue: string;
    onOptionChange: (value: string) => void;
}

const RatingDropdown: React.FC<RatingDropdownProps> = ({
    title,
    options,
    selectedValue,
    onOptionChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const isFiltered = selectedValue !== 'any';

    const renderStars = (count: number) => {
        return Array.from({ length: 5 }, (_, index) => (
            <svg
                key={index}
                className={`w-4 h-4 ${index < count ? 'text-orange-400' : 'text-gray-300'}`}
                fill={index < count ? 'currentColor' : 'none'}
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

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Compact Dropdown Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between bg-white border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors ${isFiltered ? 'border-blue-500 bg-blue-50' : ''
                    }`}
            >
                <span className={`text-xs ${isFiltered ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                    {title}
                </span>
                <svg
                    className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Expanded Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 min-w-[200px]">
                    <div className="py-2">
                        {/* Title */}
                        <div className="px-3 pb-2 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 text-sm">User rating</h3>
                        </div>

                        {/* Options */}
                        <div className="pt-1">
                            {options.map((option) => (
                                <label
                                    key={option.id}
                                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <input
                                        type="radio"
                                        name="userRating"
                                        value={option.value}
                                        checked={selectedValue === option.value}
                                        onChange={() => {
                                            onOptionChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-sm text-gray-700">
                                        {option.stars ? (
                                            <div className="flex items-center gap-1">
                                                {renderStars(option.stars)}
                                            </div>
                                        ) : (
                                            option.label
                                        )}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RatingDropdown; 