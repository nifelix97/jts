import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import React, { useState } from "react";
import {
  HiOutlineBan,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlineDotsVertical,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";

// ─── PDF Letterhead helpers (same as Reports.tsx) ─────────────────────────────

const COMPANY = {
  address: "B.P. 863 Kigali - Rwanda",
  tin:     "TIN / T.V.A.: NO 100021520",
  tel:     "Tel: Reception (+250) 788 313 617 / (+250) 788 304 549",
  rc:      "No. RC: 536 / 09 / NYR",
  email:   "E-mail: pallottipresse@yahoo.com",
  compte:  "Compte: BK: 10000017 4372",
  motto:   "Rapidite - Qualite - Innovation - Esprit d'Equipe",
};

const HEADER_H     = 35;
const FOOTER_TOP   = 26;
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

function pdfDrawLetterhead(pdf: jsPDF, headerBase64: string | null, title: string, subtitle: string) {
  const pw = pdf.internal.pageSize.getWidth();
  if (headerBase64) pdf.addImage(headerBase64, "PNG", 0, 0, pw, HEADER_H);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(25, 25, 25);
  pdf.text(title, pw / 2, HEADER_H + 10, { align: "center" });
  if (subtitle) {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(110, 110, 110);
    pdf.text(subtitle, pw / 2, HEADER_H + 16, { align: "center" });
  }
}

function pdfDrawFooter(pdf: jsPDF, pageNum: number, totalPages: number) {
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const fy = ph - FOOTER_TOP;
  pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3);
  pdf.line(10, fy, pw - 10, fy);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(60, 60, 60);
  const col1 = 12, col2 = pw / 2, col3 = pw - 12;
  const row1 = fy + 5, row2 = fy + 10;
  pdf.text(COMPANY.address, col1, row1);   pdf.text(COMPANY.tin, col1, row2);
  pdf.text(COMPANY.tel, col2, row1, { align: "center" }); pdf.text(COMPANY.rc, col2, row2, { align: "center" });
  pdf.text(COMPANY.email, col3, row1, { align: "right" }); pdf.text(COMPANY.compte, col3, row2, { align: "right" });
  pdf.setFont("helvetica", "bolditalic"); pdf.setFontSize(7); pdf.setTextColor(0, 160, 210);
  pdf.text(COMPANY.motto, col2, fy + 16, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(150, 150, 150);
  pdf.text(`Page ${pageNum} of ${totalPages}`, pw - 10, fy + 16, { align: "right" });
}
import { toast } from "react-toastify";
import { DashboardLayout } from "../../components";
import { Button, Card } from "../../components/ui";
import type { Invoice, InvoiceStatus } from "../../store/services/invoicesService";
import {
  useCancelInvoiceMutation,
  useDeleteInvoiceMutation,
  useGetInvoicesQuery,
} from "../../store/services/invoicesService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  paid:      { label: "Paid",      bg: "bg-emerald-100", color: "text-emerald-700" },
  cancelled: { label: "Cancelled", bg: "bg-red-100",     color: "text-red-700" },
  draft:     { label: "Draft",     bg: "bg-gray-100",    color: "text-gray-700" },
  issued:    { label: "Issued",    bg: "bg-blue-100",    color: "text-blue-700" },
};

const PAGE_SIZE = 5;

// ─── Invoice Detail Modal ─────────────────────────────────────────────────────

async function downloadInvoicePdf(invoice: Invoice, statusCfg: { label: string }) {
  const headerBase64 = await loadImageAsBase64("/header.png").catch(() => null);
  const title    = `INVOICE — ${invoice.invoiceNo}`;
  const subtitle = `Generated: ${new Date().toLocaleString("en-RW")}`;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw  = pdf.internal.pageSize.getWidth();

  pdfDrawLetterhead(pdf, headerBase64, title, subtitle);

  // Bill-to block (left) + meta (right)
  const customerName  = invoice.job?.customer?.name ?? invoice.customer?.name ?? "—";
  const customerPhone = invoice.job?.customer?.phone ?? invoice.customer?.phone ?? "";
  const jobLabel      = invoice.job
    ? `Job #${invoice.job.jobNumber}${invoice.job.title ? ` — ${invoice.job.title}` : ""}`
    : "";

  let ly = HEADER_H + 24;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(40, 40, 40);
  pdf.text("BILL TO:", 12, ly);
  pdf.setFont("helvetica", "normal");
  pdf.text(customerName, 32, ly);
  if (customerPhone) { ly += 5; pdf.text(customerPhone, 32, ly); }
  if (jobLabel)      { ly += 5; pdf.text(jobLabel,      32, ly); }

  let ry = HEADER_H + 24;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(40, 40, 40);
  pdf.text("STATUS:",   pw - 65, ry); pdf.setFont("helvetica", "normal"); pdf.text(statusCfg.label, pw - 40, ry);
  ry += 5;
  pdf.setFont("helvetica", "bold"); pdf.text("CREATED:", pw - 65, ry);
  pdf.setFont("helvetica", "normal"); pdf.text(invoice.createdAt.slice(0, 10), pw - 40, ry);
  if (invoice.dueDate) {
    ry += 5;
    pdf.setFont("helvetica", "bold"); pdf.text("DUE DATE:", pw - 65, ry);
    pdf.setFont("helvetica", "normal"); pdf.text(invoice.dueDate.slice(0, 10), pw - 40, ry);
  }

  // Line items table
  const items = invoice.lineItems ?? invoice.items ?? [];
  const tableRows = items.map((item) => [
    item.name,
    String(item.quantity ?? 0),
    `${(item.unitPrice ?? 0).toLocaleString()} RWF`,
    `${(item.total ?? (item as any).totalPrice ?? (item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString()} RWF`,
  ]);

  const tableStartY = Math.max(ly, ry) + 8;

  autoTable(pdf, {
    head:   [["Description", "Qty", "Unit Price", "Total"]],
    body:   tableRows,
    startY: tableStartY,
    margin: { left: 10, right: 10, bottom: BOTTOM_MARGIN },
    styles:           { fontSize: 8, cellPadding: 2.5 },
    headStyles:       { fillColor: [0, 160, 210], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 251, 255] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "right",  cellWidth: 38 },
      3: { halign: "right",  cellWidth: 38 },
    },
    didDrawPage: (data: { pageNumber: number }) => {
      if (data.pageNumber > 1) pdfDrawLetterhead(pdf, headerBase64, title, subtitle);
      pdfDrawFooter(pdf, data.pageNumber, (pdf as any).internal.getNumberOfPages());
    },
  });

  // Totals summary
  const afterTable = (pdf as any).lastAutoTable.finalY + 6;
  const col1 = pw - 90, col2 = pw - 12;
  pdf.setDrawColor(0, 160, 210); pdf.setLineWidth(0.4);
  pdf.line(col1, afterTable - 2, col2, afterTable - 2);

  const subtotal = items.reduce(
    (s, i) => s + (i.total ?? (i as any).totalPrice ?? (i.quantity ?? 0) * (i.unitPrice ?? 0)), 0
  );
  const summaryRows: { label: string; value: string; bold?: boolean }[] = [
    { label: "Subtotal", value: `${subtotal.toLocaleString()} RWF` },
  ];
  if (Number(invoice.discountAmount ?? 0) > 0)
    summaryRows.push({ label: `Discount (${invoice.discountValue ?? 0}%)`, value: `- ${Number(invoice.discountAmount).toLocaleString()} RWF` });
  if (Number(invoice.taxAmount ?? 0) > 0)
    summaryRows.push({ label: `Tax / VAT (${invoice.taxRate ?? 0}%)`, value: `+ ${Number(invoice.taxAmount).toLocaleString()} RWF` });
  summaryRows.push({ label: "TOTAL", value: `${Number(invoice.totalAmount ?? 0).toLocaleString()} RWF`, bold: true });

  let sy = afterTable + 4;
  summaryRows.forEach(({ label, value, bold }) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(8.5); pdf.setTextColor(40, 40, 40);
    pdf.text(label, col1, sy); pdf.text(value, col2, sy, { align: "right" });
    sy += 6;
  });
  pdf.setDrawColor(0, 160, 210); pdf.line(col1, sy, col2, sy);

  if (invoice.notes) {
    sy += 8;
    pdf.setFont("helvetica", "italic"); pdf.setFontSize(7.5); pdf.setTextColor(100, 100, 100);
    pdf.text(`Notes: ${invoice.notes}`, 12, sy);
  }

  // Stamp footers on all pages
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) { pdf.setPage(i); pdfDrawFooter(pdf, i, totalPages); }

  pdf.save(`${invoice.invoiceNo}_${new Date().toISOString().split("T")[0]}.pdf`);
}

function InvoiceDetailModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [cancelInvoice, { isLoading: isCancelling }] = useCancelInvoiceMutation();
  const [downloading, setDownloading] = useState(false);

  const sc = STATUS_CONFIG[invoice.status] ?? { label: invoice.status, bg: "bg-gray-100", color: "text-gray-700" };

  async function handleDownloadPDF() {
    setDownloading(true);
    try { await downloadInvoicePdf(invoice, sc); }
    catch { toast.error("Failed to generate PDF"); }
    finally { setDownloading(false); }
  }

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-secondary-100">{invoice.invoiceNo}</h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
            </div>
            <p className="text-sm text-custom-700 mt-1">
              Job: <span className="font-semibold text-primary-600">{invoice.job?.jobNumber ?? "—"}</span>
              {invoice.job?.title && ` — ${invoice.job.title}`}
            </p>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100 transition-colors">
            <HiOutlineX className="w-6 h-6" />
          </button>
        </div>

        {/* Customer */}
        <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-3 mb-5">
          <p className="text-xs text-custom-500 mb-1">Bill To</p>
          <p className="text-sm font-semibold text-secondary-100">
            {invoice.job?.customer?.name ?? invoice.customer?.name ?? "—"}
          </p>
          {(invoice.job?.customer?.phone ?? invoice.customer?.phone) && (
            <p className="text-xs text-custom-700">{invoice.job?.customer?.phone ?? invoice.customer?.phone}</p>
          )}
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-custom-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-custom-50 border-b border-custom-200">
              <tr>
                <th className="px-4 py-2 text-left   text-xs font-bold text-secondary-100 uppercase">Description</th>
                <th className="px-4 py-2 text-center text-xs font-bold text-secondary-100 uppercase">Qty</th>
                <th className="px-4 py-2 text-right  text-xs font-bold text-secondary-100 uppercase">Unit Price</th>
                <th className="px-4 py-2 text-right  text-xs font-bold text-secondary-100 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {(invoice.lineItems ?? invoice.items ?? []).map((item, i) => (
                <tr key={i} className="hover:bg-custom-50">
                  <td className="px-4 py-2.5 text-secondary-100">{item.name}</td>
                  <td className="px-4 py-2.5 text-center text-custom-700">{item.quantity ?? 0}</td>
                  <td className="px-4 py-2.5 text-right text-custom-700">{(item.unitPrice ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-secondary-100">
                    {(item.total ?? (item as any).totalPrice ?? (item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="rounded-xl bg-custom-50 border border-custom-200 px-4 py-3 space-y-2 text-sm mb-4">
          {Number(invoice.discountAmount ?? 0) > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Discount ({invoice.discountValue ?? 0}%)</span>
              <span>− {Number(invoice.discountAmount ?? 0).toLocaleString()} RWF</span>
            </div>
          )}
          {Number(invoice.taxAmount ?? 0) > 0 && (
            <div className="flex justify-between text-custom-700">
              <span>Tax / VAT ({invoice.taxRate ?? 0}%)</span>
              <span>+ {Number(invoice.taxAmount ?? 0).toLocaleString()} RWF</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-custom-200">
            <span className="text-secondary-100">Total</span>
            <span className="text-primary-600">{Number(invoice.totalAmount ?? 0).toLocaleString()} RWF</span>
          </div>
        </div>

        {/* Dates */}
        <div className="flex gap-6 text-xs text-custom-500 mb-5">
          <span>Created: {invoice.createdAt.slice(0, 10)}</span>
          {invoice.dueDate && <span>Due: {invoice.dueDate.slice(0, 10)}</span>}
          {invoice.paidAt  && <span>Paid: {(invoice.paidAt as string).slice(0, 10)}</span>}
        </div>

        {invoice.notes && (
          <p className="text-xs text-custom-500 italic mb-5 border-t border-custom-200 pt-3">{invoice.notes}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end border-t border-custom-200 pt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-60"
          >
            {downloading
              ? <HiOutlineRefresh className="h-4 w-4 animate-spin" />
              : <HiOutlineDownload className="h-4 w-4" />}
            {downloading ? "Generating…" : "Download PDF"}
          </button>
          {invoice.status !== "cancelled" && (
            <button
              onClick={async () => {
                try {
                  await cancelInvoice(invoice.id).unwrap();
                  toast.success("Invoice cancelled");
                  onClose();
                } catch (err: any) {
                  toast.error(err?.data?.message ?? "Action failed");
                }
              }}
              disabled={isCancelling}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isCancelling && <HiOutlineRefresh className="h-4 w-4 animate-spin" />}
              Cancel
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [deleteInvoice, { isLoading }] = useDeleteInvoiceMutation();

  async function handleDelete() {
    try {
      await deleteInvoice(invoice.id).unwrap();
      toast.success("Invoice deleted");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Delete failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <HiOutlineTrash className="w-5 h-5 text-red-600" />
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100 transition-colors">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-lg font-bold text-secondary-100 mb-1">Delete Invoice</h3>
        <p className="text-sm text-custom-700 mb-4">
          This action cannot be undone. Type{" "}
          <span className="font-mono font-bold text-red-600">{invoice.invoiceNo}</span>{" "}
          to confirm.
        </p>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={invoice.invoiceNo}
          className="w-full px-4 py-2.5 rounded-xl border border-custom-300 text-secondary-100 text-sm font-mono focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 mb-4"
        />

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <button
            onClick={handleDelete}
            disabled={input !== invoice.invoiceNo || isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading && <HiOutlineRefresh className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────

function RowMenu({ onView, onDelete }: { invoice: Invoice; onView: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, right: 0 });
  const btnRef = React.useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="p-1.5 rounded-lg hover:bg-custom-100 text-custom-500 hover:text-secondary-100 transition-colors"
      >
        <HiOutlineDotsVertical className="h-5 w-5" />
      </button>
      {open && (
        <>
          {/* backdrop to close on outside click */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[9999] w-36 bg-white rounded-xl shadow-lg border border-custom-200 py-1 overflow-hidden"
          >
            <button
              onClick={() => { setOpen(false); onView(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-secondary-100 hover:bg-custom-50 transition-colors"
            >
              <HiOutlineEye className="h-4 w-4" /> View
            </button>
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <HiOutlineTrash className="h-4 w-4" /> Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Accountant1InvoicesPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  const { data, isLoading, isFetching } = useGetInvoicesQuery({
    ...(search.trim() && { search: search.trim() }),
    ...(filterStatus !== "all" && { status: filterStatus }),
  });

  const invoices = data?.invoices ?? [];
  const total = invoices.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pagedInvoices = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DashboardLayout userRole="accountant" userName="Accountant" notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Invoices</h1>
            <p className="text-sm text-custom-700 mt-1">
              {total > 0 ? <>{total} invoice{total !== 1 ? "s" : ""} total</> : "Manage and track all invoices"}
            </p>
          </div>
          {isFetching && <HiOutlineRefresh className="h-4 w-4 text-custom-400 animate-spin mt-2" />}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-100">
                <HiOutlineDocumentText className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-custom-700">Total</p>
                <p className="text-xl font-bold text-secondary-100">{invoices.length}</p>
              </div>
            </div>
          </Card>
          {[
            { key: "paid",      label: "Paid",      icon: HiOutlineCheckCircle, bg: "bg-emerald-100", text: "text-emerald-600" },
            { key: "cancelled", label: "Cancelled", icon: HiOutlineBan,         bg: "bg-red-100",     text: "text-red-600" },
          ].map(({ key, label, icon: Icon, bg, text }) => (
            <Card key={key} className="!p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon className={`w-5 h-5 ${text}`} />
                </div>
                <div>
                  <p className="text-xs text-custom-700">{label}</p>
                  <p className="text-xl font-bold text-secondary-100">
                    {invoices.filter((i) => i.status === key).length}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-700" />
            <input
              type="text"
              placeholder="Search by invoice #, job, or customer…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-white text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "paid", "cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  filterStatus === s ? "bg-primary-500 text-white" : "bg-custom-100 text-custom-700 hover:bg-custom-200"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-custom-50 border-b border-custom-300">
                <tr>
                  {["Invoice #", "Job", "Customer", "Total", "Status", "Due Date", "Actions"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold text-secondary-100 uppercase ${h === "Actions" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-custom-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <HiOutlineRefresh className="h-6 w-6 animate-spin text-primary-500 mx-auto mb-2" />
                      <span className="text-sm text-custom-500">Loading invoices…</span>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <HiOutlineDocumentText className="h-10 w-10 text-custom-300 mx-auto mb-2" />
                      <p className="text-sm text-custom-700">No invoices found</p>
                      <p className="text-xs text-custom-500 mt-1">Generate invoices from the Payments page after a job is paid.</p>
                    </td>
                  </tr>
                ) : (
                  pagedInvoices.map((inv) => {
                    const sc = STATUS_CONFIG[inv.status] ?? { label: inv.status, bg: "bg-gray-100", color: "text-gray-700" };
                    return (
                      <tr key={inv.id} className="hover:bg-custom-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-primary-600">{inv.invoiceNo}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-secondary-100">{inv.job?.jobNumber ?? "—"}</span>
                          {inv.job?.title && <p className="text-xs text-custom-700 truncate max-w-[140px]">{inv.job.title}</p>}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-secondary-100">
                            {inv.job?.customer?.name ?? inv.customer?.name ?? "—"}
                          </span>
                          {(inv.job?.customer?.phone ?? inv.customer?.phone) && (
                            <p className="text-xs text-custom-700">{inv.job?.customer?.phone ?? inv.customer?.phone}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-secondary-100">
                            {(inv.totalAmount ?? 0).toLocaleString()} <span className="text-xs font-normal text-custom-700">RWF</span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-custom-700">
                            {inv.dueDate ? inv.dueDate.slice(0, 10) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <RowMenu invoice={inv} onView={() => setSelectedInvoice(inv)} onDelete={() => setDeletingInvoice(inv)} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-custom-200">
              <p className="text-xs text-custom-700">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-custom-300 text-sm font-semibold disabled:opacity-40 hover:bg-custom-100 transition-colors">
                  Previous
                </button>
                <span className="text-xs text-custom-700 font-semibold">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-custom-300 text-sm font-semibold disabled:opacity-40 hover:bg-custom-100 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Invoice detail modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
      {deletingInvoice && (
        <DeleteConfirmModal
          invoice={deletingInvoice}
          onClose={() => setDeletingInvoice(null)}
        />
      )}

    </DashboardLayout>
  );
}
