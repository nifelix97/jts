import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../index";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportItem {
  record: string;
  quantity?: string;
  amount?: string;
}

export interface Report {
  id: string;
  title: string;
  purpose: string;
  items: ReportItem[];
  notes?: string;
  attachmentUrl?: string;
  attachmentUrls?: string[];
  visibleTo?: string[];
  supervisorId?: string | null;
  supervisor?: { id: string; name: string; email: string; role: string } | null;
  createdAt: string;
  createdBy?: { id: string; name: string; email: string; role: string; phone?: string };
}

export interface PaginatedReports {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateReportPayload {
  title: string;
  purpose: string;
  items: ReportItem[];
  notes?: string;
  attachments?: File[];
  removeAttachmentUrls?: string[];
  visibleTo?: string[];
  supervisorId?: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const reportsApi = createApi({
  reducerPath: "reportsApi",

  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),

  tagTypes: ["Report"],

  endpoints: (builder) => ({

    // GET /reports/my — reports submitted by the logged-in user
    getMyReports: builder.query<PaginatedReports, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/reports/my", params: (params ?? {}) as Record<string, any> }),
      transformResponse: (res: any) => {
        const reports = Array.isArray(res.data) ? res.data : (res.data?.reports ?? []);
        const pagination = res.pagination ?? { total: reports.length, page: 1, limit: reports.length, totalPages: 1 };
        return { reports, ...pagination };
      },
      providesTags: [{ type: "Report", id: "MY" }],
    }),

    // GET /reports/assigned — reports assigned to the current user's role (received reports)
    getAssignedReports: builder.query<PaginatedReports, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/reports/assigned", params: (params ?? {}) as Record<string, any> }),
      transformResponse: (res: any) => {
        const reports = Array.isArray(res.data) ? res.data : (res.data?.reports ?? []);
        const pagination = res.pagination ?? { total: reports.length, page: 1, limit: reports.length, totalPages: 1 };
        return { reports, ...pagination };
      },
      providesTags: [{ type: "Report", id: "ASSIGNED" }],
    }),

    // POST /reports
    createReport: builder.mutation<Report, CreateReportPayload>({
      query: ({ title, purpose, items, notes, attachments, visibleTo, supervisorId }) => {
        const form = new FormData();
        form.append("title", title);
        form.append("purpose", purpose);
        form.append("items", JSON.stringify(items));
        if (notes) form.append("notes", notes);
        if (attachments && attachments.length > 0)
          attachments.forEach((f) => form.append("attachments", f));
        if (visibleTo && visibleTo.length > 0)
          form.append("visibleTo", JSON.stringify(visibleTo));
        if (supervisorId) form.append("supervisorId", supervisorId);
        return { url: "/reports", method: "POST", body: form };
      },
      transformResponse: (res: any) => res.data ?? res,
      invalidatesTags: [{ type: "Report", id: "LIST" }],
    }),

    // GET /reports
    getReports: builder.query<PaginatedReports, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: "/reports", params: (params ?? {}) as Record<string, any> }),
      transformResponse: (res: any) => {
        const reports = Array.isArray(res.data) ? res.data : (res.data?.reports ?? []);
        const pagination = res.pagination ?? { total: reports.length, page: 1, limit: reports.length, totalPages: 1 };
        return { reports, ...pagination };
      },
      providesTags: [{ type: "Report", id: "LIST" }],
    }),

    // GET /reports/:id
    getReportById: builder.query<Report, string>({
      query: (id) => `/reports/${id}`,
      transformResponse: (res: any) => res.data ?? res,
      providesTags: (_r, _e, id) => [{ type: "Report", id }],
    }),

    // PUT /reports/:id
    updateReport: builder.mutation<Report, { id: string } & Partial<CreateReportPayload>>({
      query: ({ id, title, purpose, items, notes, attachments, removeAttachmentUrls, visibleTo, supervisorId }) => {
        const form = new FormData();
        if (title)   form.append("title", title);
        if (purpose) form.append("purpose", purpose);
        if (items)   form.append("items", JSON.stringify(items));
        if (notes !== undefined) form.append("notes", notes);
        if (attachments && attachments.length > 0)
          attachments.forEach((f) => form.append("attachments", f));
        if (removeAttachmentUrls && removeAttachmentUrls.length > 0)
          form.append("removeAttachmentUrls", JSON.stringify(removeAttachmentUrls));
        if (visibleTo !== undefined) form.append("visibleTo", JSON.stringify(visibleTo));
        if (supervisorId !== undefined) form.append("supervisorId", supervisorId ?? "");
        return { url: `/reports/${id}`, method: "PUT", body: form };
      },
      transformResponse: (res: any) => res.data ?? res,
      invalidatesTags: (_r, _e, { id }) => [{ type: "Report", id }, { type: "Report", id: "LIST" }, { type: "Report", id: "MY" }, { type: "Report", id: "ASSIGNED" }],
    }),

    // DELETE /reports/:id
    deleteReport: builder.mutation<void, string>({
      query: (id) => ({ url: `/reports/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Report", id }, { type: "Report", id: "LIST" }],
    }),
  }),
});

export const {
  useGetMyReportsQuery,
  useGetAssignedReportsQuery,
  useCreateReportMutation,
  useGetReportsQuery,
  useGetReportByIdQuery,
  useUpdateReportMutation,
  useDeleteReportMutation,
} = reportsApi;
