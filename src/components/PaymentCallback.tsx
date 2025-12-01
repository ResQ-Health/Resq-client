import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Processing payment...</p>
            </div>
        </div>
    );
};

export default PaymentCallback;
