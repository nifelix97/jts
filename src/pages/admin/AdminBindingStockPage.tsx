import { useState } from "react";
import {
  HiOutlineArchive,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineCheck,
  HiOutlineBan,
} from "react-icons/hi";
import { toast } from "react-toastify";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import {
  useGetBindingStockItemsQuery,
  useCreateBindingStockItemMutation,
  useUpdateBindingStockItemMutation,
  useDeleteBindingStockItemMutation,
  useCreateBindingStockEntryMutation,
  useGetBindingStockSortiesQuery,
  useApproveBindingStockSortieMutation,
  useRejectBindingStockSortieMutation,
  type BindingStockItem,
  type BindingStockSortie,
  type SortieStatus,
} from "../../store/services/bindingStockService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  available:      "bg-emerald-100 text-emerald-700",
  low:            "bg-yellow-100 text-yellow-700",
  "out-of-stock": "bg-red-100 text-red-700",
};

const sortieStatusColors: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const cls = "w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors";

// ─── Item Form Modal ──────────────────────────────────────────────────────────

interface ItemFormProps {
  item?: BindingStockItem;
  onClose: () => void;
  onSuccess: () => void;
}

function ItemFormModal({ item, onClose, onSuccess }: ItemFormProps) {
  const isEdit = !!item;
  const [createItem, { isLoading: creating }] = useCreateBindingStockItemMutation();
  const [updateItem, { isLoading: updating }]  = useUpdateBindingStockItemMutation();

  const [form, setForm] = useState({
    itemName:     item?.itemName                         ?? "",
    description:  item?.description                      ?? "",
    category:     item?.category                         ?? "",
    unit:         item?.unit                             ?? "",
    currentStock: item?.currentStock != null ? String(item.currentStock) : "",
    alarmStock:   item?.alarmStock   != null ? String(item.alarmStock)   : "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemName.trim() || !form.category.trim() || !form.unit.trim()) {
      toast.error("Item name, category, and unit are required"); return;
    }
    const payload = {
      itemName:     form.itemName,
      description:  form.description,
      category:     form.category,
      unit:         form.unit,
      currentStock: form.currentStock === "" ? 0 : Number(form.currentStock),
      alarmStock:   form.alarmStock   === "" ? 0 : Number(form.alarmStock),
    };
    try {
      if (isEdit) {
        await updateItem({ id: item!.id, ...payload }).unwrap();
        toast.success("Item updated");
      } else {
        await createItem(payload).unwrap();
        toast.success("Item created");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to save item");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-2xl w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-secondary-100">{isEdit ? "Edit Item" : "Add Binding Stock Item"}</h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Item Name *</label>
              <input value={form.itemName} onChange={set("itemName")} placeholder="e.g. Binding Wire" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Category *</label>
              <input value={form.category} onChange={set("category")} placeholder="e.g. Binding Materials" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Unit *</label>
              <input value={form.unit} onChange={set("unit")} placeholder="e.g. rolls, pcs, kg" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Alarm Stock Level</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" min={0} value={form.alarmStock} onChange={set("alarmStock")} placeholder="e.g. 5" className={cls} />
            </div>
            {!isEdit && (
              <div>
                <label className="block text-xs font-semibold text-secondary-100 mb-1">Initial Stock</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" min={0} value={form.currentStock} onChange={set("currentStock")} placeholder="e.g. 100" className={cls} />
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Description</label>
            <textarea value={form.description} onChange={set("description")} rows={2} placeholder="Optional description..."
              className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
            <button type="submit" disabled={creating || updating}
              className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 transition-colors">
              {creating || updating ? "Saving..." : isEdit ? "Save Changes" : "Create Item"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Restock Modal ────────────────────────────────────────────────────────────

function RestockModal({ item, onClose, onSuccess }: { item: BindingStockItem; onClose: () => void; onSuccess: () => void }) {
  const [qty, setQty]   = useState("1");
  const [note, setNote] = useState("");
  const [createEntry, { isLoading }] = useCreateBindingStockEntryMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseInt(qty);
    if (!q || q <= 0) { toast.error("Enter a valid quantity"); return; }
    try {
      await createEntry({ stockItemId: item.id, quantity: q, note: note.trim() || undefined }).unwrap();
      toast.success(`Added ${q} ${item.unit} to ${item.itemName}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to restock");
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <Card className="!p-6 max-w-xl w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-secondary-100">Restock: {item.itemName}</h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Quantity to Add *</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className={cls} />
            <p className="text-xs text-custom-700 mt-1">Current stock: <span className="font-bold text-secondary-100">{item.currentStock} {item.unit}</span></p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note..." className={cls} />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 transition-colors">
              {isLoading ? "Adding..." : "Add Stock"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Items Tab ────────────────────────────────────────────────────────────────

function ItemsTab() {
  const [showForm, setShowForm]       = useState(false);
  const [editItem, setEditItem]       = useState<BindingStockItem | null>(null);
  const [restockItem, setRestockItem] = useState<BindingStockItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BindingStockItem | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [search, setSearch]           = useState("");

  const { data, isLoading, refetch } = useGetBindingStockItemsQuery({ limit: 200 });
  const [deleteItem] = useDeleteBindingStockItemMutation();

  const items = (data?.data ?? []).filter((i) => {
    const q = search.trim().toLowerCase();
    return !q || i.itemName.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
  });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteItem(deleteTarget.id).unwrap();
      toast.success("Item deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..."
          className="flex-1 min-w-48 px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors"
        />
        <button onClick={() => refetch()} className="p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-custom-700">
          <HiOutlineRefresh className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
          <HiOutlinePlus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Items",  value: items.length,                                                color: "text-secondary-100" },
          { label: "Available",    value: items.filter((i) => i.stockStatus === "available").length,   color: "text-emerald-600" },
          { label: "Low Stock",    value: items.filter((i) => i.stockStatus === "low").length,         color: "text-yellow-600" },
          { label: "Out of Stock", value: items.filter((i) => i.stockStatus === "out-of-stock").length, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="!p-4 text-center">
            <p className="text-xs text-custom-700 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{isLoading ? "—" : value}</p>
          </Card>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Item Name", "Category", "Unit", "Stock", "Alarm", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-secondary-100 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center">
                  <HiOutlineArchive className="w-8 h-8 text-custom-400 mx-auto mb-2" />
                  <p className="text-sm text-secondary-100 font-semibold">No binding stock items</p>
                  <p className="text-xs text-custom-700 mt-1">Add the first item using the button above</p>
                </td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-custom-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-secondary-100">{item.itemName}</p>
                    {item.description && <p className="text-xs text-custom-700 truncate max-w-[160px]">{item.description}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{item.category}</td>
                  <td className="px-3 py-2.5 text-sm text-secondary-100">{item.unit}</td>
                  <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">{item.currentStock}</td>
                  <td className="px-3 py-2.5 text-sm text-custom-700">{item.alarmStock}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[item.stockStatus] ?? "bg-gray-100 text-gray-600"}`}>
                      {item.stockStatus.replace("-", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setRestockItem(item)} title="Restock"
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                        <HiOutlinePlus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditItem(item); setShowForm(true); }} title="Edit"
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <HiOutlinePencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(item)} title="Delete"
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <ItemFormModal
          item={editItem ?? undefined}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSuccess={() => { setShowForm(false); setEditItem(null); refetch(); }}
        />
      )}
      {restockItem && (
        <RestockModal
          item={restockItem}
          onClose={() => setRestockItem(null)}
          onSuccess={() => { setRestockItem(null); refetch(); }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
          <Card className="!p-6 max-w-xl w-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-secondary-100">Delete Item</h3>
                <p className="text-sm text-custom-700 mt-1">
                  Delete <span className="font-semibold text-secondary-100">"{deleteTarget.itemName}"</span>? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors"
              >
                {deleting
                  ? <HiOutlineRefresh className="w-4 h-4 animate-spin" />
                  : <HiOutlineTrash className="w-4 h-4" />}
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Confirm Action Modal ─────────────────────────────────────────────────────

interface ConfirmActionModalProps {
  action: "approve" | "reject";
  sortie: BindingStockSortie;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmActionModal({ action, sortie, isLoading, onConfirm, onClose }: ConfirmActionModalProps) {
  const isApprove = action === "approve";
  return (
    <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isApprove ? "bg-emerald-100" : "bg-red-100"
            }`}>
              {isApprove
                ? <HiOutlineCheck className="w-5 h-5 text-emerald-600" />
                : <HiOutlineBan   className="w-5 h-5 text-red-500" />}
            </div>
            <h3 className="text-lg font-bold text-secondary-100">
              {isApprove ? "Approve Request" : "Reject Request"}
            </h3>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100 ml-2">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-custom-300 bg-custom-50 p-4 space-y-2 mb-5 text-sm">
          <div className="flex justify-between">
            <span className="text-custom-700">Item</span>
            <span className="font-semibold text-secondary-100">{sortie.stockItem?.itemName ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-custom-700">Requested by</span>
            <span className="font-semibold text-secondary-100">{sortie.requester?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-custom-700">Quantity</span>
            <span className="font-semibold text-secondary-100">
              {parseFloat(sortie.quantityOut)} {sortie.stockItem?.unit ?? ""}
            </span>
          </div>
          {sortie.reason && (
            <div className="flex justify-between gap-4">
              <span className="text-custom-700">Reason</span>
              <span className="text-secondary-100 text-right italic">"{sortie.reason}"</span>
            </div>
          )}
        </div>

        <p className="text-sm text-custom-700 mb-5">
          {isApprove
            ? "Are you sure you want to approve this stock request? The quantity will be deducted from binding stock."
            : "Are you sure you want to reject this stock request? This action cannot be undone."}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40 flex items-center gap-2 ${
              isApprove
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {isLoading ? (
              <HiOutlineRefresh className="w-4 h-4 animate-spin" />
            ) : isApprove ? (
              <HiOutlineCheck className="w-4 h-4" />
            ) : (
              <HiOutlineBan className="w-4 h-4" />
            )}
            {isLoading
              ? isApprove ? "Approving..." : "Rejecting..."
              : isApprove ? "Yes, Approve" : "Yes, Reject"}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Sorties Tab ──────────────────────────────────────────────────────────────

function SortiesTab() {
  const [statusFilter, setStatusFilter] = useState<SortieStatus | "">("");
  const [confirmModal, setConfirmModal] = useState<{
    action: "approve" | "reject";
    sortie: BindingStockSortie;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, refetch } = useGetBindingStockSortiesQuery(
    statusFilter ? { status: statusFilter, limit: 200 } : { limit: 200 }
  );
  const [approve] = useApproveBindingStockSortieMutation();
  const [reject]  = useRejectBindingStockSortieMutation();

  const sorties: BindingStockSortie[] = data?.data ?? [];
  const pending  = sorties.filter((s) => s.status === "pending").length;

  const handleConfirm = async () => {
    if (!confirmModal) return;
    setActionLoading(true);
    try {
      if (confirmModal.action === "approve") {
        await approve(confirmModal.sortie.id).unwrap();
        toast.success("Request approved");
      } else {
        await reject(confirmModal.sortie.id).unwrap();
        toast.success("Request rejected");
      }
      setConfirmModal(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message ?? `Failed to ${confirmModal.action}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {confirmModal && (
        <ConfirmActionModal
          action={confirmModal.action}
          sortie={confirmModal.sortie}
          isLoading={actionLoading}
          onConfirm={handleConfirm}
          onClose={() => !actionLoading && setConfirmModal(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SortieStatus | "")}
          className="px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors">
          <option value="">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={() => refetch()} className="p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-custom-700">
          <HiOutlineRefresh className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
        {pending > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-bold">
            <HiOutlineExclamationCircle className="w-4 h-4" />
            {pending} pending request{pending > 1 ? "s" : ""} need review
          </span>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="!p-4 animate-pulse">
              <div className="h-4 w-1/3 bg-custom-200 rounded mb-2" />
              <div className="h-3 w-full bg-custom-200 rounded" />
            </Card>
          ))
        ) : sorties.length === 0 ? (
          <Card className="!p-10 text-center">
            <HiOutlineCheckCircle className="w-8 h-8 text-custom-400 mx-auto mb-2" />
            <p className="text-sm text-secondary-100 font-semibold">No stock requests found</p>
            <p className="text-xs text-custom-700 mt-1">Worker  stock requests will appear here</p>
          </Card>
        ) : sorties.map((sortie) => (
          <Card key={sortie.id} className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-custom-50 border-b border-custom-200">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-secondary-100">
                    {sortie.stockItem?.itemName ?? "Stock Item"}
                  </p>
                  <p className="text-xs text-custom-700">
                    Requested by: <span className="font-medium">{sortie.requester?.name ?? "—"}</span>
                    {" · "}{new Date(sortie.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sortieStatusColors[sortie.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {sortie.status}
                </span>
              </div>
              {sortie.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setConfirmModal({ action: "approve", sortie })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors">
                    <HiOutlineCheck className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => setConfirmModal({ action: "reject", sortie })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
                    <HiOutlineBan className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
            <div className="px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="text-custom-700">Qty: <span className="font-bold text-secondary-100">{parseFloat(sortie.quantityOut)} {sortie.stockItem?.unit ?? ""}</span></span>
              {sortie.reason && <span className="text-xs text-custom-700">Reason: <em>"{sortie.reason}"</em></span>}
              {sortie.approvedBy && (
                <span className="text-xs text-custom-700">
                  {sortie.status === "approved" ? "Approved" : "Reviewed"} by: <span className="font-medium">{sortie.approvedBy.name}</span>
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "items" | "sorties";

export default function AdminBindingStockPage() {
  const [tab, setTab] = useState<Tab>("items");

  const { data: sortiesData } = useGetBindingStockSortiesQuery({ status: "pending", limit: 200 });
  const pendingCount = sortiesData?.data?.length ?? 0;

  return (
    <DashboardLayout userRole="admin" userName="Director">
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <HiOutlineArchive className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Binding Stock</h1>
            <p className="text-sm text-custom-700 mt-0.5">Manage binding department stock items and process requests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-custom-100 rounded-xl w-fit">
          {([
            { id: "items",   label: "Items" },
            { id: "sorties", label: "Requests", badge: pendingCount },
          ] as { id: Tab; label: string; badge?: number }[]).map(({ id, label, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === id ? "bg-style-500 text-secondary-100 shadow-sm" : "text-custom-700 hover:text-secondary-100"
              }`}
            >
              {label}
              {badge != null && badge > 0 && (
                <span className="w-5 h-5 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "items"   && <ItemsTab />}
        {tab === "sorties" && <SortiesTab />}
      </div>
    </DashboardLayout>
  );
}
