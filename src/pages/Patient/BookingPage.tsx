import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useBookAppointment, useInitializePayment, useAllProviders } from '../../services/providerService';
import { usePatientProfile } from '../../services/userService';
import toast from 'react-hot-toast';

const BookingPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const bookAppointmentMutation = useBookAppointment();
    const initializePaymentMutation = useInitializePayment();
    const [providerData, setProviderData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Refs to prevent duplicate submissions
    const isBookingInProgressRef = useRef(false);
    const isPaymentInProgressRef = useRef(false);

    // Multi-step booking state
    const [currentStep, setCurrentStep] = useState('appointment'); // 'appointment', 'patient-details', 'login', 'payment'

    // Appointment form state (from previous step)
    const [appointmentFor, setAppointmentFor] = useState('Myself');
    const [visitedBefore, setVisitedBefore] = useState('Yes');
    const [identificationNumber, setIdentificationNumber] = useState('');
    const [comments, setComments] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'paystack'>('paystack');
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);

    // Patient details form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [homeAddress, setHomeAddress] = useState('');
    const [gender, setGender] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');

    // Someone else form state
    const [patientFullName, setPatientFullName] = useState('');
    const [patientEmail, setPatientEmail] = useState('');
    const [patientMobileNumber, setPatientMobileNumber] = useState('');
    const [patientHomeAddress, setPatientHomeAddress] = useState('');
    const [patientGender, setPatientGender] = useState('');
    const [patientDateOfBirth, setPatientDateOfBirth] = useState('');
    const [communicationPreference, setCommunicationPreference] = useState('Both');

    // Emergency modal state
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);

    // Edit booking modal state
    const [showEditBookingModal, setShowEditBookingModal] = useState(false);
    const [editBookingSelectedService, setEditBookingSelectedService] = useState('');
    const [editSelectedDate, setEditSelectedDate] = useState<string>(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`;
    });
    const [editSelectedTime, setEditSelectedTime] = useState('');
    const today = useMemo(() => new Date(), []);
    const [calendarMonth, setCalendarMonth] = useState<number>(today.getMonth());
    const [calendarYear, setCalendarYear] = useState<number>(today.getFullYear());

    // Load provider data for edit modal
    const { data: providersData } = useAllProviders();
    const providerFromApi = useMemo(() => {
        const providers = providersData?.data || [];
        return providers.find((p: any) => (p.id || p._id) === id);
    }, [providersData, id]);

    // Ensure providerData has services from API when available
    useEffect(() => {
        if (providerFromApi && providerData && (!providerData.services || providerData.services.length === 0)) {
            // Extract services from API provider
            const apiServices = (providerFromApi.services || []).map((s: any) => {
                if (typeof s === 'string') {
                    return s;
                } else if (s && typeof s === 'object') {
                    return s.name || s.serviceName || String(s);
                }
                return String(s);
            });

            if (apiServices.length > 0) {
                setProviderData((prev: any) => ({
                    ...prev,
                    services: apiServices
                }));
            }
        }
    }, [providerFromApi, providerData]);

    // Load profile for prefilling when booking for Myself and to detect login status
    const { data: profileData } = usePatientProfile();
    const isLoggedIn = !!(profileData?.data?.id) || !!localStorage.getItem('authToken');

    // If user is logged in, skip showing the login step
    useEffect(() => {
        if (currentStep === 'login' && isLoggedIn) {
            setCurrentStep('payment');
        }
    }, [currentStep, isLoggedIn]);

    // Pre-fill "About" section when booking for Myself
    useEffect(() => {
        if (appointmentFor !== 'Myself') return;
        const p = profileData?.data;
        if (!p) return;
        const name = p.full_name || `${p.personal_details?.first_name || ''} ${p.personal_details?.last_name || ''}`.trim();
        const emailAddr = p.contact_details?.email_address || p.email || '';
        const phone = p.contact_details?.phone_number || p.phone_number || '';
        const addr = p.location_details?.address || '';
        const gen = p.personal_details?.gender || '';
        const dob = p.personal_details?.date_of_birth || '';

        setFullName(name);
        setEmail(emailAddr);
        setMobileNumber(phone);
        setHomeAddress(addr);
        setGender(gen ? gen.charAt(0).toUpperCase() + gen.slice(1).toLowerCase() : '');
        setDateOfBirth(dob);
    }, [appointmentFor, profileData]);

    // Pre-fill "About You" section when booking for Someone else
    useEffect(() => {
        if (appointmentFor !== 'Someone else') return;
        const p = profileData?.data;
        if (!p) return;
        const name = p.full_name || `${p.personal_details?.first_name || ''} ${p.personal_details?.last_name || ''}`.trim();
        const emailAddr = p.contact_details?.email_address || p.email || '';
        const phone = p.contact_details?.phone_number || p.phone_number || '';

        setFullName(name);
        setEmail(emailAddr);
        setMobileNumber(phone);
    }, [appointmentFor, profileData]);

    // Pre-fill "About You" section when booking for Someone else
    useEffect(() => {
        if (appointmentFor !== 'Someone else') return;
        const p = profileData?.data;
        if (!p) return;
        const name = p.full_name || `${p.personal_details?.first_name || ''} ${p.personal_details?.last_name || ''}`.trim();
        const emailAddr = p.contact_details?.email_address || p.email || '';
        const phone = p.contact_details?.phone_number || p.phone_number || '';

        setFullName(name);
        setEmail(emailAddr);
        setMobileNumber(phone);
    }, [appointmentFor, profileData]);

    // Get provider data
    useEffect(() => {
        const state = (location.state || {}) as any;
        if (state?.provider) {
            setProviderData(state.provider);
        }
        if (state?.service) setSelectedService(state.service);
        if (state?.date) setSelectedDate(state.date);
        if (state?.time) setSelectedTime(state.time);

        // Fallback to localStorage draft for rich service/provider details
        try {
            const draftRaw = localStorage.getItem('bookingDraft');
            if (draftRaw) {
                const draft = JSON.parse(draftRaw || '{}');
                if (!state?.provider && draft?.provider) setProviderData(draft.provider);
                if (!state?.service && draft?.service) {
                    const draftSvc = draft.service;
                    if (typeof draftSvc === 'string') {
                        setSelectedService(draftSvc);
                    } else if (draftSvc && typeof draftSvc === 'object') {
                        setSelectedService(draftSvc.name || draftSvc);
                    }
                }
                if (!state?.date && draft?.date) setSelectedDate(draft.date);
                if (!state?.time && draft?.time) setSelectedTime(draft.time);
            }
        } catch { }

        setLoading(false);
    }, [location.state]);

    // Auto-select first service if there's only one service and no service is selected
    useEffect(() => {
        if (providerData && providerData.services && providerData.services.length === 1) {
            // Check if we already have a service selected
            let hasService = false;
            if (selectedService) {
                if (typeof selectedService === 'string') {
                    hasService = selectedService.trim() !== '';
                } else if (typeof selectedService === 'object') {
                    hasService = true; // Object service is considered selected
                }
            }

            if (!hasService) {
                const firstService = providerData.services[0];
                // Set the service based on its type
                if (typeof firstService === 'string') {
                    setSelectedService(firstService);
                } else if (firstService && typeof firstService === 'object') {
                    // Keep the full object if it's an object, otherwise use name
                    setSelectedService(firstService.name ? firstService : firstService);
                } else {
                    setSelectedService(String(firstService));
                }
            }
        }
    }, [providerData, selectedService]);

    // Restore data from localStorage when navigating back to appointment step
    useEffect(() => {
        if (currentStep === 'appointment') {
            try {
                const draftRaw = localStorage.getItem('bookingDraft');
                if (draftRaw) {
                    const draft = JSON.parse(draftRaw);

                    // Restore date
                    if (draft?.date) {
                        setSelectedDate(draft.date);
                    }

                    // Restore time
                    if (draft?.time) {
                        setSelectedTime(draft.time);
                    }

                    // Restore service
                    if (draft?.service) {
                        const draftSvc = draft.service;
                        if (typeof draftSvc === 'string') {
                            setSelectedService(draftSvc);
                        } else if (draftSvc && typeof draftSvc === 'object') {
                            setSelectedService(draftSvc.name || draftSvc);
                        }
                    }
                }
            } catch { }
        }
    }, [currentStep]);

    // Keep draft synced as user edits on this page
    useEffect(() => {
        try {
            const previous = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
            const draft = {
                ...previous,
                provider: providerData || previous?.provider,
                service: selectedService || previous?.service,
                date: selectedDate || previous?.date,
                time: selectedTime || previous?.time,
            };
            // If we only have a string service in state, keep previous rich service object if available
            if (typeof draft.service === 'string' && typeof previous?.service === 'object') {
                draft.service = previous.service;
            }
            localStorage.setItem('bookingDraft', JSON.stringify(draft));
        } catch { }
    }, [providerData, selectedService, selectedDate, selectedTime]);

    // Initialize edit modal state when opening
    useEffect(() => {
        if (showEditBookingModal && providerData) {
            console.log('=== EDIT BOOKING MODAL INITIALIZATION ===');
            console.log('1. providerData:', providerData);
            console.log('2. providerData.services:', providerData?.services);
            console.log('2b. providerFromApi:', providerFromApi);
            console.log('2c. providerFromApi.services:', providerFromApi?.services);

            // Ensure providerData has services - use API data if available
            let servicesToUse = providerData?.services || [];
            if ((!servicesToUse || servicesToUse.length === 0) && providerFromApi?.services) {
                // Extract service names from API services array
                servicesToUse = (providerFromApi.services || []).map((s: any) => {
                    if (typeof s === 'string') {
                        return s;
                    } else if (s && typeof s === 'object') {
                        return s.name || s.serviceName || String(s);
                    }
                    return String(s);
                });
                console.log('2d. Using services from providerFromApi:', servicesToUse);

                // Update providerData with services for consistency
                setProviderData((prev: any) => ({
                    ...prev,
                    services: servicesToUse
                }));
            }

            const dateToUse = selectedDate || editSelectedDate;
            setEditSelectedDate(dateToUse);
            setEditSelectedTime(selectedTime || editSelectedTime);

            console.log('3. selectedDate:', selectedDate);
            console.log('4. selectedTime:', selectedTime);
            console.log('5. selectedService state:', selectedService);

            // Set calendar to the month of the selected date
            if (dateToUse) {
                const dateObj = new Date(dateToUse);
                setCalendarMonth(dateObj.getMonth());
                setCalendarYear(dateObj.getFullYear());
            }

            // Extract service name - prioritize localStorage draft as source of truth
            let serviceName = '';

            // First, check localStorage draft (most reliable source)
            try {
                const draftRaw = localStorage.getItem('bookingDraft');
                console.log('6. localStorage bookingDraft (raw):', draftRaw);

                if (draftRaw) {
                    const draft = JSON.parse(draftRaw);
                    console.log('7. localStorage bookingDraft (parsed):', draft);
                    const draftService = draft?.service;
                    console.log('8. draft.service:', draftService);
                    console.log('9. draft.service type:', typeof draftService);

                    if (draftService) {
                        if (typeof draftService === 'string') {
                            serviceName = draftService;
                            console.log('10. Service name from localStorage (string):', serviceName);
                        } else if (typeof draftService === 'object' && draftService !== null) {
                            // Extract name from service object - check multiple possible property names
                            serviceName = draftService.name || draftService.serviceName || draftService.title || '';
                            console.log('11. Service name from localStorage (object):', serviceName);
                            console.log('11b. Service object properties:', Object.keys(draftService));
                            console.log('11c. draftService.name:', draftService.name);
                            console.log('11d. draftService.serviceName:', draftService.serviceName);
                        }
                    }
                }
            } catch (err) {
                console.error('Error parsing booking draft:', err);
            }

            // If not found in localStorage, try selectedService state
            if (!serviceName && selectedService) {
                console.log('12. Checking selectedService state (serviceName is empty)');
                if (typeof selectedService === 'string') {
                    serviceName = selectedService;
                    console.log('13. Service name from state (string):', serviceName);
                } else if (typeof selectedService === 'object' && selectedService !== null) {
                    serviceName = (selectedService as any).name || (selectedService as any).serviceName || '';
                    console.log('14. Service name from state (object):', serviceName);
                    console.log('14b. selectedService object properties:', Object.keys(selectedService));
                }
            }

            // Get available services - use the services we prepared earlier
            const availableServices = servicesToUse.length > 0 ? servicesToUse : (providerData?.services || []);
            console.log('15. Available services array:', availableServices);
            console.log('16. Available services count:', availableServices.length);

            // Log each service in the array
            availableServices.forEach((s: any, idx: number) => {
                const sName = typeof s === 'string' ? s : (s?.name || s?.serviceName || String(s));
                console.log(`17. Service ${idx}:`, s, '-> name:', sName);
            });

            // If we found a service name, verify it exists in available services
            if (serviceName && serviceName.trim() !== '' && availableServices.length > 0) {
                console.log('18. Checking if serviceName exists in available services:', serviceName);
                // Check if the service name exists in the services array (handle both string and object)
                const serviceExists = availableServices.some((s: any) => {
                    const sName = typeof s === 'string' ? s : (s?.name || s?.serviceName || String(s));
                    // Case-insensitive comparison for better matching
                    const matches = sName?.toLowerCase().trim() === serviceName.toLowerCase().trim();
                    if (matches) {
                        console.log('19. Found matching service:', sName);
                    }
                    return matches;
                });
                console.log('20. Service exists in available services:', serviceExists);

                if (!serviceExists) {
                    // Service not found, use first available
                    const firstService = availableServices[0];
                    serviceName = typeof firstService === 'string' ? firstService : (firstService?.name || firstService?.serviceName || String(firstService));
                    console.log('21. Service not found, using first available:', serviceName);
                } else {
                    console.log('22. Keeping existing service name:', serviceName);
                }
            } else if (availableServices.length > 0) {
                // No service found, use first available
                const firstService = availableServices[0];
                serviceName = typeof firstService === 'string' ? firstService : (firstService?.name || firstService?.serviceName || String(firstService));
                console.log('23. No service name found, using first available:', serviceName);
            } else {
                console.log('24. No available services found');
            }

            console.log('25. FINAL serviceName to set:', serviceName);
            console.log('26. editBookingSelectedService will be set to:', serviceName || '');
            console.log('=== END EDIT BOOKING MODAL INITIALIZATION ===\n');

            // Always set the service name (even if empty, the dropdown will handle it)
            setEditBookingSelectedService(serviceName || '');
        }
    }, [showEditBookingModal, selectedDate, selectedTime, selectedService, providerData, providerFromApi]);

    // Parse YYYY-MM-DD as a local date to avoid UTC day shifts
    const parseLocalDate = (iso: string) => {
        const [y, m, d] = iso.split('-').map((v) => parseInt(v, 10));
        return new Date(y, (m || 1) - 1, d || 1);
    };

    // Removed availabilityByDate - we'll use working hours directly via generateSlotsFromWH
    const availabilityByDate: Record<string, string[]> = useMemo(() => {
        // Return empty object so slotsForDate always falls back to generateSlotsFromWH
        return {};
    }, []);

    // Helpers for Today/Tomorrow rendering
    const todayISO = useMemo(() => {
        const d = new Date(today);
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, [today]);

    const tomorrowISO = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, [today]);

    const workingHoursMap = useMemo(() => {
        const wh = (providerFromApi as any)?.working_hours || [];
        const map = new Map<string, any>();
        wh.forEach((w: any) => {
            if (w?.day) map.set(String(w.day).toLowerCase(), w);
        });
        return map;
    }, [providerFromApi]);

    const getWHForDate = (isoDate: string) => {
        const d = parseLocalDate(isoDate);
        const name = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()].toLowerCase();
        return workingHoursMap.get(name);
    };

    // Generate fallback slots from working_hours
    const toMinutes = (t: string) => {
        const [time, merRaw] = (t || '').trim().split(/\s+/);
        if (!time) return NaN;
        const [hh, mm] = time.split(':').map((v) => parseInt(v || '0', 10));
        let h = (hh || 0) % 12;
        const mer = (merRaw || '').toLowerCase();
        if (mer.startsWith('p')) h += 12;
        return h * 60 + (mm || 0);
    };

    const fmtTime = (m: number) => {
        const h24 = Math.floor(m / 60);
        const mm = m % 60;
        const mer = h24 >= 12 ? 'PM' : 'AM';
        let h = h24 % 12; if (h === 0) h = 12;
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        return `${h}:${pad(mm)} ${mer}`;
    };

    const generateSlotsFromWH = (isoDate: string): string[] => {
        const wh = getWHForDate(isoDate);
        if (!wh?.isAvailable || !wh?.startTime || !wh?.endTime) return [];
        const start = toMinutes(wh.startTime);
        const end = toMinutes(wh.endTime);
        if (isNaN(start) || isNaN(end) || start >= end) return [];
        const times: string[] = [];
        for (let m = start; m + 30 <= end; m += 60) {
            times.push(fmtTime(m));
        }
        return times;
    };

    const slotsForDate = (isoDate: string): string[] => {
        const daySlots = availabilityByDate[isoDate] || [];
        if (daySlots.length > 0) return daySlots;
        return generateSlotsFromWH(isoDate);
    };

    const nextAvailableISO = useMemo(() => {
        const start = new Date(editSelectedDate);
        for (let i = 1; i <= 30; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const y = d.getFullYear();
            const m = `${d.getMonth() + 1}`.padStart(2, '0');
            const day = `${d.getDate()}`.padStart(2, '0');
            const iso = `${y}-${m}-${day}`;
            const wh = getWHForDate(iso);
            if (wh?.isAvailable) return iso;
        }
        return null;
    }, [editSelectedDate, workingHoursMap]);

    const timeStringToMinutes = (timeStr: string): number => {
        const [time, merRaw] = timeStr.trim().split(/\s+/);
        if (!time) return 0;
        const [hhStr, mmStr] = time.split(':');
        let h = parseInt(hhStr || '0', 10);
        const m = parseInt(mmStr || '0', 10);
        const mer = (merRaw || '').toLowerCase();
        h = h % 12;
        if (mer.startsWith('p')) h += 12;
        return h * 60 + (isNaN(m) ? 0 : m);
    };

    const isPastForToday = (dateISO: string, timeStr: string): boolean => {
        if (dateISO !== todayISO) return false;
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const slotMinutes = timeStringToMinutes(timeStr);
        return slotMinutes <= nowMinutes;
    };

    const monthLabel = useMemo(() => {
        return new Date(calendarYear, calendarMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }, [calendarMonth, calendarYear]);

    const calendarCells = useMemo(() => {
        const firstDay = new Date(calendarYear, calendarMonth, 1);
        const startDayIndex = (firstDay.getDay() + 6) % 7; // make Monday=0
        const totalCells = 35;
        const baseDate = new Date(calendarYear, calendarMonth, 1 - startDayIndex);
        return Array.from({ length: totalCells }, (_, index) => {
            const date = new Date(baseDate);
            date.setDate(baseDate.getDate() + index);
            return date;
        });
    }, [calendarMonth, calendarYear]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!providerData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg text-red-600">Provider not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-white">
            <div className=" mx-auto  ">
                <div className="flex gap-8">
                    {/* Left Panel - Appointment Summary */}
                    <div className="w-[485px] min-h-[1167px] h-full flex flex-col justify-between  pl-[64px] pr-[126px] bg-[#F6F8FA] p-6">
                        <div className="flex flex-col space-y-4">
                            {/* Hospital Image */}
                            <img
                                src={providerData.image || "/hospital.jpg"}
                                alt={providerData.name}
                                className="w-16 h-16 rounded-lg object-cover"
                            />

                            {/* Hospital Name */}
                            <h3 className="text-xl font-bold text-black">{providerData.name}</h3>

                            {/* Address */}
                            <p className="text-sm text-black underline">{providerData.address}</p>

                            {/* Date and Time */}
                            <p className="text-sm text-gray-600">{new Date(selectedDate).toDateString()} at {selectedTime}</p>

                            {/* Service and Price */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-black">
                                    {(() => {
                                        if (!selectedService) return 'Service';
                                        if (typeof selectedService === 'string') return selectedService;
                                        return (selectedService as any).name || 'Service';
                                    })()}
                                </span>
                                <span className="text-sm text-black">
                                    {(() => {
                                        // Try to get price from selectedService
                                        let price = null;
                                        if (selectedService && typeof selectedService === 'object') {
                                            price = (selectedService as any).price || (selectedService as any).amount || (selectedService as any).cost;
                                        }

                                        // If not found, check localStorage draft
                                        if (!price) {
                                            try {
                                                const draftRaw = localStorage.getItem('bookingDraft');
                                                if (draftRaw) {
                                                    const draft = JSON.parse(draftRaw);
                                                    const draftService = draft?.service;
                                                    if (draftService && typeof draftService === 'object') {
                                                        price = draftService.price || draftService.amount || draftService.cost;
                                                    }
                                                }
                                            } catch { }
                                        }

                                        return price ? `₦${price.toLocaleString()}` : '—';
                                    })()}
                                </span>
                            </div>

                            {/* Edit booking link */}
                            <button
                                onClick={() => setShowEditBookingModal(true)}
                                className="text-sm text-blue-600 underline text-left"
                            >
                                Edit booking
                            </button>
                        </div>
                        <div>
                            <p className='text-[16px] font-[400] text-black'>This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.</p>
                        </div>
                    </div>

                    {/* Right Panel - Patient Details Form */}
                    <div className="flex-1 w-[480px] rounded-lg shadow-sm p-8">
                        {/* Breadcrumb */}
                        <div className="flex items-center border-b border-[#E1E3E6] pb-8 justify-between mb-8">
                            <button
                                onClick={() => {
                                    if (currentStep === 'patient-details') {
                                        setCurrentStep('appointment');
                                    } else if (currentStep === 'login') {
                                        setCurrentStep('patient-details');
                                    } else if (currentStep === 'payment') {
                                        if (isLoggedIn) {
                                            setCurrentStep('patient-details');
                                        } else {
                                            setCurrentStep('login');
                                        }
                                    } else {
                                        navigate(-1);
                                    }
                                }}
                                className="hover:text-gray-900"
                            >
                                ← Back
                            </button>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <button
                                    onClick={() => setCurrentStep('appointment')}
                                    className={`hover:text-gray-900 ${currentStep === 'appointment' ? 'text-gray-900 font-medium' : ''}`}
                                >
                                    Appointment
                                </button>
                                <span>/</span>
                                <button
                                    onClick={() => setCurrentStep('patient-details')}
                                    className={`hover:text-gray-900 ${currentStep === 'patient-details' ? 'text-gray-900 font-medium' : ''}`}
                                >
                                    Patient details
                                </button>
                                <span>/</span>
                                <button
                                    onClick={() => setCurrentStep('payment')}
                                    className={`hover:text-gray-900 ${currentStep === 'payment' ? 'text-gray-900 font-medium' : ''}`}
                                >
                                    Payment
                                </button>
                            </div>
                            <button
                                onClick={() => setShowEmergencyModal(true)}
                                className="flex items-center space-x-2 text-red-600 hover:text-red-700 cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm">Is this an emergency?</span>
                            </button>
                        </div>

                        {/* Multi-step Form Content */}
                        {currentStep === 'appointment' && (
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-black mb-6">Appointment Details</h2>

                                <form className="space-y-6 w-[480px]">
                                    {/* Who is appointment for */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Who is appointment for?
                                        </label>
                                        <select
                                            value={appointmentFor}
                                            onChange={(e) => setAppointmentFor(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="Myself">Myself</option>
                                            <option value="Someone else">Someone else</option>
                                        </select>
                                    </div>

                                    {/* Have you visited before */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Have you visited {providerData.name} before?
                                        </label>
                                        <select
                                            value={visitedBefore}
                                            onChange={(e) => {
                                                setVisitedBefore(e.target.value);
                                                // Clear identification number if user selects "No"
                                                if (e.target.value === 'No') {
                                                    setIdentificationNumber('');
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>

                                    {/* Identification number - only show if visited before is "Yes" */}
                                    {visitedBefore === 'Yes' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Identification number
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={identificationNumber}
                                                    onChange={(e) => setIdentificationNumber(e.target.value)}
                                                    placeholder="Enter identification number"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                                                />
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                                                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-xs font-bold">E</span>
                                                    </div>
                                                    <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Comments */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Comments
                                        </label>
                                        <textarea
                                            value={comments}
                                            onChange={(e) => setComments(e.target.value)}
                                            placeholder="Any additional notes or special requirements..."
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Continue button */}
                                    <div className="pt-6">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCurrentStep('patient-details');
                                            }}
                                            className="w-full py-3 px-6 rounded-md transition-colors font-medium bg-gray-900 text-white hover:bg-gray-800"
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {currentStep === 'patient-details' && (
                            <div className="mb-8">
                                {appointmentFor === 'Myself' ? (
                                    // Form for booking for myself
                                    <div>
                                        <h2 className="text-2xl font-bold text-black mb-6">About</h2>

                                        <form className="space-y-6 w-[480px]">
                                            {/* Full Name */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Fullname</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        placeholder="Enter full name"
                                                        disabled={isLoggedIn}
                                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    />
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                                <div className="relative">
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        placeholder="Enter email address"
                                                        disabled={isLoggedIn}
                                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    />
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mobile Number */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile number</label>
                                                <div className="relative">
                                                    <input
                                                        type="tel"
                                                        value={mobileNumber}
                                                        onChange={(e) => setMobileNumber(e.target.value)}
                                                        placeholder="Enter mobile number"
                                                        disabled={isLoggedIn}
                                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    />
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                        <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Home Address */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Home address</label>
                                                <input
                                                    type="text"
                                                    value={homeAddress}
                                                    onChange={(e) => setHomeAddress(e.target.value)}
                                                    placeholder="Enter home address"
                                                    disabled={isLoggedIn}
                                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                />
                                            </div>

                                            {/* Gender */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                                                <div className="relative">
                                                    <select
                                                        value={gender}
                                                        onChange={(e) => setGender(e.target.value)}
                                                        disabled={isLoggedIn}
                                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    >
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Date of Birth */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Date of birth</label>
                                                <input
                                                    type="text"
                                                    value={dateOfBirth}
                                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                                    placeholder="DD/MM/YYYY"
                                                    disabled={isLoggedIn}
                                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                />
                                            </div>

                                            {/* Continue button */}
                                            <div className="pt-6 relative">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const draft = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
                                                        const svc = draft?.service || {};
                                                        const serviceId = svc?.id || svc?.serviceId || '';
                                                        const forWhom = appointmentFor === 'Myself' ? 'Self' : 'Other';
                                                        const visited = visitedBefore === 'Yes';
                                                        if (!id || !serviceId || !selectedDate || !selectedTime) {
                                                            toast.error("Please select a service, date and time to proceed.");
                                                            return;
                                                        }
                                                        if (visited && !identificationNumber.trim()) {
                                                            toast.error("Please enter your identification number.");
                                                            return;
                                                        }
                                                        if (!fullName || !email || !mobileNumber || !gender || !dateOfBirth) {
                                                            toast.error("Please ensure Full Name, Email, Mobile Number, Gender, and Date of Birth are provided.");
                                                            return;
                                                        }
                                                        const toMinutes = (t: string) => {
                                                            const [time, mer] = String(t).split(/\s+/);
                                                            const [hh, mm] = (time || '').split(':').map((v) => parseInt(v || '0', 10));
                                                            let h = (hh || 0) % 12; if ((mer || '').toLowerCase().startsWith('p')) h += 12;
                                                            return h * 60 + (mm || 0);
                                                        };
                                                        const fmt = (m: number) => {
                                                            const h24 = Math.floor(m / 60);
                                                            const mm = m % 60;
                                                            const mer = h24 >= 12 ? 'PM' : 'AM';
                                                            let h = h24 % 12; if (h === 0) h = 12;
                                                            const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                                                            return `${h}:${pad(mm)} ${mer}`;
                                                        };
                                                        const endTime = fmt(toMinutes(selectedTime) + 30);

                                                        // Prevent duplicate booking submissions
                                                        if (isBookingInProgressRef.current || bookAppointmentMutation.isPending) {
                                                            return;
                                                        }
                                                        
                                                        // Check if booking already exists
                                                        const draftCheck = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
                                                        if (draftCheck?.appointment?.id) {
                                                            toast.error('A booking is already in progress. Please complete the payment first.');
                                                            return;
                                                        }
                                                        
                                                        isBookingInProgressRef.current = true;
                                                        
                                                        // Prepare formData based on booking type - include patient details for "Self" bookings
                                                        const formData = {
                                                            forWhom,
                                                            visitedBefore: visited,
                                                            identificationNumber,
                                                            comments,
                                                            communicationPreference: appointmentFor === 'Myself' ? 'Booker' : communicationPreference,
                                                            // Include patient details for "Self" bookings (guest or logged-in user data)
                                                            patientName: fullName,
                                                            patientEmail: email,
                                                            patientPhone: mobileNumber,
                                                            patientAddress: homeAddress,
                                                            patientGender: gender,
                                                            patientDOB: dateOfBirth,
                                                        };

                                                        bookAppointmentMutation.mutate({
                                                            providerId: id,
                                                            serviceId,
                                                            date: selectedDate,
                                                            start_time: selectedTime,
                                                            end_time: endTime,
                                                            formData,
                                                            notes: comments || '',
                                                        }, {
                                                            onSuccess: (res) => {
                                                                isBookingInProgressRef.current = false;
                                                                if (!res?.success) {
                                                                    const msg = res?.message || 'Unable to book this slot. Please choose another time.';
                                                                    toast.error(msg);
                                                                    return;
                                                                }
                                                                try {
                                                                    const prev = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
                                                                    const appointment = res?.data?.appointment || {};
                                                                    localStorage.setItem('bookingDraft', JSON.stringify({
                                                                        ...prev,
                                                                        appointment,
                                                                    }));
                                                                } catch { }
                                                                if (res?.message) toast.success(res.message);
                                                                setCurrentStep('payment');
                                                            },
                                                            onError: (error: any) => {
                                                                isBookingInProgressRef.current = false;
                                                                const apiMsg = error?.response?.data?.message;
                                                                const mongoCode = error?.response?.data?.code || error?.code;
                                                                const isDup = mongoCode === 11000 || /duplicate key/i.test(String(apiMsg || ''));
                                                                const msg = isDup
                                                                    ? 'This time slot is already booked. Please choose another time.'
                                                                    : (apiMsg || 'Failed to book appointment. Please try another time.');
                                                                toast.error(msg);
                                                            }
                                                        });
                                                    }}
                                                    disabled={isBookingInProgressRef.current || bookAppointmentMutation.isPending}
                                                    className={`w-full py-3 px-6 rounded-md transition-colors font-medium relative ${(isBookingInProgressRef.current || bookAppointmentMutation.isPending) ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                                                >
                                                    {(isBookingInProgressRef.current || bookAppointmentMutation.isPending) ? 'Booking…' : 'Continue'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                ) : (
                                    // Form for booking for someone else
                                    <div>
                                        <form className="space-y-8 w-[480px]">
                                            {/* About You Section */}
                                            <div>
                                                <h3 className="text-lg font-bold text-black mb-4">About You</h3>
                                                <div className="space-y-4">
                                                    {/* Full Name */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Fullname</label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={fullName}
                                                                onChange={(e) => setFullName(e.target.value)}
                                                                placeholder="Enter full name"
                                                                disabled={isLoggedIn}
                                                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                            />
                                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                                <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Email */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                                        <div className="relative">
                                                            <input
                                                                type="email"
                                                                value={email}
                                                                onChange={(e) => setEmail(e.target.value)}
                                                                placeholder="Enter email address"
                                                                disabled={isLoggedIn}
                                                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                            />
                                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                                <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mobile Number */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Mobile number</label>
                                                        <div className="relative">
                                                            <input
                                                                type="tel"
                                                                value={mobileNumber}
                                                                onChange={(e) => setMobileNumber(e.target.value)}
                                                                placeholder="Enter mobile number"
                                                                disabled={isLoggedIn}
                                                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                            />
                                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                                <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* About Patient Section */}
                                            <div>
                                                <h3 className="text-lg font-bold text-black mb-4">About Patient</h3>
                                                <div className="space-y-4">
                                                    {/* Patient Full Name */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Fullname</label>
                                                        <input
                                                            type="text"
                                                            value={patientFullName}
                                                            onChange={(e) => setPatientFullName(e.target.value)}
                                                            placeholder="Enter full name"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>

                                                    {/* Patient Email */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                                        <input
                                                            type="email"
                                                            value={patientEmail}
                                                            onChange={(e) => setPatientEmail(e.target.value)}
                                                            placeholder="Enter email address"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>

                                                    {/* Patient Mobile Number */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Mobile number</label>
                                                        <input
                                                            type="tel"
                                                            value={patientMobileNumber}
                                                            onChange={(e) => setPatientMobileNumber(e.target.value)}
                                                            placeholder="Enter mobile number"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>

                                                    {/* Patient Home Address */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Home address</label>
                                                        <input
                                                            type="text"
                                                            value={patientHomeAddress}
                                                            onChange={(e) => setPatientHomeAddress(e.target.value)}
                                                            placeholder="Enter home address"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>

                                                    {/* Patient Gender */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                                                        <div className="relative">
                                                            <select
                                                                value={patientGender}
                                                                onChange={(e) => setPatientGender(e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                                            >
                                                                <option value="Male">Male</option>
                                                                <option value="Female">Female</option>
                                                                <option value="Other">Other</option>
                                                            </select>
                                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Patient Date of Birth */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of birth</label>
                                                        <input
                                                            type="text"
                                                            value={patientDateOfBirth}
                                                            onChange={(e) => setPatientDateOfBirth(e.target.value)}
                                                            placeholder="DD/MM/YYYY"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Communication Section */}
                                            <div>
                                                <h3 className="text-lg font-bold text-black mb-4">Communication</h3>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Who will receive booking confirmation and mails
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            value={communicationPreference}
                                                            onChange={(e) => setCommunicationPreference(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                                        >
                                                            <option value="Both">Both</option>
                                                            <option value="Booker">You only</option>
                                                            <option value="Patient">Patient only</option>
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Continue button */}
                                            <div className="pt-6 relative">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const draft = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
                                                        const svc = draft?.service || {};
                                                        const serviceId = svc?.id || svc?.serviceId || '';
                                                        const forWhom = 'Other';
                                                        const visited = visitedBefore === 'Yes';
                                                        if (!id || !serviceId || !selectedDate || !selectedTime) {
                                                            return;
                                                        }
                                                        const toMinutes = (t: string) => {
                                                            const [time, mer] = String(t).split(/\s+/);
                                                            const [hh, mm] = (time || '').split(':').map((v) => parseInt(v || '0', 10));
                                                            let h = (hh || 0) % 12; if ((mer || '').toLowerCase().startsWith('p')) h += 12;
                                                            return h * 60 + (mm || 0);
                                                        };
                                                        const fmt = (m: number) => {
                                                            const h24 = Math.floor(m / 60);
                                                            const mm = m % 60;
                                                            const mer = h24 >= 12 ? 'PM' : 'AM';
                                                            let h = h24 % 12; if (h === 0) h = 12;
                                                            const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                                                            return `${h}:${pad(mm)} ${mer}`;
                                                        };
                                                        const endTime = fmt(toMinutes(selectedTime) + 30);

                                                        // Prevent duplicate booking submissions
                                                        if (isBookingInProgressRef.current || bookAppointmentMutation.isPending) {
                                                            return;
                                                        }
                                                        
                                                        // Check if booking already exists
                                                        const draftCheck = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
                                                        if (draftCheck?.appointment?.id) {
                                                            toast.error('A booking is already in progress. Please complete the payment first.');
                                                            return;
                                                        }
                                                        
                                                        isBookingInProgressRef.current = true;
                                                        
                                                        // Prepare formData for "Someone else" booking with patient details
                                                        const formData = {
                                                            forWhom,
                                                            visitedBefore: visited,
                                                            identificationNumber,
                                                            comments,
                                                            communicationPreference,
                                                            patientName: patientFullName,
                                                            patientEmail: patientEmail,
                                                            patientPhone: patientMobileNumber,
                                                            patientAddress: patientHomeAddress,
                                                            patientGender: patientGender,
                                                            patientDOB: patientDateOfBirth,
                                                        };

                                                        bookAppointmentMutation.mutate({
                                                            providerId: id,
                                                            serviceId,
                                                            date: selectedDate,
                                                            start_time: selectedTime,
                                                            end_time: endTime,
                                                            formData,
                                                            notes: comments || '',
                                                        }, {
                                                            onSuccess: (res) => {
                                                                isBookingInProgressRef.current = false;
                                                                if (!res?.success) {
                                                                    const msg = res?.message || 'Unable to book this slot. Please choose another time.';
                                                                    toast.error(msg);
                                                                    return;
                                                                }
                                                                try {
                                                                    const prev = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
                                                                    const appointment = res?.data?.appointment || {};
                                                                    localStorage.setItem('bookingDraft', JSON.stringify({
                                                                        ...prev,
                                                                        appointment,
                                                                    }));
                                                                } catch { }
                                                                if (res?.message) toast.success(res.message);
                                                                setCurrentStep('payment');
                                                            },
                                                            onError: (error: any) => {
                                                                isBookingInProgressRef.current = false;
                                                                const apiMsg = error?.response?.data?.message;
                                                                const mongoCode = error?.response?.data?.code || error?.code;
                                                                const isDup = mongoCode === 11000 || /duplicate key/i.test(String(apiMsg || ''));
                                                                const msg = isDup
                                                                    ? 'This time slot is already booked. Please choose another time.'
                                                                    : (apiMsg || 'Failed to book appointment. Please try another time.');
                                                                toast.error(msg);
                                                            }
                                                        });
                                                    }}
                                                    disabled={isBookingInProgressRef.current || bookAppointmentMutation.isPending}
                                                    className={`w-full py-3 px-6 rounded-md transition-colors font-medium relative ${(isBookingInProgressRef.current || bookAppointmentMutation.isPending) ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                                                >
                                                    {(isBookingInProgressRef.current || bookAppointmentMutation.isPending) ? 'Booking…' : 'Continue'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep === 'login' && !isLoggedIn && (
                            <div className="mb-8 ">
                                <div className="max-w-md ">
                                    {/* Header */}
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold text-black">Almost there!</h2>
                                    </div>

                                    {/* Login Section */}
                                    <div className="mb-8">
                                        <p className="text-sm text-gray-600 mb-4">
                                            <span className="underline cursor-pointer">Log in</span> to book faster with your saved details
                                        </p>
                                        <ul className="text-sm text-gray-600 mb-6 space-y-2">
                                            <li>• Book appointments and complete online forms faster with saved details</li>
                                            <li>• Save your favourite healthcare providers</li>
                                            <li>• Manage your appointments easily</li>
                                        </ul>
                                        <button className="w-full border border-gray-300 rounded-lg py-3 px-4 flex items-center justify-center space-x-3 hover:bg-gray-50 transition-colors">
                                            <img src="/google.png" alt="Google" className="w-5 h-5" />
                                            <span className="text-sm font-medium">Continue with Google</span>
                                        </button>
                                    </div>

                                    {/* Divider */}
                                    <div className="text-center mb-8">
                                        <span className="text-sm text-gray-500">OR</span>
                                    </div>

                                    {/* Sign Up Section */}
                                    <div className="mb-8">
                                        <p className="text-sm text-gray-600 mb-2">Don't have an account?</p>
                                        <p className="text-sm text-gray-600 mb-6">
                                            <span className="underline cursor-pointer">Sign up</span> to book faster next time and get a personalized health experience.
                                        </p>
                                    </div>

                                    {/* Continue as Guest */}
                                    <button
                                        onClick={() => setCurrentStep('payment')}
                                        className="w-full border border-gray-300 rounded-lg py-3 px-4 flex items-center justify-center space-x-3 hover:bg-gray-50 transition-colors"
                                    >
                                        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm font-medium">Continue as guest</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentStep === 'payment' && (
                            <div className="mb-8">
                                <div className="flex gap-8">
                                    {/* Left Panel - Payment Methods */}
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-black mb-6">Choose your payment method</h2>

                                        {/* Payment Options */}
                                        <div className="space-y-4 mb-6">
                                            {/* Paystack Option */}
                                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        id="paystack"
                                                        checked={selectedPaymentMethod === 'paystack'}
                                                        onChange={() => setSelectedPaymentMethod('paystack')}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <div>
                                                        <label htmlFor="paystack" className="block text-sm font-medium text-gray-900">Paystack</label>
                                                        <p className="text-xs text-gray-600">Safe payment online. </p>
                                                    </div>
                                                </div>
                                                <img src="/paystack.png" alt="Paystack" className="w-12 h-8 object-contain" />
                                            </div>


                                        </div>

                                        {/* Coupon Section */}
                                        <div className="mb-6">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
                                                </svg>
                                                <label className="text-sm font-medium text-gray-700">Coupon</label>
                                            </div>
                                            <div className="flex space-x-2">
                                                <input
                                                    type="text"
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                    placeholder="Enter coupon code"
                                                    disabled={couponApplied}
                                                    className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${couponApplied ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                />
                                                {couponApplied ? (
                                                    <button
                                                        onClick={() => {
                                                            setCouponApplied(false);
                                                            setCouponCode('');
                                                            toast.success('Coupon removed');
                                                        }}
                                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            if (!couponCode.trim()) {
                                                                toast.error('Please enter a coupon code');
                                                                return;
                                                            }
                                                            if (couponCode.toUpperCase() === 'IJKZYB') {
                                                                setCouponApplied(true);
                                                                toast.success('Coupon applied! 25% discount applied');
                                                            } else {
                                                                toast.error('Invalid coupon code');
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                                                    >
                                                        Apply
                                                    </button>
                                                )}
                                            </div>
                                            {couponApplied && (
                                                <p className="mt-2 text-sm text-green-600 font-medium">
                                                    ✓ 25% discount applied
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Panel - Booking Summary */}
                                    <div className="w-80">
                                        <div className="bg-gray-50 rounded-lg p-6">
                                            <div className="flex items-center space-x-2 mb-4">
                                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-sm font-bold">B</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-black">Booking Summary</h3>
                                            </div>

                                            {/* Summary Details */}
                                            <div className="space-y-3 mb-6">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Service</span>
                                                    <span className="text-sm font-medium text-black">{(JSON.parse(localStorage.getItem('bookingDraft') || '{}')?.service?.name) || selectedService || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Price</span>
                                                    <span className="text-sm font-medium text-black">{(() => { try { const s = JSON.parse(localStorage.getItem('bookingDraft') || '{}')?.service; const price = s?.price ?? s?.amount ?? s?.cost; return price ? `₦${price}` : '—'; } catch { return '—'; } })()}</span>
                                                </div>
                                                {couponApplied && (() => {
                                                    try {
                                                        const draft = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
                                                        const s = draft?.service;
                                                        const price = s?.price ?? s?.amount ?? s?.cost;
                                                        if (price) {
                                                            const discount = price * 0.25;
                                                            return (
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-sm text-gray-600">Discount (25%)</span>
                                                                    <span className="text-sm font-medium text-green-600">-₦{discount.toFixed(2)}</span>
                                                                </div>
                                                            );
                                                        }
                                                    } catch { }
                                                    return null;
                                                })()}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Provider</span>
                                                    <span className="text-sm font-medium text-black">{providerData?.name || JSON.parse(localStorage.getItem('bookingDraft') || '{}')?.provider?.name || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">When</span>
                                                    <span className="text-sm font-medium text-black">{selectedDate} {selectedTime ? `at ${selectedTime}` : ''}</span>
                                                </div>
                                                <div className="border-t border-gray-200 pt-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-lg font-bold text-black">Total</span>
                                                        <span className="text-lg font-bold text-black">{(() => {
                                                            try {
                                                                const draft = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
                                                                const s = draft?.service;
                                                                const price = s?.price ?? s?.amount ?? s?.cost;
                                                                if (price) {
                                                                    const finalPrice = couponApplied ? price * 0.75 : price;
                                                                    return `₦${finalPrice.toFixed(2)}`;
                                                                }
                                                                return '—';
                                                            } catch {
                                                                return '—';
                                                            }
                                                        })()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Terms and Conditions */}
                                            <div className="mb-6 space-y-2">
                                                <p className="text-xs text-gray-600">
                                                    By confirming your payment, you agree to the{' '}
                                                    <a href="#" className="text-blue-600 underline">medresq healthcare terms and conditions</a>.
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    By confirming your payment, you agree to the{' '}
                                                    <a href="#" className="text-blue-600 underline">medresq healthcare's user agreement and privacy notice</a>.
                                                </p>
                                            </div>

                                            {/* Confirm and Pay Button */}
                                            <button
                                                onClick={async () => {
                                                    // Prevent duplicate payment initializations
                                                    if (isPaymentInProgressRef.current || initializePaymentMutation.isPending) {
                                                        return;
                                                    }
                                                    
                                                    try {
                                                        const draft = JSON.parse(localStorage.getItem('bookingDraft') || '{}');
                                                        const appointmentId = draft?.appointment?.id;
                                                        const s = draft?.service || {};
                                                        const baseAmount = s?.price ?? s?.amount ?? s?.cost ?? 0;
                                                        // Apply 25% discount if coupon is applied
                                                        const amount = couponApplied ? baseAmount * 0.75 : baseAmount;
                                                        // Use profile email if available, otherwise use the email entered in the form
                                                        const emailToUse = profileData?.data?.contact_details?.email_address || profileData?.data?.email || email || patientEmail || '';

                                                        if (!appointmentId || !amount || !emailToUse) {
                                                            if (!emailToUse) toast.error("Email address is missing");
                                                            return;
                                                        }
                                                        
                                                        isPaymentInProgressRef.current = true;
                                                        
                                                        const res = await initializePaymentMutation.mutateAsync({
                                                            appointmentId,
                                                            amount,
                                                            email: emailToUse,
                                                        });
                                                        const url = res?.data?.authorization_url;
                                                        if (url) {
                                                            // Payment initiated successfully, redirect to payment gateway
                                                            isPaymentInProgressRef.current = false;
                                                            window.location.href = url;
                                                        } else {
                                                            isPaymentInProgressRef.current = false;
                                                            toast.error('Failed to initialize payment. Please try again.');
                                                        }
                                                    } catch (e: any) {
                                                        isPaymentInProgressRef.current = false;
                                                        const errorMsg = e?.response?.data?.message || 'Failed to initialize payment. Please try again.';
                                                        toast.error(errorMsg);
                                                    }
                                                }}
                                                disabled={isPaymentInProgressRef.current || initializePaymentMutation.isPending}
                                                className={`w-full bg-gray-900 text-white py-3 px-6 rounded-md transition-colors font-medium mb-4 ${isPaymentInProgressRef.current || initializePaymentMutation.isPending ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400' : 'hover:bg-gray-800'}`}
                                            >
                                                {isPaymentInProgressRef.current || initializePaymentMutation.isPending ? 'Processing...' : 'Confirm and pay'}
                                            </button>

                                            {/* Promotions Checkbox */}
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id="promotions"
                                                    checked
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <label htmlFor="promotions" className="text-sm text-gray-700">
                                                    Get exclusive offers and promotions from Medresq Healthcare
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Booking Policy Section */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-black mb-4">Booking Policy</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Lorem ipsum dolor sit amet consectetur. Laoreet integer purus gravida consequat tincidunt nisi.
                                Egestas ac vitae purus purus adipiscing. Aliquam blandit consectetur volutpat pellentesque vitae in.
                                Morbi condimentum et nibh scelerisque. Convallis velit quis scelerisque eget maecenas.
                                Mauris duis suspendisse sed dis. Habitant biben.
                            </p>
                        </div>

                        {/* Cancellation Policy Section */}
                        <div>
                            <h3 className="text-lg font-bold text-black mb-4">Cancellation Policy</h3>
                            <p className="text-sm text-gray-600">
                                You can cancel or reschedule up to 24 hours before the appointment time.
                            </p>
                        </div>
                    </div>
                </div>
            </div>



            {/* Edit Booking Modal */}
            {showEditBookingModal && providerData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">Edit Booking - {providerData.name}</h2>
                            <button
                                onClick={() => setShowEditBookingModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Calendar Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">{monthLabel}</h3>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => {
                                                    if (calendarMonth === 0) {
                                                        setCalendarMonth(11);
                                                        setCalendarYear((y) => y - 1);
                                                    } else {
                                                        setCalendarMonth((m) => m - 1);
                                                    }
                                                }}
                                                className="p-1 text-gray-400 hover:text-gray-600"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (calendarMonth === 11) {
                                                        setCalendarMonth(0);
                                                        setCalendarYear((y) => y + 1);
                                                    } else {
                                                        setCalendarMonth((m) => m + 1);
                                                    }
                                                }}
                                                className="p-1 text-gray-400 hover:text-gray-600"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {/* Day Headers */}
                                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                                            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                                {day}
                                            </div>
                                        ))}

                                        {/* Calendar Days */}
                                        {calendarCells.map((date, index) => {
                                            const isCurrentMonth = date.getMonth() === calendarMonth;
                                            const isToday = date.toDateString() === today.toDateString();
                                            const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                            const isPastDay = date < startOfToday;
                                            const y = date.getFullYear();
                                            const m = `${date.getMonth() + 1}`.padStart(2, '0');
                                            const d2 = `${date.getDate()}`.padStart(2, '0');
                                            const iso = `${y}-${m}-${d2}`;
                                            const isSelected = editSelectedDate === iso;
                                            const wh = getWHForDate(iso);
                                            const isWeekdayAvailable = !!wh?.isAvailable;
                                            const baseClasses = 'p-2 text-sm rounded-md transition-colors';
                                            let stateClasses = '';
                                            if (!isCurrentMonth) {
                                                stateClasses = 'text-gray-400';
                                            } else if (isPastDay && !isToday) {
                                                stateClasses = 'text-gray-300 bg-gray-50 cursor-not-allowed';
                                            } else if (isToday) {
                                                stateClasses = 'bg-blue-100 text-blue-900 font-semibold';
                                            } else if (!isWeekdayAvailable) {
                                                stateClasses = 'text-gray-300 bg-gray-50 cursor-not-allowed';
                                            } else if (isSelected) {
                                                stateClasses = 'bg-gray-900 text-white';
                                            } else {
                                                stateClasses = 'text-gray-900 hover:bg-gray-100';
                                            }
                                            return (
                                                <button
                                                    key={`${iso}-${index}`}
                                                    onClick={() => {
                                                        if ((!isPastDay || isToday) && isWeekdayAvailable) {
                                                            setEditSelectedDate(iso);
                                                            setEditSelectedTime(''); // Reset time when date changes
                                                        }
                                                    }}
                                                    disabled={(isPastDay && !isToday) || !isWeekdayAvailable}
                                                    className={`${baseClasses} ${stateClasses}`}
                                                >
                                                    {date.getDate()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Appointment Section */}
                                <div>
                                    {/* Service Selection */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
                                        <select
                                            value={editBookingSelectedService}
                                            onChange={(e) => {
                                                setEditBookingSelectedService(e.target.value);
                                                setEditSelectedTime(''); // Reset time when service changes
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            {(() => {
                                                // Get services from providerData or providerFromApi
                                                let services = providerData?.services || [];
                                                if ((!services || services.length === 0) && providerFromApi?.services) {
                                                    services = (providerFromApi.services || []).map((s: any) => {
                                                        if (typeof s === 'string') {
                                                            return s;
                                                        } else if (s && typeof s === 'object') {
                                                            return s.name || s.serviceName || String(s);
                                                        }
                                                        return String(s);
                                                    });
                                                }

                                                return services.map((service: any, idx: number) => {
                                                    const serviceName = typeof service === 'string' ? service : (service?.name || String(service));
                                                    return (
                                                        <option key={`${serviceName}-${idx}`} value={serviceName}>
                                                            {serviceName}
                                                        </option>
                                                    );
                                                });
                                            })()}
                                        </select>
                                    </div>

                                    {/* Next Available */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Next available</h3>

                                        {/* Selected Day */}
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-medium text-gray-900">{new Date(editSelectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                                                {editSelectedDate === todayISO && (
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">TODAY</span>
                                                )}
                                                {editSelectedDate === tomorrowISO && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">TOMORROW</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {slotsForDate(editSelectedDate).map((time, i) => {
                                                    const disabled = isPastForToday(editSelectedDate, time);
                                                    const isSelected = editSelectedTime === time && editSelectedDate === editSelectedDate;
                                                    return (
                                                        <button
                                                            key={`${time}-${i}`}
                                                            onClick={() => {
                                                                if (!disabled) {
                                                                    setEditSelectedTime(time);
                                                                }
                                                            }}
                                                            disabled={disabled}
                                                            className={`px-3 py-2 text-sm rounded-md border transition-colors ${disabled
                                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                                : isSelected
                                                                    ? 'bg-gray-900 text-white border-gray-900'
                                                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            {time}
                                                        </button>
                                                    );
                                                })}
                                                {slotsForDate(editSelectedDate).length === 0 && (
                                                    <div className="col-span-2 text-sm text-gray-500">No slots for this day.</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Next Possible Day */}
                                        {nextAvailableISO && (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-sm font-medium text-gray-900">{new Date(nextAvailableISO).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">NEXT</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {slotsForDate(nextAvailableISO).length > 0 ? (
                                                        slotsForDate(nextAvailableISO).map((time, i) => {
                                                            const isSelected = editSelectedTime === time && editSelectedDate === nextAvailableISO;
                                                            return (
                                                                <button
                                                                    key={`${time}-${i}`}
                                                                    onClick={() => {
                                                                        setEditSelectedDate(nextAvailableISO);
                                                                        setEditSelectedTime(time);
                                                                    }}
                                                                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${isSelected
                                                                        ? 'bg-gray-900 text-white border-gray-900'
                                                                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                                                        }`}
                                                                >
                                                                    {time}
                                                                </button>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="col-span-2 text-sm text-gray-500">Not available for this day.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-3 pt-6 mt-auto border-t border-gray-200">
                                <button
                                    onClick={() => setShowEditBookingModal(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (!editSelectedDate || !editSelectedTime) {
                                            toast.error('Please select a date and time');
                                            return;
                                        }

                                        // Find service object from API if available
                                        try {
                                            const svcFromApi = ((providerFromApi as any)?.services || []).find((s: any) => {
                                                if (!s) return false;
                                                const name = s?.name || String(s);
                                                return name === editBookingSelectedService;
                                            });

                                            // Update local state
                                            setSelectedDate(editSelectedDate);
                                            setSelectedTime(editSelectedTime);

                                            // Update service - preserve object structure if available
                                            if (svcFromApi) {
                                                setSelectedService(svcFromApi);
                                            } else {
                                                setSelectedService(editBookingSelectedService);
                                            }

                                            // Update draft in localStorage
                                            const draft = {
                                                provider: {
                                                    id,
                                                    name: providerData.name,
                                                    address: providerData.address,
                                                    image: providerData.image,
                                                },
                                                service: svcFromApi || { name: editBookingSelectedService },
                                                date: editSelectedDate,
                                                time: editSelectedTime,
                                            };
                                            localStorage.setItem('bookingDraft', JSON.stringify(draft));

                                            toast.success('Booking details updated');
                                            setShowEditBookingModal(false);
                                        } catch (error) {
                                            console.error('Error updating booking:', error);
                                            toast.error('Failed to update booking details');
                                        }
                                    }}
                                    disabled={!editSelectedDate || !editSelectedTime}
                                    className={`px-4 py-2 rounded-md transition-colors font-medium ${!editSelectedDate || !editSelectedTime
                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                        : 'bg-gray-900 text-white hover:bg-gray-800'
                                        }`}
                                >
                                    Update Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Emergency Modal */}
            {showEmergencyModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 max-w-md mx-4 relative">
                        {/* Warning Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>

                        {/* Title with Chat Icons */}
                        <div className="text-center mb-6 relative">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Emergency Treatment</h2>
                            {/* Chat bubble icons */}
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                                </svg>
                            </div>
                            <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                                </svg>
                            </div>
                        </div>

                        {/* Emergency Text */}
                        <div className="text-center mb-6">
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Please dial <span className="font-bold underline">000</span> dolor sit amet consectetur. Diam enim posuere dui eget. Arcu mauris velit erat neque enim semper enim aliquam. Ornare vulputate urna ac lectus bibendum. Aliquet bibendum donec turpis nibh mauris lacus.
                            </p>
                        </div>

                        {/* Chat with Agent Link */}
                        <div className="text-center">
                            <button className="text-blue-600 underline hover:text-blue-800">
                                Chat with Agent
                            </button>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setShowEmergencyModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingPage;