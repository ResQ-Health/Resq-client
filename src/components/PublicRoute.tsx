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
        const targetPath = (userType === 'provider' || userType === 'diagnosticprovider') 
            ? '/welcome-provider' 
            : '/patient/my-account';

        return <Navigate to={targetPath} state={{ from: location }} replace />;
    }

    // If user is not authenticated, allow access to the public route
    return <>{children}</>;
}; 