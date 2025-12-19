import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiChevronDown,
  FiSearch,
  FiMail,
  FiPhone,
  FiClock,
  FiUser,
  FiShield,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import { FaCloudUploadAlt, FaPlus, FaTrash } from 'react-icons/fa';
import {
  useCountries,
  useProviderProfileQuery,
  useStates,
  useUpdateProviderAddress,
  useUpdateProviderNotificationSettings,
  useUpdateProviderWorkingHours,
  useUpdateProviderFullProfile,
} from '../../services/providerService';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

type SettingsTab =
  | 'Provider details'
  | 'Booking page'
  | 'Team access'
  | 'Security'
  | 'Activity';

const TABS: SettingsTab[] = [
  'Provider details',
  'Booking page',
  'Team access',
  'Security',
  'Activity',
];

type BusinessHour = { day: string; enabled: boolean; start: string; end: string };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const generateTimeOptions = () => {
  const times: Array<{ value: string; label: string }> = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 || 12;
      const mm = m.toString().padStart(2, '0');
      times.push({
        value: `${h.toString().padStart(2, '0')}:${mm}`,
        label: `${displayH}:${mm} ${ampm}`,
      });
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

type PermissionLevel = 'No access' | 'Standard' | 'Admin';

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  permission: PermissionLevel;
  locationLabel: string; // e.g. Lagos state
  timeLabel: string; // e.g. 9:49 AM
  isYou?: boolean;
  isOnline?: boolean;
  todayWorkingHoursLabel?: string; // e.g. Today 9:00 AM - 5:00 PM
};

type TeamSubTab = 'Profile' | 'Working hours' | 'Login and security' | 'Manage your account';

const PERMISSION_OPTIONS: Array<{ value: PermissionLevel; title: string; description: string }> = [
  {
    value: 'No access',
    title: 'No access',
    description: 'Unable to log in, calendar managed by enhanced permission holders.',
  },
  {
    value: 'Standard',
    title: 'Standard',
    description: 'Able to view and manage their own calendar.',
  },
  {
    value: 'Admin',
    title: 'Admin',
    description: 'Enhanced permission plus the ability to manage all account settings.',
  },
];

const TEAM_MEMBERS_MOCK: TeamMember[] = [
  {
    id: 'tm_1',
    name: 'Eunice Chisom',
    email: 'eunicechisom@mail.com',
    phone: '08063338445',
    permission: 'Admin',
    locationLabel: 'Lagos state',
    timeLabel: '9:49 AM',
    isYou: true,
    isOnline: true,
    todayWorkingHoursLabel: 'Today 9:00 AM - 5:00 PM',
  },
  {
    id: 'tm_2',
    name: 'Samuel Inengite',
    email: 'samuelinengite@mail.com',
    phone: '09181735313',
    permission: 'Standard',
    locationLabel: 'Lagos state',
    timeLabel: '9:49 AM',
    isOnline: false,
    todayWorkingHoursLabel: 'Today 9:00 AM - 5:00 PM',
  },
];

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

function PermissionDropdown({
  value,
  onChange,
}: {
  value: PermissionLevel;
  onChange: (v: PermissionLevel) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full min-w-[220px] flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 text-sm bg-white hover:bg-gray-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-gray-700">{value}</span>
        <FiChevronDown className="text-gray-500" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[360px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[120]"
          role="listbox"
          onMouseLeave={() => setOpen(false)}
        >
          {PERMISSION_OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-5 py-4 hover:bg-gray-50 ${active ? 'bg-gray-50' : ''}`}
              >
                <div className="text-sm font-medium text-[#16202E]">{opt.title}</div>
                <div className="text-xs text-gray-500 mt-1">{opt.description}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type InviteRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  permission: PermissionLevel;
};

function AddTeamMembersModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<InviteRow[]>([
    {
      id: 'row_1',
      fullName: 'Samuel Inengite',
      email: 'samuelinengite@gmail.com',
      phone: '09181735313',
      permission: 'No access',
    },
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="w-full max-w-[980px] bg-white rounded-xl shadow-2xl overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-6">
          <h3 className="text-lg font-semibold text-[#16202E]">Add team members</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="px-8 pb-8">
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_360px] gap-4 items-start">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Full name</label>
                <input
                  value={r.fullName}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x) => (x.id === r.id ? { ...x, fullName: e.target.value } : x))
                    )
                  }
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Email address</label>
                <input
                  value={r.email}
                  onChange={(e) =>
                    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, email: e.target.value } : x)))
                  }
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Phone number</label>
                <input
                  value={r.phone}
                  onChange={(e) =>
                    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, phone: e.target.value } : x)))
                  }
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Permission level</label>
                <PermissionDropdown
                  value={r.permission}
                  onChange={(val) =>
                    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, permission: val } : x)))
                  }
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                { id: `row_${Date.now()}`, fullName: '', email: '', phone: '', permission: 'No access' },
              ])
            }
            className="mt-4 text-sm text-[#2563EB] hover:underline inline-flex items-center gap-2"
          >
            <span className="text-xl leading-none">+</span> Add more
          </button>

          <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
            <span className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center">i</span>
            <span>Team members will be emailed an invitation with a temporary password</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const ProviderSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('Provider details');

  // Basic form state (UI-only for now)
  const [providerName, setProviderName] = useState('');
  const [about, setAbout] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [countryVal, setCountryVal] = useState('Nigeria');
  const [postalCode, setPostalCode] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');

  // Notification preferences
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [initialNotificationSettings, setInitialNotificationSettings] = useState<{
    email: boolean;
    push: boolean;
    sms: boolean;
  } | null>(null);

  // Accreditations
  type AccreditationItem = {
    id: string;
    name: string;
    issuer: string;
    year: string;
    certificate_url: string;
  };
  const [accreditations, setAccreditations] = useState<AccreditationItem[]>([]);
  const [initialAccreditationsKey, setInitialAccreditationsKey] = useState<string>('[]');

  // Media (prefill only; upload handling not implemented yet)
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('');
  const [logoImageUrl, setLogoImageUrl] = useState<string>('');
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>([]);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  // Validation errors (inline)
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Booking page settings (UI-only for now)
  const [schedulingWindowValue, setSchedulingWindowValue] = useState('0');
  const [schedulingWindowUnit, setSchedulingWindowUnit] = useState<'days' | 'weeks' | 'months'>('months');
  const [cancellationPolicy, setCancellationPolicy] = useState<'24 Hours' | '48 Hours' | '72 Hours'>('24 Hours');
  const [timeFormat, setTimeFormat] = useState<'12 hours' | '24 hours'>('12 hours');
  const [weekStartsOn, setWeekStartsOn] = useState<
    'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
  >('Monday');
  const [bookingPolicies, setBookingPolicies] = useState('');

  // Team access (UI-only for now)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(TEAM_MEMBERS_MOCK);
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(teamMembers[0]?.id ?? '');
  const [teamSubTab, setTeamSubTab] = useState<TeamSubTab>('Profile');
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [selectedMemberPermission, setSelectedMemberPermission] = useState<PermissionLevel>(
    teamMembers[0]?.permission ?? 'Admin'
  );

  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(
    DAYS.map((d) => ({
      day: d,
      enabled: d !== 'Sunday',
      start: '09:00',
      end: '17:00',
    }))
  );
  const [initialBusinessHours, setInitialBusinessHours] = useState<BusinessHour[] | null>(null);

  const providerProfileQuery = useProviderProfileQuery();
  const updateFullProfileMutation = useUpdateProviderFullProfile();
  const updateAddressMutation = useUpdateProviderAddress();
  const updateNotificationSettingsMutation = useUpdateProviderNotificationSettings();
  const updateWorkingHoursMutation = useUpdateProviderWorkingHours();

  const countriesQuery = useCountries();
  const statesQuery = useStates({ country: countryVal || 'Nigeria' });

  const [initialFields, setInitialFields] = useState<{
    providerName: string;
    about: string;
    primaryEmail: string;
    primaryPhone: string;
    address: string;
    city: string;
    stateVal: string;
    countryVal: string;
    postalCode: string;
    website: string;
    instagram: string;
    facebook: string;
    twitter: string;
    bannerImageUrl: string;
    logoImageUrl: string;
  } | null>(null);

  const isInitialPrefillLoading = providerProfileQuery.isLoading && !initialFields;

  const convertTo24Hour = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = String(timeStr).trim().split(' ');
    if (parts.length === 1) return parts[0]; // assume already 24h

    const [time, modifierRaw] = parts;
    const modifier = modifierRaw.toUpperCase();
    const [hhStr, mmStr] = time.split(':');
    let h = parseInt(hhStr, 10);
    const m = parseInt(mmStr || '0', 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return '';

    if (modifier === 'PM' && h < 12) h += 12;
    if (modifier === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const to12HourLabel = (value: string) => {
    const [hhStr, mmStr] = value.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return value;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const displayH = hh % 12 || 12;
    return `${displayH}:${mm.toString().padStart(2, '0')} ${ampm}`;
  };

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const normalizePhoneDigits = (phone: string) => phone.replace(/\D/g, '');

  const isValidPhone = (phone: string) => {
    const digits = normalizePhoneDigits(phone);
    return digits.length >= 10 && digits.length <= 15;
  };

  const isValidUrl = (url: string) => {
    const v = url.trim();
    if (!v) return true; // optional
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validateBusinessHours = (): Record<string, string> => {
    const next: Record<string, string> = {};
    businessHours.forEach((bh) => {
      if (!bh.enabled) return;
      if (!bh.start || !bh.end) {
        next[`businessHours.${bh.day}`] = 'Start and end time are required';
        return;
      }
      if (bh.start >= bh.end) {
        next[`businessHours.${bh.day}`] = 'Start time must be before end time';
      }
    });
    return next;
  };

  const validateProviderDetails = (): Record<string, string> => {
    const next: Record<string, string> = {};

    // Provider name
    if (providerName.trim().length > 0 && providerName.trim().length < 2) {
      next.providerName = 'Provider name must be at least 2 characters';
    }

    // About
    if (about.trim().length > 0 && about.trim().length < 10) {
      next.about = 'About must be at least 10 characters';
    }

    // Email / Phone (optional but must be valid if provided)
    if (primaryEmail.trim() && !isValidEmail(primaryEmail)) {
      next.primaryEmail = 'Enter a valid email address';
    }
    if (primaryPhone.trim() && !isValidPhone(primaryPhone)) {
      next.primaryPhone = 'Phone must be 10–15 digits';
    }

    // Address fields:
    // - If the user starts filling location, require the core fields (street/city/state/country)
    // - Otherwise keep them optional, but validate basic sanity for any filled field.
    const anyLocationFilled =
      address.trim().length > 0 ||
      city.trim().length > 0 ||
      stateVal.trim().length > 0 ||
      countryVal.trim().length > 0 ||
      postalCode.trim().length > 0;

    if (anyLocationFilled) {
      if (address.trim().length < 3) next.address = 'Street address is required';
      if (city.trim().length < 2) next.city = 'City is required';
      if (!stateVal.trim()) next.stateVal = 'State is required';
      if (!countryVal.trim()) next.countryVal = 'Country is required';
    } else {
      if (address.trim().length > 0 && address.trim().length < 3) next.address = 'Address is too short';
      if (city.trim().length > 0 && city.trim().length < 2) next.city = 'City is too short';
      if (stateVal.trim().length > 0 && stateVal.trim().length < 2) next.stateVal = 'State is too short';
      if (countryVal.trim().length > 0 && countryVal.trim().length < 2) next.countryVal = 'Country is too short';
    }

    if (postalCode.trim().length > 0 && postalCode.trim().length < 3) next.postalCode = 'Postal code is too short';

    // Social links
    if (!isValidUrl(website)) next.website = 'Enter a valid URL (must start with http:// or https://)';
    if (!isValidUrl(instagram)) next.instagram = 'Enter a valid URL (must start with http:// or https://)';
    if (!isValidUrl(facebook)) next.facebook = 'Enter a valid URL (must start with http:// or https://)';
    if (!isValidUrl(twitter)) next.twitter = 'Enter a valid URL (must start with http:// or https://)';

    // Business hours
    Object.assign(next, validateBusinessHours());

    // Files
    const maxSize = 10 * 1024 * 1024;
    const validateImage = (file: File | null, key: string) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) next[key] = 'File must be an image';
      else if (file.size > maxSize) next[key] = 'Image must be 10MB or less';
    };
    validateImage(bannerImageFile, 'bannerImageFile');
    validateImage(logoFile, 'logoFile');
    if (galleryFiles.length > 10) next.galleryFiles = 'Gallery supports up to 10 images';
    galleryFiles.forEach((f, idx) => {
      if (!f.type.startsWith('image/')) next[`galleryFiles.${idx}`] = 'File must be an image';
      else if (f.size > maxSize) next[`galleryFiles.${idx}`] = 'Image must be 10MB or less';
    });

    return next;
  };

  useEffect(() => {
    if (!providerProfileQuery.data) return;
    if (initialFields) return; // already initialized

    const res: any = providerProfileQuery.data;
    const userData = res?.data || {};
    const provider = userData.provider || {};

    setProviderName(provider.provider_name || '');
    setAbout(provider.about || '');
    setPrimaryEmail(provider.work_email || userData.email || '');
    setPrimaryPhone(provider.work_phone || userData.phone_number || '');

    const addr = provider.address || {};
    setAddress(addr.street || '');
    setCity(addr.city || '');
    setStateVal(addr.state || '');
    setCountryVal(addr.country || 'Nigeria');
    setPostalCode(addr.postal_code || '');

    const social = provider.social_links || {};
    setWebsite(social.website || '');
    setInstagram(social.instagram || '');
    setFacebook(social.facebook || '');
    setTwitter(social.twitter || '');

    // Prefill notification settings
    const ns =
      provider.notification_settings ??
      provider.notificationSettings ??
      userData.notification_settings ??
      userData.notificationSettings ??
      null;
    const email = !!(ns?.email ?? true);
    const push = !!(ns?.push ?? true);
    const sms = !!(ns?.sms ?? true);
    setNotifyEmail(email);
    setNotifyPush(push);
    setNotifySms(sms);
    setInitialNotificationSettings({ email, push, sms });

    // Prefill accreditations if backend provides it (optional)
    const accRaw =
      provider.accreditations ??
      provider.accreditation ??
      provider.certifications ??
      provider.certification ??
      [];
    if (Array.isArray(accRaw)) {
      const mapped = accRaw.map((a: any, idx: number) => ({
        id: String(a?.id || a?._id || `acc_${idx}`),
        name: String(a?.name || a?.title || ''),
        issuer: String(a?.issuing_body || a?.issuer || a?.body || a?.organization || ''),
        year: String(a?.year ?? a?.issued_year ?? ''),
        certificate_url: String(a?.certificate_url || a?.url || a?.certificate || ''),
      }));
      setAccreditations(mapped);
      // store normalized key for change detection
      setInitialAccreditationsKey(
        JSON.stringify(
          mapped.map((x) => ({
            name: x.name.trim(),
            issuing_body: x.issuer.trim(),
            year: x.year ? Number(String(x.year).replace(/[^\d]/g, '')) || undefined : undefined,
          }))
        )
      );
    } else {
      setAccreditations([]);
      setInitialAccreditationsKey('[]');
    }

    setBannerImageUrl(provider.banner_image_url || '');
    setLogoImageUrl(provider.logo_image_url || '');
    setGalleryImageUrls(Array.isArray(provider.gallery_image_urls) ? provider.gallery_image_urls : []);

    setInitialFields({
      providerName: provider.provider_name || '',
      about: provider.about || '',
      primaryEmail: provider.work_email || userData.email || '',
      primaryPhone: provider.work_phone || userData.phone_number || '',
      address: addr.street || '',
      city: addr.city || '',
      stateVal: addr.state || '',
      countryVal: addr.country || 'Nigeria',
      postalCode: addr.postal_code || '',
      website: social.website || '',
      instagram: social.instagram || '',
      facebook: social.facebook || '',
      twitter: social.twitter || '',
      bannerImageUrl: provider.banner_image_url || '',
      logoImageUrl: provider.logo_image_url || '',
    });

    // Prefill business hours (working_hours)
    const wh = Array.isArray(provider.working_hours) ? provider.working_hours : [];
    if (wh.length) {
      const mapped = DAYS.map((d) => {
        const found = wh.find((x: any) => String(x.day) === d);
        return {
          day: d,
          enabled: found ? !!found.isAvailable : d !== 'Sunday',
          start: found ? (convertTo24Hour(found.startTime) || '09:00') : '09:00',
          end: found ? (convertTo24Hour(found.endTime) || '17:00') : '17:00',
        };
      });
      setBusinessHours(mapped);
      setInitialBusinessHours(mapped);
    } else {
      setInitialBusinessHours((prev) => prev ?? businessHours);
    }

    // Note: Team access currently uses mock data in this UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerProfileQuery.data, initialFields]);

  const bannerPreviewUrl = useMemo(() => {
    if (bannerImageFile) return URL.createObjectURL(bannerImageFile);
    return bannerImageUrl;
  }, [bannerImageFile, bannerImageUrl]);

  const logoPreviewUrl = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    return logoImageUrl;
  }, [logoFile, logoImageUrl]);

  const galleryPreviewUrls = useMemo(() => {
    const selected = galleryFiles.map((f) => URL.createObjectURL(f));
    const merged = [...selected, ...galleryImageUrls];
    return merged.slice(0, 10);
  }, [galleryFiles, galleryImageUrls]);

  useEffect(() => {
    // cleanup object URLs
    return () => {
      if (bannerImageFile) URL.revokeObjectURL(bannerPreviewUrl);
      if (logoFile) URL.revokeObjectURL(logoPreviewUrl);
      galleryFiles.forEach((f) => URL.revokeObjectURL(URL.createObjectURL(f)));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completion = useMemo(() => {
    // lightweight heuristic for the progress label UI
    const fields = [
      providerName,
      about,
      primaryEmail,
      primaryPhone,
      address,
      city,
      stateVal,
      countryVal,
      postalCode,
    ];
    const filled = fields.filter((f) => f.trim().length > 0).length;
    const pct = Math.min(100, Math.round((filled / fields.length) * 100));
    return pct;
  }, [providerName, about, primaryEmail, primaryPhone, address, city, stateVal, countryVal, postalCode]);

  const hasDirtyTextFields = useMemo(() => {
    if (!initialFields) return true; // allow save if we couldn't prefill
    return (
      providerName !== initialFields.providerName ||
      about !== initialFields.about ||
      primaryEmail !== initialFields.primaryEmail ||
      primaryPhone !== initialFields.primaryPhone ||
      address !== initialFields.address ||
      city !== initialFields.city ||
      stateVal !== initialFields.stateVal ||
      countryVal !== initialFields.countryVal ||
      postalCode !== initialFields.postalCode ||
      website !== initialFields.website ||
      instagram !== initialFields.instagram ||
      facebook !== initialFields.facebook ||
      twitter !== initialFields.twitter
    );
  }, [
    about,
    address,
    city,
    facebook,
    initialFields,
    instagram,
    postalCode,
    primaryEmail,
    primaryPhone,
    providerName,
    stateVal,
    countryVal,
    twitter,
    website,
  ]);

  const hasDirtyFiles = !!bannerImageFile || !!logoFile || galleryFiles.length > 0;

  const businessHoursChanged = useMemo(() => {
    if (!initialBusinessHours) return false;
    if (initialBusinessHours.length !== businessHours.length) return true;
    return businessHours.some((bh, idx) => {
      const init = initialBusinessHours[idx];
      return (
        bh.day !== init.day ||
        bh.enabled !== init.enabled ||
        bh.start !== init.start ||
        bh.end !== init.end
      );
    });
  }, [businessHours, initialBusinessHours]);

  const notificationSettingsChanged = useMemo(() => {
    if (!initialNotificationSettings) return false;
    return (
      notifyEmail !== initialNotificationSettings.email ||
      notifyPush !== initialNotificationSettings.push ||
      notifySms !== initialNotificationSettings.sms
    );
  }, [initialNotificationSettings, notifyEmail, notifyPush, notifySms]);

  const accreditationsChanged = useMemo(() => {
    const key = JSON.stringify(
      accreditations
        .filter((a) => a.name.trim() || a.issuer.trim() || a.year.trim())
        .map((a) => ({
          name: a.name.trim(),
          issuing_body: a.issuer.trim(),
          year: a.year ? Number(String(a.year).replace(/[^\d]/g, '')) || undefined : undefined,
        }))
    );
    return key !== initialAccreditationsKey;
  }, [accreditations, initialAccreditationsKey]);

  const canSaveByCompletion = completion >= 50;
  const hasAnyChanges =
    hasDirtyTextFields ||
    hasDirtyFiles ||
    businessHoursChanged ||
    notificationSettingsChanged ||
    accreditationsChanged;
  const isSaving =
    updateFullProfileMutation.isPending ||
    updateAddressMutation.isPending ||
    updateNotificationSettingsMutation.isPending ||
    updateWorkingHoursMutation.isPending;

  const handleSaveProviderProfile = () => {
    if (!canSaveByCompletion) {
      toast.error('Please complete at least 50% of your profile before saving.');
      return;
    }

    const validationErrors = validateProviderDetails();
    if (Object.keys(validationErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...validationErrors }));
      toast.error('Please fix the highlighted fields before saving.');
      return;
    }

    // Only send fields that changed relative to initial prefill (prevents accidental clearing).
    const payload: any = {};
    const addressChanged =
      !initialFields ||
      address !== initialFields.address ||
      city !== initialFields.city ||
      stateVal !== initialFields.stateVal ||
      countryVal !== initialFields.countryVal ||
      postalCode !== initialFields.postalCode;

    if (!initialFields || providerName !== initialFields.providerName) payload.provider_name = providerName;
    if (!initialFields || about !== initialFields.about) payload.about = about;
    if (!initialFields || primaryEmail !== initialFields.primaryEmail) payload.work_email = primaryEmail;
    if (!initialFields || primaryPhone !== initialFields.primaryPhone) payload.work_phone = primaryPhone;
    if (!initialFields || website !== initialFields.website) payload.website = website;
    if (!initialFields || instagram !== initialFields.instagram) payload.instagram = instagram;
    if (!initialFields || facebook !== initialFields.facebook) payload.facebook = facebook;
    if (!initialFields || twitter !== initialFields.twitter) payload.twitter = twitter;

    if (bannerImageFile) payload.banner_image = bannerImageFile;
    if (logoFile) payload.logo = logoFile;
    if (galleryFiles.length) payload.gallery = galleryFiles.slice(0, 10);

    if (
      !Object.keys(payload).length &&
      !addressChanged &&
      !businessHoursChanged &&
      !notificationSettingsChanged &&
      !accreditationsChanged
    ) {
      toast('No changes to save');
      return;
    }

    if (addressChanged) {
      updateAddressMutation.mutate(
        {
          street: address,
          city,
          state: stateVal,
          country: countryVal || 'Nigeria',
          postal_code: postalCode,
        },
        {
          onSuccess: (resp) => {
            const addr = resp?.data?.address;
            if (addr) {
              setAddress(addr.street || address);
              setCity(addr.city || city);
              setStateVal(addr.state || stateVal);
              setCountryVal(addr.country || countryVal);
              setPostalCode(addr.postal_code || postalCode);
            }

            setInitialFields((prev) =>
              prev
                ? {
                  ...prev,
                  address: addr?.street ?? address,
                  city: addr?.city ?? city,
                  stateVal: addr?.state ?? stateVal,
                  countryVal: addr?.country ?? countryVal,
                  postalCode: addr?.postal_code ?? postalCode,
                }
                : prev
            );
          },
        }
      );
    }

    if (businessHoursChanged) {
      updateWorkingHoursMutation.mutate(
        {
          working_hours: businessHours.map((bh) => ({
            day: bh.day,
            isAvailable: bh.enabled,
            startTime: to12HourLabel(bh.start),
            endTime: to12HourLabel(bh.end),
          })),
        },
        {
          onSuccess: () => {
            setInitialBusinessHours(businessHours);
          },
        }
      );
    }

    if (notificationSettingsChanged) {
      updateNotificationSettingsMutation.mutate(
        {
          notification_settings: {
            email: notifyEmail,
            push: notifyPush,
            sms: notifySms,
          },
        },
        {
          onSuccess: () => {
            setInitialNotificationSettings({ email: notifyEmail, push: notifyPush, sms: notifySms });
          },
        }
      );
    }

    // Accreditations are saved via full profile update
    if (accreditationsChanged) {
      const accPayload = accreditations
        .filter((a) => a.name.trim() || a.issuer.trim() || a.year.trim())
        .map((a) => ({
          name: a.name.trim(),
          issuing_body: a.issuer.trim(),
          year: a.year ? Number(String(a.year).replace(/[^\d]/g, '')) || undefined : undefined,
        }));
      payload.accreditations = JSON.stringify(accPayload);
    }

    if (!Object.keys(payload).length) return;

    updateFullProfileMutation.mutate(payload, {
      onSuccess: (res) => {
        const userData = res?.data || {};
        const provider = userData.provider || {};
        const addr = provider.address || {};
        const social = provider.social_links || {};

        setProviderName(provider.provider_name || providerName);
        setAbout(provider.about || about);
        setPrimaryEmail(provider.work_email || primaryEmail);
        setPrimaryPhone(provider.work_phone || primaryPhone);
        // address is saved via the dedicated endpoint, but keep in sync if backend returns it here too
        setAddress(addr.street || address);
        setCity(addr.city || city);
        setStateVal(addr.state || stateVal);
        setCountryVal(addr.country || countryVal);
        setPostalCode(addr.postal_code || postalCode);
        setWebsite(social.website ?? website);
        setInstagram(social.instagram ?? instagram);
        setFacebook(social.facebook ?? facebook);
        setTwitter(social.twitter ?? twitter);

        // Sync accreditations from response
        const nextAcc = Array.isArray(provider.accreditations) ? provider.accreditations : [];
        const mappedAcc = nextAcc.map((a: any, idx: number) => ({
          id: String(a?.id || a?._id || `acc_${idx}`),
          name: String(a?.name || ''),
          issuer: String(a?.issuing_body || a?.issuer || ''),
          year: String(a?.year ?? ''),
          certificate_url: String(a?.certificate_url || ''),
        }));
        setAccreditations(mappedAcc);
        setInitialAccreditationsKey(
          JSON.stringify(
            mappedAcc.map((x: { name: string; issuer: string; year: string }) => ({
              name: x.name.trim(),
              issuing_body: x.issuer.trim(),
              year: x.year ? Number(String(x.year).replace(/[^\d]/g, '')) || undefined : undefined,
            }))
          )
        );

        setBannerImageUrl(provider.banner_image_url || bannerImageUrl);
        setLogoImageUrl(provider.logo_image_url || logoImageUrl);
        setGalleryImageUrls(Array.isArray(provider.gallery_image_urls) ? provider.gallery_image_urls : galleryImageUrls);

        setBannerImageFile(null);
        setLogoFile(null);
        setGalleryFiles([]);

        setInitialFields({
          providerName: provider.provider_name || providerName,
          about: provider.about || about,
          primaryEmail: provider.work_email || primaryEmail,
          primaryPhone: provider.work_phone || primaryPhone,
          address: addr.street || address,
          city: addr.city || city,
          stateVal: addr.state || stateVal,
          countryVal: addr.country || countryVal,
          postalCode: addr.postal_code || postalCode,
          website: social.website ?? website,
          instagram: social.instagram ?? instagram,
          facebook: social.facebook ?? facebook,
          twitter: social.twitter ?? twitter,
          bannerImageUrl: provider.banner_image_url || bannerImageUrl,
          logoImageUrl: provider.logo_image_url || logoImageUrl,
        });
      },
    });
  };

  const formatTimeLabel = (value: string) => {
    const [hhStr, mmStr] = value.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return value;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const displayH = hh % 12 || 12;
    return `${displayH}:${mm.toString().padStart(2, '0')} ${ampm}`;
  };

  const filteredTeamMembers = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [teamMembers, teamSearch]);

  const selectedMember = useMemo(() => {
    const found = teamMembers.find((m) => m.id === selectedMemberId) ?? teamMembers[0];
    return found;
  }, [teamMembers, selectedMemberId]);

  if (isInitialPrefillLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner fullScreen={false} size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {isSaving && (
        <div className="absolute inset-0 z-[200] bg-white/60 backdrop-blur-[1px] flex items-start justify-center pt-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
            <LoadingSpinner fullScreen={false} size="sm" />
            Saving…
          </div>
        </div>
      )}
      {/* Top row: Settings + progress + Save */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-[#16202E]">Settings</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{completion}% complete</span>
            <span className="w-4 h-4 rounded-full border border-gray-300 relative">
              <span
                className="absolute inset-0 rounded-full border-2 border-[#06202E]"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0, ${completion >= 25 ? '100% 0' : `${50 + completion * 2}% 0`
                    }, 50% 50%)`,
                }}
              />
            </span>
          </div>
          {hasAnyChanges && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              Unsaved changes
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveProviderProfile}
          disabled={isSaving || !canSaveByCompletion}
          className="bg-[#06202E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {!canSaveByCompletion && (
        <div className="-mt-2 text-sm text-gray-500">
          You can save once your profile is at least <span className="font-semibold text-[#16202E]">50%</span> complete.
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6 overflow-x-auto">
          {TABS.map((t) => {
            const active = t === activeTab;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={`pb-3 text-sm font-medium whitespace-nowrap ${active ? 'text-[#16202E] border-b-2 border-[#16202E]' : 'text-gray-500'
                  }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content (Provider details tab like screenshot) */}
      {activeTab === 'Provider details' && (
        <div className="grid grid-cols-1 xl:grid-cols-[640px_1fr] gap-8">
          {/* Left column */}
          <div className="space-y-8">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#16202E]">Provider details</h3>

              {/* Banner upload */}
              <div className="w-full bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center min-h-[120px] overflow-hidden">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="provider-settings-banner-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const maxSize = 10 * 1024 * 1024;
                    if (!file.type.startsWith('image/')) {
                      toast.error('Banner must be an image file');
                      return;
                    }
                    if (file.size > maxSize) {
                      toast.error('Banner image must be 10MB or less');
                      return;
                    }
                    setBannerImageFile(file);
                    clearError('bannerImageFile');
                  }}
                />
                {bannerPreviewUrl ? (
                  <img src={bannerPreviewUrl} alt="Banner" className="w-full h-[140px] object-cover rounded-lg" />
                ) : (
                  <button
                    type="button"
                    onClick={() => document.getElementById('provider-settings-banner-input')?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FaCloudUploadAlt className="text-gray-500" />
                    Upload banner image
                  </button>
                )}
              </div>

              {/* Logo upload row */}
              <div className="flex items-center gap-6">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="provider-settings-logo-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const maxSize = 10 * 1024 * 1024;
                    if (!file.type.startsWith('image/')) {
                      toast.error('Logo must be an image file');
                      return;
                    }
                    if (file.size > maxSize) {
                      toast.error('Logo image must be 10MB or less');
                      return;
                    }
                    setLogoFile(file);
                    clearError('logoFile');
                  }}
                />
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="Logo" className="w-16 h-16 rounded-full border border-gray-200 object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full border border-gray-200 bg-gray-50" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#16202E]">Provider logo</p>
                  <p className="text-xs text-gray-500 mb-2">Select a 200 × 200 px image, up to 10 MB in size</p>
                  <button
                    type="button"
                    onClick={() => document.getElementById('provider-settings-logo-input')?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FaCloudUploadAlt className="text-gray-500" />
                    Upload logo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">Provider name</label>
                <input
                  value={providerName}
                  onChange={(e) => {
                    setProviderName(e.target.value);
                    clearError('providerName');
                  }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.providerName ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.providerName && <p className="text-xs text-red-600 mt-1">{errors.providerName}</p>}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">About</label>
                <textarea
                  value={about}
                  onChange={(e) => {
                    setAbout(e.target.value);
                    clearError('about');
                  }}
                  placeholder="Tell your users about your services"
                  className={`w-full border rounded-lg px-4 py-3 text-sm min-h-[90px] resize-none focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.about ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.about && <p className="text-xs text-red-600 mt-1">{errors.about}</p>}
              </div>
            </div>

            {/* Gallery */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[#16202E]">Gallery</h4>
              <div className="w-full bg-white border border-gray-200 rounded-xl p-6 min-h-[180px]">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="provider-settings-gallery-input"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const maxSize = 10 * 1024 * 1024;
                    const valid = files.filter((f) => {
                      if (!f.type.startsWith('image/')) return false;
                      if (f.size > maxSize) return false;
                      return true;
                    });
                    if (valid.length !== files.length) {
                      toast.error('Gallery files must be images and 10MB or less each');
                    }
                    setGalleryFiles((prev) => [...prev, ...valid].slice(0, 10));
                    clearError('galleryFiles');
                  }}
                />
                {galleryPreviewUrls.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {galleryPreviewUrls.slice(0, 6).map((url, idx) => (
                      <img
                        key={`${url}-${idx}`}
                        src={url}
                        alt={`Gallery ${idx + 1}`}
                        className="w-full h-24 rounded-lg object-cover border border-gray-100"
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => document.getElementById('provider-settings-gallery-input')?.click()}
                      className="w-full h-24 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-50"
                    >
                      + Add
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center min-h-[140px]">
                    <button
                      type="button"
                      onClick={() => document.getElementById('provider-settings-gallery-input')?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FaCloudUploadAlt className="text-gray-500" />
                      Upload Media
                    </button>
                    <p className="text-xs text-gray-500 mt-4">
                      Up to 10 MB size per image. Max 10 photos per upload
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[#16202E]">Contact details</h4>
              <p className="text-xs text-gray-500">Let your users know how to reach you.</p>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Primary email</label>
                <input
                  value={primaryEmail}
                  onChange={(e) => {
                    setPrimaryEmail(e.target.value);
                    clearError('primaryEmail');
                  }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.primaryEmail ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.primaryEmail && <p className="text-xs text-red-600 mt-1">{errors.primaryEmail}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Primary phone</label>
                <input
                  value={primaryPhone}
                  onChange={(e) => {
                    setPrimaryPhone(e.target.value);
                    clearError('primaryPhone');
                  }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.primaryPhone ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.primaryPhone && <p className="text-xs text-red-600 mt-1">{errors.primaryPhone}</p>}
              </div>
            </div>

            {/* Notification preferences */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[#16202E]">Notification preferences</h4>
              <p className="text-xs text-gray-500">Choose how you want to receive updates.</p>

              <div className="space-y-3">
                {[
                  {
                    key: 'email',
                    label: 'Email notifications',
                    desc: 'Receive notifications via email.',
                    value: notifyEmail,
                    onChange: setNotifyEmail,
                  },
                  {
                    key: 'push',
                    label: 'Push notifications',
                    desc: 'Receive push notifications on your device.',
                    value: notifyPush,
                    onChange: setNotifyPush,
                  },
                  {
                    key: 'sms',
                    label: 'SMS notifications',
                    desc: 'Receive notifications via text message.',
                    value: notifySms,
                    onChange: setNotifySms,
                  },
                ].map((n) => (
                  <div
                    key={n.key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#16202E]">{n.label}</div>
                      <div className="text-xs text-gray-500">{n.desc}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={n.value}
                      onClick={() => n.onChange(!n.value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 ${n.value ? 'bg-[#06202E]' : 'bg-gray-300'
                        }`}
                      aria-label={n.value ? `Disable ${n.label}` : `Enable ${n.label}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${n.value ? 'translate-x-5' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Accreditations */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[#16202E]">Accreditations</h4>
              <p className="text-xs text-gray-500">
                Add your lab/diagnostic accreditations and certifications (shown on your provider profile).
              </p>

              <div className="space-y-3">
                {accreditations.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4">
                    No accreditations added yet.
                  </div>
                ) : (
                  accreditations.map((a) => (
                    <div key={a.id} className="border border-gray-100 rounded-xl p-4 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">Accreditation name</label>
                          <input
                            value={a.name}
                            onChange={(e) =>
                              setAccreditations((prev) =>
                                prev.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x))
                              )
                            }
                            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                            placeholder="e.g. ISO 15189"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">Issuing body</label>
                          <input
                            value={a.issuer}
                            onChange={(e) =>
                              setAccreditations((prev) =>
                                prev.map((x) => (x.id === a.id ? { ...x, issuer: e.target.value } : x))
                              )
                            }
                            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                            placeholder="e.g. Medical Laboratory Council of Nigeria"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">Year (optional)</label>
                          <input
                            value={a.year}
                            onChange={(e) =>
                              setAccreditations((prev) =>
                                prev.map((x) => (x.id === a.id ? { ...x, year: e.target.value } : x))
                              )
                            }
                            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                            placeholder="e.g. 2024"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-2">Certificate link (optional)</label>
                          <input
                            value={a.certificate_url}
                            onChange={(e) =>
                              setAccreditations((prev) =>
                                prev.map((x) => (x.id === a.id ? { ...x, certificate_url: e.target.value } : x))
                              )
                            }
                            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div className="flex justify-end mt-4">
                        <button
                          type="button"
                          onClick={() => setAccreditations((prev) => prev.filter((x) => x.id !== a.id))}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <button
                  type="button"
                  onClick={() =>
                    setAccreditations((prev) => [
                      ...prev,
                      { id: `acc_${Date.now()}`, name: '', issuer: '', year: '', certificate_url: '' },
                    ])
                  }
                  className="text-sm text-[#2563EB] hover:underline inline-flex items-center gap-2"
                >
                  <span className="text-xl leading-none">+</span> Add accreditation
                </button>

                <div className="text-xs text-gray-500">
                  Accreditations are saved when you click <span className="font-semibold text-[#16202E]">Save</span>.
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[#16202E]">Location</h4>
              <p className="text-xs text-gray-500">Provide an address to list on your Booking Page.</p>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Address</label>
                <input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    clearError('address');
                  }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.address ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">City</label>
                <input
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    clearError('city');
                  }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.city ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Country</label>
                  <div className="relative">
                    <select
                      value={countryVal}
                      onChange={(e) => {
                        setCountryVal(e.target.value);
                        // changing country should reset state selection
                        setStateVal('');
                        clearError('countryVal');
                        clearError('stateVal');
                      }}
                      className={`w-full appearance-none border rounded-lg px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.countryVal ? 'border-red-500' : 'border-gray-200'}`}
                    >
                      {countriesQuery.isLoading ? (
                        <option value="Nigeria">Loading…</option>
                      ) : (
                        <>
                          <option value="">Select</option>
                          {(countriesQuery.data?.data || [{ name: 'Nigeria', code: 'NG' }]).map((c) => (
                            <option key={c.code} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                  {errors.countryVal && <p className="text-xs text-red-600 mt-1">{errors.countryVal}</p>}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-2">State</label>
                  <div className="relative">
                    <select
                      value={stateVal}
                      onChange={(e) => {
                        setStateVal(e.target.value);
                        clearError('stateVal');
                      }}
                      disabled={!countryVal || statesQuery.isLoading}
                      className={`w-full appearance-none border rounded-lg px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 disabled:bg-gray-50 disabled:text-gray-400 ${errors.stateVal ? 'border-red-500' : 'border-gray-200'}`}
                    >
                      <option value="">
                        {!countryVal ? 'Select country first' : statesQuery.isLoading ? 'Loading…' : 'Select'}
                      </option>
                      {(statesQuery.data?.data || []).map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                  {errors.stateVal && <p className="text-xs text-red-600 mt-1">{errors.stateVal}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Zip or Postal code</label>
                  <input
                    value={postalCode}
                    onChange={(e) => {
                      setPostalCode(e.target.value);
                      clearError('postalCode');
                    }}
                    className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.postalCode ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.postalCode && <p className="text-xs text-red-600 mt-1">{errors.postalCode}</p>}
                </div>
                <div className="hidden sm:block" />
              </div>
            </div>

            {/* Business hours */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[#16202E]">Business hours</h4>
              <p className="text-xs text-gray-500">
                Highlight when your business opens and closes on your Booking Page.
              </p>

              <div className="space-y-3">
                {businessHours.map((bh, idx) => (
                  <div key={`errwrap-${bh.day}`} className="space-y-1">
                    <div
                      key={bh.day}
                      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors ${bh.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                        }`}
                    >
                      {/* Day + toggle */}
                      <div className="flex items-center gap-3 min-w-[190px]">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={bh.enabled}
                          onClick={() =>
                            setBusinessHours((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, enabled: !x.enabled } : x))
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 ${bh.enabled ? 'bg-[#06202E]' : 'bg-gray-300'
                            }`}
                          aria-label={bh.enabled ? `Disable ${bh.day}` : `Enable ${bh.day}`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${bh.enabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                          />
                        </button>

                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#16202E]">{bh.day}</span>
                          {!bh.enabled && <span className="text-xs text-gray-500">Closed</span>}
                        </div>
                      </div>

                      {/* Times */}
                      {bh.enabled ? (
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <select
                              value={bh.start}
                              onChange={(e) =>
                                setBusinessHours((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, start: e.target.value } : x))
                                )
                              }
                              className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                            >
                              {TIME_OPTIONS.map((t) => (
                                <option key={`s-${bh.day}-${t.value}`} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          </div>

                          <span className="text-gray-300">—</span>

                          <div className="relative">
                            <select
                              value={bh.end}
                              onChange={(e) =>
                                setBusinessHours((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, end: e.target.value } : x))
                                )
                              }
                              className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                            >
                              {TIME_OPTIONS.map((t) => (
                                <option key={`e-${bh.day}-${t.value}`} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-md px-3 py-2">
                            Closed
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTimeLabel(bh.start)} — {formatTimeLabel(bh.end)}
                          </span>
                        </div>
                      )}
                    </div>
                    {errors[`businessHours.${bh.day}`] && (
                      <p className="text-xs text-red-600">{errors[`businessHours.${bh.day}`]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[#16202E]">Your links</h4>
              <p className="text-xs text-gray-500">Drive Booking Page users to your site, socials and more.</p>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Website</label>
                <input
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    clearError('website');
                  }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.website ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.website && <p className="text-xs text-red-600 mt-1">{errors.website}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Instagram</label>
                <input
                  value={instagram}
                  onChange={(e) => {
                    setInstagram(e.target.value);
                    clearError('instagram');
                  }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.instagram ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.instagram && <p className="text-xs text-red-600 mt-1">{errors.instagram}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Facebook</label>
                <input
                  value={facebook}
                  onChange={(e) => {
                    setFacebook(e.target.value);
                    clearError('facebook');
                  }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.facebook ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.facebook && <p className="text-xs text-red-600 mt-1">{errors.facebook}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Twitter</label>
                <input
                  value={twitter}
                  onChange={(e) => {
                    setTwitter(e.target.value);
                    clearError('twitter');
                  }}
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 ${errors.twitter ? 'border-red-500' : 'border-gray-200'}`}
                />
                {errors.twitter && <p className="text-xs text-red-600 mt-1">{errors.twitter}</p>}
              </div>
            </div>

            {/* Bottom save (same behavior as top) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveProviderProfile}
                disabled={isSaving || !canSaveByCompletion}
                className="w-full bg-[#06202E] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
              {!canSaveByCompletion && (
                <p className="text-xs text-gray-500 mt-2">
                  Complete at least <span className="font-semibold text-[#16202E]">50%</span> of your profile to save.
                </p>
              )}
            </div>
          </div>

          {/* Right column - help card */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100 min-h-[200px] flex flex-col items-center justify-center">
              <img
                src="/booking%20user.png"
                alt="Booking page help"
                className="h-14 w-auto mb-4 select-none"
                draggable={false}
              />
              <p className="text-sm font-medium text-[#16202E] mb-3">Need help setting up your provider profile?</p>
              <button
                type="button"
                onClick={() => navigate('/provider/support')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                Contact support
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <img
                src="/booking%20user.png"
                alt="Booking page help"
                className="h-14 w-auto mx-auto mb-4 select-none"
                draggable={false}
              />
              <p className="text-sm font-medium text-[#16202E] mb-4">Need help with your provider account settings?</p>
              <button
                type="button"
                onClick={() => navigate('/provider/support')}
                className="w-full bg-[#06202E] text-white py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors"
              >
                Chat with support
              </button>
              <button
                type="button"
                onClick={() => navigate('/provider/support')}
                className="w-full mt-3 bg-white border border-gray-200 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Call +2347072779831
              </button>
              <button
                type="button"
                onClick={() => navigate('/provider/support')}
                className="w-full mt-3 bg-white border border-gray-200 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Schedule a setup call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking page tab */}
      {activeTab === 'Booking page' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10">
          <div className="max-w-[900px]">
            <h3 className="text-lg font-semibold text-[#16202E] mb-1">Booking Page</h3>
            <p className="text-sm text-gray-500 mb-8">
              Personalize how people schedule appointments with you.
            </p>

            <div className="space-y-6">
              {/* Scheduling Window */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6">
                <div>
                  <p className="text-sm font-semibold text-[#16202E] mb-1">Scheduling Window</p>
                  <p className="text-sm text-gray-500">
                    How far in advance can customers schedule an appointment?
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    value={schedulingWindowValue}
                    onChange={(e) => setSchedulingWindowValue(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                    className="w-16 text-center border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                  />
                  <div className="relative">
                    <select
                      value={schedulingWindowUnit}
                      onChange={(e) => setSchedulingWindowUnit(e.target.value as any)}
                      className="appearance-none border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                    >
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                    </select>
                    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Cancellation Policy */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6">
                <div>
                  <p className="text-sm font-semibold text-[#16202E] mb-1">Cancellation Policy</p>
                  <p className="text-sm text-gray-500">
                    How soon before an appointment can customers reschedule or cancel?
                  </p>
                </div>
                <div className="relative">
                  <select
                    value={cancellationPolicy}
                    onChange={(e) => setCancellationPolicy(e.target.value as any)}
                    className="appearance-none border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 min-w-[180px]"
                  >
                    <option value="24 Hours">24 Hours</option>
                    <option value="48 Hours">48 Hours</option>
                    <option value="72 Hours">72 Hours</option>
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              {/* Time Format */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6">
                <div>
                  <p className="text-sm font-semibold text-[#16202E] mb-1">Time Format</p>
                  <p className="text-sm text-gray-500">
                    Display time in 12-hour AM/PM or 24-hour format.
                  </p>
                </div>
                <div className="relative">
                  <select
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value as any)}
                    className="appearance-none border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 min-w-[180px]"
                  >
                    <option value="12 hours">12 hours</option>
                    <option value="24 hours">24 hours</option>
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              {/* Week starts on */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6">
                <div>
                  <p className="text-sm font-semibold text-[#16202E] mb-1">Week starts on</p>
                  <p className="text-sm text-gray-500">
                    Set the first day of the week as seen on your Booking Page.
                  </p>
                </div>
                <div className="relative">
                  <select
                    value={weekStartsOn}
                    onChange={(e) => setWeekStartsOn(e.target.value as any)}
                    className="appearance-none border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 min-w-[180px]"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              {/* Booking Policies */}
              <div className="pt-4">
                <p className="text-sm font-semibold text-[#16202E] mb-1">Booking Policies</p>
                <p className="text-sm text-gray-500 mb-4">
                  Share need-to-know details — about amending bookings, refunds and more — before customers confirm their bookings.
                </p>
                <textarea
                  value={bookingPolicies}
                  onChange={(e) => setBookingPolicies(e.target.value)}
                  placeholder="Type your policy or share a link"
                  className="w-full max-w-[560px] border border-gray-200 rounded-lg px-4 py-3 text-sm min-h-[130px] resize-none focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team access tab */}
      {activeTab === 'Team access' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr]">
            {/* Left: team list */}
            <div className="border-r border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#16202E]">Your Team</h3>
                  <button
                    type="button"
                    onClick={() => setAddTeamOpen(true)}
                    className="w-10 h-10 rounded-full bg-[#0B1F2A] text-white flex items-center justify-center hover:bg-[#06202E]"
                    aria-label="Add team member"
                  >
                    <FaPlus size={14} />
                  </button>
                </div>

                <div className="mt-5 relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder="Search here..."
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                  />
                </div>

                <div className="mt-4 space-y-1">
                  {filteredTeamMembers.map((m) => {
                    const active = m.id === selectedMemberId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setTeamSubTab('Profile');
                          setSelectedMemberPermission(m.permission);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg ${active ? 'bg-gray-50' : 'hover:bg-gray-50/60'
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-[#16202E]">
                              {initials(m.name)}
                            </div>
                            {m.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[#16202E] truncate">{m.name}</p>
                              {m.isYou && <span className="text-xs text-gray-400">You</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: member details */}
            <div className="p-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl font-semibold text-[#16202E]">
                  {selectedMember ? initials(selectedMember.name).slice(0, 1) : 'U'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#16202E]">{selectedMember?.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedMemberPermission} <span className="mx-2">·</span> {selectedMember?.locationLabel}{' '}
                    <span className="mx-2">·</span> {selectedMember?.timeLabel}
                  </p>
                </div>
              </div>

              <div className="mt-8 border-b border-gray-200">
                <div className="flex gap-8 overflow-x-auto">
                  {(['Profile', 'Working hours', 'Login and security', 'Manage your account'] as TeamSubTab[]).map(
                    (t) => {
                      const active = t === teamSubTab;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTeamSubTab(t)}
                          className={`pb-3 text-sm font-medium whitespace-nowrap ${active ? 'text-[#16202E] border-b-2 border-[#16202E]' : 'text-gray-400'
                            }`}
                        >
                          {t}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Subtab content */}
              {teamSubTab === 'Profile' && (
                <div className="mt-8 space-y-4 max-w-[520px]">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <FiPhone className="text-gray-500" />
                    <span>{selectedMember?.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <FiMail className="text-gray-500" />
                    <span>{selectedMember?.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <FiClock className="text-gray-500" />
                    <span>{selectedMember?.todayWorkingHoursLabel}</span>
                    <FiChevronDown className="text-gray-400" />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <FiUser className="text-gray-500" />
                    <PermissionDropdown value={selectedMemberPermission} onChange={setSelectedMemberPermission} />
                  </div>
                </div>
              )}

              {teamSubTab === 'Working hours' && (
                <div className="mt-8 max-w-[560px]">
                  <div className="space-y-3">
                    {businessHours.map((bh, idx) => (
                      <div
                        key={bh.day}
                        className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors ${bh.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-[190px]">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={bh.enabled}
                            onClick={() =>
                              setBusinessHours((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, enabled: !x.enabled } : x))
                              )
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#06202E]/20 ${bh.enabled ? 'bg-[#06202E]' : 'bg-gray-300'
                              }`}
                            aria-label={bh.enabled ? `Disable ${bh.day}` : `Enable ${bh.day}`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${bh.enabled ? 'translate-x-5' : 'translate-x-1'
                                }`}
                            />
                          </button>
                          <span className="text-sm font-medium text-[#16202E]">{bh.day}</span>
                        </div>

                        {bh.enabled ? (
                          <div className="flex items-center gap-3">
                            <select
                              value={bh.start}
                              onChange={(e) =>
                                setBusinessHours((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, start: e.target.value } : x))
                                )
                              }
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                            >
                              {TIME_OPTIONS.map((t) => (
                                <option key={`tw_s_${bh.day}_${t.value}`} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-gray-300">—</span>
                            <select
                              value={bh.end}
                              onChange={(e) =>
                                setBusinessHours((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, end: e.target.value } : x))
                                )
                              }
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                            >
                              {TIME_OPTIONS.map((t) => (
                                <option key={`tw_e_${bh.day}_${t.value}`} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-md px-3 py-2">
                            Closed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamSubTab === 'Login and security' && (
                <div className="mt-8 max-w-[560px]">
                  <h4 className="text-base font-semibold text-[#16202E] mb-6">Login and security</h4>
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    <div className="py-5 flex items-center justify-between">
                      <span className="text-sm text-gray-700">Email</span>
                      <span className="text-sm text-gray-500">{selectedMember?.email}</span>
                    </div>
                    <div className="py-5 flex items-center justify-between">
                      <span className="text-sm text-gray-700">Password</span>
                      <button type="button" className="text-sm text-[#2563EB] hover:underline">
                        Send reset link
                      </button>
                    </div>
                    <div className="py-5 flex items-center justify-between">
                      <span className="text-sm text-gray-700">Permission level</span>
                      <span className="text-sm text-gray-500">{selectedMemberPermission}</span>
                    </div>
                  </div>
                </div>
              )}

              {teamSubTab === 'Manage your account' && (
                <div className="mt-8 max-w-[560px]">
                  <h4 className="text-base font-semibold text-[#16202E] mb-4">Manage your account</h4>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#16202E]">Delete your account</p>
                    <p className="text-sm text-gray-500">All your account data will be deleted permanently</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 bg-[#06202E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a2e42]"
                    >
                      <FaTrash size={14} />
                      Delete account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <AddTeamMembersModal isOpen={addTeamOpen} onClose={() => setAddTeamOpen(false)} />
        </div>
      )}

      {/* Security tab */}
      {activeTab === 'Security' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10">
          <div className="max-w-[900px]">
            <h3 className="text-lg font-semibold text-[#16202E] mb-1">Security</h3>
            <p className="text-sm text-gray-500 mb-8">Manage login and security settings for your account.</p>

            <div className="divide-y divide-gray-100 border-t border-gray-100">
              <div className="py-5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <FiMail className="text-gray-500" />
                  Email
                </div>
                <span className="text-sm text-gray-500">{primaryEmail || '—'}</span>
              </div>
              <div className="py-5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <FiShield className="text-gray-500" />
                  Password
                </div>
                <button type="button" className="text-sm text-[#2563EB] hover:underline">
                  Send reset link
                </button>
              </div>
              <div className="py-5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <FiSettings className="text-gray-500" />
                  Two-factor authentication
                </div>
                <span className="text-sm text-gray-500">Coming soon</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity tab */}
      {activeTab === 'Activity' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10">
          <div className="max-w-[900px]">
            <h3 className="text-lg font-semibold text-[#16202E] mb-1">Activity</h3>
            <p className="text-sm text-gray-500 mb-8">Recent changes and account activity will appear here.</p>

            <div className="border border-gray-100 rounded-xl p-8 text-center text-gray-500">
              No activity to display
            </div>
          </div>
        </div>
      )}

      {/* Other tabs: placeholder content area (keeps layout consistent for now) */}
      {activeTab !== 'Provider details' &&
        activeTab !== 'Booking page' &&
        activeTab !== 'Team access' &&
        activeTab !== 'Security' &&
        activeTab !== 'Activity' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-xl font-semibold text-[#16202E] mb-2">{activeTab}</h3>
            <p className="text-gray-500">This section will be implemented next.</p>
          </div>
        )}
    </div>
  );
};

export default ProviderSettingsPage;


