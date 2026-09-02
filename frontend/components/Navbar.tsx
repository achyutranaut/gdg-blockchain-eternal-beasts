"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import { getContractAddresses, MARKETPLACE_ABI } from "../lib/contracts";
import { formatEther, cn } from "../lib/utils";
import { WithdrawModal } from "./WithdrawModal";

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, chainId } = useAccount();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const addresses = getContractAddresses(chainId);

  const { data: proceedsWei, refetch: refetchProceeds } = useReadContract({
    address: addresses.marketplace,
    abi: MARKETPLACE_ABI,
    functionName: "getProceeds",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(isConnected && address && addresses.marketplace !== "0x0000000000000000000000000000000000000000"),
      refetchInterval: 6000,
    },
  });

  const hasProceeds = Boolean(proceedsWei && BigInt(proceedsWei as string | bigint) > BigInt(0));

  const navLinks = [
    { href: "/explore", label: "EXPLORE" },
    { href: "/mint", label: "SUMMON" },
    { href: "/my-collection", label: "COLLECTION" },
    { href: "/my-listings", label: "LISTINGS" },
    { href: "/activity", label: "ACTIVITY" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#080808]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex flex-col">
            <span className="font-serif tracking-tight text-ivory-50 font-bold text-sm sm:text-base group-hover:text-amber-400 transition-colors">
              ELEMENTAL BEASTS
            </span>
            <span className="type-micro text-[8px] text-zinc-300 font-mono -mt-1">
              BASE SEPOLIA
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "type-micro text-xs tracking-wider transition-colors py-1 relative font-mono",
                  active
                    ? "text-ivory-50 font-bold"
                    : "text-zinc-400 hover:text-ivory-100"
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {isConnected && hasProceeds && (
            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-xs font-mono font-medium hover:bg-emerald-900/60 transition-colors"
            >
              <span>Claim {String(formatEther(proceedsWei as bigint))} ETH</span>
            </button>
          )}

          <ConnectButton
            showBalance={false}
            accountStatus="address"
            chainStatus="icon"
          />
        </div>
      </div>

      {isConnected && (
        <WithdrawModal
          isOpen={isWithdrawOpen}
          onClose={() => setIsWithdrawOpen(false)}
          proceedsWei={proceedsWei ? BigInt(proceedsWei as string | bigint) : BigInt(0)}
          onSuccess={() => refetchProceeds()}
        />
      )}
    </header>
  );
}
