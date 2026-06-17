import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Purpose:
// Merge Tailwind class names and resolve conflicting utility classes.
// Runs anywhere components need conditional or merged cn() classes.
// Input: ClassValue[]; expected result: single merged className string.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
