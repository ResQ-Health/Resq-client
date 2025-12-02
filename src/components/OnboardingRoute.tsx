import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePatientProfile } from '../services/userService';

interface OnboardingRouteProps {
    children: React.ReactNode;
}

/**
 * Route guard that ensures users complete onboarding before accessing protected routes
 * Redirects to /patient/my-account if onboarding is not complete
 */
export const OnboardingRoute: React.FC<OnboardingRouteProps> = ({ children }) => {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const location = useLocation();
    const { data: profileData, isLoading: profileLoading } = usePatientProfile();

    // Show loading spinner while checking authentication and profile
    if (authLoading || profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/sign-in-patient" state={{ from: location }} replace />;
    }

    // Check if onboarding is complete
    if (profileData?.data) {
        const data = profileData.data;
        const metadata = profileData.metadata;

        // Basic details completion check
        const basicDetailsComplete = !!(
            data.personal_details?.first_name &&
            data.personal_details?.last_name &&
            data.personal_details?.date_of_birth &&
            data.personal_details?.gender &&
            data.contact_details?.email_address &&
            data.contact_details?.phone_number
        );

        // Additional details completion check
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

        const isOnboardingComplete = basicDetailsComplete && additionalDetailsComplete;

        // If onboarding is not complete and user is not already on the my-account page, redirect
        if (!isOnboardingComplete && !location.pathname.includes('/patient/my-account') && !location.pathname.includes('/patientSetup/Myaccount')) {
            return <Navigate to="/patient/my-account" replace />;
        }
    }

    return <>{children}</>;
};

