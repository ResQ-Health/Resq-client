import { useRef, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePaymentReceipt, sendReceiptEmail } from '../../services/providerService';
import check from '/success.png';
import logo from '/icons/Logomark (1).png';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const BookingSuccessPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const appointmentId = searchParams.get('appointmentId');
    const receiptRef = useRef<HTMLDivElement>(null);

    const { data: receiptData, isLoading, error } = usePaymentReceipt(appointmentId || undefined);
    const [receiptSent, setReceiptSent] = useState(false);
    const [isSendingReceipt, setIsSendingReceipt] = useState(false);
    const [receiptStatus, setReceiptStatus] = useState<'generating' | 'sending'>('generating');
    const sendingRef = useRef(false); // Use ref to prevent multiple simultaneous sends

    // Clear booking draft on successful load
    useEffect(() => {
        if (receiptData?.success) {
            localStorage.removeItem('bookingDraft');
        }
    }, [receiptData]);

    // Generate PDF from receipt template - shared function for download and email
    const generateReceiptPDF = async (): Promise<Blob | null> => {
        if (!receiptRef.current) return null;

        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

            // Convert PDF to Blob
            const pdfBlob = pdf.output('blob');
            return pdfBlob;
        } catch (err) {
            console.error('Failed to generate receipt PDF:', err);
            return null;
        }
    };

    // Automatically send receipt via email when page loads (only once)
    useEffect(() => {
        if (!appointmentId || receiptSent || isSendingReceipt || isLoading || !receiptData?.success || sendingRef.current) {
            return;
        }

        // Check if receipt has already been sent for this appointment
        const sentReceiptsKey = `receipt_sent_${appointmentId}`;
        const alreadySent = localStorage.getItem(sentReceiptsKey);

        if (alreadySent === 'true') {
            setReceiptSent(true);
            return;
        }

        // Send receipt automatically
        const sendReceipt = async () => {
            // Prevent multiple simultaneous sends
            if (sendingRef.current) {
                return;
            }

            sendingRef.current = true;
            setIsSendingReceipt(true);
            setReceiptStatus('generating');

            try {
                // Wait for receipt template to be rendered (max 5 attempts with delays)
                let attempts = 0;
                while (!receiptRef.current && attempts < 5) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    attempts++;
                }

                if (!receiptRef.current) {
                    console.error('Receipt template not ready after waiting');
                    return;
                }

                // Generate the PDF using the same format as download
                const pdfBlob = await generateReceiptPDF();

                if (!pdfBlob) {
                    console.error('Failed to generate PDF for email');
                    return;
                }

                // Convert Blob to File for FormData
                const pdfFile = new File([pdfBlob], `ResQ-Receipt-${appointmentId}.pdf`, {
                    type: 'application/pdf',
                });

                // Update status to sending
                setReceiptStatus('sending');

                await sendReceiptEmail({
                    appointmentId: appointmentId,
                    pdf: pdfFile, // Include the generated PDF with same format as download
                });

                // Mark as sent in localStorage to prevent duplicate sends
                localStorage.setItem(sentReceiptsKey, 'true');
                setReceiptSent(true);

                // Show success message
                toast.success('Receipt sent to your email successfully', {
                    duration: 5000,
                });
            } catch (err: any) {
                console.error('Failed to send receipt:', err);
                // Don't show error toast - silently fail to avoid interrupting user experience
                // The user can still download the receipt manually
            } finally {
                setIsSendingReceipt(false);
                sendingRef.current = false;
            }
        };

        // Delay to ensure receipt template is fully rendered
        const timer = setTimeout(() => {
            sendReceipt();
        }, 2000);

        return () => {
            clearTimeout(timer);
            sendingRef.current = false;
        };
    }, [appointmentId, receiptData, receiptSent, isSendingReceipt, isLoading]);

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Format time for display
    const formatTime = (timeString: string) => {
        return timeString.toUpperCase();
    };

    const handleDownloadReceipt = async () => {
        const toastId = toast.loading('Generating receipt...');

        try {
            const pdfBlob = await generateReceiptPDF();

            if (!pdfBlob) {
                toast.error('Failed to generate receipt', { id: toastId });
                return;
            }

            // Create download link
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ResQ-Receipt-${appointmentId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Receipt downloaded successfully', { id: toastId });
        } catch (err) {
            console.error('Failed to download receipt:', err);
            toast.error('Failed to download receipt', { id: toastId });
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error || !receiptData?.success) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Appointment</h1>
                    <p className="text-gray-600 mb-4">Unable to load appointment details. Please try again.</p>
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

    const { patient, appointment, payment_summary } = receiptData.data;
    const appointmentAddress = appointment.location ? `${appointment.location.street}, ${appointment.location.city}, ${appointment.location.state} ${appointment.location.postal_code}, ${appointment.location.country}` : '';
    const userAddress = patient.address || '';

    return (
        <div className="min-h-screen bg-white w-full relative">
            {/* Receipt Generation and Email Sending Loader Overlay */}
            {isSendingReceipt && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full mx-4">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <LoadingSpinner fullScreen={false} size="lg" />
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-[#06202E] mb-2">
                                    {receiptStatus === 'generating' ? 'Generating Receipt' : 'Sending Email'}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {receiptStatus === 'generating' 
                                        ? 'Receipt is being generated...' 
                                        : 'Receipt is being sent to your email...'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full mx-auto px-[64px] py-[100px]">
                <div className="flex  gap-8">
                    {/* Left Column - Patient and Appointment Details */}
                    <div className="flex-1 w-[538px]">
                        {/* Top Confirmation Section */}
                        <div className="flex items-center  w-[583px] space-x-4 mb-8">
                            <img src={check} alt="check" className="w-[35px] h-[35px]" />
                            <div>
                                <h1 className="text-[20px] leading-[32px] font-bold text-black">Your appointment is confirmed</h1>
                                <p className="text-sm leading-[23px] mt-[4px] text-gray-600 ">
                                    You will receive a confirmation email with details of your appointment. Please arrive 15 minutes early to complete any paperwork.
                                </p>
                            </div>
                        </div>

                        {/* Patient's Details */}
                        <div className="mb-8 w-[583px] ">
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
                        <div className="mb-8 w-[583px]">
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
                                    <span className="text-sm text-gray-600">Booking ID</span>
                                    <span className="text-sm font-medium text-black">{appointment.booking_id || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Payment Summary and Help */}
                    <div className=" ml-[134px] w-[354px]">
                        {/* Payment Summary */}
                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-bold text-black mb-4">Payment Summary</h3>
                            <div className="space-y-3 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Payment method</span>
                                    <span className="text-sm font-medium text-black">{payment_summary.payment_method || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Service</span>
                                    <span className="text-sm font-medium text-black">{payment_summary.service_cost || 'N/A'}</span>
                                </div>

                                <div className="border-t border-gray-200 pt-3">
                                    <div className="flex justify-between">
                                        <span className="text-lg font-bold text-black">Total</span>
                                        <span className="text-lg font-bold text-black">{payment_summary.total || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleDownloadReceipt}
                                className="w-full bg-gray-900 text-white py-3 px-6 rounded-md hover:bg-gray-800 transition-colors font-medium"
                            >
                                Download receipt
                            </button>
                        </div>

                        {/* Additional Notes */}
                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-bold text-black mb-4">Additional notes</h3>
                            <p className="text-sm text-gray-600">
                                Please arrive 15 minutes before your scheduled appointment time to complete any necessary paperwork and registration.
                            </p>
                        </div>

                        {/* Need Help */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-black mb-4">Need help?</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                If you need to change or cancel your appointment, please contact us at least 24 hours in advance.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                    </svg>
                                    <span className="text-sm text-blue-600">+2347072779831</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                    </svg>
                                    <span className="text-sm text-blue-600">Hello@resq.africa</span>
                                </div>
                            </div>
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

            {/* Hidden Receipt Template for PDF Generation */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                <div ref={receiptRef} className="w-[210mm] bg-white p-12 text-black font-sans">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-gray-200 pb-6 mb-8">
                        <div className="flex items-center gap-3">
                            <img src={logo} alt="RESQ" className="w-12 h-12" />
                            <span className="text-2xl font-bold tracking-tight">RESQ</span>
                        </div>
                        <div className="text-right">
                            <h1 className="text-3xl font-bold text-gray-900">RECEIPT</h1>
                            <p className="text-gray-500 mt-1">#{appointment.booking_id || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Date and Status */}
                    <div className="flex justify-between mb-12">
                        <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Date Issued</p>
                            <p className="text-lg font-medium">{new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Status</p>
                            <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold mt-1">
                                PAID
                            </span>
                        </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="flex gap-12 mb-12">
                        {/* Patient Info */}
                        <div className="flex-1">
                            <h3 className="text-gray-500 uppercase tracking-wider font-semibold text-sm mb-4 border-b pb-2">Patient Details</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Name:</span> {patient.name}</p>
                                <p><span className="font-medium">Email:</span> {patient.email}</p>
                                <p><span className="font-medium">Phone:</span> {patient.mobile_number}</p>
                            </div>
                        </div>

                        {/* Appointment Info */}
                        <div className="flex-1">
                            <h3 className="text-gray-500 uppercase tracking-wider font-semibold text-sm mb-4 border-b pb-2">Appointment Details</h3>
                            <div className="space-y-2">
                                <p><span className="font-medium">Service:</span> {appointment.type}</p>
                                <p><span className="font-medium">Date:</span> {appointment.date ? formatDate(appointment.date) : 'N/A'}</p>
                                <p><span className="font-medium">Time:</span> {appointment.time ? formatTime(appointment.time) : 'N/A'}</p>
                                <p><span className="font-medium">Location:</span> {appointmentAddress}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Table */}
                    <div className="mb-12">
                        <h3 className="text-gray-500 uppercase tracking-wider font-semibold text-sm mb-4">Payment Details</h3>
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="py-4 px-4">{appointment.type}</td>
                                    <td className="text-right py-4 px-4">{payment_summary.service_cost}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td className="py-4 px-4 font-bold text-right">Total</td>
                                    <td className="py-4 px-4 font-bold text-right text-xl">{payment_summary.total}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-gray-500 text-sm mt-20 border-t pt-8">
                        <p className="mb-2">Thank you for choosing RESQ Health.</p>
                        <p>For any inquiries, please contact us at Hello@resq.africa or +2347072779831</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingSuccessPage;

