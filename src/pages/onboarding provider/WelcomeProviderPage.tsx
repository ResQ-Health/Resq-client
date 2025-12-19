import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdOutlineContentCopy, MdOutlineRemoveRedEye, MdOutlineEmail, MdOutlineNotificationsNone, MdOutlineSms } from "react-icons/md";
import { HiEyeSlash } from "react-icons/hi2";
import { useProviderProfile, useUploadProviderProfilePicture, useUpdateProviderWorkingHours, useUpdateProviderProfile, useUpdateProviderNotificationSettings, useCompleteOnboarding } from '../../services/providerService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const TABS = [
  { label: 'Profile', icon: '/icons/profile.png' },
  { label: 'Working hours', icon: '/icons/working hrs.png' },
  { label: 'Login and security', icon: '/icons/login and security.png' },
  { label: 'Manage your account', icon: '/icons/tool.png' },
];

// Helper to generate time options in 30 min intervals
const generateTimeOptions = () => {
  const times = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 30) {
      const hour = i;
      const minute = j;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      const displayMinute = minute === 0 ? '00' : minute;
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const label = `${displayHour}:${displayMinute} ${ampm}`;
      times.push({ value, label });
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

const SuccessModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center transform transition-all scale-100 opacity-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-[#06202E] mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>All Set!</h3>
        <p className="text-gray-500 mb-8" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          Your profile has been successfully updated. You're ready to start receiving appointments.
        </p>
        <button
          onClick={onClose}
          className="bg-[#06202E] text-white px-8 py-3 rounded-xl font-medium w-full hover:bg-[#0a2e42] transition-colors"
          style={{ fontFamily: 'Plus Jakarta Sans' }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

const WelcomeProviderPage = () => {
  const [step, setStep] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const getProviderProfileMutation = useProviderProfile();
  const updateWorkingHoursMutation = useUpdateProviderWorkingHours();
  const updateProfileMutation = useUpdateProviderProfile();
  const updateNotificationSettingsMutation = useUpdateProviderNotificationSettings();
  const completeOnboardingMutation = useCompleteOnboarding();

  // Profile form data and errors
  const [profileData, setProfileData] = useState({ fullname: '', email: '', phone: '', role: '' });
  const [originalProfileData, setOriginalProfileData] = useState({ fullname: '', email: '', phone: '', role: '' });
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: false,
    sms: true
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const defaultWorkingHours = [
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
  ];

  const [workingHours, setWorkingHours] = useState(defaultWorkingHours);
  const [originalWorkingHours, setOriginalWorkingHours] = useState(defaultWorkingHours);

  const [applied, setApplied] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Attempt to prefill from auth context first
    if (user) {
      // If user is already onboarded, redirect to dashboard immediately
      if (user.is_onboarding_complete) {
        navigate('/provider/dashboard', { replace: true });
        return;
      }

      setProfileData(prev => ({
        ...prev,
        fullname: user.full_name || prev.fullname,
        email: user.email || prev.email,
        phone: user.phone_number || prev.phone,
        role: user.user_type === 'DiagnosticProvider' ? 'Diagnostic Provider' : (user.user_type || prev.role)
      }));
      if (user.profile_picture?.url) {
        setProfileImageUrl(user.profile_picture.url);
      }
    }

    // Fetch fresh provider profile data using the specific provider endpoint
    getProviderProfileMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data?.data) {
          const userData = data.data;

          // Check if onboarding is already complete based on fresh API data
          if (userData.is_onboarding_complete) {
            navigate('/provider/dashboard', { replace: true });
            return;
          }

          const initialData = {
            fullname: userData.provider?.provider_name || userData.provider_name || userData.full_name || '',
            email: userData.provider?.work_email || userData.work_email || userData.email || '',
            phone: userData.provider?.work_phone || userData.work_phone || userData.phone_number || '',
            role: userData.user_type === 'DiagnosticProvider' ? 'Diagnostic Provider' : (userData.user_type || '')
          };
          setProfileData(initialData);
          setOriginalProfileData(initialData);

          if (userData.profile_picture?.url) {
            setProfileImageUrl(userData.profile_picture.url);
          }

          // Prefill notification settings
          // Check provider-specific settings first, then fallback to user root settings
          const notifSettings = userData.provider?.notification_settings || userData.notification_settings;
          if (notifSettings) {
            setNotificationSettings({
              email: notifSettings.email ?? true,
              push: notifSettings.push ?? false,
              sms: notifSettings.sms ?? true
            });
          }

          // Prefill working hours
          const providerDetails = userData.provider || {};
          const workingHoursData = providerDetails.working_hours || userData.working_hours;

          if (workingHoursData && Array.isArray(workingHoursData)) {
            const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const newWorkingHours = daysOrder.map(day => {
              const found = workingHoursData.find((h: any) => h.day === day);
              if (found) {
                return {
                  enabled: found.isAvailable,
                  start: convertTo24Hour(found.startTime) || '09:00',
                  end: convertTo24Hour(found.endTime) || '17:00'
                };
              }
              return { enabled: true, start: '09:00', end: '17:00' };
            });
            setWorkingHours(newWorkingHours);
            setOriginalWorkingHours(newWorkingHours);
          }
        }
      }
    });
  }, []); // Run once on mount

  const convertTo24Hour = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(' ');
    if (parts.length === 1) return timeStr; // Assume already 24h if no AM/PM

    const [time, modifier] = parts;
    let [hours, minutes] = time.split(':');
    let h = parseInt(hours, 10);

    if (modifier === 'PM' && h < 12) {
      h += 12;
    }
    if (modifier === 'AM' && h === 12) {
      h = 0;
    }

    return `${h.toString().padStart(2, '0')}:${minutes}`;
  };

  const convertTo12Hour = (timeStr: string) => {
    if (!timeStr) return '';
    let [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const modifier = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    if (h > 12) h -= 12;
    return `${h.toString().padStart(2, '0')}:${minutes} ${modifier}`;
  };

  const isWorkingHoursDirty = JSON.stringify(workingHours) !== JSON.stringify(originalWorkingHours);
  const isProfileDirty = JSON.stringify(profileData) !== JSON.stringify(originalProfileData);

  const handleUpdateProfile = () => {
    // Basic validation
    const errs: any = {};
    if (!profileData.fullname.trim()) errs.fullname = 'Fullname is required';
    if (profileData.fullname.trim().length < 2) errs.fullname = 'Fullname must be at least 2 characters';

    if (!profileData.phone.trim()) errs.phone = 'Phone is required';
    else {
      const digits = profileData.phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) errs.phone = 'Phone must be 10-15 digits';
      else if (!/^[\d\s+\-()]+$/.test(profileData.phone.trim())) errs.phone = 'Invalid characters';
    }

    if (Object.keys(errs).length) {
      setProfileErrors(errs);
      return;
    }

    const payload = {
      fullname: profileData.fullname,
      // email: profileData.email, // Email is read-only
      phone: profileData.phone,
      // user_type: profileData.role // Role is read-only
    };

    updateProfileMutation.mutate(payload, {
      onSuccess: () => {
        setOriginalProfileData(profileData);
        // Move to next step
        setStep(s => Math.min(s + 1, tabCount - 1));
      }
    });
  };

  const handleSaveWorkingHours = () => {
    // Validation
    if (workingHours.some(wh => wh.enabled && wh.start >= wh.end)) {
      setWorkingError('Ensure start time is before end time for each enabled day');
      return;
    }
    setWorkingError('');

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const payload = workingHours.map((wh, idx) => ({
      day: daysOrder[idx],
      startTime: convertTo12Hour(wh.start),
      endTime: convertTo12Hour(wh.end),
      isAvailable: wh.enabled
    }));

    updateWorkingHoursMutation.mutate({ working_hours: payload }, {
      onSuccess: () => {
        setOriginalWorkingHours(workingHours);
      }
    });
  };

  const handleCancelWorkingHours = () => {
    setWorkingHours(originalWorkingHours);
    setWorkingError('');
  };

  const handleNotificationChange = (key: keyof typeof notificationSettings, value: boolean) => {
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);

    // Immediate API update
    updateNotificationSettingsMutation.mutate({
      notification_settings: newSettings
    }, {
      onError: () => {
        // Revert on error
        setNotificationSettings(prev => ({ ...prev, [key]: !value }));
        toast.error('Failed to update setting');
      }
    });
  };

  const handleFinish = () => {
    completeOnboardingMutation.mutate(undefined, {
      onSuccess: () => {
        setShowSuccessModal(true);
      }
    });
  };

  const [profileErrors, setProfileErrors] = useState<{ [key: string]: string }>({});
  // Login form data and errors
  const [loginData, setLoginData] = useState({ email: '', password: '', permission: '' });
  const [loginErrors, setLoginErrors] = useState<{ [key: string]: string }>({});
  // Working hours validation error
  const [workingError, setWorkingError] = useState('');

  // For progress bar calculation
  const tabCount = TABS.length;
  const progressPercent = ((step + 1) / tabCount) * 100;

  // Handlers for navigation and validation
  const handleNext = () => {
    if (step === 0) {
      const errs: any = {};
      if (!profileData.fullname.trim()) errs.fullname = 'Fullname is required';
      else if (profileData.fullname.trim().length < 2) errs.fullname = 'Fullname must be at least 2 characters';

      // Email is read-only, assume valid from API/Auth
      if (!profileData.email) errs.email = 'Email is missing';

      if (!profileData.phone.trim()) errs.phone = 'Phone is required';
      else {
        const digits = profileData.phone.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 15) errs.phone = 'Phone must be 10-15 digits';
        else if (!/^[\d\s+\-()]+$/.test(profileData.phone.trim())) errs.phone = 'Invalid characters';
      }

      if (Object.keys(errs).length) { setProfileErrors(errs); return; }
    }
    if (step === 1) {
      if (workingHours.some(wh => wh.enabled && wh.start >= wh.end)) {
        setWorkingError('Ensure start time is before end time for each enabled day');
        return;
      }
      setWorkingError('');
    }
    if (step === 2) {
      // Login and security step (read-only now, so no validation needed)
    }
    setStep(s => Math.min(s + 1, tabCount - 1));
  };
  const handleSkip = () => {
    setWorkingError('');
    setStep(s => Math.min(s + 1, tabCount - 1));
  };

  return (
    <div className='flex flex-col items-start mt-12 gap-6 max-w-[647px] min-h-full'>
      <div className='relative w-full'>
        <h1 className='text-[32px] leading-[44.3px] font-semibold'>Welcome to ResQ</h1>
        <p className='text-[16px] leading-[25.6px] font-normal text-gray-500'>
          We filled out some settings for you. Feel free to adjust them if <br /> needed! You can always revisit them later too.
        </p>
      </div>
      <div className="w-full flex flex-col items-start mt-8">
        <div className="w-full max-w-3xl relative">
          <div className="flex flex-row gap-8 items-center justify-start">
            {TABS.map((tab, idx) => {
              const isActive = idx <= step;
              return (
                <div key={tab.label} className="flex flex-col items-center cursor-pointer" onClick={() => setStep(idx)}>
                  <div className={`flex items-center text-nowrap gap-2 ${isActive ? 'text-[#06202E] font-semibold' : 'text-gray-400 font-normal'}`}>
                    <span>
                      <img
                        src={tab.icon}
                        alt={tab.label}
                        className="w-5 h-5 object-contain"
                        style={isActive ? { filter: 'none' } : { filter: 'grayscale(1) brightness(1.5)' }}
                      />
                    </span>
                    {tab.label}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Progressive bar 15px below the tab text */}
          <div className="absolute left-0 right-0" style={{ top: 'calc(100% + 15px)' }}>
            <div className="w-full h-0.5 bg-gray-200 relative">
              <div
                className="absolute h-0.5 bg-[#06202E] transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  left: 0,
                  top: 0,
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="w-[600px] min-h-[480px]">
        {step === 0 && (
          <div className="flex flex-row w-full max-w-[600px] gap-8 items-start">
            <div className="flex-1 flex flex-col bg-white py-6 px-6 rounded min-w-[340px] items-start text-left">
              <h2 className="text-[#06202E] mb-6" style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 500, fontSize: '16px', lineHeight: '25.6px', letterSpacing: '0%' }}>Administrative details</h2>
              <form className="flex flex-col gap-6 w-full">
                <div className="flex flex-col gap-2">
                  <label className="text-[#5C6A7A]" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '14px', lineHeight: '22.4px' }}>Fullname</label>
                  <input
                    type="text"
                    value={profileData.fullname}
                    onChange={e => {
                      setProfileData({ ...profileData, fullname: e.target.value });
                      if (profileErrors.fullname) setProfileErrors({ ...profileErrors, fullname: '' });
                    }}
                    placeholder="Eunice Chisom"
                    className={`w-full border ${profileErrors.fullname ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 text-[#06202E] focus:outline-none focus:ring-2 focus:ring-[#06202E]`}
                    style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '16px',
                      lineHeight: '25.6px',
                    }}
                  />
                  {profileErrors.fullname && <p className="text-red-500 text-sm">{profileErrors.fullname}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#5C6A7A]" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '14px', lineHeight: '22.4px' }}>Primary email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    readOnly
                    className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 text-[#5C6A7A] focus:outline-none cursor-not-allowed"
                    style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '16px',
                      lineHeight: '25.6px',
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#5C6A7A]" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '14px', lineHeight: '22.4px' }}>Phone</label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={e => {
                      const val = e.target.value;
                      // Allow digits, spaces, plus, minus, and parentheses
                      if (/^[\d\s+\-()]*$/.test(val)) {
                        setProfileData({ ...profileData, phone: val });
                        if (profileErrors.phone) setProfileErrors({ ...profileErrors, phone: '' });
                      }
                    }}
                    placeholder="09180653262"
                    className={`w-full border ${profileErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 text-[#06202E] focus:outline-none focus:ring-2 focus:ring-[#06202E]`}
                    style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '16px',
                      lineHeight: '25.6px',
                    }}
                  />
                  {profileErrors.phone && <p className="text-red-500 text-sm">{profileErrors.phone}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#5C6A7A]" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '14px', lineHeight: '22.4px' }}>Role</label>
                  <input
                    type="text"
                    value={profileData.role}
                    disabled
                    readOnly
                    className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 text-[#5C6A7A] focus:outline-none cursor-not-allowed"
                    style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '16px',
                      lineHeight: '25.6px',
                    }}
                  />
                </div>
              </form>
              <div className="flex flex-row justify-between mt-8 w-full">
                {isProfileDirty ? (
                  <button
                    type="button"
                    className="bg-[#06202E] text-white w-[186px] h-[40px] px-8 rounded-lg font-medium disabled:opacity-70 disabled:cursor-wait"
                    disabled={updateProfileMutation.isPending}
                    onClick={handleUpdateProfile}
                  >
                    {updateProfileMutation.isPending ? 'Updating...' : 'Update'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="bg-[#06202E] text-white w-[186px] h-[40px] px-8 rounded-lg font-medium"
                    style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 400,
                      fontSize: '16px',
                      lineHeight: '25.6px',
                    }}
                    onClick={handleNext}
                  >Next</button>
                )}

                <button
                  type="button"
                  className="bg-gray-100 text-[#5C6A7A] w-[64px] h-[40px] flex items-center justify-center rounded-lg font-medium"
                  style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: '25.6px',
                  }}
                  onClick={handleSkip}
                >Skip</button>
              </div>
            </div>
            <div className="flex flex-col items-center justify-start pt-8 min-w-[120px]">
              <ProfileAvatarUpload initialImage={profileImageUrl} onUploaded={handleNext} />
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="flex flex-col w-[600px] bg-white py-6 px-6 rounded items-center justify-center min-h-[300px]">
            <h2 className="text-lg font-semibold mb-1 self-start">Manage working hours</h2>
            <p className="text-gray-500 text-sm mb-4 self-start">What days and hours do you work? This determines your booking availability.</p>
            <form className="w-full flex flex-col gap-0">
              {workingError && <p className="text-red-500 mb-2">{workingError}</p>}
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx, arr) => (
                <React.Fragment key={day}>
                  <WorkingHourRow
                    day={day}
                    idx={idx}
                    value={workingHours[idx]}
                    onChange={val => {
                      const updated = [...workingHours];
                      updated[idx] = val;
                      setWorkingHours(updated);
                    }}
                    showApplyToAll={idx === 0}
                    onApplyToAll={idx === 0 ? () => {
                      const mon = workingHours[0];
                      setWorkingHours(workingHours.map((wh, i) => i === 0 ? wh : { ...wh, enabled: mon.enabled, start: mon.start, end: mon.end }));
                      setApplied(true);
                      setTimeout(() => setApplied(false), 1500);
                    } : undefined}
                    applied={applied && idx === 0}
                  />
                  {idx < arr.length - 1 && (
                    <div className="w-[520px] mx-auto">
                      <hr className="border-t border-gray-200 my-2" />
                    </div>
                  )}
                </React.Fragment>
              ))}
              <div className="flex flex-row justify-between mt-8">
                {isWorkingHoursDirty ? (
                  <>
                    <button
                      onClick={handleSaveWorkingHours}
                      type="button"
                      disabled={updateWorkingHoursMutation.isPending}
                      className="bg-[#06202E] text-white w-[186px] h-[40px] px-8 rounded-lg font-medium disabled:opacity-70 disabled:cursor-wait"
                    >
                      {updateWorkingHoursMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelWorkingHours}
                      type="button"
                      disabled={updateWorkingHoursMutation.isPending}
                      className="bg-red-50 text-red-600 border border-red-200 w-[100px] h-[40px] flex items-center justify-center rounded-lg font-medium hover:bg-red-100"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleNext} type="button" className="bg-[#06202E] text-white w-[186px] h-[40px] px-8 rounded-lg font-medium">Next</button>
                    <button onClick={handleSkip} type="button" className="bg-gray-100 text-[#5C6A7A] w-[64px] h-[40px] flex items-center justify-center rounded-lg font-medium">Skip</button>
                  </>
                )}
              </div>
            </form>
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col w-[600px] bg-white py-8 px-8 rounded items-start justify-start min-h-[300px]">
            <h2 className="mb-6 text-[#16202E]" style={{
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 600,
              fontSize: '24px',
              lineHeight: '32px',
            }}>Login and security</h2>

            <div className="w-full flex flex-col gap-6">
              <div className="flex flex-col gap-2 w-full">
                <label className="text-[#5C6A7A]" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '14px', lineHeight: '22.4px' }}>Email</label>
                <div className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 text-[#5C6A7A]">
                  {loginData.email || profileData.email}
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <label className="text-[#5C6A7A]" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '14px', lineHeight: '22.4px' }}>Permission level</label>
                <div className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 text-[#5C6A7A]">
                  {profileData.role || 'Diagnostic Provider'}
                </div>
              </div>
            </div>

            <div className="flex flex-row justify-between mt-10 w-full">
              <button
                type="button"
                className="bg-[#06202E] text-white w-[186px] h-[40px] px-8 rounded-lg font-medium"
                style={{
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '25.6px',
                }}
                onClick={handleNext}
              >
                Next
              </button>
              <button
                type="button"
                className="bg-gray-100 text-[#5C6A7A] w-[64px] h-[40px] flex items-center justify-center rounded-lg font-medium"
                style={{
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '25.6px',
                }}
                onClick={handleSkip}
              >
                Skip
              </button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col w-[600px] bg-white py-8 px-8 rounded items-start justify-start min-h-[300px]">
            <h2 className="mb-2 text-[#16202E]" style={{
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 600,
              fontSize: '24px',
              lineHeight: '32px',
            }}>Manage your account</h2>
            <p className="text-gray-500 mb-8" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '14px' }}>
              Configure your notification preferences and account settings.
            </p>

            <div className="w-full flex flex-col gap-6">
              <NotificationRow
                icon={<MdOutlineEmail size={24} />}
                title="Email Notifications"
                description="Get updates sent directly to your email"
                checked={notificationSettings.email}
                onChange={(val) => handleNotificationChange('email', val)}
              />
              <hr className="border-t border-gray-100" />
              <NotificationRow
                icon={<MdOutlineNotificationsNone size={24} />}
                title="Push Notifications"
                description="Instant alerts on your device for real-time updates."
                checked={notificationSettings.push}
                onChange={(val) => handleNotificationChange('push', val)}
              />
              <hr className="border-t border-gray-100" />
              <NotificationRow
                icon={<MdOutlineSms size={24} />}
                title="SMS Notifications"
                description="Get updates delivered straight to your phone."
                checked={notificationSettings.sms}
                onChange={(val) => handleNotificationChange('sms', val)}
              />
            </div>

            <div className="flex flex-row justify-between mt-10 w-full">
              <button
                type="button"
                className="bg-[#06202E] text-white w-[186px] h-[40px] px-8 rounded-lg font-medium disabled:opacity-70 disabled:cursor-wait"
                style={{
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '25.6px',
                }}
                onClick={handleFinish}
                disabled={completeOnboardingMutation.isPending}
              >
                {completeOnboardingMutation.isPending ? 'Finishing...' : 'Finish'}
              </button>
              <button
                type="button"
                className="bg-gray-100 text-[#5C6A7A] w-[64px] h-[40px] flex items-center justify-center rounded-lg font-medium"
                style={{
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '25.6px',
                }}
              >Skip</button>
            </div>
          </div>
        )}
      </div>
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate('/provider/dashboard'); // Redirect to provider dashboard
        }}
      />
    </div>
  );
};

type WorkingHour = {
  enabled: boolean;
  start: string;
  end: string;
};

type WorkingHourRowProps = {
  day: string;
  idx: number;
  value: WorkingHour;
  onChange: (val: WorkingHour) => void;
  showApplyToAll?: boolean;
  onApplyToAll?: () => void;
  applied?: boolean;
};

function WorkingHourRow({ day, idx, value, onChange, showApplyToAll, onApplyToAll, applied }: WorkingHourRowProps) {
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div className="flex items-center justify-between py-2 w-full">
      <div className="flex items-center w-[160px] gap-3">
        <button
          type="button"
          className="focus:outline-none"
          onClick={() => onChange({ ...value, enabled: !value.enabled })}
          aria-label={value.enabled ? `Disable ${day}` : `Enable ${day}`}
        >
          <img
            src={value.enabled ? '/icons/Form Control active.png' : '/icons/Form Control reactive.png'}
            alt={value.enabled ? 'Active toggle' : 'Inactive toggle'}
            className="w-6 h-6 object-contain"
          />
        </button>
        <span
          className={value.enabled ? 'text-[#06202E]' : 'text-gray-400'}
          style={{
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: 500,
            fontSize: '16px',
            lineHeight: '25.6px',
            letterSpacing: '0%',
            verticalAlign: 'middle',
          }}
        >{day}</span>
      </div>
      <div className="flex items-center flex-1 justify-end gap-4">
        {value.enabled ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={value.start}
                onChange={e => onChange({ ...value, start: e.target.value })}
                className="border border-gray-300 rounded-lg px-2 py-2 w-[130px] text-[#06202E] bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#06202E] appearance-none cursor-pointer"
                style={{
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '22.4px',
                  letterSpacing: '0%',
                  verticalAlign: 'middle',
                }}
              >
                {TIME_OPTIONS.map(opt => (
                  <option key={`start-${opt.value}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {/* Custom arrow if needed, but standard select is robust */}
            </div>
            <span className="text-[#06202E] text-xl">—</span>
            <div className="relative">
              <select
                value={value.end}
                onChange={e => onChange({ ...value, end: e.target.value })}
                className="border border-gray-300 rounded-lg px-2 py-2 w-[130px] text-[#06202E] bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#06202E] appearance-none cursor-pointer"
                style={{
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '22.4px',
                  letterSpacing: '0%',
                  verticalAlign: 'middle',
                }}
              >
                {TIME_OPTIONS.map(opt => (
                  <option key={`end-${opt.value}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-[24px] flex justify-center">
              {showApplyToAll && (
                <div className="relative flex flex-col items-center">
                  <button
                    type="button"
                    title="Apply to all"
                    onClick={() => {
                      if (onApplyToAll) onApplyToAll();
                      setShowTooltip(true);
                      setTimeout(() => setShowTooltip(false), 1500);
                    }}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <MdOutlineContentCopy size={20} className="text-[#06202E]" />
                  </button>
                  {(showTooltip || applied) && (
                    <p className="absolute top-[120%] right-0 bg-[#16202E] text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 shadow-lg">
                      {applied ? 'Applied!' : 'Apply to all'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end w-full pr-[30px]">
            <span className="text-gray-400 bg-gray-100 rounded px-4 py-1 text-sm w-[120px] text-center">Day off</span>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({ icon, title, description, checked, onChange }: {
  icon: React.ReactNode,
  title: string,
  description: string,
  checked: boolean,
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between w-full mb-2">
      <div className="flex items-center gap-4">
        <span className="text-[#16202E]">{icon}</span>
        <div>
          <div
            style={{
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 600,
              fontSize: '16px',
              lineHeight: '25.6px',
              letterSpacing: 0,
            }}
            className="text-[#16202E]"
          >
            {title}
          </div>
          <div className="text-gray-400 text-base">{description}</div>
        </div>
      </div>
      <button
        type="button"
        aria-label={checked ? `Disable ${title}` : `Enable ${title}`}
        onClick={() => onChange(!checked)}
        className="ml-4 focus:outline-none"
      >
        <span className={`inline-block w-12 h-7 rounded-full transition-colors duration-200 ${checked ? 'bg-[#16202E]' : 'bg-gray-200'}`}
          style={{ position: 'relative' }}
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}
            style={{ display: 'inline-block' }}
          />
        </span>
      </button>
    </div>
  );
}

function ProfileAvatarUpload({ onUploaded, initialImage }: { onUploaded?: () => void, initialImage?: string | null }) {
  const [image, setImage] = React.useState<string | null>(initialImage || null);

  React.useEffect(() => {
    if (initialImage) {
      setImage(initialImage);
    }
  }, [initialImage]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadProviderProfilePicture();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload the file
      uploadMutation.mutate(file, {
        onSuccess: () => {
          if (onUploaded) onUploaded();
        }
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-start mt-2">
      {image ? (
        <img
          src={image}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover mb-4 border border-gray-300"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-[#5C6A7A] flex items-center justify-center text-white text-3xl font-semibold mb-4">EC</div>
      )}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        className={`flex items-center gap-2 bg-gray-100 text-[#5C6A7A] px-6 h-[40px] rounded-full font-medium text-base mt-2 ${uploadMutation.isPending ? 'opacity-70 cursor-wait' : ''}`}
        onClick={handleButtonClick}
        disabled={uploadMutation.isPending}
      >
        {uploadMutation.isPending ? (
          'Uploading...'
        ) : (
          <>
            <img src="/icons/upload.png" alt="Upload" className="w-5 h-5" />
            Upload
          </>
        )}
      </button>
    </div>
  );
}

export default WelcomeProviderPage;