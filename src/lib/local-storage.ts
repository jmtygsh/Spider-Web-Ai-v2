// Purpose:
// Small shared helper for browser localStorage access.
// Runs only in client-side code paths; safely no-ops during SSR.
// Supports dynamic keys with typed get/set/remove helpers.

function hasStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export const storage = {
  get<T>(key: string, fallback: T | null = null): T | null {
    if (!hasStorage()) return fallback;

    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T) {
    if (!hasStorage()) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key: string) {
    if (!hasStorage()) return;
    window.localStorage.removeItem(key);
  },
};
