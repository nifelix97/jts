import { useState } from "react";
import {
  HiOutlineArchive,
  HiOutlineBriefcase,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentDownload,
  HiOutlineDocumentText,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
} from "react-icons/hi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import {
  useGetMyEmployeeProfileQuery,
  type EmployeeJob,
} from "../../store/services/employeesService";
import { GenerateReportModal } from "../../components";
import { useAuth } from "../../context/AuthContext";
import { jobStatusConfig } from "../../types/JobStatus";
import { useGetMyBindingStockSortiesQuery } from "../../store/services/bindingStockService";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";
type Tab    = "jobs" | "materials";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(period: Period): { from: Date; to: Date } {
  const now = new Date();
  const to  = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let from: Date;
  switch (period) {
    case "day":   from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case "week":  from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); break;
    case "month": from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "year":  from = new Date(now.getFullYear(), 0, 1); break;
  }
  return { from, to };
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "day",   label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year",  label: "This Year" },
];

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "jobs",      label: "My Jobs",          icon: HiOutlineBriefcase },
  { value: "materials", label: "Material Requests", icon: HiOutlineArchive   },
];

const PAGE_SIZE = 8;

// ─── PDF helpers ──────────────────────────────────────────────────────────────

const COMPANY = {
  address: "B.P. 863 Kigali - Rwanda",
  tin:     "TIN / T.V.A.: NO 100021520",
  tel:     "Tel: Reception (+250) 788 313 617 / (+250) 788 304 549",
  rc:      "No. RC: 536 / 09 / NYR",
  email:   "E-mail: Santrackpresse@yahoo.com",
  compte:  "Compte: BK: 10000017 4372",
  motto:   "Rapidite - Qualite - Innovation - Esprit d'Equipe",
};

const HEADER_H      = 35;
const FOOTER_TOP    = 26;
const TABLE_START_Y = HEADER_H + 23;
const BOTTOM_MARGIN = FOOTER_TOP + 6;

function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function drawLetterhead(pdf: any, h64: string | null, title: string, subtitle: string) {
  const pw = pdf.internal.pageSize.getWidth();
  if (h64) pdf.addImage(h64, "PNG", 0, 0, pw, HEADER_H);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(25, 25, 25);
  pdf.text(title, pw / 2, HEADER_H + 10, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(110, 110, 110);
  pdf.text(subtitle, pw / 2, HEADER_H + 16, { align: "center" });
}

function drawFooter(pdf: any, pageNum: number, totalPages: number) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const fy = ph - FOOTER_TOP;
  pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3);
  pdf.line(10, fy, pw - 10, fy);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(60, 60, 60);
  const c1 = 12, c2 = pw / 2, c3 = pw - 12;
  pdf.text(COMPANY.address, c1, fy + 5);  pdf.text(COMPANY.tin,    c1, fy + 10);
  pdf.text(COMPANY.tel,  c2, fy + 5,  { align: "center" }); pdf.text(COMPANY.rc, c2, fy + 10, { align: "center" });
  pdf.text(COMPANY.email, c3, fy + 5, { align: "right"  }); pdf.text(COMPANY.compte, c3, fy + 10, { align: "right" });
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(7); pdf.setTextColor(0, 160, 210);
  pdf.text(COMPANY.motto, c2, fy + 16, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(150, 150, 150);
  pdf.text(`Page ${pageNum} of ${totalPages}`, pw - 10, fy + 16, { align: "right" });
}

type SummaryRow = { label: string; value: string; bold?: boolean };

async function buildPdf(title: string, headers: string[], rows: string[][], summary: SummaryRow[]) {
  const h64      = await loadImageAsBase64("/header.png").catch(() => null);
  const subtitle = `Generated: ${new Date().toLocaleString("en-RW")}`;
  const pdf      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw       = pdf.internal.pageSize.getWidth();
  drawLetterhead(pdf, h64, title, subtitle);
  autoTable(pdf, {
    head: [headers], body: rows,
    startY: TABLE_START_Y,
    margin: { left: 10, right: 10, bottom: BOTTOM_MARGIN },
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [0, 160, 210], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 251, 255] },
    didDrawPage: (data: { pageNumber: number }) => {
      if (data.pageNumber > 1) drawLetterhead(pdf, h64, title, subtitle);
      drawFooter(pdf, data.pageNumber, (pdf as any).internal.getNumberOfPages());
    },
  });
  if (summary.length > 0) {
    const aft = (pdf as any).lastAutoTable.finalY + 8;
    const c1 = pw - 90, c2 = pw - 12;
    pdf.setDrawColor(0, 160, 210); pdf.setLineWidth(0.4);
    pdf.line(c1, aft - 3, c2, aft - 3);
    let sy = aft;
    summary.forEach(({ label, value, bold }) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(8); pdf.setTextColor(40, 40, 40);
      pdf.text(label, c1, sy); pdf.text(value, c2, sy, { align: "right" }); sy += 6;
    });
    pdf.setDrawColor(0, 160, 210); pdf.line(c1, sy, c2, sy);
  }
  const total = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) { pdf.setPage(i); drawFooter(pdf, i, total); }
  pdf.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ─── PDF Action Buttons ──────────────────────────────────────────────────────

function PdfButtons({ title, getExportData }: {
  title: string;
  getExportData: () => { headers: string[]; rows: string[][]; summary: SummaryRow[] };
}) {
  const [showModal, setShowModal] = useState(false);
  const handlePdf = () => {
    const { headers, rows, summary } = getExportData();
    buildPdf(title, headers, rows, summary).catch((err) => alert("PDF error: " + (err as Error).message));
  };
  return (
    <>
      <button onClick={handlePdf}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
        <HiOutlineDocumentDownload className="w-4 h-4" /> PDF
      </button>
      <button onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition-colors">
        <HiOutlineDocumentText className="w-4 h-4" /> Generate Report
      </button>
      {showModal && <GenerateReportModal title={title} onClose={() => setShowModal(false)} />}
    </>
  );
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 bg-custom-100 p-1 rounded-xl w-fit">
      {PERIODS.map((p) => (
        <button key={p.value} onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            value === p.value ? "bg-primary-500 text-white shadow-sm" : "text-custom-700 hover:text-secondary-100"
          }`}>{p.label}</button>
      ))}
    </div>
  );
}

function StatCard({ label, value, color = "text-secondary-100" }: {
  label: string; value: string | number; color?: string;
}) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-custom-700 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </Card>
  );
}

// ─── Priority colors ──────────────────────────────────────────────────────────

const priorityColor: Record<string, string> = {
  low:    "bg-green-100 text-green-700",
  normal: "bg-blue-100 text-blue-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-500 text-white",
};

// ─── Tab 1: My Jobs ───────────────────────────────────────────────────────────

function JobsReport() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const { data: profile, isLoading, refetch } = useGetMyEmployeeProfileQuery();

  const allJobs: EmployeeJob[] = [
    ...(profile?.assignedJobs ?? []),
    ...(profile?.jobs ?? []),
    ...(profile?.job ? [profile.job] : []),
  ].filter((j, i, arr) => arr.findIndex((x) => x.id === j.id) === i);

  const range = useCustom && customFrom && customTo
    ? { from: new Date(customFrom), to: new Date(customTo + "T23:59:59") }
    : getDateRange(period);

  const jobs = allJobs.filter((j) => {
    const raw = (j as any).createdAt ?? (j as any).updatedAt ?? (j as any).startedAt;
    if (!raw) return true;
    const d = new Date(raw);
    return d >= range.from && d <= range.to;
  });

  const totalPages      = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const paginated       = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const completedCount  = jobs.filter((j) => j.status === "completed" || j.status === "delivered").length;
  const inProgressCount = jobs.filter((j) => ["in-composition","in-montage","in-printing","in-binding","in-packaging","quality-check"].includes(j.status)).length;
  const overdueCount    = jobs.filter((j) => j.dueDate && new Date(j.dueDate) < new Date() && j.status !== "completed" && j.status !== "delivered").length;

  const getExportData = () => ({
    headers: ["Job #", "Title", "Customer", "Status", "Priority", "Due Date"],
    rows: jobs.map((j) => [
      `#${j.jobNumber}`, j.title, j.customer?.name ?? "",
      j.status, j.priority,
      j.dueDate ? j.dueDate.split("T")[0] : "",
    ]),
    summary: [
      { label: "Total Jobs",   value: String(jobs.length) },
      { label: "Completed",    value: String(completedCount) },
      { label: "In Progress",  value: String(inProgressCount) },
      { label: "OVERDUE",      value: String(overdueCount), bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <input type="date" value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400" />
          <span className="text-xs text-custom-700">to</span>
          <input type="date" value={customTo} min={customFrom}
            onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400" />
          {useCustom && (
            <button onClick={() => { setCustomFrom(""); setCustomTo(""); setUseCustom(false); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-custom-300 text-xs text-custom-700 hover:bg-custom-100">Clear</button>
          )}
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Worker Job Report" getExportData={getExportData} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Jobs"  value={isLoading ? "…" : jobs.length} />
        <StatCard label="Completed"   value={isLoading ? "…" : completedCount}  color="text-emerald-600" />
        <StatCard label="In Progress" value={isLoading ? "…" : inProgressCount} color="text-blue-600" />
        <StatCard label="Overdue"     value={isLoading ? "…" : overdueCount}     color={overdueCount > 0 ? "text-red-600" : "text-secondary-100"} />
      </div>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Job #", "Title & Client", "Status", "Priority", "Due Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <HiOutlineBriefcase className="w-10 h-10 text-custom-400 mx-auto mb-2" />
                    <p className="text-sm text-custom-700 font-semibold">No jobs found for this period</p>
                  </td>
                </tr>
              ) : paginated.map((j) => {
                const statusCfg = (jobStatusConfig as any)[j.status] ?? { label: j.status, bgColor: "bg-gray-100", color: "text-gray-700" };
                const isOverdue = j.dueDate && new Date(j.dueDate) < new Date() && j.status !== "completed" && j.status !== "delivered";
                return (
                  <tr key={j.id} className="hover:bg-custom-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">#{j.jobNumber}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-secondary-100">{j.title}</p>
                      {j.customer?.name && <p className="text-xs text-custom-700">{j.customer.name}</p>}
                      {j.jobType && <p className="text-xs text-custom-500">{j.jobType}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusCfg.bgColor} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priorityColor[j.priority] ?? "bg-gray-100 text-gray-700"}`}>
                        {j.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {j.dueDate
                        ? <span className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-secondary-100"}`}>
                            {isOverdue && <HiOutlineExclamationCircle className="w-3.5 h-3.5 inline mr-0.5" />}
                            {j.dueDate.split("T")[0]}
                          </span>
                        : <span className="text-custom-400 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {jobs.length > 0 && (
          <div className="flex justify-end px-4 py-3 border-t border-custom-200 gap-6 text-xs text-custom-700">
            <span>Total: <strong className="text-secondary-100">{jobs.length}</strong></span>
            <span className="text-emerald-600"><HiOutlineCheckCircle className="w-3.5 h-3.5 inline mr-0.5" />Completed: <strong>{completedCount}</strong></span>
            <span className="text-blue-600"><HiOutlineClock className="w-3.5 h-3.5 inline mr-0.5" />In Progress: <strong>{inProgressCount}</strong></span>
            {overdueCount > 0 && <span className="text-red-600"><HiOutlineExclamationCircle className="w-3.5 h-3.5 inline mr-0.5" />Overdue: <strong>{overdueCount}</strong></span>}
          </div>
        )}
      </Card>

      {jobs.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, jobs.length)} of {jobs.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 hover:bg-custom-100"}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Material Requests ─────────────────────────────────────────────────

const reqStatusColor: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function MaterialRequestsReport() {
  const { data, isLoading, refetch } = useGetMyBindingStockSortiesQuery({ limit: 100 });
  const sorties = data?.data ?? [];
  const pending  = sorties.filter((r) => r.status === "pending").length;
  const approved = sorties.filter((r) => r.status === "approved").length;
  const rejected = sorties.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
          <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={isLoading ? "…" : sorties.length} />
        <StatCard label="Pending"  value={isLoading ? "…" : pending}  color="text-yellow-600" />
        <StatCard label="Approved" value={isLoading ? "…" : approved} color="text-emerald-600" />
        <StatCard label="Rejected" value={isLoading ? "…" : rejected} color="text-red-600" />
      </div>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Item", "Qty", "Reason", "Status", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : sorties.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-custom-700 text-sm">No stock requests found</td></tr>
              ) : sorties.map((r) => (
                <tr key={r.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-sm font-semibold text-secondary-100">{r.stockItem?.itemName ?? "—"}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{parseFloat(r.quantityOut)} {r.stockItem?.unit ?? ""}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700 max-w-[160px] truncate">{r.reason ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${reqStatusColor[r.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkerReportsPage() {
  const { userRole, userName } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("jobs");

  return (
    <DashboardLayout userRole={userRole ?? "worker"} userName={userName ?? "Worker"} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        <div>
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineChartBar className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">My Reports</h1>
          </div>
          <p className="text-sm text-custom-700">Overview of your jobs and material requests</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 flex-wrap border-b border-custom-200 pb-1">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setActiveTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors border-b-2 ${
                activeTab === t.value
                  ? "border-primary-500 text-primary-500 bg-primary-50"
                  : "border-transparent text-custom-700 hover:text-secondary-100 hover:bg-custom-50"
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "jobs"      && <JobsReport />}
        {activeTab === "materials" && <MaterialRequestsReport />}

      </div>
    </DashboardLayout>
  );
}
