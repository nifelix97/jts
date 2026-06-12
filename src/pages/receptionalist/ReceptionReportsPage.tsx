import { useState } from "react";
import { toast } from "react-toastify";
import {
  HiOutlineCash,
  HiOutlineChartBar,
  HiOutlineCube,
  HiOutlineDocumentDownload,
  HiOutlineDocumentText,
  HiOutlineRefresh,
  HiOutlineTruck,
  HiOutlineUsers,
  HiOutlineX,
} from "react-icons/hi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import { useGetJobsQuery } from "../../store/services/jobsService";
import { useGetCustomersQuery } from "../../store/services/customersService";
import { useGetPaymentsQuery } from "../../store/services/paymentsService";
import { useGetSalesQuery } from "../../store/services/boutiqueService";
import { useCreateReportMutation } from "../../store/services/reportsService";
import { useAuth } from "../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "day" | "week" | "month" | "year";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  let from: Date;
  switch (period) {
    case "day":   from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case "week":  from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); break;
    case "month": from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "year":  from = new Date(now.getFullYear(), 0, 1); break;
  }
  // Use date-only strings so the value is stable across renders
  return {
    from: from.toISOString().split("T")[0],
    to:   to.split("T")[0] + "T23:59:59.000Z",
  };
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "day",   label: "Today" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year",  label: "This Year" },
];

// ─── PDF helpers ───────────────────────────────────────────────────────────────────

const COMPANY = {
  name:    "PALLOTTI PRESSE LTD",
  society: "SOCIETE DE L'APOSTOLAT CATHOLIQUE",
  tagline: "Editions - Imprimerie",
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
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// header.png dimensions: ~580x130 px → fits A4 width (210mm) at ~30mm tall
const HEADER_H   = 35;  // mm – height of header.png on the page
const FOOTER_TOP = 26;  // mm from page bottom

function drawLetterhead(pdf: jsPDF, headerBase64: string | null, title: string, subtitle: string) {
  const pw = pdf.internal.pageSize.getWidth();

  // ── Paste header.png full-width ──
  if (headerBase64) {
    pdf.addImage(headerBase64, "PNG", 0, 0, pw, HEADER_H);
  }

  // ── Report title & subtitle below the image ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(25, 25, 25);
  pdf.text(title, pw / 2, HEADER_H + 10, { align: "center" });

  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(110, 110, 110);
    pdf.text(subtitle, pw / 2, HEADER_H + 16, { align: "center" });
  }
}

function drawFooter(pdf: jsPDF, pageNum: number, totalPages: number) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const fy = ph - FOOTER_TOP;

  // ── Thin separator line ──
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(10, fy, pw - 10, fy);

  // Footer is split into 3 columns like the letterhead image:
  //  Left: B.P. + TIN   |   Center: Tel + RC   |   Right: Email + Compte
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(60, 60, 60);

  const col1 = 12;
  const col2 = pw / 2;
  const col3 = pw - 12;
  const row1 = fy + 5;
  const row2 = fy + 10;

  // Left column
  pdf.text(COMPANY.address,          col1, row1);
  pdf.text(COMPANY.tin,              col1, row2);

  // Center column
  pdf.text(COMPANY.tel,              col2, row1, { align: "center" });
  pdf.text(COMPANY.rc,               col2, row2, { align: "center" });

  // Right column
  pdf.text(COMPANY.email,            col3, row1, { align: "right" });
  pdf.text(COMPANY.compte,           col3, row2, { align: "right" });

  // ── Motto – centered, blue italic ──
  pdf.setFont("helvetica", "bolditalic");
  pdf.setFontSize(7);
  pdf.setTextColor(0, 160, 210);
  pdf.text(COMPANY.motto, col2, fy + 16, { align: "center" });

  // ── Page number ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Page ${pageNum} of ${totalPages}`, pw - 10, fy + 16, { align: "right" });
}

const TABLE_START_Y = HEADER_H + 23;
const BOTTOM_MARGIN = FOOTER_TOP + 6;

type SummaryRow = { label: string; value: string; bold?: boolean };

async function buildPdf(
  title: string,
  headers: string[],
  rows: string[][],
  summary: SummaryRow[],
) {
  const headerBase64 = await loadImageAsBase64("/header.png").catch(() => null);
  const subtitle     = `Generated: ${new Date().toLocaleString("en-RW")}`;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw  = pdf.internal.pageSize.getWidth();

  drawLetterhead(pdf, headerBase64, title, subtitle);

  autoTable(pdf, {
    head: [headers],
    body: rows,
    startY: TABLE_START_Y,
    margin: { left: 10, right: 10, bottom: BOTTOM_MARGIN },
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [0, 160, 210], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 251, 255] },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawLetterhead(pdf, headerBase64, title, subtitle);
      const total = (pdf as any).internal.getNumberOfPages();
      drawFooter(pdf, data.pageNumber, total);
    },
  });

  // ── Summary block after table ──
  if (summary.length > 0) {
    const afterTable = (pdf as any).lastAutoTable.finalY + 8;
    const col1 = pw - 90;
    const col2 = pw - 12;

    pdf.setDrawColor(0, 160, 210);
    pdf.setLineWidth(0.4);
    pdf.line(col1, afterTable - 3, col2, afterTable - 3);

    let sy = afterTable;
    summary.forEach(({ label, value, bold }) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(40, 40, 40);
      pdf.text(label, col1, sy);
      pdf.text(value, col2, sy, { align: "right" });
      sy += 6;
    });

    // bottom border of summary
    pdf.setDrawColor(0, 160, 210);
    pdf.setLineWidth(0.4);
    pdf.line(col1, sy, col2, sy);
  }

  // Re-draw footers with final page count
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(pdf, i, totalPages);
  }

  pdf.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ─── Generate Report Modal ───────────────────────────────────────────────────────────

type ReportItem = { record: string; quantity: string; amount: string };

function GenerateReportModal({ title, onClose }: {
  title: string;
  onClose: () => void;
}) {
  const [purpose, setPurpose]   = useState("");
  const [items, setItems]       = useState<ReportItem[]>([{ record: "", quantity: "", amount: "" }]);
  const [pdfFile, setPdfFile]   = useState<File | null>(null);
  const [notes, setNotes]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [createReport] = useCreateReportMutation();

  const addItem = () => setItems((prev) => [...prev, { record: "", quantity: "", amount: "" }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ReportItem, value: string) =>
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const filledItems = items.filter((it) => it.record.trim());

    // ── Save to backend ──
    try {
      await createReport({
        title,
        purpose,
        items: filledItems,
        notes: notes.trim() || undefined,
        attachment: pdfFile ?? undefined,
      }).unwrap();
    } catch (err) {
      console.error("Failed to save report:", err);
    }

    // ── Generate PDF ──
    const headerBase64 = await loadImageAsBase64("/header.png").catch(() => null);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw  = pdf.internal.pageSize.getWidth();

    drawLetterhead(pdf, headerBase64, title, `Generated: ${new Date().toLocaleString("en-RW")}`);

    let my = HEADER_H + 20;
    const mx = 14;

    // Purpose
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(40, 40, 40);
    pdf.text("Purpose / Subject:", mx, my);
    pdf.setFont("helvetica", "normal");
    pdf.text(purpose, mx + 48, my);
    my += 10;

    // Items table
    if (filledItems.length > 0) {
      autoTable(pdf, {
        head: [["#", "Record / Item", "Quantity", "Amount (RWF)"]],
        body: filledItems.map((it, idx) => [
          String(idx + 1),
          it.record,
          it.quantity || "—",
          it.amount ? Number(it.amount).toLocaleString() : "—",
        ]),
        startY: my,
        margin: { left: mx, right: mx, bottom: FOOTER_TOP + 6 },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 160, 210], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 251, 255] },
        columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 22 }, 3: { cellWidth: 32 } },
      });
      my = (pdf as any).lastAutoTable.finalY + 10;
    }

    // Notes
    if (notes.trim()) {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(40, 40, 40);
      pdf.text("Additional Notes:", mx, my); my += 6;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
      pdf.text(pdf.splitTextToSize(notes, pw - mx * 2), mx, my);
    }

    drawFooter(pdf, 1, 1);
    // pdf.save removed — report is submitted only, not downloaded
    setSubmitting(false);
    toast.success("Report submitted successfully");
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-style-500 rounded-2xl shadow-xl max-w-lg w-full my-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-secondary-100">Generate Report</h3>
            <p className="text-sm text-custom-700 mt-0.5">{title}</p>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Purpose */}
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Purpose / Subject *</label>
            <input required value={purpose} onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Monthly sales summary for management" className={inputCls} />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-secondary-100">Records</label>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors">
                <span className="text-base leading-none">+</span> Add Row
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={item.record}
                    onChange={(e) => updateItem(i, "record", e.target.value)}
                    placeholder="Record / Item name *"
                    className="flex-1 px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
                  />
                  <input
                    type="number" min="0"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    placeholder="Qty"
                    className="w-20 px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
                  />
                  <input
                    type="number" min="0"
                    value={item.amount}
                    onChange={(e) => updateItem(i, "amount", e.target.value)}
                    placeholder="Amount"
                    className="w-28 px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                      <HiOutlineX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PDF attachment */}
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Attach PDF / File <span className="text-custom-700 font-normal">(optional)</span></label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-custom-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-500 file:text-white hover:file:bg-primary-600 transition-colors"
            />
            {pdfFile && <p className="text-xs text-emerald-600 mt-1">✓ {pdfFile.name}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Additional Notes <span className="text-custom-700 font-normal">(optional)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} placeholder="Optional remarks..."
              className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors"
            >Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40"
            >{submitting ? "submitting..." : "Submit"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── PDF Action Buttons ─────────────────────────────────────────────────────────────────

function PdfButtons({ title, getExportData }: {
  title: string;
  getExportData: () => { headers: string[]; rows: string[][]; summary: SummaryRow[] };
}) {
  const [showModal, setShowModal] = useState(false);

  const handlePdf = () => {
    const { headers, rows, summary } = getExportData();
    buildPdf(title, headers, rows, summary).catch((err) => {
      console.error("PDF error:", err);
      alert("Failed to generate PDF: " + (err as Error).message);
    });
  };

  return (
    <>
      <button onClick={handlePdf}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
      >
        <HiOutlineDocumentDownload className="w-4 h-4" />
        PDF
      </button>
      <button onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition-colors"
      >
        <HiOutlineDocumentText className="w-4 h-4" />
        Generate Report
      </button>
      {showModal && (
        <GenerateReportModal title={title} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 bg-custom-100 p-1 rounded-xl w-fit">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            value === p.value
              ? "bg-primary-500 text-white shadow-sm"
              : "text-custom-700 hover:text-secondary-100"
          }`}
        >
          {p.label}
        </button>
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

const pmColors: Record<string, string> = {
  CASH:          "bg-emerald-100 text-emerald-700",
  MOBILE_MONEY:  "bg-yellow-100 text-yellow-700",
  BANK_TRANSFER: "bg-blue-100 text-blue-700",
  CARD:          "bg-purple-100 text-purple-700",
  cash:          "bg-emerald-100 text-emerald-700",
  mobile:        "bg-yellow-100 text-yellow-700",
  bank:          "bg-blue-100 text-blue-700",
  card:          "bg-purple-100 text-purple-700",
};


// ─── Section wrapper ──────────────────────────────────────────────────────────

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

// ─── Boutique Sales Section ───────────────────────────────────────────────────

const PAGE_SIZE = 5;

function BoutiqueSalesReport() {
  const [period, setPeriod] = useState<Period>("month");
  const [page, setPage]     = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo + "T23:59:59.000Z" }
    : getDateRange(period);

  const { data, isLoading, refetch } = useGetSalesQuery({ from: range.from, to: range.to, limit: 200 });
  const sales = data?.sales ?? [];

  const totalPages = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const paginated  = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalQty      = sales.reduce((s, r) => s + r.quantity, 0);
  const totalPaid     = sales.reduce((s, r) => s + Number(r.amountPaid), 0);
  const totalExpected = sales.reduce((s, r) => s + Number(r.totalPrice ?? r.quantity * Number(r.unitPrice)), 0);
  const totalBalance  = sales.reduce((s, r) => s + Number(r.balanceDue ?? 0), 0);
  const totalReturns  = sales.reduce((s, r) => s + Number(r.changeGiven ?? 0), 0);
  const partialCount  = sales.filter((r) => r.paymentStatus === "partial").length;
  const overpaidCount = sales.filter((r) => r.paymentStatus === "overpaid").length;

  const byMethod: Record<string, number> = {};
  sales.forEach((s) => { byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] ?? 0) + Number(s.amountPaid); });

  const getExportData = () => ({
    headers: ["Product", "SKU", "Qty", "Total (RWF)", "Paid (RWF)", "Due (RWF)", "Return (RWF)", "Status", "Method", "Customer", "Date"],
    rows: sales.map((s) => [
      s.product.name,
      s.product.sku,
      String(s.quantity),
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
      { label: `Total Transactions: ${sales.length}   |   Units Sold: ${totalQty}`, value: ""},
      { label: "Total Expected Amount", value: `${totalExpected.toLocaleString()} RWF` },
      { label: "Total Amount Paid",     value: `${totalPaid.toLocaleString()} RWF` },
      { label: "Total Due (Balance)",   value: `${totalBalance.toLocaleString()} RWF` },
      { label: "Total Returns (Change)",value: `${totalReturns.toLocaleString()} RWF` },
      { label: "NET COLLECTED",          value: `${totalPaid.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineCube} title="Boutique Sales" color="bg-pink-100 text-pink-600">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
          />
          <span className="text-xs text-custom-700">to</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
          />
          {useCustom && (
            <button
              onClick={() => { setCustomFrom(""); setCustomTo(""); setUseCustom(false); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-custom-300 text-xs text-custom-700 hover:bg-custom-100 transition-colors"
            >Clear</button>
          )}
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Boutique Sales Report" getExportData={getExportData} />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Transactions"     value={sales.length} />
        <StatCard label="Units Sold"       value={totalQty} />
        <StatCard label="Amount Collected" value={`${totalPaid.toLocaleString()} RWF`} color="text-emerald-600" />
        <StatCard label="Expected Revenue" value={`${totalExpected.toLocaleString()} RWF`}
          sub={totalPaid < totalExpected ? `Gap: ${(totalExpected - totalPaid).toLocaleString()} RWF` : undefined}
          color={totalPaid < totalExpected ? "text-orange-600" : "text-emerald-600"} />
        {partialCount > 0 && <StatCard label="Partial Payments" value={partialCount} sub={`Balance due: ${totalBalance.toLocaleString()} RWF`} color="text-orange-600" />}
        {overpaidCount > 0 && <StatCard label="Overpaid" value={overpaidCount} color="text-blue-600" />}
        </div>

      {/* By payment method */}
      {Object.keys(byMethod).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(byMethod).map(([method, amount]) => (
            <div key={method} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${pmColors[method] ?? "bg-gray-100 text-gray-700"}`}>
              {method}: {amount.toLocaleString()} RWF
            </div>
          ))}
        </div>
      )}

      <Card className="!p-0 overflow-hidden mt-2">
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
                <tr><td colSpan={8} className="px-4 py-8 text-center text-custom-700 text-sm">No sales in this period</td></tr>
              ) : paginated.map((s) => (
                <tr key={s.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{s.product.name}</p>
                    <p className="text-xs font-mono text-custom-700">{s.product.sku}</p>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{s.quantity}</td>
                    <td className="px-3 py-2.5 text-sm text-secondary-100">{Number(s.totalPrice ?? s.quantity * Number(s.unitPrice)).toLocaleString()} RWF</td>
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

      {/* Summary */}
      {sales.length > 0 && (
        <div className="flex justify-end mt-1">
          <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-80">
            <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
            {[
              { label: "Total Expected Amount", value: `${totalExpected.toLocaleString()} RWF`, cls: "text-secondary-100" },
              { label: "Total Amount Paid",     value: `${totalPaid.toLocaleString()} RWF`,     cls: "text-emerald-600" },
              { label: "Total Due (Balance)",   value: `${totalBalance.toLocaleString()} RWF`,  cls: totalBalance > 0 ? "text-red-500" : "text-secondary-100" },
              { label: "Total Returns (Change)",value: `${totalReturns.toLocaleString()} RWF`,  cls: "text-blue-500" },
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
      {sales.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sales.length)} of {sales.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors"
            >Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"
                }`}
              >{n}</button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors"
            >Next</button>
          </div>
        </div>
      )}
      </div>
    </Section>
  );
}

// ─── Visitor Report ───────────────────────────────────────────────────────────

function VisitorReport() {
  const [period, setPeriod]       = useState<Period>("month");
  const [page, setPage]           = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo + "T23:59:59.000Z" }
    : getDateRange(period);

  const { data: customersData, isLoading, refetch } = useGetCustomersQuery({ limit: 500 });
  const allCustomers = customersData?.customers ?? [];

  const customers = allCustomers.filter((c) => {
    const d = new Date(c.createdAt);
    return d >= new Date(range.from) && d <= new Date(range.to);
  });

  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const paginated  = customers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const byType: Record<string, number> = {};
  customers.forEach((c) => { byType[c.type] = (byType[c.type] ?? 0) + 1; });

  const typeColor: Record<string, string> = {
    BUSINESS: "bg-blue-100 text-blue-700",
    VISITOR:  "bg-purple-100 text-purple-700",
    BOUTIQUE: "bg-pink-100 text-pink-700",
    HOBE:     "bg-yellow-100 text-yellow-700",
  };
  const typeLabel: Record<string, string> = {
    BUSINESS: "Business", VISITOR: "Visit", BOUTIQUE: "Boutique", HOBE: "Hobe",
  };

  const getExportData = () => ({
    headers: ["Name", "Phone", "Company", "Category", "Address", "Registered"],
    rows: customers.map((c) => [
      c.name,
      c.phone ?? "",
      c.company ?? "",
      typeLabel[c.type] ?? c.type,
      c.address ?? "",
      new Date(c.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "Total Customers", value: String(customers.length) },
      { label: "Business",  value: String(byType["BUSINESS"] ?? 0) },
      { label: "Visitors",  value: String(byType["VISITOR"]  ?? 0) },
      { label: "Boutique",  value: String(byType["BOUTIQUE"] ?? 0) },
      { label: "Hobe",      value: String(byType["HOBE"]     ?? 0), bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineUsers} title="Visitor Management" color="bg-purple-100 text-purple-600">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date" value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
          />
          <span className="text-xs text-custom-700">to</span>
          <input
            type="date" value={customTo} min={customFrom}
            onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
          />
          {useCustom && (
            <button
              onClick={() => { setCustomFrom(""); setCustomTo(""); setUseCustom(false); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-custom-300 text-xs text-custom-700 hover:bg-custom-100 transition-colors"
            >Clear</button>
          )}
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Visitor Management Report" getExportData={getExportData} />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Total Customers" value={customers.length} />
        <StatCard label="Business"  value={byType["BUSINESS"] ?? 0} color="text-blue-600" />
        <StatCard label="Visit"     value={byType["VISITOR"]  ?? 0} color="text-purple-600" />
        <StatCard label="Boutique"  value={byType["BOUTIQUE"] ?? 0} color="text-pink-600" />
        <StatCard label="Hobe"      value={byType["HOBE"]     ?? 0} color="text-yellow-600" />
      </div>

      <Card className="!p-0 overflow-hidden mt-2">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Name", "Phone", "Company|Groupe", "Category", "Address", "Registered"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700 text-sm">No customers registered in this period</td></tr>
              ) : paginated.map((c) => (
                <tr key={c.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{c.name}</p>
                    {c.email && <p className="text-xs text-custom-700">{c.email}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{c.phone ?? <span className="text-custom-400">—</span>}</td>
                  <td className="px-3 py-2.5">
                    {(() => {
                      const notes = c.notes ?? "";
                      const isGroupe = notes.startsWith("[Groupe]");
                      const groupeMatch = notes.match(/^\[Groupe\] (.+?)(?:\s\|\sMembers:\s(\d+))?$/);
                      if (isGroupe) return (
                        <div>
                          <p className="text-sm font-semibold text-secondary-100">{groupeMatch?.[1] ?? c.company ?? "—"}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Groupe</span>
                            {groupeMatch?.[2] && <span className="text-xs text-custom-700">{groupeMatch[2]} people</span>}
                          </div>
                        </div>
                      );
                      return <span className="text-sm text-secondary-100">{c.company ?? <span className="text-custom-400">—</span>}</span>;
                    })()}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColor[c.type] ?? "bg-gray-100 text-gray-700"}`}>
                      {typeLabel[c.type] ?? c.type}
                    </span>
                  </td>
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

      {customers.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, customers.length)} of {customers.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors"
            >Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"
                }`}
              >{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors"
            >Next</button>
          </div>
        </div>
      )}
      </div>
    </Section>
  );
}

// ─── Payments Report ──────────────────────────────────────────────────────────

function PaymentsReport() {
  const [period, setPeriod]         = useState<Period>("month");
  const [page, setPage]             = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo + "T23:59:59.000Z" }
    : getDateRange(period);

  const { data: paymentsData, isLoading, refetch } = useGetPaymentsQuery({ limit: 500, from: range.from, to: range.to });
  const payments = (paymentsData?.payments ?? []).filter((p) => p.paymentMethod !== null && p.receiptNo !== null);

  const totalPages     = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const paginated      = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalCollected = payments.reduce((s, p) => s + Number(p.amountPaid), 0);
  const fullCount      = payments.filter((p) => p.paymentState === "FULL").length;
  const partialCount   = payments.filter((p) => p.paymentState === "PARTIAL").length;

  const byMethod: Record<string, number> = {};
  payments.forEach((p) => { byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] ?? 0) + Number(p.amountPaid); });

  const getExportData = () => ({
    headers: ["Receipt", "Job #", "Customer", "Phone", "Amount (RWF)", "Method", "Type", "Date"],
    rows: payments.map((p) => [
      p.receiptNo ?? "",
      p.job?.jobNumber ? `#${p.job.jobNumber}` : `#${p.jobId?.slice(0, 8) ?? ""}`,
      p.job?.customer?.name ?? "",
      p.job?.customer?.phone ?? "",
      Number(p.amountPaid).toLocaleString(),
      p.paymentMethod.replace(/_/g, " "),
      p.paymentState === "FULL" ? "Full" : "Partial",
      new Date(p.paidAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }),
    ]),
    summary: [
      { label: "Total Payments",    value: String(payments.length) },
      { label: "Full Payments",     value: String(fullCount) },
      { label: "Partial Payments",  value: String(partialCount) },
      { label: "TOTAL COLLECTED",   value: `${totalCollected.toLocaleString()} RWF`, bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineCash} title="Payments Collected" color="bg-emerald-100 text-emerald-600">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); setPage(1); }} />
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date" value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
          />
          <span className="text-xs text-custom-700">to</span>
          <input
            type="date" value={customTo} min={customFrom}
            onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
          />
          {useCustom && (
            <button
              onClick={() => { setCustomFrom(""); setCustomTo(""); setUseCustom(false); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-custom-300 text-xs text-custom-700 hover:bg-custom-100 transition-colors"
            >Clear</button>
          )}
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Payments Collected Report" getExportData={getExportData} />
        </div>
      </div>

      <div>
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

      <Card className="!p-0 overflow-hidden mt-1">
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
                    <p className="text-sm text-secondary-100">
                      {p.job?.customer?.name ?? <span className="text-custom-400">—</span>}
                    </p>
                    {p.job?.customer?.phone && (
                      <p className="text-xs text-custom-700">{p.job.customer.phone}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-bold text-emerald-600">{Number(p.amountPaid).toLocaleString()} RWF</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pmColors[p.paymentMethod] ?? "bg-gray-100 text-gray-700"}`}>
                      {p.paymentMethod.replace(/_/g, " ")}
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

      {payments.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-custom-700">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, payments.length)} of {payments.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors"
            >Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"
                }`}
              >{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors"
            >Next</button>
          </div>
        </div>
      )}
      </div>
    </Section>
  );
}

// ─── Deliveries Report ────────────────────────────────────────────────────────

function DeliveriesReport() {
  const [period, setPeriod]         = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");
  const [useCustom, setUseCustom]   = useState(false);

  const range = useCustom && customFrom && customTo
    ? { from: customFrom, to: customTo + "T23:59:59.000Z" }
    : getDateRange(period);

  const { data: deliveredData, isLoading, refetch } = useGetJobsQuery({ status: "delivered", limit: 500 });

  const jobs = (deliveredData?.jobs ?? []).filter((j) =>
    j.updatedAt && new Date(j.updatedAt) >= new Date(range.from) && new Date(j.updatedAt) <= new Date(range.to)
  );

  const paid   = jobs.filter((j) => j.paymentStatus === "paid").length;
  const unpaid = jobs.filter((j) => j.paymentStatus !== "paid").length;

  const getExportData = () => ({
    headers: ["Job #", "Title", "Type", "Customer", "Phone", "Received By", "Contact", "Payment", "Date"],
    rows: jobs.map((j) => [
      `#${j.jobNumber}`,
      j.title,
      j.jobType ?? "",
      j.customer?.name ?? "",
      j.customer?.phone ?? "",
      j.deliveredByName ?? "",
      j.deliveredByContact ?? "",
      j.paymentStatus === "paid" ? "Paid" : "Unpaid",
      j.updatedAt ? new Date(j.updatedAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }) : "",
    ]),
    summary: [
      { label: "Total Delivered",  value: String(jobs.length) },
      { label: "Payment Cleared",  value: String(paid),   bold: false },
      { label: "Unpaid",           value: String(unpaid), bold: false },
      { label: "With Receiver",    value: String(jobs.filter((j) => j.deliveredByName).length), bold: true },
    ] as SummaryRow[],
  });

  return (
    <Section icon={HiOutlineTruck} title="Deliveries" color="bg-orange-100 text-orange-600">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={(p) => { setPeriod(p); setUseCustom(false); }} />
        <div className="flex items-center gap-2 ml-auto">
          <input type="date" value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
          />
          <span className="text-xs text-custom-700">to</span>
          <input type="date" value={customTo}
            onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); }}
            className="px-2 py-1.5 rounded-lg border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
          />
          {useCustom && (
            <button onClick={() => { setUseCustom(false); setCustomFrom(""); setCustomTo(""); }}
              className="text-xs text-primary-500 hover:text-primary-600 font-semibold">Reset</button>
          )}
          <button onClick={() => refetch()} className="p-1.5 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
            <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PdfButtons title="Deliveries Report" getExportData={getExportData} />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Delivered" value={jobs.length} />
        <StatCard label="Payment Cleared" value={paid}   color="text-emerald-600" />
        <StatCard label="Unpaid"          value={unpaid} color={unpaid > 0 ? "text-red-600" : "text-secondary-100"} />
        <StatCard label="With Receiver"   value={jobs.filter((j) => j.deliveredByName).length} />
      </div>

      <Card className="!p-0 overflow-hidden mt-2">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Job #", "Title", "Customer", "Received By", "Payment", "Date"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700 text-sm">No deliveries in this period</td></tr>
              ) : jobs.map((j) => (
                <tr key={j.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-500">#{j.jobNumber}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{j.title}</p>
                    {j.jobType && <p className="text-xs text-custom-700">{j.jobType}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm text-secondary-100">{j.customer?.name ?? "—"}</p>
                    {j.customer?.phone && <p className="text-xs text-custom-700">{j.customer.phone}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    {j.deliveredByName
                      ? <><p className="text-sm text-secondary-100">{j.deliveredByName}</p>{j.deliveredByContact && <p className="text-xs text-custom-700">{j.deliveredByContact}</p>}</>
                      : <span className="text-xs text-custom-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${j.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {j.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-custom-700">
                    {j.updatedAt ? new Date(j.updatedAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      </div>
    </Section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "sales" | "visitors" | "payments" | "deliveries";

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "sales",      label: "Boutique Sales",  icon: HiOutlineCube },
  { value: "visitors",   label: "Visitors",         icon: HiOutlineUsers },
  { value: "payments",   label: "Payments",         icon: HiOutlineCash },
  { value: "deliveries", label: "Deliveries",       icon: HiOutlineTruck },
];

export default function ReceptionReportsPage() {
  const { userRole, userName } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("sales");

  return (
    <DashboardLayout userRole={userRole ?? "receptionist"} userName={userName ?? "Reception Desk"} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineChartBar className="w-6 h-6 text-primary-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Reports</h1>
          </div>
          <p className="text-sm text-custom-700">
            Track sales, visitors, payments and deliveries filter by day, week, month or year
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 flex-wrap border-b border-custom-200 pb-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors border-b-2 ${
                activeTab === t.value
                  ? "border-primary-500 text-primary-500 bg-primary-50"
                  : "border-transparent text-custom-700 hover:text-secondary-100 hover:bg-custom-50"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "sales"      && <BoutiqueSalesReport />}
        {activeTab === "visitors"   && <VisitorReport />}
        {activeTab === "payments"   && <PaymentsReport />}
        {activeTab === "deliveries" && <DeliveriesReport />}

      </div>
    </DashboardLayout>
  );
}
