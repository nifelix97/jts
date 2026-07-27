import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineDownload,
  HiOutlineExclamationCircle,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlinePrinter,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineXCircle,
} from "react-icons/hi";
import { DashboardLayout } from "../../components";
import { Button, Card } from "../../components/ui";
import type { Proforma, ProformaItem, ProformaPayload, ProformaStatus } from "../../store/services/proformasService";
import {
  useCreateProformaMutation,
  useDeleteProformaMutation,
  useGetProformasQuery,
  useUpdateProformaMutation,
  useUpdateProformaStatusMutation,
} from "../../store/services/proformasService";
import { useAuth } from "../../context/AuthContext";

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig: Record<ProformaStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:    { label: "Draft",    color: "text-gray-600",   bg: "bg-gray-100",   icon: HiOutlineDocumentText },
  sent:     { label: "Sent",     color: "text-blue-600",   bg: "bg-blue-100",   icon: HiOutlineClock },
  accepted: { label: "Accepted", color: "text-green-600",  bg: "bg-green-100",  icon: HiOutlineCheckCircle },
  rejected: { label: "Rejected", color: "text-red-600",    bg: "bg-red-100",    icon: HiOutlineXCircle },
  expired:  { label: "Expired",  color: "text-orange-600", bg: "bg-orange-100", icon: HiOutlineClock },
};

const selectCls =
  "w-full px-3 py-2 rounded-xl border border-custom-400 bg-style-500 text-secondary-100 " +
  "focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 " +
  "transition-colors text-sm font-[family-name:var(--font-family-primary)]";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Resolve client display name — standalone proformas use clientName field
function getClientName(q: Proforma): string {
  return q.clientName ?? q.customer?.name ?? q.job?.customer?.name ?? "—";
}

function getClientPhone(q: Proforma): string | null {
  return q.clientPhone ?? q.customer?.phone ?? q.job?.customer?.phone ?? null;
}

function getJobLabel(q: Proforma): string | null {
  if (q.jobNumber) return q.jobNumber;
  if (q.job?.jobNumber) return q.job.jobNumber;
  return null;
}

function getJobName(q: Proforma): string | null {
  return q.jobName ?? q.job?.title ?? null;
}

// ─── Shared HTML proforma layout (print + PDF source) ────────────────────────

function buildProformaHtml(q: Proforma): string {
  const clientName  = getClientName(q);
  const clientPhone = getClientPhone(q);
  const jobNo       = getJobLabel(q);
  const jobName     = getJobName(q);
  const date = new Date(q.jobCreatedAt ?? q.createdAt).toLocaleDateString("en-GB").replace(/\//g, "/");
  const proformaLabel = q.proformaNo;

  // Standalone proforma items (new model)
  const standaloneItems: ProformaItem[] = q.items ?? [];
  // Legacy: job items
  const legacyItems = q.job?.jobItems ?? q.job?.items ?? [];

  const itemRows = standaloneItems.length > 0
    ? standaloneItems.map((item, i) => {
        const up = Number(item.unitPrice ?? 0).toLocaleString();
        const tp = Number(item.totalPrice ?? (item.unitPrice * item.qty)).toLocaleString();
        return `<tr>
          <td style="text-align:center">${i + 1}.</td>
          <td><em>${item.description}</em></td>
          <td style="text-align:center">${item.qty}</td>
          <td style="text-align:center">${up}</td>
          <td style="text-align:center">${tp}</td>
        </tr>`;
      }).join("")
    : legacyItems.map((item: any, i: number) => {
        const desc = item.itemName ?? item.stockItem?.name ?? "—";
        const qty  = item.quantityNeeded;
        const up   = item.unitCost != null ? Number(item.unitCost).toLocaleString() : "—";
        const tp   = item.totalCost != null ? Number(item.totalCost).toLocaleString() : "—";
        return `<tr>
          <td style="text-align:center">${i + 1}.</td>
          <td><em>${desc}</em></td>
          <td style="text-align:center">${qty}</td>
          <td style="text-align:center">${up}</td>
          <td style="text-align:center">${tp}</td>
        </tr>`;
      }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${proformaLabel}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111}
    @page{margin-bottom:60px}
    .page{width:210mm;margin:0 auto}
    .body{flex:1;padding:20px 28px}
    .top-info{display:flex;justify-content:space-between;margin-bottom:16px;font-size:12px}
    .doc-title{text-align:center;font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;margin-bottom:0}
    th{background:#fff;border:1px solid #333;padding:7px 8px;text-align:center;font-size:11px;font-weight:bold;text-transform:uppercase}
    td{border:1px solid #333;padding:7px 8px;font-size:11px;vertical-align:top}
    .totals-section{display:flex;justify-content:flex-end;margin-top:0}
    .totals-box{border:1px solid #333;border-top:none;min-width:200px}
    .totals-box .trow{display:flex;justify-content:space-between;gap:24px;padding:5px 10px;border-bottom:1px solid #ddd;font-size:11px;font-weight:bold}
    .totals-box .trow:last-child{border-bottom:none}
    .footer{position:fixed;bottom:0;left:0;right:0;border-top:1px solid #ddd;padding:8px 28px 6px;font-size:9.5px;color:#444;background:#fff}
    .footer-cols{display:flex;justify-content:space-between;margin-bottom:4px}
    .footer-tagline{text-align:center;font-weight:bold;color:#00aeef;font-style:italic;font-size:11px;letter-spacing:1px}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:100%}}
  </style></head><body>
  <div class="page">
    <div class="header">
      <img src="/header.png" alt="Pallotti Presse" style="width:100%;display:block"/>
    </div>
    <div class="body">
      <div class="top-info">
        <div>
          <strong>CLIENT NAME:</strong> ${clientName}
          ${clientPhone ? `<br/><strong>TEL:</strong> ${clientPhone}` : ""}
          ${jobNo       ? `<br/><strong>JOB #:</strong> ${jobNo}`    : ""}
          ${jobName     ? `<br/><strong>JOB:</strong> ${jobName}`    : ""}
        </div>
        <div><strong>Kigali,</strong> ${date}</div>
      </div>
      <div class="doc-title">PROFORMA INVOICE N°${proformaLabel}</div>
      <table>
        <thead><tr><th style="width:40px">No.</th><th>DESCRIPTION</th><th style="width:60px">QTY</th><th style="width:90px">U.P (RWF)</th><th style="width:90px">T.P (RWF)</th></tr></thead>
        <tbody>${itemRows || '<tr><td colspan="5" style="text-align:center;color:#888">No items</td></tr>'}</tbody>
      </table>
      <div class="totals-section">
        <div class="totals-box">
          <div class="trow"><span>SUB-TOTAL</span><span>${(q.subtotal ?? 0).toLocaleString()}</span></div>
          <div class="trow"><span>VAT (${q.taxRate ?? 18}%)</span><span>${(q.taxAmount ?? 0).toLocaleString()}</span></div>
          ${q.discount ? `<div class="trow"><span>DISCOUNT</span><span>-${Number(q.discount).toLocaleString()}</span></div>` : ""}
          <div class="trow"><span>TOTAL TAXES INCLUSIVE</span><span>${(q.totalAmount ?? 0).toLocaleString()}</span></div>
        </div>
      </div>
      ${q.terms ? `<p style="margin-top:14px;font-size:11px"><strong>Terms:</strong> ${q.terms}</p>` : ""}
      ${q.notes ? `<p style="margin-top:8px;font-size:11px"><strong>Notes:</strong> ${q.notes}</p>` : ""}
    </div>
    <div class="footer">
      <div class="footer-cols">
        <div><div>B.P. 863 Kigali - Rwanda</div><div>TIN / <strong>T.V.A. N° 100021520</strong></div></div>
        <div><div>Tél: Reception (+250) 788 313 617 / (+250) 788 304 549</div><div>No. RC: 536 / 09 / NYR</div></div>
        <div><div>E-mail: pallottipresse@yahoo.com</div><div>Compte : BK : <strong>100000174372</strong></div></div>
      </div>
      <div class="footer-tagline">Rapidité · Qualité · Innovation · Esprit d'Equipe</div>
    </div>
  </div>
  </body></html>`;
}

function printProforma(q: Proforma) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildProformaHtml(q));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ─── Download proforma as PDF (print the HTML layout) ────────────────────────

function downloadProforma(q: Proforma): Promise<void> {
  return new Promise((resolve) => {
    const win = window.open("", "_blank");
    if (!win) { resolve(); return; }
    win.document.write(buildProformaHtml(q));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); resolve(); }, 400);
  });
}

// ─── Shared Item Editor (used by Create & Edit modals) ───────────────────────

interface ItemRow { description: string; qty: string; unitPrice: string; }

const emptyRow = (): ItemRow => ({ description: "", qty: "1", unitPrice: "" });

function ItemsEditor({ rows, onChange }: { rows: ItemRow[]; onChange: (rows: ItemRow[]) => void }) {
  const update = (i: number, field: keyof ItemRow, val: string) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r));
    onChange(next);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add    = () => onChange([...rows, emptyRow()]);

  const subtotal = rows.reduce((s, r) => s + (parseFloat(r.unitPrice) || 0) * (parseFloat(r.qty) || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-custom-700 uppercase tracking-wide">Items</span>
        <button type="button" onClick={add}
          className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors">
          <HiOutlinePlus className="w-3.5 h-3.5" /> Add Item
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input
              className={`${selectCls} col-span-6`}
              placeholder="Description"
              value={row.description}
              onChange={(e) => update(i, "description", e.target.value)}
            />
            <input
              className={`${selectCls} col-span-2`}
              placeholder="Qty"
              type="number" min="1"
              value={row.qty}
              onChange={(e) => update(i, "qty", e.target.value)}
            />
            <input
              className={`${selectCls} col-span-3`}
              placeholder="Unit Price"
              type="number" min="0"
              value={row.unitPrice}
              onChange={(e) => update(i, "unitPrice", e.target.value)}
            />
            <button type="button" onClick={() => remove(i)}
              className="col-span-1 text-red-400 hover:text-red-600 transition-colors flex justify-center">
              <HiOutlineTrash className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {rows.length > 0 && (
        <div className="flex justify-end mt-2 text-xs font-semibold text-custom-700">
          Subtotal: <span className="ml-2 text-secondary-100">{subtotal.toLocaleString()} RWF</span>
        </div>
      )}
    </div>
  );
}

// ─── Action Dropdown Menu ────────────────────────────────────────────────────

function ActionMenu({
  q, canDelete, canEdit, onView, onEdit, onPrint, onDownload, onDelete,
}: {
  q: Proforma;
  canDelete: boolean;
  canEdit: boolean;
  onView: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuHeight = 200;
    const openUp = rect.bottom + menuHeight > window.innerHeight - 8;
    setPos({
      top: openUp ? rect.top - menuHeight + window.scrollY : rect.bottom + window.scrollY + 4,
      left: rect.right - 176 + window.scrollX,
      openUp,
    });
    setOpen((p) => !p);
  };

  const item = (label: string, icon: React.ReactNode, onClick: () => void, danger = false) => (
    <button
      onClick={() => { onClick(); setOpen(false); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors hover:bg-custom-100 ${
        danger ? "text-red-500 hover:text-red-600" : "text-secondary-100"
      }`}
    >
      {icon}{label}
    </button>
  );

  return (
    <div className="flex justify-end">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1.5 rounded-lg hover:bg-custom-100 text-custom-700 hover:text-secondary-100 transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-44 bg-style-500 border border-custom-300 rounded-xl shadow-lg overflow-hidden"
        >
          {item("View",     <HiOutlineEye      className="w-4 h-4" />, onView)}
          {q.status === "draft" && canEdit && item("Edit", <HiOutlinePencil className="w-4 h-4" />, onEdit)}
          {item("Print",    <HiOutlinePrinter  className="w-4 h-4" />, onPrint)}
          {item("Download", <HiOutlineDownload className="w-4 h-4" />, onDownload)}
          {q.status === "draft" && canDelete && (
            <>
              <div className="border-t border-custom-200 my-1" />
              {item("Delete", <HiOutlineTrash className="w-4 h-4" />, onDelete, true)}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Create Proforma Modal ────────────────────────────────────────────────────

function CreateProformaModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    jobNumber:    "",
    jobName:      "",
    clientName:   "",
    clientPhone:  "",
    jobCreatedAt: new Date().toISOString().slice(0, 10),
    taxRate:      "18",
    discount:     "0",
    terms:        "",
    notes:        "",
    validUntil:   "",
  });
  const [itemRows, setItemRows] = useState<ItemRow[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [createProforma, { isLoading }] = useCreateProformaMutation();

  const field = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    setError(null);
    const validItems = itemRows.filter((r) => r.description.trim() && parseFloat(r.unitPrice) > 0);
    if (!form.clientName.trim()) { setError("Client name is required."); return; }
    if (validItems.length === 0) { setError("Add at least one item with description and price."); return; }

    const payload: ProformaPayload = {
      jobNumber:    form.jobNumber    || undefined,
      jobName:      form.jobName      || undefined,
      clientName:   form.clientName,
      clientPhone:  form.clientPhone  || undefined,
      jobCreatedAt: form.jobCreatedAt || undefined,
      taxRate:      parseFloat(form.taxRate)   || 18,
      discount:     parseFloat(form.discount)  || 0,
      terms:        form.terms        || undefined,
      notes:        form.notes        || undefined,
      validUntil:   form.validUntil   || undefined,
      items: validItems.map((r) => ({
        description: r.description.trim(),
        qty:         parseFloat(r.qty)       || 1,
        unitPrice:   parseFloat(r.unitPrice) || 0,
      })),
    };

    try {
      await createProforma(payload).unwrap();
      onClose();
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? "Failed to create proforma.");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/60 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-secondary-100">New Proforma Invoice</h3>
            <p className="text-xs text-custom-700 mt-0.5">Standalone — not linked to a job</p>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Client info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Client Name <span className="text-red-500">*</span></label>
              <input name="clientName" value={form.clientName} onChange={field} placeholder="John Doe"
                className={selectCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Client Phone</label>
              <input name="clientPhone" value={form.clientPhone} onChange={field} placeholder="0788000000"
                className={selectCls} />
            </div>
          </div>

          {/* Job info (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Job Number (optional)</label>
              <input name="jobNumber" value={form.jobNumber} onChange={field} placeholder="JOB-2026-001"
                className={selectCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Job Name (optional)</label>
              <input name="jobName" value={form.jobName} onChange={field} placeholder="Business Cards"
                className={selectCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Date</label>
              <input name="jobCreatedAt" type="date" value={form.jobCreatedAt} onChange={field}
                className={selectCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Valid Until</label>
              <input name="validUntil" type="date" value={form.validUntil} onChange={field}
                className={selectCls} />
            </div>
          </div>

          {/* Items */}
          <ItemsEditor rows={itemRows} onChange={setItemRows} />

          {/* Tax / Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Tax Rate (%)</label>
              <input name="taxRate" type="number" min="0" max="100" value={form.taxRate} onChange={field}
                className={selectCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Discount (RWF)</label>
              <input name="discount" type="number" min="0" value={form.discount} onChange={field}
                className={selectCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Terms & Conditions</label>
            <textarea name="terms" value={form.terms} onChange={field} rows={2}
              placeholder="Payment terms, delivery conditions…" className={`${selectCls} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={field} rows={2}
              placeholder="Additional notes…" className={`${selectCls} resize-none`} />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <HiOutlineExclamationCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-custom-300">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating…" : "Create Proforma"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditProformaModal({ quotation, onClose }: { quotation: Proforma; onClose: () => void }) {
  const [form, setForm] = useState({
    clientName:   quotation.clientName  ?? quotation.customer?.name  ?? "",
    clientPhone:  quotation.clientPhone ?? quotation.customer?.phone ?? "",
    jobNumber:    quotation.jobNumber   ?? quotation.job?.jobNumber  ?? "",
    jobName:      quotation.jobName     ?? quotation.job?.title      ?? "",
    jobCreatedAt: (quotation.jobCreatedAt ?? quotation.createdAt ?? "").slice(0, 10),
    taxRate:      String(quotation.taxRate  ?? 18),
    discount:     String(quotation.discount ?? 0),
    terms:        quotation.terms      ?? "",
    notes:        quotation.notes      ?? "",
    validUntil:   quotation.validUntil ? quotation.validUntil.slice(0, 10) : "",
  });

  // Pre-populate items from existing proforma items OR legacy job items
  const initItems = (): ItemRow[] => {
    if (quotation.items && quotation.items.length > 0) {
      return quotation.items.map((it) => ({
        description: it.description,
        qty:         String(it.qty),
        unitPrice:   String(it.unitPrice),
      }));
    }
    const legacy = (quotation.job?.jobItems ?? quotation.job?.items ?? []) as any[];
    if (legacy.length > 0) {
      return legacy.map((it: any) => ({
        description: it.itemName ?? it.stockItem?.name ?? "",
        qty:         String(it.quantityNeeded ?? 1),
        unitPrice:   String(it.unitCost ?? 0),
      }));
    }
    return [emptyRow()];
  };

  const [itemRows, setItemRows] = useState<ItemRow[]>(initItems);
  const [updateProforma, { isLoading }] = useUpdateProformaMutation();
  const [error, setError] = useState<string | null>(null);

  const field = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setError(null);
    const validItems = itemRows.filter((r) => r.description.trim() && parseFloat(r.unitPrice) > 0);
    if (!form.clientName.trim()) { setError("Client name is required."); return; }
    if (validItems.length === 0) { setError("Add at least one item."); return; }

    try {
      await updateProforma({
        id:           quotation.id,
        clientName:   form.clientName   || undefined,
        clientPhone:  form.clientPhone  || undefined,
        jobNumber:    form.jobNumber    || undefined,
        jobName:      form.jobName      || undefined,
        jobCreatedAt: form.jobCreatedAt || undefined,
        taxRate:      parseFloat(form.taxRate)  || 18,
        discount:     parseFloat(form.discount) || 0,
        terms:        form.terms        || undefined,
        notes:        form.notes        || undefined,
        validUntil:   form.validUntil   || undefined,
        items: validItems.map((r) => ({
          description: r.description.trim(),
          qty:         parseFloat(r.qty)       || 1,
          unitPrice:   parseFloat(r.unitPrice) || 0,
        })),
      }).unwrap();
      onClose();
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? "Failed to update proforma.");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/60 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-secondary-100">Edit Proforma</h3>
            <p className="text-xs text-custom-700 mt-0.5">{quotation.proformaNo}</p>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Client Name <span className="text-red-500">*</span></label>
              <input name="clientName" value={form.clientName} onChange={field} className={selectCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Client Phone</label>
              <input name="clientPhone" value={form.clientPhone} onChange={field} className={selectCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Job Number</label>
              <input name="jobNumber" value={form.jobNumber} onChange={field} className={selectCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Job Name</label>
              <input name="jobName" value={form.jobName} onChange={field} className={selectCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Date</label>
              <input name="jobCreatedAt" type="date" value={form.jobCreatedAt} onChange={field} className={selectCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Valid Until</label>
              <input name="validUntil" type="date" value={form.validUntil} onChange={field} className={selectCls} />
            </div>
          </div>

          <ItemsEditor rows={itemRows} onChange={setItemRows} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Tax Rate (%)</label>
              <input name="taxRate" type="number" min="0" max="100" value={form.taxRate} onChange={field} className={selectCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Discount (RWF)</label>
              <input name="discount" type="number" min="0" value={form.discount} onChange={field} className={selectCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Terms & Conditions</label>
            <textarea name="terms" value={form.terms} onChange={field} rows={2}
              placeholder="Payment terms…" className={`${selectCls} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={field} rows={2}
              placeholder="Additional notes…" className={`${selectCls} resize-none`} />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <HiOutlineExclamationCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-custom-300">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  quotation,
  onClose,
  onEdit,
  onDeleted,
  canDelete,
  canEdit,
}: {
  quotation: Proforma;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  canDelete: boolean;
  canEdit: boolean;
}) {
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateProformaStatusMutation();
  const [deleteProforma, { isLoading: deleting }]     = useDeleteProformaMutation();
  const [confirmDelete, setConfirmDelete]             = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cfg  = statusConfig[quotation.status];
  const Icon = cfg.icon;

  const clientName  = getClientName(quotation);
  const clientPhone = getClientPhone(quotation);
  const jobNo       = getJobLabel(quotation);
  const jobName     = getJobName(quotation);

  // Prefer standalone items; fall back to legacy job items
  const standaloneItems: ProformaItem[] = quotation.items ?? [];
  const legacyItems = (quotation.job?.jobItems ?? quotation.job?.items ?? []) as any[];
  const hasItems = standaloneItems.length > 0 || legacyItems.length > 0;

  const handleStatus = async (status: ProformaStatus) => {
    setError(null);
    try {
      await updateStatus({ id: quotation.id, status }).unwrap();
      onClose();
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? "Failed to update status.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProforma(quotation.id).unwrap();
      onDeleted();
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      setError(err?.data?.message ?? "Failed to delete proforma.");
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/60 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-secondary-100">{quotation.proformaNo}</h3>
            <p className="text-sm text-custom-700 mt-0.5">
              {clientName}{clientPhone ? ` · ${clientPhone}` : ""}
            </p>
            {(jobNo || jobName) && (
              <p className="text-xs text-custom-600 mt-0.5">
                {jobNo && <span className="font-semibold text-primary-500">{jobNo}</span>}
                {jobNo && jobName && " · "}
                {jobName}
              </p>
            )}
            <span className={`inline-flex items-center gap-1.5 mt-2 text-xs font-bold px-3 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </span>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Items table */}
          {hasItems && (
            <div>
              <p className="text-xs font-bold text-custom-700 uppercase tracking-wide mb-2">Items</p>
              <div className="rounded-xl border border-custom-300 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-custom-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-custom-700">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-custom-700">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-custom-700">Unit Price</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-custom-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-custom-200">
                    {standaloneItems.length > 0
                      ? standaloneItems.map((item) => (
                          <tr key={item.id ?? item.description}>
                            <td className="px-4 py-2.5 text-secondary-100 font-medium">{item.description}</td>
                            <td className="px-3 py-2.5 text-right text-secondary-100">{item.qty}</td>
                            <td className="px-3 py-2.5 text-right text-secondary-100">{Number(item.unitPrice).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-secondary-100">
                              {Number(item.totalPrice ?? item.unitPrice * item.qty).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      : legacyItems.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2.5 text-secondary-100 font-medium">{item.itemName ?? item.stockItem?.name ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right text-secondary-100">{item.quantityNeeded}</td>
                            <td className="px-3 py-2.5 text-right text-secondary-100">{item.unitCost != null ? Number(item.unitCost).toLocaleString() : "—"}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-secondary-100">{item.totalCost != null ? Number(item.totalCost).toLocaleString() : "—"}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="rounded-xl bg-custom-50 border border-custom-300 p-4 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-custom-700">Subtotal</span>
              <span className="font-semibold text-secondary-100">{Number(quotation.subtotal ?? 0).toLocaleString()} RWF</span>
            </div>
            {quotation.discount ? (
              <div className="flex justify-between">
                <span className="text-custom-700">Discount</span>
                <span className="font-semibold text-red-500">-{Number(quotation.discount).toLocaleString()} RWF</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-custom-700">VAT ({quotation.taxRate ?? 18}%)</span>
              <span className="font-semibold text-secondary-100">{Number(quotation.taxAmount ?? 0).toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between border-t border-custom-300 pt-1.5 mt-1">
              <span className="font-bold text-secondary-100">Total</span>
              <span className="text-xl font-bold text-primary-500">{Number(quotation.totalAmount ?? 0).toLocaleString()} RWF</span>
            </div>
          </div>

          {/* Terms / Notes / Validity */}
          {(quotation.terms || quotation.notes || quotation.validUntil) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {quotation.validUntil && (
                <div>
                  <p className="text-xs text-custom-700 mb-1">Valid Until</p>
                  <p className="font-semibold text-secondary-100">{quotation.validUntil.slice(0, 10)}</p>
                </div>
              )}
              {quotation.terms && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-custom-700 mb-1">Terms</p>
                  <p className="text-secondary-100">{quotation.terms}</p>
                </div>
              )}
              {quotation.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-custom-700 mb-1">Notes</p>
                  <p className="text-secondary-100">{quotation.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Delete confirmation */}
          {confirmDelete && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <HiOutlineExclamationCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 flex-1">Delete this proforma? This cannot be undone.</p>
              <button onClick={() => setConfirmDelete(false)}
                className="text-xs font-semibold text-custom-700 hover:text-secondary-100 px-2 py-1 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg transition-colors disabled:opacity-50">
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <HiOutlineExclamationCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-custom-300">
          <div className="flex gap-2 flex-wrap">
            {quotation.status === "draft" && canEdit && (
              <>
                <Button onClick={onEdit} variant="outline">
                  <HiOutlinePencil className="w-4 h-4 mr-1" /> Edit
                </Button>
                {canDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-sm font-semibold"
                  >
                    <HiOutlineTrash className="w-4 h-4" /> Delete
                  </button>
                )}
              </>
            )}
            {quotation.status === "sent" && (
              <>
                <Button onClick={() => handleStatus("accepted")} disabled={updatingStatus}
                  className="bg-green-500 hover:bg-green-600">
                  Mark Accepted
                </Button>
                <Button onClick={() => handleStatus("rejected")} disabled={updatingStatus}
                  variant="outline">
                  Mark Rejected
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => printProforma(quotation)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-custom-300 text-custom-700 hover:bg-custom-100 transition-colors text-sm font-semibold">
              <HiOutlinePrinter className="w-4 h-4" /> Print
            </button>
            <button onClick={() => downloadProforma(quotation).catch(console.error)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-custom-300 text-custom-700 hover:bg-custom-100 transition-colors text-sm font-semibold">
              <HiOutlineDownload className="w-4 h-4" /> Save
            </button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProformasPage() {
  const { userRole } = useAuth();
  const isReadOnly = userRole === "accountant";
  const canDelete  = ["admin", "daf"].includes(userRole ?? "");
  const canEdit    = !["accountant"].includes(userRole ?? "");
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<ProformaStatus | "all">("all");
  const [page, setPage]                 = useState(1);
  const [selected, setSelected]         = useState<Proforma | null>(null);
  const [editing, setEditing]           = useState<Proforma | null>(null);
  const [creating, setCreating]         = useState(false);

  const { data, isLoading, isError, refetch } = useGetProformasQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search.trim() || undefined,
    page,
    limit: 20,
  });

  const quotations = data?.proformas ?? [];
  const pagination = data?.pagination;

  const draftCount    = quotations.filter((q) => q.status === "draft").length;
  const sentCount     = quotations.filter((q) => q.status === "sent").length;
  const acceptedValue = quotations
    .filter((q) => q.status === "accepted")
    .reduce((s, q) => s + (q.totalAmount ?? q.subtotal ?? 0), 0);

  return (
    <DashboardLayout notificationCount={sentCount}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">PROFORMA INVOICES</h1>
            <p className="text-sm text-custom-700 mt-1">
              Standalone proposals — created independently, not linked to jobs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-custom-700 text-sm"
            >
              <HiOutlineRefresh className="w-4 h-4" />
              <span className="font-semibold hidden sm:inline">Refresh</span>
            </button>
            {!isReadOnly && (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 transition-colors text-white text-sm font-semibold"
              >
                <HiOutlinePlus className="w-4 h-4" />
                New Proforma
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="!p-4">
            <p className="text-xs text-custom-700 mb-1">Total</p>
            <p className="text-2xl font-bold text-secondary-100">{isLoading ? "—" : quotations.length}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs text-custom-700 mb-1">Draft</p>
            <p className="text-2xl font-bold text-gray-500">{isLoading ? "—" : draftCount}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs text-custom-700 mb-1">Sent</p>
            <p className="text-2xl font-bold text-blue-500">{isLoading ? "—" : sentCount}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs text-custom-700 mb-1">Accepted Value</p>
            <p className="text-2xl font-bold text-emerald-600">
              {isLoading ? "—" : acceptedValue >= 1_000_000
                ? `${(acceptedValue / 1_000_000).toFixed(1)}M`
                : `${acceptedValue.toLocaleString()}`}
            </p>
          </Card>
        </div>

        {/* Search + Status filters */}
        <Card className="!p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-700" />
              <input
                type="text"
                placeholder="Search by performa #, job title, or customer…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200 transition-colors"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(["all", "draft", "sent", "accepted", "rejected", "expired"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === s
                      ? "bg-primary-500 text-white"
                      : "border border-custom-300 text-custom-700 hover:bg-custom-100"
                  }`}
                >
                  {s === "all" ? "All" : statusConfig[s].label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Table */}
        {isLoading ? (
          <Card className="!p-0 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-custom-200 animate-pulse">
                <div className="h-4 w-28 bg-custom-200 rounded" />
                <div className="h-4 w-40 bg-custom-200 rounded" />
                <div className="ml-auto h-6 w-20 bg-custom-200 rounded-full" />
              </div>
            ))}
          </Card>
        ) : isError ? (
          <Card className="!p-12 text-center">
            <HiOutlineExclamationCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-secondary-100 font-semibold">Failed to load proformas</p>
            <button onClick={() => refetch()} className="mt-4 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold">Retry</button>
          </Card>
        ) : quotations.length === 0 ? (
          <Card className="!p-12 text-center">
            <HiOutlineDocumentText className="w-10 h-10 text-custom-400 mx-auto mb-3" />
            <p className="text-secondary-100 font-semibold">No proformas found</p>
            <p className="text-sm text-custom-700 mt-1 mb-4">Create your first standalone proforma invoice</p>
            {!isReadOnly && (
              <button onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
                <HiOutlinePlus className="w-4 h-4" /> New Proforma
              </button>
            )}
          </Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-custom-100 border-b border-custom-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-custom-700 uppercase">Proforma #</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-custom-700 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-custom-700 uppercase">Job</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-custom-700 uppercase">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-custom-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-custom-700 uppercase">Valid Until</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-custom-700 uppercase">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-custom-200">
                  {quotations.map((q) => {
                    const cfg       = statusConfig[q.status] ?? statusConfig.draft;
                    const Icon      = cfg.icon;
                    const cName     = getClientName(q);
                    const cPhone    = getClientPhone(q);
                    const jNo       = getJobLabel(q);
                    const jName     = getJobName(q);
                    const total     = q.totalAmount ?? q.subtotal ?? 0;
                    return (
                      <tr key={q.id} className="hover:bg-custom-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-primary-500">{q.proformaNo}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-secondary-100">{cName}</p>
                          {cPhone && <p className="text-xs text-custom-700">{cPhone}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {jNo || jName ? (
                            <div>
                              {jNo   && <p className="font-semibold text-primary-500 text-xs">{jNo}</p>}
                              {jName && <p className="text-xs text-custom-700 truncate max-w-[140px]">{jName}</p>}
                            </div>
                          ) : <span className="text-custom-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-secondary-100">
                          {Number(total).toLocaleString()} RWF
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-custom-700 text-xs">
                          {q.validUntil ? q.validUntil.slice(0, 10) : "—"}
                        </td>
                        <td className="px-4 py-3 text-custom-700 text-xs">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <ActionMenu
                            q={q}
                            canDelete={canDelete}
                            canEdit={canEdit}
                            onView={() => setSelected(q)}
                            onEdit={() => setEditing(q)}
                            onPrint={() => printProforma(q)}
                            onDownload={() => downloadProforma(q).catch(console.error)}
                            onDelete={() => setSelected(q)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-custom-300 text-sm">
                <span className="text-custom-700">
                  {pagination.total} total · page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-custom-300 text-custom-700 hover:bg-custom-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-custom-300 text-custom-700 hover:bg-custom-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Create modal */}
      {creating && (
        <CreateProformaModal onClose={() => setCreating(false)} />
      )}

      {/* Detail modal */}
      {selected && (
        <DetailModal
          quotation={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
          onDeleted={() => setSelected(null)}
          canDelete={canDelete}
          canEdit={canEdit}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EditProformaModal
          quotation={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </DashboardLayout>
  );
}
