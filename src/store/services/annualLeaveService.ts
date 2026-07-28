import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../index";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnnualLeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AnnualLeave {
  id: string;
  fullNames: string;
  /** Pre-formatted string e.g. "03/07/2026 - 16/07/2026" */
  firstLeave?: string | null;
  secondLeave?: string | null;
  firstLeaveDays?: number | null;
  secondLeaveDays?: number | null;
  phone?: string | null;
  docs?: string | null;
  status: AnnualLeaveStatus;
  notes?: string | null;
  viewedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  editedAt?: string | null;
  createdById?: string | null;
  approvedById?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; email: string; role: string } | null;
  approvedBy?: { id: string; name: string } | null;
}

export interface AnnualLeaveListResponse {
  success: boolean;
  message: string;
  data: AnnualLeave[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetAnnualLeavesParams {
  page?: number;
  limit?: number;
  status?: AnnualLeaveStatus;
}

export interface CreateAnnualLeavePayload {
  fullNames: string;
  firstLeave?: string;
  secondLeave?: string;
  notes?: string;
  phone?: string;
}

export interface UpdateAnnualLeavePayload extends Partial<CreateAnnualLeavePayload> {
  id: string;
}

export interface ReviewAnnualLeavePayload {
  id: string;
  action: "approve" | "reject";
  notes?: string;
}

export interface ImportAnnualLeaveResponse {
  success: boolean;
  message: string;
  imported: number;
  errors?: string[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const annualLeaveApi = createApi({
  reducerPath: "annualLeaveApi",

  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),

  tagTypes: ["AnnualLeave"],

  endpoints: (builder) => ({
    // GET /annual-leaves
    getAnnualLeaves: builder.query<AnnualLeaveListResponse, GetAnnualLeavesParams>({
      query: (params) => ({ url: "/annual-leaves", params }),
      transformResponse: (res: any) => ({
        success: res?.success ?? true,
        message: res?.message ?? "",
        data: Array.isArray(res?.data) ? res.data : [],
        total: res?.pagination?.total ?? res?.total ?? 0,
        page: res?.pagination?.page ?? res?.page ?? 1,
        limit: res?.pagination?.limit ?? res?.limit ?? 7,
        totalPages: res?.pagination?.totalPages ?? Math.ceil((res?.pagination?.total ?? res?.total ?? 0) / 7),
      }),
      providesTags: [{ type: "AnnualLeave", id: "LIST" }],
    }),

    // GET /annual-leaves/:id
    getAnnualLeaveById: builder.query<AnnualLeave, string>({
      query: (id) => `/annual-leaves/${id}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_r, _e, id) => [{ type: "AnnualLeave", id }],
    }),

    // POST /annual-leaves
    createAnnualLeave: builder.mutation<AnnualLeave, CreateAnnualLeavePayload>({
      query: (body) => ({ url: "/annual-leaves", method: "POST", body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: "AnnualLeave", id: "LIST" }],
    }),

    // PUT /annual-leaves/:id
    updateAnnualLeave: builder.mutation<AnnualLeave, UpdateAnnualLeavePayload>({
      query: ({ id, ...body }) => ({ url: `/annual-leaves/${id}`, method: "PUT", body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AnnualLeave", id },
        { type: "AnnualLeave", id: "LIST" },
      ],
    }),

    // PATCH /annual-leaves/:id/status
    reviewAnnualLeave: builder.mutation<AnnualLeave, ReviewAnnualLeavePayload>({
      query: ({ id, ...body }) => ({
        url: `/annual-leaves/${id}/status`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AnnualLeave", id },
        { type: "AnnualLeave", id: "LIST" },
      ],
    }),

    // DELETE /annual-leaves/:id
    deleteAnnualLeave: builder.mutation<void, string>({
      query: (id) => ({ url: `/annual-leaves/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "AnnualLeave", id: "LIST" }],
    }),

    // POST /annual-leaves/import  (multipart/form-data, field: "file")
    importAnnualLeaves: builder.mutation<ImportAnnualLeaveResponse, FormData>({
      query: (formData) => ({
        url: "/annual-leaves/import",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "AnnualLeave", id: "LIST" }],
    }),
  }),
});

export const {
  useGetAnnualLeavesQuery,
  useGetAnnualLeaveByIdQuery,
  useCreateAnnualLeaveMutation,
  useUpdateAnnualLeaveMutation,
  useReviewAnnualLeaveMutation,
  useDeleteAnnualLeaveMutation,
  useImportAnnualLeavesMutation,
} = annualLeaveApi;
