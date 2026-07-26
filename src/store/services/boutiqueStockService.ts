import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../index";

export type StockStatus = "available" | "low" | "out-of-stock";

export interface BoutiqueStockItem {
  id: string;
  itemName: string;
  description?: string;
  category: string;
  unit: string;
  unitCost?: number;
  currentStock: number;
  alarmStock: number;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BoutiqueStockEntry {
  id: string;
  stockItemId: string;
  stockItem?: BoutiqueStockItem;
  quantity: number;
  note?: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export type SortieStatus = "pending" | "approved" | "taken" | "rejected";

export interface BoutiqueStockSortieItem {
  id: string;
  productId: string;
  quantity: number;
  stockItem?: BoutiqueStockItem;
}

export interface BoutiqueStockSortie {
  id: string;
  stockItemId: string;
  stockItem?: BoutiqueStockItem;
  items?: BoutiqueStockSortieItem[];
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

export type PaymentMethod = "cash" | "mobile" | "bank" | "oncredit";
export type PaymentStatus = "paid" | "partial" | "oncredit";

export interface BoutiqueSale {
  id: string;
  stockItemId: string;
  stockItem?: { id: string; itemName: string; unit: string; category: string };
  quantity: number;
  unitPrice: string;
  totalPrice: number;
  amountPaid: string;
  balanceDue: number;
  changeGiven: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  soldBy?: { id: string; name: string };
  customer?: { id: string; name: string } | null;
  createdAt: string;
}

export interface BoutiqueSalesParams {
  stockItemId?: string;
  paymentStatus?: PaymentStatus | string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
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

const BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"}/boutique-stock`;

export const boutiqueStockApi = createApi({
  reducerPath: "boutiqueStockApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["BSItem", "BSEntry", "BSSortie", "BSSale"],
  endpoints: (builder) => ({
    // Items
    getBoutiqueStockItems: builder.query<Paginated<BoutiqueStockItem>, { search?: string; stockStatus?: string; limit?: number } | void>({
      query: (params) => ({ url: "/items", params: { limit: 200, ...(params ?? {}) } as Record<string, unknown> }),
      transformResponse: (res: ApiResponse<BoutiqueStockItem[]>) => {
        console.log("[items] fetched items stockStatus:", res.data?.map(i => ({ name: i.itemName, stock: i.currentStock, status: i.stockStatus })));
        return toPaginated(res);
      },
      providesTags: (r) => r ? [...r.data.map(({ id }) => ({ type: "BSItem" as const, id })), { type: "BSItem", id: "LIST" }] : [{ type: "BSItem", id: "LIST" }],
    }),
    createBoutiqueStockItem: builder.mutation<BoutiqueStockItem, { itemName: string; description?: string; category: string; unit: string; currentStock: number; alarmStock: number; unitCost?: number }>({
      query: (body) => ({ url: "/items", method: "POST", body }),
      transformResponse: (res: ApiResponse<BoutiqueStockItem>) => res.data,
      invalidatesTags: [{ type: "BSItem", id: "LIST" }],
    }),
    updateBoutiqueStockItem: builder.mutation<BoutiqueStockItem, { id: string; itemName?: string; description?: string; category?: string; unit?: string; alarmStock?: number; unitCost?: number }>({
      query: ({ id, ...body }) => ({ url: `/items/${id}`, method: "PUT", body }),
      transformResponse: (res: ApiResponse<BoutiqueStockItem>) => res.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "BSItem", id }, { type: "BSItem", id: "LIST" }],
    }),
    deleteBoutiqueStockItem: builder.mutation<void, string>({
      query: (id) => ({ url: `/items/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "BSItem", id }, { type: "BSItem", id: "LIST" }],
    }),
    // Entries
    getBoutiqueStockEntries: builder.query<Paginated<BoutiqueStockEntry>, { stockItemId?: string; limit?: number } | void>({
      query: (params) => ({ url: "/entries", params: { limit: 50, ...(params ?? {}) } as Record<string, unknown> }),
      transformResponse: (res: ApiResponse<BoutiqueStockEntry[]>) => toPaginated(res),
      providesTags: [{ type: "BSEntry", id: "LIST" }],
    }),
    createBoutiqueStockEntry: builder.mutation<BoutiqueStockEntry, { stockItemId: string; quantity: number; note?: string }>({
      query: (body) => ({ url: "/entries", method: "POST", body }),
      transformResponse: (res: ApiResponse<BoutiqueStockEntry>) => res.data,
      invalidatesTags: [{ type: "BSEntry", id: "LIST" }, { type: "BSItem", id: "LIST" }],
    }),
    // Sorties
    getBoutiqueStockSorties: builder.query<Paginated<BoutiqueStockSortie>, { status?: SortieStatus; limit?: number } | void>({
      query: (params) => ({ url: "/sorties", params: { limit: 200, ...(params ?? {}) } as Record<string, unknown> }),
      transformResponse: (res: ApiResponse<BoutiqueStockSortie[]>) => toPaginated(res),
      providesTags: (r) => r ? [...r.data.map(({ id }) => ({ type: "BSSortie" as const, id })), { type: "BSSortie", id: "LIST" }] : [{ type: "BSSortie", id: "LIST" }],
    }),
    getMyBoutiqueStockSorties: builder.query<Paginated<BoutiqueStockSortie>, { limit?: number } | void>({
      query: (params) => ({ url: "/sorties/my", params: { limit: 100, ...(params ?? {}) } as Record<string, unknown> }),
      transformResponse: (res: ApiResponse<BoutiqueStockSortie[]>) => toPaginated(res),
      providesTags: [{ type: "BSSortie", id: "MY" }],
    }),
    createBoutiqueStockSortie: builder.mutation<BoutiqueStockSortie, { stockItemId: string; quantityOut: number; reason: string; notes?: string }>({
      query: (body) => ({ url: "/sorties", method: "POST", body }),
      transformResponse: (res: ApiResponse<BoutiqueStockSortie>) => res.data,
      invalidatesTags: [{ type: "BSSortie", id: "LIST" }, { type: "BSSortie", id: "MY" }],
    }),
    createBulkBoutiqueStockSortie: builder.mutation<BoutiqueStockSortie[], { items: { stockItemId: string; quantityOut: number; reason: string }[]; notes?: string }>({
      query: (body) => ({ url: "/sorties/bulk", method: "POST", body }),
      transformResponse: (res: ApiResponse<BoutiqueStockSortie[]>) => res.data,
      invalidatesTags: [{ type: "BSSortie", id: "LIST" }, { type: "BSSortie", id: "MY" }],
    }),
    approveBoutiqueStockSortie: builder.mutation<BoutiqueStockSortie, string>({
      query: (id) => ({ url: `/sorties/${id}/approve`, method: "PATCH" }),
      transformResponse: (res: ApiResponse<BoutiqueStockSortie>, _meta, id) => {
        console.log("[approve] raw response for id", id, ":", res);
        console.log("[approve] success:", res?.success, "| message:", res?.message, "| data:", res?.data);
        if (!res?.success) console.warn("[approve] backend returned success=false:", res?.message);
        if (!res?.data) console.warn("[approve] res.data is null/undefined — this will cause unwrap() to throw!");
        return res.data;
      },
      transformErrorResponse: (err, _meta, id) => {
        console.error("[approve] HTTP error for id", id, ":", err);
        return err;
      },
      invalidatesTags: (_r, _e, id) => [{ type: "BSSortie", id }, { type: "BSSortie", id: "LIST" }, { type: "BSItem", id: "LIST" }],
    }),
    rejectBoutiqueStockSortie: builder.mutation<BoutiqueStockSortie, { id: string; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/sorties/${id}/reject`, method: "PATCH", body }),
      transformResponse: (res: ApiResponse<BoutiqueStockSortie>) => res.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "BSSortie", id }, { type: "BSSortie", id: "LIST" }, { type: "BSSortie", id: "MY" }],
    }),
    updateBoutiqueStockSortie: builder.mutation<BoutiqueStockSortie, { id: string; quantityOut?: number; reason?: string; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/sorties/${id}`, method: "PUT", body }),
      transformResponse: (res: ApiResponse<BoutiqueStockSortie>) => res.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "BSSortie", id }, { type: "BSSortie", id: "LIST" }, { type: "BSSortie", id: "MY" }],
    }),
    deleteBoutiqueStockSortie: builder.mutation<void, string>({
      query: (id) => ({ url: `/sorties/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "BSSortie", id }, { type: "BSSortie", id: "LIST" }, { type: "BSSortie", id: "MY" }],
    }),
    takeBoutiqueStockSortie: builder.mutation<BoutiqueStockSortie, string>({
      query: (id) => ({ url: `/sorties/${id}/take`, method: "PATCH" }),
      transformResponse: (res: ApiResponse<BoutiqueStockSortie>) => res.data,
      invalidatesTags: (_r, _e, id) => [
        { type: "BSSortie", id },
        { type: "BSSortie", id: "LIST" },
        { type: "BSSortie", id: "MY" },
        { type: "BSItem", id: "LIST" },
      ],
    }),
    sellStockItem: builder.mutation<BoutiqueSale, { id: string; quantity: number; unitPrice: number; amountPaid: number; paymentMethod: PaymentMethod }>({
      query: ({ id, ...body }) => ({ url: `/items/${id}/sell`, method: "PATCH", body }),
      transformResponse: (res: ApiResponse<BoutiqueSale>) => res.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "BSItem", id }, { type: "BSItem", id: "LIST" }, { type: "BSSale", id: "LIST" }],
    }),
    // Sales
    getBoutiqueSales: builder.query<Paginated<BoutiqueSale>, BoutiqueSalesParams | void>({
      query: (params) => ({ url: "/sales", params: { limit: 50, ...(params ?? {}) } as Record<string, unknown> }),
      transformResponse: (res: ApiResponse<BoutiqueSale[]>) => toPaginated(res),
      providesTags: [{ type: "BSSale", id: "LIST" }],
    }),
    updateBoutiqueSale: builder.mutation<BoutiqueSale, { id: string; quantity?: number; unitPrice?: number; amountPaid?: number; paymentMethod?: PaymentMethod; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/sales/${id}`, method: "PUT", body }),
      transformResponse: (res: ApiResponse<BoutiqueSale>) => res.data,
      invalidatesTags: [{ type: "BSSale", id: "LIST" }, { type: "BSItem", id: "LIST" }],
    }),
    deleteBoutiqueSale: builder.mutation<void, string>({
      query: (id) => ({ url: `/sales/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "BSSale", id: "LIST" }, { type: "BSItem", id: "LIST" }],
    }),
    collectBoutiqueSalePayment: builder.mutation<BoutiqueSale, { id: string; amountCollected: number; paymentMethod?: PaymentMethod }>({
      query: ({ id, ...body }) => ({ url: `/sales/${id}/collect`, method: "PATCH", body }),
      transformResponse: (res: ApiResponse<BoutiqueSale>) => res.data,
      invalidatesTags: [{ type: "BSSale", id: "LIST" }],
    }),
  }),
});

export const {
  useGetBoutiqueStockItemsQuery,
  useCreateBoutiqueStockItemMutation,
  useUpdateBoutiqueStockItemMutation,
  useDeleteBoutiqueStockItemMutation,
  useGetBoutiqueStockEntriesQuery,
  useCreateBoutiqueStockEntryMutation,
  useGetBoutiqueStockSortiesQuery,
  useGetMyBoutiqueStockSortiesQuery,
  useCreateBoutiqueStockSortieMutation,
  useCreateBulkBoutiqueStockSortieMutation,
  useApproveBoutiqueStockSortieMutation,
  useRejectBoutiqueStockSortieMutation,
  useUpdateBoutiqueStockSortieMutation,
  useDeleteBoutiqueStockSortieMutation,
  useTakeBoutiqueStockSortieMutation,
  useSellStockItemMutation,
  useGetBoutiqueSalesQuery,
  useUpdateBoutiqueSaleMutation,
  useDeleteBoutiqueSaleMutation,
  useCollectBoutiqueSalePaymentMutation,
} = boutiqueStockApi;
