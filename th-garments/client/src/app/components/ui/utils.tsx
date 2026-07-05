import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBranchName(branch: any, fallback = "") {
  if (!branch) return fallback;
  if (typeof branch === 'object') return branch.Name || branch.name || fallback;
  try {
    if (typeof branch === 'string' && branch.startsWith('{')) {
      const parsed = JSON.parse(branch);
      return parsed.Name || parsed.name || fallback;
    }
  } catch (e) { }
  return branch || fallback;
}
