import type {
    EventTime,
} from "@/types/corsair";

// Purpose:
// Convert a calendar EventTime to epoch milliseconds for sorting; returns 0 if invalid.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function startMs(start?: EventTime): number {
    const value = start?.dateTime ?? start?.date;
    const ms = value ? Date.parse(value) : NaN;
    return Number.isNaN(ms) ? 0 : ms;
}
