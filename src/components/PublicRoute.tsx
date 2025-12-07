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
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (loading) {
        return <LoadingSpinner />;
    }

    // If user is authenticated, redirect to the specified route
    if (isAuthenticated) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // If user is not authenticated, allow access to the public route
    return <>{children}</>;
}; 