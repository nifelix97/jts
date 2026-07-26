import { useMemo, useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineSearch,
  HiOutlineUsers,
  HiOutlineX,
  HiOutlineRefresh,
} from "react-icons/hi";
import { DashboardLayout } from "../../components";
import { Card } from "../../components/ui";
import { useGetJobsQuery, type Job, type JobState } from "../../store/services/jobsService";
import { useGetDepartmentsQuery } from "../../store/services/departmentsService";
import { useGetAllEmployeesQuery } from "../../store/services/employeesService";
import { jobStatusConfig } from "../../types/JobStatus";

// ─── State badge ──────────────────────────────────────────────────────────────

const STATE_LABELS: Record<NonNullable<JobState>, string> = {
  "in-composition":    "In Composition",
  "in-montage":        "In Montage",
  "in-printing":       "In Printing",
  "in-binding":        "In Binding",
  "in-packaging":      "In Packaging",
  "quality-check":     "Quality Check",
  "composition-done":  "Composition Done",
  "montage-done":      "Montage Done",
  "printing-done":     "Printing Done",
  "binding-done":      "Binding Done",
  "packaging-done":    "Packaging Done",
  "qualitycheck-done": "Quality Check Done",
};

const STATE_COLORS: Record<NonNullable<JobState>, { bg: string; text: string }> = {
  "in-composition":    { bg: "bg-orange-100",  text: "text-orange-700" },
  "in-montage":        { bg: "bg-amber-100",   text: "text-amber-700" },
  "in-printing":       { bg: "bg-pink-100",    text: "text-pink-700" },
  "in-binding":        { bg: "bg-teal-100",    text: "text-teal-700" },
  "in-packaging":      { bg: "bg-cyan-100",    text: "text-cyan-700" },
  "quality-check":     { bg: "bg-purple-100",  text: "text-purple-700" },
  "composition-done":  { bg: "bg-green-100",   text: "text-green-700" },
  "montage-done":      { bg: "bg-green-100",   text: "text-green-700" },
  "printing-done":     { bg: "bg-green-100",   text: "text-green-700" },
  "binding-done":      { bg: "bg-green-100",   text: "text-green-700" },
  "packaging-done":    { bg: "bg-green-100",   text: "text-green-700" },
  "qualitycheck-done": { bg: "bg-green-100",   text: "text-green-700" },
};

function StateBadge({ state }: { state: JobState }) {
  if (!state) return <span className="text-xs text-custom-500 italic">—</span>;
  const label  = STATE_LABELS[state] ?? state;
  const colors = STATE_COLORS[state] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      {label}
    </span>
  );
}

const priorityColor: Record<string, string> = {
  low:    "bg-green-100 text-green-700",
  normal: "bg-blue-100 text-blue-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-500 text-white",
};

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DONE_STATUSES = ["delivered", "completed", "rejected"];

function isCompleted(job: Job): boolean {
  return DONE_STATUSES.includes(job.status);
}

const DEPT_COLORS = ["purple", "indigo", "cyan", "teal", "green", "blue", "orange", "pink"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductionOverviewPage({ userRole = "admin" }: { userRole?: string }) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } =
    useGetJobsQuery({ limit: 1000 });

  const { data: departments = [], isLoading: deptsLoading, refetch: refetchDepts } =
    useGetDepartmentsQuery();

  const { data: employeesData, isLoading: empsLoading, refetch: refetchEmps } =
    useGetAllEmployeesQuery({ limit: 2000 });

  const allJobs: Job[] = jobsData?.jobs ?? [];
  const allEmployees = employeesData?.data ?? [];
  const isLoading = jobsLoading || deptsLoading || empsLoading;

  const refetchAll = () => { refetchJobs(); refetchDepts(); refetchEmps(); };

  // Per-department stats derived from real data
  const deptStats = useMemo(() =>
    departments.map((dept, idx) => {
      const deptJobs = allJobs.filter((j) => j.departmentAssignedToId === dept.id);
      const activeJobs = deptJobs.filter((j) => !DONE_STATUSES.includes(j.status)).length;
      const completedJobs = deptJobs.filter(isCompleted).length;
      const workers = allEmployees.filter((e) => e.departmentId === dept.id && e.isActive).length;
      const total = deptJobs.length;
      return {
        id: dept.id,
        name: dept.name,
        activeJobs,
        completedJobs,
        workers,
        color: DEPT_COLORS[idx % DEPT_COLORS.length],
        totalJobs: total,
      };
    }),
    [departments, allJobs, allEmployees]
  );

  const overallStats = useMemo(() => {
    const activeJobs = allJobs.filter((j) => !DONE_STATUSES.includes(j.status)).length;
    const completedJobs = allJobs.filter(isCompleted).length;
    const activeWorkers = allEmployees.filter((e) => e.isActive).length;
    return { activeJobs, completedJobs, activeWorkers };
  }, [allJobs, allEmployees]);

  // Bottlenecks: departments with many active jobs
  const bottlenecks = useMemo(() =>
    deptStats
      .filter((d) => d.activeJobs >= 5)
      .sort((a, b) => b.activeJobs - a.activeJobs)
      .slice(0, 3)
      .map((d) => ({
        department: d.name,
        issue: `${d.activeJobs} active job${d.activeJobs !== 1 ? "s" : ""} in queue`,
        recommendation:
          d.activeJobs >= 10
            ? "Assign additional workers or redistribute jobs"
            : "Monitor progress and prioritize urgent jobs",
      })),
    [deptStats]
  );

  // Recent activity: last 6 jobs touched
  const recentActivity = useMemo(() =>
    [...allJobs]
      .filter((j) => j.departmentAssignedToId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
      .map((j) => {
        const deptName = departments.find((d) => d.id === j.departmentAssignedToId)?.name ?? "Production";
        const diff = Date.now() - new Date(j.updatedAt).getTime();
        const mins = Math.floor(diff / 60000);
        const timeAgo = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
        return {
          time: timeAgo,
          action: `${j.jobNumber} — ${j.title} (${j.status.replace(/-/g, " ")})`,
          dept: deptName,
        };
      }),
    [allJobs, departments]
  );

  const selectedDept = deptStats.find((d) => d.id === selectedDeptId) ?? null;

  // Jobs table state
  const [jobSearch, setJobSearch] = useState("");
  const [jobPage, setJobPage]     = useState(1);

  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments]
  );

  const filteredJobs = useMemo(() => {
    const q = jobSearch.toLowerCase();
    return allJobs.filter(
      (j) =>
        j.jobNumber?.toLowerCase().includes(q) ||
        j.title?.toLowerCase().includes(q) ||
        j.customer?.name?.toLowerCase().includes(q)
    );
  }, [allJobs, jobSearch]);

  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const paginatedJobs = filteredJobs.slice((jobPage - 1) * PAGE_SIZE, jobPage * PAGE_SIZE);

  return (
    <DashboardLayout userRole={userRole as any} userName={userRole === "daf" ? "DAF" : "Admin"} notificationCount={0}>
      <div className="space-y-6 font-[family-name:var(--font-family-primary)]">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-secondary-100">Production Overview</h1>
            <p className="text-sm text-custom-700 mt-1">Real-time monitoring of all production departments</p>
          </div>
          <button
            onClick={refetchAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-sm font-semibold text-custom-700 w-fit"
          >
            <HiOutlineRefresh className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Active Jobs",        value: overallStats.activeJobs,    icon: HiOutlineClock,         bg: "bg-blue-100",   fg: "text-blue-600" },
            { label: "Completed All-Time", value: overallStats.completedJobs, icon: HiOutlineCheckCircle,   bg: "bg-green-100",  fg: "text-green-600" },
            { label: "Active Workers",     value: overallStats.activeWorkers, icon: HiOutlineUsers,         bg: "bg-purple-100", fg: "text-purple-600" },
          ].map(({ label, value, icon: Icon, bg, fg }) => (
            <Card key={label} className="!p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${fg}`} />
                </div>
                <div>
                  <p className="text-xs text-custom-700">{label}</p>
                  <p className={`text-2xl font-bold ${fg}`}>{isLoading ? "—" : value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Bottlenecks */}
        {!isLoading && bottlenecks.length > 0 && (
          <Card className="!p-4 !bg-red-50 border-2 border-red-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                <HiOutlineExclamationCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-red-900 mb-2">
                  {bottlenecks.length} High-Load Department{bottlenecks.length > 1 ? "s" : ""} Detected
                </h3>
                <div className="space-y-2">
                  {bottlenecks.map((b, idx) => (
                    <div key={idx} className="text-xs text-red-700">
                      <p className="font-semibold">{b.department}: {b.issue}</p>
                      <p className="text-red-600">→ {b.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Department Table */}
        {isLoading ? (
          <Card className="!p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-custom-100 rounded-xl animate-pulse" />
            ))}
          </Card>
        ) : departments.length === 0 ? (
          <Card className="!p-10 text-center">
            <p className="text-secondary-100 font-semibold">No departments found</p>
            <p className="text-sm text-custom-700 mt-1">Create departments to see production stats here.</p>
          </Card>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-custom-100 border-b border-custom-300">
                  <tr>
                    {["Department", "Active Jobs", "Completed", "Workers", "Actions"].map((h) => (
                      <th key={h} className={`px-4 py-3 text-xs font-bold text-secondary-100 uppercase ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-custom-200">
                  {deptStats.map((dept) => (
                    <tr key={dept.id} className="hover:bg-custom-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full bg-${dept.color}-500`} />
                          <span className="text-sm font-bold text-secondary-100">{dept.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-blue-600">{dept.activeJobs}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-green-600">{dept.completedJobs}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <HiOutlineUsers className="w-4 h-4 text-custom-700" />
                          <span className="text-sm text-secondary-100">{dept.workers}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => { setSelectedDeptId(dept.id); setShowDetailsModal(true); }}
                          className="px-4 py-2 rounded-lg border border-custom-300 hover:bg-custom-100 transition-colors text-sm font-semibold text-custom-700"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Jobs Table */}
        <Card className="!p-0 overflow-hidden">
          <div className="p-4 bg-custom-100 border-b border-custom-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-secondary-100">All Jobs</h2>
            <div className="relative w-full sm:w-64">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-custom-700" />
              <input
                type="text"
                placeholder="Search jobs…"
                value={jobSearch}
                onChange={(e) => { setJobSearch(e.target.value); setJobPage(1); }}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-custom-300 bg-white text-sm placeholder:text-custom-700 focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-custom-50 border-b border-custom-300">
                <tr>
                  {["Job", "Client", "Status", "Dept State", "Priority", "Department", "Due Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-custom-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-custom-700">
                        <HiOutlineRefresh className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading jobs…</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-custom-700 text-sm">No jobs found</td>
                  </tr>
                ) : (
                  paginatedJobs.map((job) => {
                    const statusCfg = jobStatusConfig[job.status] ?? { label: job.status, bgColor: "bg-gray-100", color: "text-gray-700" };
                    return (
                      <tr key={job.id} className="hover:bg-custom-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-primary-600">{job.jobNumber}</span>
                          <p className="text-xs text-custom-700 mt-0.5 max-w-[160px] truncate">{job.title}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-secondary-100">{job.customer?.name ?? "—"}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.bgColor} ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <StateBadge state={job.state ?? null} />
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${priorityColor[job.priority] ?? "bg-gray-100 text-gray-700"}`}>
                            {job.priority}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-secondary-100">
                            {job.departmentAssignedToId ? (deptMap[job.departmentAssignedToId] ?? "—") : (
                              <span className="text-xs text-custom-500 italic">Unassigned</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-custom-700">{job.dueDate ? job.dueDate.split("T")[0] : "—"}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!isLoading && filteredJobs.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-custom-300">
              <p className="text-xs text-custom-700">
                {((jobPage - 1) * PAGE_SIZE) + 1}–{Math.min(jobPage * PAGE_SIZE, filteredJobs.length)} of {filteredJobs.length} jobs
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={jobPage <= 1}
                  onClick={() => setJobPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-custom-300 text-sm font-semibold disabled:opacity-40 hover:bg-custom-100 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-custom-700 font-semibold">{jobPage} / {totalJobPages}</span>
                <button
                  disabled={jobPage >= totalJobPages}
                  onClick={() => setJobPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-custom-300 text-sm font-semibold disabled:opacity-40 hover:bg-custom-100 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card className="!p-6">
          <h2 className="text-lg font-bold text-secondary-100 mb-4">Recent Activity</h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-custom-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-custom-700 text-center py-6">No recent production activity.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((a, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-custom-50 border border-custom-200">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-secondary-100 truncate">{a.action}</p>
                    <p className="text-xs text-custom-700">{a.dept} • {a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Department Details Modal */}
        {showDetailsModal && selectedDept && (() => {
          const deptJobs = allJobs.filter((j) => j.departmentAssignedToId === selectedDeptId);
          return (
            <div className="fixed inset-0 bg-secondary-100/50 z-50 flex items-center justify-center p-4">
              <Card className="!p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-secondary-100">{selectedDept.name} Department</h3>
                    <p className="text-sm text-custom-700 mt-1">Live performance metrics</p>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)} className="text-custom-700 hover:text-secondary-100">
                    <HiOutlineX className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-custom-50 border border-custom-200">
                    <h4 className="text-sm font-bold text-secondary-100 uppercase tracking-wide mb-3">Performance Overview</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Active Jobs", value: selectedDept.activeJobs, color: "text-blue-600" },
                        { label: "Completed (All-Time)", value: selectedDept.completedJobs, color: "text-green-600" },
                        { label: "Active Workers", value: selectedDept.workers, color: "text-purple-600" },
                        { label: "Total Jobs Assigned", value: selectedDept.totalJobs, color: "text-secondary-100" },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p className="text-xs text-custom-700 mb-1">{label}</p>
                          <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-secondary-100 uppercase tracking-wide mb-3">Workload</h4>
                    <div className="space-y-3">
                      {selectedDept.workers > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-secondary-100">Active Jobs per Worker</span>
                          <span className="text-sm font-bold text-secondary-100">
                            {(selectedDept.activeJobs / selectedDept.workers).toFixed(1)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary-100">Jobs Remaining</span>
                        <span className="text-sm font-bold text-orange-600">{selectedDept.activeJobs}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border ${selectedDept.activeJobs === 0 ? "bg-green-50 border-green-200" : selectedDept.activeJobs >= 10 ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
                    <div className="flex items-center gap-2">
                      <HiOutlineCheckCircle className={`w-5 h-5 ${selectedDept.activeJobs === 0 ? "text-green-600" : selectedDept.activeJobs >= 10 ? "text-red-600" : "text-blue-600"}`} />
                      <div>
                        <p className={`text-sm font-bold ${selectedDept.activeJobs === 0 ? "text-green-900" : selectedDept.activeJobs >= 10 ? "text-red-900" : "text-blue-900"}`}>Department Status</p>
                        <p className={`text-xs ${selectedDept.activeJobs === 0 ? "text-green-700" : selectedDept.activeJobs >= 10 ? "text-red-700" : "text-blue-700"}`}>
                          {selectedDept.activeJobs === 0
                            ? "No active jobs — department queue is clear"
                            : selectedDept.activeJobs >= 10
                            ? "High load — consider redistributing jobs"
                            : "Normal operation — steady progress on active jobs"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Jobs Table */}
                  <div>
                    <h4 className="text-sm font-bold text-secondary-100 uppercase tracking-wide mb-3">
                      Jobs ({deptJobs.length})
                    </h4>
                    {deptJobs.length === 0 ? (
                      <p className="text-sm text-custom-700 text-center py-4">No jobs assigned to this department.</p>
                    ) : (
                      <div className="rounded-xl border border-custom-200 overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-custom-100 border-b border-custom-200">
                            <tr>
                              {["Job #", "Title", "Status", "State", "Priority", "Due Date"].map((h) => (
                                <th key={h} className="px-3 py-2 text-left text-xs font-bold text-secondary-100 uppercase">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-custom-200 bg-white">
                            {deptJobs.map((job) => {
                              const statusCfg = jobStatusConfig[job.status] ?? { label: job.status, bgColor: "bg-gray-100", color: "text-gray-700" };
                              return (
                                <tr key={job.id} className="hover:bg-custom-50 transition-colors">
                                  <td className="px-3 py-2.5 text-xs font-mono font-bold text-primary-600">{job.jobNumber}</td>
                                  <td className="px-3 py-2.5 text-xs text-secondary-100 max-w-[140px] truncate">{job.title}</td>
                                  <td className="px-3 py-2.5">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.bgColor} ${statusCfg.color}`}>
                                      {statusCfg.label}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5"><StateBadge state={job.state ?? null} /></td>
                                  <td className="px-3 py-2.5">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityColor[job.priority] ?? "bg-gray-100 text-gray-700"}`}>
                                      {job.priority}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-xs text-custom-700 whitespace-nowrap">
                                    {job.dueDate ? job.dueDate.split("T")[0] : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="w-full px-4 py-2 rounded-xl border border-custom-300 hover:bg-custom-100 transition-colors text-sm font-semibold text-custom-700"
                  >
                    Close
                  </button>
                </div>
              </Card>
            </div>
          );
        })()}

      </div>
    </DashboardLayout>
  );
}
