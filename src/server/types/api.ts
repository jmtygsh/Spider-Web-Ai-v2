// Purpose:
// Single response contract for all JSON API routes.
// Used by every JSON API route and client apiGet/apiPost/apiDelete helpers.
// Success: { ok: true, data: T }; Failure: { ok: false, error: { code, message } }.

// Purpose:
// Machine-readable code plus human message for failed API responses.
// Returned inside ApiFailure envelopes from server routes.
// Data shape: { code: string; message: string }.
export type ApiError = { code: string; message: string };

// Purpose:
// Successful API envelope wrapping typed payload data.
// Returned by server routes on success and unwrapped by client API helpers.
// Data shape: { ok: true; data: T }.
export type ApiSuccess<T> = { ok: true; data: T };

// Purpose:
// Failed API envelope with a structured error object.
// Returned by server routes on validation or handler errors.
// Data shape: { ok: false; error: ApiError }.
export type ApiFailure = { ok: false; error: ApiError };

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
