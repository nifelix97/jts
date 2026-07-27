import { useState } from "react";
import {
  HiOutlineChartBar,
  HiOutlineRefresh,
  HiOutlineDocumentDownload,
  HiOutlineCash,
  HiOutlineLibrary,
} from "react-icons/hi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import { useGetSalesQuery } from "../../store/services/boutiqueService";
import { useGetHobeSalesQuery } from "../../store/services/hobeService";
import { useGetPaymentsQuery } from "../../store/services/paymentsService";
import { useGetBoutiqueSalesQuery } from "../../store/services/boutiqueStockService";
import { useAuth } from "../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";
type Tab = "boutique" | "hobe" | "payments" | "boutique-stock";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = `${now.toISOString().split("T")[0]}T23:59:59.000Z`;
  let from: Date;
  switch (period) {
    case "day":   from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case "week":  from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); break;
    case "month": from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "year":  from = new Date(now.getFullYear(), 0, 1); break;
  }
  return { from: from.toISOString().split("T")[0], to };
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "day",   label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year",  label: "This Year" },
];

const PAGE_SIZE = 8;

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
  const row1 = fy + 5, row2 = fy + 10;
  pdf.text(COMPANY.address, col1, row1); pdf.text(COMPANY.tin, col1, row2);
  pdf.text(COMPANY.tel, col2, row1, { align: "center" }); pdf.text(COMPANY.rc, col2, row2, { align: "center" });
  pdf.text(COMPANY.email, col3, row1, { align: "right" }); pdf.text(COMPANY.compte, col3, row2, { align: "right" });
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(7); pdf.setTextColor(0, 160, 210);
  pdf.text(COMPANY.motto, col2, fy + 16, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(150, 150, 150);
  pdf.text(`Page ${pageNum} of ${totalPages}`, pw - 10, fy + 16, { align: "right" });
}

type SummaryRow = { label: string; value: string; bold?: boolean };

async function buildPdf(title: string, headers: string[], rows: string[][], summary: SummaryRow[]) {
  const headerBase64 = await loadImageAsBase64("/header.png").catch(() => null);
  const subtitle = `Generated: ${new Date().toLocaleString("en-RW")}`;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
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
  const handlePdf = () => {
    const { headers, rows, summary } = getExportData();
    buildPdf(title, headers, rows, summary).catch((err) => {
      console.error(err); alert("Failed to generate PDF");
    });
  };
  return (
    <button onClick={handlePdf}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
      <HiOutlineDocumentDownload className="w-4 h-4" /> PDF
    </button>
  );
}

function Pagination({ page, totalPages, total, onPage }: {
  page: number; totalPages: number; total: number; onPage: (n: number) => void;
}) {
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-between mt-1">
      <p className="text-xs text-custom-700">
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => onPage(n)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
              n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"
            }`}>{n}</button>
        ))}
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
      </div>
    </div>
  );
}

const pmColors: Record<string, string> = {
  CASH: "bg-emerald-100 text-emerald-700", cash: "bg-emerald-100 text-emerald-700",
  MOBILE_MONEY: "bg-yellow-100 text-yellow-700", mobile: "bg-yellow-100 text-yellow-700",
  BANK_TRANSFER: "bg-blue-100 text-blue-700", bank: "bg-blue-100 text-blue-700",
  CARD: "bg-purple-100 text-purple-700", card: "bg-purple-100 text-purple-700",
};

// ─── Boutique Sales Tab ───────────────────────────────────────────────────────

function BoutiqueSalesTab() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo + "T23:59:59.000Z" }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetSalesQuery({ from: range.from, to: range.to, limit: 500 });
  const sales = data?.sales ?? [];

  const totalPages    = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const paginated     = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalQty      = sales.reduce((s, r) => s + r.quantity, 0);
  const totalPaid     = sales.reduce((s, r) => s + Number(r.amountPaid), 0);
  const totalExpected = sales.reduce((s, r) => s + Number(r.totalPrice ?? r.quantity * Number(r.unitPrice)), 0);
  const totalBalance  = sales.reduce((s, r) => s + Number(r.balanceDue ?? 0), 0);
  const totalReturns  = sales.reduce((s, r) => s + Number(r.changeGiven ?? 0), 0);
  const partialCount  = sales.filter((r) => r.paymentStatus === "partial").length;

  const byMethod: Record<string, number> = {};
  sales.forEach((s) => { byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] ?? 0) + Number(s.amountPaid); });

  const getExportData = () => ({
    headers: ["Product", "SKU", "Qty", "Total (RWF)", "Paid (RWF)", "Due (RWF)", "Return (RWF)", "Status", "Method", "Customer", "Date"],
    rows: sales.map((s) => [
      s.product?.name ?? "—", s.product?.sku ?? "—", String(s.quantity),
      Number(s.totalPrice ?? s.quantity * Number(s.unitPrice)).toLocaleString(),
      Number(s.amountPaid).toLocaleString(),
      Number(s.balanceDue ?? 0).toLocaleString(),
      Number(s.changeGiven ?? 0).toLocaleString(),
      s.paymentStatus ?? "paid",
      s.paymentMethod,
      s.customer?.name ?? "Walk-in",
      new Date(s.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: `Transactions: ${sales.length}   |   Units Sold: ${totalQty}`, value: "" },
      { label: "Total Expected",         value: `${totalExpected.toLocaleString()} RWF` },
      { label: "Total Paid",             value: `${totalPaid.toLocaleString()} RWF` },
      { label: "Total Balance Due",      value: `${totalBalance.toLocaleString()} RWF` },
      { label: "Total Change Given",     value: `${totalReturns.toLocaleString()} RWF` },
      { label: "NET COLLECTED",          value: `${totalPaid.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto">
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
          <PdfButtons title="Boutique Sales — Accountant View" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Transactions"     value={sales.length} />
        <StatCard label="Units Sold"       value={totalQty} />
        <StatCard label="Amount Collected" value={`${totalPaid.toLocaleString()} RWF`} color="text-emerald-600" />
        <StatCard label="Expected Revenue" value={`${totalExpected.toLocaleString()} RWF`}
          sub={totalPaid < totalExpected ? `Gap: ${(totalExpected - totalPaid).toLocaleString()} RWF` : undefined}
          color={totalPaid < totalExpected ? "text-orange-600" : "text-emerald-600"} />
        <StatCard label="Partial Payments" value={partialCount}
          sub={partialCount > 0 ? `Due: ${totalBalance.toLocaleString()} RWF` : undefined}
          color={partialCount > 0 ? "text-orange-600" : "text-secondary-100"} />
        <StatCard label="Change Given" value={`${totalReturns.toLocaleString()} RWF`} color="text-blue-600" />
      </div>

      {/* By payment method badges */}
      {Object.keys(byMethod).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byMethod).map(([method, amount]) => (
            <div key={method} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${pmColors[method] ?? "bg-gray-100 text-gray-700"}`}>
              {method}: {amount.toLocaleString()} RWF
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
                {["Product", "Qty", "Total", "Paid", "Status", "Method", "Customer", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No boutique sales in this period</td></tr>
              ) : paginated.map((s) => (
                <tr key={s.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{s.product?.name ?? "—"}</p>
                    <p className="text-xs font-mono text-custom-700">{s.product?.sku ?? ""}</p>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{s.quantity}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">
                    {Number(s.totalPrice ?? s.quantity * Number(s.unitPrice)).toLocaleString()} RWF
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-bold text-emerald-600">{Number(s.amountPaid).toLocaleString()} RWF</p>
                    {Number(s.balanceDue ?? 0) > 0 && <p className="text-xs text-red-600">Due: {Number(s.balanceDue).toLocaleString()} RWF</p>}
                    {Number(s.changeGiven ?? 0) > 0 && <p className="text-xs text-blue-600">Change: {Number(s.changeGiven).toLocaleString()} RWF</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      s.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700"
                      : s.paymentStatus === "overpaid" ? "bg-blue-100 text-blue-700"
                      : "bg-orange-100 text-orange-700"
                    }`}>{s.paymentStatus ?? "paid"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pmColors[s.paymentMethod] ?? "bg-gray-100 text-gray-700"}`}>
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{s.customer?.name ?? <span className="text-xs text-custom-400">Walk-in</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {new Date(s.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary block */}
      {sales.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden w-80">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Expected",    value: `${totalExpected.toLocaleString()} RWF`, cls: "text-secondary-100" },
              { label: "Total Paid",        value: `${totalPaid.toLocaleString()} RWF`,     cls: "text-emerald-600" },
              { label: "Total Due",         value: `${totalBalance.toLocaleString()} RWF`,  cls: totalBalance > 0 ? "text-red-500" : "text-secondary-100" },
              { label: "Change Given",      value: `${totalReturns.toLocaleString()} RWF`,  cls: "text-blue-500" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`font-bold text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={sales.length} onPage={setPage} />
    </div>
  );
}

// ─── Payments Collected Tab ───────────────────────────────────────────────────

function PaymentsCollectedTab() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo + "T23:59:59.000Z" }
    : getDateRange(period);

  const { data: paymentsData, isLoading, refetch } = useGetPaymentsQuery({ limit: 500, from: range.from, to: range.to });
  const payments = (paymentsData?.payments ?? []).filter((p) => p.paymentMethod != null && p.receiptNo != null);

  const totalPages     = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const paginated      = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalCollected = payments.reduce((s, p) => s + Number(p.amountPaid), 0);
  const fullCount      = payments.filter((p) => p.paymentState === "FULL").length;
  const partialCount   = payments.filter((p) => p.paymentState === "PARTIAL").length;

  const byMethod: Record<string, number> = {};
  payments.forEach((p) => { if (p.paymentMethod) byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] ?? 0) + Number(p.amountPaid); });

  const getExportData = () => ({
    headers: ["Receipt", "Job #", "Customer", "Phone", "Amount (RWF)", "Method", "Type", "Date"],
    rows: payments.map((p) => [
      p.receiptNo ?? "",
      p.job?.jobNumber ? `#${p.job.jobNumber}` : `#${p.jobId?.slice(0, 8) ?? ""}`,
      p.job?.customer?.name ?? "",
      p.job?.customer?.phone ?? "",
      Number(p.amountPaid).toLocaleString(),
      (p.paymentMethod ?? "").replace(/_/g, " "),
      p.paymentState === "FULL" ? "Full" : "Partial",
      new Date(p.paidAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "Total Payments",   value: String(payments.length) },
      { label: "Full Payments",    value: String(fullCount) },
      { label: "Partial Payments", value: String(partialCount) },
      { label: "TOTAL COLLECTED",  value: `${totalCollected.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto">
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
          <PdfButtons title="Payments Collected — Accountant View" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Payments"   value={payments.length} />
        <StatCard label="Total Collected"  value={`${totalCollected.toLocaleString()} RWF`} color="text-emerald-600" />
        <StatCard label="Full Payments"    value={fullCount}    color="text-emerald-600" />
        <StatCard label="Partial Payments" value={partialCount} color="text-orange-600" />
      </div>

      {Object.keys(byMethod).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byMethod).map(([method, amount]) => (
            <div key={method} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${pmColors[method] ?? "bg-gray-100 text-gray-700"}`}>
              {method.replace(/_/g, " ")}: {amount.toLocaleString()} RWF
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
                {["Receipt", "Job", "Customer", "Amount", "Method", "Type", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No payments in this period</td></tr>
              ) : paginated.map((p) => (
                <tr key={p.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">{p.receiptNo}</td>
                  <td className="px-3 py-2.5 text-xs font-mono text-primary-500">
                    {p.job?.jobNumber ? `#${p.job.jobNumber}` : `#${p.jobId?.slice(0, 8)}`}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm text-secondary-100">{p.job?.customer?.name ?? <span className="text-custom-400">—</span>}</p>
                    {p.job?.customer?.phone && <p className="text-xs text-custom-700">{p.job.customer.phone}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-bold text-emerald-600">{Number(p.amountPaid).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pmColors[p.paymentMethod ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                      {(p.paymentMethod ?? "").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.paymentState === "FULL" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                      {p.paymentState === "FULL" ? "Full" : "Partial"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {new Date(p.paidAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination page={page} totalPages={totalPages} total={payments.length} onPage={setPage} />
    </div>
  );
}
// ─── Hobe Sales Tab ───────────────────────────────────────────────────────────

function HobeSalesTab() {
  const [period, setPeriod]         = useState<Period>("day");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo + "T23:59:59.000Z" }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetHobeSalesQuery({ from: range.from, to: range.to, limit: 500 });
  const sales = data?.sales ?? [];

  const totalPages    = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const paginated     = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalQty      = sales.reduce((s, r) => s + r.quantity, 0);
  const totalPaid     = sales.reduce((s, r) => s + Number(r.amountPaid), 0);
  const totalExpected = sales.reduce((s, r) => s + Number(r.totalPrice), 0);
  const totalBalance  = sales.reduce((s, r) => s + Number(r.balanceDue ?? 0), 0);
  const totalReturns  = sales.reduce((s, r) => s + Number(r.changeGiven ?? 0), 0);
  const partialCount  = sales.filter((r) => r.paymentStatus === "partial").length;
  const overpaidCount = sales.filter((r) => r.paymentStatus === "overpaid").length;

  const byMethod: Record<string, number> = {};
  sales.forEach((s) => { byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] ?? 0) + Number(s.amountPaid); });

  const getExportData = () => ({
    headers: ["Hobe", "Batch #", "Qty", "Total (RWF)", "Paid (RWF)", "Due (RWF)", "Change (RWF)", "Status", "Method", "Customer", "Date"],
    rows: sales.map((s) => [
      s.hobe.nameOfHobe, s.hobe.hobeNo, String(s.quantity),
      Number(s.totalPrice).toLocaleString(),
      Number(s.amountPaid).toLocaleString(),
      Number(s.balanceDue ?? 0).toLocaleString(),
      Number(s.changeGiven ?? 0).toLocaleString(),
      s.paymentStatus ?? "paid",
      s.paymentMethod,
      s.customer?.name ?? "Walk-in",
      new Date(s.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: `Transactions: ${sales.length}   |   Units Sold: ${totalQty}`, value: "" },
      { label: "Total Expected",     value: `${totalExpected.toLocaleString()} RWF` },
      { label: "Total Paid",         value: `${totalPaid.toLocaleString()} RWF` },
      { label: "Total Balance Due",  value: `${totalBalance.toLocaleString()} RWF` },
      { label: "Change Given",       value: `${totalReturns.toLocaleString()} RWF` },
      { label: "NET COLLECTED",      value: `${totalPaid.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto">
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
          <PdfButtons title="Hobe Sales — Accountant View" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Transactions"     value={sales.length} />
        <StatCard label="Units Sold"       value={totalQty} />
        <StatCard label="Amount Collected" value={`${totalPaid.toLocaleString()} RWF`} color="text-emerald-600" />
        <StatCard label="Expected Revenue" value={`${totalExpected.toLocaleString()} RWF`}
          sub={totalPaid < totalExpected ? `Gap: ${(totalExpected - totalPaid).toLocaleString()} RWF` : undefined}
          color={totalPaid < totalExpected ? "text-orange-600" : "text-emerald-600"} />
        <StatCard label="Partial Payments" value={partialCount}
          sub={partialCount > 0 ? `Due: ${totalBalance.toLocaleString()} RWF` : undefined}
          color={partialCount > 0 ? "text-orange-600" : "text-secondary-100"} />
        <StatCard label="Overpaid" value={overpaidCount}
          sub={overpaidCount > 0 ? `${totalReturns.toLocaleString()} RWF to return` : undefined}
          color={overpaidCount > 0 ? "text-blue-600" : "text-secondary-100"} />
      </div>

      {/* Payment method breakdown */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(byMethod).map(([method, amount]) => (
          <div key={method} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${pmColors[method] ?? "bg-gray-100 text-gray-700"}`}>
            {method}: {amount.toLocaleString()} RWF
          </div>
        ))}
      </div>

      {/* Sales table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Hobe", "Batch #", "Qty", "Total", "Paid", "Status", "Method", "Customer", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-custom-700 text-sm">No Hobe sales in this period</td></tr>
              ) : paginated.map((s) => (
                <tr key={s.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{s.hobe.nameOfHobe}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-primary-500">{s.hobe.hobeNo}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{s.quantity}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{Number(s.totalPrice).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-bold text-emerald-600">{Number(s.amountPaid).toLocaleString()} RWF</p>
                    {Number(s.balanceDue ?? 0) > 0 && <p className="text-xs text-red-600">Due: {Number(s.balanceDue).toLocaleString()} RWF</p>}
                    {Number(s.changeGiven ?? 0) > 0 && <p className="text-xs text-blue-600">Change: {Number(s.changeGiven).toLocaleString()} RWF</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      s.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700"
                      : s.paymentStatus === "overpaid" ? "bg-blue-100 text-blue-700"
                      : "bg-orange-100 text-orange-700"
                    }`}>{s.paymentStatus ?? "paid"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pmColors[s.paymentMethod] ?? "bg-gray-100 text-gray-700"}`}>
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{s.customer?.name ?? <span className="text-xs text-custom-400">Walk-in</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {new Date(s.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary block */}
      {sales.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden w-80">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Expected",  value: `${totalExpected.toLocaleString()} RWF`, cls: "text-secondary-100" },
              { label: "Total Paid",      value: `${totalPaid.toLocaleString()} RWF`,     cls: "text-emerald-600" },
              { label: "Total Due",       value: `${totalBalance.toLocaleString()} RWF`,  cls: totalBalance > 0 ? "text-red-500" : "text-secondary-100" },
              { label: "Change Given",    value: `${totalReturns.toLocaleString()} RWF`,  cls: "text-blue-500" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`font-bold text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={sales.length} onPage={setPage} />
    </div>
  );
}



// ─── Boutique Stock Sales Tab ─────────────────────────────────────────────────

function BoutiqueStockSalesTab() {
  const [period, setPeriod]         = useState<Period>("month");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo + "T23:59:59.000Z" }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetBoutiqueSalesQuery({ from: range.from, to: range.to, limit: 500 });
  const sales = data?.data ?? [];

  const totalPages    = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const paginated     = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalQty      = sales.reduce((s, r) => s + r.quantity, 0);
  const totalPaid     = sales.reduce((s, r) => s + Number(r.amountPaid), 0);
  const totalExpected = sales.reduce((s, r) => s + Number(r.totalPrice), 0);
  const totalBalance  = sales.reduce((s, r) => s + Number(r.balanceDue ?? 0), 0);
  const totalChange   = sales.reduce((s, r) => s + Number(r.changeGiven ?? 0), 0);
  const partialCount  = sales.filter((r) => r.paymentStatus === "partial").length;

  const byMethod: Record<string, number> = {};
  sales.forEach((s) => { byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] ?? 0) + Number(s.amountPaid); });

  const getExportData = () => ({
    headers: ["Item", "Category", "Unit", "Qty", "Unit Price", "Total (RWF)", "Paid (RWF)", "Due (RWF)", "Change (RWF)", "Status", "Method", "Sold By", "Customer", "Date"],
    rows: sales.map((s) => [
      s.stockItem?.itemName ?? "—",
      s.stockItem?.category ?? "—",
      s.stockItem?.unit ?? "—",
      String(s.quantity),
      Number(s.unitPrice).toLocaleString(),
      Number(s.totalPrice).toLocaleString(),
      Number(s.amountPaid).toLocaleString(),
      Number(s.balanceDue ?? 0).toLocaleString(),
      Number(s.changeGiven ?? 0).toLocaleString(),
      s.paymentStatus,
      s.paymentMethod,
      s.soldBy?.name ?? "—",
      s.customer?.name ?? "Walk-in",
      new Date(s.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: `Transactions: ${sales.length}   |   Units Sold: ${totalQty}`, value: "" },
      { label: "Total Expected",    value: `${totalExpected.toLocaleString()} RWF` },
      { label: "Total Paid",        value: `${totalPaid.toLocaleString()} RWF` },
      { label: "Total Balance Due", value: `${totalBalance.toLocaleString()} RWF` },
      { label: "Change Given",      value: `${totalChange.toLocaleString()} RWF` },
      { label: "NET COLLECTED",     value: `${totalPaid.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto">
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
          <PdfButtons title="Boutique Stock Sales" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Transactions"     value={sales.length} />
        <StatCard label="Units Sold"       value={totalQty} />
        <StatCard label="Amount Collected" value={`${totalPaid.toLocaleString()} RWF`}     color="text-emerald-600" />
        <StatCard label="Expected Revenue" value={`${totalExpected.toLocaleString()} RWF`} color={totalPaid < totalExpected ? "text-orange-600" : "text-emerald-600"}
          sub={totalPaid < totalExpected ? `Gap: ${(totalExpected - totalPaid).toLocaleString()} RWF` : undefined} />
        <StatCard label="Partial Payments" value={partialCount} color={partialCount > 0 ? "text-orange-600" : "text-secondary-100"}
          sub={partialCount > 0 ? `Due: ${totalBalance.toLocaleString()} RWF` : undefined} />
        <StatCard label="Change Given"     value={`${totalChange.toLocaleString()} RWF`}   color="text-blue-600" />
      </div>

      {/* Payment method breakdown */}
      {Object.keys(byMethod).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byMethod).map(([method, amount]) => (
            <div key={method} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${pmColors[method] ?? "bg-gray-100 text-gray-700"}`}>
              {method}: {amount.toLocaleString()} RWF
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
                {["Item", "Qty", "Unit Price", "Total", "Paid", "Status", "Method", "Sold By", "Customer", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-custom-700 text-sm">No boutique stock sales in this period</td></tr>
              ) : paginated.map((s) => (
                <tr key={s.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{s.stockItem?.itemName ?? "—"}</p>
                    <p className="text-xs text-custom-700">{s.stockItem?.category ?? ""}</p>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{s.quantity} {s.stockItem?.unit ?? ""}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{Number(s.unitPrice).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{Number(s.totalPrice).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-bold text-emerald-600">{Number(s.amountPaid).toLocaleString()} RWF</p>
                    {Number(s.balanceDue ?? 0) > 0 && <p className="text-xs text-red-600">Due: {Number(s.balanceDue).toLocaleString()} RWF</p>}
                    {Number(s.changeGiven ?? 0) > 0 && <p className="text-xs text-blue-600">Change: {Number(s.changeGiven).toLocaleString()} RWF</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      s.paymentStatus === "paid"     ? "bg-emerald-100 text-emerald-700"
                      : s.paymentStatus === "partial" ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-600"
                    }`}>{s.paymentStatus}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pmColors[s.paymentMethod] ?? "bg-gray-100 text-gray-700"}`}>
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{s.soldBy?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{s.customer?.name ?? <span className="text-xs text-custom-400">Walk-in</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {new Date(s.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {sales.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden w-80">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Expected",  value: `${totalExpected.toLocaleString()} RWF`, cls: "text-secondary-100" },
              { label: "Total Paid",      value: `${totalPaid.toLocaleString()} RWF`,     cls: "text-emerald-600" },
              { label: "Total Due",       value: `${totalBalance.toLocaleString()} RWF`,  cls: totalBalance > 0 ? "text-red-500" : "text-secondary-100" },
              { label: "Change Given",    value: `${totalChange.toLocaleString()} RWF`,   cls: "text-blue-500" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between px-4 py-2 border-t border-custom-200">
                <span className="text-custom-700 text-xs">{label}</span>
                <span className={`font-bold text-xs ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={sales.length} onPage={setPage} />
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: { value: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { value: "boutique",       label: "Boutique (Reception)",  icon: HiOutlineLibrary, color: "text-pink-500" },
  { value: "boutique-stock", label: "Boutique Stock Sales",  icon: HiOutlineLibrary, color: "text-violet-500" },
  { value: "payments",       label: "Payments Collected",    icon: HiOutlineCash,    color: "text-emerald-500" },
  { value: "hobe",           label: "Hobe Trade",            icon: HiOutlineLibrary, color: "text-blue-500" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Operations() {
  const { userRole, userName } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("boutique");

  return (
    <DashboardLayout userRole={userRole ?? "accountant"} userName={userName ?? "Accountant"} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineChartBar className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Operations</h1>
          </div>
          <p className="text-sm text-custom-700">
            Financial overview of all sales channels  Boutique(reception), Boutique Stock, Payments & Hobe Trade.
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
              }`}
            >
              <t.icon className={`w-4 h-4 ${activeTab === t.value ? "text-primary-500" : t.color}`} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "boutique"       && <BoutiqueSalesTab />}
        {activeTab === "boutique-stock"  && <BoutiqueStockSalesTab />}
        {activeTab === "hobe"            && <HobeSalesTab />}
        {activeTab === "payments"        && <PaymentsCollectedTab />}

      </div>
    </DashboardLayout>
  );
}



