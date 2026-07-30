import { useState } from "react";
import {
  HiOutlineBriefcase,
  HiOutlineCheckCircle,
  HiOutlineChartBar,
  HiOutlineDocumentDownload,
  HiOutlineDocumentText,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
  HiOutlineUsers,
  HiOutlineCalendar,
  HiOutlineXCircle,
} from "react-icons/hi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout, GenerateReportModal } from "../../components";
import { Card } from "../../components/ui";
import { useGetJobsQuery, useGetJobDepartmentHistoryQuery } from "../../store/services/jobsService";
import { useGetAllEmployeesQuery } from "../../store/services/employeesService";
import { useGetMyLeavesQuery } from "../../store/services/leaveService";
import { useAuth } from "../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";
type PageTab = "production" | "employees" | "leave";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const to = `${ymd(now)}T23:59:59`;
  let fromDate: Date;
  switch (period) {
    case "day":   fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case "week":  fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); break;
    case "month": fromDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "year":  fromDate = new Date(now.getFullYear(), 0, 1); break;
  }
  return { from: `${ymd(fromDate)}T00:00:00`, to };
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "day",   label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year",  label: "This Year" },
];

const PAGE_SIZE = 10;

// ─── PDF / Letterhead ─────────────────────────────────────────────────────────

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

function drawLetterhead(pdf: any, base64: string | null, title: string, subtitle: string) {
  const pw = pdf.internal.pageSize.getWidth();
  if (base64) pdf.addImage(base64, "PNG", 0, 0, pw, HEADER_H);
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
  pdf.text(COMPANY.address, c1, fy + 5);  pdf.text(COMPANY.tin,   c1, fy + 10);
  pdf.text(COMPANY.tel,     c2, fy + 5,  { align: "center" }); pdf.text(COMPANY.rc, c2, fy + 10, { align: "center" });
  pdf.text(COMPANY.email,   c3, fy + 5,  { align: "right" });  pdf.text(COMPANY.compte, c3, fy + 10, { align: "right" });
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(7); pdf.setTextColor(0, 160, 210);
  pdf.text(COMPANY.motto, c2, fy + 16, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(150, 150, 150);
  pdf.text(`Page ${pageNum} of ${totalPages}`, pw - 10, fy + 16, { align: "right" });
}

type SummaryRow = { label: string; value: string; bold?: boolean };

async function buildPdf(title: string, headers: string[], rows: string[][], summary: SummaryRow[]) {
  const base64  = await loadImageAsBase64("/header.png").catch(() => null);
  const subtitle = `Generated: ${new Date().toLocaleString("en-RW")}`;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw  = pdf.internal.pageSize.getWidth();
  drawLetterhead(pdf, base64, title, subtitle);
  autoTable(pdf, {
    head: [headers], body: rows,
    startY: HEADER_H + 23,
    margin: { left: 10, right: 10, bottom: FOOTER_TOP + 6 },
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [0, 160, 210], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 251, 255] },
    didDrawPage: (data: { pageNumber: number }) => {
      if (data.pageNumber > 1) drawLetterhead(pdf, base64, title, subtitle);
      drawFooter(pdf, data.pageNumber, (pdf as any).internal.getNumberOfPages());
    },
  });
  if (summary.length > 0) {
    const ay = (pdf as any).lastAutoTable.finalY + 8;
    const cl = pw - 90, cr = pw - 12;
    pdf.setDrawColor(0, 160, 210); pdf.setLineWidth(0.4); pdf.line(cl, ay - 3, cr, ay - 3);
    let sy = ay;
    summary.forEach(({ label, value, bold }) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(8); pdf.setTextColor(40, 40, 40);
      pdf.text(label, cl, sy); pdf.text(value, cr, sy, { align: "right" }); sy += 6;
    });
    pdf.setDrawColor(0, 160, 210); pdf.line(cl, sy, cr, sy);
  }
  const total = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) { pdf.setPage(i); drawFooter(pdf, i, total); }
  pdf.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

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

function PdfButtons({ title, getExportData }: {
  title: string;
  getExportData: () => { headers: string[]; rows: string[][]; summary: SummaryRow[] };
}) {
  const [showModal, setShowModal] = useState(false);
  const handlePdf = () => {
    const { headers, rows, summary } = getExportData();
    buildPdf(title, headers, rows, summary).catch((err) =>
      alert("PDF error: " + (err as Error).message)
    );
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

// ─── Job status / priority colours ───────────────────────────────────────────

const jobStatusColor: Record<string, string> = {
  pending:              "bg-yellow-100 text-yellow-700",
  confirmed:            "bg-blue-100 text-blue-700",
  "in-composition":     "bg-purple-100 text-purple-700",
  "in-montage":         "bg-indigo-100 text-indigo-700",
  "in-printing":        "bg-cyan-100 text-cyan-700",
  "in-binding":         "bg-orange-100 text-orange-700",
  "in-packaging":       "bg-teal-100 text-teal-700",
  "quality-check":      "bg-pink-100 text-pink-700",
  "ready-for-delivery": "bg-lime-100 text-lime-700",
  delivered:            "bg-emerald-100 text-emerald-700",
  completed:            "bg-green-100 text-green-700",
  rejected:             "bg-red-100 text-red-700",
};

const priorityColor: Record<string, string> = {
  low:    "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

// ─── Tab 1 — Production Jobs ──────────────────────────────────────────────────

function ProductionReport() {
  const { departmentId } = useAuth();
  const [period, setPeriod]             = useState<Period>("day");
  const [page, setPage]                 = useState(1);
  const [customFrom, setCustomFrom]     = useState("");
  const [customTo, setCustomTo]         = useState("");
  const [useCustom, setUseCustom]       = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const range = useCustom && customFrom && customTo
    ? { from: customFrom + "T00:00:00", to: customTo + "T23:59:59" }
    : getDateRange(period);

  const { data: currentData, isLoading, refetch: refetchCurrent } = useGetJobsQuery(
    { limit: 500, departmentAssignedToId: departmentId ?? undefined },
    { skip: !departmentId }
  );
  const { data: historyData, refetch: refetchHistory } = useGetJobDepartmentHistoryQuery(
    { departmentId: departmentId!, limit: 500 },
    { skip: !departmentId }
  );

  const refetch = () => { refetchCurrent(); refetchHistory(); };

  // Merge current + history, deduplicate by id
  const seen = new Set<string>();
  const allJobs = [...(currentData?.jobs ?? []), ...(historyData?.jobs ?? [])].filter((j) => {
    if (seen.has(j.id)) return false;
    seen.add(j.id);
    return true;
  });

  const filtered = allJobs.filter((j) => {
    const d = new Date(j.createdAt);
    if (d < new Date(range.from) || d > new Date(range.to)) return false;
    if (statusFilter   && j.status   !== statusFilter)   return false;
    if (priorityFilter && j.priority !== priorityFilter) return false;
    return true;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const inProgress  = filtered.filter((j) => j.status.startsWith("in-")).length;
  const ready       = filtered.filter((j) => j.status === "ready-for-delivery").length;
  const completed   = filtered.filter((j) => j.progress === "completed").length;

  const byStage: Record<string, number> = {};
  filtered.forEach((j) => { byStage[j.status] = (byStage[j.status] ?? 0) + 1; });

  const getExportData = () => ({
    headers: ["Job #", "Title", "Customer", "Priority", "Status", "Progress", "Due Date", "Created"],
    rows: filtered.map((j) => [
      `#${j.jobNumber}`, j.title, j.customer?.name ?? "—", j.priority, j.status,
      j.progress ?? "—",
      j.dueDate ? j.dueDate.split("T")[0] : "—",
      new Date(j.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "Total Jobs",    value: String(filtered.length) },
      { label: "In Production", value: String(inProgress) },
      { label: "Ready",         value: String(ready) },
      { label: "COMPLETED",     value: String(completed), bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All statuses</option>
            <option value="in-composition">In Composition</option>
            <option value="in-montage">In Montage</option>
            <option value="in-printing">In Printing</option>
            <option value="in-binding">In Binding</option>
            <option value="in-packaging">In Packaging</option>
            <option value="ready-for-delivery">Ready for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
          </select>
          <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input type="date" value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors" />
          <span className="text-xs text-custom-700">to</span>
          <input type="date" value={customTo} min={customFrom}
            onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors" />
          {useCustom && (
            <button onClick={() => { setCustomFrom(""); setCustomTo(""); setUseCustom(false); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-custom-300 text-xs text-custom-700 hover:bg-custom-100 transition-colors">Clear</button>
          )}
          <button onClick={refetch} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Supervisor Production Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Jobs"    value={filtered.length} />
        <StatCard label="In Production" value={inProgress} color="text-blue-600" />
        <StatCard label="Completed"     value={completed}  color="text-emerald-600" />
      </div>

      {/* Stage badges */}
      {Object.keys(byStage).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byStage).map(([status, count]) => (
            <button key={status}
              onClick={() => { setStatusFilter(statusFilter === status ? "" : status); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                statusFilter === status ? "border-primary-500 shadow-sm" : "border-transparent"
              } ${jobStatusColor[status] ?? "bg-gray-100 text-gray-600"}`}>
              {status.replace(/-/g, " ")}: {count}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Job #", "Title & Client", "Priority", "Status", "Progress", "Due Date", "Created"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No production jobs in this period</td></tr>
              ) : paginated.map((j) => (
                <tr key={j.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">#{j.jobNumber}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{j.title}</p>
                    <p className="text-xs text-custom-700">{j.customer?.name ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${priorityColor[j.priority] ?? "bg-gray-100 text-gray-600"}`}>
                      {j.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${jobStatusColor[j.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {j.status === "completed" && <HiOutlineCheckCircle       className="inline w-3 h-3 mr-1" />}
                      {j.status === "rejected"  && <HiOutlineXCircle           className="inline w-3 h-3 mr-1" />}
                      {j.status === "pending"   && <HiOutlineExclamationCircle className="inline w-3 h-3 mr-1" />}
                      {j.status === "confirmed" && <HiOutlineBriefcase         className="inline w-3 h-3 mr-1" />}
                      {j.status.replace(/-/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {j.progress ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                        j.progress === "completed" ? "bg-emerald-100 text-emerald-700"
                        : j.progress === "paused"  ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                      }`}>{j.progress}</span>
                    ) : <span className="text-xs text-custom-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">{j.dueDate ? j.dueDate.split("T")[0] : "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {new Date(j.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Jobs",    value: String(filtered.length), cls: "text-secondary-100" },
              { label: "In Production", value: String(inProgress),      cls: "text-blue-600" },
              { label: "Ready",         value: String(ready),           cls: "text-lime-600" },
              { label: "Completed",     value: String(completed),       cls: "text-emerald-600 font-bold" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 hover:bg-custom-100"}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2 — Employees ────────────────────────────────────────────────────────

const contractColors: Record<string, string> = {
  FULL_TIME: "bg-blue-100 text-blue-700",
  PART_TIME: "bg-yellow-100 text-yellow-700",
  CONTRACT:  "bg-orange-100 text-orange-700",
  INTERN:    "bg-purple-100 text-purple-700",
};

function EmployeesReport() {
  const [page, setPage]                     = useState(1);
  const [customFrom, setCustomFrom]         = useState("");
  const [customTo, setCustomTo]             = useState("");
  const [contractFilter, setContractFilter] = useState("");
  const [statusFilter, setStatusFilter]     = useState("");

  const { data, isLoading, refetch } = useGetAllEmployeesQuery({ limit: 500 });
  const all = data?.data ?? [];

  const filtered = all.filter((e) => {
    // Only apply hired-date range when the user explicitly sets both dates
    if (customFrom && customTo) {
      const hiredAt = e.hiredAt ?? e.createdAt ?? "";
      if (hiredAt) {
        const d = new Date(hiredAt);
        if (d < new Date(customFrom) || d > new Date(customTo + "T23:59:59.000Z")) return false;
      }
    }
    if (contractFilter && e.contractType !== contractFilter) return false;
    if (statusFilter === "active"   && !e.isActive) return false;
    if (statusFilter === "inactive" &&  e.isActive) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const active     = filtered.filter((e) => e.isActive).length;
  const inactive   = filtered.filter((e) => !e.isActive).length;
  const male       = filtered.filter((e) => e.gender === "MALE").length;
  const female     = filtered.filter((e) => e.gender === "FEMALE").length;
  const totalSalary = filtered.reduce((s, e) => s + Number(e.contractSalary ?? 0), 0);

  const byContract: Record<string, number> = {};
  filtered.forEach((e) => { const ct = e.contractType ?? "UNKNOWN"; byContract[ct] = (byContract[ct] ?? 0) + 1; });

  const getExportData = () => ({
    headers: ["Full Name", "Phone", "Gender", "Contract", "Salary (RWF)", "Status", "Hired At"],
    rows: filtered.map((e) => [
      e.fullName, e.phoneNumber, e.gender?.toLowerCase() ?? "—",
      e.contractType?.replace("_", " ") ?? "—",
      Number(e.contractSalary ?? 0).toLocaleString(),
      e.isActive ? "Active" : "Inactive",
      e.hiredAt ? new Date(e.hiredAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }) : "—",
    ]),
    summary: [
      { label: `Total Employees: ${filtered.length}`, value: "" },
      { label: "Active",        value: String(active) },
      { label: "Inactive",      value: String(inactive) },
      { label: "Male / Female", value: `${male} / ${female}` },
      { label: "Total Payroll", value: `${totalSalary.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-custom-700">
          Hired between:
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors" />
          <span className="text-xs text-custom-700">to</span>
          <input type="date" value={customTo} min={customFrom}
            onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors" />
          {(customFrom || customTo) && (
            <button onClick={() => { setCustomFrom(""); setCustomTo(""); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-custom-300 text-xs text-custom-700 hover:bg-custom-100 transition-colors">Clear</button>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={contractFilter} onChange={(e) => { setContractFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All contracts</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERN">Intern</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Supervisor Employees Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Total"    value={filtered.length} />
        <StatCard label="Active"   value={active}   color="text-emerald-600" />
        <StatCard label="Inactive" value={inactive} color="text-red-600" />
        <StatCard label="Male"     value={male}     color="text-blue-600" />
        <StatCard label="Female"   value={female}   color="text-pink-600" />
      </div>

      {/* Contract badges */}
      {Object.keys(byContract).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byContract).map(([ct, count]) => (
            <div key={ct} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${contractColors[ct] ?? "bg-gray-100 text-gray-600"}`}>
              {ct.replace("_", " ")}: {count}
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Full Name", "Phone", "Gender", "Contract", "Salary", "Status", "Hired At"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No employees found</td></tr>
              ) : paginated.map((e) => (
                <tr key={e.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{e.fullName}</p>
                    {e.email && <p className="text-xs text-custom-700">{e.email}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{e.phoneNumber}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100 capitalize">{e.gender?.toLowerCase()}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${contractColors[e.contractType ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                      {e.contractType?.replace("_", " ") ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{Number(e.contractSalary ?? 0).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {e.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {e.hiredAt ? new Date(e.hiredAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Employees", value: String(filtered.length), cls: "text-secondary-100" },
              { label: "Active",          value: String(active),          cls: "text-emerald-600" },
              { label: "Inactive",        value: String(inactive),        cls: "text-red-500" },
              { label: "Total Payroll",   value: `${totalSalary.toLocaleString()} RWF`, cls: "text-primary-600 font-bold" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 hover:bg-custom-100"}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3 — Leave ────────────────────────────────────────────────────────────

const leaveTypeColor: Record<string, string> = {
  ANNUAL:    "bg-blue-100 text-blue-700",
  SICK:      "bg-red-100 text-red-700",
  MATERNITY: "bg-pink-100 text-pink-700",
  PATERNITY: "bg-indigo-100 text-indigo-700",
  UNPAID:    "bg-gray-100 text-gray-600",
  EMERGENCY: "bg-orange-100 text-orange-700",
  OTHER:     "bg-yellow-100 text-yellow-700",
};

const leaveStatusColor: Record<string, string> = {
  PENDING:  "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

function LeaveReport() {
  const [page, setPage]                 = useState(1);
  const [customFrom, setCustomFrom]     = useState("");
  const [customTo, setCustomTo]         = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter]     = useState("");

  const { data, isLoading, refetch } = useGetMyLeavesQuery({ limit: 500 });
  const all = data?.data ?? [];

  const filtered = all.filter((l) => {
    // Only filter by date when the user explicitly sets both dates
    if (customFrom && customTo) {
      const d = new Date(l.startDate);
      if (d < new Date(customFrom) || d > new Date(customTo + "T23:59:59.000Z")) return false;
    }
    if (statusFilter && l.status !== statusFilter) return false;
    if (typeFilter   && l.type   !== typeFilter)   return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const approved   = filtered.filter((l) => l.status === "APPROVED").length;
  const pending    = filtered.filter((l) => l.status === "PENDING").length;
  const rejected   = filtered.filter((l) => l.status === "REJECTED").length;

  const byType: Record<string, number> = {};
  filtered.forEach((l) => { byType[l.type] = (byType[l.type] ?? 0) + 1; });

  function daysBetween(start: string, end: string) {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(ms / 86400000) + 1);
  }

  const getExportData = () => ({
    headers: ["Employee", "Role", "Type", "Start Date", "End Date", "Days", "Status", "Requested"],
    rows: filtered.map((l) => [
      l.user?.name ?? "—",
      l.user?.role ?? "—",
      l.type,
      l.startDate.split("T")[0],
      l.endDate.split("T")[0],
      String(daysBetween(l.startDate, l.endDate)),
      l.status,
      new Date(l.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "Total Requests", value: String(filtered.length) },
      { label: "Pending",        value: String(pending) },
      { label: "Approved",       value: String(approved) },
      { label: "REJECTED",       value: String(rejected), bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-custom-700">Leave start date:</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors" />
          <span className="text-xs text-custom-700">to</span>
          <input type="date" value={customTo} min={customFrom}
            onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors" />
          {(customFrom || customTo) && (
            <button onClick={() => { setCustomFrom(""); setCustomTo(""); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-custom-300 text-xs text-custom-700 hover:bg-custom-100 transition-colors">Clear</button>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All types</option>
            <option value="ANNUAL">Annual</option>
            <option value="SICK">Sick</option>
            <option value="MATERNITY">Maternity</option>
            <option value="PATERNITY">Paternity</option>
            <option value="UNPAID">Unpaid</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="OTHER">Other</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Supervisor Leave Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={filtered.length} />
        <StatCard label="Pending"        value={pending}  color="text-yellow-600" />
        <StatCard label="Approved"       value={approved} color="text-emerald-600" />
        <StatCard label="Rejected"       value={rejected} color="text-red-600" />
      </div>

      {/* Type badges */}
      {Object.keys(byType).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byType).map(([type, count]) => (
            <button key={type}
              onClick={() => { setTypeFilter(typeFilter === type ? "" : type); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                typeFilter === type ? "border-primary-500 shadow-sm" : "border-transparent"
              } ${leaveTypeColor[type] ?? "bg-gray-100 text-gray-600"}`}>
              {type}: {count}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Employee", "Role", "Type", "Start", "End", "Days", "Status", "Requested"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No leave requests in this period</td></tr>
              ) : paginated.map((l) => (
                <tr key={l.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-sm font-semibold text-secondary-100">{l.user?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700 capitalize">{l.user?.role?.toLowerCase() ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${leaveTypeColor[l.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {l.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">{l.startDate.split("T")[0]}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">{l.endDate.split("T")[0]}</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">{daysBetween(l.startDate, l.endDate)}d</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${leaveStatusColor[l.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {new Date(l.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden w-64">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Requests", value: String(filtered.length), cls: "text-secondary-100" },
              { label: "Pending",        value: String(pending),         cls: "text-yellow-600" },
              { label: "Approved",       value: String(approved),        cls: "text-emerald-600 font-bold" },
              { label: "Rejected",       value: String(rejected),        cls: "text-red-600" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 hover:bg-custom-100"}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { userRole, userName } = useAuth();
  const [activeTab, setActiveTab] = useState<PageTab>("production");

  const tabs: { key: PageTab; label: string; icon: React.ElementType }[] = [
    { key: "production", label: "Production Jobs", icon: HiOutlineChartBar },
    { key: "employees",  label: "Employees",       icon: HiOutlineUsers },
    { key: "leave",      label: "Leave",            icon: HiOutlineCalendar },
  ];

  return (
    <DashboardLayout userRole={userRole ?? "supervisor"} userName={userName ?? ""} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <HiOutlineChartBar className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-100">Production Reports</h1>
            <p className="text-sm text-custom-700">Monitor jobs, employees and leave requests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-custom-200 pb-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors border-b-2 ${
                activeTab === key
                  ? "border-primary-500 text-primary-500 bg-primary-50"
                  : "border-transparent text-custom-700 hover:text-secondary-100 hover:bg-custom-50"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "production" && <ProductionReport />}
        {activeTab === "employees"  && <EmployeesReport />}
        {activeTab === "leave"      && <LeaveReport />}

      </div>
    </DashboardLayout>
  );
}
