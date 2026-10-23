import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';

const PaymentCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        let appointmentId = searchParams.get('appointmentId') || searchParams.get('appointment_id');
        if (!appointmentId) {
            try {
                const draft = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
                appointmentId = draft?.appointment?.id || draft?.appointment?._id || draft?.appointmentId;
            } catch {
                // Ignore
            }
        }

        if (appointmentId) {
            const separator = location.search.includes('?') ? '&' : '?';
            const extra = !searchParams.has('appointmentId') ? `${separator}appointmentId=${appointmentId}` : '';
            navigate(`/patient/booking/success${location.search}${extra}`, { replace: true });
        } else {
            navigate(`/booking-history${location.search}`, { replace: true });
        }
    }, [navigate, location.search]);

    return <LoadingSpinner />;
};

export default PaymentCallback;
