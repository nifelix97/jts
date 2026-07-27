import { useState } from "react";
import {
  HiOutlineArchive,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlineXCircle,
} from "react-icons/hi";
import { toast } from "react-toastify";
import { DashboardLayout } from "../../components";
import { Button, Card } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import {
  useGetGeneralStockItemsQuery,
  useGetMyGeneralStockSortiesQuery,
  useCreateGeneralStockSortieMutation,
  type GeneralStockSortie,
  type SortieStatus,
} from "../../store/services/generalStockService";

const statusConfig: Record<SortieStatus, { label: string; color: string; icon: any; bgColor: string }> = {
  pending:  { label: "Pending",  color: "text-yellow-600", icon: HiOutlineClock,       bgColor: "bg-yellow-100" },
  approved: { label: "Approved", color: "text-green-600",  icon: HiOutlineCheckCircle, bgColor: "bg-green-100"  },
  taken:    { label: "Taken",    color: "text-blue-600",   icon: HiOutlineCheckCircle, bgColor: "bg-blue-100"   },
  rejected: { label: "Rejected", color: "text-red-600",    icon: HiOutlineXCircle,     bgColor: "bg-red-100"    },
};

const stockStatusColors: Record<string, string> = {
  available:      "bg-emerald-100 text-emerald-700",
  low:            "bg-yellow-100 text-yellow-700",
  "out-of-stock": "bg-red-100 text-red-700",
};

export default function MaterialRequestPage() {
  const { userName } = useAuth();

  const { data: itemsData, isLoading: itemsLoading } = useGetGeneralStockItemsQuery({ limit: 200 });
  const { data: sortiesData, isLoading: sortiesLoading, refetch } = useGetMyGeneralStockSortiesQuery({ limit: 100 });
  const [createSortie, { isLoading: isSubmitting }] = useCreateGeneralStockSortieMutation();

  const items   = itemsData?.data   ?? [];
  const sorties = sortiesData?.data ?? [];

  const [tab, setTab]           = useState<"browse" | "my-requests">("browse");
  const [filter, setFilter]     = useState<SortieStatus | "all">("all");
  const [period, setPeriod]     = useState<"all" | "week" | "year">("all");
  const [itemSearch, setItemSearch]       = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedSortie, setSelectedSortie] = useState<GeneralStockSortie | null>(null);

  const now = new Date();
  // local-date week boundary: Monday 00:00 local time
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7), 0, 0, 0, 0);

  const periodSorties = sorties.filter((s) => {
    if (period === "all") return true;
    const d = new Date(s.createdAt);
    if (period === "week") return d >= startOfWeek;
    if (period === "year") return d.getFullYear() === now.getFullYear(); // getFullYear() is local
    return true;
  });

  // Request modal state
  const [showModal, setShowModal]     = useState(false);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity]         = useState("");
  const [reason, setReason]             = useState("");
  const [notes, setNotes]               = useState("");

  const q = requestSearch.trim().toLowerCase();
  const searchedSorties = q
    ? periodSorties.filter((s) =>
        s.stockItem?.itemName?.toLowerCase().includes(q) ||
        s.stockItem?.category?.toLowerCase().includes(q)
      )
    : periodSorties;
  const filteredSorties = filter === "all" ? searchedSorties : searchedSorties.filter((s) => s.status === filter);

  const iq = itemSearch.trim().toLowerCase();
  const filteredItems = iq
    ? items.filter((i) => i.itemName.toLowerCase().includes(iq) || i.category?.toLowerCase().includes(iq))
    : items;

  const resetForm = () => {
    setSelectedItem(""); setQuantity(""); setReason(""); setNotes("");
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!selectedItem) return toast.error("Select an item");
    if (!qty || qty <= 0) return toast.error("Enter a valid quantity");
    if (!reason.trim()) return toast.error("Reason is required");
    try {
      await createSortie({ stockItemId: selectedItem, quantityOut: qty, reason: reason.trim(), notes: notes.trim() || undefined }).unwrap();
      toast.success("Request submitted — supervisor will be notified");
      resetForm();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to submit request");
    }
  };

  return (
    <DashboardLayout userRole="worker" userName={userName ?? "Worker"} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100"> Stock Requests</h1>
            <p className="text-sm text-custom-700 mt-1">Browse available items and submit stock requests</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} disabled={sortiesLoading}
              className="p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors disabled:opacity-50">
              <HiOutlineRefresh className={`w-5 h-5 text-custom-700 ${sortiesLoading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors text-sm flex items-center gap-2">
              <HiOutlinePlus className="w-4 h-4" /> New Request
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-custom-100 rounded-xl w-fit">
          {([
            { id: "browse",      label: "Browse Items",  badge: items.length },
            { id: "my-requests", label: "My Requests",   badge: sorties.filter((s) => s.status === "pending").length },
          ] as { id: "browse" | "my-requests"; label: string; badge?: number }[]).map(({ id, label, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === id ? "bg-style-500 text-secondary-100 shadow-sm" : "text-custom-700 hover:text-secondary-100"
              }`}>
              {label}
              {badge != null && badge > 0 && (
                <span className={`w-5 h-5 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${id === "my-requests" ? "bg-yellow-500" : "bg-primary-500"}`}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Browse Items Tab ── */}
        {tab === "browse" && (
          <Card className="!p-0 overflow-hidden">
            <div className="p-3 border-b border-custom-300">
              <input
                value={itemSearch} onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search by name or category…"
                className="w-full sm:w-72 px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-custom-100 border-b border-custom-300">
                  <tr>
                    {["Item Name", "Category", "Unit", "Stock", "Status", "Action"].map((h) => (
                      <th key={h} className={`px-3 py-2.5 text-xs font-bold text-secondary-100 uppercase ${h === "Action" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-custom-200">
                  {itemsLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700">Loading…</td></tr>
                  ) : filteredItems.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center">
                      <HiOutlineArchive className="w-8 h-8 text-custom-400 mx-auto mb-2" />
                      <p className="text-sm text-secondary-100 font-semibold">No items found</p>
                    </td></tr>
                  ) : filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-custom-50 transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-semibold text-secondary-100">{item.itemName}</p>
                        {item.description && <p className="text-xs text-custom-700 truncate max-w-[180px]">{item.description}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-secondary-100">{item.category}</td>
                      <td className="px-3 py-2.5 text-sm text-secondary-100">{item.unit}</td>
                      <td className="px-3 py-2.5 text-sm font-bold text-secondary-100">{item.currentStock}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${stockStatusColors[item.stockStatus] ?? "bg-gray-100 text-gray-600"}`}>
                          {item.stockStatus.replace("-", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          disabled={item.stockStatus === "out-of-stock"}
                          onClick={() => { setSelectedItem(item.id); setShowModal(true); }}
                          className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Request
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── My Requests Tab ── */}
        {tab === "my-requests" && (
          <>
            {/* Search + Period filter — horizontal row */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={requestSearch} onChange={(e) => setRequestSearch(e.target.value)}
                placeholder="Search by item name or category…"
                className="flex-1 min-w-[200px] sm:w-72 px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors"
              />
              <div className="flex gap-2">
                {(["all", "week", "year"] as const).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      period === p ? "bg-primary-500 text-white" : "border border-custom-300 text-custom-700 hover:bg-custom-100"
                    }`}>
                    {p === "all" ? "All Time" : p === "week" ? "This Week" : "This Year"}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => {
                const count = s === "all" ? periodSorties.length : periodSorties.filter((r) => r.status === s).length;
                const cfg   = s === "all" ? null : statusConfig[s];
                return (
                  <Card key={s} className="!p-4 flex gap-2">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center mb-2 ${cfg ? cfg.bgColor : "bg-primary-100"}`}>
                      {cfg ? <cfg.icon className={`w-5 h-5 ${cfg.color}`} /> : <HiOutlineArchive className="w-5 h-5 text-primary-600" />}
                    </div>
                    <p className="text-2xl font-bold text-secondary-100">{sortiesLoading ? "—" : count}</p>
                    <p className="text-xs text-custom-700 mt-1capitalize">{s === "all" ? "Total" : cfg!.label}</p>
                  </Card>
                );
              })}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => {
                const count = s === "all" ? periodSorties.length : periodSorties.filter((r) => r.status === s).length;
                return (
                  <button key={s} onClick={() => setFilter(s)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                      filter === s ? "bg-primary-500 text-white" : "border border-custom-300 text-custom-700 hover:bg-custom-100"
                    }`}>
                    {s === "all" ? "All" : statusConfig[s].label} ({count})
                  </button>
                );
              })}
            </div>

            <Card className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-custom-100 border-b border-custom-300">
                    <tr>
                      {["Item", "Qty", "Reason", "Status", "Date", ""].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-custom-200">
                    {sortiesLoading ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700">Loading…</td></tr>
                    ) : filteredSorties.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-custom-700">No requests found</td></tr>
                    ) : filteredSorties.map((s) => {
                      const cfg  = statusConfig[s.status];
                      const Icon = cfg.icon;
                      return (
                        <tr key={s.id} className="hover:bg-custom-50 transition-colors">
                          <td className="px-3 py-2.5 text-sm font-semibold text-secondary-100">{s.stockItem?.itemName ?? "—"}</td>
                          <td className="px-3 py-2.5 text-sm text-secondary-100">{parseFloat(s.quantityOut)} {s.stockItem?.unit ?? ""}</td>
                          <td className="px-3 py-2.5 text-xs text-custom-700 max-w-[160px] truncate">{s.reason ?? "—"}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <Icon className={`w-4 h-4 ${cfg.color}`} />
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.color}`}>{cfg.label}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-custom-700">{new Date(s.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => setSelectedSortie(s)}
                              className="px-2.5 py-1 rounded-lg border border-custom-300 text-custom-700 hover:bg-custom-100 text-xs font-semibold transition-colors">
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ── New Request Modal ── */}
        {showModal && (
          <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <Card className="!p-6 max-w-lg w-full my-8">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-secondary-100">New Stock Request</h3>
                <button onClick={resetForm} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-secondary-100 mb-1.5">Item *</label>
                  <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} required
                    className="w-full px-3 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors">
                    <option value="">Select an item</option>
                    {items.filter((i) => i.stockStatus !== "out-of-stock").map((i) => (
                      <option key={i.id} value={i.id}>{i.itemName} ({i.currentStock} {i.unit} available)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-secondary-100 mb-1.5">Quantity *</label>
                  <input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-secondary-100 mb-1.5">Reason *</label>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} required
                    placeholder="Why do you need this item?"
                    className="w-full px-3 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-secondary-100 mb-1.5">Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="Any additional information..."
                    className="w-full px-3 py-2.5 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none" />
                </div>
                <div className="flex gap-3 justify-end pt-3 border-t border-custom-300">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Submit Request"}</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── Details Modal ── */}
        {selectedSortie && (
          <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
            <Card className="!p-6 max-w-md w-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-secondary-100">{selectedSortie.stockItem?.itemName ?? "Stock Request"}</h3>
                  <span className={`inline-block mt-1.5 text-xs font-bold px-3 py-1 rounded-full ${statusConfig[selectedSortie.status].bgColor} ${statusConfig[selectedSortie.status].color}`}>
                    {statusConfig[selectedSortie.status].label}
                  </span>
                </div>
                <button onClick={() => setSelectedSortie(null)} className="text-custom-700 hover:text-secondary-100"><HiOutlineX className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-custom-700">Quantity</span><span className="font-semibold text-secondary-100">{parseFloat(selectedSortie.quantityOut)} {selectedSortie.stockItem?.unit ?? ""}</span></div>
                {selectedSortie.reason && <div className="flex justify-between gap-4"><span className="text-custom-700 shrink-0">Reason</span><span className="text-secondary-100 text-right">{selectedSortie.reason}</span></div>}
                {selectedSortie.notes  && <div className="flex justify-between gap-4"><span className="text-custom-700 shrink-0">Notes</span><span className="text-secondary-100 text-right">{selectedSortie.notes}</span></div>}
                {selectedSortie.approvedBy && <div className="flex justify-between"><span className="text-custom-700">{selectedSortie.status === "approved" ? "Approved by" : "Reviewed by"}</span><span className="font-semibold text-secondary-100">{selectedSortie.approvedBy.name}</span></div>}
                <div className="flex justify-between"><span className="text-custom-700">Requested</span><span className="text-secondary-100">{new Date(selectedSortie.createdAt).toLocaleString()}</span></div>
              </div>
              <div className="flex justify-end mt-5 pt-4 border-t border-custom-300">
                <Button variant="outline" onClick={() => setSelectedSortie(null)}>Close</Button>
              </div>
            </Card>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
