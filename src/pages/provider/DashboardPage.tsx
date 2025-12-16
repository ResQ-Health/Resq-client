import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useProviderDashboardStats } from '../../services/providerService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const revenueOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#06202E',
      padding: 12,
      cornerRadius: 4,
      titleFont: { size: 0 }, // Hide title
      bodyFont: { size: 14, weight: 'bold' as const },
      displayColors: false,
      callbacks: {
        label: (context: any) => `₦${context.raw.toLocaleString()}`,
        title: () => '', // Hide title
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: true,
        drawOnChartArea: true,
        borderDash: [5, 5],
        color: '#E5E7EB',
        tickLength: 10
      },
      ticks: {
        color: '#9CA3AF',
        font: { size: 12 }
      },
      border: { display: false }
    },
    y: {
      display: false,
      grid: { display: false },
      min: 0
    },
  },
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
};

type OverviewRange = 'weekly' | 'monthly' | 'total';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useProviderDashboardStats();
  const [overviewRange, setOverviewRange] = useState<OverviewRange>('weekly');

  const overview = data?.data?.overview;
  const financials = data?.data?.financials;
  const revenueByMonth = financials?.revenue_by_month ?? [];
  const revenueByService = financials?.revenue_by_service ?? [];

  const totalRevenue = financials?.total_revenue ?? 0;

  const selectedOverview = useMemo(() => {
    if (!overview) return null;
    if (overviewRange === 'total') return overview.total;
    if (overviewRange === 'monthly') return overview.monthly;
    return overview.weekly;
  }, [overview, overviewRange]);

  const comparisonOverview = useMemo(() => {
    // API doesn't provide "last week/last month" deltas.
    // We compare weekly vs monthly, monthly vs total, total has no comparison.
    if (!overview) return null;
    if (overviewRange === 'weekly') return overview.monthly;
    if (overviewRange === 'monthly') return overview.total;
    return null;
  }, [overview, overviewRange]);

  const compareLabel =
    overviewRange === 'weekly'
      ? 'vs monthly'
      : overviewRange === 'monthly'
        ? 'vs total'
        : '';

  const getPct = (current: number, prev: number) => {
    if (!prev) return null;
    return Math.round(((current - prev) / prev) * 100);
  };

  const stats = useMemo(() => {
    const cur = selectedOverview;
    const prev = comparisonOverview;

    const make = (label: string, value: number, prevValue?: number) => {
      const pct = typeof prevValue === 'number' ? getPct(value, prevValue) : null;
      const isPositive = typeof pct === 'number' ? pct >= 0 : null;
      return {
        label,
        value,
        pct,
        isPositive,
      };
    };

    return [
      make('Total Appointments', cur?.total_appointments ?? NaN, prev?.total_appointments),
      make('Completed Appointments', cur?.completed_appointments ?? NaN, prev?.completed_appointments),
      make('Upcoming Appointments', cur?.upcoming_appointments ?? NaN, prev?.upcoming_appointments),
      make('Cancelled Appointments', cur?.cancelled_appointments ?? NaN, prev?.cancelled_appointments),
    ];
  }, [selectedOverview, comparisonOverview]);

  const [revenueServiceRange, setRevenueServiceRange] = useState<OverviewRange>('weekly');
  const [topServicesRange, setTopServicesRange] = useState<OverviewRange>('monthly');
  const [patientVisitsRange, setPatientVisitsRange] = useState<OverviewRange>('monthly');

  const [revenueRange, setRevenueRange] = useState<'6months' | '12months'>('12months');

  const fullYearData = useMemo(() => {
    // Determine the year to show. If we have data, use the year from the most recent data point.
    // Otherwise, default to current year.
    const currentYear = new Date().getFullYear();
    const sortedData = [...revenueByMonth].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });
    
    // Use the latest year in the data, or current year
    const targetYear = sortedData.length > 0 ? sortedData[sortedData.length - 1].year : currentYear;

    const allMonths = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const date = new Date(targetYear, i, 1);
      const monthName = date.toLocaleString('default', { month: 'long' });
      
      // Find matching data for this month and year
      const found = revenueByMonth.find(d => d.month === monthNum && d.year === targetYear);
      
      return {
        month: monthNum,
        year: targetYear,
        month_name: monthName,
        period: `${monthName} ${targetYear}`,
        amount: found ? found.amount : 0,
        count: found ? found.count : 0
      };
    });
    
    return allMonths;
  }, [revenueByMonth]);

  const chartLabels = useMemo(() => {
    let months = fullYearData;
    if (revenueRange === '6months') {
      months = months.slice(-6);
    } else {
      months = months.slice(-12);
    }
    return months.map((m) => (m.month_name || m.period || '').slice(0, 3).toUpperCase());
  }, [fullYearData, revenueRange]);

  const chartDataPoints = useMemo(() => {
    let months = fullYearData;
    if (revenueRange === '6months') {
      months = months.slice(-6);
    } else {
      months = months.slice(-12);
    }
    return months.map((m) => m.amount ?? 0);
  }, [fullYearData, revenueRange]);

  const revenueData = useMemo(() => ({
    labels: chartLabels,
    datasets: [
      {
        label: 'Revenue',
        data: chartDataPoints,
        borderColor: '#22C55E',
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#22C55E',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  }), [chartLabels, chartDataPoints]);

  // Compute percent change from last 2 months (if available)
  const pctChange = (() => {
    if (revenueByMonth.length < 2) return null;
    const last = revenueByMonth[revenueByMonth.length - 1]?.amount ?? 0;
    const prev = revenueByMonth[revenueByMonth.length - 2]?.amount ?? 0;
    if (prev === 0) return null;
    return Math.round(((last - prev) / prev) * 100);
  })();

  const formatRange = () => {
    const first = financials?.first_payment_date ? new Date(financials.first_payment_date) : null;
    const last = financials?.last_payment_date ? new Date(financials.last_payment_date) : null;
    const fmt = (d: Date) =>
      d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    if (first && last) return `${fmt(first)} - ${fmt(last)}`;
    return '—';
  };

  const serviceColors = ['#22C55E', '#F59E0B', '#3B82F6', '#06B6D4', '#EF4444'];

  // Revenue By Service Logic
  const rawServiceData = financials?.revenue_by_service;
  const currentServiceData = rawServiceData
    ? (Array.isArray(rawServiceData) ? rawServiceData : (rawServiceData as any)[revenueServiceRange] || [])
    : [];

  const serviceMax = Math.max(1, ...currentServiceData.map((s: any) => Number(s.amount ?? 0)));
  const serviceItems = currentServiceData.slice(0, 5).map((s: any, idx: number) => ({
    label: s.service_name || s.name || s.service || 'Service',
    amount: Number(s.amount ?? 0),
    count: Number(s.count ?? 0),
    color: serviceColors[idx % serviceColors.length],
    pct: Math.round((Number(s.amount ?? 0) / serviceMax) * 100),
  }));

  // Top Services Logic
  const rawTopServices = data?.data?.top_services;
  const currentTopServices = rawTopServices
    ? (Array.isArray(rawTopServices) ? rawTopServices : (rawTopServices as any)[topServicesRange] || [])
    : [];

  const topServices = currentTopServices
    .map((s: any) => ({ name: s.service_name || s.name || s.service || 'Service', count: Number(s.count ?? 0) }))
    .slice(0, 3);

  // Calculate Patient Visit Stats
  const rawPatientVisits = data?.data?.patient_visits;
  const userStats = data?.data?.overview?.user_stats;
  const demographics = userStats?.demographics;

  // Calculate Patient Visit Stats
  const visitsTotal = typeof rawPatientVisits === 'number'
    ? rawPatientVisits
    : (rawPatientVisits as any)?.[patientVisitsRange];

  const maleRaw = demographics?.male;
  const femaleRaw = demographics?.female;

  const safeMale = typeof maleRaw === 'number' ? maleRaw : null;
  const safeFemale = typeof femaleRaw === 'number' ? femaleRaw : null;

  const safeTotal =
    typeof visitsTotal === 'number'
      ? visitsTotal
      : (safeMale !== null || safeFemale !== null)
        ? (safeMale ?? 0) + (safeFemale ?? 0)
        : null;

  const maxVal = Math.max(1, Number(safeMale ?? 0), Number(safeFemale ?? 0));
  const malePct = safeMale === null ? 0 : Math.round((safeMale / maxVal) * 100);
  const femalePct = safeFemale === null ? 0 : Math.round((safeFemale / maxVal) * 100);

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-gray-500">
          Loading dashboard stats…
        </div>
      )}
      {isError && (
        <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm text-red-600">
          Failed to load dashboard stats.
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-gray-500">{stat.label}</h3>
              <select
                value={overviewRange}
                onChange={(e) => setOverviewRange(e.target.value as OverviewRange)}
                className="text-xs bg-gray-50 border-none rounded px-2 py-1 text-gray-500 focus:outline-none"
                disabled={!overview || isLoading}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="total">Total</option>
              </select>
            </div>
            <div className="text-3xl font-bold text-[#16202E] mb-2">
              {Number.isFinite(stat.value) ? String(stat.value).padStart(2, '0') : '—'}
            </div>
            <div className="flex justify-between items-center">
              <div className="text-xs">
                {Number.isFinite(stat.value) && typeof (stat as any).pct === 'number' ? (
                  <span className={`${(stat as any).isPositive ? 'text-green-600' : 'text-red-600'} font-medium`}>
                    {(stat as any).isPositive ? '↑' : '↓'} {Math.abs((stat as any).pct)}%
                    <span className="text-gray-400 ml-1 font-normal">{compareLabel}</span>
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              <button
                className="text-xs text-gray-400 hover:text-[#06202E]"
                onClick={() => navigate('/provider/calendar')}
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded border-2 border-red-500 flex items-center justify-center text-red-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#16202E]">Total Revenue</h2>
            </div>
            <div className="flex items-center">
              <span className="text-4xl font-bold text-[#16202E]">₦{totalRevenue.toLocaleString()}</span>
              {typeof pctChange === 'number' && (
                <span className={`ml-3 px-3 py-1 border text-sm font-medium rounded-full flex items-center gap-1 ${pctChange >= 0 ? 'bg-green-50 text-green-500 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                  }`}>
                  {pctChange >= 0 ? '↑' : '↓'} {Math.abs(pctChange)}%
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <select
              className="text-sm bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-600 focus:outline-none shadow-sm cursor-pointer hover:bg-gray-50"
              value={revenueRange}
              onChange={(e) => setRevenueRange(e.target.value as '6months' | '12months')}
            >
              <option value="12months">Last 12 months</option>
              <option value="6months">Last 6 months</option>
            </select>
            <span className="text-sm text-gray-500">{formatRange()}</span>
          </div>
        </div>

        <div className="h-[300px] w-full mt-4">
          <Line data={revenueData} options={revenueOptions} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Service */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded text-blue-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#16202E]">Revenue by Service</h3>
            </div>
            <select
              value={revenueServiceRange}
              onChange={(e) => setRevenueServiceRange(e.target.value as OverviewRange)}
              className="text-xs bg-gray-50 rounded px-2 py-1 text-gray-500 focus:outline-none cursor-pointer"
              disabled={!data || isLoading}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="total">Total</option>
            </select>
          </div>
          <div className="space-y-6">
            {serviceItems.length === 0 ? (
              <div className="text-sm text-gray-500">No revenue by service yet.</div>
            ) : serviceItems.map((row: any) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{row.label}</span>
                  <span className="font-medium text-[#16202E]">₦{row.amount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${row.pct}%`,
                      backgroundColor: row.color,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Patient Visit & Top Services */}
        <div className="space-y-6">
          {/* Patient Visit */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded text-blue-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-[#16202E]">Patient Visit</h3>
              </div>
              <select
                value={patientVisitsRange}
                onChange={(e) => setPatientVisitsRange(e.target.value as OverviewRange)}
                className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-500 focus:outline-none cursor-pointer"
                disabled={!data || isLoading}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="total">Total</option>
              </select>
            </div>

            <div className="space-y-6">
              {/* Total */}
              <div className="border-l border-dashed border-gray-300 pl-4">
                <p className="text-sm text-gray-400 mb-1">Total</p>
                <p className="text-2xl font-bold text-[#16202E] mb-1">
                  {typeof safeTotal === 'number' ? safeTotal : '—'}
                </p>
                <p className="text-xs text-gray-400 font-normal">Patient visits</p>
              </div>

              {/* Male + Female */}
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <div className="border-l border-dashed border-gray-300 pl-4">
                    <p className="text-sm text-gray-400 mb-1">Male</p>
                    <p className="text-2xl font-bold text-[#16202E] mb-1">
                      {safeMale === null ? '—' : safeMale}
                    </p>
                    <p className="text-xs text-gray-400 font-normal">vs last month</p>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-md overflow-hidden">
                    <div className="h-3 bg-[#06202E]" style={{ width: `${malePct}%` }} />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="border-l border-dashed border-gray-300 pl-4">
                    <p className="text-sm text-gray-400 mb-1">Female</p>
                    <p className="text-2xl font-bold text-[#16202E] mb-1">
                      {safeFemale === null ? '—' : safeFemale}
                    </p>
                    <p className="text-xs text-gray-400 font-normal">vs last month</p>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-md overflow-hidden">
                    <div className="h-3 bg-[#FBBF24]" style={{ width: `${femalePct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Services */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white border border-gray-100 rounded-lg text-[#06202E]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-[#16202E]">Top Services</h3>
              </div>
              <select
                value={topServicesRange}
                onChange={(e) => setTopServicesRange(e.target.value as OverviewRange)}
                className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-500 focus:outline-none cursor-pointer"
                disabled={!data || isLoading}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="total">Total</option>
              </select>
            </div>
            <div className="space-y-3">
              {topServices.length === 0 ? (
                <div className="text-sm text-gray-500">No top services yet.</div>
              ) : (
                topServices.map((row: any) => (
                  <div key={row.name} className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-lg">
                    <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">{row.name}</span>
                    <span className="ml-auto text-xs text-gray-400">{row.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

