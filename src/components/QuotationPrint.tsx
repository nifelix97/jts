import type { JobDetails, JobItem } from "../store/services/jobsService";

export function printQuotation(d: JobDetails, jobItems?: JobItem[]) {
  const items = jobItems ?? d.jobItems ?? [];
  console.log("[printQuotation] jobItems received:", items);
  console.log("[printQuotation] first item sample:", items[0]);
  const amount = d.amount != null ? Number(d.amount).toLocaleString() : "—";
  const date = new Date().toLocaleDateString("en-RW", { day: "2-digit", month: "long", year: "numeric" });
  const due = d.dueDate ? d.dueDate.split("T")[0] : "—";

  const rows = items.length
    ? items
        .map((item, i) => {
          const name = item.stockItem?.itemName ?? item.stockItem?.name ?? item.itemName ?? `Item ${i + 1}`;
          const unit = item.stockItem?.unit ?? item.unit ?? "";
          const unitCostStr = item.unitCost != null ? `${Number(item.unitCost).toLocaleString()} RWF` : "—";
          const totalStr = item.totalCost != null ? `${Number(item.totalCost).toLocaleString()} RWF` : "—";
          return `<tr>
            <td>${i + 1}</td>
            <td>${name}</td>
            <td>${Number(item.quantityNeeded)}${unit ? " " + unit : ""}</td>
            <td>${unitCostStr}</td>
            <td>${totalStr}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="5" style="text-align:center;color:#888">No items listed</td></tr>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Quotation – ${d.jobNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #222; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; display: flex; flex-direction: column; }

  /* ── HEADER ── */
  .header img { width: 100%; display: block; }

  /* ── BODY ── */
  .body { flex: 1; padding: 24px 28px; }
  .doc-title { text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 2px; }
  .doc-meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11px; color: #555; }
  .section-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 4px; letter-spacing: 1px; }
  .client-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px 14px; margin-bottom: 18px; }
  .client-box p { margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #00aeef; color: #fff; padding: 7px 10px; text-align: left; font-size: 11px; }
  td { padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
  tr:nth-child(even) td { background: #f7fbff; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 18px; }
  .totals-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px 18px; min-width: 200px; }
  .totals-box .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .totals-box .total-row { font-weight: bold; font-size: 13px; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 4px; }
  .job-details { border: 1px solid #ddd; border-radius: 4px; padding: 10px 14px; margin-bottom: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .job-details p { font-size: 11px; }
  .job-details span { font-weight: bold; }
  .notes { border-left: 3px solid #00aeef; padding: 8px 12px; background: #f0faff; font-size: 11px; margin-bottom: 18px; }
  .signature { display: flex; justify-content: space-between; margin-top: 30px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 10px; color: #555; }

  /* ── FOOTER ── */
  .footer { border-top: 1px solid #ddd; padding: 10px 28px 6px; font-size: 9.5px; color: #444; }
  .footer-cols { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .footer-tagline { text-align: center; font-weight: bold; color: #00aeef; font-style: italic; font-size: 11px; letter-spacing: 1px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 100%; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <img src="/header.png" alt="Santrack Header" />
  </div>

  <!-- BODY -->
  <div class="body">
    <div class="doc-title">Quotation</div>
    <div class="doc-meta">
      <span>Ref: <strong>${d.jobNumber}</strong></span>
      <span>Date: <strong>${date}</strong></span>
      <span>Valid until: <strong>${due}</strong></span>
    </div>

    <!-- Client -->
    <div class="section-label">Bill To</div>
    <div class="client-box">
      <p><strong>${d.customer?.name ?? "—"}</strong></p>
      ${d.customer?.phone ? `<p>Tel: ${d.customer.phone}</p>` : ""}
      ${d.customer?.email ? `<p>Email: ${d.customer.email}</p>` : ""}
    </div>

    <!-- Job details -->
    <div class="section-label">Job Details</div>
    <div class="job-details">
      <p>Title: <span>${d.title}</span></p>
      ${d.jobType ? `<p>Type: <span>${d.jobType}</span></p>` : ""}
      ${d.quantity ? `<p>Quantity: <span>${d.quantity}</span></p>` : ""}
      ${d.size ? `<p>Size: <span>${d.size}</span></p>` : ""}
      ${d.colorMode ? `<p>Color Mode: <span>${d.colorMode}</span></p>` : ""}
      ${d.bindingType ? `<p>Binding: <span>${d.bindingType}</span></p>` : ""}
    </div>

    <!-- Items table -->
    ${items.length > 0 ? `
    <div class="section-label">Materials / Items</div>
    <table>
      <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : ""}

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="row total-row"><span>TOTAL AMOUNT</span><span>${amount} RWF</span></div>
      </div>
    </div>

    ${d.description ? `<div class="notes"><strong>Description:</strong> ${d.description}</div>` : ""}
    ${d.notes ? `<div class="notes"><strong>Notes:</strong> ${d.notes}</div>` : ""}

    <!-- Signatures -->
    <div class="signature">
      <div class="sig-box">
        <div class="sig-line">Prepared by</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">Approved by</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">Client Signature</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-cols">
      <div>
        <div>B.P. 863 Kigali - Rwanda</div>
        <div>TIN / <strong>T.V.A. N° 100021520</strong></div>
      </div>
      <div>
        <div>Tél: Reception (+250) 788 313 817 / (+250) 788 304 549</div>
        <div>No. RC: 536 / 09 / NYR</div>
      </div>
      <div>
        <div>E-mail: Santrackpresse@yahoo.com</div>
        <div>Compte : BK : <strong>100000174372</strong></div>
      </div>
    </div>
    <div class="footer-tagline">Rapidité · Qualité · Innovation · Esprit d'Equipe</div>
  </div>

</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
