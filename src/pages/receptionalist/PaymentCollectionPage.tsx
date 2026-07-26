import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  HiOutlineBadgeCheck,
  HiOutlineBriefcase,
  HiOutlineCash,
  HiOutlineCheckCircle,
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCreditCard,
  HiOutlinePhone,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineUser,
  HiOutlineX,
} from "react-icons/hi";
import { DashboardLayout } from "../../components";
import { Button, Card } from "../../components/ui";
import { useGetJobsQuery, useGetJobByIdQuery, type Job, type PaymentMethod } from "../../store/services/jobsService";
import {
  useRecordPaymentMutation,
  useGetPaymentsQuery,
  type Payment,
  type PaymentState,
} from "../../store/services/paymentsService";
import { useAuth } from "../../context/AuthContext";
import { useAppSelector } from "../../store/hooks";
import { useGetUnreadCountQuery } from "../../store/services/notificationsService";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "CASH",
    label: "Cash",
    icon: <HiOutlineCash className="w-6 h-6" />,
    color: "border-green-400 bg-green-50 text-green-700",
  },
  {
    value: "MOBILE_MONEY",
    label: "Mobile Money",
    icon: <HiOutlinePhone className="w-6 h-6" />,
    color: "border-yellow-400 bg-yellow-50 text-yellow-700",
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    icon: <HiOutlineCreditCard className="w-6 h-6" />,
    color: "border-blue-400 bg-blue-50 text-blue-700",
  },
  {
    value: "CARD",
    label: "Card",
    icon: <HiOutlineBriefcase className="w-6 h-6" />,
    color: "border-purple-400 bg-purple-50 text-purple-700",
  },
];

// ─── Pending Balances Modal ───────────────────────────────────────────────────

function PendingBalancesModal({
  onClose,
  onCollect,
}: {
  onClose: () => void;
  onCollect: (job: Job) => void;
}) {
  const [search, setSearch] = useState("");
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const { data, isLoading, refetch } = useGetPaymentsQuery({ limit: 200 });
  const { data: fullJob } = useGetJobByIdQuery(collectingId ?? "", { skip: !collectingId });
  const payments = data?.payments ?? [];

  useEffect(() => {
    if (fullJob && collectingId && fullJob.id === collectingId) {
      setCollectingId(null);
      onCollect(fullJob);
      onClose();
    }
  }, [fullJob, collectingId]);

  const jobBalanceMap = new Map<string, { payment: Payment; balance: number }>();
  payments.forEach((p) => {
    const bal = Number(p.balance);
    if (bal > 0 && p.job && p.paymentState === "ONCREDIT") {
      const existing = jobBalanceMap.get(p.jobId);
      if (!existing || new Date(p.paidAt) > new Date(existing.payment.paidAt)) {
        jobBalanceMap.set(p.jobId, { payment: p, balance: bal });
      }
    }
  });

  const allEntries = Array.from(jobBalanceMap.values()).sort(
    (a, b) => new Date(b.payment.paidAt).getTime() - new Date(a.payment.paidAt).getTime()
  );
  const q = search.trim().toLowerCase();
  const filtered = q
    ? allEntries.filter(({ payment }) =>
        payment.job?.title?.toLowerCase().includes(q) ||
        payment.job?.jobNumber?.toLowerCase().includes(q) ||
        payment.job?.customer?.name?.toLowerCase().includes(q) ||
        payment.job?.customer?.phone?.toLowerCase().includes(q)
      )
    : allEntries;

  const totalPending = allEntries.reduce((s, e) => s + e.balance, 0);

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-2xl w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-secondary-100">Pending Balances</h3>
            <p className="text-sm text-custom-700 mt-0.5">Delivered jobs on credit — collect payment due</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors" title="Refresh">
              <HiOutlineRefresh className="w-4 h-4 text-custom-700" />
            </button>
            <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
              <HiOutlineX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-700" />
          <input
            type="text"
            placeholder="Search by job title, number, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 transition-colors"
          />
        </div>

        {totalPending > 0 && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
            <span className="text-sm text-orange-700 font-semibold">Total outstanding</span>
            <span className="text-base font-bold text-orange-700">{totalPending.toLocaleString()} RWF</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-custom-700 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <HiOutlineCheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm text-custom-700">{q ? "No results found" : "No pending balances"}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {filtered.map(({ payment, balance }) => (
              <div key={payment.jobId} className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-secondary-100">{payment.job?.title ?? "—"}</p>
                      <span className="text-xs font-mono text-primary-500">#{payment.job?.jobNumber}</span>
                    </div>
                    {payment.job?.customer && (
                      <p className="text-xs text-custom-700 mt-0.5">
                        {payment.job.customer.name}
                        {payment.job.customer.phone && ` · ${payment.job.customer.phone}`}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs flex-wrap">
                      <span className="text-custom-700">
                        Paid: <span className="font-bold text-emerald-600">{Number(payment.amountPaid).toLocaleString()} RWF</span>
                      </span>
                      <span className="text-custom-700">
                        Still owes: <span className="font-bold text-red-600">{balance.toLocaleString()} RWF</span>
                      </span>
                    </div>
                    <p className="text-xs text-custom-400 mt-1">
                      {new Date(payment.paidAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={() => setCollectingId(payment.job!.id)}
                    disabled={collectingId === payment.job?.id}
                    className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors flex-shrink-0 disabled:opacity-60"
                  >
                    {collectingId === payment.job?.id ? "Loading..." : "Collect"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
          >Close</button>
        </div>
      </Card>
    </div>
  );
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  "in-composition": "bg-purple-100 text-purple-700",
  "in-montage": "bg-indigo-100 text-indigo-700",
  "in-printing": "bg-cyan-100 text-cyan-700",
  "in-binding": "bg-teal-100 text-teal-700",
  "in-packaging": "bg-green-100 text-green-700",
  "quality-check": "bg-yellow-100 text-yellow-700",
  "ready-for-delivery": "bg-orange-100 text-orange-700",
  delivered: "bg-pink-100 text-pink-700",
  completed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const PAGE_SIZE_OPTIONS = [5, 10, 20];

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | "...")[] = [];
  const addPage = (n: number) => {
    if (!pages.includes(n)) pages.push(n);
  };
  addPage(1);
  if (page - 2 > 2) pages.push("...");
  for (
    let i = Math.max(2, page - 1);
    i <= Math.min(totalPages - 1, page + 1);
    i++
  )
    addPage(i);
  if (page + 2 < totalPages - 1) pages.push("...");
  if (totalPages > 1) addPage(totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-custom-200">
      <div className="flex items-center gap-3 text-xs text-custom-700">
        <span>{total === 0 ? "No records" : `${from}-${to} of ${total}`}</span>
        <span className="hidden sm:inline">|</span>
        <label className="hidden sm:flex items-center gap-1.5">
          Rows:
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 focus:outline-none focus:border-primary-400 transition-colors"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-custom-300 text-secondary-100 disabled:opacity-40 hover:bg-custom-100 transition-colors"
          title="First"
        >
          <HiOutlineChevronDoubleLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-custom-300 text-secondary-100 disabled:opacity-40 hover:bg-custom-100 transition-colors"
          title="Previous"
        >
          <HiOutlineChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`e-${i}`}
              className="px-2 text-custom-700 text-sm select-none"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`min-w-[32px] h-8 px-2 rounded-lg border text-sm font-semibold transition-colors ${
                p === page
                  ? "bg-primary-500 border-primary-500 text-white"
                  : "border-custom-300 text-secondary-100 hover:bg-custom-100"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-custom-300 text-secondary-100 disabled:opacity-40 hover:bg-custom-100 transition-colors"
          title="Next"
        >
          <HiOutlineChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-custom-300 text-secondary-100 disabled:opacity-40 hover:bg-custom-100 transition-colors"
          title="Last"
        >
          <HiOutlineChevronDoubleRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

interface PaymentModalProps {
  job: Job;
  receivedById: string;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({ job, receivedById, onClose, onSuccess }: PaymentModalProps) {
  const [method, setMethod]               = useState<PaymentMethod | null>(null);
  const [paymentState, setPaymentState]   = useState<PaymentState>("FULL");
  const [partialAmount, setPartialAmount] = useState("");
  const [paymentNote, setPaymentNote]     = useState("");
  const [receipt, setReceipt]             = useState<{ receiptNo: string; amountPaid: number; balance: number } | null>(null);

  const [recordPayment, { isLoading }] = useRecordPaymentMutation();

  const totalAmount    = job.amount ?? 0;
  const alreadyPaid    = job.payments?.reduce((s, p) => s + Number(p.amountPaid), 0) ?? 0;
  const remainingAmount = totalAmount - alreadyPaid;
  const isNone         = paymentState === "ONCREDIT";
  const amountPaid     = isNone ? 0 : paymentState === "FULL" ? remainingAmount : (partialAmount === "" ? 0 : Number(partialAmount));
  const balance        = remainingAmount - amountPaid;
  const partialValid   = paymentState === "PARTIAL" && partialAmount !== "" && amountPaid >= 0 && amountPaid < remainingAmount;
  const canSubmit      = isNone || (!!method && (paymentState === "FULL" || partialValid));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNone && !method) { toast.error("Please select a payment method"); return; }
    if (paymentState === "PARTIAL" && amountPaid < 0) { toast.error("Enter a valid partial amount"); return; }
    if (paymentState === "PARTIAL" && amountPaid >= remainingAmount) { toast.error("Partial amount must be less than the remaining balance"); return; }

    try {
      const result = await recordPayment({
        jobId:         job.id,
        receivedById,
        amountPaid,
        paymentMethod: isNone ? "ONCREDIT" : method!,
        paymentState,
        paymentNote:   paymentNote.trim() || undefined,
      }).unwrap();

      setReceipt({
        receiptNo:  result.receiptNo,
        amountPaid: result.payment.amountPaid,
        balance:    result.payment.balance,
      });
      toast.success(`Payment recorded for job #${job.jobNumber}`);
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to record payment. Please try again.");
    }
  };

  // ── Receipt confirmation screen ──────────────────────────────────────────
  if (receipt) {
    return (
      <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <Card className="!p-8 max-w-md w-full my-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <HiOutlineBadgeCheck className="w-9 h-9 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-secondary-100">Payment Recorded</h3>
              <p className="text-sm text-custom-700 mt-1">Job #{job.jobNumber}</p>
            </div>

            <div className="w-full rounded-xl bg-custom-100 border border-custom-300 p-4 space-y-2.5 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-custom-700">Customer</span>
                <span className="font-semibold text-secondary-100">{job.customer?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-custom-700">Total Amount</span>
                <span className="font-semibold text-secondary-100">{totalAmount.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-custom-700">Amount Paid</span>
                <span className="font-bold text-emerald-600">{receipt.amountPaid.toLocaleString()} RWF</span>
              </div>
              {receipt.balance > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-custom-700">Remaining Balance</span>
                  <span className="font-bold text-orange-600">{receipt.balance.toLocaleString()} RWF</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-custom-700">Method</span>
                <span className="font-semibold text-secondary-100">
                  {isNone ? "On Credit" : PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-custom-700">Type</span>
                <span className={`font-bold ${
                  isNone ? "text-red-600" : paymentState === "FULL" ? "text-emerald-600" : "text-orange-600"
                }`}>
                  {isNone ? "On Credit" : paymentState === "FULL" ? "Full Payment" : "Partial Payment"}
                </span>
              </div>
              <div className="pt-2 mt-1 border-t border-custom-300 flex justify-between items-center">
                <span className="text-sm text-custom-700">Receipt No.</span>
                <span className="font-mono font-bold text-primary-600 text-base tracking-wide">{receipt.receiptNo}</span>
              </div>
            </div>

            <Button onClick={() => { onSuccess(); onClose(); }} fullWidth>
              Done
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Payment form ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-lg w-full my-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-secondary-100">Record Payment</h3>
            <p className="text-sm text-custom-700 mt-0.5">Job #{job.jobNumber}</p>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100 transition-colors">
            <HiOutlineX className="w-6 h-6" />
          </button>
        </div>

        {/* Job summary */}
        <div className="rounded-xl bg-custom-100 border border-custom-300 p-4 mb-5 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <HiOutlineUser className="w-4 h-4 text-custom-700 flex-shrink-0" />
            <span className="font-semibold text-secondary-100">{job.customer?.name ?? "Unknown"}</span>
            {job.customer?.phone && <span className="text-custom-700">· {job.customer.phone}</span>}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <HiOutlineBriefcase className="w-4 h-4 text-custom-700 flex-shrink-0" />
            <span className="text-secondary-100">{job.title}</span>
          </div>
          {job.amount != null && (
            <div className="pt-2 border-t border-custom-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-custom-700">Total Amount</span>
                <span className="text-sm font-semibold text-secondary-100">
                  {totalAmount.toLocaleString()} <span className="text-xs font-normal text-custom-700">RWF</span>
                </span>
              </div>
              {alreadyPaid > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-custom-700">Already Paid</span>
                  <span className="text-sm font-semibold text-emerald-600">{alreadyPaid.toLocaleString()} RWF</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-custom-700">Remaining</span>
                <span className="text-base font-bold text-orange-600">
                  {remainingAmount.toLocaleString()} <span className="text-xs font-normal">RWF</span>
                </span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Payment type — Full / Partial / None */}
          <div>
            <label className="block text-sm font-semibold text-secondary-100 mb-3">
              Payment Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: "FULL",    label: "Full Payment",    active: "border-emerald-500 bg-emerald-50 text-emerald-700" },
                { value: "PARTIAL", label: "Partial Payment", active: "border-orange-400 bg-orange-50 text-orange-700" },
                { value: "ONCREDIT", label: "On Credit",      active: "border-red-400 bg-red-50 text-red-700" },
              ] as { value: PaymentState; label: string; active: string }[]).map(({ value, label, active }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setPaymentState(value); setPartialAmount(""); if (value === "ONCREDIT") setMethod(null); }}
                  className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                    paymentState === value
                      ? `${active} shadow-sm scale-[1.02]`
                      : "border-custom-300 text-custom-700 hover:border-primary-300 hover:bg-custom-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* On Credit notice */}
          {isNone && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-semibold">
              Amount paid will be recorded as 0 RWF. The full balance ({remainingAmount.toLocaleString()} RWF) will appear as a pending balance.
            </div>
          )}

          {/* Partial amount input */}
          {paymentState === "PARTIAL" && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-secondary-100 mb-2">
                  Amount to Pay (RWF) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={`Max ${remainingAmount.toLocaleString()} RWF`}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full px-4 py-2.5 rounded-xl border border-custom-300 bg-white text-secondary-100 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 transition-colors"
                />
              </div>
              {amountPaid >= 0 && amountPaid < remainingAmount && (
                <div className="flex items-center justify-between text-sm pt-1 border-t border-orange-200">
                  <span className="text-orange-700 font-semibold">Remaining balance</span>
                  <span className="font-bold text-orange-700">{balance.toLocaleString()} RWF</span>
                </div>
              )}
            </div>
          )}

          {/* Payment method — hidden when On Credit */}
          {!isNone && (
            <div>
              <label className="block text-sm font-semibold text-secondary-100 mb-3">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all font-semibold text-sm ${
                      method === m.value
                        ? m.color + " border-current shadow-sm scale-[1.02]"
                        : "border-custom-300 text-custom-700 hover:border-primary-300 hover:bg-custom-100"
                    }`}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment note */}
          <div>
            <label className="block text-sm font-semibold text-secondary-100 mb-2">
              Payment Note <span className="text-xs font-normal text-custom-700">(optional)</span>
            </label>
            <textarea
              placeholder="e.g. MoMo ref 12345, client paid deposit..."
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading ? "Saving..." : "Confirm Payment"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentCollectionPage() {
  const { userRole, userName } = useAuth();
  const { data: unreadCount = 0 } = useGetUnreadCountQuery();
  const userId = useAppSelector((state) => state.auth.user?.id ?? "");
  const [jobSearch, setJobSearch] = useState("");
  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(10);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showPendingBalances, setShowPendingBalances] = useState(false);

  const { data: allPaymentsData } = useGetPaymentsQuery({ limit: 500 });
  const pendingCount = new Set(
    (allPaymentsData?.payments ?? [])
      .filter((p) => Number(p.balance) > 0 && (p.paymentState === "ONCREDIT"))
      .map((p) => p.jobId)
  ).size;

  const {
    data: jobsData,
    isLoading: jobsLoading,
    isFetching: jobsFetching,
    refetch: refetchJobs,
  } = useGetJobsQuery({
    page: jobPage,
    limit: jobPageSize,
    ...(jobSearch.trim() && { search: jobSearch.trim() }),
  });

  const jobs = jobsData?.jobs ?? [];
  const jobTotal = jobsData?.total ?? 0;
  const jobTotalPages = jobsData?.totalPages ?? 1;

  const handlePaymentSuccess = () => {
    setSelectedJob(null);
    refetchJobs();
  };

  return (
    <DashboardLayout
      userRole={userRole ?? "receptionist"}
      userName={userName ?? "Reception Desk"}
      notificationCount={unreadCount}
    >
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">
              Payment Collection
            </h1>
            <p className="text-sm text-custom-700 mt-1">
              Find the customer's job, select how they paid, and mark it as paid
            </p>
          </div>
          <button
            onClick={() => setShowPendingBalances(true)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors text-sm font-semibold flex-shrink-0"
          >
            <HiOutlineCash className="w-4 h-4" />
            <span className="hidden sm:inline">Pending Balances</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Job Lookup ──────────────────────────────────────────────────── */}
        <Card className="!p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-custom-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-secondary-100">
              Find Job
            </h2>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-72">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-700" />
                <input
                  type="text"
                  placeholder="Search by job title, or customer..."
                  value={jobSearch}
                  onChange={(e) => {
                    setJobSearch(e.target.value);
                    setJobPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 transition-colors"
                />
              </div>
              <button
                onClick={() => refetchJobs()}
                className="p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors"
                title="Refresh"
              >
                <HiOutlineRefresh
                  className={`w-4 h-4 text-custom-700 ${
                    jobsFetching ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-custom-100 border-b border-custom-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-secondary-100 uppercase">
                    Job #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-secondary-100 uppercase">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-secondary-100 uppercase">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-secondary-100 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-secondary-100 uppercase">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-secondary-100 uppercase">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-secondary-100 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-secondary-100 uppercase">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-secondary-100 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-custom-200">
                {jobsLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-custom-700"
                    >
                      Loading jobs...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-custom-700"
                    >
                      No jobs found
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-custom-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-semibold text-primary-500">
                          #{job.jobNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-secondary-100">
                          {job.title}
                        </p>
                        {job.jobType && (
                          <p className="text-xs text-custom-700">
                            {job.jobType}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-secondary-100">
                          {job.customer?.name ?? "—"}
                        </p>
                        {job.customer?.phone && (
                          <p className="text-xs text-custom-700">
                            {job.customer.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {job.amount != null ? (
                          <span className="text-sm font-bold text-secondary-100">
                            {job.amount.toLocaleString()}{" "}
                            <span className="text-xs font-normal text-custom-700">
                              RWF
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-custom-400">
                            Not set
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const totalPaid = job.payments?.reduce((s, p) => s + Number(p.amountPaid), 0) ?? 0;
                          return totalPaid > 0
                            ? <span className="text-sm font-bold text-emerald-600">{totalPaid.toLocaleString()} RWF</span>
                            : <span className="text-xs text-custom-400">—</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          if (job.amount == null) return <span className="text-xs text-custom-400">—</span>;
                          const totalPaid = job.payments?.reduce((s, p) => s + Number(p.amountPaid), 0) ?? 0;
                          const bal = job.amount - totalPaid;
                          if (bal <= 0) return <span className="text-xs font-bold text-emerald-600">Settled</span>;
                          return <span className="text-sm font-bold text-red-600">{bal.toLocaleString()} RWF</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            statusColors[job.status] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {job.status.replace(/-/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {job.paymentStatus === "paid" ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                              <HiOutlineBadgeCheck className="w-3.5 h-3.5" />
                              Paid
                            </span>
                            {job.payments?.map((p) => (
                              <span key={p.id} className="text-xs text-custom-700">
                                {p.paymentMethod?.replace(/_/g, " ") ?? "—"} ({p.paymentState === "PARTIAL" ? "Partial" : "Full"})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {job.status !== "rejected" && (() => {
                          const totalPaid = job.payments?.reduce((s, p) => s + Number(p.amountPaid), 0) ?? 0;
                          const bal = job.amount != null ? job.amount - totalPaid : null;
                          const fullyPaid = bal !== null && bal <= 0;
                          return (
                            <button
                              onClick={() => setSelectedJob(job)}
                              disabled={fullyPaid}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <HiOutlineBadgeCheck className="w-4 h-4" />
                              {fullyPaid ? "Paid" : "Collect Payment"}
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={jobPage}
            totalPages={jobTotalPages}
            total={jobTotal}
            pageSize={jobPageSize}
            onPageChange={setJobPage}
            onPageSizeChange={(s) => {
              setJobPageSize(s);
              setJobPage(1);
            }}
          />
        </Card>
      </div>

      {/* ── Payment Modal ────────────────────────────────────────────────── */}
      {selectedJob && (
        <PaymentModal
          job={selectedJob}
          receivedById={userId}
          onClose={() => setSelectedJob(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* ── Pending Balances Modal ───────────────────────────────────────── */}
      {showPendingBalances && (
        <PendingBalancesModal
          onClose={() => setShowPendingBalances(false)}
          onCollect={(job) => { setShowPendingBalances(false); setSelectedJob(job); }}
        />
      )}
    </DashboardLayout>
  );
}
