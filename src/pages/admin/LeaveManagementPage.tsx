/**
 * Admin Leave Management Page
 * Reuses the same HR leave management UI but under the admin role.
 */
import { useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineSearch,
  HiOutlineUser,
  HiOutlineEye,
  HiOutlineThumbUp,
  HiOutlineThumbDown,
} from "react-icons/hi";
import { toast } from "react-toastify";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import {
  useGetAllLeavesQuery,
  useReviewLeaveMutation,
  type LeaveRequest,
  type LeaveStatus,
} from "../../store/services/leaveService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  EMERGENCY: "Emergency",
  UNPAID: "Unpaid",
  OTHER: "Other",
};

const statusStyle: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const statusIcon = {
  PENDING: <HiOutlineClock className="w-3.5 h-3.5" />,
  APPROVED: <HiOutlineCheckCircle className="w-3.5 h-3.5" />,
  REJECTED: <HiOutlineExclamationCircle className="w-3.5 h-3.5" />,
};

function daysBetween(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function daysRemaining(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  leave,
  action,
  onClose,
  onSuccess,
}: {
  leave: LeaveRequest;
  action: "approve" | "reject";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewLeave, { isLoading }] = useReviewLeaveMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      await reviewLeave({
        id: leave.id,
        action,
        ...(action === "reject" ? { rejectionReason: rejectionReason.trim() } : {}),
      }).unwrap();
      toast.success(`Leave request ${action === "approve" ? "approved" : "rejected"}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to process review");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-2xl w-full my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-secondary-100">
            {action === "approve" ? "Approve Leave" : "Reject Leave"}
          </h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl bg-custom-50 border border-custom-200 p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-custom-700">Employee</span>
            <span className="font-semibold text-secondary-100">{leave.user?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-custom-700">Type</span>
            <span className="font-semibold text-secondary-100">{LEAVE_TYPE_LABELS[leave.type] ?? leave.type}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-custom-700">Period</span>
            <span className="font-semibold text-secondary-100">
              {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-custom-700">Duration</span>
            <span className="font-semibold text-secondary-100">{daysBetween(leave.startDate, leave.endDate)} day(s)</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {action === "reject" && (
            <div>
              <label className="block text-sm font-semibold text-secondary-100 mb-1.5">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this leave is being rejected..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 transition-colors resize-none"
              />
            </div>
          )}
          {action === "approve" && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-sm text-emerald-700">This will approve the leave request and notify the employee.</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-colors ${
                action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isLoading ? "Processing..." : action === "approve" ? "Approve" : "Reject"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function LeaveDetailModal({
  leave,
  onClose,
  onApprove,
  onReject,
}: {
  leave: LeaveRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-2xl w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-secondary-100">Leave Request Details</h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-custom-50 border border-custom-200">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <HiOutlineUser className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-secondary-100 text-sm">{leave.user?.name ?? "Unknown"}</p>
              <p className="text-xs text-custom-700 capitalize">{leave.user?.role?.replace("_", " ").toLowerCase() ?? "—"}</p>
            </div>
          </div>

          {[
            { label: "Leave Type", value: LEAVE_TYPE_LABELS[leave.type] ?? leave.type },
            { label: "Start Date", value: formatDate(leave.startDate) },
            { label: "End Date", value: formatDate(leave.endDate) },
            { label: "Duration", value: `${daysBetween(leave.startDate, leave.endDate)} day(s)` },
            { label: "Submitted", value: formatDate(leave.createdAt) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-custom-700">{label}</span>
              <span className="text-sm font-semibold text-secondary-100">{value}</span>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <span className="text-sm text-custom-700">Status</span>
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${statusStyle[leave.status]}`}>
              {statusIcon[leave.status]}
              {leave.status}
            </span>
          </div>

          <div>
            <p className="text-sm text-custom-700 mb-1">Reason</p>
            <p className="text-sm text-secondary-100 bg-custom-50 rounded-xl p-3">{leave.reason}</p>
          </div>

          {leave.status === "REJECTED" && leave.rejectionReason && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-xs font-bold text-red-600 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-700">{leave.rejectionReason}</p>
            </div>
          )}

          {leave.documentUrl && (
            <a
              href={leave.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary-600 hover:underline font-semibold"
            >
              <HiOutlineDocumentText className="w-4 h-4" />
              View Supporting Document
            </a>
          )}

          {leave.reviewedBy && leave.reviewedAt && (
            <div className="pt-3 border-t border-custom-200">
              <p className="text-xs text-custom-700">
                Reviewed by <span className="font-semibold text-secondary-100">{leave.reviewedBy.name}</span> on{" "}
                {formatDate(leave.reviewedAt)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          {leave.status === "PENDING" && (
            <>
              <button
                onClick={onReject}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
              >
                <HiOutlineThumbDown className="w-4 h-4" /> Reject
              </button>
              <button
                onClick={onApprove}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-colors"
              >
                <HiOutlineThumbUp className="w-4 h-4" /> Approve
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors"
          >
            Close
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminLeaveManagementPage() {
  const [statusFilter, setStatusFilter] = useState<"" | LeaveStatus>("");
  const [search, setSearch] = useState("");
  const [detailLeave, setDetailLeave] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);

  const { data, isLoading, refetch } = useGetAllLeavesQuery({
    limit: 100,
    ...(statusFilter ? { status: statusFilter } : {}),
  });

  const allLeaves = data?.data ?? [];

  const leaves = allLeaves.filter((l) => {
    const q = search.trim().toLowerCase();
    return !q || (l.user?.name ?? "").toLowerCase().includes(q);
  });

  const pendingCount = allLeaves.filter((l) => l.status === "PENDING").length;
  const approvedCount = allLeaves.filter((l) => l.status === "APPROVED").length;
  const rejectedCount = allLeaves.filter((l) => l.status === "REJECTED").length;

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <HiOutlineCalendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Leave Management</h1>
              <p className="text-sm text-custom-700 mt-0.5">Review and manage all employee leave requests</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-custom-700"
            title="Refresh"
          >
            <HiOutlineRefresh className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="!p-4 text-center">
            <p className="text-xs text-custom-700 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{isLoading ? "—" : pendingCount}</p>
          </Card>
          <Card className="!p-4 text-center">
            <p className="text-xs text-custom-700 mb-1">Approved</p>
            <p className="text-2xl font-bold text-emerald-600">{isLoading ? "—" : approvedCount}</p>
          </Card>
          <Card className="!p-4 text-center">
            <p className="text-xs text-custom-700 mb-1">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{isLoading ? "—" : rejectedCount}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-700" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {(["", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  statusFilter === s
                    ? "bg-primary-500 text-white"
                    : "border border-custom-300 text-custom-700 hover:bg-custom-100"
                }`}
              >
                {s === "" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="!p-4 animate-pulse">
                <div className="h-4 w-1/3 bg-custom-200 rounded mb-2" />
                <div className="h-3 w-full bg-custom-200 rounded" />
              </Card>
            ))}
          </div>
        ) : leaves.length === 0 ? (
          <Card className="!p-10 text-center">
            <HiOutlineCalendar className="w-10 h-10 text-custom-400 mx-auto mb-3" />
            <p className="font-semibold text-secondary-100">No leave requests found</p>
            <p className="text-sm text-custom-700 mt-1">
              {statusFilter ? `No ${statusFilter.toLowerCase()} requests` : "No requests have been submitted yet"}
            </p>
          </Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-custom-50">
                  <tr>
                    {["Employee", "Type", "Period", "Duration", "Days Remaining", "Submitted", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-bold text-custom-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-custom-100">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-custom-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary-600">
                              {(leave.user?.name ?? "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-secondary-100">{leave.user?.name ?? "—"}</p>
                            <p className="text-xs text-custom-700 capitalize">
                              {leave.user?.role?.replace("_", " ").toLowerCase() ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-secondary-100 whitespace-nowrap">
                        {LEAVE_TYPE_LABELS[leave.type] ?? leave.type}
                      </td>
                      <td className="px-4 py-3 text-custom-700 whitespace-nowrap">
                        {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                      </td>
                      <td className="px-4 py-3 text-custom-700 whitespace-nowrap">
                        {daysBetween(leave.startDate, leave.endDate)}d
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {leave.status === "APPROVED" ? (() => {
                          const rem = daysRemaining(leave.endDate);
                          const today = new Date(); today.setHours(0,0,0,0);
                          const start = new Date(leave.startDate); start.setHours(0,0,0,0);
                          if (rem < 0) return <span className="text-xs text-custom-400 font-medium">Ended</span>;
                          if (today < start) return <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">end in {Math.round((start.getTime()-today.getTime())/(1000*60*60*24))}d</span>;
                          if (rem === 0) return <span className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded-full">Last day</span>;
                          return <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">{rem}d left</span>;
                        })() : <span className="text-xs text-custom-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-custom-700 whitespace-nowrap">
                        {formatDate(leave.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${statusStyle[leave.status]}`}>
                          {statusIcon[leave.status]}
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailLeave(leave)}
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                            title="View details"
                          >
                            <HiOutlineEye className="w-4 h-4" />
                          </button>
                          {leave.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => { setDetailLeave(leave); setReviewAction("approve"); }}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Approve"
                              >
                                <HiOutlineThumbUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setDetailLeave(leave); setReviewAction("reject"); }}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title="Reject"
                              >
                                <HiOutlineThumbDown className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {detailLeave && !reviewAction && (
        <LeaveDetailModal
          leave={detailLeave}
          onClose={() => setDetailLeave(null)}
          onApprove={() => setReviewAction("approve")}
          onReject={() => setReviewAction("reject")}
        />
      )}

      {detailLeave && reviewAction && (
        <ReviewModal
          leave={detailLeave}
          action={reviewAction}
          onClose={() => { setReviewAction(null); setDetailLeave(null); }}
          onSuccess={() => { setReviewAction(null); setDetailLeave(null); refetch(); }}
        />
      )}
    </DashboardLayout>
  );
}
