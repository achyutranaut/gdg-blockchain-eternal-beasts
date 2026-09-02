"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BeastCard } from "@/components/BeastCard";
import { PhysicalBeastCard } from "@/components/cards/PhysicalBeastCard";
import { ELEMENTS } from "@/lib/elements";

export default function HomePage() {
  const { data: featuredBeasts, isLoading } = trpc.beasts.all.useQuery({ limit: 4 } as any);
  const { data: analytics } = trpc.analytics.summary.useQuery();

  return (
    <div className="space-y-20 pb-20 overflow-hidden">
      <section className="relative pt-12 pb-16 md:pt-16 md:pb-20 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#111113] border border-zinc-800 text-xs font-mono text-amber-400">
                <span>BASE SEPOLIA • NON-CUSTODIAL COLLECTIBLES</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-ivory-50 leading-[1.05]">
                ELEMENTAL <br />
                <span className="italic font-normal text-zinc-400">BEASTS</span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-300 max-w-xl font-sans leading-relaxed">
                Collect, mint, and trade tactical elemental creatures. Each beast is a unique ERC-721 token on Base Sepolia with immutable IPFS-pinned metadata and atomic pull-payment settlement.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <Link
                  href="/explore"
                  className="w-full sm:w-auto px-7 py-3.5 bg-ivory-100 hover:bg-white text-obsidian-950 font-bold rounded text-xs tracking-wider uppercase font-mono transition-all shadow-md flex items-center justify-center gap-2 group"
                >
                  <span>Explore Gallery</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/mint"
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#121215] hover:bg-[#18181b] border border-zinc-700 text-ivory-100 font-bold rounded text-xs tracking-wider uppercase font-mono transition-all flex items-center justify-center gap-2"
                >
                  <span>Summon a Beast</span>
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-3 pt-6 border-t border-zinc-800/80 max-w-lg font-mono">
                <div>
                  <span className="text-[9px] text-zinc-400 block tracking-wider uppercase">Minted</span>
                  <span className="text-xl font-bold text-ivory-100">{analytics?.totalMinted ?? 0}</span>
                </div>
                <div className="border-x border-zinc-800 px-3">
                  <span className="text-[9px] text-zinc-400 block tracking-wider uppercase">Active Asks</span>
                  <span className="text-xl font-bold text-amber-400">{analytics?.activeListingsCount ?? 0}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-400 block tracking-wider uppercase">Holders</span>
                  <span className="text-xl font-bold text-ivory-100">{analytics?.uniqueHolders ?? 0}</span>
                </div>
                <div className="border-l border-zinc-800 pl-3">
                  <span className="text-[9px] text-zinc-400 block tracking-wider uppercase">Settlement</span>
                  <span className="text-xs font-bold text-emerald-400 block mt-1">Pull Payments</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <PhysicalBeastCard
                name="WOLF"
                element="Fire"
                rarity="Legendary"
                imageUrl="/beasts/wolf.svg"
                attack={95}
                defense={70}
                speed={85}
                tokenId="001"
                price="150000000000000000"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="border-b border-zinc-800/80 pb-3 flex items-end justify-between">
          <div>
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block">Cosmology</span>
            <h2 className="text-2xl font-serif font-bold text-ivory-100 mt-0.5">
              The Six Elements
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.values(ELEMENTS).map((elem) => (
            <div
              key={elem.name}
              className="p-3.5 rounded bg-[#0e0e11] border border-zinc-800/80 space-y-2 card-metallic-bevel"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{elem.icon}</span>
                <span className="text-xs font-mono font-bold" style={{ color: elem.color }}>
                  {elem.name.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                {elem.tagline}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block">Archive</span>
            <h2 className="text-2xl font-serif font-bold text-ivory-100 mt-0.5">
              Featured Collectibles
            </h2>
          </div>
          <Link
            href="/explore"
            className="text-xs font-mono text-zinc-400 hover:text-ivory-100 flex items-center gap-1 transition-colors"
          >
            <span>View All Cards</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-96 rounded bg-[#0d0d10] border border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredBeasts?.slice(0, 4).map((beast) => (
              <BeastCard key={beast.tokenId} beast={beast} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
