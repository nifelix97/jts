import { useMemo, useRef, useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineClipboardList,
  HiOutlineDocumentDownload,
  HiOutlinePaperClip,
  HiOutlinePencil,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import { toast } from "react-toastify";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import { useGetDepartmentsQuery } from "../../store/services/departmentsService";
import {
  useDeleteSampleMutation,
  useGetSamplesQuery,
  useReviewSampleMutation,
  useUpdateSampleMutation,
  type DepartmentSample,
  type SampleStatus,
} from "../../store/services/departmentSamplesService";

const cls = "w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors";

const STATUS_COLORS: Record<SampleStatus, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  reviewed: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

// ─── PDF ──────────────────────────────────────────────────────────────────────

function printSamplePdf(sample: DepartmentSample) {
  const win = window.open("", "_blank");
  if (!win) return;
  const headerUrl = window.location.origin + "/header.png";
  const qty = sample.quantity != null ? String(sample.quantity) + " " + (sample.unit ?? "") : "-";
  const date = new Date(sample.sampleDate).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" });
  const reviewedAt = sample.reviewedAt ? new Date(sample.reviewedAt).toLocaleDateString("en-RW") : "";
  let rows = "";
  rows += "<tr><td>Description</td><td>" + (sample.description ?? "-") + "</td></tr>";
  rows += "<tr><td>Quantity</td><td>" + qty + "</td></tr>";
  rows += "<tr><td>Status</td><td><strong>" + sample.status.toUpperCase() + "</strong></td></tr>";
  if (sample.notes) rows += "<tr><td>Notes</td><td>" + sample.notes + "</td></tr>";
  if (sample.reviewNote) rows += "<tr><td>Review Note</td><td>" + sample.reviewNote + "</td></tr>";
  if (sample.reviewedBy) rows += "<tr><td>Reviewed By</td><td>" + sample.reviewedBy.fullName + "</td></tr>";
  if (reviewedAt) rows += "<tr><td>Reviewed At</td><td>" + reviewedAt + "</td></tr>";
  const html = `<!DOCTYPE html><html><head><title>Sample - ${sample.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size:A4; margin:0; }
  body { font-family:Arial,sans-serif; color:#111; width:210mm; min-height:297mm; }
  .header img { width:100%; display:block; }
  .content { padding:28px 40px 120px; }
  h2 { font-size:15px; font-weight:bold; margin-bottom:6px; }
  .meta { color:#666; font-size:11px; margin-bottom:20px; padding-bottom:10px; border-bottom:1px solid #eee; }
  .meta strong { color:#111; }
  table { width:100%; border-collapse:collapse; margin-bottom:16px; }
  td { padding:7px 12px; border:1px solid #ddd; font-size:12px; vertical-align:top; }
  td:first-child { font-weight:bold; width:150px; background:#f7f7f7; white-space:nowrap; }
  .footer { position:fixed; bottom:0; left:0; right:0; background:#fff; padding:8px 28px 6px; border-top:1px solid #bbb; }
  .footer-row { display:flex; justify-content:space-between; font-size:9.5px; color:#333; line-height:1.6; }
  .footer-tagline { text-align:center; font-size:10.5px; font-style:italic; color:#00aeef; font-weight:bold; margin-top:4px; padding-top:4px; border-top:1px solid #00aeef; }
  @media print { .footer { position:fixed; bottom:0; } }
</style></head><body>
  <div class="header"><img src="${headerUrl}" /></div>
  <div class="content">
    <h2>${sample.name}</h2>
    <div class="meta">
      Department: <strong>${sample.department?.name ?? "-"}</strong> &nbsp;|&nbsp;
      Ref: <strong>${sample.referenceNo ?? "-"}</strong> &nbsp;|&nbsp;
      Date: <strong>${date}</strong>
    </div>
    <table>${rows}</table>
  </div>
  <div class="footer">
    <div class="footer-row">
      <div>B.P. 863 Kigali - Rwanda<br/>TIN / <strong>T.V.A. N0 100021520</strong></div>
      <div style="text-align:center">Tel: (+250) 788 313 817 / (+250) 788 304 549<br/>No. RC: 536 / 09 / NYR</div>
      <div style="text-align:right">E-mail: Santrackpresse@yahoo.com<br/>Compte BK: <strong>100000174372</strong></div>
    </div>
    <div class="footer-tagline">Rapidite - Qualite - Innovation - Esprit d Equipe</div>
  </div>
</body></html>`;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditSampleModal({ sample, onClose, onSuccess }: { sample: DepartmentSample; onClose: () => void; onSuccess: () => void }) {
  const [update, { isLoading }] = useUpdateSampleMutation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name:        sample.name,
    description: sample.description ?? "",
    quantity:    sample.quantity != null ? String(sample.quantity) : "",
    unit:        sample.unit ?? "",
    sampleDate:  sample.sampleDate.slice(0, 10),
    notes:       sample.notes ?? "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sampleDate) { toast.error("Name and date are required"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    files.forEach((f) => fd.append("documents", f));
    try {
      await update({ id: sample.id, body: fd }).unwrap();
      toast.success("Sample updated");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to update");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-lg w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-secondary-100">Edit Sample</h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Name *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Quantity</label>
              <input type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className={cls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Unit</label>
              <input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="pcs, kg…" className={cls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Sample Date *</label>
              <input type="date" value={form.sampleDate} onChange={(e) => set("sampleDate", e.target.value)} className={cls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={`${cls} resize-none`} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${cls} resize-none`} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Add Attachments</label>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-custom-300 text-sm text-custom-700 hover:border-primary-400 hover:text-primary-500 transition-colors w-full justify-center">
                <HiOutlinePaperClip className="w-4 h-4" />
                {files.length ? `${files.length} file(s) selected` : "Attach files"}
              </button>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 transition-colors">
              {isLoading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({ sample, onClose }: { sample: DepartmentSample; onClose: () => void }) {
  const [review, { isLoading }] = useReviewSampleMutation();
  const [status, setStatus] = useState<"reviewed" | "approved" | "rejected">("reviewed");
  const [note, setNote] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await review({ id: sample.id, status, reviewNote: note.trim() || undefined }).unwrap();
      toast.success("Sample reviewed");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to review");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-secondary-100 mb-1">Review Sample</h3>
        <p className="text-sm text-custom-700 mb-4">{sample.name} — {sample.department?.name}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Decision</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={cls}>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${cls} resize-none`} placeholder="Add a review note…" />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 transition-colors">
              {isLoading ? "Saving…" : "Submit Review"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Sample Card ──────────────────────────────────────────────────────────────

function SampleCard({
  sample,
  onEdit,
  onDelete,
  onReview,
}: {
  sample: DepartmentSample;
  onEdit: (s: DepartmentSample) => void;
  onDelete: (id: string) => void;
  onReview: (s: DepartmentSample) => void;
}) {
  return (
    <Card className="!p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-bold text-secondary-100 truncate">{sample.name}</p>
          <p className="text-xs text-custom-500">{sample.department?.name ?? "—"}{sample.referenceNo ? ` · ${sample.referenceNo}` : ""}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize ${STATUS_COLORS[sample.status]}`}>
          {sample.status}
        </span>
      </div>

      {sample.description && <p className="text-xs text-custom-700 line-clamp-2">{sample.description}</p>}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-custom-700">
        <span>Qty: <span className="font-semibold text-secondary-100">{sample.quantity != null ? `${sample.quantity} ${sample.unit ?? ""}` : "—"}</span></span>
        <span>Date: <span className="font-semibold text-secondary-100">{new Date(sample.sampleDate).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}</span></span>
        {sample.createdBy && <span className="col-span-2">By: <span className="font-semibold text-secondary-100">{sample.createdBy.fullName}</span></span>}
      </div>

      {sample.reviewNote && (
        <p className="text-xs text-custom-500 italic border-l-2 border-custom-200 pl-2">"{sample.reviewNote}"</p>
      )}

      {sample.documents && sample.documents.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {sample.documents.map((d) => (
            <a key={d.id} href={d.fileUrl} download={d.fileName}
              className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg hover:bg-primary-100 transition-colors">
              <HiOutlinePaperClip className="w-3 h-3" />{d.fileName}
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1 border-t border-custom-200">
        <button onClick={() => printSamplePdf(sample)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary-50 text-primary-600 text-xs font-semibold hover:bg-primary-100 transition-colors">
          <HiOutlineDocumentDownload className="w-4 h-4" /> PDF
        </button>
        {sample.status === "pending" && (
          <button onClick={() => onReview(sample)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-semibold hover:bg-emerald-100 transition-colors">
            <HiOutlineCheckCircle className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => onEdit(sample)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-custom-100 text-secondary-100 text-xs font-semibold hover:bg-custom-200 transition-colors">
          <HiOutlinePencil className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(sample.id)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors">
          <HiOutlineTrash className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PMSamplesPage() {
  const [deptFilter, setDeptFilter]     = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<SampleStatus | "">("");
  const [search, setSearch]             = useState("");
  const [reviewTarget, setReviewTarget] = useState<DepartmentSample | null>(null);
  const [editTarget, setEditTarget]     = useState<DepartmentSample | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: departments = [] } = useGetDepartmentsQuery();
  const { data: samples = [], isLoading, refetch } = useGetSamplesQuery(
    deptFilter ? { departmentId: deptFilter } : undefined
  );
  const [deleteSample, { isLoading: deleting }] = useDeleteSampleMutation();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return samples.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (q && !s.name.toLowerCase().includes(q) && !(s.referenceNo ?? "").toLowerCase().includes(q) && !(s.department?.name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [samples, statusFilter, search]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteSample(deleteConfirm).unwrap();
      toast.success("Sample deleted");
      setDeleteConfirm(null);
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to delete");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <HiOutlineClipboardList className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Department Samples</h1>
              <p className="text-sm text-custom-700 mt-0.5">Review samples submitted by departments</p>
            </div>
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-custom-700 self-start sm:self-auto">
            <HiOutlineRefresh className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(["pending", "reviewed", "approved", "rejected"] as SampleStatus[]).map((s) => (
            <Card key={s} className="!p-4 text-center cursor-pointer" onClick={() => setStatusFilter(statusFilter === s ? "" : s)}>
              <p className="text-xs text-custom-700 mb-1 capitalize">{s}</p>
              <p className={`text-2xl font-bold ${STATUS_COLORS[s].split(" ")[1]}`}>
                {isLoading ? "—" : samples.filter((x) => x.status === s).length}
              </p>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDeptFilter("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${!deptFilter ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"}`}>
            All Departments
          </button>
          {departments.map((d) => (
            <button key={d.id} onClick={() => setDeptFilter(d.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${deptFilter === d.id ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"}`}>
              {d.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-700" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search samples…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-400 focus:outline-none focus:border-primary-400 transition-colors" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SampleStatus | "")}
            className="px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="!p-5 animate-pulse h-44">
                <div className="h-4 w-1/2 bg-custom-200 rounded mb-3" />
                <div className="h-3 w-3/4 bg-custom-200 rounded mb-2" />
                <div className="h-3 w-1/3 bg-custom-200 rounded" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="!p-12 text-center">
            <HiOutlineClipboardList className="w-10 h-10 text-custom-400 mx-auto mb-3" />
            <p className="text-secondary-100 font-semibold">No samples found</p>
            <p className="text-sm text-custom-700 mt-1">Try adjusting the filters.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <SampleCard key={s.id} sample={s} onEdit={setEditTarget} onDelete={setDeleteConfirm} onReview={setReviewTarget} />
            ))}
          </div>
        )}
      </div>

      {editTarget && (
        <EditSampleModal sample={editTarget} onClose={() => setEditTarget(null)} onSuccess={() => { setEditTarget(null); refetch(); }} />
      )}

      {reviewTarget && <ReviewModal sample={reviewTarget} onClose={() => setReviewTarget(null)} />}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-secondary-100/60 z-50 flex items-center justify-center p-4">
          <Card className="!p-6 max-w-sm w-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-secondary-100">Delete Sample</h3>
                <p className="text-sm text-custom-700 mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors disabled:opacity-40">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors">
                <HiOutlineTrash className="w-4 h-4" />
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
