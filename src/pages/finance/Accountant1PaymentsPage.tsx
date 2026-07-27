import { useState } from "react";
import { toast } from "react-toastify";
import {
  HiOutlineBadgeCheck,
  HiOutlineBriefcase,
  HiOutlineCash,
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCreditCard,
  // HiOutlineDocumentText,
  HiOutlinePhone,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineUser,
  HiOutlineX,
} from "react-icons/hi";
import { DashboardLayout } from "../../components";
import { Button, Card } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useAppSelector } from "../../store/hooks";
// import type { CreateInvoicePayload } from "../../store/services/invoicesService";
// import {
//   useCreateInvoiceMutation,
//   useGetInvoicesByJobQuery,
// } from "../../store/services/invoicesService";
import { useGetJobsQuery, type Job, type PaymentMethod } from "../../store/services/jobsService";
import {
  useRecordPaymentMutation,
  type PaymentState,
} from "../../store/services/paymentsService";

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

  const totalAmount  = job.amount ?? 0;
  const amountPaid   = paymentState === "FULL" ? totalAmount : Number(partialAmount) || 0;
  const balance      = totalAmount - amountPaid;
  const partialValid = paymentState === "PARTIAL" && amountPaid > 0 && amountPaid < totalAmount;
  const canSubmit    = !!method && (paymentState === "FULL" || partialValid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method) { toast.error("Please select a payment method"); return; }
    if (paymentState === "PARTIAL" && amountPaid <= 0) { toast.error("Enter a valid partial amount"); return; }
    if (paymentState === "PARTIAL" && amountPaid >= totalAmount) { toast.error("Partial amount must be less than the total"); return; }

    try {
      const result = await recordPayment({
        jobId:         job.id,
        receivedById,
        amountPaid,
        paymentMethod: method,
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
        <Card className="!p-8 max-w-2xl w-full my-8 text-center">
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
                  {PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-custom-700">Type</span>
                <span className={`font-bold ${paymentState === "FULL" ? "text-emerald-600" : "text-orange-600"}`}>
                  {paymentState === "FULL" ? "Full Payment" : "Partial Payment"}
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
      <Card className="!p-6 max-w-2xl w-full my-8">

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
            <div className="pt-2 border-t border-custom-200 flex items-center justify-between">
              <span className="text-xs text-custom-700">Total Amount</span>
              <span className="text-base font-bold text-secondary-100">
                {job.amount.toLocaleString()} <span className="text-xs font-normal text-custom-700">RWF</span>
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Payment type — Full / Partial */}
          <div>
            <label className="block text-sm font-semibold text-secondary-100 mb-3">
              Payment Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["FULL", "PARTIAL"] as PaymentState[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setPaymentState(type); setPartialAmount(""); }}
                  className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                    paymentState === type
                      ? type === "FULL"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm scale-[1.02]"
                        : "border-orange-400 bg-orange-50 text-orange-700 shadow-sm scale-[1.02]"
                      : "border-custom-300 text-custom-700 hover:border-primary-300 hover:bg-custom-100"
                  }`}
                >
                  {type === "FULL" ? "Full Payment" : "Partial Payment"}
                </button>
              ))}
            </div>
          </div>

          {/* Partial amount input */}
          {paymentState === "PARTIAL" && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-secondary-100 mb-2">
                  Amount to Pay (RWF) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={totalAmount - 1}
                  placeholder={`Max ${(totalAmount - 1).toLocaleString()} RWF`}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-custom-300 bg-white text-secondary-100 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 transition-colors"
                />
              </div>
              {amountPaid > 0 && amountPaid < totalAmount && (
                <div className="flex items-center justify-between text-sm pt-1 border-t border-orange-200">
                  <span className="text-orange-700 font-semibold">Remaining balance</span>
                  <span className="font-bold text-orange-700">{balance.toLocaleString()} RWF</span>
                </div>
              )}
            </div>
          )}

          {/* Payment method */}
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

// ─── Generate Invoice Modal ───────────────────────────────────────────────────
// function GenerateInvoiceModal({ job, onClose }: { job: Job; onClose: () => void }) {
//   // Amount paid = sum of all recorded payments
//   const amountPaid = (job.payments ?? []).reduce(
//     (sum, p) => sum + Number(p.amountPaid ?? 0),
//     0
//   );
//   const [notes, setNotes]     = useState("");
//   const _now = new Date();
//   const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
//   const [dueDate, setDueDate] = useState(todayStr);

//   const [createInvoice, { isLoading, error }] = useCreateInvoiceMutation();

//   // No tax — total equals amount paid
//   const total = amountPaid;

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     try {
//       const payload: CreateInvoicePayload = {
//         jobId:      job.id,
//         customerId: job.customer?.id ?? job.customerId,
//         lineItems: [
//           {
//             name:      job.title,
//             quantity:  1,
//             unitPrice: amountPaid,
//           },
//         ],
//         discountType:  "PERCENTAGE",
//         discountValue: 0,
//         taxRate:       0,
//         notes:         notes.trim() || undefined,
//         dueDate:       dueDate || undefined,
//       };
//       await createInvoice(payload).unwrap();
//       toast.success(`Invoice generated for "${job.title}"`);
//       onClose();
//     } catch (err: any) {
//       toast.error(err?.data?.message ?? "Failed to generate invoice");
//     }
//   }

//   return (
//     <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
//       <Card className="!p-6 max-w-2xl w-full my-8">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-5">
//           <div>
//             <h3 className="text-xl font-bold text-secondary-100">Generate Invoice</h3>
//             <p className="text-sm text-custom-700 mt-0.5">
//               Job <span className="font-semibold text-primary-600">#{job.jobNumber}</span> — {job.title}
//             </p>
//           </div>
//           <button onClick={onClose} className="text-custom-700 hover:text-secondary-100 transition-colors">
//             <HiOutlineX className="w-6 h-6" />
//           </button>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-5">
//           {/* Customer info */}
//           <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-3 flex items-center gap-3">
//             <HiOutlineUser className="w-5 h-5 text-custom-500 shrink-0" />
//             <div>
//               <p className="text-sm font-semibold text-secondary-100">{job.customer?.name ?? "—"}</p>
//               {job.customer?.phone && <p className="text-xs text-custom-700">{job.customer.phone}</p>}
//             </div>
//           </div>

//           {/* Amount paid (read-only) */}
//           <div className="rounded-xl border border-custom-300 bg-custom-50 p-4 space-y-1.5 text-sm">
//             <div className="flex justify-between">
//               <span className="text-custom-700">Job</span>
//               <span className="font-semibold text-secondary-100 max-w-[60%] truncate text-right">{job.title}</span>
//             </div>
//             <div className="flex justify-between pt-2 border-t border-custom-200">
//               <span className="font-semibold text-custom-700">Amount Paid</span>
//               <span className="font-bold text-secondary-100">{amountPaid.toLocaleString()} RWF</span>
//             </div>
//           </div>

//           {/* Due date */}
//           <div>
//             <label className="block text-sm font-semibold text-secondary-100 mb-1">Due Date</label>
//             <input
//               type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
//               className="w-full px-3 py-2 rounded-lg border border-custom-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
//             />
//           </div>

//           {/* Notes */}
//           <div>
//             <label className="block text-sm font-semibold text-secondary-100 mb-1">
//               Notes <span className="text-xs font-normal text-custom-500">(optional)</span>
//             </label>
//             <textarea
//               value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
//               placeholder="Payment terms, special instructions…"
//               className="w-full px-3 py-2 rounded-lg border border-custom-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
//             />
//           </div>

//           {/* Total */}
//           <div className="rounded-xl bg-custom-50 border border-custom-200 p-4 text-sm">
//             <div className="flex justify-between font-bold text-base">
//               <span className="text-secondary-100">Total</span>
//               <span className="text-primary-600">{total.toLocaleString()} RWF</span>
//             </div>
//           </div>

//           {error && (
//             <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
//               {(error as any)?.data?.message ?? "Failed to generate invoice"}
//             </p>
//           )}

//           <div className="flex gap-3 justify-end pt-2 border-t border-custom-200">
//             <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
//             <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
//               {isLoading && <HiOutlineRefresh className="h-4 w-4 animate-spin" />}
//               {isLoading ? "Generating…" : "Generate Invoice"}
//             </Button>
//           </div>
//         </form>
//       </Card>
//     </div>
//   );
// }

// ─── Generate Invoice Button (hidden once invoice exists for this job) ────────

// function GenerateInvoiceButton({ job, onClick }: { job: Job; onClick: () => void }) {
//   const { data: invoices = [], isLoading } = useGetInvoicesByJobQuery(job.id);
//   if (isLoading || invoices.length > 0) return null;
//   return (
//     <button
//       onClick={onClick}
//       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-300 bg-primary-50 text-primary-700 text-xs font-semibold hover:bg-primary-100 transition-colors"
//       title="Generate invoice"
//     >
//       <HiOutlineDocumentText className="w-4 h-4" />
//       Invoice
//     </button>
//   );
// }

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentCollectionPage() {
  const { userRole, userName } = useAuth();
  const userId = useAppSelector((state) => state.auth.user?.id ?? "");
  const [jobSearch, setJobSearch] = useState("");
  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(10);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  // const [invoiceJob, setInvoiceJob] = useState<Job | null>(null);

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
      notificationCount={0}
    >
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">
            Payment Collection
          </h1>
          <p className="text-sm text-custom-700 mt-1">
            Find the customer's job, select how they paid, and mark it as paid
          </p>
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
                                {p.paymentMethod.replace(/_/g, " ")} ({p.paymentState === "PARTIAL" ? "Partial" : "Full"})
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
                        <div className="flex items-center justify-end gap-2">
                          {/* Generate invoice — only for paid jobs without an invoice */}
                          {/* {job.paymentStatus === "paid" && (
                            <GenerateInvoiceButton job={job} onClick={() => setInvoiceJob(job)} />
                          )} */}
                          {/* Collect payment — only for unpaid jobs */}
                          <button
                            onClick={() => setSelectedJob(job)}
                            disabled={job.paymentStatus === "paid"}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <HiOutlineBadgeCheck className="w-4 h-4" />
                            {job.paymentStatus === "paid" ? "Paid" : "Collect"}
                          </button>
                        </div>
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

      {/* ── Generate Invoice Modal ───────────────────────────────────────── */}
      {/* {invoiceJob && (
        <GenerateInvoiceModal
          job={invoiceJob}
          onClose={() => setInvoiceJob(null)}
        />
      )} */}


    </DashboardLayout>
  );
}
