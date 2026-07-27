
import { useState } from "react";
import {
  HiOutlineCash,
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentDownload,
  HiOutlineRefresh,
} from "react-icons/hi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import { useGetPaymentsQuery } from "../../store/services/paymentsService";
// import { useGetInvoicesQuery } from "../../store/services/invoicesService";
import { useGetRecoveryRecordsQuery, useGetDebtsQuery } from "../../store/services/recoveryService";
import { GenerateReportModal } from "../../components";
import { useAuth } from "../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";

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

// ─── PDF helpers ──────────────────────────────────────────────────────────────

const COMPANY = {
  address: "B.P. 863 Kigali - Rwanda",
  tin:     "TIN / T.V.A.: NO 100021520",
  tel:     "Tel: Reception (+250) 788 313 617 / (+250) 788 304 549",
  rc:      "No. RC: 536 / 09 / NYR",
  email:   "E-mail: pallottipresse@yahoo.com",
  compte:  "Compte: BK: 10000017 4372",
  motto:   "Rapidite - Qualite - Innovation - Esprit d'Equipe",
};

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

const HEADER_H   = 35;
const FOOTER_TOP = 26;

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
  const row1 = fy + 5, row2 = fy + 10;
  pdf.text(COMPANY.address, col1, row1); pdf.text(COMPANY.tin, col1, row2);
  pdf.text(COMPANY.tel, col2, row1, { align: "center" }); pdf.text(COMPANY.rc, col2, row2, { align: "center" });
  pdf.text(COMPANY.email, col3, row1, { align: "right" }); pdf.text(COMPANY.compte, col3, row2, { align: "right" });
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(7); pdf.setTextColor(0, 160, 210);
  pdf.text(COMPANY.motto, col2, fy + 16, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(150, 150, 150);
  pdf.text(`Page ${pageNum} of ${totalPages}`, pw - 10, fy + 16, { align: "right" });
}

const TABLE_START_Y = HEADER_H + 23;
const BOTTOM_MARGIN = FOOTER_TOP + 6;

type SummaryRow = { label: string; value: string; bold?: boolean };

async function buildPdf(title: string, headers: string[], rows: (string | null)[][], summary: SummaryRow[]) {
  const headerBase64 = await loadImageAsBase64("/header.png").catch(() => null);
  const subtitle     = `Generated: ${new Date().toLocaleString("en-RW")}`;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw  = pdf.internal.pageSize.getWidth();
  drawLetterhead(pdf, headerBase64, title, subtitle);
  autoTable(pdf, {
    head: [headers], body: rows,
    startY: TABLE_START_Y,
    margin: { top: 10, left: 10, right: 10, bottom: BOTTOM_MARGIN },
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [0, 160, 210], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 251, 255] },
    didDrawPage: (data: { pageNumber: number }) => {
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
      pdf.text(label, col1, sy); pdf.text(value, col2, sy, { align: "right" });
      sy += 6;
    });
    pdf.setDrawColor(0, 160, 210); pdf.line(col1, sy, col2, sy);
  }
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) { pdf.setPage(i); drawFooter(pdf, i, totalPages); }
  pdf.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function PdfButtons({ title, getExportData }: {
  title: string;
  getExportData: () => { headers: string[]; rows: (string | null)[][]; summary: SummaryRow[] };
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

function Paginator({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (n: number) => void }) {
  if (total <= PAGE_SIZE) return null;

  // Build page list with ellipsis
  const pages: (number | "...")[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  add(1);
  if (page - 2 > 2) pages.push("...");
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
  if (page + 2 < totalPages - 1) pages.push("...");
  if (totalPages > 1) add(totalPages);

  return (
    <div className="flex items-center justify-between mt-1">
      <p className="text-xs text-custom-700">
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
        {pages.map((n, i) =>
          n === "..." ? (
            <span key={`e-${i}`} className="px-1 text-custom-700 text-xs select-none">…</span>
          ) : (
            <button key={n} onClick={() => onPage(n as number)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"}`}>
              {n}
            </button>
          )
        )}
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
      </div>
    </div>
  );
}

// ─── Payments Report ──────────────────────────────────────────────────────────

const pmColors: Record<string, string> = {
  CASH:          "bg-emerald-100 text-emerald-700",
  MOBILE_MONEY:  "bg-yellow-100 text-yellow-700",
  BANK_TRANSFER: "bg-blue-100 text-blue-700",
  CARD:          "bg-purple-100 text-purple-700",
};

function PaymentsReport() {
  const [period, setPeriod]         = useState<Period>("month");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);
  const [methodFilter, setMethodFilter] = useState("");

  const range = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo + "T23:59:59.000Z" }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetPaymentsQuery({ from: range.from, to: range.to, limit: 500 });
  const allPayments = data?.payments ?? [];

  const payments = methodFilter
    ? allPayments.filter((p) => p.paymentMethod === methodFilter)
    : allPayments;

  const totalPages  = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const paginated   = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalCollected = payments.reduce((s, p) => s + Number(p.amountPaid), 0);
  const fullCount      = payments.filter((p) => p.paymentState === "FULL").length;
  const partialCount   = payments.filter((p) => p.paymentState === "PARTIAL").length;
  const totalBalance   = payments.reduce((s, p) => s + Number(p.balance ?? 0), 0);

  const byMethod: Record<string, number> = {};
  payments.forEach((p) => {
    const m = p.paymentMethod ?? "UNKNOWN";
    byMethod[m] = (byMethod[m] ?? 0) + Number(p.amountPaid);
  });

  const getExportData = () => ({
    headers: ["Receipt #", "Job #", "Customer", "Amount Paid (RWF)", "Balance (RWF)", "Type", "Method", "Date"],
    rows: payments.map((p) => [
      p.receiptNo,
      p.job?.jobNumber ?? "—",
      p.job?.customer?.name ?? "—",
      Number(p.amountPaid).toLocaleString(),
      Number(p.balance ?? 0).toLocaleString(),
      p.paymentState,
      p.paymentMethod ?? "—",
      new Date(p.paidAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: `Total Transactions: ${payments.length}`, value: "" },
      { label: "Full Payments",    value: String(fullCount) },
      { label: "Partial Payments", value: String(partialCount) },
      { label: "Outstanding Balance", value: `${totalBalance.toLocaleString()} RWF` },
      { label: "TOTAL COLLECTED",   value: `${totalCollected.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineCash} title="Payments Collected" color="bg-emerald-100 text-emerald-600">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All methods</option>
            <option value="CASH">Cash</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CARD">Card</option>
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
          <PdfButtons title="Accountant Payments Report" getExportData={getExportData} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Transactions"    value={payments.length} />
        <StatCard label="Total Collected" value={`${totalCollected.toLocaleString()} RWF`} color="text-emerald-600" />
        <StatCard label="Full Payments"   value={fullCount}    color="text-blue-600" />
        <StatCard label="Partial"         value={partialCount} color="text-orange-600"
          sub={totalBalance > 0 ? `Balance: ${totalBalance.toLocaleString()} RWF` : undefined} />
      </div>

      {Object.keys(byMethod).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byMethod).map(([m, amt]) => (
            <div key={m} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${pmColors[m] ?? "bg-gray-100 text-gray-600"}`}>
              {m.replace(/_/g, " ")}: {amt.toLocaleString()} RWF
            </div>
          ))}
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Receipt #", "Job #", "Customer", "Amount Paid", "Balance", "Type", "Method", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No payments in this period</td></tr>
              ) : paginated.map((p) => (
                <tr key={p.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-600">{p.receiptNo}</td>
                  <td className="px-3 py-2.5 text-sm font-semibold text-secondary-100">{p.job?.jobNumber ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{p.job?.customer?.name ?? "—"}</p>
                    {p.job?.customer?.phone && <p className="text-xs text-custom-700">{p.job.customer.phone}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-bold text-emerald-600">{Number(p.amountPaid).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">
                    {Number(p.balance ?? 0) > 0
                      ? <span className="text-orange-600 font-bold">{Number(p.balance).toLocaleString()} RWF</span>
                      : <span className="text-custom-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.paymentState === "FULL" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                      {p.paymentState ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pmColors[p.paymentMethod ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.paymentMethod?.replace(/_/g, " ") ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700 whitespace-nowrap">
                    {new Date(p.paidAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {payments.length > 0 && (
        <div className="flex justify-end mt-1">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Transactions", value: String(payments.length),             cls: "text-secondary-100" },
              { label: "Amount Collected",   value: `${totalCollected.toLocaleString()} RWF`, cls: "text-emerald-600" },
              { label: "Outstanding Balance",value: `${totalBalance.toLocaleString()} RWF`,   cls: totalBalance > 0 ? "text-orange-600" : "text-secondary-100" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`font-bold text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Paginator page={page} totalPages={totalPages} total={payments.length} onPage={setPage} />
    </Section>
  );
}

// ─── Invoices Report ──────────────────────────────────────────────────────────

// function InvoicesReport() {
//   const [page, setPage]           = useState(1);
//   const [statusFilter, setStatusFilter] = useState<"" | "paid" | "cancelled" | "draft" | "issued">("");

//   const { data, isLoading, refetch } = useGetInvoicesQuery(
//     statusFilter ? { status: statusFilter as any, limit: 500 } : { limit: 500 }
//   );
//   const invoices = data?.invoices ?? [];

//   const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
//   const paginated  = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

//   const totalAmount = invoices.reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
//   const paidCount   = invoices.filter((i) => i.status === "paid").length;
//   const cancelCount = invoices.filter((i) => i.status === "cancelled").length;

//   const statusBadge: Record<string, string> = {
//     paid:      "bg-emerald-100 text-emerald-700",
//     cancelled: "bg-red-100 text-red-700",
//     draft:     "bg-gray-100 text-gray-600",
//     issued:    "bg-blue-100 text-blue-700",
//   };

//   const getExportData = () => ({
//     headers: ["Invoice #", "Job #", "Customer", "Total (RWF)", "Status", "Due Date", "Created"],
//     rows: invoices.map((i) => [
//       i.invoiceNo,
//       i.job?.jobNumber ?? "—",
//       i.job?.customer?.name ?? i.customer?.name ?? "—",
//       Number(i.totalAmount ?? 0).toLocaleString(),
//       i.status,
//       i.dueDate?.slice(0, 10) ?? "—",
//       i.createdAt.slice(0, 10),
//     ]),
//     summary: [
//       { label: `Total Invoices: ${invoices.length}`, value: "" },
//       { label: "Paid",      value: String(paidCount) },
//       { label: "Cancelled", value: String(cancelCount) },
//       { label: "TOTAL AMOUNT", value: `${totalAmount.toLocaleString()} RWF`, bold: true },
//     ] as SummaryRow[],
//   });

//   return (
//     <Section icon={HiOutlineDocumentText} title="Invoices" color="bg-blue-100 text-blue-600">
//       <div className="flex flex-wrap items-center gap-3">
//         <div className="flex items-center gap-2 ml-auto flex-wrap">
//           <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
//             className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
//             <option value="">All statuses</option>
//             <option value="paid">Paid</option>
//             <option value="issued">Issued</option>
//             <option value="draft">Draft</option>
//             <option value="cancelled">Cancelled</option>
//           </select>
//           <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
//             <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
//           </button>
//           <PdfButtons title="Accountant Invoices Report" getExportData={getExportData} />
//         </div>
//       </div>

//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//         <StatCard label="Total Invoices" value={invoices.length} />
//         <StatCard label="Paid"           value={paidCount}   color="text-emerald-600" />
//         <StatCard label="Cancelled"      value={cancelCount} color="text-red-600" />
//         <StatCard label="Total Amount"   value={`${totalAmount.toLocaleString()} RWF`} color="text-primary-600" />
//       </div>

//       <Card className="!p-0 overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead className="bg-custom-100 border-b border-custom-300">
//               <tr>
//                 {["Invoice #", "Job #", "Customer", "Total", "Status", "Due Date", "Created"].map((h) => (
//                   <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-custom-200">
//               {isLoading ? (
//                 <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
//               ) : invoices.length === 0 ? (
//                 <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No invoices found</td></tr>
//               ) : paginated.map((i) => (
//                 <tr key={i.id} className="hover:bg-custom-50 transition-colors">
//                   <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-600">{i.invoiceNo}</td>
//                   <td className="px-3 py-2.5 text-sm font-semibold text-secondary-100">{i.job?.jobNumber ?? "—"}</td>
//                   <td className="px-3 py-2.5">
//                     <p className="text-sm font-semibold text-secondary-100">{i.job?.customer?.name ?? i.customer?.name ?? "—"}</p>
//                     {(i.job?.customer?.phone ?? i.customer?.phone) && (
//                       <p className="text-xs text-custom-700">{i.job?.customer?.phone ?? i.customer?.phone}</p>
//                     )}
//                   </td>
//                   <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">
//                     {Number(i.totalAmount ?? 0).toLocaleString()} RWF
//                   </td>
//                   <td className="px-3 py-2.5">
//                     <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge[i.status] ?? "bg-gray-100 text-gray-600"}`}>
//                       {i.status}
//                     </span>
//                   </td>
//                   <td className="px-3 py-2.5 text-xs text-custom-700">{i.dueDate?.slice(0, 10) ?? "—"}</td>
//                   <td className="px-3 py-2.5 text-xs text-custom-700">{i.createdAt.slice(0, 10)}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </Card>

//       {invoices.length > 0 && (
//         <div className="flex justify-end mt-1">
//           <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
//             <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
//             {[
//               { label: "Total Invoices", value: String(invoices.length), cls: "text-secondary-100" },
//               { label: "Paid",           value: String(paidCount),       cls: "text-emerald-600" },
//               { label: "Cancelled",      value: String(cancelCount),     cls: "text-red-500" },
//               { label: "Total Amount",   value: `${totalAmount.toLocaleString()} RWF`, cls: "text-primary-600" },
//             ].map(({ label, value, cls }) => (
//               <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
//                 <span className="text-custom-700 text-xs">{label}</span>
//                 <span className={`font-bold text-xs ${cls}`}>{value}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       <Paginator page={page} totalPages={totalPages} total={invoices.length} onPage={setPage} />
//     </Section>
//   );
// }

// ─── Debt Recovery Report ─────────────────────────────────────────────────────

function DebtRecoveryReport() {
  const [page, setPage] = useState(1);

  const { data: records = [], isLoading: loadingRecords, refetch } = useGetRecoveryRecordsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: debts = [], isLoading: loadingDebts } = useGetDebtsQuery(undefined, { refetchOnMountOrArgChange: true });
  const isLoading = loadingRecords || loadingDebts;

  const totalPages     = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const paginated      = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalRecovered = records.reduce((s, r) => s + Number(r.amountRecovered), 0);
  const totalOutstanding = debts.reduce((s, d) => s + Number(d.balanceDue), 0);
  const unpaidCount    = debts.filter((d) => d.debtType === "unpaid").length;
  const partialCount   = debts.filter((d) => d.debtType === "partial").length;

  const statusBadge: Record<string, string> = {
    recovered:   "bg-emerald-100 text-emerald-700",
    partial:     "bg-orange-100 text-orange-700",
    pending:     "bg-yellow-100 text-yellow-700",
    written_off: "bg-red-100 text-red-700",
  };

  const getExportData = () => ({
    headers: ["Job #", "Customer", "Amount Recovered (RWF)", "Method", "Status", "Note", "Date"],
    rows: records.map((r) => [
      r.job?.jobNumber ?? r.jobNumber ?? "—",
      r.customer?.name ?? r.job?.customer?.name ?? "—",
      Number(r.amountRecovered).toLocaleString(),
      r.paymentMethod.replace(/_/g, " "),
      r.status,
      r.note ?? "—",
      new Date(r.contactedAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: `Recovery Records: ${records.length}`, value: "" },
      { label: "Unpaid Debtors",      value: String(unpaidCount) },
      { label: "Partial Debtors",     value: String(partialCount) },
      { label: "Total Outstanding",   value: `${totalOutstanding.toLocaleString()} RWF` },
      { label: "TOTAL RECOVERED",     value: `${totalRecovered.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineCurrencyDollar} title="Debt Recovery" color="bg-red-100 text-red-600">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Accountant Debt Recovery Report" getExportData={getExportData} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Recovery Records"  value={records.length} />
        <StatCard label="Total Recovered"   value={`${totalRecovered.toLocaleString()} RWF`} color="text-emerald-600" />
        <StatCard label="Outstanding Debts" value={`${totalOutstanding.toLocaleString()} RWF`} color="text-red-600"
          sub={`${unpaidCount} unpaid · ${partialCount} partial`} />
        <StatCard label="Debtors"           value={debts.length} color="text-orange-600" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Job #", "Customer", "Amount Recovered", "Method", "Status", "Note", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No recovery records yet</td></tr>
              ) : paginated.map((r) => (
                <tr key={r.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">
                    #{r.job?.jobNumber ?? r.jobNumber ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{r.customer?.name ?? r.job?.customer?.name ?? "—"}</p>
                    {(r.customer?.phone ?? r.job?.customer?.phone) && (
                      <p className="text-xs text-custom-700">{r.customer?.phone ?? r.job?.customer?.phone}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-bold text-emerald-600">
                    {Number(r.amountRecovered).toLocaleString()} RWF
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pmColors[r.paymentMethod] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.paymentMethod.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {r.status === "written_off" ? "Written Off" : r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700 max-w-[140px] truncate">
                    {r.note ?? <span className="text-custom-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700 whitespace-nowrap">
                    {new Date(r.contactedAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {records.length > 0 && (
        <div className="flex justify-end mt-1">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Records",     value: String(records.length),              cls: "text-secondary-100" },
              { label: "Total Recovered",   value: `${totalRecovered.toLocaleString()} RWF`,   cls: "text-emerald-600" },
              { label: "Still Outstanding", value: `${totalOutstanding.toLocaleString()} RWF`, cls: "text-red-500" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`font-bold text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Paginator page={page} totalPages={totalPages} total={records.length} onPage={setPage} />
    </Section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "payments" | "invoices" | "recovery";

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "payments",  label: "Payments",      icon: HiOutlineCash },
  // { value: "invoices",  label: "Invoices",      icon: HiOutlineDocumentText },
  { value: "recovery",  label: "Debt Recovery", icon: HiOutlineCurrencyDollar },
];

export default function AccountantReportsPage() {
  const { userName } = useAuth();
  const [tab, setTab] = useState<Tab>("payments");

  return (
    <DashboardLayout userRole="accountant" userName={userName ?? "Accountant"} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">
        <div>
          <h1 className="text-3xl font-bold text-secondary-100">Accountant Reports</h1>
          <p className="mt-1 text-sm text-custom-700">
            Generate and export finance reports  payments, invoices, and debt recovery.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 bg-custom-100 p-1 rounded-xl w-fit">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setTab(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === value ? "bg-primary-500 text-white shadow-sm" : "text-custom-700 hover:text-secondary-100"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "payments" && <PaymentsReport />}
        {/* {tab === "invoices" && <InvoicesReport />} */}
        {tab === "recovery" && <DebtRecoveryReport />}
      </div>
    </DashboardLayout>
  );
}
