import { useState } from "react";
import { useAppSelector } from "../../store/hooks";
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
  useGetGeneralStockItemsQuery,
  useCreateGeneralStockItemMutation,
  useUpdateGeneralStockItemMutation,
  useDeleteGeneralStockItemMutation,
  useCreateGeneralStockEntryMutation,
  useGetGeneralStockSortiesQuery,
  useApproveGeneralStockSortieMutation,
  useRejectGeneralStockSortieMutation,
  useTakeGeneralStockSortieMutation,
  type GeneralStockItem,
  type GeneralStockSortie,
  type SortieStatus,
} from "../../store/services/generalStockService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  available:      "bg-emerald-100 text-emerald-700",
  low:            "bg-yellow-100 text-yellow-700",
  "out-of-stock": "bg-red-100 text-red-700",
};


const sortieStatusColors: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  taken:    "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
};

const cls = "w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors";

// ─── Item Form Modal ──────────────────────────────────────────────────────────

interface ItemFormProps {
  item?: GeneralStockItem;
  onClose: () => void;
  onSuccess: () => void;
}

function ItemFormModal({ item, onClose, onSuccess }: ItemFormProps) {
  const isEdit = !!item;
  const [createItem, { isLoading: creating }] = useCreateGeneralStockItemMutation();
  const [updateItem, { isLoading: updating }]  = useUpdateGeneralStockItemMutation();

  const [form, setForm] = useState({
    itemName:     item?.itemName     ?? "",
    description:  item?.description  ?? "",
    category:     item?.category     ?? "",
    unit:         item?.unit         ?? "",
    currentStock: item?.currentStock?.toString() ?? "",
    alarmStock:   item?.alarmStock?.toString()   ?? "",
    amountPerUnit: item?.amountPerUnit?.toString() ?? "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemName.trim() || !form.category.trim() || !form.unit.trim()) {
      toast.error("Item name, category, and unit are required"); return;
    }
    try {
      const payload = {
        ...form,
        currentStock: Number(form.currentStock) || 0,
        alarmStock: Number(form.alarmStock) || 0,
        amountPerUnit: form.amountPerUnit !== "" ? Number(form.amountPerUnit) : undefined,
      };
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
      <Card className="!p-6 max-w-lg w-full my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-secondary-100">{isEdit ? "Edit Item" : "Add General Stock Item"}</h3>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Item Name *</label>
              <input value={form.itemName} onChange={set("itemName")} placeholder="e.g. A4 Paper" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Category *</label>
              <input value={form.category} onChange={set("category")} placeholder="e.g. Office Supplies" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Unit *</label>
              <input value={form.unit} onChange={set("unit")} placeholder="e.g. reams, pcs, box" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Amount Per Unit (RWF)</label>
              <input type="number" min={0} step="0.01" value={form.amountPerUnit} onChange={set("amountPerUnit")} placeholder="e.g. 1500" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Alarm Stock Level</label>
              <input type="text" value={form.alarmStock} onChange={set("alarmStock")} placeholder="e.g. 10" className={cls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary-100 mb-1">{isEdit ? "Current Stock" : "Initial Stock"}</label>
              <input type="text" value={form.currentStock} onChange={set("currentStock")} placeholder="e.g. 100" className={cls} />
            </div>
          </div>
          {form.amountPerUnit && form.currentStock && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-primary-50 border border-primary-200">
              <span className="text-xs font-semibold text-primary-700">Total Stock Value</span>
              <span className="text-sm font-bold text-primary-600">
                {(Number(form.amountPerUnit) * Number(form.currentStock)).toLocaleString()} RWF
              </span>
            </div>
          )}
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

function RestockModal({ item, onClose, onSuccess }: { item: GeneralStockItem; onClose: () => void; onSuccess: () => void }) {
  const [qty, setQty]   = useState("1");
  const [note, setNote] = useState("");
  const [createEntry, { isLoading }] = useCreateGeneralStockEntryMutation();

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
      <Card className="!p-6 max-w-sm w-full my-8">
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

// ─── Pagination ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 rounded-lg border border-custom-300 text-sm text-secondary-100 disabled:opacity-40 hover:bg-custom-100 transition-colors">
        ‹ Prev
      </button>
      <span className="text-sm text-custom-700">
        Page <span className="font-semibold text-secondary-100">{page}</span> of {totalPages}
      </span>
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 rounded-lg border border-custom-300 text-sm text-secondary-100 disabled:opacity-40 hover:bg-custom-100 transition-colors">
        Next ›
      </button>
    </div>
  );
}

// ─── Items Tab ────────────────────────────────────────────────────────────────

function ItemsTab() {
  const [showForm, setShowForm]       = useState(false);
  const [editItem, setEditItem]       = useState<GeneralStockItem | null>(null);
  const [restockItem, setRestockItem] = useState<GeneralStockItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeneralStockItem | null>(null);
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);

  const { data, isLoading, refetch } = useGetGeneralStockItemsQuery({ limit: 200 });
  const { data: sortiesData } = useGetGeneralStockSortiesQuery({ status: "approved", limit: 1000 });
  const [deleteItem] = useDeleteGeneralStockItemMutation();

  const allItems = data?.data ?? [];
  const totalDeducted = (sortiesData?.data ?? []).reduce((sum, s) => sum + parseFloat(s.quantityOut), 0);

  const filtered = allItems.filter((i) => {
    const q = search.trim().toLowerCase();
    return !q || i.itemName.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const items      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (q: string) => { setSearch(q); setPage(1); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(deleteTarget.id).unwrap();
      toast.success("Item deleted");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search items..."
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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Total Items",   value: allItems.length,                                                                                color: "text-secondary-100", sub: undefined },
          { label: "Available",     value: allItems.filter((i) => i.stockStatus === "available").length,                                   color: "text-emerald-600",   sub: undefined },
          { label: "Low Stock",     value: allItems.filter((i) => i.stockStatus === "low").length,                                         color: "text-yellow-600",   sub: undefined },
          { label: "Out of Stock",  value: allItems.filter((i) => i.stockStatus === "out-of-stock").length,                                 color: "text-red-600",       sub: undefined },
          { label: "Items Deducted", value: totalDeducted,                                                                                color: "text-red-500",       sub: "from approved requests" },
        ].map(({ label, value, color, sub }) => (
          <Card key={label} className="!p-4 text-center">
            <p className="text-xs text-custom-700 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{isLoading ? "—" : value.toLocaleString()}</p>
            {sub && <p className="text-[10px] text-custom-400 mt-0.5">{sub}</p>}
          </Card>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-custom-100 border-b border-custom-300">
              <tr>
                {["Item Name", "Category", "Unit", "Stock", "Amount/Unit", "Total Value", "Alarm", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-secondary-100 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-custom-200">
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-custom-700 text-sm">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center">
                  <HiOutlineArchive className="w-8 h-8 text-custom-400 mx-auto mb-2" />
                  <p className="text-sm text-secondary-100 font-semibold">{search ? `No results for "${search}"` : "No general stock items"}</p>
                  {!search && <p className="text-xs text-custom-700 mt-1">Add the first item using the button above</p>}
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
                  <td className="px-3 py-2.5 text-sm text-secondary-100">
                    {item.amountPerUnit != null ? `${Number(item.amountPerUnit).toLocaleString()} RWF` : <span className="text-custom-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-semibold text-secondary-100">
                    {item.amountPerUnit != null ? `${(Number(item.amountPerUnit) * item.currentStock).toLocaleString()} RWF` : <span className="text-custom-400">—</span>}
                  </td>
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

      <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />

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

      {deleteTarget && (
        <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
          <Card className="!p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineTrash className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-secondary-100">Delete Item</h3>
                <p className="text-xs text-custom-700 mt-0.5 truncate max-w-[200px]">{deleteTarget.itemName}</p>
              </div>
            </div>
            <p className="text-sm text-secondary-100 mb-5">
              Are you sure you want to delete <span className="font-bold">"{deleteTarget.itemName}"</span>? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
              <button onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Sorties Tab ──────────────────────────────────────────────────────────────

function SortiesTab() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const canReview = role === "DAF" || role === "ADMIN";

  const [statusFilter, setStatusFilter] = useState<SortieStatus | "">("");
  const [search, setSearch]             = useState("");
  const [page, setPage]                 = useState(1);

  const { data, isLoading, refetch } = useGetGeneralStockSortiesQuery(
    statusFilter ? { status: statusFilter, limit: 200 } : { limit: 200 }
  );
  const [approveTarget, setApproveTarget] = useState<GeneralStockSortie | null>(null);
  const [rejectTarget,  setRejectTarget]  = useState<GeneralStockSortie | null>(null);
  const [takeTarget,    setTakeTarget]    = useState<GeneralStockSortie | null>(null);
  const [rejectReason,  setRejectReason]  = useState("");

  const [approve, { isLoading: approving }] = useApproveGeneralStockSortieMutation();
  const [reject,  { isLoading: rejecting }] = useRejectGeneralStockSortieMutation();
  const [take,    { isLoading: taking }]    = useTakeGeneralStockSortieMutation();

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      await approve(approveTarget.id).unwrap();
      toast.success("Request approved");
      setApproveTarget(null);
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error("Please provide a reason"); return; }
    try {
      await reject(rejectTarget.id).unwrap();
      toast.success("Request rejected");
      setRejectTarget(null);
      setRejectReason("");
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to reject");
    }
  };

  const handleTake = async () => {
    if (!takeTarget) return;
    try {
      await take(takeTarget.id).unwrap();
      toast.success("Items marked as taken — stock deducted");
      setTakeTarget(null);
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to mark as taken");
    }
  };

  const allSorties: GeneralStockSortie[] = data?.data ?? [];
  const pending  = allSorties.filter((s) => s.status === "pending").length;

  const sorties = allSorties.filter((s) => {
    const q = search.trim().toLowerCase();
    return !q || s.stockItem?.itemName.toLowerCase().includes(q) || s.requester?.name.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(sorties.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = sorties.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (q: string) => { setSearch(q); setPage(1); };
  const handleFilter = (v: SortieStatus | "") => { setStatusFilter(v); setPage(1); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search by item or requester..."
          className="flex-1 min-w-48 px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors"
        />
        <select value={statusFilter} onChange={(e) => handleFilter(e.target.value as SortieStatus | "")}
          className="px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors">
          <option value="">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="taken">Taken</option>
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
        ) : paginated.length === 0 ? (
          <Card className="!p-10 text-center">
            <HiOutlineCheckCircle className="w-8 h-8 text-custom-400 mx-auto mb-2" />
            <p className="text-sm text-secondary-100 font-semibold">{search ? `No results for "${search}"` : "No stock requests found"}</p>
            {!search && <p className="text-xs text-custom-700 mt-1">Requests from Hobe will appear here</p>}
          </Card>
        ) : paginated.map((sortie) => (
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
              <div className="flex items-center gap-2">
                {canReview && sortie.status === "pending" && (<>
                  <button onClick={() => setApproveTarget(sortie)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors">
                    <HiOutlineCheck className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => { setRejectTarget(sortie); setRejectReason(""); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
                    <HiOutlineBan className="w-3.5 h-3.5" /> Reject
                  </button>
                </>)}
                {sortie.status === "approved" && (
                  <button onClick={() => setTakeTarget(sortie)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Mark as Taken
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="text-custom-700">Qty: <span className="font-bold text-secondary-100">{parseFloat(sortie.quantityOut)} {sortie.stockItem?.unit ?? ""}</span></span>
              {sortie.reason && <span className="text-xs text-custom-700">Reason: <em>"{sortie.reason}"</em></span>}
              {sortie.approvedBy && (
                <span className="text-xs text-custom-700">
                  Approved by: <span className="font-medium">{sortie.approvedBy.name}</span>
                </span>
              )}
              {sortie.takenBy && (
                <span className="text-xs text-custom-700">
                  Taken by: <span className="font-medium">{sortie.takenBy.name}</span>
                  {sortie.takenAt && ` · ${new Date(sortie.takenAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}`}
                </span>
              )}
              {sortie.stockBefore != null && sortie.stockAfter != null && (
                <span className="text-xs text-custom-700">
                  Stock: <span className="font-medium">{sortie.stockBefore}</span> → <span className="font-medium">{sortie.stockAfter}</span>
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />

      {/* Approve Modal */}
      {approveTarget && (
        <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
          <Card className="!p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-secondary-100">Approve Request</h3>
                <p className="text-xs text-custom-700 mt-0.5 truncate max-w-[200px]">{approveTarget.stockItem?.itemName ?? "Stock Item"}</p>
              </div>
            </div>
            <p className="text-sm text-secondary-100 mb-5">
              Approve request for <span className="font-bold">{parseFloat(approveTarget.quantityOut)} {approveTarget.stockItem?.unit ?? ""}</span> by <span className="font-bold">{approveTarget.requester?.name ?? "requester"}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setApproveTarget(null)} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
              <button onClick={handleApprove} disabled={approving}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 transition-colors">
                {approving ? "Approving..." : "Yes, Approve"}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Take Modal */}
      {takeTarget && (
        <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
          <Card className="!p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineCheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-secondary-100">Mark as Taken</h3>
                <p className="text-xs text-custom-700 mt-0.5 truncate max-w-[200px]">{takeTarget.stockItem?.itemName ?? "Stock Item"}</p>
              </div>
            </div>
            <p className="text-sm text-secondary-100 mb-5">
              Confirm that <span className="font-bold">{parseFloat(takeTarget.quantityOut)} {takeTarget.stockItem?.unit ?? ""}</span> have been physically handed out to <span className="font-bold">{takeTarget.requester?.name ?? "requester"}</span>? Stock will be deducted.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setTakeTarget(null)} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
              <button onClick={handleTake} disabled={taking}
                className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 transition-colors">
                {taking ? "Processing..." : "Yes, Mark as Taken"}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
          <Card className="!p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <HiOutlineBan className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-secondary-100">Reject Request</h3>
                <p className="text-xs text-custom-700 mt-0.5 truncate max-w-[200px]">{rejectTarget.stockItem?.itemName ?? "Stock Item"}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-secondary-100 mb-1">Reason *</label>
              <textarea
                autoFocus
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Insufficient stock available..."
                className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectTarget(null); setRejectReason(""); }} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Cancel</button>
              <button onClick={handleReject} disabled={rejecting}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors">
                {rejecting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "items" | "sorties";

export default function GeneralStockPage() {
  const [tab, setTab] = useState<Tab>("items");

  const { data: sortiesData } = useGetGeneralStockSortiesQuery({ status: "pending", limit: 200 });
  const pendingCount = sortiesData?.data?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <HiOutlineArchive className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">General Stock</h1>
            <p className="text-sm text-custom-700 mt-0.5">Manage general stock items and process Hobe requests</p>
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
