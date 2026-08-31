"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ELEMENTS, RARITIES, BeastElement, BeastRarity } from "@/lib/elements";
import { useIpfsImage } from "@/lib/useIpfsImage";
import { formatEther } from "@/lib/utils";

export interface PhysicalBeastCardProps {
  name: string;
  element: BeastElement;
  rarity: BeastRarity;
  imageUrl: string;
  attack?: number;
  defense?: number;
  speed?: number;
  tokenId?: string;
  price?: string;
  interactive?: boolean;
  priority?: boolean;
  className?: string;
}

export function PhysicalBeastCard({
  name,
  element,
  rarity,
  imageUrl,
  attack = 80,
  defense = 70,
  speed = 75,
  tokenId = "001",
  price,
  interactive = true,
  priority = true,
  className = "",
}: PhysicalBeastCardProps) {
  const { src: imgSrc, onError: retryImage } = useIpfsImage(imageUrl);
  const [isLoaded, setIsLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState("");
  const [glareStyle, setGlareStyle] = useState({ opacity: 0, x: 50, y: 50 });

  // Sync image source instantly on prop changes without tearing DOM
  useEffect(() => {
    const isLocalPath = imgSrc.startsWith("/") || imgSrc.startsWith("data:") || imgSrc.startsWith("blob:");
    // Local assets render instantly — skip shimmer; remote assets need loading state
    setIsLoaded(isLocalPath);
  }, [imgSrc]);

  const elementInfo = ELEMENTS[element] || ELEMENTS.Fire;
  const rarityInfo = RARITIES[rarity] || RARITIES.Common;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -9;
    const rotateY = ((x - centerX) / centerX) * 9;

    setTransformStyle(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`);
    setGlareStyle({
      opacity: rarity === "Common" ? 0.08 : 0.22,
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setTransformStyle("perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)");
    setGlareStyle({ opacity: 0, x: 50, y: 50 });
  };

  const isLocalAsset = imgSrc.startsWith("/") || imgSrc.startsWith("http");

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: transformStyle, transition: "transform 0.15s ease-out" }}
      className={`relative w-full aspect-[1/1.42] max-w-[360px] mx-auto rounded-xl bg-[#0c0c0f] border-2 overflow-hidden shadow-2xl flex flex-col justify-between p-3 select-none transition-shadow duration-300 ${
        rarity === "Legendary"
          ? "border-amber-500/80 shadow-[0_12px_40px_rgba(217,119,6,0.3)]"
          : rarity === "Epic"
          ? "border-purple-500/80 shadow-[0_12px_35px_rgba(147,51,234,0.25)]"
          : rarity === "Rare"
          ? "border-blue-500/80 shadow-[0_12px_30px_rgba(37,99,235,0.22)]"
          : "border-zinc-700 shadow-xl"
      } ${className}`}
    >
      {/* Glare foil overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 rounded-xl"
        style={{
          opacity: glareStyle.opacity,
          background: `radial-gradient(circle at ${glareStyle.x}% ${glareStyle.y}%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
        }}
      />

      {/* Inner Metallic Bevel Rim */}
      <div className="absolute inset-1.5 rounded-lg border border-white/10 pointer-events-none z-20" />

      {/* 1. Card Header */}
      <div className="bg-[#141418] border border-white/10 rounded-t px-3.5 py-2 flex items-center justify-between z-10">
        <div>
          <span className="text-[8px] font-mono tracking-widest text-zinc-400 block uppercase font-bold">
            ELEMENTAL BEASTS
          </span>
          <span className="font-serif font-bold text-ivory-50 text-base tracking-tight">
            {name.toUpperCase()}
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-zinc-300 font-bold">
            #{String(tokenId).padStart(3, "0")}
          </span>
        </div>
      </div>

      {/* 2. Main Beast Artwork Frame */}
      <div className="relative flex-1 my-2 bg-[#050507] border border-white/10 rounded overflow-hidden flex items-center justify-center min-h-[200px]">
        {/* Ambient Radial Accent */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 50%, ${elementInfo.color}, transparent 70%)` }}
        />

        {/* Subtle Luxury Loading Shimmer Placeholder (Never an empty black box) */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-[#09090c] flex items-center justify-center animate-pulse">
            <span className="text-2xl opacity-20">{elementInfo.icon}</span>
          </div>
        )}

        {/* Next.js Optimized Image with Priority Preloading */}
        {isLocalAsset && imgSrc.startsWith("/") ? (
          <Image
            src={imgSrc}
            alt={name}
            fill
            sizes="360px"
            priority={priority}
            unoptimized={imgSrc.endsWith(".svg")}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              retryImage();
            }}
            className={`object-cover object-center transform hover:scale-105 transition-all duration-300 ${
              isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          />
        ) : (
          <img
            src={imgSrc}
            alt={name}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              retryImage();
            }}
            className={`w-full h-full object-cover object-center transform hover:scale-105 transition-all duration-300 ${
              isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          />
        )}
      </div>

      {/* 3. Center Ribbon */}
      <div className="bg-[#141418] border border-white/10 py-1.5 px-3 rounded text-center z-10 mb-2">
        <span className="font-serif font-bold text-xs text-ivory-100 block tracking-wider">
          {name.toUpperCase()}
        </span>
        <span
          className="text-[10px] font-mono font-bold tracking-widest block mt-0.5"
          style={{ color: elementInfo.color }}
        >
          {element.toUpperCase()}
        </span>
      </div>

      {/* 4. Combat Attribute Stats */}
      <div className="grid grid-cols-3 bg-[#08080a] border border-white/10 rounded py-2 px-1 text-center font-mono z-10 mb-2">
        <div>
          <span className="text-[8px] text-zinc-400 block tracking-wider font-bold">ATK</span>
          <span className="text-sm font-bold text-ivory-50">{attack}</span>
        </div>
        <div className="border-x border-zinc-800">
          <span className="text-[8px] text-zinc-400 block tracking-wider font-bold">DEF</span>
          <span className="text-sm font-bold text-ivory-50">{defense}</span>
        </div>
        <div>
          <span className="text-[8px] text-zinc-400 block tracking-wider font-bold">SPD</span>
          <span className="text-sm font-bold text-ivory-50">{speed}</span>
        </div>
      </div>

      {/* 5. Footer: Rarity & Network / Price */}
      <div className="bg-[#141418] border border-white/10 rounded-b px-3.5 py-2 flex items-center justify-between z-10">
        <span
          className="text-[10px] font-mono font-bold tracking-wider"
          style={{ color: rarityInfo.color }}
        >
          {rarityInfo.label}
        </span>
        <span className="text-[9px] font-mono text-zinc-400 tracking-wider">
          {price ? `${formatEther(price)} ETH` : "BASE SEPOLIA"}
        </span>
      </div>
    </div>
  );
}
