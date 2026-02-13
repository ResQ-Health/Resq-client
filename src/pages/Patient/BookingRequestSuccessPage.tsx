import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePaymentReceipt } from '../../services/providerService';
import check from '/success.png';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const BookingRequestSuccessPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const appointmentId = searchParams.get('appointmentId');

    const { data: receiptData, isLoading, error } = usePaymentReceipt(appointmentId || undefined);

    // Clear booking draft on successful load
    useEffect(() => {
        if (receiptData?.success) {
            localStorage.removeItem('bookingDraft');
        }
    }, [receiptData]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeString: string) => {
        return timeString.toUpperCase();
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error || !receiptData?.success) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Request</h1>
                    <p className="text-gray-600 mb-4">Unable to load booking details. Please try again.</p>
                    <button
                        onClick={() => navigate('/patient/my-account')}
                        className="px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                    >
                        Go to My Account
                    </button>
                </div>
            </div>
        );
    }

    const { patient, appointment } = receiptData.data;
    const appointmentAddress = appointment.location ? `${appointment.location.street}, ${appointment.location.city}, ${appointment.location.state} ${appointment.location.postal_code}, ${appointment.location.country}` : '';
    const userAddress = patient.address || '';

    return (
        <div className="min-h-screen bg-white w-full relative">
            <div className="w-full mx-auto px-[64px] py-[100px]">
                <div className="flex gap-8 justify-center">
                    {/* Main Content Column */}
                    <div className="flex-1 max-w-[583px]">
                        {/* Top Confirmation Section */}
                        <div className="flex items-center w-full space-x-4 mb-8">
                            <img src={check} alt="check" className="w-[35px] h-[35px]" />
                            <div>
                                <h1 className="text-[20px] leading-[32px] font-bold text-black">Your booking request has been sent</h1>
                                <p className="text-sm leading-[23px] mt-[4px] text-gray-600">
                                    The provider will reach out via mail or call to inform you about your booking in order to proceed to payment.
                                </p>
                            </div>
                        </div>

                        {/* Patient's Details */}
                        <div className="mb-8 w-full">
                            <h2 className="text-lg font-bold text-black mb-4">Patient's detail</h2>
                            <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Name</span>
                                    <span className="text-sm font-medium text-black">{patient.name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Email</span>
                                    <span className="text-sm font-medium text-black">{patient.email || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Mobile number</span>
                                    <span className="text-sm font-medium text-black">{patient.mobile_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Address</span>
                                    <span className="text-sm font-medium text-black">{userAddress || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Gender</span>
                                    <span className="text-sm font-medium text-black">{patient.gender || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Date of birth</span>
                                    <span className="text-sm font-medium text-black">{patient.date_of_birth ? formatDate(patient.date_of_birth) : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Appointment Details */}
                        <div className="mb-8 w-full">
                            <h2 className="text-lg font-bold text-black mb-4">Appointment details</h2>
                            <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Location</span>
                                    <span className="text-sm font-medium text-black">
                                        {appointmentAddress || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Your appointment</span>
                                    <span className="text-sm font-medium text-black">{appointment.type || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Date</span>
                                    <span className="text-sm font-medium text-black">
                                        {appointment.date ? formatDate(appointment.date) : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Time</span>
                                    <span className="text-sm font-medium text-black">
                                        {appointment.time ? formatTime(appointment.time) : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">
                                        Booking ID
                                    </span>
                                    <span className="text-sm font-medium text-black">{appointment.booking_id || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Action Buttons */}
                        <div className="flex justify-between items-center mt-8 pt-8 border-t border-gray-200">
                            <button
                                onClick={() => navigate('/booking-history')}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                View appointment
                            </button>
                            <button
                                onClick={() => navigate('/booking-history')}
                                className="px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingRequestSuccessPage;
