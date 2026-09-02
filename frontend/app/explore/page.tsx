"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { trpc } from "@/lib/trpc";
import { BeastCard } from "@/components/BeastCard";
import { TransactionModal, TxStep } from "@/components/TransactionModal";
import { getContractAddresses, MARKETPLACE_ABI, decodeContractError } from "@/lib/contracts";
import { ELEMENTS, RARITIES, BeastElement, BeastRarity } from "@/lib/elements";

export default function ExplorePage() {
  const { address, isConnected, chainId } = useAccount();
  const addresses = getContractAddresses(chainId);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedElement, setSelectedElement] = useState("All");
  const [selectedRarity, setSelectedRarity] = useState("All");
  const [minAttack, setMinAttack] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "rarity">("newest");

  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [buyingTokenId, setBuyingTokenId] = useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: listings, isLoading, refetch } = trpc.listings.search.useQuery({
    element: selectedElement,
    rarity: selectedRarity,
    search: debouncedSearch || undefined,
    minAttack: minAttack > 0 ? minAttack : undefined,
    sortBy,
  });

  const syncSaleMutation = trpc.listings.syncSale.useMutation({
    onSuccess: () => refetch(),
  });

  const { writeContract, data: txHash, isPending: isPrompting, error: writeError, reset: resetWrite } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  React.useEffect(() => {
    if (isPrompting) {
      setTxStep("wallet_confirmation");
    } else if (isConfirming) {
      setTxStep("pending");
    } else if (isSuccess) {
      setTxStep("confirmed");
      if (buyingTokenId && address) {
        syncSaleMutation.mutate({
          tokenId: buyingTokenId,
          buyer: address,
          seller: "0x0",
          price: "0",
          txHash: txHash,
        });
      }
    } else if (writeError) {
      setTxStep("failed");
    }
  }, [isPrompting, isConfirming, isSuccess, writeError]);

  const handleBuy = (tokenId: string, priceWei: string) => {
    if (!isConnected) {
      alert("Please connect your wallet first to purchase cards.");
      return;
    }
    setBuyingTokenId(tokenId);
    writeContract({
      address: addresses.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "buyItem",
      args: [BigInt(tokenId)],
      value: BigInt(priceWei),
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-zinc-800/80 pb-6">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ivory-50 tracking-tight">
          EXPLORE BEASTS
        </h1>
        <p className="text-sm text-zinc-400 mt-1 font-sans">
          Collect elemental creatures forged on Base.
        </p>
      </div>

      <div className="space-y-4 bg-obsidian-900 border border-zinc-800/80 rounded p-4 card-metallic-bevel">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creature name or token ID..."
              className="w-full bg-obsidian-950 border border-zinc-800 rounded pl-9 pr-3 py-1.5 text-xs text-ivory-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors font-sans"
            />
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-obsidian-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-ivory-200 focus:outline-none focus:border-zinc-600 transition-colors font-mono"
            >
              <option value="newest">Recently Listed</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rarity">Rarity: Legendary First</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono">
          <button
            onClick={() => setSelectedElement("All")}
            className={`px-2.5 py-1 rounded text-xs transition-all ${
              selectedElement === "All"
                ? "bg-ivory-100 text-obsidian-950 font-bold"
                : "bg-obsidian-950 text-zinc-400 border border-zinc-800 hover:text-ivory-200"
            }`}
          >
            ALL
          </button>
          {Object.values(ELEMENTS).map((elem) => (
            <button
              key={elem.name}
              onClick={() => setSelectedElement(elem.name)}
              className={`px-2.5 py-1 rounded text-xs transition-all ${
                selectedElement === elem.name
                  ? "bg-obsidian-800 text-ivory-50 border border-zinc-600 font-bold"
                  : "bg-obsidian-950 text-zinc-400 border border-zinc-800 hover:text-ivory-200"
              }`}
            >
              {elem.name.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono">
          <button
            onClick={() => setSelectedRarity("All")}
            className={`px-2.5 py-0.5 rounded text-xs transition-all ${
              selectedRarity === "All"
                ? "bg-obsidian-800 text-ivory-100 border border-zinc-600 font-bold"
                : "bg-obsidian-950 text-zinc-400 border border-zinc-800/80 hover:text-zinc-300"
            }`}
          >
            ALL
          </button>
          {["COMMON", "RARE", "EPIC", "LEGENDARY"].map((rarity) => (
            <button
              key={rarity}
              onClick={() => setSelectedRarity(rarity.charAt(0) + rarity.slice(1).toLowerCase())}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                selectedRarity.toUpperCase() === rarity
                  ? "bg-obsidian-800 text-ivory-100 border border-zinc-600 font-bold"
                  : "bg-obsidian-950 text-zinc-400 border border-zinc-800/80 hover:text-zinc-300"
              }`}
            >
              {rarity}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-96 rounded bg-obsidian-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : listings && listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings.map(({ beast, listing }) => (
            <BeastCard
              key={beast.tokenId}
              beast={beast}
              listing={listing}
              isOwner={address ? beast.owner.toLowerCase() === address.toLowerCase() : false}
              onBuy={handleBuy}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-obsidian-900/60 border border-zinc-800 rounded p-8 space-y-4">
          <h3 className="text-lg font-serif font-bold text-ivory-100">No Beasts Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">
            Adjust search criteria or reset elemental filters to view all cataloged listings.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedElement("All");
              setSelectedRarity("All");
              setMinAttack(0);
            }}
            className="px-4 py-2 bg-obsidian-800 hover:bg-obsidian-700 text-ivory-200 border border-zinc-700 rounded text-xs font-mono"
          >
            Reset Filters
          </button>
        </div>
      )}

      <TransactionModal
        isOpen={txStep !== "idle"}
        onClose={() => {
          setTxStep("idle");
          resetWrite();
        }}
        step={txStep}
        title="Purchasing Elemental Beast"
        txHash={txHash}
        errorMessage={writeError ? decodeContractError(writeError) : undefined}
        successMessage={`Successfully acquired Beast #${buyingTokenId}! Ownership has settled to your wallet.`}
      />
    </div>
  );
}
