import { useState, useMemo } from "react";
import {
  HiOutlineCash,
  HiOutlineClipboardList,
  HiOutlineUsers,
  HiOutlineChartBar,
  HiOutlineDocumentDownload,
  HiOutlineDocumentText,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlineThumbUp,
  HiOutlineBan,
  HiOutlineTrash,
  HiOutlineCurrencyDollar,
  HiOutlineShoppingBag,
  HiOutlineBriefcase,
  HiOutlineSearch,
} from "react-icons/hi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import { useGetPaymentsQuery } from "../../store/services/paymentsService";
import {
  useGetOutstandsQuery,
  useApproveOutstandMutation,
  useRejectOutstandMutation,
  usePayOutstandMutation,
  useDeleteOutstandMutation,
  type Outstand,
} from "../../store/services/outstandsService";
import { useGetCasualWorkersQuery } from "../../store/services/casualWorkersService";
import {
  useGetWithdrawalsQuery,
  useGetWithdrawalBalanceQuery,
} from "../../store/services/withdrawalsService";
import { GenerateReportModal } from "../../components";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import {
  useGetSalesQuery,
} from "../../store/services/boutiqueService";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(period: Period): { from: string; to: string } {
  const now   = new Date();
  const pad   = (n: number) => String(n).padStart(2, "0");
  const ymd   = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // end = today at 23:59:59 local time
  const to = `${ymd(now)}T23:59:59`;

  let fromDate: Date;
  switch (period) {
    case "day":   fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case "week":  fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); break;
    case "month": fromDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "year":  fromDate = new Date(now.getFullYear(), 0, 1); break;
  }
  // start = fromDate at 00:00:00 local time
  const from = `${ymd(fromDate)}T00:00:00`;
  return { from, to };
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "day",   label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year",  label: "This Year" },
];

const PAGE_SIZE = 10;

// ─── PDF helpers ──────────────────────────────────────────────────────────────

const COMPANY = {
  name:    "Santrack LTD",
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

async function buildPdf(title: string, headers: string[], rows: (string | null)[][], summary: SummaryRow[]) {
  const headerBase64 = await loadImageAsBase64("/header.png").catch(() => null);
  const subtitle = `Generated: ${new Date().toLocaleString("en-RW")}`;
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

function PdfButtons({ title, getExportData }: {
  title: string;
  getExportData: () => { headers: string[]; rows: (string | null)[][]; summary: SummaryRow[] };
}) {
  const [showModal, setShowModal] = useState(false);
  const handlePdf = () => {
    const { headers, rows, summary } = getExportData();
    buildPdf(title, headers, rows, summary).catch((err) => {
      console.error(err); alert("Failed to generate PDF");
    });
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

const pmColors: Record<string, string> = {
  CASH:          "bg-emerald-100 text-emerald-700",
  MOBILE_MONEY:  "bg-yellow-100 text-yellow-700",
  BANK_TRANSFER: "bg-blue-100 text-blue-700",
  CHEQUE:        "bg-purple-100 text-purple-700",
  CARD:          "bg-pink-100 text-pink-700",
};

// ─── Boutique helpers ─────────────────────────────────────────────────────────

function fmtB(amount: string | number) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(n) ? "0" : n.toLocaleString("en-RW");
}

function toDateStrB(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type BPeriod = "day" | "week" | "month" | "all";

function getBRange(period: BPeriod): { from?: string; to?: string } {
  const now = new Date();
  if (period === "all") return {};
  if (period === "day") { const s = toDateStrB(now); return { from: s, to: s }; }
  if (period === "week") {
    const day = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: toDateStrB(mon), to: toDateStrB(sun) };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateStrB(first), to: toDateStrB(last) };
}

const bSaleStatusColor: Record<string, string> = {
  paid:     "bg-emerald-100 text-emerald-700",
  partial:  "bg-yellow-100  text-yellow-700",
  overpaid: "bg-blue-100    text-blue-700",
};

// ─── Boutique Cash Payments Report ───────────────────────────────────────────

function BoutiquePaymentsReport() {
  const [bPeriod, setBPeriod]   = useState<BPeriod>("day");
  const [bSearch, setBSearch]   = useState("");
  const [bPage,   setBPage]     = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [useCustom,  setUseCustom]  = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo }
    : getBRange(bPeriod);

  const { data, isLoading, isFetching, refetch } = useGetSalesQuery(
    { from: range.from, to: range.to },
    { refetchOnMountOrArgChange: true }
  );

  const cashSales = useMemo(() => {
    return (data?.sales ?? []).filter((s) => s.paymentMethod === "cash");
  }, [data]);

  const filtered = useMemo(() => {
    if (!bSearch.trim()) return cashSales;
    const q = bSearch.toLowerCase();
    return cashSales.filter(
      (s) =>
        s.product?.name?.toLowerCase().includes(q) ||
        s.product?.sku?.toLowerCase().includes(q)  ||
        s.customer?.name?.toLowerCase().includes(q)
    );
  }, [cashSales, bSearch]);

  const totalPages     = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated      = filtered.slice((bPage - 1) * PAGE_SIZE, bPage * PAGE_SIZE);
  const totalCollected = filtered.reduce((s, x) => s + parseFloat(String(x.amountPaid)), 0);
  const totalRevenue   = filtered.reduce((s, x) => s + parseFloat(String(x.totalPrice)),  0);
  const totalBalance   = filtered.reduce((s, x) => s + parseFloat(String(x.balanceDue)),  0);

  const bPeriodBtns: { label: string; value: BPeriod }[] = [
    { label: "Today", value: "day"   },
    { label: "Week",  value: "week"  },
    { label: "Month", value: "month" },
    { label: "All",   value: "all"   },
  ];

  const getExportData = () => ({
    headers: ["Product", "SKU", "Qty", "Unit Price (RWF)", "Total (RWF)", "Paid (RWF)", "Balance (RWF)", "Status", "Customer", "Sold By", "Date"],
    rows: filtered.map((s) => [
      s.product?.name ?? "—",
      s.product?.sku  ?? "—",
      `${s.quantity} ${s.product?.unit ?? ""}`.trim(),
      fmtB(s.unitPrice),
      fmtB(s.totalPrice),
      fmtB(s.amountPaid),
      fmtB(s.balanceDue),
      s.paymentStatus,
      s.customer?.name ?? "—",
      s.soldBy?.name   ?? "—",
      new Date(s.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: `Transactions: ${filtered.length}`, value: "" },
      { label: "Total Revenue",   value: `${fmtB(totalRevenue)} RWF` },
      { label: "Outstanding",     value: `${fmtB(totalBalance)} RWF` },
      { label: "TOTAL COLLECTED", value: `${fmtB(totalCollected)} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600">
          <HiOutlineShoppingBag className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-secondary-100">Boutique Cash Payments</h2>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period pills */}
        <div className="flex gap-1 bg-custom-100 p-1 rounded-xl w-fit">
          {bPeriodBtns.map((btn) => (
            <button key={btn.value} onClick={() => { setBPeriod(btn.value); setUseCustom(false); setBPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !useCustom && bPeriod === btn.value ? "bg-primary-500 text-white shadow-sm" : "text-custom-700 hover:text-secondary-100"
              }`}>{btn.label}</button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Custom date range */}
          <input type="date" value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); setBPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors" />
          <span className="text-xs text-custom-700">to</span>
          <input type="date" value={customTo} min={customFrom}
            onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); setBPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors" />
          {useCustom && (
            <button onClick={() => { setCustomFrom(""); setCustomTo(""); setUseCustom(false); setBPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-custom-300 text-xs text-custom-700 hover:bg-custom-100 transition-colors">Clear</button>
          )}

          {/* Search */}
          <div className="relative">
            <HiOutlineSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-custom-400" />
            <input value={bSearch} onChange={(e) => { setBSearch(e.target.value); setBPage(1); }}
              placeholder="Search product…"
              className="pl-7 pr-7 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors w-36" />
            {bSearch && (
              <button onClick={() => setBSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <HiOutlineX className="w-3.5 h-3.5 text-custom-400" />
              </button>
            )}
          </div>

          <button onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Cashier Boutique Cash Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Transactions"    value={filtered.length} />
        <StatCard label="Total Collected" value={`${fmtB(totalCollected)} RWF`} color="text-emerald-600" />
        <StatCard label="Outstanding"     value={`${fmtB(totalBalance)} RWF`}
          color={totalBalance > 0 ? "text-orange-600" : "text-secondary-100"} />
      </div>

      {/* Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Product", "Qty", "Total", "Paid", "Balance", "Status", "Customer", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No cash boutique sales in this period</td></tr>
              ) : paginated.map((s) => (
                <tr key={s.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{s.product?.name ?? "—"}</p>
                    <p className="text-xs text-custom-700">{s.product?.sku ?? ""}</p>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100 whitespace-nowrap">
                    {s.quantity} <span className="text-xs text-custom-500">{s.product?.unit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100 whitespace-nowrap">{fmtB(s.totalPrice)} RWF</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-emerald-600 whitespace-nowrap">{fmtB(s.amountPaid)} RWF</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {parseFloat(String(s.balanceDue)) > 0
                      ? <span className="text-sm font-bold text-orange-600">{fmtB(s.balanceDue)} RWF</span>
                      : <span className="text-xs text-custom-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bSaleStatusColor[s.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
                      {s.paymentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{s.customer?.name ?? <span className="text-custom-400">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700 whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
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
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Revenue",   value: `${fmtB(totalRevenue)} RWF`,   cls: "text-secondary-100" },
              { label: "Total Collected", value: `${fmtB(totalCollected)} RWF`, cls: "text-emerald-600" },
              { label: "Outstanding",     value: `${fmtB(totalBalance)} RWF`,   cls: totalBalance > 0 ? "text-orange-600" : "text-secondary-100" },
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
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(bPage - 1) * PAGE_SIZE + 1}–{Math.min(bPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setBPage((p) => Math.max(1, p - 1))} disabled={bPage === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setBPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  n === bPage ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"
                }`}>{n}</button>
            ))}
            <button onClick={() => setBPage((p) => Math.min(totalPages, p + 1))} disabled={bPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 1: Payments Collected ────────────────────────────────────────────────

type PaymentSubTab = "jobs" | "boutique";

function PaymentsReport() {
  const [subTab, setSubTab] = useState<PaymentSubTab>("jobs");

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-2 border-b border-custom-200 pb-1">
        <button
          onClick={() => setSubTab("jobs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors border-b-2 ${
            subTab === "jobs"
              ? "border-primary-500 text-primary-500 bg-primary-50"
              : "border-transparent text-custom-700 hover:text-secondary-100 hover:bg-custom-50"
          }`}
        >
          <HiOutlineBriefcase className="w-4 h-4" />
          Jobs
        </button>
        <button
          onClick={() => setSubTab("boutique")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors border-b-2 ${
            subTab === "boutique"
              ? "border-primary-500 text-primary-500 bg-primary-50"
              : "border-transparent text-custom-700 hover:text-secondary-100 hover:bg-custom-50"
          }`}
        >
          <HiOutlineShoppingBag className="w-4 h-4" />
          Boutique Products
        </button>
      </div>

      {subTab === "jobs"     && <JobsPaymentsReport />}
      {subTab === "boutique" && <BoutiquePaymentsReport />}
    </div>
  );
}

// ─── Tab 1a: Job Payments ─────────────────────────────────────────────────────

function JobsPaymentsReport() {
  const [period, setPeriod]         = useState<Period>("month");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);
  const [methodFilter, setMethodFilter] = useState("");

  const range = useCustom && customFrom && customTo
    ? { from: customFrom + "T00:00:00", to: customTo + "T23:59:59" }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetPaymentsQuery({ from: range.from, to: range.to, limit: 500 });
  const allPayments = data?.payments ?? [];

  const payments = allPayments.filter((p) => {
    const d = new Date(p.paidAt);
    const inRange = d >= new Date(range.from) && d <= new Date(range.to);
    const methodOk = !methodFilter || p.paymentMethod === methodFilter;
    return inRange && methodOk;
  });

  const totalPages     = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const paginated      = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalCollected = payments.reduce((s, p) => s + Number(p.amountPaid), 0);
  const totalBalance   = payments.reduce((s, p) => s + Number(p.balance ?? 0), 0);
  const fullCount      = payments.filter((p) => p.paymentState === "FULL").length;
  const partialCount   = payments.filter((p) => p.paymentState === "PARTIAL").length;

  const byMethod: Record<string, number> = {};
  payments.forEach((p) => {
    const m = p.paymentMethod ?? "UNKNOWN";
    byMethod[m] = (byMethod[m] ?? 0) + Number(p.amountPaid);
  });

  const getExportData = () => ({
    headers: ["Receipt #", "Job #", "Customer", "Amount Paid (RWF)", "Balance (RWF)", "State", "Method", "Date"],
    rows: payments.map((p) => [
      p.receiptNo,
      p.job?.jobNumber ?? "—",
      p.job?.customer?.name ?? "—",
      Number(p.amountPaid).toLocaleString(),
      Number(p.balance ?? 0).toLocaleString(),
      p.paymentState,
      (p.paymentMethod ?? "—").replace(/_/g, " "),
      new Date(p.paidAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: `Total Transactions: ${payments.length}`, value: "" },
      { label: "Full Payments",        value: String(fullCount) },
      { label: "Partial Payments",     value: String(partialCount) },
      { label: "Outstanding Balance",  value: `${totalBalance.toLocaleString()} RWF` },
      { label: "TOTAL COLLECTED",      value: `${totalCollected.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600">
          <HiOutlineCash className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-secondary-100">Payments Collected</h2>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All methods</option>
            <option value="CASH">Cash</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
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
          <button onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Cashier Payments Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Transactions"    value={payments.length} />
        <StatCard label="Total Collected" value={`${totalCollected.toLocaleString()} RWF`} color="text-emerald-600" />
        <StatCard label="Full Payments"   value={fullCount} color="text-blue-600" />
        <StatCard label="Partial"         value={partialCount} color="text-orange-600"
          sub={totalBalance > 0 ? `Balance: ${totalBalance.toLocaleString()} RWF` : undefined} />
      </div>

      {/* By method pills */}
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
                {["Receipt #", "Job #", "Customer", "Amount Paid", "Balance", "State", "Method", "Date"].map((h) => (
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
                  <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">{p.receiptNo}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-secondary-100">{p.job?.jobNumber ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{p.job?.customer?.name ?? "—"}</p>
                    {p.job?.customer?.phone && <p className="text-xs text-custom-700">{p.job.customer.phone}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-bold text-emerald-600">
                    {Number(p.amountPaid).toLocaleString()} RWF
                  </td>
                  <td className="px-3 py-2.5">
                    {Number(p.balance ?? 0) > 0
                      ? <span className="text-sm font-bold text-orange-600">{Number(p.balance).toLocaleString()} RWF</span>
                      : <span className="text-xs text-custom-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      p.paymentState === "FULL" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                    }`}>{p.paymentState}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pmColors[p.paymentMethod ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                      {(p.paymentMethod ?? "—").replace(/_/g, " ")}
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

      {/* Summary totals */}
      {payments.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Collected",      value: `${totalCollected.toLocaleString()} RWF`, cls: "text-emerald-600" },
              { label: "Outstanding Balance",  value: `${totalBalance.toLocaleString()} RWF`,   cls: totalBalance > 0 ? "text-orange-600" : "text-secondary-100" },
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
      {payments.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, payments.length)} of {payments.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"
                }`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Expenses (Outstands) Report ───────────────────────────────────────

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ record, onClose }: { record: Outstand; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [rejectOutstand, { isLoading }] = useRejectOutstandMutation();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) { toast.error("Please provide a rejection reason"); return; }
    try { await rejectOutstand({ id: record.id, rejectionNote: note }).unwrap(); toast.success("Expense rejected"); onClose(); }
    catch (err: any) { toast.error(err?.data?.message ?? "Failed to reject"); }
  };
  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-secondary-100">Reject Expense</h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-custom-700 mb-4">Rejecting <span className="font-bold text-secondary-100">{record.ref}</span>. Please provide a reason.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Reason for rejection..."
            className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-red-400 transition-colors resize-none" required />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40">{isLoading ? "Rejecting..." : "Reject"}</button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Inline actions for expense rows ─────────────────────────────────────────
function ExpenseInlineActions({ record }: { record: Outstand }) {
  const [confirm, setConfirm]       = useState<"approve" | "pay" | "delete" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [approveOutstand] = useApproveOutstandMutation();
  const [payOutstand]     = usePayOutstandMutation();
  const [deleteOutstand]  = useDeleteOutstandMutation();

  return (
    <>
      {showReject && <RejectModal record={record} onClose={() => setShowReject(false)} />}
      <div className="flex items-center gap-1">
        {record.status === "pending" && (
          <>
            {confirm === "approve" ? (
              <span className="flex items-center gap-1 text-xs">
                <button onClick={async () => { try { await approveOutstand(record.id).unwrap(); toast.success("Approved"); } catch { toast.error("Failed"); } setConfirm(null); }}
                  className="px-2 py-1 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600">Yes</button>
                <button onClick={() => setConfirm(null)} className="px-2 py-1 rounded-lg border border-custom-300 text-custom-700 text-xs hover:bg-custom-100">No</button>
              </span>
            ) : (
              <button onClick={() => setConfirm("approve")} title="Approve"
                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors">
                <HiOutlineThumbUp className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setShowReject(true)} title="Reject"
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
              <HiOutlineBan className="w-4 h-4" />
            </button>
          </>
        )}
        {record.status === "approved" && (
          confirm === "pay" ? (
            <span className="flex items-center gap-1 text-xs">
              <button onClick={async () => { try { await payOutstand(record.id).unwrap(); toast.success("Marked as paid"); } catch { toast.error("Failed"); } setConfirm(null); }}
                className="px-2 py-1 rounded-lg bg-blue-500 text-white font-bold text-xs hover:bg-blue-600">Pay</button>
              <button onClick={() => setConfirm(null)} className="px-2 py-1 rounded-lg border border-custom-300 text-custom-700 text-xs hover:bg-custom-100">No</button>
            </span>
          ) : (
            <button onClick={() => setConfirm("pay")} title="Mark as Paid"
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
              <HiOutlineCash className="w-4 h-4" />
            </button>
          )
        )}
        {record.status !== "paid" && (
          confirm === "delete" ? (
            <span className="flex items-center gap-1 text-xs">
              <button onClick={async () => { try { await deleteOutstand(record.id).unwrap(); toast.success("Deleted"); } catch { toast.error("Failed"); } setConfirm(null); }}
                className="px-2 py-1 rounded-lg bg-red-500 text-white font-bold text-xs hover:bg-red-600">Del</button>
              <button onClick={() => setConfirm(null)} className="px-2 py-1 rounded-lg border border-custom-300 text-custom-700 text-xs hover:bg-custom-100">No</button>
            </span>
          ) : (
            <button onClick={() => setConfirm("delete")} title="Delete"
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
              <HiOutlineTrash className="w-4 h-4" />
            </button>
          )
        )}
      </div>
    </>
  );
}

const categoryColors: Record<string, string> = {
  purchase:    "bg-blue-100 text-blue-700",
  utility:     "bg-yellow-100 text-yellow-700",
  maintenance: "bg-orange-100 text-orange-700",
  supplier:    "bg-purple-100 text-purple-700",
  other:       "bg-gray-100 text-gray-700",
};

const expenseStatusColors: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  paid:     "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function ExpensesReport() {
  const [period, setPeriod]         = useState<Period>("month");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const range = useCustom && customFrom && customTo
    ? { from: customFrom + "T00:00:00", to: customTo + "T23:59:59" }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetOutstandsQuery({ limit: 500 });
  const allOutstands = data?.outstands ?? [];

  const expenses = allOutstands.filter((e) => {
    const d = new Date(e.createdAt);
    const inRange = d >= new Date(range.from) && d <= new Date(range.to);
    const statusOk = !statusFilter || e.status === statusFilter;
    return inRange && statusOk;
  });

  const totalPages  = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE));
  const paginated   = expenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalAmount  = expenses.reduce((s, e) => s + Number(e.totalAmount), 0);
  const paidAmount   = expenses.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.totalAmount), 0);
  const pendingCount = expenses.filter((e) => e.status === "pending").length;
  const approvedCount= expenses.filter((e) => e.status === "approved").length;
  const paidCount    = expenses.filter((e) => e.status === "paid").length;
  const rejectedCount= expenses.filter((e) => e.status === "rejected").length;

  const byCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.totalAmount);
  });

  const getExportData = () => ({
    headers: ["Ref", "Description", "Category", "Recipient", "Qty", "Unit Cost (RWF)", "Total (RWF)", "Status", "Date"],
    rows: expenses.map((e) => [
      e.ref,
      e.description,
      e.category,
      e.recipientName ?? e.recipient ?? "—",
      String(e.quantity),
      Number(e.unitCost).toLocaleString(),
      Number(e.totalAmount).toLocaleString(),
      e.status,
      new Date(e.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: `Total Expenses: ${expenses.length}`, value: "" },
      { label: "Pending",   value: String(pendingCount) },
      { label: "Approved",  value: String(approvedCount) },
      { label: "Paid",      value: String(paidCount) },
      { label: "Rejected",  value: String(rejectedCount) },
      { label: "Total Paid Out",  value: `${paidAmount.toLocaleString()} RWF` },
      { label: "TOTAL VALUE",     value: `${totalAmount.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600">
          <HiOutlineClipboardList className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-secondary-100">Expenses (Outstands)</h2>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
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
          <button onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Cashier Expenses Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Expenses"  value={expenses.length} />
        <StatCard label="Total Value"     value={`${totalAmount.toLocaleString()} RWF`} color="text-secondary-100" />
        <StatCard label="Paid Out"        value={`${paidAmount.toLocaleString()} RWF`}  color="text-emerald-600" />
        <StatCard label="Pending / Approved" value={`${pendingCount} / ${approvedCount}`}
          sub={pendingCount > 0 ? "awaiting action" : undefined}
          color={pendingCount > 0 ? "text-yellow-600" : "text-secondary-100"} />
      </div>

      {/* By category pills */}
      {Object.keys(byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCategory).map(([cat, amount]) => (
            <div key={cat} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${categoryColors[cat] ?? "bg-gray-100 text-gray-700"}`}>
              {cat}: {amount.toLocaleString()} RWF
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
                {["Ref", "Description", "Category", "Recipient", "Total", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No expenses in this period</td></tr>
              ) : paginated.map((e) => (
                <tr key={e.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">{e.ref}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{e.description}</p>
                    {e.purpose && <p className="text-xs text-custom-700 truncate max-w-[160px]">{e.purpose}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[e.category] ?? "bg-gray-100 text-gray-700"}`}>
                      {e.category}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm text-secondary-100">{e.recipientName ?? e.recipient ?? "—"}</p>
                    {e.recipientRole && <p className="text-xs text-custom-700">{e.recipientRole}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">
                    {Number(e.totalAmount).toLocaleString()} RWF
                    <p className="text-xs font-normal text-custom-700">
                      {e.quantity} × {Number(e.unitCost).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${expenseStatusColors[e.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {new Date(e.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-3 py-2.5" onClick={ev => ev.stopPropagation()}>
                    <ExpenseInlineActions record={e} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary totals */}
      {expenses.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Value",  value: `${totalAmount.toLocaleString()} RWF`,  cls: "text-secondary-100" },
              { label: "Paid Out",     value: `${paidAmount.toLocaleString()} RWF`,   cls: "text-emerald-600" },
              { label: "Rejected",     value: String(rejectedCount),                  cls: rejectedCount > 0 ? "text-red-500" : "text-secondary-100" },
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
      {expenses.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, expenses.length)} of {expenses.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"
                }`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Casual Workers Report ─────────────────────────────────────────────

function CasualWorkersReport() {
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const { data, isLoading, refetch } = useGetCasualWorkersQuery({ limit: 200 });
  const allWorkers = data?.data ?? [];

  const workers = useCustom && customFrom && customTo
    ? allWorkers.filter((w) => {
        const d = new Date(w.startDate);
        return d >= new Date(customFrom) && d <= new Date(customTo);
      })
    : allWorkers;

  const totalPages   = Math.max(1, Math.ceil(workers.length / PAGE_SIZE));
  const paginated    = workers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalDays    = workers.reduce((s, w) => s + w.daysWorked, 0);
  const totalPayable = workers.reduce((s, w) => s + Number(w.totalAmount), 0);
  const avgRate      = workers.length > 0
    ? Math.round(workers.reduce((s, w) => s + Number(w.dailyRate), 0) / workers.length)
    : 0;

  const getExportData = () => ({
    headers: ["Full Name", "Phone", "Job Done", "Start Date", "End Date", "Days", "Daily Rate (RWF)", "Total (RWF)", "Notes"],
    rows: workers.map((w) => [
      w.fullName,
      w.phoneNumber ?? "—",
      w.jobDone,
      w.startDate?.split("T")[0] ?? "—",
      w.endDate?.split("T")[0]   ?? "—",
      String(w.daysWorked),
      Number(w.dailyRate).toLocaleString(),
      Number(w.totalAmount).toLocaleString(),
      w.notes ?? "—",
    ]),
    summary: [
      { label: "Total Workers",    value: String(workers.length) },
      { label: "Total Days",       value: String(totalDays) },
      { label: "Avg. Daily Rate",  value: `${avgRate.toLocaleString()} RWF` },
      { label: "TOTAL PAYABLE",    value: `${totalPayable.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600">
          <HiOutlineUsers className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-secondary-100">Casual Workers</h2>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-custom-700">
          <span>Filter by start date:</span>
        </div>
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
          <button onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Cashier Casual Workers Report" getExportData={getExportData} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Workers"  value={workers.length} />
        <StatCard label="Total Days"     value={totalDays} color="text-primary-500" />
        <StatCard label="Avg. Daily Rate" value={`${avgRate.toLocaleString()} RWF`} color="text-secondary-100" />
        <StatCard label="Total Payable"  value={`${totalPayable.toLocaleString()} RWF`} color="text-indigo-600" />
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
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : workers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No workers found</td></tr>
              ) : paginated.map((w) => (
                <tr key={w.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{w.fullName}</p>
                    {w.notes && <p className="text-xs text-custom-700 truncate max-w-[120px]">{w.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">{w.phoneNumber ?? "—"}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100 max-w-[140px] truncate">{w.jobDone}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">{w.startDate?.split("T")[0] ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">{w.endDate?.split("T")[0]   ?? "—"}</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-secondary-100 text-center">{w.daysWorked}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{Number(w.dailyRate).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-indigo-600">
                    {Number(w.totalAmount).toLocaleString()} RWF
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pay banner */}
      {totalPayable > 0 && (
        <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-indigo-50 border border-indigo-200">
          <div className="flex items-center gap-3">
            <HiOutlineUsers className="w-6 h-6 text-indigo-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-indigo-700">Total payable to casual workers</p>
              <p className="text-xs text-indigo-600">{workers.length} workers · {totalDays} total days worked</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{totalPayable.toLocaleString()} <span className="text-sm font-normal">RWF</span></p>
        </div>
      )}

      {/* Pagination */}
      {workers.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, workers.length)} of {workers.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"
                }`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Withdrawals Report ────────────────────────────────────────────────

function WithdrawalsReport() {
  const [period, setPeriod]         = useState<Period>("month");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: customFrom + "T00:00:00", to: customTo + "T23:59:59" }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetWithdrawalsQuery({ limit: 500 });
  const { data: balanceData }        = useGetWithdrawalBalanceQuery();
  const allWithdrawals               = data?.withdrawals ?? [];

  const withdrawals = allWithdrawals.filter((w) => {
    const d = new Date(w.withdrawnAt || w.createdAt);
    return d >= new Date(range.from) && d <= new Date(range.to);
  });

  const totalPages   = Math.max(1, Math.ceil(withdrawals.length / PAGE_SIZE));
  const paginated    = withdrawals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalAmount  = withdrawals.reduce((s, w) => s + Number(w.amount), 0);

  const bySource: Record<string, number> = {};
  withdrawals.forEach((w) => {
    const src = w.source || "other";
    bySource[src] = (bySource[src] ?? 0) + Number(w.amount);
  });

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600">
          <HiOutlineCurrencyDollar className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-secondary-100">Withdrawals</h2>
      </div>

      {/* Balance card */}
      {balanceData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Fund Balance",    value: balanceData.totalBalance,      color: balanceData.totalBalance >= 0 ? "text-emerald-600" : "text-red-500" },
            { label: "Payments In",     value: balanceData.totalPaymentsIn,   color: "text-blue-600" },
            { label: "Withdrawals Out", value: balanceData.totalWithdrawalsIn, color: "text-orange-600" },
            { label: "Expenses Out",    value: balanceData.totalExpensesOut,  color: "text-red-500" },
          ].map(k => (
            <Card key={k.label} className="!p-4">
              <p className="text-xs text-custom-700 mb-1">{k.label}</p>
              <p className={`text-lg font-bold ${k.color}`}>{Number(k.value).toLocaleString()}</p>
              <p className="text-xs text-custom-700">RWF</p>
            </Card>
          ))}
        </div>
      )}

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
          <button onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Cashier Withdrawals Report" getExportData={() => ({
            headers: ["Title", "Description", "Amount (RWF)", "Source", "Taken By", "Contact", "Date"],
            rows: withdrawals.map((w) => [
              w.title,
              w.description,
              Number(w.amount).toLocaleString(),
              w.source || "—",
              w.takenByName || "—",
              w.takenByContact || "—",
              new Date(w.withdrawnAt || w.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
            ]),
            summary: [
              { label: `Total Withdrawals: ${withdrawals.length}`, value: "" },
              { label: "TOTAL AMOUNT", value: `${totalAmount.toLocaleString()} RWF`, bold: true },
            ],
          })} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Withdrawals"  value={withdrawals.length} />
        <StatCard label="Total Amount" value={`${totalAmount.toLocaleString()} RWF`} color="text-orange-600" />
        <StatCard label="Avg. Amount"
          value={withdrawals.length > 0 ? `${Math.round(totalAmount / withdrawals.length).toLocaleString()} RWF` : "—"} />
      </div>

      {/* By-source pills */}
      {Object.keys(bySource).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(bySource).map(([src, amount]) => (
            <div key={src} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-100 text-orange-700">
              {src}: {amount.toLocaleString()} RWF
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
                {["Title", "Description", "Amount", "Source", "Taken By", "Contact", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : withdrawals.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">No withdrawals in this period</td></tr>
              ) : paginated.map((w) => (
                <tr key={w.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{w.title}</p>
                    {w.notes && <p className="text-xs text-custom-700 truncate max-w-[160px]">{w.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100 max-w-[180px] truncate">{w.description}</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-orange-600">
                    {Number(w.amount).toLocaleString()} RWF
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      {w.source || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{w.takenByName || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">{w.takenByContact || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {new Date(w.withdrawnAt || w.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      {withdrawals.length > 0 && (
        <div className="flex justify-end">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-64">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            <div className="flex justify-between px-4 py-2 border-t border-custom-200">
              <span className="text-custom-700 text-xs">Total Withdrawn</span>
              <span className="font-bold text-xs text-orange-600">{totalAmount.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between px-4 py-2 border-t border-custom-200">
              <span className="text-custom-700 text-xs">Records</span>
              <span className="font-bold text-xs text-secondary-100">{withdrawals.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {withdrawals.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, withdrawals.length)} of {withdrawals.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"
                }`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "payments" | "expenses" | "workers" | "withdrawals";

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "payments",    label: "Payments",      icon: HiOutlineCash },
  { value: "expenses",    label: "Expenses",       icon: HiOutlineClipboardList },
  { value: "workers",     label: "Casual Workers", icon: HiOutlineUsers },
  { value: "withdrawals", label: "Withdrawals",    icon: HiOutlineCurrencyDollar },
];

export default function CashierReportsPage() {
  const { userRole, userName } = useAuth();
  const [tab, setTab] = useState<Tab>("payments");

  return (
    <DashboardLayout userRole={userRole ?? "cashier"} userName={userName ?? "Cashier"} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Page header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineChartBar className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Cashier Reports</h1>
          </div>
          <p className="text-sm text-custom-700">
            Track payments received, expenses recorded, and casual worker payroll
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 flex-wrap border-b border-custom-200 pb-1">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors border-b-2 ${
                tab === t.value
                  ? "border-primary-500 text-primary-500 bg-primary-50"
                  : "border-transparent text-custom-700 hover:text-secondary-100 hover:bg-custom-50"
              }`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "payments"    && <PaymentsReport />}
        {tab === "expenses"    && <ExpensesReport />}
        {tab === "workers"     && <CasualWorkersReport />}
        {tab === "withdrawals" && <WithdrawalsReport />}
      </div>
    </DashboardLayout>
  );
}
