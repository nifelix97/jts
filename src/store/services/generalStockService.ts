import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../index";

export type StockStatus = "available" | "low" | "out-of-stock";
export type SortieStatus = "pending" | "approved" | "taken" | "rejected";

export interface GeneralStockItem {
  id: string;
  itemName: string;
  description?: string;
  category: string;
  unit: string;
  unitCost?: number;
  amountPerUnit?: number;
  currentStock: number;
  alarmStock: number;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralStockEntry {
  id: string;
  stockItemId: string;
  stockItem?: GeneralStockItem;
  quantity: number;
  note?: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface GeneralStockSortie {
  id: string;
  stockItemId: string;
  stockItem?: GeneralStockItem;
  quantityOut: string;
  reason?: string;
  notes?: string | null;
  status: SortieStatus;
  sortieDate: string;
  requester?: { id: string; name: string; email: string; role: string };
  approvedBy?: { id: string; name: string; email: string; role: string } | null;
  takenById?: string | null;
  takenBy?: { id: string; name: string; email: string; role: string } | null;
  takenAt?: string | null;
  stockBefore?: number | null;
  stockAfter?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}

function toPaginated<T>(res: ApiResponse<T[]>): Paginated<T> {
  return {
    data: res.data ?? [],
    pagination: res.pagination ?? { total: res.data?.length ?? 0, page: 1, limit: 100, totalPages: 1 },
  };
}

const BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"}/general-stock`;

export const generalStockApi = createApi({
  reducerPath: "generalStockApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["GSItem", "GSEntry", "GSSortie"],
  endpoints: (builder) => ({
    getGeneralStockItems: builder.query<Paginated<GeneralStockItem>, { search?: string; stockStatus?: string; limit?: number } | void>({
      query: (params) => ({ url: "/items", params: { limit: 200, ...(params ?? {}) } as Record<string, unknown> }),
      transformResponse: (res: ApiResponse<GeneralStockItem[]>) => toPaginated(res),
      providesTags: (r) => r ? [...r.data.map(({ id }) => ({ type: "GSItem" as const, id })), { type: "GSItem", id: "LIST" }] : [{ type: "GSItem", id: "LIST" }],
    }),
    createGeneralStockItem: builder.mutation<GeneralStockItem, { itemName: string; description?: string; category: string; unit: string; currentStock: number; alarmStock: number; amountPerUnit?: number }>({
      query: (body) => ({ url: "/items", method: "POST", body }),
      transformResponse: (res: ApiResponse<GeneralStockItem>) => res.data,
      invalidatesTags: [{ type: "GSItem", id: "LIST" }],
    }),
    updateGeneralStockItem: builder.mutation<GeneralStockItem, { id: string; itemName?: string; description?: string; category?: string; unit?: string; currentStock?: number; alarmStock?: number; amountPerUnit?: number }>({
      query: ({ id, ...body }) => ({ url: `/items/${id}`, method: "PUT", body }),
      transformResponse: (res: ApiResponse<GeneralStockItem>) => res.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "GSItem", id }, { type: "GSItem", id: "LIST" }],
    }),
    deleteGeneralStockItem: builder.mutation<void, string>({
      query: (id) => ({ url: `/items/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "GSItem", id }, { type: "GSItem", id: "LIST" }],
    }),
    getGeneralStockEntries: builder.query<Paginated<GeneralStockEntry>, { stockItemId?: string; limit?: number } | void>({
      query: (params) => ({ url: "/entries", params: { limit: 50, ...(params ?? {}) } as Record<string, unknown> }),
      transformResponse: (res: ApiResponse<GeneralStockEntry[]>) => toPaginated(res),
      providesTags: [{ type: "GSEntry", id: "LIST" }],
    }),
    createGeneralStockEntry: builder.mutation<GeneralStockEntry, { stockItemId: string; quantity: number; note?: string }>({
      query: (body) => ({ url: "/entries", method: "POST", body }),
      transformResponse: (res: ApiResponse<GeneralStockEntry>) => res.data,
      invalidatesTags: [{ type: "GSEntry", id: "LIST" }, { type: "GSItem", id: "LIST" }],
    }),
    getGeneralStockSorties: builder.query<Paginated<GeneralStockSortie>, { status?: SortieStatus; limit?: number } | void>({
      query: (params) => ({ url: "/sorties", params: { limit: 200, ...(params ?? {}) } as Record<string, unknown> }),
      transformResponse: (res: ApiResponse<GeneralStockSortie[]>) => toPaginated(res),
      providesTags: (r) => r ? [...r.data.map(({ id }) => ({ type: "GSSortie" as const, id })), { type: "GSSortie", id: "LIST" }] : [{ type: "GSSortie", id: "LIST" }],
    }),
    getMyGeneralStockSorties: builder.query<Paginated<GeneralStockSortie>, { limit?: number } | void>({
      query: (params) => ({ url: "/sorties/my", params: { limit: 100, ...(params ?? {}) } as Record<string, unknown> }),
      transformResponse: (res: ApiResponse<GeneralStockSortie[]>) => toPaginated(res),
      providesTags: [{ type: "GSSortie", id: "MY" }],
    }),
    createGeneralStockSortie: builder.mutation<GeneralStockSortie, { stockItemId?: string; customItemName?: string; quantityOut: number; reason: string; notes?: string }>({
      query: (body) => ({ url: "/sorties", method: "POST", body }),
      transformResponse: (res: ApiResponse<GeneralStockSortie>) => res.data,
      invalidatesTags: [{ type: "GSSortie", id: "LIST" }, { type: "GSSortie", id: "MY" }],
    }),
    createBulkGeneralStockSortie: builder.mutation<GeneralStockSortie[], { items: { stockItemId?: string; customItemName?: string; quantityOut: number; reason: string }[]; notes?: string }>({
      query: (body) => ({ url: "/sorties/bulk", method: "POST", body }),
      transformResponse: (res: ApiResponse<GeneralStockSortie[]>) => res.data,
      invalidatesTags: [{ type: "GSSortie", id: "LIST" }, { type: "GSSortie", id: "MY" }],
    }),
    approveGeneralStockSortie: builder.mutation<GeneralStockSortie, string>({
      query: (id) => ({ url: `/sorties/${id}/approve`, method: "PATCH" }),
      transformResponse: (res: ApiResponse<GeneralStockSortie>) => res.data,
      invalidatesTags: (_r, _e, id) => [{ type: "GSSortie", id }, { type: "GSSortie", id: "LIST" }, { type: "GSItem", id: "LIST" }],
    }),
    rejectGeneralStockSortie: builder.mutation<GeneralStockSortie, string>({
      query: (id) => ({ url: `/sorties/${id}/reject`, method: "PATCH" }),
      transformResponse: (res: ApiResponse<GeneralStockSortie>) => res.data,
      invalidatesTags: (_r, _e, id) => [{ type: "GSSortie", id }, { type: "GSSortie", id: "LIST" }, { type: "GSSortie", id: "MY" }],
    }),
    takeGeneralStockSortie: builder.mutation<GeneralStockSortie, string>({
      query: (id) => ({ url: `/sorties/${id}/take`, method: "PATCH" }),
      transformResponse: (res: ApiResponse<GeneralStockSortie>) => res.data,
      invalidatesTags: (_r, _e, id) => [{ type: "GSSortie", id }, { type: "GSSortie", id: "LIST" }, { type: "GSSortie", id: "MY" }, { type: "GSItem", id: "LIST" }],
    }),
  }),
});

export const {
  useGetGeneralStockItemsQuery,
  useCreateGeneralStockItemMutation,
  useUpdateGeneralStockItemMutation,
  useDeleteGeneralStockItemMutation,
  useGetGeneralStockEntriesQuery,
  useCreateGeneralStockEntryMutation,
  useGetGeneralStockSortiesQuery,
  useGetMyGeneralStockSortiesQuery,
  useCreateGeneralStockSortieMutation,
  useCreateBulkGeneralStockSortieMutation,
  useApproveGeneralStockSortieMutation,
  useRejectGeneralStockSortieMutation,
  useTakeGeneralStockSortieMutation,
} = generalStockApi;
