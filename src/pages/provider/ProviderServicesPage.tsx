import React, { useMemo, useState, useEffect } from 'react';
import { FiMoreVertical, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { useProviderServices, useCreateProviderService, useUpdateProviderService, useDeleteProviderService, ProviderServiceItem, CreateServiceRequest } from '../../services/providerService';

type Category = {
  id: string;
  name: string;
  value: string;
};

const formatNaira = (n: number) =>
  `₦${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const categories: Category[] = [
  { id: 'all', name: 'All Services', value: 'all' },
  { id: 'c1', name: 'Scans', value: 'scans' },
  { id: 'c2', name: 'Tests', value: 'tests' },
  { id: 'c3', name: 'Consultation', value: 'consultation' },
];

type CreateServiceDraft = {
  id?: string;
  title: string;
  description: string;
  durationMins: string;
  cost: string;
  categoryIds: string[];
};

const defaultDraft: CreateServiceDraft = {
  title: '',
  description: '',
  durationMins: '', // Default duration
  cost: '',
  categoryIds: [],
};

function CreateServiceModal({
  isOpen,
  onClose,
  categories,
  onCreate,
  initialData,
  isEditing = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreate: (draft: CreateServiceDraft) => void;
  initialData?: CreateServiceDraft;
  isEditing?: boolean;
}) {
  const [draft, setDraft] = useState<CreateServiceDraft>(defaultDraft);

  useEffect(() => {
    if (isOpen && initialData) {
      setDraft(initialData);
    } else if (isOpen) {
      setDraft(defaultDraft);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const canCreate =
    draft.title.trim().length >= 2 &&
    draft.description.trim().length >= 2 &&
    Number(draft.cost) > 0 &&
    draft.categoryIds.length > 0 &&
    Number(draft.durationMins) >= 5;

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
            <h3 className="text-xl font-semibold text-[#16202E]">{isEditing ? 'Edit Service' : 'New Service'}</h3>
          </div>

          <button
            type="button"
            disabled={!canCreate}
            onClick={() => {
              onCreate(draft);
              // setDraft(defaultDraft); // Don't reset here, let parent/useEffect handle it on close/reopen
              onClose();
            }}
            className="bg-[#06202E] text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0a2e42] transition-colors"
          >
            {isEditing ? 'Save Changes' : 'Create'}
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
                    type="number"
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
                <option value="">Select a category</option>
                {categories.filter(c => c.value !== 'all').map((c) => (
                  <option key={c.id} value={c.value}>
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

const ProviderServicesPage: React.FC = () => {
  const { data: servicesData, isLoading } = useProviderServices();
  const createServiceMutation = useCreateProviderService();
  const updateServiceMutation = useUpdateProviderService();
  const deleteServiceMutation = useDeleteProviderService();

  const [selectedCategoryValue, setSelectedCategoryValue] = useState<string | null>(categories[0]?.value ?? null);
  const [isServicesExpanded, setIsServicesExpanded] = useState(true);
  const [openServiceMenuId, setOpenServiceMenuId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingService, setEditingService] = useState<CreateServiceDraft | undefined>(undefined);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.value === selectedCategoryValue) ?? null,
    [selectedCategoryValue]
  );

  const visibleServices = useMemo(() => {
    if (!servicesData?.data || !selectedCategoryValue) return [];
    if (selectedCategoryValue === 'all') return servicesData.data;
    return servicesData.data.filter((s) => s.category.toLowerCase() === selectedCategoryValue.toLowerCase());
  }, [servicesData, selectedCategoryValue]);

  // Calculate counts for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: servicesData?.data?.length || 0 };
    servicesData?.data?.forEach(s => {
      const cat = s.category.toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [servicesData]);

  const handleCreateOrUpdate = async (draft: CreateServiceDraft) => {
    if (editingService && draft.id) {
      // Update
      await updateServiceMutation.mutateAsync({
        id: draft.id,
        name: draft.title,
        description: draft.description,
        price: Number(draft.cost),
        category: draft.categoryIds[0],
        duration: Number(draft.durationMins),
        // uses: draft.description // Mapping uses to description for now if needed, or separate field
      });
    } else {
      // Create
      await createServiceMutation.mutateAsync({
        name: draft.title,
        category: draft.categoryIds[0],
        description: draft.description,
        price: Number(draft.cost),
        duration: Number(draft.durationMins),
        uses: draft.description // Using description as uses for now, or could be separate
      });
    }
    setEditingService(undefined);
  };

  const handleEditClick = (service: ProviderServiceItem) => {
    setEditingService({
      id: service.id || service._id,
      title: service.name,
      description: service.description || '',
      durationMins: service.duration?.toString() || '',
      cost: service.price.toString(),
      categoryIds: [service.category],
    });
    setIsCreateOpen(true);
    setOpenServiceMenuId(null);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await deleteServiceMutation.mutateAsync(id);
    }
    setOpenServiceMenuId(null);
  };

  return (
    <div className="h-[calc(100vh-64px-64px)] flex bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
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
                Services ({visibleServices.length})
              </span>
              {isServicesExpanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {isServicesExpanded && (
              <div className="mt-4 space-y-2">
                {categories.map((c) => {
                  const active = c.value === selectedCategoryValue;
                  const count = categoryCounts[c.value.toLowerCase()] || 0;
                  return (
                    <div key={c.id} className="relative">
                      <div
                        onClick={() => setSelectedCategoryValue(c.value)}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer ${active ? 'text-[#16202E] bg-gray-50' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-sm">{c.name}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{count}</span>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setEditingService(undefined);
                    setIsCreateOpen(true);
                  }}
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
      <section className="flex-1 bg-white overflow-y-auto">
        <div className="p-8">
          <h3 className="text-lg font-semibold text-[#16202E] mb-6">
            {selectedCategory ? selectedCategory.name : 'Services'}
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : visibleServices.length > 0 ? (
            <div className="space-y-6">
              {visibleServices.map((s) => (
                <div key={s.id || s._id} className="relative bg-white border border-gray-200 rounded-lg">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-lg" />
                  <div className="flex items-center justify-between px-6 py-5">
                    <div>
                      <p className="text-sm font-semibold text-[#16202E]">{s.name}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {s.duration || ''} mins <span className="mx-2">·</span> {formatNaira(s.price)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{s.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-500">
                        {s.metadata?.preparation && <span className="bg-gray-100 px-2 py-1 rounded">Prep: {s.metadata.preparation}</span>}
                        {s.metadata?.report_time && <span className="bg-gray-100 px-2 py-1 rounded">Report: {s.metadata.report_time}</span>}
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenServiceMenuId((prev) => (prev === (s.id || s._id) ? null : (s.id || s._id)))}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                        aria-label="Service actions"
                      >
                        <FiMoreVertical />
                      </button>

                      {openServiceMenuId === (s.id || s._id) && (
                        <div
                          className="absolute right-0 top-10 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10"
                          onMouseLeave={() => setOpenServiceMenuId(null)}
                        >
                          <button
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => handleEditClick(s)}
                          >
                            Edit
                          </button>
                          <button
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => handleDeleteClick(s.id || s._id!)}
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
                <div className="mx-auto w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center mb-6">
                  <FiMoreVertical className="w-8 h-8 text-gray-300" />
                </div>
                <h4 className="text-lg font-semibold text-[#16202E] mb-2">No services to display</h4>
                <p className="text-sm text-gray-500 mb-6">
                  Your service menu and booking page are currently empty. <br />
                  Create a new service to start booking appointments.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingService(undefined);
                    setIsCreateOpen(true);
                  }}
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
        onClose={() => {
          setIsCreateOpen(false);
          setEditingService(undefined);
        }}
        categories={categories}
        onCreate={handleCreateOrUpdate}
        initialData={editingService}
        isEditing={!!editingService}
      />
    </div>
  );
};

export default ProviderServicesPage;


