import React, { useState } from 'react';
import { MdOutlineContentCopy, MdOutlineRemoveRedEye, MdOutlineEmail, MdOutlineNotificationsNone, MdOutlineSms } from "react-icons/md";
import { HiEyeSlash } from "react-icons/hi2";

const TABS = [
  { label: 'Profile', icon: '/icons/profile.png' },
  { label: 'Working hours', icon: '/icons/working hrs.png' },
  { label: 'Login and security', icon: '/icons/login and security.png' },
  { label: 'Manage your account', icon: '/icons/tool.png' },
];

const WelcomeProviderPage = () => {
  const [step, setStep] = useState(0);
  // Profile form data and errors
  const [profileData, setProfileData] = useState({ fullname: '', email: '', phone: '', role: '' });
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) errs.email = 'Valid email required';
      if (!profileData.phone.trim()) errs.phone = 'Phone is required';
      if (!profileData.role.trim()) errs.role = 'Role is required';
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
      const errs: any = {};
      if (!loginData.email.trim()) errs.email = 'Email is required';
      if (!loginData.password.trim()) errs.password = 'Password is required';
      if (!loginData.permission.trim()) errs.permission = 'Permission is required';
      if (Object.keys(errs).length) { setLoginErrors(errs); return; }
    }
    setStep(s => Math.min(s + 1, tabCount - 1));
  };
  const handleSkip = () => {
    setWorkingError('');
    setStep(s => Math.min(s + 1, tabCount - 1));
  };

  const [workingHours, setWorkingHours] = useState([
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
    { enabled: true, start: '09:00', end: '17:00' },
  ]);

  const [applied, setApplied] = useState(false);
  const [show, setShow] = useState(false);
  
  return (
    <div className='flex flex-col items-start mt-12 gap-6 max-w-[647px] min-h-full'>
      <div className='relative w-full'>
        <h1 className='text-[32px] leading-[44.3px] font-semibold'>Welcome to ResQ</h1>
        <p className='text-[16px] leading-[25.6px] font-normal text-gray-500'>
      We filled out some settings for you. Feel free to adjust them if <br/> needed! You can always revisit them later too.
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
                    onChange={e => setProfileData({ ...profileData, fullname: e.target.value })}
                    placeholder="Eunice Chisom" 
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-[#06202E] focus:outline-none focus:ring-2 focus:ring-[#06202E]"
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
                    onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="eunicechisom@mail.com" 
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-[#06202E] focus:outline-none focus:ring-2 focus:ring-[#06202E]"
                    style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '16px',
                      lineHeight: '25.6px',
                    }}
                  />
                  {profileErrors.email && <p className="text-red-500 text-sm">{profileErrors.email}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[#5C6A7A]" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '14px', lineHeight: '22.4px' }}>Phone</label>
                  <input 
                    type="text" 
                    value={profileData.phone}
                    onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="09180653262" 
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-[#06202E] focus:outline-none focus:ring-2 focus:ring-[#06202E]"
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
                    onChange={e => setProfileData({ ...profileData, role: e.target.value })}
                    placeholder="Admin" 
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-[#06202E] focus:outline-none focus:ring-2 focus:ring-[#06202E]"
                    style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '16px',
                      lineHeight: '25.6px',
                    }}
                  />
                  {profileErrors.role && <p className="text-red-500 text-sm">{profileErrors.role}</p>}
                </div>
              </form>
              <div className="flex flex-row justify-between mt-8 w-full">
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
              <ProfileAvatarUpload onUploaded={handleNext} />
            </div>
            </div>
        )}
        {step === 1 && (
          <div className="flex flex-col w-[480px] bg-white py-6 rounded items-center justify-center min-h-[300px]">
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
                <button onClick={handleNext} type="button" className="bg-[#06202E] text-white w-[186px] h-[40px] px-8 rounded-lg font-medium">Next</button>
                <button onClick={handleSkip} type="button" className="bg-gray-100 text-[#5C6A7A] w-[64px] h-[40px] flex items-center justify-center rounded-lg font-medium">Skip</button>
            </div>
          </form>
        </div>
        )}
        {step === 2 && (
          <div className="flex flex-col w-[480px] bg-white py-6 px-6 rounded items-center justify-center min-h-[300px]">
            <h2 className="mb-8 self-start text-[#16202E]" style={{
              fontFamily: 'Plus Jakarta Sans',
              fontWeight: 500,
              fontSize: '16px',
              lineHeight: '25.6px',
              letterSpacing: 0,
              verticalAlign: 'middle',
            }}>Login and security</h2>
            <div className="w-full">
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <span 
                  className="text-[#16202E]"
                  style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: 500,
                    fontSize: '20px',
                    lineHeight: '32px',
                    letterSpacing: '0%',
                    verticalAlign: 'middle',
                  }}
                >Email</span>
                <input 
                  type="email"
                  placeholder="Email"
                  value={loginData.email}
                  onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                  className="text-right border-none bg-transparent text-[#5C6A7A] focus:outline-none w-[250px] placeholder-[#5C6A7A]"
                  style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '25.6px',
                    letterSpacing: '0%',
                    verticalAlign: 'middle',
                  }}
                />
                {loginErrors.email && <p className="text-red-500 text-sm">{loginErrors.email}</p>}
              </div>
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <span 
                  className="text-[#16202E]"
                  style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: 500,
                    fontSize: '20px',
                    lineHeight: '32px',
                    letterSpacing: '0%',
                    verticalAlign: 'middle',
                  }}
                >Password</span>
                <div className="flex items-center gap-2">
                  <input 
                    type={show ? "text" : "password"}
                    placeholder="mySecretPassword"
                    className="text-right border-none bg-transparent text-[#5C6A7A] focus:outline-none w-[250px] placeholder-[#5C6A7A]"
                    style={{
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: 500,
                      fontSize: '16px',
                      lineHeight: '25.6px',
                      letterSpacing: '0%',
                      verticalAlign: 'middle',
                    }}
                  />
                  <button type="button" onClick={() => setShow(s => !s)} className="focus:outline-none">
                    {show ? <HiEyeSlash size={28} color="#6B7683" /> : <MdOutlineRemoveRedEye size={28} color="#6B7683" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-4">
                <span 
                  className="text-[#16202E]"
                  style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: 500,
                    fontSize: '20px',
                    lineHeight: '32px',
                    letterSpacing: '0%',
                    verticalAlign: 'middle',
                  }}
                >Permission level</span>
                <input 
                  type="text"
                  placeholder="Admin"
                  className="text-right border-none bg-transparent text-[#5C6A7A] focus:outline-none w-[250px] placeholder-[#5C6A7A]"
                  style={{
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '25.6px',
                    letterSpacing: '0%',
                    verticalAlign: 'middle',
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              className="bg-[#06202E] text-white w-[186px] h-[40px] px-8 rounded-lg font-medium self-start mt-8"
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
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col w-[600px] bg-white py-6 rounded items-center justify-center min-h-[300px]">
            <h2 className="mb-8 self-start text-[#16202E] text-2xl font-semibold">Manage your account</h2>
            <div className="w-full">
              <NotificationRow
                icon={<MdOutlineEmail size={32} />} 
                title="Email Notifications"
                description="Get updates sent directly to your email"
                checkedDefault={true}
              />
              <hr className="border-t border-gray-200 my-4" />
              <NotificationRow
                icon={<MdOutlineNotificationsNone size={32} />} 
                title="Push Notifications"
                description="Instant alerts on your device for real-time updates."
                checkedDefault={false}
              />
              <hr className="border-t border-gray-200 my-4" />
              <NotificationRow
                icon={<MdOutlineSms size={32} />} 
                title="SMS Notifications"
                description="Get updates delivered straight to your phone."
                checkedDefault={true}
              />
              <hr className="border-t border-gray-200 my-4" />
            </div>
            <div className="flex flex-row w-full justify-between mt-8">
              <button 
                type="button" 
                className="bg-[#06202E] text-white w-[186px] h-[40px] px-8 rounded-lg font-medium"
                style={{
                  fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '25.6px',
                }}
              >Finish</button>
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
    <div className="flex items-center justify-between py-2 gap-x-8">
      <div className="flex items-center min-w-[180px] gap-3">
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
      <div className="flex items-center w-[340px] justify-start">
        {value.enabled ? (
          <div className="flex items-center gap-3 w-full">
            <input
              type="time"
              value={value.start}
              onChange={e => onChange({ ...value, start: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 w-[120px] text-[#06202E] bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#06202E]"
              style={{
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '22.4px',
                letterSpacing: '0%',
                verticalAlign: 'middle',
              }}
            />
            <span className="text-[#06202E] text-xl">—</span>
            <input
              type="time"
              value={value.end}
              onChange={e => onChange({ ...value, end: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 w-[120px] text-[#06202E] bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#06202E]"
              style={{
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '22.4px',
                letterSpacing: '0%',
                verticalAlign: 'middle',
              }}
            />
            {showApplyToAll && (
              <div className="relative flex flex-col items-center">
                <button
                  type="button"
                  className="ml-2"
                  title="Apply to all"
                  onClick={() => {
                    if (onApplyToAll) onApplyToAll();
                    setShowTooltip(true);
                    setTimeout(() => setShowTooltip(false), 1500);
                  }}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <MdOutlineContentCopy size={20} />
                </button>
                {(showTooltip || applied) && (
                  <p className="absolute top-[120%] left-1/2 -translate-x-1/2 bg-[#16202E] text-white text-base rounded-lg px-4 py-2 whitespace-nowrap z-10 shadow-lg">
                    {applied ? 'Applied!' : 'Apply to all'}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center w-full">
            <span className="text-gray-400 bg-gray-100 rounded px-4 py-1 text-sm w-[120px] text-center">Day off</span>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({ icon, title, description, checkedDefault }: { icon: React.ReactNode, title: string, description: string, checkedDefault: boolean }) {
  const [checked, setChecked] = React.useState(checkedDefault);
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
        onClick={() => setChecked(c => !c)}
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

function ProfileAvatarUpload({ onUploaded }: { onUploaded?: () => void }) {
  const [image, setImage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        if (onUploaded) onUploaded();
      };
      reader.readAsDataURL(file);
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
        className="flex items-center gap-2 bg-gray-100 text-[#5C6A7A] px-6 h-[40px] rounded-full font-medium text-base mt-2"
        onClick={handleButtonClick}
      >
        <img src="/icons/upload.png" alt="Upload" className="w-5 h-5" />
        Upload
      </button>
    </div>
  );
}

export default WelcomeProviderPage;