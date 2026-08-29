"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { formatEther } from "@/lib/utils";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = trpc.analytics.summary.useQuery();

  if (isLoading || !analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="type-micro text-zinc-400 mt-4 font-mono">Loading telemetry...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ivory-50 tracking-tight">
          ANALYTICS
        </h1>
        <p className="text-sm text-zinc-400 mt-1 font-sans">
          Key metrics and trading volume on Base Sepolia.
        </p>
      </div>

      {/* 4 Core Metrics: TOTAL BEASTS / ACTIVE LISTINGS / TOTAL SALES / FLOOR PRICE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded bg-obsidian-900 border border-zinc-800/80 space-y-1 card-metallic-bevel">
          <span className="type-micro text-zinc-400 block font-mono">TOTAL BEASTS</span>
          <p className="text-2xl sm:text-3xl font-bold text-ivory-50 font-mono">
            {analytics.totalMinted}
          </p>
        </div>

        <div className="p-5 rounded bg-obsidian-900 border border-zinc-800/80 space-y-1 card-metallic-bevel">
          <span className="type-micro text-zinc-400 block font-mono">ACTIVE LISTINGS</span>
          <p className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
            {analytics.activeListingsCount}
          </p>
        </div>

        <div className="p-5 rounded bg-obsidian-900 border border-zinc-800/80 space-y-1 card-metallic-bevel">
          <span className="type-micro text-zinc-400 block font-mono">TOTAL SALES</span>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
            {analytics.totalSalesCount}
          </p>
        </div>

        <div className="p-5 rounded bg-obsidian-900 border border-zinc-800/80 space-y-1 card-metallic-bevel">
          <span className="type-micro text-zinc-400 block font-mono">FLOOR PRICE</span>
          <p className="text-2xl sm:text-3xl font-bold text-ivory-50 font-mono">
            {formatEther(analytics.floorPriceWei)} <span className="text-amber-400 text-xs">ETH</span>
          </p>
        </div>
      </div>

      {/* Single Clean Trading Volume Chart */}
      <div className="p-6 rounded bg-obsidian-900 border border-zinc-800 space-y-4 card-metallic-bevel">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3 font-mono">
          <span className="type-micro text-ivory-200">VOLUME HISTORY (ETH)</span>
          <span className="type-micro text-zinc-400">7 Days</span>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.volumeTimeline}>
              <defs>
                <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ca8a04" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ca8a04" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} fontFamily="monospace" />
              <YAxis stroke="#52525b" fontSize={11} tickLine={false} fontFamily="monospace" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111113",
                  borderColor: "#27272a",
                  borderRadius: "4px",
                  color: "#fafaf9",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="volume" stroke="#ca8a04" strokeWidth={1.5} fill="url(#volGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
