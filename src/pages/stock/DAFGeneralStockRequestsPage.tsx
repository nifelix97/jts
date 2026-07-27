import { useState } from "react";
import {
  HiOutlineClipboardList,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from "react-icons/hi";
import { toast } from "react-toastify";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import {
  useGetGeneralStockSortiesQuery,
  useApproveGeneralStockSortieMutation,
  useRejectGeneralStockSortieMutation,
  type GeneralStockSortie,
  type SortieStatus,
} from "../../store/services/generalStockService";

const statusColors: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  taken:    "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
};

export default function DAFGeneralStockRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<SortieStatus | "">("");
  const { data, isLoading, refetch } = useGetGeneralStockSortiesQuery(
    statusFilter ? { status: statusFilter as SortieStatus } : undefined
  );
  const [approve] = useApproveGeneralStockSortieMutation();
  const [reject]  = useRejectGeneralStockSortieMutation();
  const sorties: GeneralStockSortie[] = data?.data ?? [];

  const handleApprove = async (id: string) => {
    try { await approve(id).unwrap(); toast.success("Approved"); }
    catch (e: any) { toast.error(e?.data?.message ?? "Failed to approve"); }
  };
  const handleReject = async (id: string) => {
    try { await reject(id).unwrap(); toast.success("Rejected"); }
    catch (e: any) { toast.error(e?.data?.message ?? "Failed to reject"); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <HiOutlineClipboardList className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">General Stock Requests</h1>
              <p className="text-sm text-custom-700 mt-0.5">Review sortie requests from general stock</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SortieStatus | "")}
              className="px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="taken">Taken</option>
            </select>
            <button onClick={() => refetch()} className="p-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-custom-700">
              <HiOutlineRefresh className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-custom-100 border-b border-custom-300">
                <tr>
                  {["Requester", "Item", "Qty", "Reason", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-custom-200">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-custom-700">Loading...</td></tr>
                ) : sorties.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center">
                    <HiOutlineClipboardList className="w-8 h-8 text-custom-400 mx-auto mb-2" />
                    <p className="text-sm text-secondary-100 font-semibold">No requests found</p>
                  </td></tr>
                ) : sorties.map((s) => (
                  <tr key={s.id} className="hover:bg-custom-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-secondary-100">{s.requester?.name ?? "—"}</p>
                      <p className="text-xs text-custom-700 capitalize">{s.requester?.role?.toLowerCase()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-secondary-100">{s.stockItem?.itemName ?? "—"}</p>
                      <p className="text-xs text-custom-700">{s.stockItem?.category}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-100">{parseFloat(s.quantityOut)} {s.stockItem?.unit ?? ""}</td>
                    <td className="px-4 py-3 text-sm text-custom-700 max-w-[160px] truncate">{s.reason ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-custom-700">
                      {new Date(s.createdAt).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === "pending" && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleApprove(s.id)}
                            className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors" title="Approve">
                            <HiOutlineCheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReject(s.id)}
                            className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors" title="Reject">
                            <HiOutlineXCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
