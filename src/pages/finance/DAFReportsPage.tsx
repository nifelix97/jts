import { useState } from "react";
import {
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentDownload,
  HiOutlineDocumentText,
  HiOutlineExclamationCircle,
  HiOutlineRefresh,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineXCircle,
} from "react-icons/hi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout, GenerateReportModal } from "../../components";
import { Card } from "../../components/ui";
import { useGetJobsQuery } from "../../store/services/jobsService";
import {
  useGetProcurementStatsQuery,
  useGetLeadsQuery,
} from "../../store/services/procurementService";
import { useGetAllEmployeesQuery } from "../../store/services/employeesService";
import { useGetPayrollsQuery } from "../../store/services/payrollService";
import { useGetAllLeavesQuery } from "../../store/services/leaveService";
import { useGetCasualWorkersQuery } from "../../store/services/casualWorkersService";
import { useAuth } from "../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  // start of day = 00:00:00.000 local time
  const startOfDay  = (yr: number, mo: number, dy: number) =>
    new Date(yr, mo, dy, 0, 0, 0, 0);
  // end of today = 23:59:59.999 local time
  const endOfToday  = new Date(y, m, d, 23, 59, 59, 999);
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

// ─── Letterhead + PDF helpers (shared with Reception) ────────────────────────

const COMPANY = {
  name:    "Santrack LTD",
  society: "SOCIETE DE L'APOSTOLAT CATHOLIQUE",
  tagline: "Editions - Imprimerie",
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
  const col1 = 12, col2 = pw / 2, col3 = pw - 12;
  pdf.text(COMPANY.address, col1, fy + 5);  pdf.text(COMPANY.tin,   col1, fy + 10);
  pdf.text(COMPANY.tel,     col2, fy + 5,  { align: "center" }); pdf.text(COMPANY.rc, col2, fy + 10, { align: "center" });
  pdf.text(COMPANY.email,   col3, fy + 5,  { align: "right" });  pdf.text(COMPANY.compte, col3, fy + 10, { align: "right" });
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(7); pdf.setTextColor(0, 160, 210);
  pdf.text(COMPANY.motto, col2, fy + 16, { align: "center" });
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
    const afterTable = (pdf as any).lastAutoTable.finalY + 8;
    const col1 = pw - 90, col2 = pw - 12;
    pdf.setDrawColor(0, 160, 210); pdf.setLineWidth(0.4);
    pdf.line(col1, afterTable - 3, col2, afterTable - 3);
    let sy = afterTable;
    summary.forEach(({ label, value, bold }) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(8); pdf.setTextColor(40, 40, 40);
      pdf.text(label, col1, sy); pdf.text(value, col2, sy, { align: "right" }); sy += 6;
    });
    pdf.setDrawColor(0, 160, 210); pdf.line(col1, sy, col2, sy);
  }
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) { pdf.setPage(i); drawFooter(pdf, i, totalPages); }
  pdf.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const stageConfig: Record<string, { label: string; color: string; bg: string }> = {
  prospect:    { label: "Prospect",    color: "text-gray-700",    bg: "bg-gray-100"    },
  contacted:   { label: "Contacted",   color: "text-blue-700",    bg: "bg-blue-100"    },
  negotiating: { label: "Negotiating", color: "text-yellow-700",  bg: "bg-yellow-100"  },
  won:         { label: "Won",         color: "text-emerald-700", bg: "bg-emerald-100" },
  lost:        { label: "Lost",        color: "text-red-700",     bg: "bg-red-100"     },
};

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

// ─── Tab 1: Job Approval Report ───────────────────────────────────────────────

const jobStatusColor: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  rejected:  "bg-red-100 text-red-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-700",
};

function JobApprovalReport() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: new Date(customFrom + "T00:00:00").toISOString(), to: new Date(customTo + "T23:59:59.999").toISOString() }
    : getDateRange(period);

  const { data: pendingData,   isLoading, refetch: r1 } = useGetJobsQuery({ status: "pending",   limit: 500 });
  const { data: confirmedData, refetch: r2 }            = useGetJobsQuery({ status: "confirmed", limit: 500 });
  const { data: rejectedData,  refetch: r3 }            = useGetJobsQuery({ status: "rejected",  limit: 500 });

  const refetch = () => { r1(); r2(); r3(); };

  const allJobs = [
    ...(pendingData?.jobs   ?? []),
    ...(confirmedData?.jobs ?? []),
    ...(rejectedData?.jobs  ?? []),
  ];

  const jobs = allJobs.filter((j) => {
    const d = new Date(j.createdAt);
    return d >= new Date(range.from) && d <= new Date(range.to);
  });

  const totalPages    = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const paginated     = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pending       = jobs.filter((j) => j.status === "pending");
  const confirmed     = jobs.filter((j) => j.status === "confirmed");
  const rejected      = jobs.filter((j) => j.status === "rejected");
  const totalValue    = confirmed.reduce((s, j) => s + (Number(j.amount) || 0), 0);
  const pendingValue  = pending.reduce((s, j) => s + (Number(j.amount) || 0), 0);

  const getExportData = () => ({
    headers: ["Job #", "Title", "Customer", "Amount (RWF)", "Status", "Payment", "Deadline", "Created"],
    rows: jobs.map((j) => [
      `#${j.jobNumber}`,
      j.title,
      j.customer?.name ?? "",
      (Number(j.amount) || 0).toLocaleString(),
      j.status,
      j.paymentStatus === "paid" ? "Paid" : "Unpaid",
      j.dueDate ? j.dueDate.split("T")[0] : "",
      new Date(j.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "Total Jobs",       value: String(jobs.length) },
      { label: "Pending",          value: String(pending.length) },
      { label: "Confirmed",        value: String(confirmed.length) },
      { label: "Rejected",         value: String(rejected.length) },
      { label: "Pending Value",    value: `${pendingValue.toLocaleString()} RWF` },
      { label: "CONFIRMED VALUE",  value: `${totalValue.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineBriefcase} title="Job Approval Report" color="bg-blue-100 text-blue-600">
      {/* Controls */}
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
          <button onClick={refetch} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="DAF Job Approval Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Jobs"      value={jobs.length} />
        <StatCard label="Pending"         value={pending.length}   color="text-yellow-600"
          sub={`${pendingValue.toLocaleString()} RWF`} />
        <StatCard label="Confirmed"       value={confirmed.length} color="text-blue-600"
          sub={`${totalValue.toLocaleString()} RWF`} />
        <StatCard label="Rejected"        value={rejected.length}  color="text-red-600" />
      </div>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Job #", "Title & Client", "Amount", "Status", "Payment", "Deadline", "Created"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No jobs in this period</td></tr>
              ) : paginated.map((j) => (
                <tr key={j.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">#{j.jobNumber}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{j.title}</p>
                    <p className="text-xs text-custom-700">{j.customer?.name ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">
                    {j.amount != null ? `${(Number(j.amount) || 0).toLocaleString()} RWF` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${jobStatusColor[j.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {j.status === "pending"   && <HiOutlineExclamationCircle className="inline w-3 h-3 mr-1" />}
                      {j.status === "confirmed" && <HiOutlineCheckCircle       className="inline w-3 h-3 mr-1" />}
                      {j.status === "rejected"  && <HiOutlineXCircle           className="inline w-3 h-3 mr-1" />}
                      {j.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${j.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {j.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {j.dueDate ? j.dueDate.split("T")[0] : "—"}
                  </td>
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
      {jobs.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Jobs",      value: String(jobs.length),                   cls: "text-secondary-100" },
              { label: "Pending",         value: String(pending.length),                cls: "text-yellow-600" },
              { label: "Confirmed",       value: String(confirmed.length),              cls: "text-blue-600" },
              { label: "Rejected",        value: String(rejected.length),               cls: "text-red-600" },
              { label: "Confirmed Value", value: `${totalValue.toLocaleString()} RWF`,  cls: "text-blue-600 font-bold" },
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
      {jobs.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, jobs.length)} of {jobs.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 hover:bg-custom-100"}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Tab 2: Procurement / Market Leads Report ────────────────────────────────

function ProcurementReport() {
  const [page, setPage]               = useState(1);
  const [stageFilter, setStageFilter] = useState<string>("all");

  const { data: statsData, isLoading: loadingStats, refetch: refetchStats } = useGetProcurementStatsQuery();
  const { data: leadsData, isLoading: loadingLeads, refetch: refetchLeads } = useGetLeadsQuery({
    stage: stageFilter !== "all" ? (stageFilter as any) : undefined,
    page,
    limit: 500,
  });

  const refetch = () => { refetchStats(); refetchLeads(); };

  const leads      = leadsData?.leads ?? [];
  const kpi        = statsData?.kpi;
  const pipeline   = statsData?.pipeline ?? [];
  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const paginated  = leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isLoading  = loadingStats || loadingLeads;

  const wonValue   = kpi?.wonValue ?? 0;
  const totalValue = pipeline.reduce((s, p) => s + p.totalValue, 0);

  const getExportData = () => ({
    headers: ["Company", "Contact", "Phone", "Sector", "Stage", "Est. Value (RWF)", "Location", "Next Follow-up", "Added"],
    rows: leads.map((l) => [
      l.company,
      l.contactPerson,
      l.phone ?? "",
      l.sector,
      l.stage,
      (l.estimatedValue ?? 0).toLocaleString(),
      l.location ?? "",
      l.nextFollowUp ? l.nextFollowUp.slice(0, 10) : "",
      l.createdAt?.slice(0, 10) ?? "",
    ]),
    summary: [
      { label: "Total Leads",     value: String(kpi?.totalLeads ?? leads.length) },
      { label: "Won",             value: String(kpi?.wonCount ?? 0) },
      { label: "In Progress",     value: String(kpi?.inProgress ?? 0) },
      { label: "Overdue Follow-ups", value: String(kpi?.overdueFollowUps ?? 0) },
      { label: "WON VALUE",       value: `${wonValue.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineChartBar} title="Procurement / Market Leads" color="bg-purple-100 text-purple-600">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Stage filter pills */}
        <div className="flex gap-1 bg-custom-100 p-1 rounded-xl w-fit flex-wrap">
          {[{ value: "all", label: "All" }, ...Object.entries(stageConfig).map(([v, c]) => ({ value: v, label: c.label }))].map((s) => (
            <button key={s.value} onClick={() => { setStageFilter(s.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                stageFilter === s.value ? "bg-primary-500 text-white shadow-sm" : "text-custom-700 hover:text-secondary-100"
              }`}>{s.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={refetch} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="DAF Procurement Report" getExportData={getExportData} />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Total Leads"       value={kpi?.totalLeads ?? 0} />
        <StatCard label="In Progress"       value={kpi?.inProgress ?? 0}        color="text-yellow-600" />
        <StatCard label="Won"               value={kpi?.wonCount ?? 0}           color="text-emerald-600" />
        <StatCard label="Overdue"           value={kpi?.overdueFollowUps ?? 0}   color="text-red-600" />
        <StatCard label="Won Value"         value={`${wonValue.toLocaleString()} RWF`} color="text-emerald-600"
          sub={`Total pipeline: ${totalValue.toLocaleString()} RWF`} />
      </div>

      {/* Pipeline overview */}
      {pipeline.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {pipeline.map(({ stage, count, totalValue: tv }) => {
            const cfg = stageConfig[stage] ?? { label: stage, color: "text-gray-700", bg: "bg-gray-100" };
            return (
              <div key={stage}
                onClick={() => setStageFilter(stageFilter === stage ? "all" : stage)}
                className={`flex-1 min-w-[90px] p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  stageFilter === stage ? "border-primary-500 shadow-sm" : "border-transparent"
                } ${cfg.bg}`}>
                <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                <p className={`text-2xl font-bold ${cfg.color} mt-1`}>{count}</p>
                {tv > 0 && (
                  <p className={`text-xs ${cfg.color} opacity-70`}>
                    {tv >= 1_000_000 ? `${(tv / 1_000_000).toFixed(1)}M` : tv.toLocaleString()} RWF
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Company", "Contact", "Sector", "Stage", "Est. Value", "Location", "Next Follow-up", "Added"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No leads found</td></tr>
              ) : paginated.map((l) => {
                const stageCfg = stageConfig[l.stage] ?? { label: l.stage, color: "text-gray-700", bg: "bg-gray-100" };
                const isOverdue = l.nextFollowUp && new Date(l.nextFollowUp) < new Date() && l.stage !== "won" && l.stage !== "lost";
                return (
                  <tr key={l.id} className="hover:bg-custom-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-secondary-100">{l.company}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm text-secondary-100">{l.contactPerson}</p>
                      {l.phone && <p className="text-xs text-custom-700">{l.phone}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700 capitalize">{l.sector}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stageCfg.bg} ${stageCfg.color}`}>
                        {stageCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm font-bold text-purple-600">
                      {(l.estimatedValue ?? 0) > 0 ? `${(l.estimatedValue!).toLocaleString()} RWF` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">{l.location ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {l.nextFollowUp ? (
                        <span className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-custom-700"}`}>
                          {l.nextFollowUp.slice(0, 10)}
                          {isOverdue && " ⚠"}
                        </span>
                      ) : <span className="text-xs text-custom-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">{l.createdAt?.slice(0, 10) ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {leads.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Leads",   value: String(kpi?.totalLeads ?? leads.length), cls: "text-secondary-100" },
              { label: "Won",           value: String(kpi?.wonCount ?? 0),              cls: "text-emerald-600" },
              { label: "In Progress",   value: String(kpi?.inProgress ?? 0),            cls: "text-yellow-600" },
              { label: "Won Value",     value: `${wonValue.toLocaleString()} RWF`,       cls: "text-emerald-600 font-bold" },
              { label: "Pipeline Total",value: `${totalValue.toLocaleString()} RWF`,    cls: "text-purple-600 font-bold" },
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
      {leads.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, leads.length)} of {leads.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 hover:bg-custom-100"}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold hover:bg-custom-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </Section>
  );
}


// ─── Employees Report ─────────────────────────────────────────────────────────

function EmployeesReport() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);
  const [contractFilter, setContractFilter] = useState("");
  const [statusFilter, setStatusFilter]     = useState("");

  const range = useCustom && customFrom && customTo
    ? { from: new Date(customFrom + "T00:00:00").toISOString(), to: new Date(customTo + "T23:59:59.999").toISOString() }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetAllEmployeesQuery({ limit: 500 });
  const allEmployees = data?.data ?? [];

  const filtered = allEmployees.filter((e) => {
    const hiredAt = e.hiredAt ?? e.createdAt ?? "";
    if (hiredAt) {
      const d = new Date(hiredAt);
      if (d < new Date(range.from) || d > new Date(range.to)) return false;
    }
    if (contractFilter && e.contractType !== contractFilter) return false;
    if (statusFilter === "active"   && !e.isActive) return false;
    if (statusFilter === "inactive" &&  e.isActive) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const active   = filtered.filter((e) => e.isActive).length;
  const inactive = filtered.filter((e) => !e.isActive).length;
  const male     = filtered.filter((e) => e.gender === "MALE").length;
  const female   = filtered.filter((e) => e.gender === "FEMALE").length;

  const byContract: Record<string, number> = {};
  filtered.forEach((e) => {
    const ct = e.contractType ?? "UNKNOWN";
    byContract[ct] = (byContract[ct] ?? 0) + 1;
  });

  const totalSalary = filtered.reduce((s, e) => s + Number(e.contractSalary ?? 0), 0);

  const contractColors: Record<string, string> = {
    FULL_TIME: "bg-blue-100 text-blue-700",
    PART_TIME: "bg-yellow-100 text-yellow-700",
    CONTRACT:  "bg-orange-100 text-orange-700",
    INTERN:    "bg-purple-100 text-purple-700",
    UNKNOWN:   "bg-gray-100 text-gray-600",
  };

  const getExportData = () => ({
    headers: ["Full Name", "Phone", "Gender", "Contract", "Salary (RWF)", "Status", "Hired At"],
    rows: filtered.map((e) => [
      e.fullName,
      e.phoneNumber,
      e.gender?.toLowerCase() ?? "—",
      e.contractType?.replace("_", " ") ?? "—",
      Number(e.contractSalary ?? 0).toLocaleString(),
      e.isActive ? "Active" : "Inactive",
      e.hiredAt
        ? new Date(e.hiredAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
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
    <Section icon={HiOutlineUsers} title="Employees" color="bg-blue-100 text-blue-600">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={contractFilter}
            onChange={(e) => { setContractFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All contracts</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERN">Intern</option>
          </select>
          <select value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="DAF Employees Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stat cards */}
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
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No employees in this period</td></tr>
              ) : paginated.map((e) => (
                <tr key={e.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{e.fullName}</p>
                    {e.email && <p className="text-xs text-custom-700">{e.email}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{e.phoneNumber}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100 capitalize">{e.gender?.toLowerCase()}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${contractColors[e.contractType ?? "UNKNOWN"] ?? "bg-gray-100 text-gray-600"}`}>
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
                    {e.hiredAt
                      ? new Date(e.hiredAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex justify-end mt-1">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Employees", value: String(filtered.length), cls: "text-secondary-100" },
              { label: "Active",          value: String(active),          cls: "text-emerald-600" },
              { label: "Inactive",        value: String(inactive),        cls: "text-red-500" },
              { label: "Total Payroll",   value: `${totalSalary.toLocaleString()} RWF`, cls: "text-primary-600" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`font-bold text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Payroll Report ───────────────────────────────────────────────────────────

function PayrollReport() {
  const [page, setPage]             = useState(1);
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "draft" | "approved" | "paid">("");

  const { data, isLoading, refetch } = useGetPayrollsQuery({
    limit: 500,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(periodFilter ? { period: periodFilter } : {}),
  });
  const payrolls = data?.data ?? [];

  const totalPages      = Math.max(1, Math.ceil(payrolls.length / PAGE_SIZE));
  const paginated       = payrolls.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalNet        = payrolls.filter((p) => p.status !== "draft").reduce((s, p) => s + Number(p.netSalary), 0);
  const totalSalary     = payrolls.reduce((s, p) => s + Number(p.salary), 0);
  const totalOvertime   = payrolls.reduce((s, p) => s + Number(p.overtime), 0);
  const totalDeductions = payrolls.reduce((s, p) => s + Number(p.deductions), 0);
  const draftCount      = payrolls.filter((p) => p.status === "draft").length;
  const approvedCount   = payrolls.filter((p) => p.status === "approved").length;
  const paidCount       = payrolls.filter((p) => p.status === "paid").length;

  const statusStyle: Record<string, string> = {
    draft:    "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    paid:     "bg-emerald-100 text-emerald-700",
  };

  const getExportData = () => ({
    headers: ["Employee / Worker", "Type", "Period", "Salary (RWF)", "Overtime (RWF)", "Deductions (RWF)", "Net (RWF)", "Status"],
    rows: payrolls.map((p) => [
      p.employee?.fullName ?? p.casualWorker?.fullName ?? p.workerName ?? "—",
      p.workerType === "casual" ? "Casual" : "Employee",
      p.period,
      Number(p.salary).toLocaleString(),
      Number(p.overtime).toLocaleString(),
      Number(p.deductions).toLocaleString(),
      Number(p.netSalary).toLocaleString(),
      p.status,
    ]),
    summary: [
      { label: `Total Records: ${payrolls.length}`, value: "" },
      { label: "Draft",       value: String(draftCount) },
      { label: "Approved",    value: String(approvedCount) },
      { label: "Paid",        value: String(paidCount) },
      { label: "Base Salary", value: `${totalSalary.toLocaleString()} RWF` },
      { label: "Overtime",    value: `${totalOvertime.toLocaleString()} RWF` },
      { label: "Deductions",  value: `${totalDeductions.toLocaleString()} RWF` },
      { label: "NET TOTAL",   value: `${totalNet.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineCurrencyDollar} title="Payroll" color="bg-emerald-100 text-emerald-600">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <input type="month" value={periodFilter}
            onChange={(e) => { setPeriodFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors" />
          {periodFilter && (
            <button onClick={() => { setPeriodFilter(""); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-custom-300 text-xs text-custom-700 hover:bg-custom-100 transition-colors">Clear</button>
          )}
          <select value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="DAF Payroll Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Records" value={payrolls.length} />
        <StatCard label="Draft"         value={draftCount}    color="text-yellow-600" />
        <StatCard label="Approved"      value={approvedCount} color="text-blue-600" />
        <StatCard label="Paid"          value={paidCount}     color="text-emerald-600" />
      </div>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Employee / Worker", "Type", "Period", "Salary", "Overtime", "Deductions", "Net", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : payrolls.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No payroll records found</td></tr>
              ) : paginated.map((p) => (
                <tr key={p.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">
                      {p.employee?.fullName ?? p.casualWorker?.fullName ?? p.workerName ?? "—"}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.workerType === "casual" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                      {p.workerType === "casual" ? "Casual" : "Employee"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100 font-mono">{p.period}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{Number(p.salary).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5 text-sm text-emerald-600">{Number(p.overtime).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5 text-sm text-red-500">{Number(p.deductions).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-primary-600">{Number(p.netSalary).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusStyle[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {payrolls.length > 0 && (
        <div className="flex justify-end mt-1">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-80">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Base Salary",  value: `${totalSalary.toLocaleString()} RWF`,     cls: "text-secondary-100" },
              { label: "Overtime",     value: `${totalOvertime.toLocaleString()} RWF`,   cls: "text-emerald-600" },
              { label: "Deductions",   value: `${totalDeductions.toLocaleString()} RWF`, cls: "text-red-500" },
              { label: "NET TOTAL",    value: `${totalNet.toLocaleString()} RWF`,         cls: "text-primary-600" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`font-bold text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {payrolls.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, payrolls.length)} of {payrolls.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Leave Report ─────────────────────────────────────────────────────────────

function LeaveReport() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | "PENDING" | "APPROVED" | "REJECTED">("");

  const range = useCustom && customFrom && customTo
    ? { from: new Date(customFrom + "T00:00:00").toISOString(), to: new Date(customTo + "T23:59:59.999").toISOString() }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetAllLeavesQuery({
    limit: 500,
    ...(statusFilter ? { status: statusFilter } : {}),
  });
  const allLeaves = data?.data ?? [];

  const leaves = allLeaves.filter((l) => {
    const d = new Date(l.createdAt);
    return d >= new Date(range.from) && d <= new Date(range.to);
  });

  const totalPages = Math.max(1, Math.ceil(leaves.length / PAGE_SIZE));
  const paginated  = leaves.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pending  = leaves.filter((l) => l.status === "PENDING").length;
  const approved = leaves.filter((l) => l.status === "APPROVED").length;
  const rejected = leaves.filter((l) => l.status === "REJECTED").length;
  const totalDays = leaves.reduce((s, l) => {
    const days = Math.max(1, Math.round((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return s + days;
  }, 0);

  const byType: Record<string, number> = {};
  leaves.forEach((l) => { byType[l.type] = (byType[l.type] ?? 0) + 1; });

  const leaveTypeLabels: Record<string, string> = {
    ANNUAL: "Annual", SICK: "Sick", MATERNITY: "Maternity", PATERNITY: "Paternity",
    EMERGENCY: "Emergency", UNPAID: "Unpaid", OTHER: "Other",
  };

  const statusBadge: Record<string, string> = {
    PENDING:  "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  const getExportData = () => ({
    headers: ["Employee", "Role", "Leave Type", "Start Date", "End Date", "Days", "Status", "Reason"],
    rows: leaves.map((l) => {
      const days = Math.max(1, Math.round((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return [
        l.user?.name ?? "—",
        l.user?.role ?? "—",
        leaveTypeLabels[l.type] ?? l.type,
        new Date(l.startDate).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
        new Date(l.endDate).toLocaleDateString("en-RW",   { day: "2-digit", month: "short", year: "numeric" }),
        String(days),
        l.status,
        l.reason.slice(0, 60),
      ];
    }),
    summary: [
      { label: `Total Requests: ${leaves.length}`, value: "" },
      { label: "Pending",       value: String(pending) },
      { label: "Approved",      value: String(approved) },
      { label: "Rejected",      value: String(rejected) },
      { label: "TOTAL DAYS OFF", value: String(totalDays), bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineCalendar} title="Leave Requests" color="bg-purple-100 text-purple-600">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
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
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="DAF Leave Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={leaves.length} />
        <StatCard label="Pending"        value={pending}  color="text-yellow-600" />
        <StatCard label="Approved"       value={approved} color="text-emerald-600" />
        <StatCard label="Rejected"       value={rejected} color="text-red-600" />
      </div>

      {/* By type badges */}
      {Object.keys(byType).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byType).map(([type, count]) => (
            <div key={type} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-100 text-purple-700">
              {leaveTypeLabels[type] ?? type}: {count}
            </div>
          ))}
          <div className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-custom-100 text-custom-700">
            Total days: {totalDays}
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Employee", "Role", "Type", "Period", "Days", "Status", "Submitted"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No leave requests in this period</td></tr>
              ) : paginated.map((l) => {
                const days = Math.max(1, Math.round((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
                return (
                  <tr key={l.id} className="hover:bg-custom-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-secondary-100">{l.user?.name ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-custom-700 capitalize">{l.user?.role?.replace("_", " ") ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {leaveTypeLabels[l.type] ?? l.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-secondary-100">
                      {new Date(l.startDate).toLocaleDateString("en-RW", { day: "2-digit", month: "short" })}
                      {" → "}
                      {new Date(l.endDate).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">{days}d</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge[l.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">
                      {new Date(l.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {leaves.length > 0 && (
        <div className="flex justify-end mt-1">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Requests", value: String(leaves.length), cls: "text-secondary-100" },
              { label: "Approved",       value: String(approved),      cls: "text-emerald-600" },
              { label: "Pending",        value: String(pending),       cls: "text-yellow-600" },
              { label: "Total Days Off", value: `${totalDays}d`,       cls: "text-purple-600" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`font-bold text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {leaves.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, leaves.length)} of {leaves.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Casual Workers Report ────────────────────────────────────────────────────

function CasualWorkersReport() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: new Date(customFrom + "T00:00:00").toISOString(), to: new Date(customTo + "T23:59:59.999").toISOString() }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetCasualWorkersQuery({ limit: 500 });
  const allWorkers = data?.data ?? [];

  const workers = allWorkers.filter((w) => {
    const d = new Date(w.startDate);
    return d >= new Date(range.from) && d <= new Date(range.to);
  });

  const totalPages   = Math.max(1, Math.ceil(workers.length / PAGE_SIZE));
  const paginated    = workers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalDays    = workers.reduce((s, w) => s + Number(w.daysWorked), 0);
  const totalAmount  = workers.reduce((s, w) => s + Number(w.totalAmount), 0);
  const avgDailyRate = workers.length > 0
    ? Math.round(workers.reduce((s, w) => s + Number(w.dailyRate), 0) / workers.length)
    : 0;

  const getExportData = () => ({
    headers: ["Full Name", "Phone", "Job Done", "Start Date", "End Date", "Days", "Daily Rate (RWF)", "Total (RWF)", "Notes"],
    rows: workers.map((w) => [
      w.fullName,
      w.phoneNumber ?? "—",
      w.jobDone,
      w.startDate?.slice(0, 10) ?? "—",
      w.endDate?.slice(0, 10) ?? "—",
      String(w.daysWorked),
      Number(w.dailyRate).toLocaleString(),
      Number(w.totalAmount).toLocaleString(),
      w.notes ?? "—",
    ]),
    summary: [
      { label: `Total Workers: ${workers.length}`, value: "" },
      { label: "Total Days Worked", value: String(totalDays) },
      { label: "Avg Daily Rate",    value: `${avgDailyRate.toLocaleString()} RWF` },
      { label: "TOTAL AMOUNT PAID", value: `${totalAmount.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineUserGroup} title="Casual Workers (Abanyabiraka)" color="bg-orange-100 text-orange-600">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto flex-wrap">
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
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="DAF Casual Workers Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Workers"  value={workers.length} />
        <StatCard label="Total Days"     value={totalDays}      color="text-orange-600" />
        <StatCard label="Avg Daily Rate" value={`${avgDailyRate.toLocaleString()} RWF`} color="text-blue-600" />
        <StatCard label="Total Amount"   value={`${totalAmount.toLocaleString()} RWF`}  color="text-emerald-600" />
      </div>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Full Name", "Phone", "Job Done", "Start", "End", "Days", "Daily Rate", "Total"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : workers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No casual workers in this period</td></tr>
              ) : paginated.map((w) => (
                <tr key={w.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{w.fullName}</p>
                    {w.notes && <p className="text-xs text-custom-700 truncate max-w-[160px]">{w.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{w.phoneNumber ?? <span className="text-custom-400">—</span>}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{w.jobDone}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700 whitespace-nowrap">{w.startDate?.slice(0, 10)}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700 whitespace-nowrap">{w.endDate?.slice(0, 10)}</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-orange-600 text-center">{w.daysWorked}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{Number(w.dailyRate).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-emerald-600">{Number(w.totalAmount).toLocaleString()} RWF</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {workers.length > 0 && (
        <div className="flex justify-end mt-1">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Workers",     value: String(workers.length),                cls: "text-secondary-100" },
              { label: "Total Days Worked", value: String(totalDays),                     cls: "text-orange-600" },
              { label: "Avg Daily Rate",    value: `${avgDailyRate.toLocaleString()} RWF`, cls: "text-blue-600" },
              { label: "TOTAL AMOUNT",      value: `${totalAmount.toLocaleString()} RWF`,  cls: "text-emerald-600" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`font-bold text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {workers.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, workers.length)} of {workers.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"}`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab =
  | "job-approval"
  | "procurement"
  | "employees"
  | "payroll"
  | "leave"
  | "casual";

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "job-approval",  label: "Job Approval",      icon: HiOutlineBriefcase      },
  { value: "procurement",   label: "Procurement",       icon: HiOutlineChartBar       },
  { value: "employees",     label: "Employees",         icon: HiOutlineUsers          },
  { value: "payroll",       label: "Payroll",           icon: HiOutlineCurrencyDollar },
  { value: "leave",         label: "Leave",             icon: HiOutlineCalendar       },
  { value: "casual",        label: "Casual Workers",    icon: HiOutlineUserGroup      },
];

export default function DAFReportsPage() {
  const { userName } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("job-approval");

  return (
    <DashboardLayout userRole="daf" userName={userName ?? "DAF"}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineChartBar className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">DAF Reports</h1>
          </div>
          <p className="text-sm text-custom-700">
            Job approvals, procurement pipeline, employees, payroll, leave and casual workers — filter by period or stage
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 bg-custom-100 p-1 rounded-xl w-fit">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setActiveTab(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === value
                  ? "bg-primary-500 text-white shadow-sm"
                  : "text-custom-700 hover:text-secondary-100"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "job-approval" && <JobApprovalReport />}
        {activeTab === "procurement"  && <ProcurementReport />}
        {activeTab === "employees"    && <EmployeesReport />}
        {activeTab === "payroll"      && <PayrollReport />}
        {activeTab === "leave"        && <LeaveReport />}
        {activeTab === "casual"       && <CasualWorkersReport />}

      </div>
    </DashboardLayout>
  );
}
