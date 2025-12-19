import React, { useMemo, useState } from 'react';
import {
  FiChevronDown,
  FiCopy,
  FiFilePlus,
  FiMail,
  FiMessageCircle,
  FiPaperclip,
  FiPhone,
  FiSearch,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  useCreateProviderSupportTicket,
  useProviderProfileQuery,
  useProviderSupportTicket,
  useProviderSupportTickets,
  useReplyProviderSupportTicket,
} from '../../services/providerService';

type SupportCategory =
  | 'Payments'
  | 'Appointments'
  | 'Profile & verification'
  | 'Services'
  | 'Technical issue'
  | 'Other';

const SUPPORT_EMAIL = 'support@resqhealth.com';
const SUPPORT_PHONE = '+2347072779831';

const ProviderSupportPage: React.FC = () => {
  const providerProfileQuery = useProviderProfileQuery();

  // Tickets list
  const [ticketsPage, setTicketsPage] = useState(1);
  const ticketsLimit = 10;
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ticketSearch, setTicketSearch] = useState('');
  const ticketsQuery = useProviderSupportTickets({
    page: ticketsPage,
    limit: ticketsLimit,
    status: statusFilter || undefined,
  });

  // Create ticket
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [newCategory, setNewCategory] = useState<SupportCategory>('Technical issue');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const createTicketMutation = useCreateProviderSupportTicket();

  // Ticket details + reply
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const ticketDetailsQuery = useProviderSupportTicket(selectedTicketId || undefined);
  const replyMutation = useReplyProviderSupportTicket();
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);

  // keep existing email fallback form (optional)
  const [category, setCategory] = useState<SupportCategory>('Technical issue');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const providerContext = useMemo(() => {
    const res: any = providerProfileQuery.data;
    const user = res?.data || {};
    const provider = user?.provider || {};
    return {
      userId: user?.id || '',
      providerId: provider?.id || '',
      providerName: provider?.provider_name || '',
      workEmail: provider?.work_email || user?.email || '',
      workPhone: provider?.work_phone || user?.phone_number || '',
      userType: user?.user_type || '',
    };
  }, [providerProfileQuery.data]);

  const mailtoHref = useMemo(() => {
    const title = subject.trim() || `${category} support request`;
    const bodyLines = [
      message.trim(),
      '',
      '---',
      'Provider context',
      `Provider name: ${providerContext.providerName || '—'}`,
      `Provider ID: ${providerContext.providerId || '—'}`,
      `User ID: ${providerContext.userId || '—'}`,
      `Email: ${providerContext.workEmail || '—'}`,
      `Phone: ${providerContext.workPhone || '—'}`,
      `User type: ${providerContext.userType || '—'}`,
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    const subj = encodeURIComponent(`[Provider Support] ${title}`);
    return `mailto:${SUPPORT_EMAIL}?subject=${subj}&body=${body}`;
  }, [category, message, providerContext, subject]);

  const copySupportDetails = async () => {
    const txt = [
      'Provider Support Request',
      `Category: ${category}`,
      `Subject: ${subject || '—'}`,
      `Message: ${message || '—'}`,
      '',
      'Provider context',
      `Provider name: ${providerContext.providerName || '—'}`,
      `Provider ID: ${providerContext.providerId || '—'}`,
      `User ID: ${providerContext.userId || '—'}`,
      `Email: ${providerContext.workEmail || '—'}`,
      `Phone: ${providerContext.workPhone || '—'}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(txt);
      toast.success('Copied support details');
    } catch {
      toast.error('Could not copy. Please copy manually.');
    }
  };

  const faqs = [
    {
      q: 'Why can’t I see my payments or transactions?',
      a: 'Transactions only appear for paid appointments. If you just changed filters (service/date/search), wait a moment for the table to update.',
    },
    {
      q: 'My bank details won’t verify — what should I check?',
      a: 'Confirm you selected the correct bank and that the account number is exactly 10 digits. If it still fails, contact support with the exact error message.',
    },
    {
      q: 'Why does my profile show “incomplete”?',
      a: 'Ensure your provider name, contact details, address, and working hours are set. You can save once your profile is at least 50% complete.',
    },
    {
      q: 'How do I update my working hours?',
      a: 'Go to Settings → Provider details → Business hours, update days/times, then click Save changes.',
    },
  ];

  if (providerProfileQuery.isLoading && !providerProfileQuery.data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner fullScreen={false} size="lg" />
      </div>
    );
  }

  const tickets = ticketsQuery.data?.data?.tickets ?? [];
  const pagination = ticketsQuery.data?.data?.pagination;
  const isInitialTicketsLoad = ticketsQuery.isLoading;
  const isUpdatingTickets = ticketsQuery.isFetching && !ticketsQuery.isLoading;

  const filteredTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) =>
      String(t.ticket_id).toLowerCase().includes(q) ||
      String(t.subject).toLowerCase().includes(q) ||
      String(t.category).toLowerCase().includes(q) ||
      String(t.status).toLowerCase().includes(q)
    );
  }, [ticketSearch, tickets]);

  const validateTicketFiles = (files: File[]) => {
    const max = 5;
    if (files.length > max) {
      toast.error('You can upload up to 5 attachments');
      return files.slice(0, max);
    }
    return files;
  };

  const submitNewTicket = () => {
    const subj = newSubject.trim();
    const msg = newMessage.trim();
    if (!subj) {
      toast.error('Subject is required');
      return;
    }
    if (msg.length < 10) {
      toast.error('Message must be at least 10 characters');
      return;
    }

    createTicketMutation.mutate(
      {
        category: newCategory,
        subject: subj,
        message: msg,
        attachment_files: newFiles.length ? newFiles : undefined,
      },
      {
        onSuccess: (res) => {
          const tid = res?.data?.ticket_id;
          setShowCreateTicket(false);
          setNewCategory('Technical issue');
          setNewSubject('');
          setNewMessage('');
          setNewFiles([]);
          if (tid) setSelectedTicketId(tid);
        },
      }
    );
  };

  const sendReply = () => {
    if (!selectedTicketId) return;
    const msg = replyText.trim();
    if (msg.length < 1) {
      toast.error('Please type a message');
      return;
    }
    replyMutation.mutate(
      {
        ticketId: selectedTicketId,
        message: msg,
        attachment_files: replyFiles.length ? replyFiles : undefined,
      },
      {
        onSuccess: () => {
          setReplyText('');
          setReplyFiles([]);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-[#16202E]">Support</h2>
          <p className="text-sm text-gray-500">
            Get help with your provider account, payments, bookings, and profile setup.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateTicket(true)}
          className="bg-[#06202E] text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors inline-flex items-center gap-2"
        >
          <FiFilePlus />
          New ticket
        </button>
      </div>

      {/* Quick contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#06202E]">
              <FiMessageCircle />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#16202E]">Chat with support</div>
              <div className="text-xs text-gray-500">Fastest way to resolve issues</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast('Chat is coming soon. Please email or call support for now.')}
            className="mt-4 w-full bg-[#06202E] text-white py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors"
          >
            Start chat
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#06202E]">
              <FiPhone />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#16202E]">Call support</div>
              <div className="text-xs text-gray-500">{SUPPORT_PHONE}</div>
            </div>
          </div>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="mt-4 block w-full text-center bg-white border border-gray-200 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Call now
          </a>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#06202E]">
              <FiMail />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#16202E]">Email support</div>
              <div className="text-xs text-gray-500">{SUPPORT_EMAIL}</div>
            </div>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 block w-full text-center bg-white border border-gray-200 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Compose email
          </a>
        </div>
      </div>

      {/* Tickets */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 relative">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#16202E]">Your support tickets</h3>
              <p className="text-sm text-gray-500">Track issues and replies from support.</p>
            </div>
            {isUpdatingTickets && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-[#06202E] rounded-full animate-spin" />
                Updating…
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <div className="relative w-full md:max-w-[380px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Search by ticket ID, subject, category, status…"
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setTicketsPage(1);
                  }}
                  className="appearance-none border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                >
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
          </div>

          {isInitialTicketsLoad ? (
            <div className="h-[280px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <LoadingSpinner fullScreen={false} size="md" />
                <div className="text-gray-500 text-sm">Loading tickets…</div>
              </div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-gray-500 text-sm">
              No tickets found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {filteredTickets.map((t) => (
                <button
                  key={t.ticket_id}
                  type="button"
                  onClick={() => setSelectedTicketId(t.ticket_id)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedTicketId === t.ticket_id ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#16202E] truncate">{t.subject}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">{t.ticket_id}</span> • {t.category} • {t.status}
                      </div>
                      {t.last_message && (
                        <div className="text-xs text-gray-600 mt-2 truncate">{t.last_message}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {t.messages_count ?? 0} msgs
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {pagination && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages} • {pagination.total} total
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTicketsPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setTicketsPage((p) => p + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ticket details panel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#16202E]">Ticket details</h3>
              <p className="text-sm text-gray-500">
                {selectedTicketId ? `Ticket ${selectedTicketId}` : 'Select a ticket to view messages.'}
              </p>
            </div>
            {selectedTicketId && (
              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="text-sm text-gray-500 hover:text-[#16202E]"
              >
                Close
              </button>
            )}
          </div>

          {!selectedTicketId ? (
            <div className="h-[420px] flex items-center justify-center text-gray-500 text-sm">
              No ticket selected.
            </div>
          ) : ticketDetailsQuery.isLoading ? (
            <div className="h-[420px] flex items-center justify-center">
              <LoadingSpinner fullScreen={false} size="md" />
            </div>
          ) : !ticketDetailsQuery.data?.success ? (
            <div className="h-[420px] flex items-center justify-center text-gray-500 text-sm">
              Failed to load ticket.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-[#16202E]">
                  {ticketDetailsQuery.data.data.subject}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {ticketDetailsQuery.data.data.category} • {ticketDetailsQuery.data.data.status}
                </div>
              </div>

              <div className="max-h-[340px] overflow-y-auto space-y-3 pr-1">
                {(ticketDetailsQuery.data.data.messages || []).map((m) => {
                  const isProvider = String(m.sender_role).toLowerCase() === 'provider';
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border px-4 py-3 ${isProvider ? 'border-[#06202E]/20 bg-[#06202E]/5' : 'border-gray-100 bg-white'}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-xs text-gray-500">
                          {isProvider ? 'You' : 'Support'} • {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{m.message}</div>
                      {!!m.attachments?.length && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.attachments.map((a, idx) => (
                            <a
                              key={`${a}-${idx}`}
                              href={a}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <FiPaperclip />
                              Attachment {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs text-gray-500 mb-2">Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm min-h-[90px] resize-none focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                  placeholder="Type your message…"
                />
                <div className="flex items-center justify-between gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      id="provider-support-reply-files"
                      onChange={(e) => {
                        const files = validateTicketFiles(Array.from(e.target.files || []));
                        setReplyFiles(files);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('provider-support-reply-files')?.click()}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                    >
                      <FiPaperclip />
                      Attach
                    </button>
                    {replyFiles.length > 0 && (
                      <div className="text-xs text-gray-500">{replyFiles.length} file(s)</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={replyMutation.isPending}
                    className="bg-[#06202E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0a2e42] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {replyMutation.isPending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAQ + legacy email fallback */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-[#16202E] mb-1">Frequently asked questions</h3>
          <p className="text-sm text-gray-500 mb-6">Quick answers to common provider questions.</p>

          <div className="divide-y divide-gray-100">
            {faqs.map((f, idx) => {
              const open = openFaq === idx;
              return (
                <button
                  key={f.q}
                  type="button"
                  onClick={() => setOpenFaq((v) => (v === idx ? null : idx))}
                  className="w-full text-left py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-medium text-[#16202E]">{f.q}</div>
                    <FiChevronDown className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>
                  {open && <div className="mt-2 text-sm text-gray-600">{f.a}</div>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-[#16202E] mb-1">Email support (fallback)</h3>
          <p className="text-sm text-gray-500 mb-6">Use this if ticketing is unavailable.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-2">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportCategory)}
                  className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                >
                  <option value="Payments">Payments</option>
                  <option value="Appointments">Appointments</option>
                  <option value="Profile & verification">Profile & verification</option>
                  <option value="Services">Services</option>
                  <option value="Technical issue">Technical issue</option>
                  <option value="Other">Other</option>
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary of the issue"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what happened and what you expected"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm min-h-[140px] resize-none focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              />
              <div className="text-xs text-gray-400 mt-2">
                Tip: include screenshots and exact error messages if possible.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={mailtoHref}
                onClick={(e) => {
                  if (!message.trim() || message.trim().length < 10) {
                    e.preventDefault();
                    toast.error('Please enter a message (min 10 characters).');
                  }
                }}
                className="flex-1 text-center bg-[#06202E] text-white py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors"
              >
                Email support
              </a>
              <button
                type="button"
                onClick={copySupportDetails}
                className="px-4 py-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <FiCopy />
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateTicket && (
        <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreateTicket(false)}>
          <div
            className="w-full max-w-[720px] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-[#16202E]">Create support ticket</div>
                <div className="text-sm text-gray-500">Describe your issue and optionally attach files (up to 5).</div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTicket(false)}
                className="text-sm text-gray-500 hover:text-[#16202E]"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Category</label>
                  <div className="relative">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as SupportCategory)}
                      className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                    >
                      <option value="Payments">Payments</option>
                      <option value="Appointments">Appointments</option>
                      <option value="Profile & verification">Profile & verification</option>
                      <option value="Services">Services</option>
                      <option value="Technical issue">Technical issue</option>
                      <option value="Other">Other</option>
                    </select>
                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Subject</label>
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Payment not reflecting"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Describe the issue (min 10 characters)…"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm min-h-[140px] resize-none focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    id="provider-support-new-files"
                    onChange={(e) => {
                      const files = validateTicketFiles(Array.from(e.target.files || []));
                      setNewFiles(files);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('provider-support-new-files')?.click()}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                  >
                    <FiPaperclip />
                    Attach files
                  </button>
                  {newFiles.length > 0 && <div className="text-xs text-gray-500">{newFiles.length} file(s)</div>}
                </div>

                <button
                  type="button"
                  onClick={submitNewTicket}
                  disabled={createTicketMutation.isPending}
                  className="bg-[#06202E] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0a2e42] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {createTicketMutation.isPending ? 'Submitting…' : 'Create ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderSupportPage;


