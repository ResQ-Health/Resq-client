import React, { useRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUser, FaRegCalendarAlt, FaRegHeart } from 'react-icons/fa';
import { FiSettings } from 'react-icons/fi';

const NAV_ITEMS = [
    { label: 'My account', icon: <FaUser className="w-5 h-5" />, path: '/my-account', altPaths: ['/Myaccount'] },
    { label: 'Booking history', icon: <FaRegCalendarAlt className="w-5 h-5" />, path: '/booking-history' },
    { label: 'My favourites', icon: <FaRegHeart className="w-5 h-5" />, path: '/favourites' },
    { label: 'Settings', icon: <FiSettings className="w-5 h-5" />, path: '/patient/settings' },
];

interface PatientLayoutProps {
    children: React.ReactNode;
}

export default function PatientLayout({ children }: PatientLayoutProps) {
    const location = useLocation();
    const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const [sliderStyle, setSliderStyle] = useState({
        left: '0px',
        width: '0px',
        display: 'none'
    });

    const isItemActive = (item: { path: string; altPaths?: string[] }) => {
        const paths = [item.path, ...(item.altPaths || [])];
        return paths.some(p => location.pathname.includes(p));
    };

    useEffect(() => {
        const activeIndex = NAV_ITEMS.findIndex(item => isItemActive(item));

        if (activeIndex !== -1 && navRefs.current[activeIndex]) {
            const activeElement = navRefs.current[activeIndex];
            const container = activeElement?.parentElement;

            if (activeElement && container) {
                const containerRect = container.getBoundingClientRect();
                const elementRect = activeElement.getBoundingClientRect();

                const left = elementRect.left - containerRect.left;
                const width = elementRect.width;

                setSliderStyle({
                    left: `${left}px`,
                    width: `${width}px`,
                    display: 'block'
                });
            }
        } else {
            setSliderStyle({
                left: '0px',
                width: '0px',
                display: 'none'
            });
        }
    }, [location.pathname]);

    return (
        <div className="w-full min-h-screen">
            {/* Top navigation bar with border-y */}
            <div className="w-full flex items-center justify-center border-y-2 border-gray-200 py-4 mb-12 relative">
                <div className="flex gap-12 relative">
                    {NAV_ITEMS.map((item, index) => (
                        <Link
                            key={item.label}
                            to={item.path}
                            className="flex flex-col items-center"
                            ref={(el) => { navRefs.current[index] = el; }}
                        >
                            <span
                                className={`flex items-center gap-2 ${isItemActive(item) ? 'text-[#16202E] font-semibold' : 'text-gray-400 font-normal'}`}
                            >
                                {item.icon}{item.label}
                            </span>
                        </Link>
                    ))}
                    {/* Underline for active item */}
                    <div
                        className="bg-[#16202E] h-1 rounded absolute -bottom-4 transition-all duration-300"
                        style={sliderStyle}
                    />
                </div>
            </div>

            {/* Main Content */}
            {children}
        </div>
    );
} 