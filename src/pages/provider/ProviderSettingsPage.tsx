import React, { useMemo, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<SettingsTab>('Provider details');

  // Basic form state (UI-only for now)
  const [providerName, setProviderName] = useState('');
  const [about, setAbout] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');

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
  const [teamMembers] = useState<TeamMember[]>(TEAM_MEMBERS_MOCK);
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
      postalCode,
    ];
    const filled = fields.filter((f) => f.trim().length > 0).length;
    const pct = Math.min(100, Math.round((filled / fields.length) * 100));
    return pct;
  }, [providerName, about, primaryEmail, primaryPhone, address, city, stateVal, postalCode]);

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

  return (
    <div className="space-y-6">
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
        </div>

        <button
          type="button"
          className="bg-[#06202E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors"
        >
          Save
        </button>
      </div>

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
              <div className="w-full bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center min-h-[120px]">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FaCloudUploadAlt className="text-gray-500" />
                  Upload banner image
                </button>
              </div>

              {/* Logo upload row */}
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full border border-gray-200 bg-gray-50" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#16202E]">Provider logo</p>
                  <p className="text-xs text-gray-500 mb-2">Select a 200 × 200 px image, up to 10 MB in size</p>
                  <button
                    type="button"
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
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">About</label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Tell your users about your services"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm min-h-[90px] resize-none focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
            </div>

            {/* Gallery */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[#16202E]">Gallery</h4>
              <div className="w-full bg-white border border-gray-200 rounded-xl p-6 min-h-[180px] flex flex-col items-center justify-center text-center">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FaCloudUploadAlt className="text-gray-500" />
                  Upload Media
                </button>
                <p className="text-xs text-gray-500 mt-4">
                  Up to 10 MB size per image. Max 10 photos per upload
                </p>
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
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Primary phone</label>
                <input
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
              <button type="button" className="text-sm text-gray-500 hover:text-[#16202E] inline-flex items-center gap-2">
                <FaPlus size={12} />
                Add more
              </button>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[#16202E]">Location</h4>
              <p className="text-xs text-gray-500">Provide an address to list on your Booking Page.</p>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Address</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">State</label>
                  <div className="relative">
                    <select
                      value={stateVal}
                      onChange={(e) => setStateVal(e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                    >
                      <option value="">Select</option>
                      <option value="Lagos">Lagos</option>
                      <option value="Abuja">Abuja</option>
                      <option value="Rivers">Rivers</option>
                    </select>
                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Zip or Postal code</label>
                  <input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                  />
                </div>
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
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Instagram</label>
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Facebook</label>
                <input
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>
              <button type="button" className="text-sm text-gray-500 hover:text-[#16202E] inline-flex items-center gap-2">
                <FaPlus size={12} />
                Add more
              </button>
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
              <p className="text-sm font-medium text-[#16202E] mb-3">Need help with your booking page?</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                Connect with us
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <img
                src="/booking%20user.png"
                alt="Booking page help"
                className="h-14 w-auto mx-auto mb-4 select-none"
                draggable={false}
              />
              <p className="text-sm font-medium text-[#16202E] mb-4">Need help with your booking page?</p>
              <button
                type="button"
                className="w-full bg-[#06202E] text-white py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors"
              >
                Chat with us
              </button>
              <button
                type="button"
                className="w-full mt-3 bg-white border border-gray-200 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Call +2347072779831
              </button>
              <button
                type="button"
                className="w-full mt-3 bg-white border border-gray-200 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Book with an expert
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


