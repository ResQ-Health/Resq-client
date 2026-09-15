import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';

const PaymentCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Forward directly to booking-history, retaining any Paystack reference params
        navigate(`/booking-history${location.search}`, { replace: true });
    }, [navigate, location.search]);

    return <LoadingSpinner />;
};

export default PaymentCallback;
