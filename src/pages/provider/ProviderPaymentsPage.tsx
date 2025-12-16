import React, { useMemo, useState } from 'react';
import { FiChevronDown, FiMoreVertical, FiSearch, FiFileText } from 'react-icons/fi';

type PaymentStatus = 'Success' | 'Failed';

type PaymentRow = {
  id: string;
  amount: number;
  status: PaymentStatus;
  description: string;
  method: string;
  date: string; // e.g. Apr 21, 3:50 PM
};

const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

const mockPayments: PaymentRow[] = [
  {
    id: 'pm1',
    amount: 50000,
    status: 'Success',
    description: 'Full blood count(FBC)',
    method: 'Transfer',
    date: 'Apr 21, 3:50 PM',
  },
  {
    id: 'pm2',
    amount: 50000,
    status: 'Failed',
    description: 'X-ray',
    method: 'USSD',
    date: 'Apr 22, 12:50 AM',
  },
  {
    id: 'pm3',
    amount: 50000,
    status: 'Failed',
    description: 'Echodiagram',
    method: 'Card',
    date: 'Apr 22, 2:50 PM',
  },
];

const banks = ['Access Bank', 'GTBank', 'First Bank', 'UBA', 'Zenith Bank'];

const ProviderPaymentsPage: React.FC = () => {
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [historyQuery, setHistoryQuery] = useState('');
  const [startDate, setStartDate] = useState('15 Apr 2025');
  const [endDate, setEndDate] = useState('21 Apr 2025');

  // Start empty like screenshot; click Generate to show table sample
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredPayments = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      [p.description, p.method, p.status, p.date]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [payments, historyQuery]);

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
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
              >
                <option value="">Select bank</option>
                {banks.map((b) => (
                  <option key={b} value={b}>
                    {b}
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
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
              placeholder="Account number"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
            />
          </div>

          <button
            type="button"
            className="bg-[#06202E] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors"
          >
            Verify Account Details
          </button>
        </div>
      </section>

      {/* Payment History */}
      <section className="space-y-6">
        <h3 className="text-2xl font-semibold text-[#16202E]">Payment History</h3>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="relative w-full max-w-[420px]">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="Search by date or service"
              className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#06202E]/10"
            />
          </div>

          {/* Date range + Generate */}
          <div className="flex flex-wrap items-center gap-4 justify-end">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm min-w-[170px]"
              >
                <span className="text-gray-700">{startDate}</span>
                <FiChevronDown className="text-gray-500" />
              </button>
              <span className="text-gray-400">–</span>
              <button
                type="button"
                className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm min-w-[170px]"
              >
                <span className="text-gray-700">{endDate}</span>
                <FiChevronDown className="text-gray-500" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPayments(mockPayments)}
              className="bg-[#06202E] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#0a2e42] transition-colors"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Table / Empty state */}
        {filteredPayments.length === 0 ? (
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
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/40">
                      <td className="px-6 py-4">
                        <input type="checkbox" className="accent-[#06202E]" aria-label={`Select ${p.id}`} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-[#16202E]">{formatNaira(p.amount)}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              p.status === 'Success'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{p.description}</td>
                      <td className="px-6 py-4 text-gray-700">{p.method}</td>
                      <td className="px-6 py-4 text-gray-700 whitespace-nowrap">{p.date}</td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                          onClick={() => setOpenMenuId((prev) => (prev === p.id ? null : p.id))}
                          aria-label="Row actions"
                        >
                          <FiMoreVertical />
                        </button>

                        {openMenuId === p.id && (
                          <div
                            className="absolute right-6 top-12 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10"
                            onMouseLeave={() => setOpenMenuId(null)}
                          >
                            <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50">
                              View details
                            </button>
                            <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50">
                              Download receipt
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProviderPaymentsPage;


