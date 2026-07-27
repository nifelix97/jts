import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { HiOutlineX, HiOutlineDownload, HiOutlineEye } from "react-icons/hi";
import { useUpdateReportMutation } from "../store/services/reportsService";
import { useGetAllRolesQuery } from "../store/services/rolesService";
import type { Report } from "../store/services/reportsService";
import { useGetUsersQuery } from "../store/services/usersService";

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(/\/api$/, "");
function resolveUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

type ReportItem = { record: string; quantity: string; amount: string };

interface Props {
  report: Report;
  onClose: () => void;
}

export default function EditReportModal({ report, onClose }: Props) {
  const [title, setTitle]               = useState(report.title ?? "");
  const [purpose, setPurpose]           = useState(report.purpose ?? "");
  const [items, setItems]               = useState<ReportItem[]>(
    report.items?.length
      ? report.items.map((it) => ({
          record: it.record ?? "",
          quantity: it.quantity ?? "",
          amount: it.amount ?? "",
        }))
      : [{ record: "", quantity: "", amount: "" }]
  );
  const [files, setFiles]               = useState<File[]>([]);
  const [removedUrls, setRemovedUrls]   = useState<string[]>([]);
  const [notes, setNotes]               = useState(report.notes ?? "");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(report.visibleTo ?? []);
  const [supervisorId, setSupervisorId] = useState<string>(report.supervisorId ?? "");
  const [submitting, setSubmitting]     = useState(false);

  const [updateReport] = useUpdateReportMutation();
  const { data: roles = [], isLoading: loadingRoles } = useGetAllRolesQuery();
  const activeRoles = roles.filter((r) => r.isActive);

  const supervisorRoleName = selectedRoles.find((r) => r.toUpperCase() === "SUPERVISOR") ?? null;
  const { data: supervisorsData } = useGetUsersQuery(
    supervisorRoleName ? { role: supervisorRoleName, limit: 200 } : { limit: 0 },
    { skip: !supervisorRoleName }
  );
  const supervisors = supervisorsData?.users ?? [];

  useEffect(() => {
    setTitle(report.title ?? "");
    setPurpose(report.purpose ?? "");
    setItems(
      report.items?.length
        ? report.items.map((it) => ({
            record: it.record ?? "",
            quantity: it.quantity ?? "",
            amount: it.amount ?? "",
          }))
        : [{ record: "", quantity: "", amount: "" }]
    );
    setNotes(report.notes ?? "");
    setSelectedRoles(report.visibleTo ?? []);
    setSupervisorId(report.supervisorId ?? "");
    setFiles([]);
    setRemovedUrls([]);
  }, [report]);

  const toggleRole = (name: string) =>
    setSelectedRoles((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );

  const addItem    = () => setItems((p) => [...p, { record: "", quantity: "", amount: "" }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, f: keyof ReportItem, v: string) =>
    setItems((p) => p.map((item, idx) => (idx === i ? { ...item, [f]: v } : item)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length === 0) {
      toast.error("Please select at least one role that can view this report");
      return;
    }
    setSubmitting(true);
    try {
      await updateReport({
        id: report.id,
        title,
        purpose,
        items: items.filter((it) => it.record.trim()),
        notes: notes.trim(),
        attachments: files.length > 0 ? files : undefined,
        removeAttachmentUrls: removedUrls.length > 0 ? removedUrls : undefined,
        visibleTo: selectedRoles,
        supervisorId: supervisorId || null,
      }).unwrap();
      toast.success("Report updated successfully");
      onClose();
    } catch {
      toast.error("Failed to update report");
    } finally {
      setSubmitting(false);
    }
  };

  const cls =
    "w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm " +
    "focus:outline-none focus:border-primary-400 transition-colors";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-style-500 rounded-2xl shadow-xl max-w-2xl w-full my-8 p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-secondary-100">Edit Report</h3>
            <p className="text-sm text-custom-700 mt-0.5">{report.title}</p>
          </div>
          <button onClick={onClose} className="text-custom-700 hover:text-secondary-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cls}
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">
              Purpose / Subject <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Monthly summary for management"
              className={cls}
            />
          </div>

          {/* Records */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-secondary-100">Records</label>
              <button type="button" onClick={addItem}
                className="text-xs font-semibold text-primary-500 hover:text-primary-600">
                + Add Row
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={item.record}
                    onChange={(e) => updateItem(i, "record", e.target.value)}
                    placeholder="Record / Item *"
                    className="flex-1 px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
                  />
                  <input
                    type="number" min="0"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    placeholder="Qty"
                    className="w-20 px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
                  />
                  <input
                    type="number" min="0"
                    value={item.amount}
                    onChange={(e) => updateItem(i, "amount", e.target.value)}
                    placeholder="Amount"
                    className="w-28 px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-xs focus:outline-none focus:border-primary-400 transition-colors"
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-600">
                      <HiOutlineX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">
              Attachments <span className="text-custom-700 font-normal">(optional, up to 10)</span>
            </label>
            {/* Existing files */}
            {(() => {
              const existing = (
                report.attachmentUrls && report.attachmentUrls.length > 0
                  ? report.attachmentUrls
                  : report.attachmentUrl ? [report.attachmentUrl] : []
              ).filter((u) => !removedUrls.includes(u));
              return existing.length > 0 ? (
                <ul className="mb-2 space-y-1">
                  {existing.map((url, i) => {
                    const name = url.split('/').pop() ?? url;
                    return (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        <a href={resolveUrl(url)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary-500 hover:text-primary-600 font-semibold">
                          <HiOutlineEye className="w-3.5 h-3.5" /> {name}
                        </a>
                        <a href={resolveUrl(url)} download target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold">
                          <HiOutlineDownload className="w-3.5 h-3.5" />
                        </a>
                        <button type="button" onClick={() => setRemovedUrls((p) => [...p, url])}
                          className="text-red-400 hover:text-red-600">✕ Remove</button>
                      </li>
                    );
                  })}
                </ul>
              ) : null;
            })()}
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files ?? [])])}
              className="w-full text-xs text-custom-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-500 file:text-white hover:file:bg-primary-600"
            />
            {files.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs text-emerald-600">
                    <span>✓ {f.name}</span>
                    <button type="button" onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600 ml-2">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-1">
              Notes <span className="text-custom-700 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional remarks..."
              className="w-full px-3 py-2 rounded-xl border border-custom-300 bg-style-500 text-secondary-100 text-sm focus:outline-none focus:border-primary-400 transition-colors resize-none"
            />
          </div>

          {/* Visible To */}
          <div>
            <label className="block text-xs font-semibold text-secondary-100 mb-2">
              Visible To <span className="text-red-500">*</span>
              <span className="text-custom-700 font-normal ml-1">— select roles that can view this report</span>
            </label>
            {loadingRoles ? (
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-7 w-20 bg-custom-200 rounded-full animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {activeRoles.map((role) => {
                  const selected = selectedRoles.includes(role.name);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        if (role.name.toUpperCase() === "SUPERVISOR" && selectedRoles.includes(role.name)) {
                          setSupervisorId("");
                        }
                        toggleRole(role.name);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        selected
                          ? "bg-primary-500 text-white border-primary-500"
                          : "bg-style-500 text-custom-700 border-custom-300 hover:border-primary-400 hover:text-secondary-100"
                      }`}
                    >
                      {selected && <span className="mr-1">✓</span>}
                      {role.name}
                    </button>
                  );
                })}
              </div>
            )}
            {supervisorRoleName && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-secondary-100 mb-1">
                  Select Supervisor <span className="text-red-500">*</span>
                </label>
                <select
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className={cls}
                >
                  <option value="">— Choose a supervisor —</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {supervisorId && (
                  <p className="text-xs text-primary-500 mt-1">
                    ✓ {supervisors.find((s) => s.id === supervisorId)?.name}
                  </p>
                )}
              </div>
            )}
            {selectedRoles.length > 0 && (
              <p className="text-xs text-primary-500 mt-1.5">
                {selectedRoles.length} role{selectedRoles.length > 1 ? "s" : ""} selected:{" "}
                {selectedRoles.join(", ")}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-custom-300">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-custom-300 text-sm font-semibold text-secondary-100 hover:bg-custom-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}