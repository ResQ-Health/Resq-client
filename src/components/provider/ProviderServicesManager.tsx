import React, { useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiMoreVertical } from 'react-icons/fi';
import { FaPlus, FaTimes } from 'react-icons/fa';

type Category = {
  id: string;
  name: string;
};

type Service = {
  id: string;
  title: string;
  durationMins: number;
  price: number; // NGN
  categoryId: string;
};

type CreateServiceDraft = {
  title: string;
  description: string;
  durationMins: string;
  cost: string;
  categoryIds: string[];
};

const defaultDraft: CreateServiceDraft = {
  title: '',
  description: '',
  durationMins: '',
  cost: '',
  categoryIds: [],
};

const formatNaira = (n: number) => `₦${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const mockCategories: Category[] = [
  { id: 'c1', name: 'Imaging & Radiology' },
  { id: 'c2', name: 'Laboratory Tests' },
  { id: 'c3', name: 'Cardiac & Pulmonary' },
];

const mockServices: Service[] = [
  { id: 's1', title: 'Echocardiography', durationMins: 30, price: 50000, categoryId: 'c3' },
  { id: 's2', title: 'ECG (Electrocardiogram)', durationMins: 30, price: 50000, categoryId: 'c3' },
];

function CreateServiceModal({
  isOpen,
  onClose,
  categories,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreate: (draft: CreateServiceDraft) => void;
}) {
  const [draft, setDraft] = useState<CreateServiceDraft>(defaultDraft);

  if (!isOpen) return null;

  const canCreate =
    draft.title.trim().length >= 2 &&
    draft.description.trim().length >= 2 &&
    Number(draft.durationMins) > 0 &&
    Number(draft.cost) > 0 &&
    draft.categoryIds.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[760px] bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-10 py-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <FaTimes size={18} />
            </button>
            <h3 className="text-xl font-semibold text-[#16202E]">New Service</h3>
          </div>

          <button
            type="button"
            disabled={!canCreate}
            onClick={() => {
              onCreate(draft);
              setDraft(defaultDraft);
              onClose();
            }}
            className="bg-[#06202E] text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0a2e42] transition-colors"
          >
            Create
          </button>
        </div>

        <div className="px-10 pb-10">
          <p className="text-sm font-medium text-[#16202E] mb-6">Service details</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Title</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder='For example, “Full Blood Count (FBC)”'
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Description</label>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Describe your service to booking page visitors"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm min-h-[110px] resize-none focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Duration</label>
                <div className="relative">
                  <input
                    value={draft.durationMins}
                    onChange={(e) => setDraft((d) => ({ ...d, durationMins: e.target.value }))}
                    placeholder="Enter duration"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    mins
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Cost</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    ₦
                  </span>
                  <input
                    value={draft.cost}
                    onChange={(e) => setDraft((d) => ({ ...d, cost: e.target.value }))}
                    placeholder="Enter cost"
                    className="w-full border border-gray-200 rounded-lg px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Category</label>
              <select
                value={draft.categoryIds[0] ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    categoryIds: e.target.value ? [e.target.value] : [],
                  }))
                }
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              >
                <option value="">Select one or more categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ProviderServicesManager: React.FC<{
  containerClassName?: string;
  contentMinHeightClassName?: string;
}> = ({ containerClassName, contentMinHeightClassName }) => {
  const [categories] = useState<Category[]>(mockCategories);
  const [services, setServices] = useState<Service[]>(mockServices);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const [isServicesExpanded, setIsServicesExpanded] = useState(true);
  const [openServiceMenuId, setOpenServiceMenuId] = useState<string | null>(null);
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const visibleServices = useMemo(() => {
    if (!selectedCategoryId) return services;
    return services.filter((s) => s.categoryId === selectedCategoryId);
  }, [services, selectedCategoryId]);

  const handleCreate = (draft: CreateServiceDraft) => {
    const newService: Service = {
      id: `s_${Date.now()}`,
      title: draft.title.trim(),
      durationMins: Number(draft.durationMins),
      price: Number(draft.cost),
      categoryId: draft.categoryIds[0],
    };
    setServices((prev) => [newService, ...prev]);
    setSelectedCategoryId(newService.categoryId);
  };

  return (
    <div
      className={
        containerClassName ??
        'flex bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm'
      }
    >
      {/* Left panel */}
      <aside className="w-[320px] border-r border-gray-100 bg-white">
        <div className="p-8">
          <h2 className="text-xl font-semibold text-[#16202E]">Services &amp; Categories</h2>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setIsServicesExpanded((v) => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-lg font-semibold text-[#16202E]">
                Services ({Math.max(visibleServices.length, 0)})
              </span>
              {isServicesExpanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {isServicesExpanded && (
              <div className="mt-4 space-y-2">
                {categories.map((c) => {
                  const active = c.id === selectedCategoryId;
                  return (
                    <div key={c.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId(c.id)}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg ${
                          active ? 'text-[#16202E]' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-sm">{c.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenCategoryMenuId((prev) => (prev === c.id ? null : c.id));
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                          aria-label="Category actions"
                        >
                          <FiMoreVertical />
                        </button>
                      </button>

                      {openCategoryMenuId === c.id && (
                        <div
                          className="absolute right-2 top-10 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10"
                          onMouseLeave={() => setOpenCategoryMenuId(null)}
                        >
                          <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50">
                            Edit
                          </button>
                          <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4 w-full flex items-center gap-3 text-gray-500 hover:text-[#16202E] px-2 py-2"
                >
                  <FaPlus size={12} />
                  <span className="text-sm">New service</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Right panel */}
      <section className="flex-1 bg-white">
        <div className={`p-8 ${contentMinHeightClassName ?? ''}`}>
          <h3 className="text-lg font-semibold text-[#16202E] mb-6">
            {selectedCategory ? selectedCategory.name : 'Services'}
          </h3>

          {visibleServices.length > 0 ? (
            <div className="space-y-6">
              {visibleServices.map((s) => (
                <div
                  key={s.id}
                  className="relative bg-white border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
                  <div className="flex items-center justify-between px-6 py-5">
                    <div>
                      <p className="text-sm font-semibold text-[#16202E]">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {s.durationMins} mins <span className="mx-2">·</span> {formatNaira(s.price)}
                      </p>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenServiceMenuId((prev) => (prev === s.id ? null : s.id))}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                        aria-label="Service actions"
                      >
                        <FiMoreVertical />
                      </button>

                      {openServiceMenuId === s.id && (
                        <div
                          className="absolute right-0 top-10 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10"
                          onMouseLeave={() => setOpenServiceMenuId(null)}
                        >
                          <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50">
                            Edit
                          </button>
                          <button
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              setServices((prev) => [
                                { ...s, id: `s_${Date.now()}`, title: `${s.title} (Copy)` },
                                ...prev,
                              ]);
                              setOpenServiceMenuId(null);
                            }}
                          >
                            Duplicate
                          </button>
                          <button
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => {
                              setServices((prev) => prev.filter((x) => x.id !== s.id));
                              setOpenServiceMenuId(null);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[520px] flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="mx-auto w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mb-6">
                  <div className="w-10 h-10 bg-gray-200 rounded-md" />
                </div>
                <h4 className="text-lg font-semibold text-[#16202E] mb-2">No services to display</h4>
                <p className="text-sm text-gray-500 mb-6">
                  Your service menu and booking page are currently empty. <br />
                  Create a new service to start booking appointments.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-[#06202E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors"
                >
                  Create service
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <CreateServiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        categories={categories}
        onCreate={handleCreate}
      />
    </div>
  );
};


