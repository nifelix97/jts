import { useState } from "react";
import {
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClipboardList,
  HiOutlineCollection,
  HiOutlineDocumentDownload,
  HiOutlineDocumentText,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
  HiOutlineUsers,
} from "react-icons/hi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import { useGetJobsQuery, type Job } from "../../store/services/jobsService";
import { useGetDepartmentsQuery } from "../../store/services/departmentsService";
import { GenerateReportModal } from "../../components";
import { useAuth } from "../../context/AuthContext";
import { jobStatusConfig } from "../../types/JobStatus";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const startOfDay = (yr: number, mo: number, dy: number) =>
    new Date(yr, mo, dy, 0, 0, 0, 0);
  const endOfToday = new Date(y, m, d, 23, 59, 59, 999);
  let from: Date;
  switch (period) {
    case "day":   from = startOfDay(y, m, d);     break;
    case "week":  from = startOfDay(y, m, d - 6); break;
    case "month": from = startOfDay(y, m, 1);     break;
    case "year":  from = startOfDay(y, 0, 1);     break;
  }
  return { from: from.toISOString(), to: endOfToday.toISOString() };
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "day",   label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year",  label: "This Year" },
];

const PAGE_SIZE = 8;

const IN_PRODUCTION_STATES = new Set([
  "in-composition", "in-montage", "in-printing",
  "in-binding", "in-packaging", "quality-check",
]);

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

const HEADER_H   = 35;
const FOOTER_TOP = 26;
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

function drawLetterhead(pdf: any, headerBase64: string | null, title: string, subtitle: string) {
  const pw = pdf.internal.pageSize.getWidth();
  if (headerBase64) pdf.addImage(headerBase64, "PNG", 0, 0, pw, HEADER_H);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(25, 25, 25);
  pdf.text(title, pw / 2, HEADER_H + 10, { align: "center" });
  if (subtitle) {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(110, 110, 110);
    pdf.text(subtitle, pw / 2, HEADER_H + 16, { align: "center" });
  }
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
  pdf.text(COMPANY.tel, c2, fy + 5, { align: "center" }); pdf.text(COMPANY.rc, c2, fy + 10, { align: "center" });
  pdf.text(COMPANY.email, c3, fy + 5, { align: "right" }); pdf.text(COMPANY.compte, c3, fy + 10, { align: "right" });
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(7); pdf.setTextColor(0, 160, 210);
  pdf.text(COMPANY.motto, c2, fy + 16, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(150, 150, 150);
  pdf.text(`Page ${pageNum} of ${totalPages}`, pw - 10, fy + 16, { align: "right" });
}

type SummaryRow = { label: string; value: string; bold?: boolean };

async function buildPdf(title: string, headers: string[], rows: string[][], summary: SummaryRow[]) {
  const headerBase64 = await loadImageAsBase64("/header.png").catch(() => null);
  const subtitle     = `Generated: ${new Date().toLocaleString("en-RW")}`;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw  = pdf.internal.pageSize.getWidth();
  drawLetterhead(pdf, headerBase64, title, subtitle);
  autoTable(pdf, {
    head: [headers], body: rows,
    startY: TABLE_START_Y,
    margin: { left: 10, right: 10, bottom: BOTTOM_MARGIN },
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [0, 160, 210], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 251, 255] },
    didDrawPage: (data: { pageNumber: number }) => {
      if (data.pageNumber > 1) drawLetterhead(pdf, headerBase64, title, subtitle);
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

// ─── Shared Components ────────────────────────────────────────────────────────

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

function StatCard({ label, value, sub, color = "text-secondary-100" }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-custom-700 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-custom-700 mt-0.5">{sub}</p>}
    </Card>
  );
}

function Section({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-secondary-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Priority & state config ──────────────────────────────────────────────────

const STATE_LABELS: Record<string, string> = {
  "in-composition":    "In Composition",
  "in-montage":        "In Montage",
  "in-printing":       "In Printing",
  "in-binding":        "In Binding",
  "in-packaging":      "In Packaging",
  "quality-check":     "Quality Check",
  "composition-done":  "Composition Done",
  "montage-done":      "Montage Done",
  "printing-done":     "Printing Done",
  "binding-done":      "Binding Done",
  "packaging-done":    "Packaging Done",
  "qualitycheck-done": "QC Done",
};

const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  "in-composition":    { bg: "bg-orange-100",  text: "text-orange-700" },
  "in-montage":        { bg: "bg-amber-100",   text: "text-amber-700" },
  "in-printing":       { bg: "bg-pink-100",    text: "text-pink-700" },
  "in-binding":        { bg: "bg-teal-100",    text: "text-teal-700" },
  "in-packaging":      { bg: "bg-cyan-100",    text: "text-cyan-700" },
  "quality-check":     { bg: "bg-purple-100",  text: "text-purple-700" },
  "composition-done":  { bg: "bg-green-100",   text: "text-green-700" },
  "montage-done":      { bg: "bg-green-100",   text: "text-green-700" },
  "printing-done":     { bg: "bg-green-100",   text: "text-green-700" },
  "binding-done":      { bg: "bg-green-100",   text: "text-green-700" },
  "packaging-done":    { bg: "bg-green-100",   text: "text-green-700" },
  "qualitycheck-done": { bg: "bg-green-100",   text: "text-green-700" },
};

function StateBadge({ state }: { state: string | null | undefined }) {
  if (!state) return <span className="text-xs text-custom-400 italic">—</span>;
  const label  = STATE_LABELS[state] ?? state;
  const colors = STATE_COLORS[state] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      {label}
    </span>
  );
}

const priorityColor: Record<string, string> = {
  low:    "bg-green-100 text-green-700",
  normal: "bg-blue-100 text-blue-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-500 text-white",
};

// ─── Tab 0: All Jobs ─────────────────────────────────────────────────────────

const PM_STATUSES = new Set([
  "confirmed", "in-composition", "in-montage", "in-printing",
  "in-binding", "in-packaging", "quality-check", "ready-for-delivery",
  "partial-delivered", "delivered", "completed", "verified",
]);

function AllJobsReport() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: new Date(customFrom + "T00:00:00").toISOString(), to: new Date(customTo + "T23:59:59.999").toISOString() }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetJobsQuery({ limit: 500 });
  const { data: departments = [] }   = useGetDepartmentsQuery();
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  const allJobs: Job[] = data?.jobs ?? [];

  const jobs = allJobs.filter((j) => {
    if (!PM_STATUSES.has(j.status)) return false;
    const d = new Date(j.createdAt);
    return d >= new Date(range.from) && d <= new Date(range.to);
  });

  const totalPages   = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const paginated    = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const urgentCount  = jobs.filter((j) => j.priority === "urgent").length;
  const overdueCount = jobs.filter((j) => j.dueDate && new Date(j.dueDate) < new Date()).length;
  const completedCount = jobs.filter((j) => j.status === "completed" || j.status === "delivered").length;

  const getExportData = () => ({
    headers: ["Job #", "Title", "Customer", "Status", "Priority", "Department", "Due Date", "Created"],
    rows: jobs.map((j) => [
      `#${j.jobNumber}`, j.title, j.customer?.name ?? "",
      j.status, j.priority,
      j.departmentAssignedToId ? (deptMap[j.departmentAssignedToId] ?? "—") : "Unassigned",
      j.dueDate ? j.dueDate.split("T")[0] : "",
      new Date(j.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "Total Jobs",  value: String(jobs.length) },
      { label: "Urgent",      value: String(urgentCount) },
      { label: "Overdue",     value: String(overdueCount) },
      { label: "COMPLETED",   value: String(completedCount), bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineCollection} title="All Jobs" color="bg-indigo-100 text-indigo-600">
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
          <PdfButtons title="All Jobs Report" getExportData={getExportData} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" value={jobs.length} />
        <StatCard label="Urgent"     value={urgentCount}    color="text-red-500" />
        <StatCard label="Overdue"    value={overdueCount}   color={overdueCount > 0 ? "text-red-600" : "text-secondary-100"} />
        <StatCard label="Completed"  value={completedCount} color="text-emerald-600" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Job #", "Title & Client", "Status", "Dept State", "Priority", "Department", "Due Date", "Created"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No jobs for this period</td></tr>
              ) : paginated.map((j) => {
                const statusCfg = jobStatusConfig[j.status] ?? { label: j.status, bgColor: "bg-gray-100", color: "text-gray-700" };
                const isOverdue = j.dueDate && new Date(j.dueDate) < new Date();
                return (
                  <tr key={j.id} className="hover:bg-custom-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">#{j.jobNumber}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-secondary-100">{j.title}</p>
                      <p className="text-xs text-custom-700">{j.customer?.name ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusCfg.bgColor} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StateBadge state={j.state} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priorityColor[j.priority] ?? "bg-gray-100 text-gray-700"}`}>
                        {j.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">
                      {j.departmentAssignedToId ? (deptMap[j.departmentAssignedToId] ?? "—") : <span className="italic text-custom-400">Unassigned</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {j.dueDate
                        ? <span className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-secondary-100"}`}>
                            {isOverdue && <HiOutlineExclamationCircle className="w-3.5 h-3.5 inline mr-0.5" />}
                            {j.dueDate.split("T")[0]}
                          </span>
                        : <span className="text-custom-400 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">
                      {new Date(j.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
    </Section>
  );
}

// ─── Tab 1: Jobs in Production ────────────────────────────────────────────────

function ProductionJobsReport() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: new Date(customFrom + "T00:00:00").toISOString(), to: new Date(customTo + "T23:59:59.999").toISOString() }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetJobsQuery({ limit: 500 });
  const { data: departments = [] }   = useGetDepartmentsQuery();
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  const allJobs: Job[] = data?.jobs ?? [];

  // Filter to jobs actively in a department state + date range
  const jobs = allJobs.filter((j) => {
    if (!j.state || !IN_PRODUCTION_STATES.has(j.state)) return false;
    const d = new Date(j.createdAt);
    return d >= new Date(range.from) && d <= new Date(range.to);
  });

  const totalPages  = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const paginated   = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const urgentCount = jobs.filter((j) => j.priority === "urgent").length;
  const highCount   = jobs.filter((j) => j.priority === "high").length;
  const overdueCount = jobs.filter((j) => j.dueDate && new Date(j.dueDate) < new Date()).length;

  const getExportData = () => ({
    headers: ["Job #", "Title", "Customer", "Status", "Priority", "Department", "Due Date", "Created"],
    rows: jobs.map((j) => [
      `#${j.jobNumber}`, j.title, j.customer?.name ?? "",
      j.status, j.priority,
      j.departmentAssignedToId ? (deptMap[j.departmentAssignedToId] ?? "—") : "Unassigned",
      j.dueDate ? j.dueDate.split("T")[0] : "",
      new Date(j.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "Total in Production", value: String(jobs.length) },
      { label: "Urgent",              value: String(urgentCount) },
      { label: "High Priority",       value: String(highCount) },
      { label: "OVERDUE",             value: String(overdueCount), bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineClipboardList} title="Jobs in Production" color="bg-blue-100 text-blue-600">
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
          <PdfButtons title="Production Jobs Report" getExportData={getExportData} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="In Production" value={jobs.length} />
        <StatCard label="Urgent"        value={urgentCount}  color="text-red-500" />
        <StatCard label="High Priority" value={highCount}    color="text-orange-600" />
        <StatCard label="Overdue"       value={overdueCount} color={overdueCount > 0 ? "text-red-600" : "text-secondary-100"} />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Job #", "Title & Client", "Status", "Priority", "Department", "Due Date", "Created"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No jobs in production for this period</td></tr>
              ) : paginated.map((j) => {
                const statusCfg = jobStatusConfig[j.status] ?? { label: j.status, bgColor: "bg-gray-100", color: "text-gray-700" };
                const isOverdue = j.dueDate && new Date(j.dueDate) < new Date();
                return (
                  <tr key={j.id} className="hover:bg-custom-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">#{j.jobNumber}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-secondary-100">{j.title}</p>
                      <p className="text-xs text-custom-700">{j.customer?.name ?? "—"}</p>
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
                    <td className="px-3 py-2.5 text-xs text-custom-700">
                      {j.departmentAssignedToId ? (deptMap[j.departmentAssignedToId] ?? "—") : <span className="italic text-custom-400">Unassigned</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {j.dueDate
                        ? <span className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-secondary-100"}`}>
                            {isOverdue && <HiOutlineExclamationCircle className="w-3.5 h-3.5 inline mr-0.5" />}
                            {j.dueDate.split("T")[0]}
                          </span>
                        : <span className="text-custom-400 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">
                      {new Date(j.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
    </Section>
  );
}

// ─── Tab 2: Departments Report ────────────────────────────────────────────────

function DepartmentsReport() {
  const { data: departments = [], isLoading: loadingDepts, refetch } = useGetDepartmentsQuery();
  const { data: jobsData, isLoading: loadingJobs } = useGetJobsQuery({ limit: 500 });
  const allJobs: Job[] = jobsData?.jobs ?? [];
  const isLoading = loadingDepts || loadingJobs;

  // Build per-department stats
  const deptStats = departments.map((dept) => {
    const deptJobs = allJobs.filter((j) => j.departmentAssignedToId === dept.id);
    const active    = deptJobs.filter((j) => j.state != null && IN_PRODUCTION_STATES.has(j.state)).length;
    const completed = deptJobs.filter((j) => j.status === "completed" || j.status === "delivered").length;
    const pending   = deptJobs.filter((j) => j.status === "pending" || j.status === "confirmed").length;
    const urgent    = deptJobs.filter((j) => j.priority === "urgent").length;
    return { ...dept, active, completed, pending, urgent, total: deptJobs.length };
  });

  const getExportData = () => ({
    headers: ["Department", "Total Jobs", "Active", "Completed", "Pending", "Urgent"],
    rows: deptStats.map((d) => [
      d.name, String(d.total), String(d.active), String(d.completed), String(d.pending), String(d.urgent),
    ]),
    summary: [
      { label: "Total Departments",    value: String(departments.length) },
      { label: "Total Jobs Assigned",  value: String(deptStats.reduce((s, d) => s + d.total, 0)) },
      { label: "Total Active",         value: String(deptStats.reduce((s, d) => s + d.active, 0)) },
      { label: "TOTAL COMPLETED",      value: String(deptStats.reduce((s, d) => s + d.completed, 0)), bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineUsers} title="Departments Overview" color="bg-purple-100 text-purple-600">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1" />
        <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100">
          <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
        </button>
        <PdfButtons title="Departments Production Report" getExportData={getExportData} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Departments"    value={departments.length} />
        <StatCard label="Total Assigned" value={deptStats.reduce((s, d) => s + d.total, 0)} />
        <StatCard label="Active"         value={deptStats.reduce((s, d) => s + d.active, 0)}    color="text-blue-600" />
        <StatCard label="Completed"      value={deptStats.reduce((s, d) => s + d.completed, 0)} color="text-emerald-600" />
      </div>

      {/* Department cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-custom-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deptStats.map((dept) => (
            <Card key={dept.id} className="!p-4">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-secondary-100">{dept.name}</h3>
                {dept.urgent > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                    {dept.urgent} urgent
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-custom-50 rounded-lg p-2">
                  <p className="text-custom-700">Total Jobs</p>
                  <p className="font-bold text-secondary-100 text-lg">{dept.total}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-blue-700">Active</p>
                  <p className="font-bold text-blue-600 text-lg">{dept.active}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2">
                  <p className="text-emerald-700">Completed</p>
                  <p className="font-bold text-emerald-600 text-lg">{dept.completed}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-2">
                  <p className="text-yellow-700">Pending</p>
                  <p className="font-bold text-yellow-600 text-lg">{dept.pending}</p>
                </div>
              </div>
              {dept.description && (
                <p className="text-xs text-custom-700 mt-2 truncate">{dept.description}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Full table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Department", "Total Jobs", "Active", "Completed", "Pending", "Urgent"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : deptStats.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700 text-sm">No departments found</td></tr>
              ) : deptStats.map((d) => (
                <tr key={d.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">{d.name}</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">{d.total}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{d.active}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{d.completed}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{d.pending}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {d.urgent > 0
                      ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{d.urgent}</span>
                      : <span className="text-custom-400 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Section>
  );
}

// ─── Tab 3: Completed Jobs Report ─────────────────────────────────────────────

function CompletedJobsReport() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: new Date(customFrom + "T00:00:00").toISOString(), to: new Date(customTo + "T23:59:59.999").toISOString() }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetJobsQuery({ limit: 500 });
  const { data: departments = [] }   = useGetDepartmentsQuery();
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  const allJobs: Job[] = data?.jobs ?? [];

  const jobs = allJobs.filter((j) => {
    if (j.status !== "completed" && j.status !== "delivered") return false;
    const d = new Date(j.updatedAt);
    return d >= new Date(range.from) && d <= new Date(range.to);
  });

  const totalPages   = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const paginated    = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const deliveredCount = jobs.filter((j) => j.status === "delivered").length;
  const paidCount    = jobs.filter((j) => j.paymentStatus === "paid").length;
  const totalValue   = jobs.reduce((s, j) => s + (Number(j.amount) || 0), 0);

  const getExportData = () => ({
    headers: ["Job #", "Title", "Customer", "Status", "Department", "Amount (RWF)", "Payment", "Completed"],
    rows: jobs.map((j) => [
      `#${j.jobNumber}`, j.title, j.customer?.name ?? "",
      j.status,
      j.departmentAssignedToId ? (deptMap[j.departmentAssignedToId] ?? "—") : "—",
      (Number(j.amount) || 0).toLocaleString(),
      j.paymentStatus === "paid" ? "Paid" : "Unpaid",
      new Date(j.updatedAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "Total Completed",  value: String(jobs.length) },
      { label: "Delivered",        value: String(deliveredCount) },
      { label: "Paid",             value: String(paidCount) },
      { label: "TOTAL VALUE",      value: `${totalValue.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineCheckCircle} title="Completed Jobs" color="bg-emerald-100 text-emerald-600">
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
          <PdfButtons title="Completed Jobs Report" getExportData={getExportData} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Completed" value={jobs.length} />
        <StatCard label="Delivered"       value={deliveredCount} color="text-blue-600" />
        <StatCard label="Paid"            value={paidCount}      color="text-emerald-600" />
        <StatCard label="Total Value"     value={`${totalValue.toLocaleString()} RWF`} color="text-primary-500" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Job #", "Title & Client", "Status", "Department", "Amount", "Payment", "Completed"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No completed jobs in this period</td></tr>
              ) : paginated.map((j) => {
                const statusCfg = jobStatusConfig[j.status] ?? { label: j.status, bgColor: "bg-gray-100", color: "text-gray-700" };
                return (
                  <tr key={j.id} className="hover:bg-custom-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">#{j.jobNumber}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-secondary-100">{j.title}</p>
                      <p className="text-xs text-custom-700">{j.customer?.name ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusCfg.bgColor} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">
                      {j.departmentAssignedToId ? (deptMap[j.departmentAssignedToId] ?? "—") : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">
                      {(Number(j.amount) || 0) > 0 ? `${(Number(j.amount)).toLocaleString()} RWF` : <span className="text-custom-400 font-normal">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${j.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        {j.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">
                      {new Date(j.updatedAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
    </Section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "all" | "production" | "departments" | "completed";

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "all",         label: "All Jobs",        icon: HiOutlineCollection },
  { value: "production",  label: "In Production",   icon: HiOutlineClipboardList },
  { value: "departments", label: "Departments",      icon: HiOutlineUsers },
  { value: "completed",   label: "Completed Jobs",   icon: HiOutlineCheckCircle },
];

export default function ProductionManagerReportsPage() {
  const { userRole, userName } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("all");

  return (
    <DashboardLayout userRole={userRole ?? "production-manager"} userName={userName ?? "Production Manager"} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        <div>
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineChartBar className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Production Reports</h1>
          </div>
          <p className="text-sm text-custom-700">
            Track jobs in production, department workloads, and completed work
          </p>
        </div>

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

        {activeTab === "all"         && <AllJobsReport />}
        {activeTab === "production"  && <ProductionJobsReport />}
        {activeTab === "departments" && <DepartmentsReport />}
        {activeTab === "completed"   && <CompletedJobsReport />}

      </div>
    </DashboardLayout>
  );
}
