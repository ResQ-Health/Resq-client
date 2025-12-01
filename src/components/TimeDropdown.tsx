import React, { useState, useRef, useEffect } from 'react';

interface TimeOption {
    id: string;
    label: string;
    value: string;
}

interface TimeDropdownProps {
    title: string;
    options: TimeOption[];
    selectedValue: string;
    onOptionChange: (value: string) => void;
}

const TimeDropdown: React.FC<TimeDropdownProps> = ({
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

    const selectedOption = options.find(option => option.value === selectedValue);
    const isFiltered = selectedValue !== 'any';

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
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 min-w-[180px]">
                    <div className="py-2">
                        {/* Title */}
                        <div className="px-3 pb-2 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 text-sm">Appointment time</h3>
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
                                        name="appointmentTime"
                                        value={option.value}
                                        checked={selectedValue === option.value}
                                        onChange={() => {
                                            onOptionChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeDropdown; 