import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';

const PaymentCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Get appointment ID from localStorage (stored during booking)
        const bookingDraft = localStorage.getItem('bookingDraft');
        let appointmentId = null;

        if (bookingDraft) {
            try {
                const draft = JSON.parse(bookingDraft);
                appointmentId = draft?.appointment?.id;
            } catch (error) {
                console.error('Error parsing booking draft:', error);
            }
        }

        // Navigate to success page with appointment ID
        if (appointmentId) {
            navigate(`/patient/booking/success?appointmentId=${appointmentId}`, { replace: true });
        } else {
            // Fallback if no appointment ID found
            navigate('/patient/booking/success', { replace: true });
        }
    }, [navigate]);

    return <LoadingSpinner />;
};

export default PaymentCallback;
