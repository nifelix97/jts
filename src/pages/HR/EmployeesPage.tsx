import { useState } from "react";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineOfficeBuilding,
  HiOutlineX,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineUser,
} from "react-icons/hi";
import { DashboardLayout } from "../../components";
import { Button, Card } from "../../components/ui";
import PhoneInput from "../../components/ui/PhoneInput";
import { useAuth } from "../../context/AuthContext";
import {
  useGetAllEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useToggleEmployeeActiveMutation,
  useAssignDepartmentMutation,
} from "../../store/services/employeesService";
import { useGetDepartmentsQuery } from "../../store/services/departmentsService";

function ViewEmployeeModal({ employee: emp, onClose }: { employee: any; onClose: () => void }) {
  const rows = [
    { label: "Full Name",     value: emp.fullName },
    { label: "Phone",         value: emp.phoneNumber },
    { label: "Email",         value: emp.email ?? "—" },
    { label: "Gender",        value: emp.gender ?? "—" },
    { label: "Date of Birth", value: emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString("en-GB") : "—" },
    { label: "NID",           value: emp.nid ?? "—" },
    { label: "Address",       value: emp.address ?? "—" },
    { label: "Contract Type", value: emp.contractType?.replace("_", " ") ?? "—" },
    { label: "Salary (RWF)",  value: emp.contractSalary != null ? emp.contractSalary.toLocaleString() : "—" },
    { label: "Department",    value: emp.department?.name ?? "Unassigned" },
    { label: "Hired At",      value: emp.hiredAt ? new Date(emp.hiredAt).toLocaleDateString("en-GB") : "—" },
    { label: "Bank Account",  value: emp.bankAccount ?? "—" },
    { label: "Support Contact", value: emp.supportContact ?? "—" },
    { label: "Status",        value: emp.isActive ? "Active" : "Inactive" },
  ];
  return (
    <div className="fixed inset-0 bg-secondary-100/60 z-50 flex items-center justify-center p-4">
      <Card className="!p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <HiOutlineUser className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary-100">{emp.fullName}</h3>
              <p className="text-xs text-custom-700">{emp.department?.name ?? "No department"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-start py-2 border-b border-custom-100 last:border-0">
              <span className="text-xs font-semibold text-custom-700 w-36 shrink-0">{label}</span>
              <span className="text-sm text-secondary-100 text-right">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors">Close</button>
        </div>
      </Card>
    </div>
  );
}

export default function EmployeesPage() {
  const { userName, userRole } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<any>(null);
  const [viewEmployee, setViewEmployee] = useState<any>(null);
  const [assignEmployee, setAssignEmployee] = useState<any>(null);
  const { data, isLoading } = useGetAllEmployeesQuery({ page, limit: 10, search: search || undefined });
  const [toggleActive] = useToggleEmployeeActiveMutation();

  const employees = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <DashboardLayout userRole={userRole ?? "hr"} userName={userName ?? "HR"} notificationCount={0}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary-100">Employees</h1>
            <p className="mt-1 text-sm text-custom-700">{total} total employees</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2 text-sm">
            <HiOutlinePlus className="h-4 w-4" /> Add Employee
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-custom-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, phone, email…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-custom-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <Card className="!p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-custom-500">
              <HiOutlineRefresh className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : employees.length === 0 ? (
            <div className="py-16 text-center text-sm text-custom-400">No employees found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-custom-50 border-b border-custom-200">
                  <tr>
                    {["Full Name", "Phone", "Email", "Contract", "Salary", "Department", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-custom-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-custom-100">
                  {employees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-custom-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-secondary-100">{emp.fullName}</td>
                      <td className="px-4 py-3 text-custom-700">{emp.phoneNumber}</td>
                      <td className="px-4 py-3 text-custom-700">{emp.email ?? "—"}</td>
                      <td className="px-4 py-3 text-custom-700">{emp.contractType?.replace("_", " ") ?? "—"}</td>
                      <td className="px-4 py-3 text-custom-700 font-medium">{emp.contractSalary != null ? emp.contractSalary.toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">
                        {emp.department?.name ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {emp.department.name}
                          </span>
                        ) : (
                          <span className="text-xs text-custom-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(emp.id)}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${emp.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {emp.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Assign Department */}
                          <button
                            onClick={() => setAssignEmployee(emp)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors"
                            title="Assign Department"
                          >
                            <HiOutlineOfficeBuilding className="h-3.5 w-3.5" />
                            Assign
                          </button>
                          {/* View */}
                          <button
                            onClick={() => setViewEmployee(emp)}
                            className="p-1.5 rounded hover:bg-custom-100 text-custom-400 hover:text-secondary-100 transition-colors"
                            title="View"
                          >
                            <HiOutlineEye className="h-4 w-4" />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => setEditEmployee(emp)}
                            className="p-1.5 rounded hover:bg-primary-50 text-custom-400 hover:text-primary-600 transition-colors"
                            title="Edit"
                          >
                            <HiOutlinePencil className="h-4 w-4" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteEmployee(emp)}
                            className="p-1.5 rounded hover:bg-red-50 text-custom-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pagination */}
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

      {showCreate && <EmployeeFormModal onClose={() => setShowCreate(false)} />}
      {editEmployee && <EmployeeFormModal employee={editEmployee} onClose={() => setEditEmployee(null)} />}
      {deleteEmployee && <DeleteEmployeeModal employee={deleteEmployee} onClose={() => setDeleteEmployee(null)} />}
      {assignEmployee && <AssignDepartmentModal employee={assignEmployee} onClose={() => setAssignEmployee(null)} />}
      {viewEmployee && <ViewEmployeeModal employee={viewEmployee} onClose={() => setViewEmployee(null)} />}
    </DashboardLayout>
  );
}

// ─── Assign Department Modal ──────────────────────────────────────────────────

function AssignDepartmentModal({ employee, onClose }: { employee: any; onClose: () => void }) {
  const { data: departments = [], isLoading: loadingDepts } = useGetDepartmentsQuery();
  const [assignDepartment, { isLoading, error }] = useAssignDepartmentMutation();
  const [selectedId, setSelectedId] = useState<string>(employee.department?.id ?? employee.departmentId ?? "");

  async function handleSave() {
    try {
      await assignDepartment({ id: employee.id, departmentId: selectedId || null }).unwrap();
      onClose();
    } catch { /* error shown below */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-custom-200">
          <div>
            <h2 className="text-lg font-bold text-secondary-100">Assign Department</h2>
            <p className="text-xs text-custom-500 mt-0.5">{employee.fullName}</p>
          </div>
          <button onClick={onClose} className="text-custom-400 hover:text-custom-700 transition-colors">
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">Department</label>
            {loadingDepts ? (
              <div className="flex items-center gap-2 text-sm text-custom-400">
                <HiOutlineRefresh className="h-4 w-4 animate-spin" /> Loading departments…
              </div>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-custom-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Unassign —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Current department indicator */}
          {employee.department?.name && (
            <p className="text-xs text-custom-500">
              Currently in: <span className="font-semibold text-secondary-100">{employee.department.name}</span>
            </p>
          )}

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(error as any)?.data?.message ?? "Failed to assign department."}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="text-sm">Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading || loadingDepts} className="flex items-center gap-2 text-sm">
              {isLoading ? <HiOutlineRefresh className="h-4 w-4 animate-spin" /> : <HiOutlineOfficeBuilding className="h-4 w-4" />}
              {isLoading ? "Saving…" : "Assign"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  fullName: "",
  phoneNumber: "",
  gender: "MALE",
  dateOfBirth: "",
  address: "",
  email: "",
  nid: "",
  contractType: "FULL_TIME",
  contractSalary: "",
  hiredAt: "",
  password: "",
};

const inputCls = "w-full px-3 py-2 rounded-lg border border-custom-300 bg-white text-sm placeholder:text-custom-300 focus:outline-none focus:ring-2 focus:ring-primary-500";
const labelCls = "block text-xs font-semibold text-secondary-100 mb-1";

function EmployeeFormModal({ employee, onClose }: { employee?: any; onClose: () => void }) {
  const isEdit = !!employee;
  const [createEmployee, { isLoading: creating, error: createError }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: updating, error: updateError }] = useUpdateEmployeeMutation();
  const isLoading = creating || updating;
  const error = createError || updateError;
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    fullName: employee?.fullName ?? "",
    phoneNumber: employee?.phoneNumber ?? "",
    gender: employee?.gender ?? "MALE",
    dateOfBirth: employee?.dateOfBirth?.slice(0, 10) ?? "",
    address: employee?.address ?? "",
    email: employee?.email ?? "",
    nid: employee?.nid ?? "",
    contractType: employee?.contractType ?? "FULL_TIME",
    contractSalary: employee?.contractSalary ?? "",
    hiredAt: employee?.hiredAt?.slice(0, 10) ?? "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleClear = () => setForm({ ...EMPTY_FORM });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: any = {
      ...form,
      contractSalary: Number(form.contractSalary),
      email: form.email || undefined,
      nid: form.nid || undefined,
      hiredAt: form.hiredAt || undefined,
    };
    if (isEdit || !form.password) delete body.password;
    try {
      if (isEdit) {
        await updateEmployee({ id: employee.id, ...body }).unwrap();
      } else {
        await createEmployee(body).unwrap();
      }
      onClose();
    } catch { /* error shown below */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-custom-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-secondary-100">{isEdit ? "Edit Employee" : "Add Employee"}</h2>
            <p className="text-xs text-custom-400 mt-0.5">{isEdit ? "Update employee information" : "Fill in the details to register a new employee"}</p>
          </div>
          <button onClick={onClose} className="text-custom-400 hover:text-custom-700"><HiOutlineX className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Section: Personal Info */}
          <div>
            <p className="text-xs font-bold text-custom-400 uppercase tracking-wider mb-3">Personal Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.fullName} onChange={(e) => set("fullName", e.target.value)}
                  required placeholder="e.g. Jean Paul Habimana" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Gender <span className="text-red-500">*</span></label>
                <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputCls}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)}
                  required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
                <PhoneInput
                  value={form.phoneNumber}
                  onChange={(val) => set("phoneNumber", val)}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                  placeholder="e.g. jean@example.com" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Address <span className="text-red-500">*</span></label>
                <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)}
                  required placeholder="e.g. KG 123 St, Kigali" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>NID</label>
                <input type="text" value={form.nid} onChange={(e) => set("nid", e.target.value)}
                  placeholder="National ID number" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Hired At</label>
                <input type="date" value={form.hiredAt} onChange={(e) => set("hiredAt", e.target.value)}
                  className={inputCls} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-custom-100" />

          {/* Section: Contract */}
          <div>
            <p className="text-xs font-bold text-custom-400 uppercase tracking-wider mb-3">Contract Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Contract Type</label>
                <select value={form.contractType} onChange={(e) => set("contractType", e.target.value)} className={inputCls}>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Contract Salary (RWF) <span className="text-red-500">*</span></label>
                <input type="number" value={form.contractSalary} onChange={(e) => set("contractSalary", e.target.value)}
                  required min={0} placeholder="e.g. 250000" className={inputCls} />
              </div>
              
            </div>
          </div>

          {/* Section: Account — create only */}
          {!isEdit && (
            <>
              <div className="border-t border-custom-100" />
              <div>
                <p className="text-xs font-bold text-custom-400 uppercase tracking-wider mb-3">Login Account</p>
                <div>
                  <label className={labelCls}>Password <span className="text-custom-700 font-normal">(optional)</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="Set a strong initial password"
                      className={`${inputCls} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-custom-400 hover:text-custom-700">
                      {showPassword ? <HiOutlineEyeOff className="h-4 w-4" /> : <HiOutlineEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(error as any)?.data?.message ?? "An error occurred."}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center gap-2 pt-2 border-t border-custom-100">
            <Button variant="outline" type="button" onClick={handleClear} className="text-sm">Clear</Button>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={onClose} className="text-sm">Cancel</Button>
              <Button type="submit" disabled={isLoading} className="text-sm">
                {isLoading ? "Saving…" : isEdit ? "Save Changes" : "Add Employee"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteEmployeeModal({ employee, onClose }: { employee: any; onClose: () => void }) {
  const [deleteEmployee, { isLoading, error }] = useDeleteEmployeeMutation();

  async function handleDelete() {
    try {
      await deleteEmployee(employee.id).unwrap();
      onClose();
    } catch { /* error shown below */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="px-6 py-4 border-b border-custom-200">
          <h2 className="text-lg font-bold text-secondary-100">Delete Employee</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-custom-700">
            Delete <span className="font-bold text-secondary-100">{employee.fullName}</span>? This cannot be undone.
          </p>
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {(error as any)?.data?.message ?? "Failed to delete."}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="text-sm">Cancel</Button>
            <button onClick={handleDelete} disabled={isLoading} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50">
              {isLoading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
