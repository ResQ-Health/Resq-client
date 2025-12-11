import React, { useRef, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaUser, FaRegCalendarAlt, FaRegHeart } from 'react-icons/fa';
import { FiSettings } from 'react-icons/fi';
import { usePatientProfile } from '../services/userService';

const NAV_ITEMS = [
    { label: 'My account', icon: <FaUser className="w-5 h-5" />, path: '/patient/my-account', altPaths: ['/my-account', '/Myaccount', '/patientSetup/Myaccount'] },
    { label: 'Booking history', icon: <FaRegCalendarAlt className="w-5 h-5" />, path: '/booking-history' },
    { label: 'My favourites', icon: <FaRegHeart className="w-5 h-5" />, path: '/favourites' },
    { label: 'Settings', icon: <FiSettings className="w-5 h-5" />, path: '/patient/settings' },
];

interface PatientLayoutProps {
    children: React.ReactNode;
}

export default function PatientLayout({ children }: PatientLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const navRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const { data: profileData } = usePatientProfile();
    const [sliderStyle, setSliderStyle] = useState({
        left: '0px',
        width: '0px',
        display: 'none'
    });

    // Check onboarding completion status
    const isOnboardingComplete = () => {
        if (!profileData?.data) return false;
        const data = profileData.data;
        const metadata = profileData.metadata;

        const basicDetailsComplete = !!(
            data.personal_details?.first_name &&
            data.personal_details?.last_name &&
            data.personal_details?.date_of_birth &&
            data.personal_details?.gender &&
            data.contact_details?.email_address &&
            data.contact_details?.phone_number
        );

        const additionalDetailsComplete = !!(
            data.location_details?.address &&
            data.location_details?.city &&
            data.location_details?.state &&
            metadata?.emergency_contact?.first_name &&
            metadata?.emergency_contact?.last_name &&
            metadata?.emergency_contact?.phone_number &&
            metadata?.emergency_contact?.relationship_to_you &&
            metadata?.next_of_kin?.first_name &&
            metadata?.next_of_kin?.last_name &&
            metadata?.next_of_kin?.phone_number &&
            metadata?.next_of_kin?.relationship_to_you
        );

        return basicDetailsComplete && additionalDetailsComplete;
    };

    const onboardingComplete = isOnboardingComplete();

    const isItemActive = (item: { path: string; altPaths?: string[] }) => {
        const paths = [item.path, ...(item.altPaths || [])];
        return paths.some(p => location.pathname.includes(p));
    };

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        // Allow navigation to my-account even if onboarding not complete
        if (path.includes('/my-account') || path.includes('/Myaccount')) {
            return;
        }

        // Block navigation to other pages if onboarding not complete
        if (!onboardingComplete) {
            e.preventDefault();
            navigate('/patient/my-account');
        }
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
            <div className="w-screen ml-[calc(50%-50vw)] flex items-center justify-center border-y-2 border-gray-200 py-4 mb-12 relative bg-white">
                <div className="flex gap-12 relative">
                    {NAV_ITEMS.map((item, index) => {
                        const isMyAccount = item.path.includes('/my-account') || item.path.includes('/Myaccount');
                        const isDisabled = !onboardingComplete && !isMyAccount;
                        
                        return (
                            <Link
                                key={item.label}
                                to={item.path}
                                onClick={(e) => handleNavClick(e, item.path)}
                                className={`flex flex-col items-center ${isDisabled ? 'cursor-not-allowed' : ''}`}
                                ref={(el) => { navRefs.current[index] = el; }}
                            >
                                <span
                                    className={`flex items-center gap-2 ${
                                        isItemActive(item) 
                                            ? 'text-[#16202E] font-semibold' 
                                            : isDisabled
                                            ? 'text-gray-300 font-normal'
                                            : 'text-gray-400 font-normal'
                                    }`}
                                    title={isDisabled ? 'Complete your profile to access this page' : ''}
                                >
                                    {item.icon}{item.label}
                                </span>
                            </Link>
                        );
                    })}
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