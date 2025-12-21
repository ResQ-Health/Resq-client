import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface PublicRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({
    children,
    redirectTo = '/patient/my-account',
}) => {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (loading) {
        return <LoadingSpinner />;
    }

    // If user is authenticated, redirect to the specified route
    if (isAuthenticated) {
        // If a specific redirect path was provided (other than default), use it
        if (redirectTo !== '/patient/my-account') {
            return <Navigate to={redirectTo} state={{ from: location }} replace />;
        }

        // Otherwise, redirect based on user type
        const userType = user?.user_type?.toLowerCase();
        let targetPath = '/patient/my-account';

        if (userType === 'provider' || userType === 'diagnosticprovider') {
            const isOnboardingComplete =
                user?.is_onboarding_complete ??
                user?.provider?.profile_complete ??
                user?.profile_complete;

            targetPath = isOnboardingComplete
                ? '/provider/dashboard'
                : '/welcome-provider';
        } else {
            // Patient: if onboarding is complete, send straight to booking history
            targetPath = user?.is_onboarding_complete ? '/booking-history' : '/patient/my-account';
        }

        return <Navigate to={targetPath} state={{ from: location }} replace />;
    }

    // If user is not authenticated, allow access to the public route
    return <>{children}</>;
}; 