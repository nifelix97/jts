import { useState } from "react";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineCash,
  HiOutlineFilter,
  HiOutlineEye,
} from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import { DashboardLayout } from "../../components";
import { Button, Card } from "../../components/ui";
import {
  useGetPayrollsQuery,
  useCreatePayrollMutation,
  useUpdatePayrollMutation,
  useApprovePayrollMutation,
  useMarkPayrollPaidMutation,
  useRejectPayrollMutation,
  useDeletePayrollMutation,
  type Payroll,
  type CreatePayrollPayload,
  type WorkerType,
  type PayrollStatus,
} from "../../store/services/payrollService";
import { useGetAllEmployeesQuery } from "../../store/services/employeesService";
import { useGetCasualWorkersQuery } from "../../store/services/casualWorkersService";

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-custom-300 bg-white text-sm placeholder:text-custom-300 focus:outline-none focus:ring-2 focus:ring-primary-500";
const labelCls = "block text-xs font-semibold text-secondary-100 mb-1";

const STATUS_STYLES: Record<PayrollStatus, string> = {
  draft: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayrollPage() {
  const { userRole, userName: authUserName } = useAuth();
  const isReadOnly = userRole === "accountant";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<WorkerType | "">("");
  const [filterStatus, setFilterStatus] = useState<PayrollStatus | "">("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [periodPreset, setPeriodPreset] = useState<"" | "month" | "year">("month");
  const [showCreate, setShowCreate] = useState(false);
  const [editPayroll, setEditPayroll] = useState<Payroll | null>(null);
  const [deletePayroll, setDeletePayroll] = useState<Payroll | null>(null);
  const [viewPayroll, setViewPayroll] = useState<Payroll | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ payroll: Payroll; action: "approve" | "pay" | "reject" } | null>(null);

  const [approve, { isLoading: approving }] = useApprovePayrollMutation();
  const [markPaid, { isLoading: paying }] = useMarkPayrollPaidMutation();
  const [reject, { isLoading: rejecting }] = useRejectPayrollMutation();

  const { data, isLoading, isFetching, refetch } = useGetPayrollsQuery({
    page,
    limit: 15,
    ...(filterType ? { workerType: filterType } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterPeriod ? { period: filterPeriod } : periodPreset ? (() => {
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth();
      const pad = (n: number) => String(n).padStart(2, "0");
      if (periodPreset === "month") return { period: `${y}-${pad(m + 1)}` };
      if (periodPreset === "year")  return { dateFrom: `${y}-01`, dateTo: `${y}-12` };
      return {};
    })() : {}),
    ...(search ? { search } : {}),
  });

  const payrolls = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 15);

  const totalNetDraft = payrolls.filter(p => p.status === "draft").reduce((s, p) => s + Number(p.netSalary), 0);
  const totalNetApproved = payrolls.filter(p => p.status === "approved").reduce((s, p) => s + Number(p.netSalary), 0);
  const totalNetPaid = payrolls.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.netSalary), 0);

  return (
    <DashboardLayout userRole={userRole ?? "hr"} userName={authUserName ?? ""}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary-100">Payroll</h1>
            <p className="mt-1 text-sm text-custom-700">{total} records</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} disabled={isFetching}
              className="p-2 rounded-lg border border-custom-300 hover:bg-custom-50 text-custom-500 hover:text-secondary-100 disabled:opacity-50"
              title="Refresh">
              <HiOutlineRefresh className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2 text-sm">
              <HiOutlinePlus className="h-4 w-4" /> New Payroll
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Draft", amount: totalNetDraft, color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
            { label: "Approved", amount: totalNetApproved, color: "bg-blue-50 border-blue-200 text-blue-700" },
            { label: "Paid", amount: totalNetPaid, color: "bg-green-50 border-green-200 text-green-700" },
          ].map(({ label, amount, color }) => (
            <div key={label} className={`rounded-xl border px-5 py-4 ${color}`}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
              <p className="text-2xl font-bold mt-1">{amount.toLocaleString("en-RW")} <span className="text-sm font-normal">RWF</span></p>
            </div>
          ))}
        </div>

        {/* Period preset tabs */}
        <div className="flex gap-1 p-1 bg-custom-100 rounded-xl w-fit">
          {(["month", "year"] as const).map((p) => (
            <button key={p} onClick={() => { setPeriodPreset(p); setFilterPeriod(""); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodPreset === p && !filterPeriod
                  ? "bg-style-500 text-secondary-100 shadow-sm"
                  : "text-custom-700 hover:text-secondary-100"
              }`}>
              {p === "month" ? "This Month" : "This Year"}
            </button>
          ))}
        </div>

        {/* Row 2: search + type + status + custom month + clear */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-custom-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name…"
              className="pl-9 pr-3 py-2 rounded-lg border border-custom-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
            />
          </div>
          <div className="flex items-center gap-1 text-custom-400">
            <HiOutlineFilter className="h-4 w-4" />
          </div>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value as WorkerType | ""); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-custom-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Types</option>
            <option value="employee">Employee</option>
            <option value="casual">Casual</option>
          </select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as PayrollStatus | ""); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-custom-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
          <input type="month" value={filterPeriod} onChange={(e) => { setFilterPeriod(e.target.value); setPeriodPreset(""); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-custom-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          {(filterType || filterStatus || filterPeriod || search || periodPreset) && (
            <button onClick={() => { setFilterType(""); setFilterStatus(""); setFilterPeriod(""); setSearch(""); setPeriodPreset("month"); setPage(1); }}
              className="text-xs text-red-500 hover:underline">Clear filters</button>
          )}
        </div>

        {/* Table */}
        <Card className="!p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-custom-500">
              <HiOutlineRefresh className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : payrolls.length === 0 ? (
            <div className="py-16 text-center text-sm text-custom-400">No payroll records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-custom-50 border-b border-custom-200">
                  <tr>
                    {["Worker", "Type", "Period", "Salary", "Overtime", "Deductions", "Net Salary", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-custom-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-custom-100">
                  {payrolls.map((p) => (
                    <tr key={p.id} className="hover:bg-custom-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-secondary-100 whitespace-nowrap">
                        {p.casualWorker?.fullName ?? p.employee?.fullName ?? p.workerName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.workerType === "employee" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>
                          {p.workerType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-custom-700 whitespace-nowrap">{p.period}</td>
                      <td className="px-4 py-3 text-custom-700">{Number(p.salary).toLocaleString("en-RW")}</td>
                      <td className="px-4 py-3 text-custom-700">{Number(p.overtime) > 0 ? `+${Number(p.overtime).toLocaleString("en-RW")}` : "—"}</td>
                      <td className="px-4 py-3 text-red-600">{Number(p.deductions) > 0 ? `-${Number(p.deductions).toLocaleString("en-RW")}` : "—"}</td>
                      <td className="px-4 py-3 font-bold text-secondary-100">{Number(p.netSalary).toLocaleString("en-RW")}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[p.status]}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewPayroll(p)}
                            className="p-1.5 rounded hover:bg-custom-100 text-custom-400 hover:text-secondary-100"
                            title="View">
                            <HiOutlineEye className="h-4 w-4" />
                          </button>
                          {!isReadOnly && (
                            <>
                              {p.status === "draft" && (
                                <>
                                  <button onClick={() => setConfirmAction({ payroll: p, action: "approve" })}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold"
                                    title="Approve">
                                    <HiOutlineCheck className="h-3.5 w-3.5" /> Approve
                                  </button>
                                  <button onClick={() => setConfirmAction({ payroll: p, action: "reject" })}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold"
                                    title="Reject">
                                    <HiOutlineX className="h-3.5 w-3.5" /> Reject
                                  </button>
                                  <button onClick={() => setEditPayroll(p)}
                                    className="p-1.5 rounded hover:bg-primary-50 text-custom-400 hover:text-primary-600"
                                    title="Edit">
                                    <HiOutlinePencil className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => setDeletePayroll(p)}
                                    className="p-1.5 rounded hover:bg-red-50 text-custom-400 hover:text-red-600"
                                    title="Delete">
                                    <HiOutlineTrash className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {p.status === "approved" && (
                                <button onClick={() => setConfirmAction({ payroll: p, action: "pay" })}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold"
                                  title="Mark Paid">
                                  <HiOutlineCash className="h-3.5 w-3.5" /> Mark Paid
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-custom-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-xs">Previous</Button>
              <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-xs">Next</Button>
            </div>
          </div>
        )}
      </div>

      {viewPayroll && <PayrollViewModal payroll={viewPayroll} onClose={() => setViewPayroll(null)} />}
      {showCreate && <PayrollFormModal onClose={() => setShowCreate(false)} />}
      {editPayroll && <PayrollFormModal payroll={editPayroll} onClose={() => setEditPayroll(null)} />}
      {deletePayroll && <DeletePayrollModal payroll={deletePayroll} onClose={() => setDeletePayroll(null)} />}
      {confirmAction && (
        <ConfirmActionModal
          payroll={confirmAction.payroll}
          action={confirmAction.action}
          isLoading={confirmAction.action === "approve" ? approving : confirmAction.action === "reject" ? rejecting : paying}
          onConfirm={async (comment) => {
            if (confirmAction.action === "approve") await approve(confirmAction.payroll.id);
            else if (confirmAction.action === "reject") await reject({ id: confirmAction.payroll.id, rejectionComment: comment ?? "" });
            else await markPaid(confirmAction.payroll.id);
            setConfirmAction(null);
          }}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </DashboardLayout>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function PayrollFormModal({ payroll, onClose }: { payroll?: Payroll; onClose: () => void }) {
  const isEdit = !!payroll;
  const [create, { isLoading: creating, error: createErr }] = useCreatePayrollMutation();
  const [update, { isLoading: updating, error: updateErr }] = useUpdatePayrollMutation();
  const isLoading = creating || updating;
  const error = createErr || updateErr;

  // tab: which worker type is being paid
  const [tab, setTab] = useState<WorkerType>(payroll?.workerType ?? "casual");

  const [form, setForm] = useState({
    employeeId: payroll?.employeeId ?? "",
    casualWorkerId: payroll?.casualWorkerId ?? "",
    period: payroll?.period ?? currentPeriod(),
    salary: payroll?.salary != null ? String(payroll.salary) : "",
    overtime: payroll?.overtime != null ? String(payroll.overtime) : "",
    deductions: payroll?.deductions != null ? String(payroll.deductions) : "",
    notes: payroll?.notes ?? "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const netPreview = (parseFloat(form.salary) || 0) + (parseFloat(form.overtime) || 0) - (parseFloat(form.deductions) || 0);

  const { data: empData } = useGetAllEmployeesQuery({ limit: 500 });
  const { data: casualData } = useGetCasualWorkersQuery({ limit: 500 });
  const employees = empData?.data ?? [];
  const casualWorkers = casualData?.data ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: CreatePayrollPayload = {
      workerType: tab,
      ...(tab === "employee" ? { employeeId: form.employeeId } : { casualWorkerId: form.casualWorkerId }),
      period: form.period,
      salary: parseFloat(form.salary) || 0,
      overtime: parseFloat(form.overtime) || 0,
      deductions: parseFloat(form.deductions) || 0,
      notes: form.notes || undefined,
    };
    try {
      if (isEdit) await update({ id: payroll.id, ...body }).unwrap();
      else await create(body).unwrap();
      onClose();
    } catch { /* shown below */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-custom-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-secondary-100">{isEdit ? "Edit Payroll" : "New Payroll"}</h2>
          <button onClick={onClose} className="text-custom-400 hover:text-custom-700"><HiOutlineX className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Worker type tabs — only on create */}
          {!isEdit && (
            <div className="flex rounded-xl border border-custom-300 overflow-hidden">
              {(["employee", "casual"] as WorkerType[]).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors ${
                    tab === t
                      ? t === "employee" ? "bg-purple-600 text-white" : "bg-orange-500 text-white"
                      : "text-custom-500 hover:bg-custom-50"
                  }`}>
                  {t === "employee" ? "Employee" : "Casual Worker"}
                </button>
              ))}
            </div>
          )}

          {/* Worker selector */}
          {tab === "employee" ? (
            <div className="space-y-2">
              <div>
                <label className={labelCls}>Employee <span className="text-red-500">*</span></label>
                <select required value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} className={inputCls}>
                  <option value="">— Select employee —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
              {form.employeeId && (() => {
                const emp = employees.find(e => e.id === form.employeeId);
                if (!emp) return null;
                return (
                  <div className="flex flex-wrap gap-3 rounded-lg bg-purple-50 border border-purple-200 px-4 py-2.5 text-xs">
                    {emp.department?.name && (
                      <span className="text-purple-700"><span className="font-semibold">Department:</span> {emp.department.name}</span>
                    )}
                    {emp.contractType && (
                      <span className="text-purple-700"><span className="font-semibold">Contract:</span> {emp.contractType.replace("_", " ")}</span>
                    )}
                    {emp.contractSalary != null && (
                      <span className="text-purple-700"><span className="font-semibold">Base Salary:</span> {Number(emp.contractSalary).toLocaleString()} RWF</span>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div>
              <label className={labelCls}>Casual Worker <span className="text-red-500">*</span></label>
              <select required value={form.casualWorkerId} onChange={(e) => set("casualWorkerId", e.target.value)} className={inputCls}>
                <option value="">— Select casual worker —</option>
                {casualWorkers.map((w) => (
                  <option key={w.id} value={w.id}>{w.fullName}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Period <span className="text-red-500">*</span></label>
              <input type="month" required value={form.period} onChange={(e) => set("period", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Base Salary (RWF) <span className="text-red-500">*</span></label>
              <input type="number" required min={0} placeholder="e.g. 50000" value={form.salary}
                onChange={(e) => set("salary", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Overtime (RWF)</label>
              <input type="number" min={0} placeholder="e.g. 5000" value={form.overtime}
                onChange={(e) => set("overtime", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Deductions (RWF)</label>
              <input type="number" min={0} placeholder="e.g. 2000" value={form.deductions}
                onChange={(e) => set("deductions", e.target.value)} className={inputCls} />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <p className="text-xs text-custom-500 font-semibold">Net Salary (preview)</p>
                <p className="text-lg font-bold text-green-700 mt-0.5">
                  {form.salary ? netPreview.toLocaleString() : "—"}{form.salary ? " RWF" : ""}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
              placeholder="Optional remarks…" className={inputCls + " resize-none"} />
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(error as any)?.data?.message ?? "An error occurred."}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-custom-100">
            <Button variant="outline" type="button" onClick={onClose} className="text-sm">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="text-sm">
              {isLoading ? "Saving…" : isEdit ? "Save Changes" : "Create Payroll"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeletePayrollModal({ payroll, onClose }: { payroll: Payroll; onClose: () => void }) {
  const [deletePayroll, { isLoading, error }] = useDeletePayrollMutation();

  async function handleDelete() {
    try {
      await deletePayroll(payroll.id).unwrap();
      onClose();
    } catch { /* shown below */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="px-6 py-4 border-b border-custom-200">
          <h2 className="text-lg font-bold text-secondary-100">Delete Payroll</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-custom-700">
            Delete payroll for <span className="font-bold text-secondary-100">{payroll.casualWorker?.fullName ?? payroll.employee?.fullName ?? payroll.workerName ?? "this worker"}</span> ({payroll.period})? This cannot be undone.
          </p>
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(error as any)?.data?.message ?? "Failed to delete."}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="text-sm">Cancel</Button>
            <button onClick={handleDelete} disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50">
              {isLoading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Action Modal ─────────────────────────────────────────────────────

function ConfirmActionModal({
  payroll, action, isLoading, onConfirm, onClose,
}: {
  payroll: Payroll;
  action: "approve" | "pay" | "reject";
  isLoading: boolean;
  onConfirm: (comment?: string) => void;
  onClose: () => void;
}) {
  const [comment, setComment] = useState("");
  const name = payroll.casualWorker?.fullName ?? payroll.employee?.fullName ?? payroll.workerName ?? "this worker";
  const isApprove = action === "approve";
  const isReject = action === "reject";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="px-6 py-4 border-b border-custom-200 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isApprove ? "bg-blue-100" : isReject ? "bg-red-100" : "bg-green-100"}`}>
            {isApprove
              ? <HiOutlineCheck className="h-5 w-5 text-blue-600" />
              : isReject
              ? <HiOutlineX className="h-5 w-5 text-red-600" />
              : <HiOutlineCash className="h-5 w-5 text-green-600" />}
          </div>
          <h2 className="text-lg font-bold text-secondary-100">
            {isApprove ? "Approve Payroll" : isReject ? "Reject Payroll" : "Mark as Paid"}
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-custom-700">
            {isApprove ? (
              <>Approve payroll for <span className="font-bold text-secondary-100">{name}</span> — period <span className="font-bold text-secondary-100">{payroll.period}</span>, net <span className="font-bold text-secondary-100">{Number(payroll.netSalary).toLocaleString("en-RW")} RWF</span>?</>
            ) : isReject ? (
              <>Reject payroll for <span className="font-bold text-secondary-100">{name}</span> — period <span className="font-bold text-secondary-100">{payroll.period}</span>?</>
            ) : (
              <>Mark payroll for <span className="font-bold text-secondary-100">{name}</span> — period <span className="font-bold text-secondary-100">{payroll.period}</span>, net <span className="font-bold text-secondary-100">{Number(payroll.netSalary).toLocaleString("en-RW")} RWF</span> as paid?</>
            )}
          </p>
          {isReject && (
            <div>
              <label className={labelCls}>Reason <span className="text-red-500">*</span></label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Enter rejection reason…"
                className={inputCls + " resize-none"}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="text-sm">Cancel</Button>
            <button
              onClick={() => onConfirm(isReject ? comment : undefined)}
              disabled={isLoading || (isReject && !comment.trim())}
              className={`px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 ${
                isApprove ? "bg-blue-600 hover:bg-blue-700" : isReject ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              }`}>
              {isLoading ? "Processing…" : isApprove ? "Yes, Approve" : isReject ? "Yes, Reject" : "Yes, Mark Paid"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function PayrollViewModal({ payroll, onClose }: { payroll: Payroll; onClose: () => void }) {
  const name = payroll.casualWorker?.fullName ?? payroll.employee?.fullName ?? payroll.workerName ?? "—";

  const rows: [string, string][] = [
    ["Worker", name],
    ["Type", payroll.workerType],
    ["Period", payroll.period],
    ["Base Salary", `${Number(payroll.salary).toLocaleString("en-RW")} RWF`],
    ["Overtime", Number(payroll.overtime) > 0 ? `+${Number(payroll.overtime).toLocaleString("en-RW")} RWF` : "—"],
    ["Deductions", Number(payroll.deductions) > 0 ? `-${Number(payroll.deductions).toLocaleString("en-RW")} RWF` : "—"],
    ["Net Salary", `${Number(payroll.netSalary).toLocaleString("en-RW")} RWF`],
    ["Status", payroll.status],
    ...(payroll.notes ? [["Notes", payroll.notes] as [string, string]] : []),
    ...(payroll.rejectionComment ? [["Rejection Reason", payroll.rejectionComment] as [string, string]] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-custom-200">
          <h2 className="text-lg font-bold text-secondary-100">Payroll Details</h2>
          <button onClick={onClose} className="text-custom-400 hover:text-custom-700"><HiOutlineX className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between items-start gap-4 text-sm">
              <span className="text-custom-500 font-semibold shrink-0">{label}</span>
              <span className={`text-right font-medium ${
                label === "Status"
                  ? `px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[payroll.status]}`
                  : label === "Net Salary"
                  ? "text-secondary-100 font-bold"
                  : label === "Rejection Reason"
                  ? "text-red-600"
                  : "text-secondary-100"
              }`}>{value}</span>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-custom-100 flex justify-end">
          <Button variant="outline" onClick={onClose} className="text-sm">Close</Button>
        </div>
      </div>
    </div>
  );
}
