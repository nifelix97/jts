import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../index";

export type PayrollStatus = "draft" | "approved" | "paid" | "rejected";
export type WorkerType = "employee" | "casual";

export interface Payroll {
  id: string;
  workerType: WorkerType;
  employeeId?: string;
  casualWorkerId?: string;
  workerName?: string;
  casualWorker?: { id: string; fullName: string };
  employee?: { id: string; fullName: string };
  period: string;
  salary: number;
  overtime: number;
  deductions: number;
  netSalary: number;
  status: PayrollStatus;
  rejectionComment?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollsResponse {
  data: Payroll[];
  total: number;
}

export interface CreatePayrollPayload {
  workerType: WorkerType;
  employeeId?: string;
  casualWorkerId?: string;
  period: string;
  salary: number;
  overtime?: number;
  deductions?: number;
  notes?: string;
}

export interface UpdatePayrollPayload extends Partial<CreatePayrollPayload> {
  id: string;
}

export interface GetPayrollsParams {
  page?: number;
  limit?: number;
  workerType?: WorkerType;
  status?: PayrollStatus;
  period?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export const payrollApi = createApi({
  reducerPath: "payrollApi",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Payroll"],
  endpoints: (builder) => ({
    getPayrolls: builder.query<PayrollsResponse, GetPayrollsParams>({
      query: (params) => ({ url: "/payrolls", params }),
      transformResponse: (res: any) => ({
        data: Array.isArray(res?.data) ? res.data : [],
        total: res?.total ?? 0,
      }),
      providesTags: ["Payroll"],
    }),

    getPayrollById: builder.query<Payroll, string>({
      query: (id) => `/payrolls/${id}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_r, _e, id) => [{ type: "Payroll", id }],
    }),

    createPayroll: builder.mutation<Payroll, CreatePayrollPayload>({
      query: (body) => ({ url: "/payrolls", method: "POST", body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ["Payroll"],
    }),

    updatePayroll: builder.mutation<Payroll, UpdatePayrollPayload>({
      query: ({ id, ...body }) => ({ url: `/payrolls/${id}`, method: "PUT", body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ["Payroll"],
    }),

    approvePayroll: builder.mutation<Payroll, string>({
      query: (id) => ({ url: `/payrolls/${id}/approve`, method: "PATCH" }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ["Payroll"],
    }),

    markPayrollPaid: builder.mutation<Payroll, string>({
      query: (id) => ({ url: `/payrolls/${id}/pay`, method: "PATCH" }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ["Payroll"],
    }),

    rejectPayroll: builder.mutation<Payroll, { id: string; rejectionComment: string }>({
      query: ({ id, rejectionComment }) => ({ url: `/payrolls/${id}/reject`, method: "PATCH", body: { rejectionComment } }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ["Payroll"],
    }),

    deletePayroll: builder.mutation<void, string>({
      query: (id) => ({ url: `/payrolls/${id}`, method: "DELETE" }),
      invalidatesTags: ["Payroll"],
    }),
  }),
});

export const {
  useGetPayrollsQuery,
  useGetPayrollByIdQuery,
  useCreatePayrollMutation,
  useUpdatePayrollMutation,
  useApprovePayrollMutation,
  useMarkPayrollPaidMutation,
  useRejectPayrollMutation,
  useDeletePayrollMutation,
} = payrollApi;
