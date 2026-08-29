"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { ArrowDownToLine, Lock, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BeastCard } from "@/components/BeastCard";
import { BeastRecord } from "@/server/db";
import { getContractAddresses, NFT_ABI, MARKETPLACE_ABI, decodeContractError } from "@/lib/contracts";
import { formatEther } from "@/lib/utils";
import { TransactionModal, TxStep } from "@/components/TransactionModal";

export default function MyCollectionPage() {
  const { address, isConnected, chainId } = useAccount();
  const addresses = getContractAddresses(chainId);

  const [filter, setFilter] = useState<"all" | "collection" | "listed">("all");

  // Listing modal state
  const [selectedBeastToList, setSelectedBeastToList] = useState<BeastRecord | null>(null);
  const [listPrice, setListPrice] = useState("0.005");
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txAction, setTxAction] = useState<"approve" | "list">("list");

  // Fetch portfolio
  const { data: portfolio, isLoading, refetch } = trpc.wallets.portfolio.useQuery(
    { address: address || "" },
    { enabled: Boolean(address) }
  );

  const syncListingMutation = trpc.listings.syncListing.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedBeastToList(null);
    },
  });

  // Pull payments proceeds
  const { data: proceedsWei, refetch: refetchProceeds } = useReadContract({
    address: addresses.marketplace,
    abi: MARKETPLACE_ABI,
    functionName: "getProceeds",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && addresses.marketplace !== "0x0000000000000000000000000000000000000000"),
    },
  });

  // Approval check for selected beast
  const { data: isApprovedForAll } = useReadContract({
    address: addresses.nft,
    abi: NFT_ABI,
    functionName: "isApprovedForAll",
    args: address ? [address, addresses.marketplace] : undefined,
    query: {
      enabled: Boolean(address && addresses.marketplace !== "0x0000000000000000000000000000000000000000"),
    },
  });

  const { data: approvedAddress } = useReadContract({
    address: addresses.nft,
    abi: NFT_ABI,
    functionName: "getApproved",
    args: selectedBeastToList ? [BigInt(selectedBeastToList.tokenId)] : undefined,
    query: {
      enabled: Boolean(selectedBeastToList && addresses.nft !== "0x0000000000000000000000000000000000000000"),
    },
  });

  const isApproved =
    Boolean(isApprovedForAll) ||
    (approvedAddress && (approvedAddress as string).toLowerCase() === addresses.marketplace.toLowerCase());

  // Wagmi Write
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
      if (txAction === "list" && selectedBeastToList && address) {
        syncListingMutation.mutate({
          tokenId: selectedBeastToList.tokenId,
          seller: address,
          price: parseEther(listPrice || "0.01").toString(),
          active: true,
          txHash,
        });
      }
    } else if (writeError) {
      setTxStep("failed");
    }
  }, [isPrompting, isConfirming, isSuccess, writeError]);

  const handleApprove = () => {
    if (!selectedBeastToList) return;
    setTxAction("approve");
    writeContract({
      address: addresses.nft,
      abi: NFT_ABI,
      functionName: "approve",
      args: [addresses.marketplace, BigInt(selectedBeastToList.tokenId)],
    });
  };

  const handleList = () => {
    if (!selectedBeastToList) return;
    const num = parseFloat(listPrice);
    if (isNaN(num) || num <= 0) {
      alert("Please enter a valid price in ETH.");
      return;
    }
    setTxAction("list");
    writeContract({
      address: addresses.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "listItem",
      args: [BigInt(selectedBeastToList.tokenId), parseEther(listPrice)],
    });
  };

  const activeListingMap = new Map(
    (portfolio?.activeListings || []).map((item) => [item.listing.tokenId, item.listing])
  );

  const ownedBeasts = portfolio?.ownedBeasts || [];

  const filteredBeasts = ownedBeasts.filter((beast) => {
    const isListed = activeListingMap.has(beast.tokenId);
    if (filter === "listed") return isListed;
    // Both 'all' and 'collection' include all cards owned by the user (listed or unlisted)
    return true;
  });

  const hasProceeds = Boolean(proceedsWei && BigInt(proceedsWei as string | bigint) > BigInt(0));

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="text-2xl font-serif font-bold text-ivory-100">Connect Wallet</h2>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">
          Connect your wallet to inspect your owned cards, list items for sale, and claim proceeds.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ivory-50 tracking-tight">
            MY COLLECTION
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Connected: <span className="text-ivory-200">{address}</span>
          </p>
        </div>

        <Link
          href="/mint"
          className="px-4 py-2 bg-ivory-100 hover:bg-white text-obsidian-950 rounded text-xs font-mono font-bold transition-all shadow-sm"
        >
          SUMMON BEAST
        </Link>
      </div>

      {/* Pull Payments Proceeds Box (if any) */}
      {hasProceeds && (
        <div className="p-4 rounded bg-emerald-950/40 border border-emerald-600/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-emerald-900/60 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <ArrowDownToLine className="h-4 w-4" />
            </div>
            <div>
              <span className="type-micro text-emerald-300 font-mono">Marketplace Pull Proceeds Accrued</span>
              <p className="text-xs text-zinc-300 font-mono">
                Claimable balance: <span className="font-bold text-ivory-50">{String(formatEther(proceedsWei as bigint))} ETH</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              writeContract({
                address: addresses.marketplace,
                abi: MARKETPLACE_ABI,
                functionName: "withdrawProceeds",
              });
            }}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors font-mono"
          >
            Withdraw to Wallet
          </button>
        </div>
      )}

      {/* Filter Tabs: ALL / IN COLLECTION / LISTED */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-3 font-mono">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded text-xs transition-all ${
            filter === "all" ? "bg-obsidian-800 text-ivory-100 font-bold border border-zinc-700" : "text-zinc-400 hover:text-ivory-200"
          }`}
        >
          ALL ({ownedBeasts.length})
        </button>
        <button
          onClick={() => setFilter("collection")}
          className={`px-3 py-1 rounded text-xs transition-all ${
            filter === "collection" ? "bg-obsidian-800 text-ivory-100 font-bold border border-zinc-700" : "text-zinc-400 hover:text-ivory-200"
          }`}
        >
          IN COLLECTION ({ownedBeasts.length})
        </button>
        <button
          onClick={() => setFilter("listed")}
          className={`px-3 py-1 rounded text-xs transition-all ${
            filter === "listed" ? "bg-obsidian-800 text-ivory-100 font-bold border border-zinc-700" : "text-zinc-400 hover:text-ivory-200"
          }`}
        >
          LISTED ({activeListingMap.size})
        </button>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 rounded bg-obsidian-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : filteredBeasts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredBeasts.map((beast) => (
            <BeastCard
              key={beast.tokenId}
              beast={beast}
              listing={activeListingMap.get(beast.tokenId)}
              isOwner={true}
              onList={() => setSelectedBeastToList(beast)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-obsidian-900/60 border border-zinc-800 rounded p-8 space-y-4">
          <h3 className="text-base font-serif font-bold text-ivory-100">No Cards Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">
            {filter === "all"
              ? "You do not own any Elemental Beasts yet. Summon your first beast or purchase one from the gallery."
              : `No cards match the "${filter.toUpperCase()}" filter.`}
          </p>
          <Link
            href="/mint"
            className="inline-block px-4 py-2 bg-ivory-100 hover:bg-white text-obsidian-950 rounded text-xs font-mono font-bold shadow-sm"
          >
            SUMMON BEAST
          </Link>
        </div>
      )}

      {/* Quick List Modal */}
      {selectedBeastToList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-obsidian-900 border border-zinc-800 rounded p-6 shadow-2xl space-y-5 relative card-metallic-bevel">
            <button
              onClick={() => setSelectedBeastToList(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-ivory-100"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <span className="type-micro text-amber-400 font-mono">LIST CARD FOR SALE</span>
              <h3 className="text-xl font-serif font-bold text-ivory-50">{selectedBeastToList.name.toUpperCase()}</h3>
              <p className="type-micro text-zinc-400 font-mono">Token ID #{selectedBeastToList.tokenId}</p>
            </div>

            <div className="space-y-2">
              <label className="type-micro text-zinc-400 font-mono">Asking Price in ETH</label>
              <input
                type="number"
                step="0.001"
                min="0.0001"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="0.005"
                className="w-full bg-obsidian-950 border border-zinc-800 rounded px-3.5 py-2 text-sm text-ivory-100 font-mono focus:outline-none focus:border-zinc-600"
              />
              <p className="text-[10px] text-zinc-300 font-sans">
                Protocol fee (2.5%) and creator royalty (5.0%) are settled atomically upon purchase.
              </p>
            </div>

            {!isApproved ? (
              <button
                onClick={handleApprove}
                className="w-full py-3 bg-obsidian-800 hover:bg-obsidian-700 text-ivory-100 font-medium rounded text-xs font-mono transition-all border border-zinc-700 flex items-center justify-center gap-2"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Approve Marketplace</span>
              </button>
            ) : (
              <button
                onClick={handleList}
                className="w-full py-3.5 bg-ivory-100 hover:bg-white text-obsidian-950 font-bold rounded text-xs tracking-wider uppercase font-mono transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>Confirm Listing for {listPrice} ETH</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txStep !== "idle"}
        onClose={() => {
          setTxStep("idle");
          resetWrite();
        }}
        step={txStep}
        title={txAction === "approve" ? "Approving Marketplace" : "Listing Beast for Sale"}
        txHash={txHash}
        errorMessage={writeError ? decodeContractError(writeError) : undefined}
        successMessage={
          txAction === "approve"
            ? "Marketplace approved! You can now proceed to list your card."
            : `Beast #${selectedBeastToList?.tokenId} is now listed for ${listPrice} ETH.`
        }
      />
    </div>
  );
}
