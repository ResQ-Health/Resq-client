import React, { useMemo, useState } from 'react';
import { FiChevronDown, FiStar } from 'react-icons/fi';
import { useProviderReviews } from '../../services/providerService';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const toPrettyDateTime = (iso?: string) => {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const stars = (n: number) => Array.from({ length: 5 }, (_, i) => i < n);

const ProviderReviewsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 10;

  const [ratingDraft, setRatingDraft] = useState<string>('');
  const [rating, setRating] = useState<number | undefined>(undefined);

  const reviewsQuery = useProviderReviews({
    page,
    limit,
    rating,
  });

  const summary = reviewsQuery.data?.data?.summary;
  const reviews = reviewsQuery.data?.data?.reviews ?? [];
  const pagination = reviewsQuery.data?.pagination;

  const isInitialLoad = reviewsQuery.isLoading;
  const isUpdating = reviewsQuery.isFetching && !reviewsQuery.isLoading;

  const breakdownRows = useMemo(() => {
    const b = summary?.breakdown;
    if (!b) return [];
    const total = Number(summary?.count ?? 0) || 0;
    return ([5, 4, 3, 2, 1] as const).map((k) => {
      const count = Number((b as any)[k] ?? 0) || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { stars: k, count, pct };
    });
  }, [summary]);

  if (isInitialLoad) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner fullScreen={false} size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#16202E]">Reviews</h2>
          <p className="text-sm text-gray-500">See reviews from patients and your overall rating.</p>
        </div>
        {isUpdating && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-[#06202E] rounded-full animate-spin" />
            Updating…
          </div>
        )}
      </div>

      {/* Summary */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="text-sm text-gray-500">Average rating</div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-3xl font-semibold text-[#16202E]">{Number(summary?.average ?? 0).toFixed(1)}</div>
            <div className="text-sm text-gray-500 pb-1">/ 5</div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            {stars(Math.round(Number(summary?.average ?? 0))).map((filled, idx) => (
              <FiStar key={idx} className={filled ? 'text-yellow-500' : 'text-gray-300'} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="text-sm text-gray-500">Total reviews</div>
          <div className="text-3xl font-semibold text-[#16202E] mt-2">{Number(summary?.count ?? 0).toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="text-sm text-gray-500 mb-3">Breakdown</div>
          {breakdownRows.length === 0 ? (
            <div className="text-sm text-gray-400">No breakdown</div>
          ) : (
            <div className="space-y-2">
              {breakdownRows.map((r) => (
                <div key={r.stars} className="flex items-center gap-3 text-sm">
                  <div className="w-14 text-gray-600 flex items-center gap-1">
                    <span className="font-medium">{r.stars}</span>
                    <FiStar className="text-yellow-500" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-[#06202E] rounded-full" style={{ width: `${r.pct}%` }} />
                  </div>
                  <div className="w-16 text-right text-gray-500">{r.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
          <div className="max-w-sm">
            <label className="block text-sm text-gray-600 mb-2">Filter by rating</label>
            <div className="relative">
              <select
                value={ratingDraft}
                onChange={(e) => setRatingDraft(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              >
                <option value="">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
              <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => {
              const r = ratingDraft ? Number(ratingDraft) : undefined;
              setRating(r);
              setPage(1);
            }}
            className="bg-[#06202E] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </section>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10">
          <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">No reviews found.</div>
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

          <div className="divide-y divide-gray-100">
            {reviews.map((r, idx) => {
              const patient = r.patient || null;
              const patientName = patient?.name || patient?.full_name || 'Patient';
              const patientEmail = patient?.email || '';
              const patientPhone = patient?.phone || patient?.phone_number || '';
              const avatarUrl = patient?.profile_picture?.url || '';

              return (
                <div key={String(r.id || r._id || idx)} className="p-6 hover:bg-gray-50/40">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-start gap-4">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={patientName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 text-sm font-semibold">
                          {(patientName || 'P').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-[#16202E]">{patientName}</div>
                        {(patientEmail || patientPhone) && (
                          <div className="text-xs text-gray-500">
                            {patientEmail}{patientEmail && patientPhone ? ' • ' : ''}{patientPhone}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-1">
                          {stars(r.rating).map((filled, i) => (
                            <FiStar key={i} className={filled ? 'text-yellow-500' : 'text-gray-300'} />
                          ))}
                          <span className="text-xs text-gray-500 ml-2">{toPrettyDateTime(r.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                      <div>Likes: <span className="font-medium text-[#16202E]">{r.likes_count}</span></div>
                      <div>Saved: <span className="font-medium text-[#16202E]">{r.saved_count}</span></div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">{r.comment}</div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
            <div className="text-sm text-gray-500">
              Page {pagination?.page ?? page} of {pagination?.pages ?? 1} • {pagination?.total ?? reviews.length} total
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

export default ProviderReviewsPage;


