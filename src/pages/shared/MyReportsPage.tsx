import { useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
  HiOutlineDocumentText,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlinePaperClip,
  HiOutlineInbox,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlinePencilAlt,
  HiOutlineTrash,
} from "react-icons/hi";
import { DashboardLayout, EditReportModal } from "../../components";
import { Card } from "../../components/ui";
import {
  useGetMyReportsQuery,
  useGetAssignedReportsQuery,
  useDeleteReportMutation,
} from "../../store/services/reportsService";
import type { Report } from "../../store/services/reportsService";
import { useAuth } from "../../context/AuthContext";

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(/\/api$/, "");

function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

const PAGE_SIZE = 10;

// ─── Shared report card ───────────────────────────────────────────────────────

function ReportCard({
  report,
  expanded,
  onToggle,
  showSender = false,
  onEdit,
  onDelete,
}: {
  report: any;
  expanded: boolean;
  onToggle: () => void;
  showSender?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-custom-50 transition-colors text-left"
      >
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
            <HiOutlineDocumentText className="w-4 h-4 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-secondary-100 truncate">{report.title}</p>
            <p className="text-xs text-custom-700 mt-0.5 truncate">{report.purpose}</p>
            {showSender && report.createdBy && (
              <p className="text-xs text-primary-500 mt-0.5 font-semibold">
                From: {report.createdBy.name}
                <span className="text-custom-700 font-normal ml-1">({report.createdBy.role})</span>
                {report.createdBy.phone && (
                  <span className="text-custom-700 font-normal ml-1">· {report.createdBy.phone}</span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-custom-700">Submitted</p>
            <p className="text-xs font-semibold text-secondary-100">
              {new Date(report.createdAt).toLocaleDateString("en-RW", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </p>
            <p className="text-xs text-custom-500">
              {new Date(report.createdAt).toLocaleTimeString("en-RW", {
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <span
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 rounded-lg text-custom-700 hover:bg-primary-100 hover:text-primary-600 transition-colors"
                title="Edit report"
              >
                <HiOutlinePencilAlt className="w-4 h-4" />
              </span>
            )}
            {onDelete && (
              <span
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-lg text-custom-700 hover:bg-red-100 hover:text-red-600 transition-colors"
                title="Delete report"
              >
                <HiOutlineTrash className="w-4 h-4" />
              </span>
            )}
            {expanded
              ? <HiOutlineChevronUp className="w-4 h-4 text-custom-700" />
              : <HiOutlineChevronDown className="w-4 h-4 text-custom-700" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-custom-200 px-5 py-4 space-y-4 bg-custom-50">
          {/* Date on mobile */}
          <p className="text-xs text-custom-700 sm:hidden">
            Submitted: <span className="font-semibold text-secondary-100">
              {new Date(report.createdAt).toLocaleString("en-RW")}
            </span>
          </p>

          {/* Visible To */}
          {report.visibleTo && report.visibleTo.length > 0 && (
            <div>
              <p className="text-xs font-bold text-secondary-100 uppercase mb-1.5">Visible To</p>
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(report.visibleTo) ? report.visibleTo : String(report.visibleTo).split(",")).map((role: string) => (
                  <span key={role} className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Items table */}
          {report.items?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-secondary-100 uppercase mb-2">Records</p>
              <div className="rounded-xl overflow-hidden border border-custom-200">
                <table className="w-full text-xs">
                  <thead className="bg-custom-100">
                    <tr>
                      {["#", "Record / Item", "Qty", "Amount (RWF)"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-bold text-secondary-100">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-custom-200 bg-white">
                    {(Array.isArray(report.items) ? report.items : []).map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-custom-700">{i + 1}</td>
                        <td className="px-3 py-2 text-secondary-100">{item.record}</td>
                        <td className="px-3 py-2 text-custom-700">{item.quantity || "—"}</td>
                        <td className="px-3 py-2 text-custom-700">
                          {item.amount ? Number(item.amount).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {report.notes && (
            <div>
              <p className="text-xs font-bold text-secondary-100 uppercase mb-1">Notes</p>
              <p className="text-sm text-custom-700 whitespace-pre-wrap">{report.notes}</p>
            </div>
          )}

          {/* Attachments */}
          {(() => {
            const urls: string[] =
              Array.isArray(report.attachmentUrls) && report.attachmentUrls.length > 0
                ? report.attachmentUrls
                : report.attachmentUrl
                ? [report.attachmentUrl]
                : [];
            if (urls.length === 0) return null;
            return (
              <div>
                <p className="text-xs font-bold text-secondary-100 uppercase mb-1.5">Attachments</p>
                <div className="flex flex-col gap-1">
                  {urls.map((url, i) => (
                    <a
                      key={i}
                      href={resolveUrl(url)}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors"
                    >
                      <HiOutlinePaperClip className="w-4 h-4" />
                      {url.split("/").pop() ?? `Attachment ${i + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
}

// ─── Tab: My Reports ──────────────────────────────────────────────────────────

function MyReports() {
  const [page, setPage]         = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  const { data, isLoading, refetch } = useGetMyReportsQuery({ page, limit: PAGE_SIZE });
  const [deleteReport] = useDeleteReportMutation();
  const reports    = data?.reports    ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total      = data?.total      ?? 0;

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;
    try {
      await deleteReport(id).unwrap();
      toast.success("Report deleted successfully");
    } catch {
      toast.error("Failed to delete report");
    }
  };

  return (
    <>
      {editingReport && (
        <EditReportModal
          report={editingReport}
          onClose={() => setEditingReport(null)}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            <span className="font-semibold text-secondary-100">{total}</span> report{total !== 1 ? "s" : ""} submitted
          </p>
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoading ? (
          <Card className="!p-6 text-center text-custom-700 text-sm">Loading…</Card>
        ) : reports.length === 0 ? (
          <Card className="!p-10 text-center">
            <HiOutlineDocumentText className="w-10 h-10 text-custom-400 mx-auto mb-3" />
            <p className="text-secondary-100 font-semibold">No reports yet</p>
            <p className="text-sm text-custom-700 mt-1">Reports you submit will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                expanded={expanded === r.id}
                onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                onEdit={() => setEditingReport(r)}
                onDelete={() => handleDelete(r.id)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-custom-700">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">
                Prev
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Tab: Received Reports ────────────────────────────────────────────────────

function ReceivedReports() {
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");

  // Fetch a large batch so all client-side filters work without extra round-trips
  const { data, isLoading, refetch } = useGetAssignedReportsQuery({ page: 1, limit: 500 });
  const allReports = data?.reports ?? [];

  // Collect unique sender roles from what was received
  const senderRoles = useMemo(() => {
    const roles = new Set<string>();
    allReports.forEach((r) => { if (r.createdBy?.role) roles.add(r.createdBy.role); });
    return [...roles].sort();
  }, [allReports]);

  // Apply filters
  const filtered = useMemo(() => {
    const q    = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to   = dateTo   ? new Date(dateTo + "T23:59:59.999Z") : null;
    return allReports.filter((r) => {
      if (roleFilter && r.createdBy?.role !== roleFilter) return false;
      const d = new Date(r.createdAt);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      if (q) {
        const hay = [r.title, r.purpose, r.createdBy?.name ?? "", r.createdBy?.role ?? ""]
          .join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allReports, roleFilter, dateFrom, dateTo, search]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters  = !!(search || roleFilter || dateFrom || dateTo);

  const clearFilters = () => {
    setSearch(""); setRoleFilter(""); setDateFrom(""); setDateTo(""); setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-custom-50 rounded-xl border border-custom-200">
        {/* Search */}
        <div className="flex-1 min-w-44">
          <label className="block text-xs font-semibold text-secondary-100 mb-1">Search</label>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Title, purpose, sender…"
            className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-400 focus:outline-none focus:border-primary-400 transition-colors"
          />
        </div>

        {/* Role filter */}
        <div className="min-w-36">
          <label className="block text-xs font-semibold text-secondary-100 mb-1">Sender Role</label>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors"
          >
            <option value="">All roles</option>
            {senderRoles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div>
          <label className="block text-xs font-semibold text-secondary-100 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors"
          />
        </div>

        {/* Date to */}
        <div>
          <label className="block text-xs font-semibold text-secondary-100 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pb-0.5">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-custom-300 text-xs font-semibold text-custom-700 hover:bg-custom-100 transition-colors"
            >
              <HiOutlineX className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors"
          >
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Count line */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-custom-700">
          <span className="font-semibold text-secondary-100">{filtered.length}</span>
          {hasFilters ? " matching" : ""} report{filtered.length !== 1 ? "s" : ""}
          {hasFilters && filtered.length !== allReports.length && (
            <span className="text-custom-400"> of {allReports.length} total</span>
          )}
        </p>
        {roleFilter && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-semibold">
            {roleFilter}
          </span>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <Card className="!p-6 text-center text-custom-700 text-sm">Loading…</Card>
      ) : filtered.length === 0 ? (
        <Card className="!p-10 text-center">
          <HiOutlineInbox className="w-10 h-10 text-custom-400 mx-auto mb-3" />
          <p className="text-secondary-100 font-semibold">
            {hasFilters ? "No reports match the filters" : "No received reports"}
          </p>
          <p className="text-sm text-custom-700 mt-1">
            {hasFilters
              ? "Try adjusting the date range, role, or search term."
              : "Reports shared with your role will appear here."}
          </p>
          {hasFilters && (
            <button onClick={clearFilters}
              className="mt-3 px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
              Clear filters
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {paginated.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              expanded={expanded === r.id}
              onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
              showSender
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">
              Prev
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "my" | "received";

export default function MyReportsPage() {
  const { userRole, userName } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("my");

  const { data: assignedData } = useGetAssignedReportsQuery({ page: 1, limit: 100 });
  const receivedCount = assignedData?.total ?? 0;

  return (
    <DashboardLayout userRole={userRole ?? "receptionist"} userName={userName ?? ""} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <HiOutlineDocumentText className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-100">Reports</h1>
            <p className="text-sm text-custom-700">Manage and view reports</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-custom-200 pb-1">
          <button
            onClick={() => setActiveTab("my")}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "my"
                ? "border-primary-500 text-primary-500 bg-primary-50"
                : "border-transparent text-custom-700 hover:text-secondary-100 hover:bg-custom-50"
            }`}
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            My Reports
          </button>
          <button
            onClick={() => setActiveTab("received")}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "received"
                ? "border-primary-500 text-primary-500 bg-primary-50"
                : "border-transparent text-custom-700 hover:text-secondary-100 hover:bg-custom-50"
            }`}
          >
            <HiOutlineInbox className="w-4 h-4" />
            Received Reports
            {receivedCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-500 text-white text-xs font-bold">
                {receivedCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "my"       && <MyReports />}
        {activeTab === "received" && <ReceivedReports />}

      </div>
    </DashboardLayout>
  );
}