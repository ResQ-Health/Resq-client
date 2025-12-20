import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiMoreVertical, FiSearch, FiFileText } from 'react-icons/fi';
import {
  type ProviderTransaction,
  useBanks,
  usePaymentReceipt,
  useProviderProfileQuery,
  useProviderServices,
  useProviderTransactions,
  useSaveBankAccount,
  useVerifyBankAccount,
} from '../../services/providerService';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import resqLogo from '/icons/Logomark (1).png';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

const toYmd = (d: Date) => d.toISOString().slice(0, 10);
const toDateInput = (d: Date) => toYmd(d);
const currentYearRange = () => {
  const y = new Date().getFullYear();
  // Use string literals (not Date -> ISO) to avoid timezone day-shifts
  return { year: y, start: `${y}-01-01`, end: `${y}-12-31` };
};
const addMonths = (d: Date, months: number) => {
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next;
};
const addYears = (d: Date, years: number) => {
  const next = new Date(d);
  next.setFullYear(next.getFullYear() + years);
  return next;
};
type TimeRangePreset = 'all' | '1m' | '3m' | '6m' | '1y' | '5y' | '10y' | 'custom';
const getPresetRange = (preset: TimeRangePreset) => {
  const now = new Date();
  const today = toDateInput(now);

  if (preset === 'all') return { start: '', end: '' };
  if (preset === 'custom') return null;

  if (preset === '1y') {
    // 1 year = current calendar year (from beginning of year to end)
    const { start, end } = currentYearRange();
    return { start, end };
  }

  const start =
    preset === '1m' ? toDateInput(addMonths(now, -1)) :
      preset === '3m' ? toDateInput(addMonths(now, -3)) :
        preset === '6m' ? toDateInput(addMonths(now, -6)) :
          preset === '5y' ? toDateInput(addYears(now, -5)) :
            preset === '10y' ? toDateInput(addYears(now, -10)) :
              '';

  return { start, end: today };
};
const toPrettyDateTime = (iso?: string) => {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
};
const normalizePaymentStatus = (s?: string) => {
  const v = String(s || '').toLowerCase();
  if (v === 'success' || v === 'successful' || v === 'paid') return 'Success';
  if (v === 'completed' || v === 'complete') return 'Success';
  if (v === 'failed' || v === 'failure') return 'Failed';
  if (v === 'pending') return 'Pending';
  return s || 'Unknown';
};

const ProviderPaymentsPage: React.FC = () => {
  // Setup bank details state
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [prefillBankName, setPrefillBankName] = useState('');

  // Queries
  const { data: banksData, isLoading: isLoadingBanks } = useBanks();
  const providerProfileQuery = useProviderProfileQuery();
  const verifyAccountMutation = useVerifyBankAccount();
  const saveBankAccountMutation = useSaveBankAccount();
  const providerServicesQuery = useProviderServices();

  // Transactions filters (draft)
  const [historyQuery, setHistoryQuery] = useState('');
  const [serviceIdDraft, setServiceIdDraft] = useState('');
  const [startDateDraft, setStartDateDraft] = useState(() => currentYearRange().start); // default: from start of year
  const [endDateDraft, setEndDateDraft] = useState(() => currentYearRange().end); // default: to end of year
  const [timeRangePreset, setTimeRangePreset] = useState<TimeRangePreset>('1y');

  // Applied filters (used by query)
  const [serviceId, setServiceId] = useState('');
  const [startDate, setStartDate] = useState(startDateDraft);
  const [endDate, setEndDate] = useState(endDateDraft);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [showAllServicesModal, setShowAllServicesModal] = useState(false);
  const [serviceBreakdownQuery, setServiceBreakdownQuery] = useState('');
  const [showZeroRevenueServices, setShowZeroRevenueServices] = useState(true);

  // Transaction actions (details/receipt)
  const [selectedTransaction, setSelectedTransaction] = useState<ProviderTransaction | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [detailsModalTab, setDetailsModalTab] = useState<'details' | 'receipt'>('details');
  const [autoDownloadReceipt, setAutoDownloadReceipt] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebouncedValue(historyQuery.trim(), 400);
  const { year: currentYear, start: currentYearStart, end: currentYearEnd } = useMemo(() => currentYearRange(), []);
  const isDefaultYearRange = startDate === currentYearStart && endDate === currentYearEnd;
  const periodLabel = useMemo(() => {
    switch (timeRangePreset) {
      case 'all': return 'All time';
      case '1m': return 'Last 1 month';
      case '3m': return 'Last 3 months';
      case '6m': return 'Last 6 months';
      case '1y': return `1 year (${currentYear})`;
      case '5y': return 'Last 5 years';
      case '10y': return 'Last 10 years';
      case 'custom': return 'Custom range';
      default: return '';
    }
  }, [timeRangePreset, currentYear]);

  // When preset changes, update applied + draft dates (except custom)
  useEffect(() => {
    const range = getPresetRange(timeRangePreset);
    if (!range) return; // custom
    setStartDateDraft(range.start);
    setEndDateDraft(range.end);
    setStartDate(range.start);
    setEndDate(range.end);
    setPage(1);
  }, [timeRangePreset]);

  const transactionsQuery = useProviderTransactions({
    page,
    limit,
    service_id: serviceId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    search: debouncedSearch || undefined,
  });

  const transactions = transactionsQuery.data?.data?.transactions ?? [];
  const summary = transactionsQuery.data?.data?.summary;
  const pagination = transactionsQuery.data?.pagination;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const isInitialTransactionsLoad = transactionsQuery.isLoading;
  const isUpdatingTransactions = transactionsQuery.isFetching && !transactionsQuery.isLoading;
  const isSearchTyping = historyQuery.trim() !== debouncedSearch;

  const receiptAppointmentId = selectedTransaction?.appointment_id ? String(selectedTransaction.appointment_id) : undefined;
  const receiptQuery = usePaymentReceipt(showTransactionDetails ? receiptAppointmentId : undefined);

  const servicesForFilter = useMemo(() => {
    const data = providerServicesQuery.data?.data || [];
    return [...data].sort((a, b) => a.name.localeCompare(b.name));
  }, [providerServicesQuery.data?.data]);

  const byServiceItems = useMemo(() => {
    const raw = (summary as any)?.by_service;
    let arr: any[] = [];

    if (Array.isArray(raw)) arr = raw;
    else if (raw && typeof raw === 'object') {
      // Some backends may return { total: [...] } or similar wrappers
      if (Array.isArray(raw.total)) arr = raw.total;
      else if (Array.isArray(raw.items)) arr = raw.items;
      else if (Array.isArray(raw.data)) arr = raw.data;
    }

    return arr
      .map((x) => {
        const name =
          x.service_name ??
          x.name ??
          x.service?.name ??
          x.service?.service_name ??
          'Service';

        const amount =
          x.total_amount ??
          x.amount ??
          x.totalRevenue ??
          x.revenue ??
          0;

        const count =
          x.total_count ??
          x.count ??
          x.total ??
          0;

        const key = x.service_id ?? x.id ?? x.service?._id ?? x.service?.id ?? name;

        return {
          key: String(key),
          name: String(name),
          amount: Number(amount) || 0,
          count: Number(count) || 0,
        };
      })
      .filter((x) => x.name); // keep named rows (allow 0 amounts/counts)
  }, [summary]);

  // Ensure we show ALL provider services, even those with ₦0 revenue.
  const byServiceWithZeros = useMemo(() => {
    const summaryById = new Map<string, { amount: number; count: number; name?: string }>();
    const summaryByName = new Map<string, { amount: number; count: number; name?: string }>();

    byServiceItems.forEach((x) => {
      summaryById.set(String(x.key), { amount: x.amount, count: x.count, name: x.name });
      summaryByName.set(String(x.name).toLowerCase(), { amount: x.amount, count: x.count, name: x.name });
    });

    const merged = servicesForFilter.map((svc) => {
      const idKey = String(svc.id || svc._id || '');
      const nameKey = String(svc.name || '').toLowerCase();
      const found =
        (idKey && summaryById.get(idKey)) ||
        (nameKey && summaryByName.get(nameKey)) ||
        undefined;

      return {
        key: idKey || nameKey || svc.name,
        name: svc.name,
        amount: found?.amount ?? 0,
        count: found?.count ?? 0,
      };
    });

    // Add any summary items that aren't in the provider services list (defensive)
    const seen = new Set(merged.map((m) => String(m.key)));
    byServiceItems.forEach((x) => {
      if (!seen.has(String(x.key))) {
        merged.push({ key: x.key, name: x.name, amount: x.amount, count: x.count });
      }
    });

    return merged;
  }, [byServiceItems, servicesForFilter]);

  const byServiceForDisplay = useMemo(() => {
    const q = serviceBreakdownQuery.trim().toLowerCase();
    return byServiceWithZeros
      .filter((x) => (showZeroRevenueServices ? true : x.amount !== 0 || x.count !== 0))
      .filter((x) => (q ? x.name.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        // Show higher earners first, then by name
        const diff = (b.amount || 0) - (a.amount || 0);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      });
  }, [byServiceWithZeros, serviceBreakdownQuery, showZeroRevenueServices]);

  const byServiceTopPreview = useMemo(() => byServiceForDisplay.slice(0, 6), [byServiceForDisplay]);

  const openDetails = (t: ProviderTransaction) => {
    setSelectedTransaction(t);
    setShowTransactionDetails(true);
    setDetailsModalTab('details');
    setOpenMenuId(null);
  };

  const openReceiptTab = (t: ProviderTransaction, autoDownload = false) => {
    setSelectedTransaction(t);
    setShowTransactionDetails(true);
    setDetailsModalTab('receipt');
    setAutoDownloadReceipt(autoDownload);
    setOpenMenuId(null);
  };

  const generateReceiptPDF = async (): Promise<Blob | null> => {
    if (!receiptRef.current) return null;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      return pdf.output('blob');
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
      return null;
    }
  };

  const downloadReceiptPdf = async (appointmentId: string) => {
    const toastId = toast.loading('Generating receipt...');
    try {
      const pdfBlob = await generateReceiptPDF();
      if (!pdfBlob) {
        toast.error('Failed to generate receipt', { id: toastId });
        return;
      }

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ResQ-Receipt-${appointmentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded successfully', { id: toastId });
    } catch (err) {
      console.error('Failed to download receipt:', err);
      toast.error('Failed to download receipt', { id: toastId });
    }
  };

  // Auto-download flow for the kebab menu "Download receipt" (single modal)
  useEffect(() => {
    if (!autoDownloadReceipt) return;
    if (!showTransactionDetails) return;
    if (!receiptAppointmentId) return;
    if (!receiptQuery.data?.success) return;
    if (!receiptRef.current) return;

    // fire-and-forget; close after starting the download
    downloadReceiptPdf(receiptAppointmentId).finally(() => {
      setAutoDownloadReceipt(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownloadReceipt, receiptAppointmentId, receiptQuery.data?.success, showTransactionDetails]);

  const allServicesTotals = useMemo(() => {
    const totalAmount =
      Number((summary as any)?.total_amount ?? (summary as any)?.totalAmount ?? NaN);
    const totalCount =
      Number((summary as any)?.total_count ?? (summary as any)?.totalCount ?? NaN);

    const fallbackAmount = byServiceItems.reduce((acc, x) => acc + (Number(x.amount) || 0), 0);
    const fallbackCount = byServiceItems.reduce((acc, x) => acc + (Number(x.count) || 0), 0);

    return {
      amount: Number.isFinite(totalAmount) ? totalAmount : fallbackAmount,
      count: Number.isFinite(totalCount) ? totalCount : fallbackCount,
    };
  }, [byServiceItems, summary]);

  const handleVerifyAccount = () => {
    if (!bankCode) {
      toast.error('Please select a bank');
      return;
    }
    if (!accountNumber || accountNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit account number');
      return;
    }

    setIsVerifying(true);
    setAccountName(''); // Reset previous account name
    setBankSaved(false);

    verifyAccountMutation.mutate(
      { bank_code: bankCode, account_number: accountNumber },
      {
        onSuccess: (data) => {
          setAccountName(data.data.account_name);
          toast.success('Account verified successfully');
        },
        onError: (error: any) => {
          const msg = error.response?.data?.message || 'Verification failed';
          toast.error(msg);
          setAccountName('');
        },
        onSettled: () => {
          setIsVerifying(false);
        }
      }
    );
  };

  const sortedBanks = useMemo(() => {
    if (!banksData?.data) return [];
    return [...banksData.data].sort((a, b) => a.name.localeCompare(b.name));
  }, [banksData]);

  // Prefill from provider profile (if bank details already exist)
  useEffect(() => {
    if (!providerProfileQuery.data) return;
    const res: any = providerProfileQuery.data;
    const provider = res?.data?.provider ?? {};

    // Backend might return bank details with slightly different keys.
    const bank =
      provider.bank_account ??
      provider.bank_details ??
      provider.bankAccount ??
      provider.payout_bank ??
      provider.settlement_bank ??
      provider.bank ??
      null;

    const rawBankCode =
      bank?.bank_code ??
      bank?.bankCode ??
      bank?.code ??
      provider.bank_code ??
      provider.bankCode ??
      '';

    const rawBankName =
      bank?.bank_name ??
      bank?.bankName ??
      bank?.name ??
      provider.bank_name ??
      provider.bankName ??
      '';

    const rawAccountNumber =
      bank?.account_number ??
      bank?.accountNumber ??
      provider.account_number ??
      provider.accountNumber ??
      '';

    const rawAccountName =
      bank?.account_name ??
      bank?.accountName ??
      provider.account_name ??
      provider.accountName ??
      '';

    if (rawBankCode) setBankCode(String(rawBankCode));
    if (rawBankName) setPrefillBankName(String(rawBankName));
    if (rawAccountNumber) setAccountNumber(String(rawAccountNumber).replace(/[^\d]/g, '').slice(0, 10));
    if (rawAccountName) setAccountName(String(rawAccountName));

    if (rawBankCode || rawBankName || rawAccountNumber || rawAccountName) {
      setBankSaved(true);
    }
  }, [providerProfileQuery.data]);

  // If profile provided bank name but not bank code, map it once banks load
  useEffect(() => {
    if (bankCode) return;
    if (!prefillBankName) return;
    if (!sortedBanks.length) return;

    const match = sortedBanks.find((b) => b.name.toLowerCase() === prefillBankName.toLowerCase());
    if (match) setBankCode(match.code);
  }, [bankCode, prefillBankName, sortedBanks]);

  const selectedBankName = useMemo(() => {
    if (!bankCode) return '';
    const b = sortedBanks.find((x) => x.code === bankCode);
    return b?.name || '';
  }, [bankCode, sortedBanks]);

  const handleSaveBankDetails = () => {
    if (!bankCode) {
      toast.error('Please select a bank');
      return;
    }
    if (!accountNumber || accountNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit account number');
      return;
    }
    if (!accountName) {
      toast.error('Please verify the account first');
      return;
    }

    saveBankAccountMutation.mutate(
      {
        bank_code: bankCode,
        bank_name: selectedBankName || bankCode,
        account_number: accountNumber,
        account_name: accountName,
      },
      {
        onSuccess: () => {
          setBankSaved(true);
        },
        onError: () => {
          setBankSaved(false);
        },
      }
    );
  };

  return (
    <div className="space-y-10">
      {/* Setup bank details */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
        <h2 className="text-xl font-semibold text-[#16202E] mb-2">Setup your bank details</h2>
        <p className="text-sm text-gray-500 mb-8">
          To ensure seamless payouts for your services, verify your bank account.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-6 items-end max-w-4xl">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Bank</label>
            <div className="relative">
              <select
                value={bankCode}
                onChange={(e) => {
                  setBankCode(e.target.value);
                  setAccountName(''); // Reset account name on bank change
                  setBankSaved(false);
                }}
                disabled={isLoadingBanks}
                className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">{isLoadingBanks ? 'Loading banks...' : 'Select bank'}</option>
                {sortedBanks.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Account number</label>
            <input
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/[^\d]/g, '').slice(0, 10));
                setAccountName(''); // Reset account name on number change
                setBankSaved(false);
              }}
              placeholder="Account number"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
            />
          </div>

          <button
            type="button"
            onClick={handleVerifyAccount}
            disabled={isVerifying || !bankCode || accountNumber.length !== 10}
            className="bg-[#06202E] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors disabled:opacity-70 disabled:cursor-not-allowed min-w-[180px]"
          >
            {isVerifying ? 'Verifying...' : 'Verify Account Details'}
          </button>
        </div>

        {/* Account Name Display */}
        {accountName && (
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2 text-green-700">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-medium text-sm">
                Account Name: <span className="font-bold">{accountName}</span>
              </span>
              {bankSaved && (
                <span className="ml-auto text-xs font-semibold text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded-full">
                  Saved
                </span>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveBankDetails}
                disabled={saveBankAccountMutation.isPending || !bankCode || accountNumber.length !== 10 || !accountName}
                className="bg-[#06202E] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saveBankAccountMutation.isPending ? 'Saving...' : 'Save Bank Details'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Payment History */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-[#16202E]">Payment History</h3>
            <div className="text-sm text-gray-500 mt-1">
              {startDate && endDate ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>
                    Showing <span className="font-medium text-[#16202E]">{startDate}</span> –{' '}
                    <span className="font-medium text-[#16202E]">{endDate}</span>
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{periodLabel}</span>
                  <button
                    type="button"
                    onClick={() => {
                      // See all = remove date filter
                      setTimeRangePreset('all');
                      setStartDateDraft('');
                      setEndDateDraft('');
                      setStartDate('');
                      setEndDate('');
                      setPage(1);
                    }}
                    className="text-sm font-medium text-[#06202E] hover:underline"
                  >
                    See all
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Showing all dates</span>
                  <span className="text-gray-400">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Back to default year range
                      setTimeRangePreset('1y');
                      setStartDateDraft(currentYearStart);
                      setEndDateDraft(currentYearEnd);
                      setStartDate(currentYearStart);
                      setEndDate(currentYearEnd);
                      setPage(1);
                    }}
                    className="text-sm font-medium text-[#06202E] hover:underline"
                  >
                    View {currentYear} only
                  </button>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Default is the full year. You can change the date range anytime using the filters.
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="relative w-full max-w-[420px]">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            {(isUpdatingTransactions || isSearchTyping) && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 inline-block w-4 h-4 border-2 border-gray-300 border-t-[#06202E] rounded-full animate-spin" />
            )}
            <input
              value={historyQuery}
              onChange={(e) => {
                setHistoryQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by appointment id, reference, patient..."
              className="w-full pl-11 pr-10 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
            />
          </div>

          {/* Filters + Apply */}
          <div className="flex flex-wrap items-center gap-4 justify-end">
            {/* Time range filter */}
            <div className="relative">
              <select
                value={timeRangePreset}
                onChange={(e) => {
                  setTimeRangePreset(e.target.value as TimeRangePreset);
                }}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              >
                <option value="1y">1 year (this year)</option>
                <option value="6m">Last 6 months</option>
                <option value="3m">Last 3 months</option>
                <option value="1m">Last 1 month</option>
                <option value="5y">Last 5 years</option>
                <option value="10y">Last 10 years</option>
                <option value="all">All time</option>
                <option value="custom">Custom (from / to)</option>
              </select>
              <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>

            {/* Service filter */}
            <div className="relative">
              <select
                value={serviceIdDraft}
                onChange={(e) => setServiceIdDraft(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              >
                <option value="">All services</option>
                {servicesForFilter.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDateDraft}
                onChange={(e) => {
                  setStartDateDraft(e.target.value);
                  setTimeRangePreset('custom');
                }}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm min-w-[170px] focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={endDateDraft}
                onChange={(e) => {
                  setEndDateDraft(e.target.value);
                  setTimeRangePreset('custom');
                }}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm min-w-[170px] focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (startDateDraft && endDateDraft && startDateDraft > endDateDraft) {
                  toast.error('Start date cannot be after end date');
                  return;
                }
                setServiceId(serviceIdDraft);
                setStartDate(startDateDraft);
                setEndDate(endDateDraft);
                setPage(1);
              }}
              disabled={isUpdatingTransactions}
              className="bg-[#06202E] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isUpdatingTransactions ? 'Loading…' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="text-sm text-gray-500">Total revenue</div>
            <div className="text-2xl font-semibold text-[#16202E] mt-2">
              {formatNaira(Number(summary?.total_amount ?? 0))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="text-sm text-gray-500">Total transactions</div>
            <div className="text-2xl font-semibold text-[#16202E] mt-2">
              {Number(summary?.total_count ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-3">By service</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-700 font-medium">All services</div>
                <div className="text-[#16202E] font-semibold">
                  {formatNaira(allServicesTotals.amount)}{' '}
                  <span className="text-gray-400 font-normal">({allServicesTotals.count})</span>
                </div>
              </div>
              <hr className="border-gray-100" />
              {byServiceTopPreview.length === 0 ? (
                <div className="text-sm text-gray-400">No service breakdown</div>
              ) : (
                byServiceTopPreview.map((s) => (
                  <div key={s.key} className="flex items-center justify-between text-sm">
                    <div className="text-gray-700 truncate max-w-[60%]">{s.name}</div>
                    <div className="text-[#16202E] font-semibold">
                      {formatNaira(s.amount)} <span className="text-gray-400 font-normal">({s.count})</span>
                    </div>
                  </div>
                ))
              )}
              {byServiceForDisplay.length > 6 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAllServicesModal(true)}
                    className="text-sm font-medium text-[#06202E] hover:underline"
                  >
                    View all services ({byServiceForDisplay.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table / Empty state */}
        {isInitialTransactionsLoad ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10">
            <div className="h-[220px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <LoadingSpinner fullScreen={false} size="md" />
                <div className="text-gray-500 text-sm">Loading transactions…</div>
              </div>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10">
            <div className="h-[380px] flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100">
                  <FiFileText size={40} className="text-gray-300" />
                </div>
                <h4 className="text-xl font-semibold text-[#16202E]">No payments to display</h4>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
            {isUpdatingTransactions && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-start justify-center pt-6 z-10">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
                  <LoadingSpinner fullScreen={false} size="sm" />
                  Loading…
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/60 text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-medium text-left w-12">
                      <input type="checkbox" className="accent-[#06202E]" aria-label="Select all" />
                    </th>
                    <th className="px-6 py-4 font-medium text-left">
                      <div className="flex items-center gap-2">
                        Amount
                        <span className="text-gray-400">↕</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 font-medium text-left">Payment description</th>
                    <th className="px-6 py-4 font-medium text-left">Payment method</th>
                    <th className="px-6 py-4 font-medium text-left">Date</th>
                    <th className="px-6 py-4 font-medium text-right w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t) => {
                    const id = String(t.id || t.appointment_id || t._id || '');
                    const paymentAmount = Number(t.payment?.amount ?? t.amount ?? 0);
                    const statusLabel = normalizePaymentStatus(String(t.payment?.status || t.payment?.status || t.status || ''));
                    const method = t.payment?.payment_method || t.payment?.method || t.payment?.channel || '—';
                    const serviceName = t.service?.name || t.service_info?.name || 'Service';
                    const patient = t.patient || t.patient_info || {};
                    const patientName = patient.full_name || patient.name || 'Patient';
                    const reference = t.payment?.paystack_reference || t.payment?.reference || '';
                    const date = toPrettyDateTime(
                      t.payment?.paid_at || t.payment?.paidAt || t.payment?.created_at || t.paid_at || t.created_at
                    );

                    const isSuccess = String(statusLabel).toLowerCase() === 'success';
                    const isFailed = String(statusLabel).toLowerCase() === 'failed';

                    return (
                      <tr key={id} className="hover:bg-gray-50/40">
                        <td className="px-6 py-4">
                          <input type="checkbox" className="accent-[#06202E]" aria-label={`Select ${id}`} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-[#16202E]">{formatNaira(paymentAmount)}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isSuccess
                                ? 'bg-green-100 text-green-700'
                                : isFailed
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          <div className="font-medium text-[#16202E]">{serviceName}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[520px]">
                            {patientName}{reference ? ` • Ref: ${reference}` : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{method}</td>
                        <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{date || '—'}</td>
                        <td className="px-6 py-4 text-right relative">
                          <button
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                            onClick={() => setOpenMenuId((prev) => (prev === id ? null : id))}
                            aria-label="Row actions"
                          >
                            <FiMoreVertical />
                          </button>

                          {openMenuId === id && (
                            <div
                              className="absolute right-6 top-12 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10"
                              onMouseLeave={() => setOpenMenuId(null)}
                            >
                              <button
                                type="button"
                                onClick={() => openDetails(t)}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                View details
                              </button>
                              <button
                                type="button"
                                onClick={() => openReceiptTab(t, true)}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Download receipt
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
              <div className="text-sm text-gray-500">
                Page {pagination?.page ?? page} of {pagination?.pages ?? 1} • {pagination?.total ?? transactions.length} total
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
                  disabled={!!pagination && (pagination.page >= pagination.pages)}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Transaction details modal */}
      {showTransactionDetails && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="text-lg font-semibold text-[#16202E]">
                  {detailsModalTab === 'details' ? 'Transaction details' : 'Receipt'}
                </div>
                <div className="text-sm text-gray-500">Appointment ID: {selectedTransaction.appointment_id}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTransactionDetails(false);
                  setSelectedTransaction(null);
                  setAutoDownloadReceipt(false);
                  setDetailsModalTab('details');
                }}
                className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="inline-flex rounded-xl bg-gray-50 p-1 border border-gray-100">
                <button
                  type="button"
                  onClick={() => setDetailsModalTab('details')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${detailsModalTab === 'details' ? 'bg-white text-[#16202E] shadow-sm' : 'text-gray-600 hover:text-[#16202E]'
                    }`}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsModalTab('receipt')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${detailsModalTab === 'receipt' ? 'bg-white text-[#16202E] shadow-sm' : 'text-gray-600 hover:text-[#16202E]'
                    }`}
                >
                  Receipt
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {detailsModalTab === 'details' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs text-gray-500 mb-1">Patient</div>
                      <div className="text-sm font-semibold text-[#16202E]">
                        {(selectedTransaction.patient as any)?.name || (selectedTransaction.patient as any)?.full_name || '—'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(selectedTransaction.patient as any)?.email || '—'} • {(selectedTransaction.patient as any)?.phone || (selectedTransaction.patient as any)?.phone_number || '—'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs text-gray-500 mb-1">Service</div>
                      <div className="text-sm font-semibold text-[#16202E]">{(selectedTransaction.service as any)?.name || '—'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(selectedTransaction.service as any)?.category || '—'} • ₦{Number((selectedTransaction.service as any)?.price ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                      <div className="text-xs text-gray-500 mb-1">Payment</div>
                      <div className="text-sm text-gray-700">
                        Method: <span className="font-medium text-[#16202E]">{(selectedTransaction.payment as any)?.payment_method || '—'}</span>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        Amount: <span className="font-semibold text-[#16202E]">{formatNaira(Number((selectedTransaction.payment as any)?.amount ?? 0))}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Ref: {(selectedTransaction.payment as any)?.reference || '—'}
                      </div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                      <div className="text-xs text-gray-500 mb-1">Appointment</div>
                      <div className="text-sm text-gray-700">
                        Date: <span className="font-medium text-[#16202E]">{toPrettyDateTime((selectedTransaction.appointment as any)?.date || selectedTransaction.created_at)}</span>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        Time: <span className="font-medium text-[#16202E]">{(selectedTransaction.appointment as any)?.start_time || '—'} – {(selectedTransaction.appointment as any)?.end_time || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDetailsModalTab('receipt')}
                      className="px-5 py-3 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      View receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailsModalTab('receipt');
                        setAutoDownloadReceipt(true);
                      }}
                      className="px-5 py-3 rounded-lg text-sm font-medium bg-[#06202E] text-white hover:bg-[#0a2e42]"
                    >
                      Download receipt
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Receipt preview</div>
                    <button
                      type="button"
                      disabled={!receiptQuery.data?.success || receiptQuery.isLoading || !receiptAppointmentId}
                      onClick={() => receiptAppointmentId && downloadReceiptPdf(receiptAppointmentId)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-[#06202E] text-white hover:bg-[#0a2e42] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Download
                    </button>
                  </div>

                  {receiptQuery.isLoading ? (
                    <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">Loading receipt…</div>
                  ) : !receiptQuery.data?.success ? (
                    <div className="h-[200px] flex items-center justify-center text-red-600 text-sm">
                      Failed to load receipt. Please try again.
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold text-[#16202E]">RESQ Receipt</div>
                        <div className="text-xs text-gray-500">#{receiptQuery.data.data.appointment.booking_id}</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Patient</div>
                          <div className="font-medium text-[#16202E]">{receiptQuery.data.data.patient.name}</div>
                          <div className="text-xs text-gray-500">{receiptQuery.data.data.patient.email}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Appointment</div>
                          <div className="font-medium text-[#16202E]">{receiptQuery.data.data.appointment.type}</div>
                          <div className="text-xs text-gray-500">
                            {receiptQuery.data.data.appointment.date} • {receiptQuery.data.data.appointment.time}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-gray-200 pt-4 flex items-center justify-between text-sm">
                        <div className="text-gray-600">Total</div>
                        <div className="font-semibold text-[#16202E]">{receiptQuery.data.data.payment_summary.total}</div>
                      </div>
                    </div>
                  )}

                  {/* Hidden template for PDF generation (uses logo) */}
                  {receiptQuery.data?.success && (
                    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                      <div ref={receiptRef} className="w-[210mm] bg-white p-10 text-black font-sans">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                          <div className="flex items-center gap-3">
                            <img src={resqLogo} alt="RESQ" className="w-10 h-10" />
                            <div className="text-2xl font-bold">RESQ</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">RECEIPT</div>
                            <div className="text-gray-500 text-sm">#{receiptQuery.data.data.appointment.booking_id}</div>
                          </div>
                        </div>

                        <div className="flex justify-between mb-8">
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Date Issued</div>
                            <div className="text-base">{new Date().toLocaleDateString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Status</div>
                            <div className="text-base font-semibold">PAID</div>
                          </div>
                        </div>

                        <div className="flex gap-10 mb-8">
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 border-b pb-2">Patient</div>
                            <div className="text-sm space-y-1">
                              <div><span className="font-medium">Name:</span> {receiptQuery.data.data.patient.name}</div>
                              <div><span className="font-medium">Email:</span> {receiptQuery.data.data.patient.email}</div>
                              <div><span className="font-medium">Phone:</span> {receiptQuery.data.data.patient.mobile_number || 'N/A'}</div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 border-b pb-2">Appointment</div>
                            <div className="text-sm space-y-1">
                              <div><span className="font-medium">Service:</span> {receiptQuery.data.data.appointment.type}</div>
                              <div><span className="font-medium">Date:</span> {receiptQuery.data.data.appointment.date}</div>
                              <div><span className="font-medium">Time:</span> {receiptQuery.data.data.appointment.time}</div>
                              <div><span className="font-medium">Booking ID:</span> {receiptQuery.data.data.appointment.booking_id}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mb-10">
                          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Payment</div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-100">
                                <td className="py-3 px-4">{receiptQuery.data.data.payment_summary.service_cost}</td>
                                <td className="text-right py-3 px-4">{receiptQuery.data.data.payment_summary.service_cost}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr>
                                <td className="py-3 px-4 font-bold text-right">Total</td>
                                <td className="py-3 px-4 font-bold text-right">{receiptQuery.data.data.payment_summary.total}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        <div className="text-center text-gray-500 text-xs border-t pt-6">
                          Thank you for choosing RESQ Health.
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Service breakdown modal */}
      {showAllServicesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <div className="text-lg font-semibold text-[#16202E]">Service breakdown</div>
                <div className="text-sm text-gray-500">Revenue and count per service (includes ₦0 if enabled)</div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllServicesModal(false)}
                className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                aria-label="Close service breakdown"
              >
                Close
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-[420px]">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={serviceBreakdownQuery}
                    onChange={(e) => setServiceBreakdownQuery(e.target.value)}
                    placeholder="Search services..."
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
                  <input
                    type="checkbox"
                    className="accent-[#06202E]"
                    checked={showZeroRevenueServices}
                    onChange={(e) => setShowZeroRevenueServices(e.target.checked)}
                  />
                  Show ₦0 services
                </label>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">All services total</div>
                <div className="text-[#16202E] font-semibold">
                  {formatNaira(allServicesTotals.amount)}{' '}
                  <span className="text-gray-400 font-normal">({allServicesTotals.count})</span>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white sticky top-0 z-10 border-b border-gray-100">
                      <tr className="text-gray-500">
                        <th className="px-4 py-3 text-left font-medium">Service</th>
                        <th className="px-4 py-3 text-right font-medium">Revenue</th>
                        <th className="px-4 py-3 text-right font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {byServiceForDisplay.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                            No services match this filter
                          </td>
                        </tr>
                      ) : (
                        byServiceForDisplay.map((s) => (
                          <tr key={s.key} className="hover:bg-gray-50/40">
                            <td className="px-4 py-3 text-gray-700">{s.name}</td>
                            <td className="px-4 py-3 text-right font-semibold text-[#16202E]">{formatNaira(s.amount)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{s.count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderPaymentsPage;
