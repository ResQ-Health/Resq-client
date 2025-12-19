import React, { useMemo, useState } from 'react';
import { FiChevronDown, FiFileText } from 'react-icons/fi';
import { useProviderReports } from '../../services/providerService';

const toPrettyDateTime = (iso?: string) => {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const normalizeStatus = (s?: string) => {
  const v = String(s || '').toLowerCase();
  if (!v) return 'Unknown';
  return v.charAt(0).toUpperCase() + v.slice(1);
};

const statusBadgeClass = (s?: string) => {
  const v = String(s || '').toLowerCase();
  if (v === 'resolved' || v === 'closed') return 'bg-green-100 text-green-700';
  if (v === 'pending') return 'bg-yellow-100 text-yellow-700';
  if (v === 'open') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
};

const ProviderReportsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 10;

  // Draft filters
  const [statusDraft, setStatusDraft] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('');

  // Applied filters
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  const reportsQuery = useProviderReports({
    page,
    limit,
    status: status || undefined,
    category: category || undefined,
  });

  const reports = reportsQuery.data?.data ?? [];
  const pagination = reportsQuery.data?.pagination;
  const isInitialLoad = reportsQuery.isLoading;
  const isUpdating = reportsQuery.isFetching && !reportsQuery.isLoading;

  const categories = useMemo(() => {
    const fromData = new Set<string>();
    reports.forEach((r) => {
      if (r.category) fromData.add(r.category);
    });
    return Array.from(fromData).sort((a, b) => a.localeCompare(b));
  }, [reports]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#16202E]">Reports</h2>
          <p className="text-sm text-gray-500">View reports made against you. Anonymous reports hide patient details.</p>
        </div>
        {isUpdating && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-[#06202E] rounded-full animate-spin" />
            Updating…
          </div>
        )}
      </div>

      {/* Filters */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Status</label>
            <div className="relative">
              <select
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Category</label>
            <div className="relative">
              <select
                value={categoryDraft}
                onChange={(e) => setCategoryDraft(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => {
              setStatus(statusDraft);
              setCategory(categoryDraft);
              setPage(1);
            }}
            className="bg-[#06202E] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </section>

      {/* List */}
      {isInitialLoad ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10">
          <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">Loading reports…</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10">
          <div className="h-[320px] flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100">
                <FiFileText size={40} className="text-gray-300" />
              </div>
              <h4 className="text-xl font-semibold text-[#16202E]">No reports found</h4>
              <p className="text-sm text-gray-500 mt-2">Try adjusting your filters.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
          {isUpdating && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-start justify-center pt-6 z-10">
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
                <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-[#06202E] rounded-full animate-spin" />
                Updating…
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium text-left">Category</th>
                  <th className="px-6 py-4 font-medium text-left">Status</th>
                  <th className="px-6 py-4 font-medium text-left">Patient</th>
                  <th className="px-6 py-4 font-medium text-left">Created</th>
                  <th className="px-6 py-4 font-medium text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((r, idx) => {
                  const patient = r.anonymous ? null : r.patient;
                  const patientName = patient?.name || patient?.full_name || '—';
                  const patientMeta = patient ? `${patient.email || '—'} • ${patient.phone || patient.phone_number || '—'}` : 'Anonymous';
                  const created = toPrettyDateTime(r.created_at);
                  const statusText = normalizeStatus(r.status);
                  const cat = r.category || '—';
                  const details = r.description || r.message || r.title || '—';

                  return (
                    <tr key={String(r.id || r._id || r.report_id || idx)} className="hover:bg-gray-50/40">
                      <td className="px-6 py-4 text-gray-700">{cat}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(r.status)}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#16202E]">{patient ? patientName : 'Anonymous'}</div>
                        <div className="text-xs text-gray-500">{patientMeta}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{created}</td>
                      <td className="px-6 py-4 text-gray-700">
                        <div className="max-w-[520px] truncate" title={details}>
                          {details}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
            <div className="text-sm text-gray-500">
              Page {pagination?.page ?? page} of {pagination?.pages ?? 1} • {pagination?.total ?? reports.length} total
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={(pagination?.page ?? page) <= 1}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!!pagination && pagination.page >= pagination.pages}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderReportsPage;


