import axios from "axios";

import { env } from "@/env";

export type ApiError = { code: string; message: string };
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: ApiError };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// Purpose:
// Shared axios client for authenticated JSON API routes.
// Created once at module load; used by hooks and components for API calls.
// Sends cookies via withCredentials; expected result: configured axios instance.
export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL ?? "",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Purpose:
// GET helper that unwraps the standard { ok, data } / { ok, error } envelope.
// Runs on client or server when fetching JSON from /api/* routes.
// Throws on failure; returns typed data on success. (SSE chat uses raw fetch instead.)
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean>,
): Promise<T> {
  const { data: envelope } = await api.get<ApiResponse<T>>(path, { params });
  if (!envelope.ok) throw new Error(envelope.error.message);
  return envelope.data;
}

// Purpose:
// POST helper with the same envelope unwrap and error-throw behavior as apiGet.
// Runs when client code sends JSON POST bodies to /api/* routes.
// Returns typed data on success or throws with the API error message.
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const { data: envelope } = await api.post<ApiResponse<T>>(path, body);
  if (!envelope.ok) throw new Error(envelope.error.message);
  return envelope.data;
}

// Purpose:
// DELETE helper with the same envelope unwrap and error-throw behavior as apiGet.
// Runs when client code deletes resources via /api/* routes.
// Returns typed data on success or throws with the API error message.
export async function apiDelete<T>(
  path: string,
  params?: Record<string, string | number | boolean>,
): Promise<T> {
  const { data: envelope } = await api.delete<ApiResponse<T>>(path, { params });
  if (!envelope.ok) throw new Error(envelope.error.message);
  return envelope.data;
}
