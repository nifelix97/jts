import { useState, useMemo } from "react";
import {
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineBadgeCheck,
  HiOutlineEye,
  HiOutlineCalendar,
  HiOutlineFilter,
  HiOutlineUserCircle,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "react-toastify";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import {
  useGetOvertimeRequestsQuery,
  useApproveOvertimeRequestMutation,
  useCreateOvertimeRequestMutation,
  useUpdateOvertimeRequestMutation,
  useDeleteOvertimeRequestMutation,
  type OvertimeRequest,
  type OvertimeStatus,
} from "../../store/services/overtimeService";
import { useGetAllEmployeesQuery } from "../../store/services/employeesService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inp =
  "px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors";

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-RW", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calcHours(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) return "—";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function employeeName(r: OvertimeRequest) {
  return (
    r.employee?.name ??
    r.employee?.fullName ??
    r.registeredByUser?.name ??
    "—"
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  OvertimeStatus,
  { label: string; bg: string; text: string; Icon: React.ElementType }
> = {
  PENDING:  { label: "Pending",  bg: "bg-yellow-100",  text: "text-yellow-700",  Icon: HiOutlineClock      },
  APPROVED: { label: "Approved", bg: "bg-emerald-100", text: "text-emerald-700", Icon: HiOutlineBadgeCheck },
  REJECTED: { label: "Rejected", bg: "bg-red-100",     text: "text-red-600",     Icon: HiOutlineXCircle    },
};

function StatusBadge({ status }: { status: OvertimeStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <cfg.Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

interface KpiProps {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  loading: boolean;
}

function KpiCards({ total, pending, approved, rejected, loading }: KpiProps) {
  const cards = [
    { label: "Total",    value: total,    color: "text-primary-500"  },
    { label: "Pending",  value: pending,  color: "text-yellow-600"   },
    { label: "Approved", value: approved, color: "text-emerald-600"  },
    { label: "Rejected", value: rejected, color: "text-red-500"      },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="!p-4 text-center">
          <p className="text-xs text-custom-700 mb-1">{c.label}</p>
          <p className={`text-2xl font-bold ${c.color}`}>
            {loading ? "—" : c.value}
          </p>
        </Card>
      ))}
    </div>
  );
}

// ─── Filters Bar ──────────────────────────────────────────────────────────────

interface FiltersProps {
  search: string;
  onSearch: (v: string) => void;
  statusFilter: OvertimeStatus | "";
  onStatus: (v: OvertimeStatus | "") => void;
  dateFilter: string;
  onDate: (v: string) => void;
  onClear: () => void;
  loading: boolean;
  onRefresh: () => void;
}

function FiltersBar({
  search, onSearch,
  statusFilter, onStatus,
  dateFilter, onDate,
  onClear, loading, onRefresh,
}: FiltersProps) {
  const hasFilters = !!search || !!statusFilter || !!dateFilter;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-700" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by worker name or reason…"
          className={`w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-400 focus:outline-none focus:border-primary-400 transition-colors`}
        />
      </div>

      {/* Status */}
      <select
        value={statusFilter}
        onChange={(e) => onStatus(e.target.value as OvertimeStatus | "")}
        className={inp}
      >
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>

      {/* Date */}
      <div className="relative">
        <HiOutlineCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-700 pointer-events-none" />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => onDate(e.target.value)}
          className={`pl-9 pr-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors`}
        />
      </div>

      {hasFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-custom-300 text-xs font-semibold text-custom-700 hover:bg-custom-100 transition-colors"
        >
          <HiOutlineFilter className="w-3.5 h-3.5" /> Clear
        </button>
      )}

      <button
        onClick={onRefresh}
        className="ml-auto p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-custom-700"
        title="Refresh"
      >
        <HiOutlineRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}

// ─── OvertimeForm Modal (Create / Edit) ──────────────────────────────────────

function OvertimeFormModal({
  record,
  onClose,
}: {
  record?: OvertimeRequest;
  onClose: () => void;
}) {
  const isEdit = !!record;
  const [form, setForm] = useState({
    date:       record?.date       ?? "",
    startTime:  record?.startTime  ?? "",
    endTime:    record?.endTime    ?? "",
    reason:     record?.reason     ?? "",
    employeeId: record?.employeeId ?? record?.employee?.id ?? "",
  });

  const { data: empData } = useGetAllEmployeesQuery({ limit: 500 });
  const employees = empData?.data ?? [];

  const [create, { isLoading: creating }] = useCreateOvertimeRequestMutation();
  const [update, { isLoading: updating }] = useUpdateOvertimeRequestMutation();
  const isLoading = creating || updating;

  const set = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const duration = calcHours(form.startTime, form.endTime);
  const selectedEmp = employees.find(e => e.id === form.employeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await update({ id: record!.id, ...form }).unwrap();
        toast.success("Overtime updated");
      } else {
        await create(form).unwrap();
        toast.success("Overtime recorded");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to save");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-style-600 border border-custom-200 rounded-2xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden">

        {/* ── Colored header banner ── */}
        <div className={`px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <HiOutlineClock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {isEdit ? "Edit Overtime Record" : "Record New Overtime"}
                </h2>
                <p className="text-xs text-white/70 mt-0.5">
                  {isEdit
                    ? `Editing record for ${employeeName(record!)}`
                    : "Fill in the details to log overtime work"}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
              <HiOutlineX className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-3">

            {/* ── Employee ── */}
            <div>
              <label className="block text-xs font-semibold text-custom-700 mb-1">Employee *</label>
              <div className="relative">
                <HiOutlineUserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-400 pointer-events-none" />
                <select value={form.employeeId} onChange={set("employeeId")} required
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors appearance-none">
                  <option value="">Select employee…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
              {selectedEmp && (
                <div className="mt-1.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 border border-primary-100">
                  <div className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
                    {selectedEmp.fullName[0].toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold text-primary-700">{selectedEmp.fullName}</p>
                  {selectedEmp.email && <p className="text-xs text-primary-400 ml-auto">{selectedEmp.email}</p>}
                </div>
              )}
            </div>

            {/* ── Date + Time in one row ── */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-custom-700 mb-1">Date *</label>
                <div className="relative">
                  <HiOutlineCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-400 pointer-events-none" />
                  <input type="date" value={form.date} onChange={set("date")} required
                    className="w-full pl-9 pr-2 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-custom-700 mb-1">Start Time *</label>
                <div className="relative">
                  <HiOutlineClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-400 pointer-events-none" />
                  <input type="time" value={form.startTime} onChange={set("startTime")} required
                    className="w-full pl-9 pr-2 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-custom-700 mb-1">End Time *</label>
                <div className="relative">
                  <HiOutlineClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-400 pointer-events-none" />
                  <input type="time" value={form.endTime} onChange={set("endTime")} required
                    className="w-full pl-9 pr-2 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors" />
                </div>
              </div>
            </div>

            {/* Live duration pill */}
            {form.startTime && form.endTime && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                duration === "—" ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                <HiOutlineClock className="w-3.5 h-3.5" />
                {duration === "—" ? "End time must be after start time" : `Duration: ${duration}`}
              </div>
            )}

            {/* ── Reason ── */}
            <div>
              <label className="block text-xs font-semibold text-custom-700 mb-1">
                Reason <span className="font-normal text-custom-400">(optional)</span>
              </label>
              <textarea value={form.reason} onChange={set("reason")} rows={2}
                placeholder="Describe the reason for this overtime work…"
                className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none" />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-3 bg-custom-50 border-t border-custom-200 flex items-center justify-between gap-3">
            <p className="text-xs text-custom-500">Fields marked * are required</p>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={isLoading}
                className="px-5 py-2.5 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isLoading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-colors bg-primary-500 hover:bg-primary-600`}>
                {isEdit ? <HiOutlinePencil className="w-4 h-4" /> : <HiOutlinePlus className="w-4 h-4" />}
                {isLoading ? "Saving…" : isEdit ? "Save Changes" : "Record Overtime"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  record,
  onClose,
}: {
  record: OvertimeRequest;
  onClose: () => void;
}) {
  const [deleteOT, { isLoading }] = useDeleteOvertimeRequestMutation();
  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
      <div className="bg-style-600 border border-custom-200 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-secondary-100">Delete Overtime</h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-custom-700 mb-5">
          Delete overtime for <strong className="text-secondary-100">{employeeName(record)}</strong> on <strong className="text-secondary-100">{fmtDate(record.date)}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Cancel</button>
          <button onClick={async () => { try { await deleteOT(record.id).unwrap(); toast.success("Deleted"); onClose(); } catch { toast.error("Failed to delete"); } }}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors">
            {isLoading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Approval Modal ───────────────────────────────────────────────────────────

function ApprovalModal({
  record,
  decision,
  onClose,
}: {
  record: OvertimeRequest;
  decision: "APPROVED" | "REJECTED";
  onClose: () => void;
}) {
  const [comment, setComment] = useState("");
  const [approve, { isLoading }] = useApproveOvertimeRequestMutation();
  const isApprove = decision === "APPROVED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await approve({
        id: record.id,
        status: decision,
        ...(comment.trim() && { approvalComment: comment.trim() }),
      }).unwrap();
      toast.success(`Request ${isApprove ? "approved" : "rejected"}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to update");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
      <div className="bg-style-600 border border-custom-200 rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isApprove ? "bg-emerald-100" : "bg-red-100"
              }`}
            >
              {isApprove ? (
                <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <HiOutlineXCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-secondary-100">
                {isApprove ? "Approve Request" : "Reject Request"}
              </h3>
              <p className="text-xs text-custom-700 mt-0.5 truncate max-w-[240px]">
                {employeeName(record)} · {fmtDate(record.date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-custom-700 hover:text-secondary-100 transition-colors"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Current status */}
        <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-2.5 flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-custom-700">Current status</span>
          <StatusBadge status={record.status} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-secondary-100 mb-1.5">
              Comment{" "}
              <span className="text-custom-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={isApprove ? "Add approval note…" : "Reason for rejection…"}
              className="w-full px-3 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-custom-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-colors ${
                isApprove
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isApprove ? (
                <HiOutlineCheckCircle className="w-4 h-4" />
              ) : (
                <HiOutlineXCircle className="w-4 h-4" />
              )}
              {isLoading
                ? "Saving…"
                : isApprove
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  record,
  onClose,
  onApprove,
  onEdit,
  onDelete,
}: {
  record: OvertimeRequest;
  onClose: () => void;
  onApprove: (decision: "APPROVED" | "REJECTED") => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isPending = record.status === "PENDING";
  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
              <HiOutlineClock className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary-100">Overtime Details</h3>
              <p className="text-xs text-custom-700 mt-0.5">Submitted request</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-custom-700 hover:text-secondary-100 transition-colors"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <dl className="space-y-3">
          {/* Worker */}
          <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-3 flex items-center gap-2">
            <HiOutlineUserCircle className="w-4 h-4 text-custom-500 shrink-0" />
            <div>
              <dt className="text-xs font-semibold text-custom-700">Worker</dt>
              <dd className="text-sm font-semibold text-secondary-100">{employeeName(record)}</dd>
            </div>
          </div>

          {/* Date + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-3">
              <dt className="text-xs font-semibold text-custom-700 mb-0.5">Date</dt>
              <dd className="text-sm font-semibold text-secondary-100">{fmtDate(record.date)}</dd>
            </div>
            <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-3">
              <dt className="text-xs font-semibold text-custom-700 mb-0.5">Duration</dt>
              <dd className="text-sm font-semibold text-secondary-100">
                {calcHours(record.startTime, record.endTime)}
              </dd>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-3">
              <dt className="text-xs font-semibold text-custom-700 mb-0.5">Start</dt>
              <dd className="text-sm text-secondary-100">{record.startTime}</dd>
            </div>
            <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-3">
              <dt className="text-xs font-semibold text-custom-700 mb-0.5">End</dt>
              <dd className="text-sm text-secondary-100">{record.endTime}</dd>
            </div>
          </div>

          {/* Reason */}
          {record.reason && (
            <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-3">
              <dt className="text-xs font-semibold text-custom-700 mb-0.5">Reason</dt>
              <dd className="text-sm text-secondary-100 leading-relaxed whitespace-pre-wrap">
                {record.reason}
              </dd>
            </div>
          )}

          {/* Status */}
          <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-3">
            <dt className="text-xs font-semibold text-custom-700 mb-1.5">Status</dt>
            <dd className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={record.status} />
              {record.approvedByUser?.name && (
                <span className="text-xs text-custom-700">
                  by{" "}
                  <span className="font-semibold text-secondary-100">
                    {record.approvedByUser.name}
                  </span>
                </span>
              )}
              {record.approvedAt && (
                <span className="text-xs text-custom-500">{fmtDate(record.approvedAt)}</span>
              )}
            </dd>
            {record.approvalComment && (
              <dd className="mt-2 text-xs text-custom-700 italic border-l-2 border-custom-300 pl-2">
                "{record.approvalComment}"
              </dd>
            )}
          </div>
        </dl>

        {/* Footer actions */}
        <div className="flex flex-wrap gap-2 justify-end pt-4 mt-4 border-t border-custom-200">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
            Close
          </button>
          {record.status === "PENDING" && (
            <button onClick={() => { onClose(); onEdit(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
              <HiOutlinePencil className="w-4 h-4" /> Edit
            </button>
          )}
          {isPending && (
            <>
              <button onClick={() => { onClose(); onApprove("REJECTED"); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                <HiOutlineXCircle className="w-4 h-4" /> Reject
              </button>
              <button onClick={() => { onClose(); onApprove("APPROVED"); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors">
                <HiOutlineCheckCircle className="w-4 h-4" /> Approve
              </button>
            </>
          )}
          <button onClick={() => { onClose(); onDelete(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
            <HiOutlineTrash className="w-4 h-4" /> Delete
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Records List ─────────────────────────────────────────────────────────────

interface ListProps {
  records: OvertimeRequest[];
  loading: boolean;
  onView: (r: OvertimeRequest) => void;
  onApprove: (r: OvertimeRequest, decision: "APPROVED" | "REJECTED") => void;
  onEdit: (r: OvertimeRequest) => void;
  onDelete: (r: OvertimeRequest) => void;
}

function OvertimeList({ records, loading, onView, onApprove, onEdit, onDelete }: ListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="!p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-custom-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-custom-200 rounded" />
                <div className="h-3 w-48 bg-custom-200 rounded" />
              </div>
              <div className="h-6 w-20 bg-custom-200 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!records.length) {
    return (
      <Card className="!p-12 text-center">
        <HiOutlineClock className="w-10 h-10 text-custom-400 mx-auto mb-3" />
        <p className="text-secondary-100 font-semibold">No overtime records found</p>
        <p className="text-sm text-custom-700 mt-1">
          Try adjusting the filters or check back later.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <Card
          key={r.id}
          className="!p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onView(r)}
        >
          <div className="flex items-start gap-4">
            {/* Date block */}
            <div className="w-14 h-14 rounded-xl bg-primary-50 border border-primary-100 flex flex-col items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary-600 uppercase leading-none">
                {new Date(r.date).toLocaleDateString("en-RW", { month: "short" })}
              </span>
              <span className="text-xl font-bold text-primary-700 leading-tight">
                {new Date(r.date).getDate()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Worker name + status */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="flex items-center gap-1 text-sm font-bold text-secondary-100">
                  <HiOutlineUserCircle className="w-4 h-4 text-custom-500 shrink-0" />
                  {employeeName(r)}
                </span>
                <StatusBadge status={r.status} />
              </div>

              {/* Time + duration */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-custom-700 mb-1">
                <span className="flex items-center gap-1">
                  <HiOutlineClock className="w-3.5 h-3.5" />
                  {r.startTime} – {r.endTime}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-custom-100 text-custom-500 font-medium">
                  {calcHours(r.startTime, r.endTime)}
                </span>
              </div>

              {/* Reason */}
              {r.reason && (
                <p className="text-xs text-custom-700 line-clamp-1">{r.reason}</p>
              )}

              {/* Approval comment */}
              {r.approvalComment && (
                <p className="text-xs text-custom-500 italic mt-0.5">
                  "{r.approvalComment}"
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onView(r)} title="View"
                className="p-1.5 rounded-lg hover:bg-custom-100 text-custom-700 transition-colors">
                <HiOutlineEye className="w-4 h-4" />
              </button>
              {r.status === "PENDING" && (
                <button onClick={() => onEdit(r)} title="Edit"
                  className="p-1.5 rounded-lg hover:bg-custom-100 text-custom-700 transition-colors">
                  <HiOutlinePencil className="w-4 h-4" />
                </button>
              )}
              {r.status === "PENDING" && (
                <>
                  <button onClick={() => onApprove(r, "APPROVED")} title="Approve"
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors">
                    <HiOutlineCheckCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => onApprove(r, "REJECTED")} title="Reject"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                    <HiOutlineXCircle className="w-4 h-4" />
                  </button>
                </>
              )}
              <button onClick={() => onDelete(r)} title="Delete"
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                <HiOutlineTrash className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OvertimeManagementPage() {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<OvertimeStatus | "">("");
  const [dateFilter,   setDateFilter]   = useState("");
  const [viewRecord,   setViewRecord]   = useState<OvertimeRequest | null>(null);
  const [editRecord,   setEditRecord]   = useState<OvertimeRequest | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<OvertimeRequest | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [approvalTarget, setApprovalTarget] = useState<{
    record: OvertimeRequest;
    decision: "APPROVED" | "REJECTED";
  } | null>(null);

  const { data, isLoading, refetch } = useGetOvertimeRequestsQuery({
    limit: 200,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(dateFilter   ? { date: dateFilter }     : {}),
  });

  const allRecords = data?.data ?? [];

  // client-side search filter
  const records = useMemo(() => {
    if (!search.trim()) return allRecords;
    const q = search.toLowerCase();
    return allRecords.filter(
      (r) =>
        employeeName(r).toLowerCase().includes(q) ||
        (r.reason ?? "").toLowerCase().includes(q)
    );
  }, [allRecords, search]);

  const pendingCount  = allRecords.filter((r) => r.status === "PENDING").length;
  const approvedCount = allRecords.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = allRecords.filter((r) => r.status === "REJECTED").length;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateFilter("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <HiOutlineClock className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">
                Overtime Requests
              </h1>
              <p className="text-sm text-custom-700 mt-0.5">
                Review and approve worker overtime submissions
              </p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
            <HiOutlinePlus className="w-4 h-4" /> Record Overtime
          </button>
        </div>

        {/* ── KPI Cards ── */}
        <KpiCards
          total={allRecords.length}
          pending={pendingCount}
          approved={approvedCount}
          rejected={rejectedCount}
          loading={isLoading}
        />

        {/* ── Filters ── */}
        <FiltersBar
          search={search}
          onSearch={setSearch}
          statusFilter={statusFilter}
          onStatus={setStatusFilter}
          dateFilter={dateFilter}
          onDate={setDateFilter}
          onClear={clearFilters}
          loading={isLoading}
          onRefresh={refetch}
        />

        {/* ── List ── */}
        <OvertimeList
          records={records}
          loading={isLoading}
          onView={setViewRecord}
          onApprove={(r, decision) => setApprovalTarget({ record: r, decision })}
          onEdit={setEditRecord}
          onDelete={setDeleteRecord}
        />
      </div>

      {/* ── Modals ── */}
      {showCreate && <OvertimeFormModal onClose={() => setShowCreate(false)} />}
      {editRecord  && <OvertimeFormModal record={editRecord} onClose={() => setEditRecord(null)} />}
      {deleteRecord && <DeleteConfirmModal record={deleteRecord} onClose={() => setDeleteRecord(null)} />}
      {viewRecord && (
        <DetailModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onApprove={(decision) => {
            setViewRecord(null);
            setApprovalTarget({ record: viewRecord, decision });
          }}
          onEdit={() => { setViewRecord(null); setEditRecord(viewRecord); }}
          onDelete={() => { setViewRecord(null); setDeleteRecord(viewRecord); }}
        />
      )}
      {approvalTarget && (
        <ApprovalModal
          record={approvalTarget.record}
          decision={approvalTarget.decision}
          onClose={() => setApprovalTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}
