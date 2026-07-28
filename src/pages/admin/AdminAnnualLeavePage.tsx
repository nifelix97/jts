import { useState, useRef } from "react";
import {
  HiOutlineCalendar,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineSearch,
  HiOutlineUpload,
  HiOutlineEye,
  HiOutlineThumbUp,
  HiOutlineThumbDown,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineDocumentText,
  HiOutlineDownload,
} from "react-icons/hi";
import { toast } from "react-toastify";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import {
  useGetAnnualLeavesQuery,
  useCreateAnnualLeaveMutation,
  useUpdateAnnualLeaveMutation,
  useReviewAnnualLeaveMutation,
  useDeleteAnnualLeaveMutation,
  useImportAnnualLeavesMutation,
  type AnnualLeave,
  type AnnualLeaveStatus,
  type CreateAnnualLeavePayload,
} from "../../store/services/annualLeaveService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const statusStyle: Record<string, string> = {
  PENDING:  "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const statusIcon: Record<string, React.ReactElement> = {
  PENDING:  <HiOutlineClock className="w-3.5 h-3.5" />,
  APPROVED: <HiOutlineCheckCircle className="w-3.5 h-3.5" />,
  REJECTED: <HiOutlineExclamationCircle className="w-3.5 h-3.5" />,
};

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 " +
  "text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 " +
  "focus:ring-2 focus:ring-primary-200 transition-colors " +
  "font-[family-name:var(--font-family-primary)]";

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

interface FormState {
  fullNames: string;
  firstLeave: string;
  secondLeave: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  fullNames: "",
  firstLeave: "",
  secondLeave: "",
  notes: "",
});

function AnnualLeaveFormModal({
  editing,
  onClose,
  onSuccess,
}: {
  editing?: AnnualLeave;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          fullNames:   editing.fullNames,
          firstLeave:  editing.firstLeave  ?? "",
          secondLeave: editing.secondLeave ?? "",
          notes:       editing.notes ?? "",
        }
      : emptyForm()
  );

  const [createLeave, { isLoading: creating }] = useCreateAnnualLeaveMutation();
  const [updateLeave, { isLoading: updating }] = useUpdateAnnualLeaveMutation();
  const isLoading = creating || updating;

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullNames.trim()) { toast.error("Employee name is required"); return; }
    if (!form.firstLeave && !form.secondLeave) {
      toast.error("At least one leave period is required"); return;
    }

    const payload: CreateAnnualLeavePayload = {
      fullNames:   form.fullNames.trim(),
      firstLeave:  form.firstLeave  || undefined,
      secondLeave: form.secondLeave || undefined,
      notes:       form.notes.trim() || undefined,
    };

    try {
      if (editing) {
        await updateLeave({ id: editing.id, ...payload }).unwrap();
        toast.success("Annual leave updated");
      } else {
        await createLeave(payload).unwrap();
        toast.success("Annual leave created");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to save");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-lg w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-secondary-100">
              {editing ? "Edit Annual Leave" : "Add Annual Leave"}
            </h3>
            <p className="text-sm text-custom-700 mt-0.5">
              Leave days are calculated automatically by the server
            </p>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Name */}
          <div>
            <label className="block text-sm font-semibold text-secondary-100 mb-1.5">
              Employee Name *
            </label>
            <input
              type="text"
              value={form.fullNames}
              onChange={set("fullNames")}
              placeholder="Full name of the employee"
              className={inputCls}
            />
          </div>

          {/* First Leave Period */}
          <div className="rounded-xl border border-custom-200 p-4 space-y-3">
            <p className="text-sm font-bold text-secondary-100">First Leave Period</p>
            <input
              type="text"
              value={form.firstLeave}
              onChange={set("firstLeave")}
              placeholder="e.g. 03/07/2026 - 16/07/2026"
              className={inputCls}
            />
          </div>

          {/* Second Leave Period */}
          <div className="rounded-xl border border-custom-200 p-4 space-y-3">
            <p className="text-sm font-bold text-secondary-100">Second Leave Period <span className="text-custom-700 font-normal">(optional)</span></p>
            <input
              type="text"
              value={form.secondLeave}
              onChange={set("secondLeave")}
              placeholder="e.g. 01/10/2026 – 13/10/2026"
              className={inputCls}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-secondary-100 mb-1.5">Notes <span className="text-custom-700 font-normal">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 transition-colors resize-none font-[family-name:var(--font-family-primary)]"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 transition-colors">
              {isLoading ? "Saving..." : editing ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  leave,
  onClose,
  onEdit,
  onApprove,
  onReject,
}: {
  leave: AnnualLeave;
  onClose: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const rows = [
    { label: "Employee",      value: leave.fullNames },
    { label: "First Period",  value: leave.firstLeave  ?? "—" },
    { label: "First Days",    value: leave.firstLeaveDays  != null ? `${leave.firstLeaveDays} day(s)`  : "—" },
    { label: "Second Period", value: leave.secondLeave ?? "—" },
    { label: "Second Days",   value: leave.secondLeaveDays != null ? `${leave.secondLeaveDays} day(s)` : "—" },
    { label: "Total Days",    value: (leave.firstLeaveDays ?? 0) + (leave.secondLeaveDays ?? 0) > 0
        ? `${(leave.firstLeaveDays ?? 0) + (leave.secondLeaveDays ?? 0)} day(s)` : "—" },
    { label: "Created",       value: fmt(leave.createdAt) },
  ];

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-md w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-secondary-100">Annual Leave Details</h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-custom-700">Status</span>
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${statusStyle[leave.status]}`}>
              {statusIcon[leave.status]} {leave.status}
            </span>
          </div>
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-custom-700">{label}</span>
              <span className="text-sm font-semibold text-secondary-100">{value}</span>
            </div>
          ))}
          {leave.notes && (
            <div>
              <p className="text-sm text-custom-700 mb-1">Notes</p>
              <p className="text-sm text-secondary-100 bg-custom-50 rounded-xl p-3">{leave.notes}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end border-t border-custom-300 pt-4">
          {leave.status === "PENDING" && (
            <>
              <button onClick={onReject}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                <HiOutlineThumbDown className="w-4 h-4" /> Reject
              </button>
              <button onClick={onApprove}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-colors">
                <HiOutlineThumbUp className="w-4 h-4" /> Approve
              </button>
            </>
          )}
          <button onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-secondary-100 border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlinePencil className="w-4 h-4" /> Edit
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
            Close
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  leave,
  action,
  onClose,
  onSuccess,
}: {
  leave: AnnualLeave;
  action: "approve" | "reject";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [reviewLeave, { isLoading }] = useReviewAnnualLeaveMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === "reject" && !notes.trim()) {
      toast.error("Please provide a reason for rejection"); return;
    }
    try {
      await reviewLeave({ id: leave.id, action, notes: notes.trim() || undefined }).unwrap();
      toast.success(`Annual leave ${action === "approve" ? "approved" : "rejected"}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to process review");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-md w-full my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-secondary-100">
            {action === "approve" ? "Approve" : "Reject"} Annual Leave
          </h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl bg-custom-50 border border-custom-200 p-3 mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-custom-700">Employee</span>
            <span className="font-semibold text-secondary-100">{leave.fullNames}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-custom-700">Total Days</span>
            <span className="font-semibold text-secondary-100">{(leave.firstLeaveDays ?? 0) + (leave.secondLeaveDays ?? 0)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {action === "reject" && (
            <div>
              <label className="block text-sm font-semibold text-secondary-100 mb-1.5">Reason *</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                placeholder="Explain the rejection reason..."
                className="w-full px-3 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 transition-colors resize-none" />
            </div>
          )}
          {action === "approve" && (
            <div>
              <label className="block text-sm font-semibold text-secondary-100 mb-1.5">Notes <span className="font-normal text-custom-700">(optional)</span></label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Optional notes..."
                className="w-full px-3 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 transition-colors resize-none" />
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isLoading}
              className={`px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-colors ${
                action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              }`}>
              {isLoading ? "Processing..." : action === "approve" ? "Approve" : "Reject"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Delete Confirm Modal ────────────────────────────────────────────────────

function DeleteModal({
  leave,
  onClose,
  onSuccess,
}: {
  leave: AnnualLeave;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [deleteLeave, { isLoading }] = useDeleteAnnualLeaveMutation();

  const handleDelete = async () => {
    try {
      await deleteLeave(leave.id).unwrap();
      toast.success("Record deleted");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to delete");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <HiOutlineTrash className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-secondary-100">Delete Record</h3>
            <p className="text-sm text-custom-700">This action cannot be undone.</p>
          </div>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-5 text-sm">
          <span className="text-red-700">You are about to delete the annual leave record for </span>
          <span className="font-bold text-red-800">{leave.fullNames}</span>.
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
            {isLoading ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importLeaves, { isLoading }] = useImportAnnualLeavesMutation();

  const handleImport = async () => {
    if (!file) { toast.error("Please select an Excel file (.xlsx)"); return; }
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await importLeaves(fd).unwrap();
      toast.success(`Imported ${res.imported} record(s) successfully`);
      if (res.errors?.length) {
        toast.warn(`${res.errors.length} row(s) had errors — check console`);
        console.warn("[Annual Leave Import errors]", res.errors);
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Import failed");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-md w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-secondary-100">Import Annual Leaves</h3>
            <p className="text-sm text-custom-700 mt-0.5">Upload your Excel spreadsheet (.xlsx)</p>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Info box */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 space-y-1">
            <p className="font-semibold">Expected columns in your Excel file:</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              <li><strong>Noms</strong> — employee full name</li>
              <li><strong>Dates de congés</strong> — leave date ranges</li>
            </ul>
            <p className="text-xs mt-1">The server auto-detects merged header rows, calculates leave days, and bulk-inserts all rows.</p>
          </div>

          {/* File drop zone */}
          <label className="flex flex-col items-center justify-center gap-3 px-4 py-8 rounded-xl border-2 border-dashed border-custom-300 bg-style-500 cursor-pointer hover:border-primary-400 transition-colors">
            <HiOutlineUpload className="w-8 h-8 text-custom-400" />
            <div className="text-center">
              <p className="text-sm font-semibold text-secondary-100">
                {file ? file.name : "Click to select Excel file"}
              </p>
              <p className="text-xs text-custom-700 mt-0.5">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports .xlsx format"}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {file && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-custom-50 border border-custom-200 text-sm">
              <div className="flex items-center gap-2">
                <HiOutlineDocumentText className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-secondary-100 truncate max-w-[200px]">{file.name}</span>
              </div>
              <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="text-red-500 hover:underline text-xs font-semibold shrink-0 ml-2">
                Remove
              </button>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
              Cancel
            </button>
            <button onClick={handleImport} disabled={!file || isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 transition-colors">
              <HiOutlineDownload className="w-4 h-4" />
              {isLoading ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAnnualLeavePage() {
  const [statusFilter, setStatusFilter] = useState<"" | AnnualLeaveStatus>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AnnualLeave | null>(null);
  const [detail, setDetail] = useState<AnnualLeave | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ leave: AnnualLeave; action: "approve" | "reject" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnualLeave | null>(null);
  const [showImport, setShowImport] = useState(false);

  const { data, isLoading, refetch } = useGetAnnualLeavesQuery({
    page,
    limit: 7,
    ...(statusFilter ? { status: statusFilter } : {}),
  });

  // Separate query for accurate totals across all pages
  const { data: countsData } = useGetAnnualLeavesQuery({ limit: 1000 });
  const allRecords = countsData?.data ?? [];
  const pendingCount  = allRecords.filter((r) => r.status === "PENDING").length;
  const approvedCount = allRecords.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = allRecords.filter((r) => r.status === "REJECTED").length;

  const all = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const rows = all.filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || (r.fullNames ?? "").toLowerCase().includes(q);
  });


  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <HiOutlineCalendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Annual Leave</h1>
              <p className="text-sm text-custom-700 mt-0.5">Manage employee annual leave records</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()}
              className="p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-custom-700" title="Refresh">
              <HiOutlineRefresh className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
              <HiOutlineUpload className="w-4 h-4" /> Import Excel
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
              <HiOutlinePlus className="w-4 h-4" /> Add Record
            </button>
          </div>
        </div>

        {/* Summary Cards */}
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by employee name..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
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
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="!p-4 animate-pulse">
                <div className="h-4 w-1/3 bg-custom-200 rounded mb-2" />
                <div className="h-3 w-full bg-custom-200 rounded" />
              </Card>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="!p-10 text-center">
            <HiOutlineCalendar className="w-10 h-10 text-custom-400 mx-auto mb-3" />
            <p className="font-semibold text-secondary-100">No annual leave records found</p>
            <p className="text-sm text-custom-700 mt-1">
              {search
                ? `No results for "${search}"`
                : statusFilter
                ? `No ${statusFilter.toLowerCase()} records`
                : "Import an Excel file or add records manually"}
            </p>
          </Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-custom-50">
                  <tr>
                    {[
                      "Employee",
                      "1st Period",
                      "1st Days",
                      "2nd Period",
                      "2nd Days",
                      "Total Days",
                      "Status",
                      "Actions",
                    ].map((h) => (
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
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-custom-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-indigo-600">
                              {(row.fullNames ?? "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-semibold text-secondary-100 whitespace-nowrap">
                            {row.fullNames}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-custom-700 whitespace-nowrap">
                        {row.firstLeave ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-custom-700 whitespace-nowrap">
                        {row.firstLeaveDays != null ? `${row.firstLeaveDays}d` : "—"}
                      </td>
                      <td className="px-4 py-3 text-custom-700 whitespace-nowrap">
                        {row.secondLeave ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-custom-700 whitespace-nowrap">
                        {row.secondLeaveDays != null ? `${row.secondLeaveDays}d` : "—"}
                      </td>
                      <td className="px-4 py-3 font-bold text-secondary-100 whitespace-nowrap">
                        {(row.firstLeaveDays ?? 0) + (row.secondLeaveDays ?? 0)}d
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${statusStyle[row.status]}`}
                        >
                          {statusIcon[row.status]} {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetail(row)}
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                            title="View"
                          >
                            <HiOutlineEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditing(row)}
                            className="p-1.5 rounded-lg text-custom-700 hover:bg-custom-100 transition-colors"
                            title="Edit"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          {row.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => setReviewTarget({ leave: row, action: "approve" })}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Approve"
                              >
                                <HiOutlineThumbUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setReviewTarget({ leave: row, action: "reject" })}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title="Reject"
                              >
                                <HiOutlineThumbDown className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteTarget(row)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 text-sm">
            <span className="text-custom-700">
              {total} total · page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-custom-300 text-custom-700 hover:bg-custom-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    p === page
                      ? "bg-primary-500 text-white"
                      : "border border-custom-300 text-custom-700 hover:bg-custom-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-custom-300 text-custom-700 hover:bg-custom-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <AnnualLeaveFormModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refetch(); }}
        />
      )}

      {editing && (
        <AnnualLeaveFormModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => { setEditing(null); refetch(); }}
        />
      )}

      {detail && !reviewTarget && (
        <DetailModal
          leave={detail}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditing(detail); setDetail(null); }}
          onApprove={() => setReviewTarget({ leave: detail, action: "approve" })}
          onReject={() => setReviewTarget({ leave: detail, action: "reject" })}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          leave={reviewTarget.leave}
          action={reviewTarget.action}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => { setReviewTarget(null); setDetail(null); refetch(); }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          leave={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => { setDeleteTarget(null); refetch(); }}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); refetch(); }}
        />
      )}
    </DashboardLayout>
  );
}
