"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { BeastRecord, ListingRecord } from "../server/db";
import { ELEMENTS, RARITIES, BEAST_ARTWORK_MAP, BeastElement, BeastRarity } from "../lib/elements";
import { resolveIpfsUrl } from "../lib/ipfs";
import { formatEther, cn, shortenAddress } from "../lib/utils";

interface BeastCardProps {
  beast: BeastRecord;
  listing?: ListingRecord | null;
  isOwner?: boolean;
  onBuy?: (tokenId: string, price: string) => void;
  onList?: (tokenId: string) => void;
}

export function BeastCard({ beast, listing, isOwner, onBuy, onList }: BeastCardProps) {
  const [imgSrc, setImgSrc] = useState(() => resolveIpfsUrl(beast.image || BEAST_ARTWORK_MAP[beast.name] || "/beasts/wolf.svg"));
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState("");
  const [glareStyle, setGlareStyle] = useState({ opacity: 0, x: 50, y: 50 });

  const elementKey = (beast.element || "Fire") as BeastElement;
  const elementInfo = ELEMENTS[elementKey] || ELEMENTS.Fire;

  const rarityKey = (beast.rarity || "Common") as BeastRarity;
  const rarityInfo = RARITIES[rarityKey] || RARITIES.Common;

  const isListed = listing && listing.active;

  // Lightweight tactile 3D tilt interaction for grid cards
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;

    setTransformStyle(`perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`);
    setGlareStyle({
      opacity: rarityKey === "Common" ? 0.05 : 0.15,
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setTransformStyle("perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)");
    setGlareStyle({ opacity: 0, x: 50, y: 50 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: transformStyle, transition: "transform 0.12s ease-out" }}
      className={cn(
        "group relative flex flex-col rounded-lg bg-[#0d0d10] border-2 overflow-hidden shadow-xl transition-shadow duration-200 select-none p-2.5 justify-between",
        rarityKey === "Legendary"
          ? "border-amber-600/70 shadow-[0_6px_25px_rgba(217,119,6,0.2)]"
          : rarityKey === "Epic"
          ? "border-purple-600/70 shadow-[0_6px_20px_rgba(147,51,234,0.18)]"
          : rarityKey === "Rare"
          ? "border-blue-600/70 shadow-[0_6px_18px_rgba(37,99,235,0.15)]"
          : "border-zinc-700"
      )}
    >
      {/* Glare foil overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 rounded"
        style={{
          opacity: glareStyle.opacity,
          background: `radial-gradient(circle at ${glareStyle.x}% ${glareStyle.y}%, rgba(255,255,255,0.35) 0%, transparent 60%)`,
        }}
      />

      {/* 1. Header Bar: Brand + Creature + #Token */}
      <div className="px-2.5 py-1.5 bg-[#141418] border border-white/10 rounded-t flex items-center justify-between z-10">
        <div>
          <span className="text-[8px] font-mono tracking-widest text-zinc-400 block uppercase">
            ELEMENTAL BEASTS
          </span>
          <span className="font-serif font-bold text-ivory-50 text-sm tracking-tight">
            {beast.name.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-zinc-300 font-bold">
            #{String(beast.tokenId).padStart(3, "0")}
          </span>
        </div>
      </div>

      {/* 2. Real Beast Artwork Window */}
      <Link
        href={`/card/${beast.tokenId}`}
        className="relative aspect-square w-full bg-[#060608] my-1.5 rounded overflow-hidden block border border-white/10"
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 50%, ${elementInfo.color}, transparent 70%)` }}
        />
        <img
          src={imgSrc}
          alt={beast.name}
          onError={() => setImgSrc("/beasts/wolf.svg")}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
      </Link>

      {/* 3. Center Ribbon: Creature & Element */}
      <div className="py-1 px-2 bg-[#141418] border border-white/10 rounded text-center z-10 mb-1.5">
        <span className="font-serif font-bold text-xs text-ivory-100 block tracking-wider">
          {beast.name.toUpperCase()}
        </span>
        <span className="text-[10px] font-mono font-bold tracking-widest block" style={{ color: elementInfo.color }}>
          {elementInfo.name.toUpperCase()}
        </span>
      </div>

      {/* 4. Stats: ATK / DEF / SPD */}
      <div className="grid grid-cols-3 bg-[#0a0a0c] border border-white/10 rounded text-center py-1.5 px-1 z-10 mb-1.5 font-mono">
        <div>
          <span className="text-[8px] text-zinc-400 block tracking-wider">ATK</span>
          <span className="text-xs font-bold text-ivory-50">{beast.attack || 50}</span>
        </div>
        <div className="border-x border-zinc-800">
          <span className="text-[8px] text-zinc-400 block tracking-wider">DEF</span>
          <span className="text-xs font-bold text-ivory-50">{beast.defense || 50}</span>
        </div>
        <div>
          <span className="text-[8px] text-zinc-400 block tracking-wider">SPD</span>
          <span className="text-xs font-bold text-ivory-50">{beast.speed || 50}</span>
        </div>
      </div>

      {/* 5. Rarity Strip */}
      <div className="px-2.5 py-1 bg-[#141418] border border-white/10 rounded flex items-center justify-between z-10 mb-1.5">
        <span className="text-[10px] font-mono font-bold tracking-wider" style={{ color: rarityInfo.color }}>
          {rarityInfo.label}
        </span>
        <span className="text-[8px] font-mono text-zinc-400 tracking-wider">
          BASE SEPOLIA
        </span>
      </div>

      {/* 6. Footer Settlement / Actions */}
      <div className="p-2 bg-[#0d0d10] border border-white/10 rounded-b flex items-center justify-between z-10">
        <div>
          {isListed ? (
            <div>
              <span className="text-[8px] font-mono text-zinc-400 block uppercase">Price</span>
              <span className="text-xs font-bold text-ivory-50 font-mono">
                {formatEther(listing.price)} <span className="text-amber-400 text-[10px]">ETH</span>
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[8px] font-mono text-zinc-400 block uppercase">Status</span>
              <span className="text-[11px] font-mono text-zinc-400">
                {isOwner ? "In Vault" : shortenAddress(beast.owner)}
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {isListed && !isOwner && onBuy && (
          <button
            onClick={() => onBuy(beast.tokenId, listing.price)}
            className="px-3 py-1 bg-ivory-100 hover:bg-white text-obsidian-950 font-mono font-bold rounded text-xs transition-colors shadow-sm"
          >
            Buy
          </button>
        )}

        {!isListed && isOwner && onList && (
          <button
            onClick={() => onList(beast.tokenId)}
            className="px-3 py-1 bg-obsidian-800 hover:bg-obsidian-700 text-ivory-200 border border-zinc-700 rounded text-xs font-mono font-medium transition-colors"
          >
            List
          </button>
        )}

        {(!onBuy && !onList) || (isListed && isOwner) ? (
          <Link
            href={`/card/${beast.tokenId}`}
            className="px-3 py-1 bg-obsidian-800 hover:bg-obsidian-700 text-zinc-300 rounded text-xs font-mono transition-colors border border-zinc-800"
          >
            Inspect
          </Link>
        ) : null}
      </div>
    </div>
  );
}
