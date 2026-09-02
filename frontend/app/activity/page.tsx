"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatEther, shortenAddress, formatTimestamp } from "@/lib/utils";
import { useIpfsImage } from "@/lib/useIpfsImage";

function ActivityArtwork({ image, alt }: { image?: string; alt: string }) {
  const { src, onError } = useIpfsImage(image);
  return <img src={src} alt={alt} onError={onError} className="h-full w-full object-cover" />;
}

export default function ActivityPage() {
  const [filterType, setFilterType] = useState<string>("ALL");

  const { data: feed, isLoading } = trpc.activity.feed.useQuery({ limit: 50 });

  const filtered = (feed || []).filter((item) => {
    if (filterType === "ALL") return true;
    return item.type === filterType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-zinc-800/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ivory-50 tracking-tight">
            ACTIVITY
          </h1>
          <p className="text-sm text-zinc-400 mt-1 font-sans">
            Chronological on-chain event feed from Base Sepolia.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800 font-mono">
        {["ALL", "MINT", "LIST", "SALE", "TRANSFER", "CANCEL"].map((t) => {
          const labelMap: Record<string, string> = {
            ALL: "ALL",
            MINT: "MINTED",
            LIST: "LISTED",
            SALE: "SOLD",
            TRANSFER: "TRANSFERRED",
            CANCEL: "CANCELLED",
          };
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                filterType === t
                  ? "bg-obsidian-800 text-ivory-100 font-bold border border-zinc-700 shadow-inner"
                  : "text-zinc-400 hover:text-ivory-200"
              }`}
            >
              {labelMap[t] || t}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded bg-obsidian-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded bg-obsidian-900 border border-zinc-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-zinc-700 transition-colors card-metallic-bevel"
            >
              <div className="flex items-center gap-4">
                <div className="px-2 py-1 rounded bg-obsidian-950 border border-zinc-800 type-micro text-amber-400 shrink-0 font-mono text-[10px]">
                  {item.type === "MINT" ? "MINTED" : item.type === "LIST" ? "LISTED" : item.type === "SALE" ? "SOLD" : item.type === "TRANSFER" ? "TRANSFERRED" : "CANCELLED"}
                </div>

                <div className="h-10 w-10 rounded bg-obsidian-950 overflow-hidden border border-zinc-800 shrink-0">
                  <ActivityArtwork
                    image={item.beast?.image}
                    alt={item.beast?.name || "Beast"}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/card/${item.tokenId}`}
                      className="font-bold text-ivory-100 text-sm hover:text-amber-400 transition-colors font-serif"
                    >
                      {item.beast?.name.toUpperCase() || `BEAST #${item.tokenId}`}
                    </Link>
                    <span className="type-micro text-zinc-300 font-mono">
                      #{String(item.tokenId).padStart(3, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5 font-mono">
                    {item.type === "MINT" && (
                      <span>
                        Minted to <span className="text-ivory-200">{shortenAddress(item.to)}</span>
                      </span>
                    )}
                    {item.type === "LIST" && (
                      <span>
                        Listed by <span className="text-ivory-200">{shortenAddress(item.from)}</span> for{" "}
                        <span className="text-amber-400 font-bold">{formatEther(item.price)} ETH</span>
                      </span>
                    )}
                    {item.type === "SALE" && (
                      <span>
                        Sold to <span className="text-ivory-200">{shortenAddress(item.to)}</span> for{" "}
                        <span className="text-emerald-400 font-bold">{formatEther(item.price)} ETH</span>
                      </span>
                    )}
                    {item.type === "TRANSFER" && (
                      <span>
                        Transferred from <span className="text-ivory-200">{shortenAddress(item.from)}</span> to{" "}
                        <span className="text-ivory-200">{shortenAddress(item.to)}</span>
                      </span>
                    )}
                    {item.type === "CANCEL" && (
                      <span>
                        Cancelled by <span className="text-ivory-200">{shortenAddress(item.from)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 self-end sm:self-center">
                <span className="type-micro">{formatTimestamp(item.timestamp)}</span>
                {item.txHash && (
                  <a
                    href={`https://sepolia.basescan.org/tx/${item.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded bg-obsidian-950 hover:bg-obsidian-800 text-zinc-400 hover:text-ivory-100 transition-colors border border-zinc-800"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-obsidian-900/60 border border-zinc-800 rounded p-8 space-y-3">
          <h3 className="text-sm font-serif font-bold text-ivory-100">No Events Found</h3>
          <p className="type-micro text-zinc-300 font-mono">No on-chain events matched the selected filter.</p>
        </div>
      )}
    </div>
  );
}
