import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatEther as viemFormatEther } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEther(wei: bigint | string | number | undefined): string {
  if (!wei) return "0";
  try {
    const formatted = viemFormatEther(BigInt(wei));
    // Trim excess decimal zeroes if long
    const num = parseFloat(formatted);
    if (num < 0.0001 && num > 0) return "<0.0001";
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch {
    return "0";
  }
}

export function shortenAddress(address: string | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimestamp(timestamp: number | bigint | string | undefined): string {
  if (!timestamp) return "Just now";
  const num = typeof timestamp === "string" || typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const date = num > 1e11 ? new Date(num) : new Date(num * 1000);
  
  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
