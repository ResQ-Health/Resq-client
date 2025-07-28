import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireAuth = true,
    redirectTo = '/',
}) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    // If authentication is required and user is not authenticated
    if (requireAuth && !isAuthenticated) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // If authentication is not required and user is authenticated
    if (!requireAuth && isAuthenticated) {
        return <Navigate to="/my-account" replace />;
    }

    return <>{children}</>;
}; 