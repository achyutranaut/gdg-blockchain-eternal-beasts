"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getContractAddresses, MARKETPLACE_ABI, decodeContractError } from "@/lib/contracts";
import { formatEther } from "@/lib/utils";
import { useIpfsImage } from "@/lib/useIpfsImage";
import { TransactionModal, TxStep } from "@/components/TransactionModal";

function ListingArtwork({ image, alt }: { image?: string; alt: string }) {
  const { src, onError } = useIpfsImage(image);
  return <img src={src} alt={alt} onError={onError} className="h-full w-full object-cover" />;
}

export default function MyListingsPage() {
  const { address, isConnected, chainId } = useAccount();
  const addresses = getContractAddresses(chainId);

  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [cancellingTokenId, setCancellingTokenId] = useState<string | null>(null);

  const { data: portfolio, isLoading, refetch } = trpc.wallets.portfolio.useQuery(
    { address: address || "" },
    { enabled: Boolean(address) }
  );

  const syncListingMutation = trpc.listings.syncListing.useMutation({
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
      if (cancellingTokenId && address) {
        syncListingMutation.mutate({
          tokenId: cancellingTokenId,
          seller: address,
          price: "0",
          active: false,
          txHash,
        });
      }
    } else if (writeError) {
      setTxStep("failed");
    }
  }, [isPrompting, isConfirming, isSuccess, writeError]);

  const handleCancel = (tokenId: string) => {
    setCancellingTokenId(tokenId);
    writeContract({
      address: addresses.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "cancelListing",
      args: [BigInt(tokenId)],
    });
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="text-2xl font-serif font-bold text-ivory-100">Connect Wallet</h2>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">
          Connect your Web3 wallet to manage or cancel active marketplace listings.
        </p>
      </div>
    );
  }

  const activeListings = portfolio?.activeListings || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-zinc-800/80 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ivory-50 tracking-tight">
            MY LISTINGS
          </h1>
          <p className="text-sm text-zinc-400 mt-1 font-sans">
            Cards currently offered for fixed-price sale.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded bg-obsidian-900 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : activeListings.length > 0 ? (
        <div className="space-y-3">
          {activeListings.map(({ listing, beast }) => (
            <div
              key={listing.tokenId}
              className="p-4 sm:p-5 rounded bg-obsidian-900 border border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-zinc-700 transition-colors card-metallic-bevel"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded bg-obsidian-950 overflow-hidden border border-zinc-800 shrink-0">
                  <ListingArtwork
                    image={beast?.image}
                    alt={beast?.name || "Beast"}
                  />
                </div>
                <div>
                  <Link
                    href={`/card/${listing.tokenId}`}
                    className="font-bold font-serif text-ivory-100 text-base hover:text-amber-400 transition-colors"
                  >
                    {beast?.name.toUpperCase() || `BEAST #${listing.tokenId}`}
                  </Link>
                  <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 mt-0.5">
                    <span>Token #{String(listing.tokenId).padStart(3, "0")}</span>
                    <span>•</span>
                    <span className="text-amber-400">{beast?.element.toUpperCase() || "FIRE"}</span>
                    <span>•</span>
                    <span className="text-zinc-300">{beast?.rarity.toUpperCase() || "COMMON"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0">
                <div className="text-left sm:text-right">
                  <span className="type-micro text-zinc-400 block text-[9px] font-mono">Price</span>
                  <span className="text-base font-bold text-ivory-50 font-mono">
                    {formatEther(listing.price)} <span className="text-amber-400 text-xs">ETH</span>
                  </span>
                </div>

                <button
                  onClick={() => handleCancel(listing.tokenId)}
                  className="px-3.5 py-1.5 bg-obsidian-800 hover:bg-red-950/60 hover:text-red-300 border border-zinc-700 text-zinc-300 text-xs font-mono font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Cancel Listing</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-obsidian-900/60 border border-zinc-800 rounded p-8 space-y-4">
          <h3 className="text-base font-serif font-bold text-ivory-100">No Active Listings</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">
            You do not have any cards actively listed for sale. Visit your collection to offer cards.
          </p>
          <Link
            href="/my-collection"
            className="inline-block px-4 py-2 bg-ivory-100 hover:bg-white text-obsidian-950 rounded text-xs font-mono font-bold shadow-sm"
          >
            MY COLLECTION
          </Link>
        </div>
      )}

      <TransactionModal
        isOpen={txStep !== "idle"}
        onClose={() => {
          setTxStep("idle");
          resetWrite();
        }}
        step={txStep}
        title="Cancelling Marketplace Listing"
        txHash={txHash}
        errorMessage={writeError ? decodeContractError(writeError) : undefined}
        successMessage={`Listing for Beast #${cancellingTokenId} has been successfully cancelled on-chain.`}
      />
    </div>
  );
}
