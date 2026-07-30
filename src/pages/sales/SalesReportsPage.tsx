import { useState } from "react";
import {
  HiOutlineBriefcase,
  HiOutlineChartBar,
  HiOutlineDocumentDownload,
  HiOutlineDocumentText,
  HiOutlineRefresh,
  HiOutlineUsers,
} from "react-icons/hi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import { useGetJobsQuery } from "../../store/services/jobsService";
import { useGetCustomersQuery } from "../../store/services/customersService";
import { useGetProformasQuery } from "../../store/services/proformasService";
import { GenerateReportModal } from "../../components";
import {
  useGetLeadsQuery,
  useGetProcurementStatsQuery,
  type MarketStage,
  type MarketSector,
} from "../../store/services/procurementService";
import { useAuth } from "../../context/AuthContext";

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
  pdf.text(COMPANY.address, c1, fy + 5);  pdf.text(COMPANY.tin,   c1, fy + 10);
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

// ─── Shared sub-components ────────────────────────────────────────────────────

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

// ─── Tab 1: Jobs Report ───────────────────────────────────────────────────────

const jobStatusColor: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  rejected:  "bg-red-100 text-red-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-700",
};

function JobsReport() {
  const [period, setPeriod]         = useState<Period>("month");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: new Date(customFrom + "T00:00:00").toISOString(), to: new Date(customTo + "T23:59:59.999").toISOString() }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetJobsQuery({ limit: 500 });
  const allJobs = data?.jobs ?? [];

  const jobs = allJobs.filter((j) => {
    const d = new Date(j.createdAt);
    return d >= new Date(range.from) && d <= new Date(range.to);
  });

  const totalPages    = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const paginated     = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalValue    = jobs.reduce((s, j) => s + (Number(j.amount) || 0), 0);
  const paidCount     = jobs.filter((j) => j.paymentStatus === "paid").length;
  const pendingCount  = jobs.filter((j) => j.status === "pending").length;
  const confirmedCount = jobs.filter((j) => j.status === "confirmed").length;

  const getExportData = () => ({
    headers: ["Job #", "Title", "Customer", "Type", "Amount (RWF)", "Status", "Payment", "Created"],
    rows: jobs.map((j) => [
      `#${j.jobNumber}`, j.title, j.customer?.name ?? "", j.jobType ?? "",
      (Number(j.amount) || 0).toLocaleString(), j.status,
      j.paymentStatus === "paid" ? "Paid" : "Unpaid",
      new Date(j.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "Total Jobs",    value: String(jobs.length) },
      { label: "Confirmed",     value: String(confirmedCount) },
      { label: "Pending",       value: String(pendingCount) },
      { label: "Paid",          value: String(paidCount) },
      { label: "TOTAL VALUE",   value: `${totalValue.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineBriefcase} title="Jobs Overview" color="bg-blue-100 text-blue-600">
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
          <PdfButtons title="Sales Jobs Report" getExportData={getExportData} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Total Jobs"    value={jobs.length} />
        <StatCard label="Total Value"   value={`${totalValue.toLocaleString()} RWF`} color="text-primary-500" />
        <StatCard label="Confirmed"     value={confirmedCount} color="text-blue-600" />
        <StatCard label="Pending"       value={pendingCount}   color="text-yellow-600" />
        <StatCard label="Paid"          value={paidCount}
          sub={jobs.length - paidCount > 0 ? `${jobs.length - paidCount} unpaid` : undefined}
          color="text-emerald-600" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Job #", "Title & Client", "Type", "Amount", "Status", "Payment", "Created"].map((h) => (
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
                  <td className="px-3 py-2.5 text-xs text-custom-700">{j.jobType ?? "—"}</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">
                    {j.amount != null ? `${(Number(j.amount) || 0).toLocaleString()} RWF` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${jobStatusColor[j.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${j.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {j.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </span>
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

// ─── Tab 2: Proformas Report ─────────────────────────────────────────────────

const qStatusColor: Record<string, string> = {
  draft:    "bg-gray-100 text-gray-700",
  sent:     "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired:  "bg-orange-100 text-orange-700",
};

function QuotationsReport() {
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useGetProformasQuery({ limit: 200 });
  const quotations = data?.proformas ?? [];
  const totalPages = Math.max(1, Math.ceil(quotations.length / PAGE_SIZE));
  const paginated  = quotations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const accepted = quotations.filter((q) => q.status === "accepted");
  const sent     = quotations.filter((q) => q.status === "sent").length;
  const draft    = quotations.filter((q) => q.status === "draft").length;
  const acceptedValue = accepted.reduce((s, q) => s + (Number(q.totalAmount) || 0), 0);

  const getExportData = () => ({
    headers: ["Proforma #", "Customer", "Job", "Est. Amount (RWF)", "Status", "Valid Until", "Created"],
    rows: quotations.map((q) => {
      const customer = q.customer ?? q.job?.customer;
      return [
        q.proformaNo,
        customer?.name ?? "",
        q.job?.jobNumber ? `#${q.job.jobNumber}` : "",
        (Number(q.totalAmount) || 0).toLocaleString(),
        q.status,
        q.validUntil ? q.validUntil.slice(0, 10) : "",
        new Date(q.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
      ];
    }),
    summary: [
      { label: "Total Proformas", value: String(quotations.length) },
      { label: "Sent",             value: String(sent) },
      { label: "Draft",            value: String(draft) },
      { label: "Accepted",         value: String(accepted.length) },
      { label: "ACCEPTED VALUE",   value: `${acceptedValue.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineDocumentText} title="Proformas" color="bg-indigo-100 text-indigo-600">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1" />
        <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100">
          <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
        </button>
        <PdfButtons title="Sales Proformas Report" getExportData={getExportData} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total"          value={quotations.length} />
        <StatCard label="Sent"           value={sent}             color="text-blue-600" />
        <StatCard label="Accepted"       value={accepted.length}  color="text-emerald-600" />
        <StatCard label="Accepted Value" value={`${acceptedValue.toLocaleString()} RWF`} color="text-primary-500" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Proforma #", "Customer", "Job", "Est. Amount", "Status", "Valid Until", "Created"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No proformas found</td></tr>
              ) : paginated.map((q) => {
                const customer = q.customer ?? q.job?.customer;
                return (
                  <tr key={q.id} className="hover:bg-custom-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">{q.proformaNo}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm text-secondary-100">{customer?.name ?? <span className="text-custom-400">—</span>}</p>
                      {customer?.phone && <p className="text-xs text-custom-700">{customer.phone}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-primary-500 font-mono">
                      {q.job?.jobNumber ? `#${q.job.jobNumber}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">
                      {(Number(q.totalAmount) || 0).toLocaleString()} RWF
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${qStatusColor[q.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">
                      {q.validUntil ? q.validUntil.slice(0, 10) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">
                      {new Date(q.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {quotations.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, quotations.length)} of {quotations.length}</p>
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

// ─── Tab 3: Market Report ─────────────────────────────────────────────────────

const stageColor: Record<MarketStage, string> = {
  prospect:    "bg-gray-100 text-gray-700",
  contacted:   "bg-blue-100 text-blue-700",
  negotiating: "bg-yellow-100 text-yellow-700",
  won:         "bg-emerald-100 text-emerald-700",
  lost:        "bg-red-100 text-red-700",
};

const stageLabel: Record<MarketStage, string> = {
  prospect: "Prospect", contacted: "Contacted",
  negotiating: "Negotiating", won: "Won", lost: "Lost",
};

const sectorLabel: Record<MarketSector, string> = {
  printing: "Printing", publishing: "Publishing", education: "Education",
  government: "Government", ngo: "NGO / Non-profit", corporate: "Corporate",
  retail: "Retail", other: "Other",
};

function MarketReport() {
  const [page, setPage] = useState(1);
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useGetProcurementStatsQuery();
  const { data: leadsData, isLoading: loadingLeads, refetch: refetchLeads } = useGetLeadsQuery({ limit: 500 });

  const leads    = leadsData?.leads ?? [];
  const pipeline = stats?.pipeline ?? [];
  const kpi      = stats?.kpi;

  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const paginated  = leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const wonValue   = kpi?.wonValue ?? 0;
  const totalValue = leads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);

  const getExportData = () => ({
    headers: ["Company", "Contact Person", "Phone", "Sector", "Stage", "Est. Value (RWF)", "Location", "Next Follow-up"],
    rows: leads.map((l) => [
      l.company,
      l.contactPerson,
      l.phone ?? "",
      sectorLabel[l.sector],
      stageLabel[l.stage],
      (l.estimatedValue ?? 0) > 0 ? (l.estimatedValue!).toLocaleString() : "",
      l.location ?? "",
      l.nextFollowUp ? l.nextFollowUp.slice(0, 10) : "",
    ]),
    summary: [
      { label: "Total Leads",      value: String(leads.length) },
      { label: "Won",              value: String(kpi?.wonCount ?? 0) },
      { label: "In Progress",      value: String(kpi?.inProgress ?? 0) },
      { label: "Overdue Follow-ups", value: String(kpi?.overdueFollowUps ?? 0) },
      { label: "Total Pipeline Value", value: `${totalValue.toLocaleString()} RWF` },
      { label: "WON VALUE",        value: `${wonValue.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineBriefcase} title="Market & Pipeline" color="bg-emerald-100 text-emerald-600">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1" />
        <button onClick={() => { refetchLeads(); refetchStats(); }} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100">
          <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${loadingLeads ? "animate-spin" : ""}`} />
        </button>
        <PdfButtons title="Market Pipeline Report" getExportData={getExportData} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Total Leads"      value={loadingStats ? "…" : kpi?.totalLeads ?? 0} />
        <StatCard label="In Progress"      value={loadingStats ? "…" : kpi?.inProgress ?? 0}  color="text-yellow-600" />
        <StatCard label="Won"              value={loadingStats ? "…" : kpi?.wonCount ?? 0}     color="text-emerald-600" />
        <StatCard label="Overdue"          value={loadingStats ? "…" : kpi?.overdueFollowUps ?? 0} color="text-red-500" />
        <StatCard label="Won Value"        value={loadingStats ? "…" : `${(wonValue >= 1_000_000 ? (wonValue / 1_000_000).toFixed(1) + "M" : wonValue.toLocaleString())} RWF`} color="text-primary-500" />
      </div>

      {/* Pipeline breakdown */}
      {!loadingStats && pipeline.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {pipeline.map(({ stage, count, totalValue: tv }) => (
            <div key={stage} className={`flex-1 min-w-[90px] p-3 rounded-xl border ${stageColor[stage].replace("text-", "border-").split(" ")[0]} ${stageColor[stage].split(" ")[0]}`}>
              <p className={`text-xs font-bold ${stageColor[stage].split(" ")[1]}`}>{stageLabel[stage]}</p>
              <p className={`text-2xl font-bold ${stageColor[stage].split(" ")[1]} mt-1`}>{count}</p>
              {tv > 0 && <p className={`text-xs ${stageColor[stage].split(" ")[1]} opacity-70`}>{tv >= 1_000_000 ? `${(tv / 1_000_000).toFixed(1)}M` : tv.toLocaleString()} RWF</p>}
            </div>
          ))}
        </div>
      )}

      {/* Leads table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Company", "Contact", "Sector", "Stage", "Est. Value", "Location", "Follow-up"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {loadingLeads ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No leads found</td></tr>
              ) : paginated.map((l) => {
                const isOverdue = l.nextFollowUp && new Date(l.nextFollowUp) < new Date() && l.stage !== "won" && l.stage !== "lost";
                return (
                  <tr key={l.id} className="hover:bg-custom-50 transition-colors">
                    <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">{l.company}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm text-secondary-100">{l.contactPerson}</p>
                      {l.phone && <p className="text-xs text-custom-700">{l.phone}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">{sectorLabel[l.sector]}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stageColor[l.stage]}`}>{stageLabel[l.stage]}</span>
                    </td>
                    <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">
                      {(l.estimatedValue ?? 0) > 0 ? `${l.estimatedValue!.toLocaleString()} RWF` : <span className="text-custom-400 font-normal">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-custom-700">{l.location ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {l.nextFollowUp
                        ? <span className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-secondary-100"}`}>{l.nextFollowUp.slice(0, 10)}{isOverdue ? " ⚠" : ""}</span>
                        : <span className="text-custom-400 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {leads.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, leads.length)} of {leads.length}</p>
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

// ─── Tab 4: Customers Report ──────────────────────────────────────────────────

function CustomersReport() {
  const [period, setPeriod]         = useState<Period>("month");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: new Date(customFrom + "T00:00:00").toISOString(), to: new Date(customTo + "T23:59:59.999").toISOString() }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetCustomersQuery({ limit: 500 });
  const allCustomers = data?.customers ?? [];

  const customers = allCustomers.filter((c) => {
    const d = new Date(c.createdAt);
    return d >= new Date(range.from) && d <= new Date(range.to);
  });

  // Only BUSINESS type for sales
  const business = customers.filter((c) => c.type === "BUSINESS");
  const totalPages = Math.max(1, Math.ceil(business.length / PAGE_SIZE));
  const paginated  = business.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getExportData = () => ({
    headers: ["Name", "Phone", "Email", "Company", "Address", "Registered"],
    rows: business.map((c) => [
      c.name, c.phone ?? "", c.email ?? "", c.company ?? "", c.address ?? "",
      new Date(c.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "New Business Customers", value: String(business.length), bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineUsers} title="Customers" color="bg-purple-100 text-purple-600">
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
          <PdfButtons title="Sales Customers Report" getExportData={getExportData} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="New Business Clients" value={business.length} color="text-purple-600" />
        <StatCard label="Total Registered"     value={customers.length} />
        <StatCard label="With Company"         value={business.filter((c) => c.company).length} />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Name", "Phone", "Email", "Company", "Address", "Registered"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : business.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700 text-sm">No customers in this period</td></tr>
              ) : paginated.map((c) => (
                <tr key={c.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-sm font-semibold text-secondary-100">{c.name}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{c.phone ?? <span className="text-custom-400">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">{c.email ?? <span className="text-custom-400">—</span>}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{c.company ?? <span className="text-custom-400">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">{c.address ?? <span className="text-custom-400">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {new Date(c.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {business.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, business.length)} of {business.length}</p>
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

type Tab = "jobs" | "quotations" | "customers" | "market" | "my-reports";

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "jobs",       label: "Jobs",       icon: HiOutlineBriefcase },
  { value: "quotations", label: "Quotations", icon: HiOutlineDocumentText },
  { value: "customers",  label: "Customers",  icon: HiOutlineUsers },
  { value: "market",     label: "Market",     icon: HiOutlineChartBar },
];

export default function SalesReportsPage() {
  const { userRole, userName } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("jobs");

  return (
    <DashboardLayout userRole={userRole ?? "sales"} userName={userName ?? "Sales Officer"} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineChartBar className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Sales Reports</h1>
          </div>
          <p className="text-sm text-custom-700">
            Track jobs, quotations, and customers  filter by day, week, month or year
          </p>
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

        {activeTab === "jobs"       && <JobsReport />}
        {activeTab === "quotations" && <QuotationsReport />}
        {activeTab === "customers"  && <CustomersReport />}
        {activeTab === "market"     && <MarketReport />}

      </div>
    </DashboardLayout>
  );
}
