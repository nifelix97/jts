import { useState } from "react";
import {
  HiOutlineCash, HiOutlineSearch, HiOutlineRefresh, HiOutlinePlus,
  HiOutlineClipboardList, HiOutlineShoppingCart, HiOutlineCog,
  HiOutlineLightBulb, HiOutlineOfficeBuilding, HiOutlineClock,
  HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineX,
  HiOutlinePencil, HiOutlineTrash, HiOutlineThumbUp, HiOutlineBan, HiOutlineEye,
} from "react-icons/hi";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/DashboardLayout";
import { Card } from "../../components/ui";
import PhoneInput from "../../components/ui/PhoneInput";
import {
  useGetOutstandsQuery, useCreateOutstandMutation,
  useUpdateOutstandMutation, useApproveOutstandMutation,
  useRejectOutstandMutation, usePayOutstandMutation,
  useDeleteOutstandMutation,
  type Outstand, type OutstandCategory, type OutstandStatus,
} from "../../store/services/outstandsService";

const PAGE_SIZE = 15;
const inputCls = "w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors";
const DEFAULT_CATEGORIES: OutstandCategory[] = ["purchase", "utility", "maintenance", "supplier", "other"];





const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  purchase:    { label: "Purchase",    icon: <HiOutlineShoppingCart className="w-4 h-4" />, color: "bg-blue-100 text-blue-700" },
  utility:     { label: "Utility",     icon: <HiOutlineLightBulb className="w-4 h-4" />,   color: "bg-yellow-100 text-yellow-700" },
  maintenance: { label: "Maintenance", icon: <HiOutlineCog className="w-4 h-4" />,          color: "bg-orange-100 text-orange-700" },
  supplier:    { label: "Supplier",    icon: <HiOutlineOfficeBuilding className="w-4 h-4" />,color: "bg-purple-100 text-purple-700" },
  other:       { label: "Other",       icon: <HiOutlineClipboardList className="w-4 h-4" />,color: "bg-gray-100 text-gray-700" },
};

const statusConfig: Record<OutstandStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: "Pending",  color: "bg-yellow-100 text-yellow-700",   icon: <HiOutlineClock className="w-3.5 h-3.5" /> },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-700",       icon: <HiOutlineCheckCircle className="w-3.5 h-3.5" /> },
  paid:     { label: "Paid",     color: "bg-emerald-100 text-emerald-700", icon: <HiOutlineCash className="w-3.5 h-3.5" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700",         icon: <HiOutlineExclamationCircle className="w-3.5 h-3.5" /> },
};


// ─── Add Modal ───────────────────────────────────────────────────────────────
function AddRecordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ description: "", category: "purchase" as OutstandCategory, amount: "", recipient: "", recipientPhone: "", recipientRole: "", purpose: "", notes: "" });
  const [categories, setCategories] = useState<OutstandCategory[]>(DEFAULT_CATEGORIES);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [createOutstand, { isLoading }] = useCreateOutstandMutation();
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (key === "category" && e.target.value === "__add_new__") { setAddingCategory(true); return; }
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };
  const confirmNewCategory = () => {
    const trimmed = newCategory.trim().toLowerCase().replace(/\s+/g, "-") as OutstandCategory;
    if (!trimmed) return;
    if (!categories.includes(trimmed)) setCategories(prev => [...prev, trimmed]);
    setForm(prev => ({ ...prev, category: trimmed }));
    setAddingCategory(false); setNewCategory("");
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipientPhone || form.recipientPhone.replace(/\D/g, "").length < 9) { setPhoneError("Enter a valid phone number."); return; }
    setPhoneError("");
    try {
      await createOutstand({ description: form.description, category: form.category, amount: Number(form.amount), recipientName: form.recipient, recipientPhone: form.recipientPhone, recipientRole: form.recipientRole, purpose: form.purpose, notes: form.notes || undefined }).unwrap();
      toast.success("Expense recorded"); onClose();
    } catch (err: any) { toast.error(err?.data?.message ?? "Failed to record expense"); }
  };
  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-3xl w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <div><h3 className="text-xl font-bold text-secondary-100">Record Expense</h3><p className="text-sm text-custom-700 mt-0.5">Record money going out of the company</p></div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Description *</label><textarea value={form.description} onChange={set("description")} rows={3} placeholder="What is this payment for?" className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Category *</label>
              {addingCategory ? (<div className="flex gap-1"><input autoFocus value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmNewCategory(); } if (e.key === "Escape") { setAddingCategory(false); setNewCategory(""); } }} placeholder="New category" className={inputCls} /><button type="button" onClick={confirmNewCategory} className="px-3 py-2 rounded-xl bg-primary-500 text-white text-xs font-semibold whitespace-nowrap">Add</button><button type="button" onClick={() => { setAddingCategory(false); setNewCategory(""); }} className="px-2 py-2 rounded-xl border border-custom-300 text-custom-700"><HiOutlineX className="w-4 h-4" /></button></div>) : (<select value={form.category} onChange={set("category")} className={inputCls}>{categories.map(c => <option key={c} value={c}>{categoryConfig[c]?.label ?? c}</option>)}<option value="__add_new__">+ Add new category</option></select>)}
            </div>
            <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Recipient Name *</label><input value={form.recipient} onChange={set("recipient")} placeholder="Full name" className={inputCls} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Recipient Phone *</label><PhoneInput value={form.recipientPhone} onChange={val => { setForm(prev => ({ ...prev, recipientPhone: val })); setPhoneError(""); }} error={phoneError} /></div>
            <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Recipient Role *</label><input value={form.recipientRole} onChange={set("recipientRole")} placeholder="e.g. Supplier, Staff" className={inputCls} required /></div>
          </div>
          <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Amount (RWF) *</label><input type="number" min="0" value={form.amount} onChange={set("amount")} placeholder="0" className={inputCls} required /></div>
          <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Purpose *</label><textarea value={form.purpose} onChange={set("purpose")} rows={2} placeholder="Why is this payment being made?" className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none" required /></div>
          <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Notes <span className="font-normal text-custom-700">(optional)</span></label><textarea value={form.notes} onChange={set("notes")} rows={2} className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none" /></div>
          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40">{isLoading ? "Recording..." : "Record Expense"}</button>
          </div>
        </form>
      </Card>
    </div>
  );
}

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
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-secondary-100">Reject Expense</h3><button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-5 h-5" /></button></div>
        <p className="text-sm text-custom-700 mb-4">Rejecting <span className="font-bold text-secondary-100">{record.ref}</span>. Please provide a reason.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Reason for rejection..." className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-red-400 transition-colors resize-none" required />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40">{isLoading ? "Rejecting..." : "Reject"}</button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ record, onClose }: { record: Outstand; onClose: () => void }) {
  const [form, setForm] = useState({ description: record.description, category: record.category, amount: String(record.totalAmount), recipient: record.recipientName ?? "", recipientPhone: record.recipientPhone ?? "", recipientRole: record.recipientRole ?? "", purpose: record.purpose, notes: record.notes ?? "" });
  const [categories, setCategories] = useState<OutstandCategory[]>(DEFAULT_CATEGORIES);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [updateOutstand, { isLoading }] = useUpdateOutstandMutation();
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (key === "category" && e.target.value === "__add_new__") { setAddingCategory(true); return; }
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };
  const confirmNewCategory = () => {
    const trimmed = newCategory.trim().toLowerCase().replace(/\s+/g, "-") as OutstandCategory;
    if (!trimmed) return;
    if (!categories.includes(trimmed)) setCategories(prev => [...prev, trimmed]);
    setForm(prev => ({ ...prev, category: trimmed }));
    setAddingCategory(false); setNewCategory("");
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipientPhone || form.recipientPhone.replace(/\D/g, "").length < 9) { setPhoneError("Enter a valid phone number."); return; }
    setPhoneError("");
    try {
      await updateOutstand({ id: record.id, data: { description: form.description, category: form.category, amount: Number(form.amount), recipientName: form.recipient, recipientPhone: form.recipientPhone, recipientRole: form.recipientRole, purpose: form.purpose, notes: form.notes || undefined } }).unwrap();
      toast.success("Expense updated"); onClose();
    } catch (err: any) { toast.error(err?.data?.message ?? "Failed to update"); }
  };
  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-3xl w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <div><h3 className="text-xl font-bold text-secondary-100">Edit Expense <span className="text-primary-500">{record.ref}</span></h3><p className="text-sm text-custom-700 mt-0.5">Update expense details</p></div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Description *</label><textarea value={form.description} onChange={set("description")} rows={3} className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Category *</label>
              {addingCategory ? (<div className="flex gap-1"><input autoFocus value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmNewCategory(); } if (e.key === "Escape") { setAddingCategory(false); setNewCategory(""); } }} className={inputCls} /><button type="button" onClick={confirmNewCategory} className="px-3 py-2 rounded-xl bg-primary-500 text-white text-xs font-semibold whitespace-nowrap">Add</button><button type="button" onClick={() => { setAddingCategory(false); setNewCategory(""); }} className="px-2 py-2 rounded-xl border border-custom-300 text-custom-700"><HiOutlineX className="w-4 h-4" /></button></div>) : (<select value={form.category} onChange={set("category")} className={inputCls}>{categories.map(c => <option key={c} value={c}>{categoryConfig[c]?.label ?? c}</option>)}<option value="__add_new__">+ Add new category</option></select>)}
            </div>
            <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Recipient Name *</label><input value={form.recipient} onChange={set("recipient")} className={inputCls} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Recipient Phone *</label><PhoneInput value={form.recipientPhone} onChange={val => { setForm(prev => ({ ...prev, recipientPhone: val })); setPhoneError(""); }} error={phoneError} /></div>
            <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Recipient Role *</label><input value={form.recipientRole} onChange={set("recipientRole")} className={inputCls} required /></div>
          </div>
          <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Amount (RWF) *</label><input type="number" min="0" value={form.amount} onChange={set("amount")} className={inputCls} required /></div>
          <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Purpose *</label><textarea value={form.purpose} onChange={set("purpose")} rows={2} className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none" required /></div>
          <div><label className="block text-sm font-semibold text-secondary-100 mb-1">Notes <span className="font-normal text-custom-700">(optional)</span></label><textarea value={form.notes} onChange={set("notes")} rows={2} className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none" /></div>
          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40">{isLoading ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Detail Modal (with delete) ───────────────────────────────────────────────
function DetailModal({ record, onClose, onEdit }: { record: Outstand; onClose: () => void; onEdit: () => void }) {
  const cat = categoryConfig[record.category] ?? categoryConfig.other;
  const st  = statusConfig[record.status];
  const [action, setAction] = useState<"approve" | "pay" | "delete" | "reject" | null>(null);
  const [approveOutstand, { isLoading: approving }] = useApproveOutstandMutation();
  const [payOutstand,     { isLoading: paying }]    = usePayOutstandMutation();
  const [deleteOutstand,  { isLoading: deleting }]  = useDeleteOutstandMutation();
  return (
    <>
      {action === "reject" && (
        <RejectModal record={record} onClose={() => { setAction(null); onClose(); }} />
      )}
      {action === "approve" && (
        <ConfirmModal
          title="Approve Expense"
          message={<>Approve <strong>{record.ref}</strong> — <strong>{Number(record.totalAmount).toLocaleString()} RWF</strong>?</>}
          confirmLabel="Approve" confirmCls="bg-emerald-500 hover:bg-emerald-600" loading={approving}
          onConfirm={async () => { try { await approveOutstand(record.id).unwrap(); toast.success("Approved"); onClose(); } catch { toast.error("Failed"); } setAction(null); }}
          onClose={() => setAction(null)}
        />
      )}
      {action === "pay" && (
        <ConfirmModal
          title="Mark as Paid"
          message={<>Mark <strong>{record.ref}</strong> as paid?</>}
          confirmLabel="Yes, Mark Paid" confirmCls="bg-blue-500 hover:bg-blue-600" loading={paying}
          onConfirm={async () => { try { await payOutstand(record.id).unwrap(); toast.success("Marked as paid"); onClose(); } catch { toast.error("Failed"); } setAction(null); }}
          onClose={() => setAction(null)}
        />
      )}
      {action === "delete" && (
        <ConfirmModal
          title="Delete Expense"
          message={<>Permanently delete <strong>{record.ref}</strong>? This cannot be undone.</>}
          confirmLabel="Delete" confirmCls="bg-red-500 hover:bg-red-600" loading={deleting}
          onConfirm={async () => { try { await deleteOutstand(record.id).unwrap(); toast.success("Deleted"); onClose(); } catch { toast.error("Failed to delete"); } setAction(null); }}
          onClose={() => setAction(null)}
        />
      )}
      <div className="fixed inset-0 bg-secondary-100/50 z-40 flex items-center justify-center p-4">
        <Card className="!p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <div><h3 className="text-lg font-bold text-secondary-100">{record.ref}</h3><p className="text-sm text-custom-700 mt-0.5">{record.description}</p></div>
            <button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-2 mb-4">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cat.color}`}>{cat.icon}{cat.label}</span>
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${st.color}`}>{st.icon}{st.label}</span>
          </div>
          <div className="rounded-xl bg-custom-50 border border-custom-200 divide-y divide-custom-200 mb-4">
            {([
              ["Recipient", record.recipientName], ["Phone", record.recipientPhone], ["Role", record.recipientRole],
              ["Amount", `${Number(record.totalAmount).toLocaleString()} RWF`],
              ["Recorded by", record.recordedBy?.name ?? "—"],
              ["Date", new Date(record.createdAt).toLocaleString("en-RW", { dateStyle: "medium", timeStyle: "short" })],
              ...(record.approvedBy ? [["Approved by", record.approvedBy.name]] : []),
              ...(record.paidAt ? [["Paid at", new Date(record.paidAt).toLocaleDateString()]] : []),
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-custom-700">{label}</span>
                <span className="font-semibold text-secondary-100 text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>
          <div className="mb-4"><p className="text-xs font-semibold text-custom-700 mb-1 uppercase tracking-wide">Purpose</p><p className="text-sm text-secondary-100">{record.purpose}</p></div>
          {record.notes && <div className="px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm mb-4">{record.notes}</div>}
          {record.rejectionNote && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-4">Rejected: {record.rejectionNote}</div>}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-custom-200">
            {record.status === "pending" && (
              <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors"><HiOutlinePencil className="w-4 h-4" /> Edit</button>
            )}
            {record.status === "pending" && (
              <button onClick={() => setAction("approve")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"><HiOutlineThumbUp className="w-4 h-4" /> Approve</button>
            )}
            {record.status === "pending" && (
              <button onClick={() => setAction("reject")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"><HiOutlineBan className="w-4 h-4" /> Reject</button>
            )}
            {record.status === "approved" && (
              <button onClick={() => setAction("pay")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"><HiOutlineCash className="w-4 h-4" /> Mark as Paid</button>
            )}
            {record.status !== "paid" && (
              <button onClick={() => setAction("delete")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"><HiOutlineTrash className="w-4 h-4" /> Delete</button>
            )}
            <button onClick={onClose} className="ml-auto px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Close</button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmCls, onConfirm, onClose, loading }: {
  title: string; message: React.ReactNode; confirmLabel: string; confirmCls: string;
  onConfirm: () => void; onClose: () => void; loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-secondary-100">{title}</h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-custom-700 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40 ${confirmCls}`}>
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Inline row actions ───────────────────────────────────────────────────────
function InlineActions({ record, approveOutstand, payOutstand, deleteOutstand, onEdit, onView }: {
  record: Outstand;
  approveOutstand: (id: string) => any;
  payOutstand: (id: string) => any;
  deleteOutstand: (id: string) => any;
  onEdit: () => void;
  onView: () => void;
}) {
  const [confirm, setConfirm] = useState<"approve" | "pay" | "delete" | null>(null);
  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button onClick={onView} title="View"
        className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-500 transition-colors">
        <HiOutlineEye className="w-4 h-4" />
      </button>
      {record.status === "pending" && (
        <button onClick={() => onEdit()} title="Edit"
          className="p-1.5 rounded-lg hover:bg-custom-100 text-custom-700 hover:text-secondary-100 transition-colors">
          <HiOutlinePencil className="w-4 h-4" />
        </button>
      )}
      {record.status !== "paid" && (
        <button onClick={() => setConfirm("delete")} title="Delete"
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
          <HiOutlineTrash className="w-4 h-4" />
        </button>
      )}
      {confirm === "approve" && (
        <ConfirmModal
          title="Approve Expense"
          message={<>Approve <strong>{record.ref}</strong> — <strong>{Number(record.totalAmount).toLocaleString()} RWF</strong>?</>}
          confirmLabel="Approve" confirmCls="bg-emerald-500 hover:bg-emerald-600"
          onConfirm={async () => { try { await approveOutstand(record.id); toast.success("Approved"); } catch { toast.error("Failed"); } setConfirm(null); }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "pay" && (
        <ConfirmModal
          title="Mark as Paid"
          message={<>Mark <strong>{record.ref}</strong> as paid?</>}
          confirmLabel="Yes, Mark Paid" confirmCls="bg-blue-500 hover:bg-blue-600"
          onConfirm={async () => { try { await payOutstand(record.id); toast.success("Marked as paid"); } catch { toast.error("Failed"); } setConfirm(null); }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "delete" && (
        <ConfirmModal
          title="Delete Expense"
          message={<>Permanently delete <strong>{record.ref}</strong>? This cannot be undone.</>}
          confirmLabel="Delete" confirmCls="bg-red-500 hover:bg-red-600"
          onConfirm={async () => { try { await deleteOutstand(record.id); toast.success("Deleted"); } catch { toast.error("Failed to delete"); } setConfirm(null); }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

export default function AdminExpensesPage() {
  const [activeTab,  setActiveTab]  = useState<OutstandStatus | "all">("all");
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [catFilter,  setCatFilter]  = useState("");
  const [showAdd,    setShowAdd]    = useState(false);
  const [selected,   setSelected]   = useState<Outstand | null>(null);
  const [editing,    setEditing]    = useState<Outstand | null>(null);

  const [approveOutstand] = useApproveOutstandMutation();
  const [payOutstand]     = usePayOutstandMutation();
  const [deleteOutstand]  = useDeleteOutstandMutation();

  const { data, isLoading, isFetching, refetch } = useGetOutstandsQuery({ limit: 500 });
  const allOutstands = data?.outstands ?? [];

  const filtered = allOutstands.filter(r => {
    const tabOk    = activeTab === "all" || r.status === activeTab;
    const catOk    = !catFilter || r.category === catFilter;
    const q        = search.toLowerCase();
    const searchOk = !q || r.ref.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || (r.recipientName ?? "").toLowerCase().includes(q);
    return tabOk && catOk && searchOk;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalAmt    = filtered.reduce((s, r) => s + Number(r.totalAmount), 0);
  const pendingAmt  = filtered.filter(r => r.status === "pending").reduce((s, r)  => s + Number(r.totalAmount), 0);
  const approvedAmt = filtered.filter(r => r.status === "approved").reduce((s, r) => s + Number(r.totalAmount), 0);
  const paidAmt     = filtered.filter(r => r.status === "paid").reduce((s, r)     => s + Number(r.totalAmount), 0);
  const rejectedAmt = filtered.filter(r => r.status === "rejected").reduce((s, r) => s + Number(r.totalAmount), 0);



  return (
    <DashboardLayout>
      {showAdd  && <AddRecordModal onClose={() => setShowAdd(false)} />}
      {editing  && <EditModal record={editing} onClose={() => setEditing(null)} />}
      {selected && !editing && (
        <DetailModal record={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} />
      )}

      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HiOutlineCash className="w-6 h-6 text-primary-500" />
              <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Expenses</h1>
            </div>
            <p className="text-sm text-custom-700">All company expenses — {filtered.length} records</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button onClick={() => refetch()} className="p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors">
              <HiOutlineRefresh className={`w-4 h-4 text-custom-700 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
              <HiOutlinePlus className="w-4 h-4" /> Record Expense
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total",    value: totalAmt,    color: "text-secondary-100" },
            { label: "Pending",  value: pendingAmt,  color: "text-yellow-600" },
            { label: "Approved", value: approvedAmt, color: "text-blue-600" },
            { label: "Paid Out", value: paidAmt,     color: "text-emerald-600" },
            { label: "Rejected", value: rejectedAmt, color: "text-red-500" },
          ].map(kpi => (
            <Card key={kpi.label} className="!p-4">
              <p className="text-xs text-custom-700">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value.toLocaleString()}</p>
              <p className="text-xs text-custom-700">RWF</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select value={activeTab} onChange={e => { setActiveTab(e.target.value as OutstandStatus | "all"); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors">
            <option value="">All categories</option>
            {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{categoryConfig[c]?.label ?? c}</option>)}
          </select>
          <div className="relative flex-1 max-w-sm">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search ref, description, recipient…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors" />
          </div>
        </div>

        {/* Table */}
        <Card className="!p-0 overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-4">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-custom-100 rounded-xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <HiOutlineClipboardList className="w-10 h-10 text-custom-300 mx-auto mb-2" />
              <p className="text-sm text-custom-700">No expenses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-custom-50 border-b border-custom-200">
                  <tr>
                    {["Ref", "Description", "Category", "Recipient", "Amount (RWF)", "Status", "Recorded By", "Date", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-custom-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-custom-100">
                  {paginated.map(r => {
                    const cat = categoryConfig[r.category] ?? categoryConfig.other;
                    const st  = statusConfig[r.status];
                    return (
                      <tr key={r.id} onClick={() => setSelected(r)} className="hover:bg-custom-50 transition-colors cursor-pointer">
                        <td className="px-4 py-3 font-bold text-primary-500 whitespace-nowrap">{r.ref}</td>
                        <td className="px-4 py-3 text-secondary-100 max-w-[160px] truncate">{r.description}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>{cat.icon}{cat.label}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-secondary-100 font-medium">{r.recipientName}</p>
                          {r.recipientRole && <p className="text-xs text-custom-700">{r.recipientRole}</p>}
                        </td>
                        <td className="px-4 py-3 font-bold text-secondary-100 whitespace-nowrap">{Number(r.totalAmount).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${st.color}`}>{st.icon}{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-secondary-100 whitespace-nowrap">{r.recordedBy?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-custom-700 whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <InlineActions
                            record={r}
                            approveOutstand={(id) => approveOutstand(id).unwrap()}
                            payOutstand={(id) => payOutstand(id).unwrap()}
                            deleteOutstand={(id) => deleteOutstand(id).unwrap()}
                            onEdit={() => setEditing(r)}
                            onView={() => setSelected(r)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Summary totals */}
        {filtered.length > 0 && (
          <div className="flex justify-end">
            <div className="border border-custom-300 rounded-xl overflow-hidden text-sm w-72">
              <div className="bg-custom-100 px-4 py-2 font-bold text-secondary-100 text-xs uppercase">Summary</div>
              {[
                { label: "Pending",  value: `${pendingAmt.toLocaleString()} RWF`,  cls: "text-yellow-600" },
                { label: "Approved", value: `${approvedAmt.toLocaleString()} RWF`, cls: "text-blue-600" },
                { label: "Paid Out", value: `${paidAmt.toLocaleString()} RWF`,     cls: "text-emerald-600" },
                { label: "Rejected", value: `${rejectedAmt.toLocaleString()} RWF`, cls: rejectedAmt > 0 ? "text-red-500" : "text-secondary-100" },
                { label: "TOTAL",    value: `${totalAmt.toLocaleString()} RWF`,    cls: "text-secondary-100 font-bold" },
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-custom-700">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${n === page ? "bg-primary-500 text-white" : "border border-custom-300 text-secondary-100 hover:bg-custom-100"}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-custom-300 text-xs font-semibold text-secondary-100 hover:bg-custom-100 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
