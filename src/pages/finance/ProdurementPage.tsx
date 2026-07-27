import { useState } from "react";
import {
  HiOutlineBriefcase,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineExclamationCircle,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineMail,
  HiOutlineMap,
  HiOutlineOfficeBuilding,
  HiOutlinePencil,
  HiOutlinePhone,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import {
  useGetProcurementStatsQuery,
  useGetLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  type ProcurementLead,
  type MarketStage,
  type MarketSector,
  type CreateLeadPayload,
} from "../../store/services/procurementService";

// ─── Config ───────────────────────────────────────────────────────────────────

const stageConfig: Record<MarketStage, { label: string; color: string; bg: string }> = {
  prospect:    { label: "Prospect",    color: "text-gray-700",    bg: "bg-gray-100"    },
  contacted:   { label: "Contacted",   color: "text-blue-700",    bg: "bg-blue-100"    },
  negotiating: { label: "Negotiating", color: "text-yellow-700",  bg: "bg-yellow-100"  },
  won:         { label: "Won",         color: "text-emerald-700", bg: "bg-emerald-100" },
  lost:        { label: "Lost",        color: "text-red-700",     bg: "bg-red-100"     },
};

const sectorConfig: Record<MarketSector, string> = {
  printing:   "Printing",
  publishing: "Publishing",
  education:  "Education",
  government: "Government",
  ngo:        "NGO / Non-profit",
  corporate:  "Corporate",
  retail:     "Retail",
  other:      "＋ Add new",
};

const selectCls =
  "w-full px-3 py-2.5 rounded-xl border border-custom-400 bg-style-500 text-secondary-100 " +
  "focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 " +
  "transition-colors text-sm font-[family-name:var(--font-family-primary)]";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(/\/api$/, "");

function resolveDocUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function openDocument(url: string, name?: string) {
  const resolved = resolveDocUrl(url);
  const a = document.createElement("a");
  a.href = resolved;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  if (name) a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Lead Form Modal ──────────────────────────────────────────────────────────

interface LeadFormProps {
  initial?: ProcurementLead | null;
  onSave: (data: CreateLeadPayload & { id?: string }) => void;
  isSaving: boolean;
  onClose: () => void;
}

function LeadFormModal({ initial, onSave, isSaving, onClose }: LeadFormProps) {
  const knownSectors = Object.keys(sectorConfig).filter(k => k !== "other");
  const knownStages  = Object.keys(stageConfig);

  const initSector = initial?.sector ?? "prospect";
  const initStage  = initial?.stage  ?? "prospect";

  const [form, setForm] = useState({
    company:        initial?.company        ?? "",
    contactPerson:  initial?.contactPerson   ?? "",
    phone:          initial?.phone          ?? "",
    email:          initial?.email          ?? "",
    sector:         (knownSectors.includes(initSector) ? initSector : "other") as MarketSector,
    customSector:   knownSectors.includes(initSector) ? "" : initSector,
    stage:          (knownStages.includes(initStage) ? initStage : "__new__") as MarketStage | "__new__",
    customStage:    knownStages.includes(initStage) ? "" : initStage,
    estimatedValue: initial?.estimatedValue ? String(initial.estimatedValue) : "",
    location:       initial?.location       ?? "",
    notes:          initial?.notes          ?? "",
    nextFollowUp:   initial?.nextFollowUp ? initial.nextFollowUp.slice(0, 10) : "",
  });
  const [docFile] = useState<File | null>(null);
  const [newDocs, setNewDocs]   = useState<File[]>([]);
  const [removedDocIds, setRemovedDocIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!form.company.trim())        { setError("Company name is required.");    return; }
    if (!form.contactPerson.trim()) { setError("Contact person is required."); return; }
    if (!form.phone.trim())         { setError("Phone number is required.");    return; }
    if (form.sector === "other" && !form.customSector.trim()) { setError("Please specify the sector."); return; }
    if (form.stage === "__new__" && !form.customStage.trim()) { setError("Please specify the stage.");  return; }
    setError("");
    const resolvedSector = (form.sector === "other" && form.customSector.trim()
      ? form.customSector.trim() : form.sector) as MarketSector;
    const resolvedStage = (form.stage === "__new__" && form.customStage.trim()
      ? form.customStage.trim() : form.stage) as MarketStage;
    onSave({
      ...(initial?.id && { id: initial.id }),
      company:           form.company.trim(),
      contactPerson:     form.contactPerson.trim(),
      phone:             form.phone.trim()    || undefined,
      email:             form.email.trim()    || undefined,
      sector:            resolvedSector,
      stage:             resolvedStage,
      estimatedValue:    parseFloat(form.estimatedValue) || undefined,
      location:          form.location.trim() || undefined,
      notes:             form.notes.trim()    || undefined,
      nextFollowUp:      form.nextFollowUp    || undefined,
      document:          docFile ?? undefined,
      newDocuments:      newDocs.length > 0 ? newDocs : undefined,
      removeDocumentIds: removedDocIds.length > 0 ? removedDocIds : undefined,
    });
  };

  const f = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-secondary-100/60 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-secondary-100">
              {initial ? "Edit Market Lead" : "Add Market Lead"}
            </h3>
            <p className="text-xs text-custom-700 mt-0.5">Track a new market opportunity</p>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1.5">
              Company / Organisation <span className="text-red-500">*</span>
            </label>
            <input value={form.company} onChange={f("company")}
              placeholder="e.g. Kigali University Press" className={selectCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1.5">
                Contact Person <span className="text-red-500">*</span>
              </label>
              <input value={form.contactPerson} onChange={f("contactPerson")}
                placeholder="Full name" className={selectCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1.5">Phone <span className="text-red-500">*</span></label>
              <input value={form.phone} onChange={f("phone")}
                placeholder="+250 788 …" className={selectCls} required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={f("email")}
              placeholder="contact@company.rw" className={selectCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1.5">Sector</label>
              <select value={form.sector} onChange={f("sector")} className={selectCls}>
                {Object.entries(sectorConfig).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {form.sector === "other" && (
                <input
                  value={form.customSector}
                  onChange={f("customSector")}
                  placeholder="Enter sector name…"
                  className={`${selectCls} mt-2`}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1.5">Stage</label>
              <select value={form.stage} onChange={f("stage")} className={selectCls}>
                {Object.entries(stageConfig).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
                <option value="__new__">＋ Add new</option>
              </select>
              {form.stage === "__new__" && (
                <input
                  value={form.customStage}
                  onChange={f("customStage")}
                  placeholder="Enter stage name…"
                  className={`${selectCls} mt-2`}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1.5">
                Estimated Value (RWF)
              </label>
              <input type="number" min="0" value={form.estimatedValue} onChange={f("estimatedValue")}
                placeholder="e.g. 5000000" className={selectCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1.5">Location</label>
              <input value={form.location} onChange={f("location")}
                placeholder="City / District" className={selectCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1.5">Next Follow-up</label>
            <input type="date" value={form.nextFollowUp} onChange={f("nextFollowUp")} className={selectCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={f("notes")} rows={3}
              placeholder="Key details, requirements, next steps…"
              className={`${selectCls} resize-none`} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1.5">Documents (PDF / Image)</label>

            {/* Existing saved documents */}
            {initial?.documents && initial.documents.length > 0 && (
              <ul className="mb-2 space-y-1">
                {initial.documents
                  .filter((doc) => !removedDocIds.includes(doc.id))
                  .map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <span className="truncate text-secondary-100 font-medium">{doc.fileName}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => openDocument(doc.fileUrl, doc.fileName)}
                        className="p-1 hover:text-primary-500 text-custom-700 transition-colors">
                        <HiOutlineEye className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setRemovedDocIds((p) => [...p, doc.id])}
                        className="p-1 hover:text-red-500 text-custom-700 transition-colors" title="Remove">
                        <HiOutlineX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* New files to upload */}
            {newDocs.length > 0 && (
              <ul className="mb-2 space-y-1">
                {newDocs.map((file, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-custom-50 border border-custom-200 rounded-lg px-3 py-1.5">
                    <span className="truncate text-secondary-100 font-medium">{file.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => window.open(URL.createObjectURL(file), "_blank", "noopener,noreferrer")}
                        className="p-1 hover:text-primary-500 text-custom-700 transition-colors">
                        <HiOutlineEye className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setNewDocs((p) => p.filter((_, j) => j !== i))}
                        className="p-1 hover:text-red-500 text-custom-700 transition-colors">
                        <HiOutlineX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-custom-400 hover:border-primary-400 cursor-pointer transition-colors text-xs text-custom-700 hover:text-primary-500">
              <HiOutlineDocumentText className="w-4 h-4 shrink-0" />
              Add file(s)…
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" multiple className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  setNewDocs((p) => [...p, ...picked]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <HiOutlineExclamationCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-custom-300">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50">
            {isSaving ? "Saving…" : initial ? "Save Changes" : "Add Lead"}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Lead Detail Modal ────────────────────────────────────────────────────────

function LeadDetailModal({
  lead, onClose, onEdit,
}: { lead: ProcurementLead; onClose: () => void; onEdit: () => void }) {
  const stage    = stageConfig[lead.stage];
  const isOverdue = lead.nextFollowUp
    && new Date(lead.nextFollowUp) < new Date()
    && lead.stage !== "won"
    && lead.stage !== "lost";

  return (
    <div className="fixed inset-0 bg-secondary-100/60 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-secondary-100">{lead.company}</h3>
            <p className="text-sm text-custom-700 mt-0.5">{sectorConfig[lead.sector]}</p>
            <span className={`inline-flex items-center gap-1 mt-2 text-xs font-bold px-3 py-1 rounded-full ${stage.bg} ${stage.color}`}>
              {stage.label}
            </span>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="rounded-xl bg-custom-50 border border-custom-200 p-4 space-y-2">
            <p className="text-xs font-bold text-custom-700 uppercase tracking-wide mb-2">Contact</p>
            <div className="flex items-center gap-2">
              <HiOutlineOfficeBuilding className="w-4 h-4 text-custom-700 shrink-0" />
              <span className="font-semibold text-secondary-100">{lead.contactPerson}</span>
            </div>
            {lead.phone && (
              <div className="flex items-center gap-2">
                <HiOutlinePhone className="w-4 h-4 text-custom-700 shrink-0" />
                <a href={`tel:${lead.phone}`} className="text-primary-500 hover:underline">{lead.phone}</a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2">
                <HiOutlineMail className="w-4 h-4 text-custom-700 shrink-0" />
                <a href={`mailto:${lead.email}`} className="text-primary-500 hover:underline truncate">{lead.email}</a>
              </div>
            )}
            {lead.location && (
              <div className="flex items-center gap-2">
                <HiOutlineMap className="w-4 h-4 text-custom-700 shrink-0" />
                <span className="text-secondary-100">{lead.location}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-custom-50 border border-custom-200 p-4">
              <p className="text-xs text-custom-700 mb-1">Estimated Value</p>
              <p className="text-lg font-bold text-primary-500">
                {(lead.estimatedValue ?? 0) > 0
                  ? `${(lead.estimatedValue!).toLocaleString()} RWF`
                  : "—"}
              </p>
            </div>
            <div className={`rounded-xl border p-4 ${isOverdue ? "bg-red-50 border-red-200" : "bg-custom-50 border-custom-200"}`}>
              <p className="text-xs text-custom-700 mb-1">Next Follow-up</p>
              {lead.nextFollowUp ? (
                <>
                  <p className={`text-sm font-bold ${isOverdue ? "text-red-600" : "text-secondary-100"}`}>
                    {lead.nextFollowUp.slice(0, 10)}
                  </p>
                  {isOverdue && <p className="text-xs text-red-500 mt-0.5 font-semibold">Overdue!</p>}
                </>
              ) : (
                <p className="text-sm text-custom-400">Not set</p>
              )}
            </div>
          </div>

          {lead.notes && (
            <div className="rounded-xl bg-custom-50 border border-custom-200 p-4">
              <p className="text-xs font-bold text-custom-700 uppercase tracking-wide mb-2">Notes</p>
              <p className="text-secondary-100 leading-relaxed">{lead.notes}</p>
            </div>
          )}

          {lead.documents && lead.documents.length > 0 && (
            <div className="rounded-xl bg-custom-50 border border-custom-200 p-4">
              <p className="text-xs font-bold text-custom-700 uppercase tracking-wide mb-2">Documents</p>
              <ul className="space-y-1.5">
                {lead.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-custom-200 bg-white">
                    <HiOutlineDocumentText className="w-4 h-4 text-primary-500 shrink-0" />
                    <span className="truncate text-sm font-medium text-secondary-100 flex-1">{doc.fileName}</span>
                    <button
                      onClick={() => openDocument(doc.fileUrl, doc.fileName)}
                      className="p-1 rounded-lg hover:bg-custom-100 text-custom-700 hover:text-primary-500 transition-colors shrink-0"
                      title="Open"
                    >
                      <HiOutlineEye className="w-4 h-4" />
                    </button>
                    <a
                      href={resolveDocUrl(doc.fileUrl)}
                      download={doc.fileName}
                      className="p-1 rounded-lg hover:bg-custom-100 text-custom-700 hover:text-emerald-600 transition-colors shrink-0"
                      title="Download"
                    >
                      <HiOutlineDownload className="w-4 h-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-custom-700">Added: {lead.createdAt?.slice(0, 10)}</p>
        </div>

        <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-custom-300">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
            Close
          </button>
          <button onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
            <HiOutlinePencil className="w-4 h-4" /> Edit
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProdurementPage() {
  const { userRole, userName } = useAuth();

  // ── Filters & UI state ────────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [stageFilter, setStageFilter]   = useState<MarketStage | "all">("all");
  const [sectorFilter, setSectorFilter] = useState<MarketSector | "all">("all");
  const [page, setPage]                 = useState(1);
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState<ProcurementLead | null>(null);
  const [viewing, setViewing]           = useState<ProcurementLead | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);

  // ── API queries ───────────────────────────────────────────────────────────
  const {
    data: stats,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useGetProcurementStatsQuery();

  const {
    data: leadsData,
    isLoading: loadingLeads,
    isFetching,
    refetch: refetchLeads,
  } = useGetLeadsQuery({
    search:  search.trim() || undefined,
    sector:  sectorFilter !== "all" ? sectorFilter : undefined,
    stage:   stageFilter  !== "all" ? stageFilter  : undefined,
    page,
    limit: 20,
  });

  const [createLead, { isLoading: creating }] = useCreateLeadMutation();
  const [updateLead, { isLoading: updating }] = useUpdateLeadMutation();
  const [deleteLead, { isLoading: deleting }] = useDeleteLeadMutation();

  const leads      = leadsData?.leads      ?? [];
  const totalPages = leadsData?.totalPages ?? 1;
  const total      = leadsData?.total      ?? 0;

  const kpi      = stats?.kpi;
  const pipeline = stats?.pipeline ?? [];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = async (data: CreateLeadPayload & { id?: string }) => {
    try {
      if (data.id) {
        await updateLead({ id: data.id, ...data }).unwrap();
      } else {
        await createLead(data).unwrap();
      }
      setShowForm(false);
      setEditing(null);
    } catch {
      // error shown via toast if wired, silently ignore here
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLead(id).unwrap();
      setDeleteId(null);
      setViewing(null);
    } catch {
      // ignore
    }
  };

  const refetchAll = () => { refetchLeads(); refetchStats(); };

  return (
    <DashboardLayout
      userRole={userRole ?? "sales"}
      userName={userName ?? "Sales Officer"}
      notificationCount={kpi?.overdueFollowUps ?? 0}
    >
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Market Management</h1>
            <p className="text-sm text-custom-700 mt-1">
              Track and manage market opportunities and sales pipeline
            </p>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <button
              onClick={refetchAll}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-custom-700 text-sm"
            >
              <HiOutlineRefresh className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Lead
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                <HiOutlineBriefcase className="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <p className="text-xs text-custom-700">Total Leads</p>
                {loadingStats
                  ? <div className="h-6 w-10 bg-custom-200 rounded animate-pulse mt-1" />
                  : <p className="text-xl font-bold text-secondary-100">{kpi?.totalLeads ?? 0}</p>}
              </div>
            </div>
          </Card>

          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
                <HiOutlineClock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-custom-700">In Progress</p>
                {loadingStats
                  ? <div className="h-6 w-10 bg-custom-200 rounded animate-pulse mt-1" />
                  : <p className="text-xl font-bold text-yellow-600">{kpi?.inProgress ?? 0}</p>}
              </div>
            </div>
          </Card>

          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-custom-700">Won</p>
                {loadingStats
                  ? <div className="h-6 w-10 bg-custom-200 rounded animate-pulse mt-1" />
                  : <p className="text-xl font-bold text-emerald-600">{kpi?.wonCount ?? 0}</p>}
              </div>
            </div>
          </Card>

          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <HiOutlineExclamationCircle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-custom-700">Overdue Follow-ups</p>
                {loadingStats
                  ? <div className="h-6 w-10 bg-custom-200 rounded animate-pulse mt-1" />
                  : <p className="text-xl font-bold text-red-500">{kpi?.overdueFollowUps ?? 0}</p>}
              </div>
            </div>
          </Card>

          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <HiOutlineCurrencyDollar className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-custom-700">Won Value</p>
                {loadingStats
                  ? <div className="h-5 w-16 bg-custom-200 rounded animate-pulse mt-1" />
                  : <p className="text-sm font-bold text-green-600 truncate">
                      {(kpi?.wonValue ?? 0) >= 1_000_000
                        ? `${((kpi?.wonValue ?? 0) / 1_000_000).toFixed(1)}M`
                        : (kpi?.wonValue ?? 0).toLocaleString()} RWF
                    </p>}
              </div>
            </div>
          </Card>
        </div>

        {/* Pipeline bar */}
        <Card className="!p-4">
          <div className="flex items-center gap-2 mb-3">
            <HiOutlineChartBar className="w-4 h-4 text-primary-500" />
            <p className="text-sm font-bold text-secondary-100">Pipeline Overview</p>
            {!loadingStats && (
              <span className="ml-auto text-xs text-custom-700">
                Total: {(pipeline.reduce((s, p) => s + p.totalValue, 0)).toLocaleString()} RWF
              </span>
            )}
          </div>
          {loadingStats ? (
            <div className="flex gap-2">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="flex-1 h-20 bg-custom-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {pipeline.map(({ stage, count, totalValue }) => {
                const cfg = stageConfig[stage];
                return (
                  <div
                    key={stage}
                    onClick={() => setStageFilter(stageFilter === stage ? "all" : stage)}
                    className={`flex-1 min-w-[90px] p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      stageFilter === stage ? "border-primary-500 shadow-sm" : "border-transparent"
                    } ${cfg.bg}`}
                  >
                    <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                    <p className={`text-2xl font-bold ${cfg.color} mt-1`}>{count}</p>
                    {totalValue > 0 && (
                      <p className={`text-xs ${cfg.color} opacity-70`}>
                        {totalValue.toLocaleString()} RWF
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-700" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by company, contact, or location…"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 transition-colors"
              />
            </div>
            <select value={sectorFilter}
              onChange={(e) => { setSectorFilter(e.target.value as MarketSector | "all"); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors">
              <option value="all">All Sectors</option>
              {Object.entries(sectorConfig).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {(search || stageFilter !== "all" || sectorFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setStageFilter("all"); setSectorFilter("all"); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-custom-300 text-xs font-semibold text-custom-700 hover:bg-custom-100 transition-colors"
              >
                <HiOutlineX className="w-4 h-4" /> Clear
              </button>
            )}
          </div>
        </Card>

        {/* Leads Table */}
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-custom-100 border-b border-custom-300">
                <tr>
                  {["Company", "Contact", "Sector", "Stage", "Est. Value", "Location", "Follow-up", "Actions"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold text-secondary-100 uppercase ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-custom-200">
                {loadingLeads ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-custom-200 rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <HiOutlineBriefcase className="w-10 h-10 text-custom-400 mx-auto mb-2" />
                      <p className="text-sm text-custom-700 font-semibold">No leads found</p>
                      <p className="text-xs text-custom-600 mt-1">Try adjusting your filters or add a new lead</p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const stage = stageConfig[lead.stage];
                    const isOverdue = lead.nextFollowUp
                      && new Date(lead.nextFollowUp) < new Date()
                      && lead.stage !== "won"
                      && lead.stage !== "lost";
                    return (
                      <tr key={lead.id}
                        className="hover:bg-custom-50 transition-colors cursor-pointer"
                        onClick={() => setViewing(lead)}
                      >
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-bold text-secondary-100">{lead.company}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-secondary-100">{lead.contactPerson}</p>
                          {lead.phone && <p className="text-xs text-custom-700">{lead.phone}</p>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <HiOutlineTag className="w-3.5 h-3.5 text-custom-700 shrink-0" />
                            <span className="text-xs text-custom-700">{sectorConfig[lead.sector]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stage.bg} ${stage.color}`}>
                            {stage.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-bold text-secondary-100">
                          {(lead.estimatedValue ?? 0) > 0
                            ? `${(lead.estimatedValue!).toLocaleString()} RWF`
                            : <span className="text-custom-400 font-normal">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          {lead.location
                            ? <div className="flex items-center gap-1.5">
                                <HiOutlineMap className="w-3.5 h-3.5 text-custom-700 shrink-0" />
                                <span className="text-xs text-custom-700">{lead.location}</span>
                              </div>
                            : <span className="text-custom-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          {lead.nextFollowUp ? (
                            <div className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-secondary-100"}`}>
                              {isOverdue && <HiOutlineExclamationCircle className="w-3.5 h-3.5 inline mr-0.5" />}
                              {lead.nextFollowUp.slice(0, 10)}
                            </div>
                          ) : <span className="text-custom-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setViewing(lead)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-custom-700 hover:text-blue-600 transition-colors"
                              title="View details"
                            >
                              <HiOutlineEye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditing(lead); setShowForm(true); }}
                              className="p-1.5 rounded-lg hover:bg-custom-100 text-custom-700 hover:text-secondary-100 transition-colors"
                              title="Edit"
                            >
                              <HiOutlinePencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(lead.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-custom-700 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer: count + pagination */}
          {(total > 0 || totalPages > 1) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-custom-300 text-xs text-custom-700">
              <span>{total} lead{total !== 1 ? "s" : ""}</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-custom-300 font-semibold hover:bg-custom-100 disabled:opacity-40 transition-colors"
                  >← Prev</button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-custom-300 font-semibold hover:bg-custom-100 disabled:opacity-40 transition-colors"
                  >Next →</button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <LeadFormModal
          initial={editing}
          isSaving={creating || updating}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Detail Modal */}
      {viewing && (
        <LeadDetailModal
          lead={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); setShowForm(true); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
          <Card className="!p-6 max-w-xl w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-secondary-100">Remove Lead</h3>
                <p className="text-sm text-custom-700">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-custom-700 mb-5">
              Remove <strong>{leads.find((l) => l.id === deleteId)?.company ?? "this lead"}</strong> from your pipeline?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                {deleting ? "Removing…" : "Remove"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
