import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";
import {
  HiOutlineBadgeCheck,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineClipboardList,
  HiOutlineDotsVertical,
  HiOutlineExclamationCircle,
  HiOutlineEye,
  HiOutlineFilter,
  HiOutlinePencil,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineXCircle,
} from "react-icons/hi";
import { FaPlus } from "react-icons/fa";
import { DashboardLayout } from "../../components";
import { Button, Card } from "../../components/ui";
import CreateJobModal from "./CreateJobModal";
import JobDetailModal from "./JobDetailModal";
import EditJobModal from "./EditJobModal";
import {
  useGetJobsQuery,
  useDeleteJobMutation,
  useApproveJobMutation,
  useRejectJobMutation,
  useVerifyJobMutation,
  useAssignJobMutation,
  useReassignJobMutation,
  useCompleteJobMutation,
} from "../../store/services/jobsService";
import type { Job, JobStatus, JobPriority } from "../../store/services/jobsService";
import { useGetDepartmentsQuery } from "../../store/services/departmentsService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDeadlineInfo = (dueDate?: string) => {
  if (!dueDate) return { text: "No deadline", color: "text-custom-700", bgColor: "bg-custom-100", isOverdue: false };
  const now = new Date();
  const deadlineDate = new Date(dueDate);
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    const overdueHours = Math.abs(diffHours) % 24;
    return { text: overdueDays > 0 ? `${overdueDays}d overdue` : `${overdueHours}h overdue`, color: "text-red-600", bgColor: "bg-red-50", isOverdue: true };
  } else if (diffHours < 24) {
    return { text: `${diffHours}h left`, color: "text-orange-600", bgColor: "bg-orange-50", isOverdue: false };
  } else if (diffDays <= 3) {
    return { text: `${diffDays}d left`, color: "text-yellow-600", bgColor: "bg-yellow-50", isOverdue: false };
  }
  return { text: `${diffDays}d left`, color: "text-green-600", bgColor: "bg-green-50", isOverdue: false };
};

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

const priorityColors: Record<string, string> = {
  low: "bg-green-500 text-white",
  normal: "bg-yellow-500 text-white",
  high: "bg-orange-500 text-white",
  urgent: "bg-red-500 text-white",
};

// ─── Three-dot Action Menu ────────────────────────────────────────────────────

type ActionMode = "approve" | "reject" | "verify" | "assign" | "complete";

interface RowMenuProps {
  job: Job;
  onAction: (job: Job, mode: ActionMode) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function RowMenu({ job, onAction, onView, onEdit, onDelete }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState<{ top: number; right: number } | null>(null);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_HEIGHT = 320; // approximate max menu height
  const updatePos = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < MENU_HEIGHT) {
      setPos({ top: r.top - MENU_HEIGHT, right: window.innerWidth - r.right });
    } else {
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  const s = job.status;
  const canApprove  = s === "pending" || s === "verified";
  const canAssign   = s !== "rejected" && s !== "pending" && s !== "delivered";
  const canReject   = s !== "rejected" && s !== "completed" && s !== "delivered";
  const canVerify   = s === "completed";
  const canComplete = s !== "completed" && s !== "delivered" && s !== "rejected" && s !== "pending" && s !== "verified";

  type Item = { label: string; mode?: ActionMode; cls: string; icon: React.ReactNode; action?: () => void };
  const items: Item[] = [
    { label: "View",     cls: "text-secondary-100 hover:bg-custom-50",  icon: <HiOutlineEye className="w-4 h-4" />,           action: () => onView(job.id) },
    { label: "Edit",     cls: "text-secondary-100 hover:bg-custom-50",  icon: <HiOutlinePencil className="w-4 h-4" />,        action: () => onEdit(job.id) },
    ...(canApprove  ? [{ label: "Confirm",  mode: "approve"  as ActionMode, cls: "text-green-700 hover:bg-green-50",   icon: <HiOutlineCheckCircle className="w-4 h-4" /> }] : []),
    ...(canAssign   ? [{ label: job.departmentAssignedToId ? "Reassign" : "Assign", mode: "assign" as ActionMode, cls: "text-primary-700 hover:bg-primary-50", icon: <HiOutlineClipboardList className="w-4 h-4" /> }] : []),
    ...(canComplete ? [{ label: "Complete", mode: "complete" as ActionMode, cls: "text-blue-700 hover:bg-blue-50",    icon: <HiOutlineCheckCircle className="w-4 h-4" /> }] : []),
    ...(canVerify   ? [{ label: "Verify",   mode: "verify"   as ActionMode, cls: "text-indigo-700 hover:bg-indigo-50", icon: <HiOutlineBadgeCheck className="w-4 h-4" /> }] : []),
    ...(canReject   ? [{ label: "Reject",   mode: "reject"   as ActionMode, cls: "text-red-600 hover:bg-red-50",      icon: <HiOutlineXCircle className="w-4 h-4" /> }] : []),
    { label: "Delete",   cls: "text-red-600 hover:bg-red-50",           icon: <HiOutlineTrash className="w-4 h-4" />,         action: () => onDelete(job.id) },
  ];

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); if (open) { setOpen(false); return; } updatePos(); setOpen(true); }}
        className="p-1.5 rounded-lg hover:bg-custom-100 text-custom-500 hover:text-secondary-100 transition-colors"
        title="Actions"
      >
        <HiOutlineDotsVertical className="w-5 h-5" />
      </button>
      {open && pos && ReactDOM.createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
          className="w-44 bg-style-600 border border-custom-200 rounded-xl shadow-xl py-1 overflow-hidden"
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (item.action) item.action();
                else if (item.mode) onAction(job, item.mode);
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors ${item.cls}`}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobManagementPage() {
  const [searchQuery, setSearchQuery]       = useState("");
  const [filterStatus, setFilterStatus]     = useState<JobStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<JobPriority | "all">("all");
  const [showFilterModal, setShowFilterModal]   = useState(false);
  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [selectedJobId, setSelectedJobId]       = useState<string | null>(null);
  const [editJobId, setEditJobId]               = useState<string | null>(null);
  const [deleteJobId, setDeleteJobId]           = useState<string | null>(null);
  const [approvalJob, setApprovalJob]           = useState<Job | null>(null);
  const [approvalMode, setApprovalMode]         = useState<ActionMode>("approve");
  const [rejectReason, setRejectReason]         = useState("");
  const [assignDeptId, setAssignDeptId]         = useState("");
  const [assignError, setAssignError]           = useState("");
  const [page, setPage] = useState(1);
  const limit = 5;

  // Build query params — only send defined filters
  const queryParams = {
    page,
    limit,
    ...(searchQuery.trim()              && { search: searchQuery.trim() }),
    ...(filterStatus   !== "all"        && { status: filterStatus }),
    ...(filterPriority !== "all"        && { priority: filterPriority }),
  };

  const { data, isLoading, isFetching, isError, refetch } = useGetJobsQuery(queryParams);
  const { data: allJobsData } = useGetJobsQuery({ limit: 500 });

  // Count-only queries (limit:1) — we only need `total` for system-wide stats
  const { data: cPending }     = useGetJobsQuery({ page: 1, limit: 1, status: "pending" });
  const { data: cConfirmed }   = useGetJobsQuery({ page: 1, limit: 1, status: "confirmed" });
  const { data: cComposition } = useGetJobsQuery({ page: 1, limit: 1, status: "in-composition" });
  const { data: cMontage }     = useGetJobsQuery({ page: 1, limit: 1, status: "in-montage" });
  const { data: cPrinting }    = useGetJobsQuery({ page: 1, limit: 1, status: "in-printing" });
  const { data: cBinding }     = useGetJobsQuery({ page: 1, limit: 1, status: "in-binding" });
  const { data: cPackaging }   = useGetJobsQuery({ page: 1, limit: 1, status: "in-packaging" });
  const { data: cQuality }     = useGetJobsQuery({ page: 1, limit: 1, status: "quality-check" });
  const { data: cReady }       = useGetJobsQuery({ page: 1, limit: 1, status: "ready-for-delivery" });
  const { data: cDelivered }   = useGetJobsQuery({ page: 1, limit: 1, status: "delivered" });
  const { data: cPartial }     = useGetJobsQuery({ page: 1, limit: 1, status: "partial-delivered" });
  const { data: cCompleted }   = useGetJobsQuery({ page: 1, limit: 1, status: "completed" });
  const { data: cUrgent }      = useGetJobsQuery({ page: 1, limit: 1, priority: "urgent" });

  const [deleteJob,   { isLoading: isDeleting  }] = useDeleteJobMutation();
  const [approveJob,  { isLoading: isApproving }] = useApproveJobMutation();
  const [rejectJob,   { isLoading: isRejecting  }] = useRejectJobMutation();
  const [verifyJob,   { isLoading: isVerifying  }] = useVerifyJobMutation();
  const [assignJob,   { isLoading: isAssigning  }] = useAssignJobMutation();
  const [reassignJob, { isLoading: isReassigning }] = useReassignJobMutation();
  const [completeJob, { isLoading: isCompleting }] = useCompleteJobMutation();
  const { data: departments = [] } = useGetDepartmentsQuery();

  const jobs       = data?.jobs       ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const openApprovalModal = (job: Job, mode: ActionMode) => {
    setApprovalJob(job);
    setApprovalMode(mode);
    setRejectReason("");
    setAssignDeptId(job.departmentAssignedToId ?? "");
    setAssignError("");
  };

  const handleApprove = async () => {
    if (!approvalJob) return;
    try {
      await approveJob(approvalJob.id).unwrap();
      toast.success("Job confirmed");
      setApprovalJob(null);
      refetch();
    } catch (err: any) { toast.error(err?.data?.message ?? "Failed to confirm job"); }
  };

  const handleReject = async () => {
    if (!approvalJob) return;
    if (!rejectReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    try {
      await rejectJob({ id: approvalJob.id, rejectReason }).unwrap();
      toast.success("Job rejected");
      setApprovalJob(null);
      refetch();
    } catch (err: any) { toast.error(err?.data?.message ?? "Failed to reject job"); }
  };

  const handleVerify = async () => {
    if (!approvalJob) return;
    try {
      await verifyJob(approvalJob.id).unwrap();
      toast.success("Job verified");
      setApprovalJob(null);
      refetch();
    } catch (err: any) { toast.error(err?.data?.message ?? "Failed to verify job"); }
  };

  const handleAssign = async () => {
    if (!approvalJob || !assignDeptId) { setAssignError("Please select a department"); return; }
    try {
      if (approvalJob.departmentAssignedToId) {
        await reassignJob({ id: approvalJob.id, departmentAssignedToId: assignDeptId }).unwrap();
        toast.success("Job reassigned");
      } else {
        await assignJob({ id: approvalJob.id, departmentAssignedToId: assignDeptId }).unwrap();
        toast.success("Job assigned");
      }
      setApprovalJob(null);
      refetch();
    } catch (err: any) { setAssignError(err?.data?.message ?? "Failed to assign job"); }
  };

  const handleComplete = async () => {
    if (!approvalJob) return;
    try {
      await completeJob(approvalJob.id).unwrap();
      toast.success("Job marked as completed");
      setApprovalJob(null);
      refetch();
    } catch (err: any) { toast.error(err?.data?.message ?? "Failed to complete job"); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteJobId) return;
    try {
      await deleteJob(deleteJobId).unwrap();
      toast.success("Job deleted successfully");
      setDeleteJobId(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to delete job");
    }
  };

  const activeFilterCount =
    (filterStatus   !== "all" ? 1 : 0) +
    (filterPriority !== "all" ? 1 : 0);

  const totalCount     = total;
  const activeCount    =
    (cPending?.total     ?? 0) + (cConfirmed?.total   ?? 0) +
    (cComposition?.total ?? 0) + (cMontage?.total     ?? 0) +
    (cPrinting?.total    ?? 0) + (cBinding?.total     ?? 0) +
    (cPackaging?.total   ?? 0) + (cQuality?.total     ?? 0) +
    (cReady?.total       ?? 0);
  const deliveredCount = (cDelivered?.total ?? 0) + (cPartial?.total ?? 0);
  const completedCount = cCompleted?.total ?? 0;
  const urgentCount    = cUrgent?.total    ?? 0;
  const delayedCount   = (allJobsData?.jobs ?? []).filter((j) =>
    j.dueDate &&
    new Date(j.dueDate) < new Date() &&
    j.status !== "completed" &&
    j.status !== "delivered" &&
    j.status !== "rejected"
  ).length;

  return (
    <DashboardLayout userRole="admin" userName="Admin" notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Job Management</h1>
            <p className="text-sm text-custom-700 mt-1">View and manage all jobs across the system</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="self-start sm:self-auto">
            <FaPlus /> Create New Job
          </Button>
        </div>

        {/* ── Search & Filters ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-custom-700" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by job number, title, or client..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-custom-300 focus:outline-none focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors relative"
          >
            <HiOutlineFilter className="w-4 h-4" />
            <span className="text-sm font-semibold">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors"
            title="Refresh"
          >
            <HiOutlineRefresh className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
          <Card className="!p-4"><p className="text-xs text-custom-700 mb-1">Total Jobs</p><p className="text-2xl font-bold text-secondary-100">{totalCount}</p></Card>
          <Card className="!p-4"><p className="text-xs text-custom-700 mb-1">Active</p><p className="text-2xl font-bold text-blue-600">{activeCount}</p></Card>
          <Card className="!p-4"><p className="text-xs text-custom-700 mb-1">Delivered</p><p className="text-2xl font-bold text-green-600">{deliveredCount}</p></Card>
          <Card className="!p-4"><p className="text-xs text-custom-700 mb-1">Completed</p><p className="text-2xl font-bold text-emerald-600">{completedCount}</p></Card>
          <Card className="!p-4"><p className="text-xs text-custom-700 mb-1">Delayed</p><p className="text-2xl font-bold text-red-600">{delayedCount}</p></Card>
          <Card className="!p-4"><p className="text-xs text-custom-700 mb-1">Urgent</p><p className="text-2xl font-bold text-orange-600">{urgentCount}</p></Card>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-custom-100 border-b border-custom-300">
                <tr>
                  {["Job Number", "Title & Client", "Status", "Priority", "Amount", "Department", "Deadline", "Actions"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold text-secondary-100 uppercase ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-custom-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-custom-700">
                        <HiOutlineRefresh className="w-6 h-6 animate-spin" />
                        <span className="text-sm">Loading jobs…</span>
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-red-600">
                        <p className="text-sm font-semibold">Failed to load jobs</p>
                        <Button size="sm" variant="outline" onClick={() => refetch()}>
                          <HiOutlineRefresh className="w-4 h-4" /> Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-custom-700 text-sm">
                      No jobs found
                    </td>
                  </tr>
                ) : (
                  jobs.map((job: Job) => {
                    const deadlineInfo = getDeadlineInfo(job.dueDate);
                    return (
                      <tr
                        key={job.id}
                        className="hover:bg-custom-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-primary-600">{job.jobNumber}</span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-secondary-100">{job.title}</p>
                          <p className="text-xs text-custom-700">({job.customer?.name})</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[job.status] || "bg-gray-100 text-gray-700"}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${priorityColors[job.priority] || "bg-gray-500 text-white"}`}>
                            {job.priority}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {job.amount != null ? (
                            <span className="text-sm font-semibold text-secondary-100">
                              {job.amount.toLocaleString()} <span className="text-xs font-normal text-custom-700">RWF</span>
                            </span>
                          ) : (
                            <span className="text-xs text-custom-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-secondary-100">
                            {job.departmentAssignedToId
                              ? (departments.find((d) => d.id === job.departmentAssignedToId)?.name ?? "-")
                              : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {job.dueDate ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm text-custom-700">
                                <HiOutlineCalendar className="w-4 h-4" />
                                {job.dueDate.split("T")[0]}
                              </div>
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${deadlineInfo.color} ${deadlineInfo.bgColor}`}>
                                {deadlineInfo.isOverdue && <HiOutlineExclamationCircle className="w-3 h-3" />}
                                {deadlineInfo.text}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-custom-700">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <RowMenu
                              job={job}
                              onAction={openApprovalModal}
                              onView={(id) => setSelectedJobId(id)}
                              onEdit={(id) => setEditJobId(id)}
                              onDelete={(id) => setDeleteJobId(id)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-custom-300">
            <p className="text-xs text-custom-700 order-2 sm:order-1">
              Showing {jobs.length === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} jobs
            </p>
            <div className="flex items-center gap-1 order-1 sm:order-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-custom-300 text-sm font-semibold text-custom-700 hover:bg-custom-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ←
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-custom-500">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`min-w-[32px] px-2 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                        page === p
                          ? "bg-primary-500 border-primary-500 text-white"
                          : "border-custom-300 text-custom-700 hover:bg-custom-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-custom-300 text-sm font-semibold text-custom-700 hover:bg-custom-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                →
              </button>
            </div>
          </div>
        </Card>

        {/* ── Filter Modal ─────────────────────────────────────────────────── */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
            <Card className="!p-6 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-secondary-100">Filter Jobs</h3>
                <button onClick={() => setShowFilterModal(false)} className="text-custom-700 hover:text-secondary-100">
                  <HiOutlineX className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-custom-700 mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value as JobStatus | "all"); setPage(1); }}
                    className="w-full px-4 py-2 rounded-xl border border-custom-300 focus:outline-none focus:border-primary-500"
                  >
                    {[["all","All Statuses"],["pending","Pending"],["confirmed","Confirmed"],["in-composition","In Composition"],["in-montage","In Montage"],["in-printing","In Printing"],["in-binding","In Binding"],["in-packaging","In Packaging"],["quality-check","Quality Check"],["ready-for-delivery","Ready for Delivery"],["delivered","Delivered"],["completed","Completed"]].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-custom-700 mb-2">Priority</label>
                  <select
                    value={filterPriority}
                    onChange={(e) => { setFilterPriority(e.target.value as JobPriority | "all"); setPage(1); }}
                    className="w-full px-4 py-2 rounded-xl border border-custom-300 focus:outline-none focus:border-primary-500"
                  >
                    {[["all","All Priorities"],["low","Low"],["normal","Normal"],["high","High"],["urgent","Urgent"]].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setPage(1); }}
                  fullWidth
                >
                  Reset
                </Button>
                <Button onClick={() => setShowFilterModal(false)} fullWidth>
                  Apply Filters
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── Create Job Modal ─────────────────────────────────────────────── */}
        {showCreateModal && (
          <CreateJobModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              refetch();
            }}
          />
        )}

        {/* ── Job Detail Modal ─────────────────────────────────────────────── */}
        {selectedJobId && (
          <JobDetailModal
            jobId={selectedJobId}
            onClose={() => setSelectedJobId(null)}
            onAssigned={() => {
              setSelectedJobId(null);
              refetch();
            }}
          />
        )}

        {/* ── Edit Job Modal ───────────────────────────────────────────────── */}
        {editJobId && (
          <EditJobModal
            jobId={editJobId}
            onClose={() => setEditJobId(null)}
            onUpdated={() => {
              setEditJobId(null);
              refetch();
            }}
          />
        )}

        {/* ── Approve / Reject / Verify Modal ──────────────────────────────── */}
        {approvalJob && (
          <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-secondary-100 capitalize">
                  {approvalMode === "approve" ? "Confirm Job" : approvalMode === "reject" ? "Reject Job" : approvalMode === "assign" ? (approvalJob?.departmentAssignedToId ? "Reassign Department" : "Assign to Department") : approvalMode === "complete" ? "Complete Job" : "Verify Job"}
                </h3>
                <button onClick={() => setApprovalJob(null)} className="text-custom-700 hover:text-secondary-100">
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-custom-700 mb-4">
                {approvalJob.jobNumber} — {approvalJob.title}
              </p>
              {approvalMode === "reject" && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-custom-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Explain why this job is being rejected…"
                    className="w-full px-3 py-2 rounded-xl border border-custom-300 focus:outline-none focus:border-primary-500 resize-none text-sm"
                  />
                </div>
              )}
              {approvalMode === "verify" && (
                <p className="text-sm text-custom-700 mb-4">
                  This will mark the job as <span className="font-semibold text-secondary-100">verified</span>.
                </p>
              )}
              {approvalMode === "assign" && (
                <div className="mb-4 space-y-3">
                  {approvalJob.departmentAssignedToId && (
                    <p className="text-xs text-custom-700 bg-custom-50 px-3 py-2 rounded-lg">
                      Currently: <span className="font-semibold">{departments.find((d) => d.id === approvalJob.departmentAssignedToId)?.name ?? "—"}</span>
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-custom-700 mb-1">
                      {approvalJob.departmentAssignedToId ? "New Department" : "Department"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={assignDeptId}
                      onChange={(e) => { setAssignDeptId(e.target.value); setAssignError(""); }}
                      className="w-full px-4 py-2 rounded-xl border border-custom-300 focus:outline-none focus:border-primary-500"
                    >
                      <option value="">Select department…</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  {assignError && <p className="text-xs text-red-600">{assignError}</p>}
                </div>
              )}
              {approvalMode === "complete" && (
                <p className="text-sm text-custom-700 mb-4">
                  Mark <span className="font-semibold text-secondary-100">{approvalJob.jobNumber}</span> as <span className="font-semibold text-green-600">completed</span>? This cannot be undone.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setApprovalJob(null)}
                  className="flex-1 px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors"
                >
                  Cancel
                </button>
                {approvalMode === "approve" && (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <HiOutlineCheckCircle className="w-4 h-4" />
                    {isApproving ? "Confirming…" : "Confirm Job"}
                  </button>
                )}
                {approvalMode === "reject" && (
                  <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <HiOutlineXCircle className="w-4 h-4" />
                    {isRejecting ? "Rejecting…" : "Reject Job"}
                  </button>
                )}
                {approvalMode === "verify" && (
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <HiOutlineBadgeCheck className="w-4 h-4" />
                    {isVerifying ? "Verifying…" : "Verify Job"}
                  </button>
                )}
                {approvalMode === "assign" && (
                  <button
                    onClick={handleAssign}
                    disabled={isAssigning || isReassigning}
                    className="flex-1 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <HiOutlineClipboardList className="w-4 h-4" />
                    {(isAssigning || isReassigning) ? "Saving…" : approvalJob?.departmentAssignedToId ? "Reassign" : "Assign"}
                  </button>
                )}
                {approvalMode === "complete" && (
                  <button
                    onClick={handleComplete}
                    disabled={isCompleting}
                    className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <HiOutlineCheckCircle className="w-4 h-4" />
                    {isCompleting ? "Completing…" : "Confirm Complete"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
        {deleteJobId && (
          <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xl w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <HiOutlineTrash className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-secondary-100">Delete Job</h3>
                  <p className="text-sm text-custom-700">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-custom-700 mb-5">
                Are you sure you want to delete this job? All associated data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteJobId(null)}
                  className="flex-1 px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
