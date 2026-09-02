"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import {
  ArrowLeft,
  ExternalLink,
  Lock,
  Tag,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getContractAddresses, NFT_ABI, MARKETPLACE_ABI, decodeContractError } from "@/lib/contracts";
import { ELEMENTS, RARITIES, BeastElement, BeastRarity } from "@/lib/elements";
import { resolveIpfsUrl } from "@/lib/ipfs";
import { formatEther, shortenAddress, formatTimestamp } from "@/lib/utils";
import { TransactionModal, TxStep } from "@/components/TransactionModal";
import { PhysicalBeastCard } from "@/components/cards/PhysicalBeastCard";
import { parseEther } from "viem";

export default function BeastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tokenId = (params.tokenId as string) || "1";

  const { address, isConnected, chainId } = useAccount();
  const addresses = getContractAddresses(chainId);

  const [listPrice, setListPrice] = useState("0.005");
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txAction, setTxAction] = useState<"buy" | "approve" | "list" | "cancel">("buy");

  const { data, isLoading, refetch } = trpc.beasts.byId.useQuery({ tokenId });
  const syncListingMutation = trpc.listings.syncListing.useMutation({
    onSuccess: () => refetch(),
  });
  const syncSaleMutation = trpc.listings.syncSale.useMutation({
    onSuccess: () => refetch(),
  });

  const { data: onChainOwner } = useReadContract({
    address: addresses.nft,
    abi: NFT_ABI,
    functionName: "ownerOf",
    args: [BigInt(tokenId)],
    query: {
      enabled: addresses.nft !== "0x0000000000000000000000000000000000000000",
    },
  });

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
    args: [BigInt(tokenId)],
    query: {
      enabled: addresses.nft !== "0x0000000000000000000000000000000000000000",
    },
  });

  const isApproved =
    Boolean(isApprovedForAll) ||
    (approvedAddress && (approvedAddress as string).toLowerCase() === addresses.marketplace.toLowerCase());

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
      if (txAction === "list" && address) {
        syncListingMutation.mutate({
          tokenId,
          seller: address,
          price: parseEther(listPrice || "0.01").toString(),
          active: true,
          txHash,
        });
      } else if (txAction === "cancel" && address) {
        syncListingMutation.mutate({
          tokenId,
          seller: address,
          price: "0",
          active: false,
          txHash,
        });
      } else if (txAction === "buy" && address) {
        syncSaleMutation.mutate({
          tokenId,
          buyer: address,
          seller: (onChainOwner as string) || (data?.beast?.owner ?? "0x0"),
          price: data?.listing?.price || "0",
          txHash,
        });
      }
    } else if (writeError) {
      setTxStep("failed");
    }
  }, [isPrompting, isConfirming, isSuccess, writeError]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-zinc-400 mt-4">Retrieving Beast #{tokenId}...</p>
      </div>
    );
  }

  const beast = data?.beast;
  const listing = data?.listing;
  const history = data?.history || [];

  if (!beast) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-serif font-bold text-ivory-100">Beast Not Found</h2>
        <p className="text-zinc-400 text-xs">No minted collectible matching ID #{tokenId} exists in the ledger.</p>
        <Link href="/explore" className="inline-block px-4 py-2 bg-[#141418] text-ivory-200 rounded text-xs font-mono">
          Return to Gallery
        </Link>
      </div>
    );
  }

  const currentOwner = (onChainOwner as string) || beast.owner;
  const isOwner = address && currentOwner.toLowerCase() === address.toLowerCase();
  const isListed = listing && listing.active;

  const elementKey = (beast.element || "Fire") as BeastElement;
  const elementInfo = ELEMENTS[elementKey] || ELEMENTS.Fire;

  const rarityKey = (beast.rarity || "Common") as BeastRarity;
  const rarityInfo = RARITIES[rarityKey] || RARITIES.Common;

  const handleApprove = () => {
    setTxAction("approve");
    writeContract({
      address: addresses.nft,
      abi: NFT_ABI,
      functionName: "approve",
      args: [addresses.marketplace, BigInt(tokenId)],
    });
  };

  const handleList = () => {
    const priceNum = parseFloat(listPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please specify a listing price greater than 0 ETH.");
      return;
    }
    setTxAction("list");
    writeContract({
      address: addresses.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "listItem",
      args: [BigInt(tokenId), parseEther(listPrice)],
    });
  };

  const handleCancel = () => {
    setTxAction("cancel");
    writeContract({
      address: addresses.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "cancelListing",
      args: [BigInt(tokenId)],
    });
  };

  const handleBuy = () => {
    if (!listing) return;
    setTxAction("buy");
    writeContract({
      address: addresses.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: "buyItem",
      args: [BigInt(tokenId)],
      value: BigInt(listing.price),
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-ivory-100 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return to Explore</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 flex justify-center lg:sticky lg:top-20">
          <PhysicalBeastCard
            name={beast.name}
            element={elementKey}
            rarity={rarityKey}
            imageUrl={beast.image}
            attack={beast.attack}
            defense={beast.defense}
            speed={beast.speed}
            tokenId={beast.tokenId}
            price={listing?.price}
          />
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3 border-b border-zinc-800/80 pb-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border" style={{ color: elementInfo.color, borderColor: `${elementInfo.color}40` }}>
                {elementInfo.name.toUpperCase()}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border" style={{ color: rarityInfo.color, borderColor: `${rarityInfo.color}40` }}>
                {rarityInfo.label}
              </span>
              <span className="font-mono text-xs text-zinc-400 font-bold">
                #{String(beast.tokenId).padStart(3, "0")}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-ivory-50 tracking-tight">
              {beast.name.toUpperCase()}
            </h1>

            <p className="text-sm text-zinc-300 leading-relaxed font-sans pt-1 max-w-xl">
              {beast.description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-[#0d0d10] border border-zinc-800 p-4 rounded card-metallic-bevel text-center font-mono">
            <div>
              <span className="text-2xl sm:text-3xl font-bold text-ivory-50 block">{beast.attack || 50}</span>
              <span className="text-[10px] text-red-400 mt-1 block tracking-wider font-bold">ATTACK</span>
            </div>
            <div className="border-x border-zinc-800">
              <span className="text-2xl sm:text-3xl font-bold text-ivory-50 block">{beast.defense || 50}</span>
              <span className="text-[10px] text-blue-400 mt-1 block tracking-wider font-bold">DEFENSE</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-bold text-ivory-50 block">{beast.speed || 50}</span>
              <span className="text-[10px] text-yellow-400 mt-1 block tracking-wider font-bold">SPEED</span>
            </div>
          </div>

          <div className="p-5 rounded bg-[#0d0d10] border border-zinc-800 space-y-4 card-metallic-bevel">
            {isListed && !isOwner && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 block uppercase">Price</span>
                    <span className="text-2xl font-bold font-mono text-ivory-50">
                      {formatEther(listing.price)} <span className="text-amber-400 text-sm">ETH</span>
                    </span>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-[10px] text-zinc-400 block uppercase">Seller</span>
                    <span className="text-zinc-300">{shortenAddress(listing.seller)}</span>
                  </div>
                </div>

                <button
                  onClick={handleBuy}
                  className="w-full py-3.5 bg-ivory-100 hover:bg-white text-obsidian-950 font-bold rounded text-xs tracking-wider uppercase font-mono transition-all shadow-md"
                >
                  Buy Beast for {formatEther(listing.price)} ETH
                </button>
              </div>
            )}

            {isListed && isOwner && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold block uppercase">Listed by You</span>
                    <span className="text-2xl font-bold font-mono text-ivory-50">
                      {formatEther(listing.price)} <span className="text-amber-400 text-sm">ETH</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCancel}
                  className="w-full py-3 bg-[#18181b] hover:bg-red-950/60 hover:text-red-300 border border-zinc-700 text-zinc-300 rounded text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Cancel Listing</span>
                </button>
              </div>
            )}

            {!isListed && isOwner && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Tag className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-mono text-ivory-100 uppercase tracking-wider">List Beast For Sale</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Set Price in ETH</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.0001"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="0.005"
                    className="w-full bg-[#080808] border border-zinc-800 rounded px-3.5 py-2 text-sm text-ivory-100 font-mono focus:outline-none focus:border-zinc-600"
                  />
                </div>

                {!isApproved ? (
                  <button
                    onClick={handleApprove}
                    className="w-full py-3 bg-[#18181b] hover:bg-[#202024] text-ivory-100 font-medium rounded text-xs font-mono transition-all border border-zinc-700 flex items-center justify-center gap-2"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Approve Marketplace</span>
                  </button>
                ) : (
                  <button
                    onClick={handleList}
                    className="w-full py-3.5 bg-ivory-100 hover:bg-white text-obsidian-950 font-bold rounded text-xs tracking-wider uppercase font-mono transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    <span>List for {listPrice} ETH</span>
                  </button>
                )}
              </div>
            )}

            {!isListed && !isOwner && (
              <div className="text-center py-2">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Status: In Vault</span>
                <p className="text-xs text-zinc-400 font-sans mt-1">
                  This beast is currently not listed for sale.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 rounded bg-[#0d0d10] border border-zinc-800 space-y-2.5 text-xs font-mono">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Blockchain Information</span>
            <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800/60 pt-2">
              <span>Owner</span>
              <span className="text-ivory-200">{isOwner ? "You" : shortenAddress(currentOwner)}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800/60 pt-2">
              <span>IPFS Metadata</span>
              <a
                href={resolveIpfsUrl(beast.tokenUri)}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1"
              >
                View Metadata <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800/60 pt-2">
              <span>Royalty</span>
              <span className="text-emerald-400">5.0% (ERC-2981 Pull)</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800/60 pt-2">
              <span>Token Standard</span>
              <span className="text-ivory-200">ERC-721</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800/60 pt-2">
              <span>Contract</span>
              <a
                href={`https://sepolia.basescan.org/address/${addresses.nft}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1"
              >
                {shortenAddress(addresses.nft)} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="p-4 rounded bg-[#0d0d10] border border-zinc-800 space-y-2.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Provenance History</span>
            {history.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {history.map((event) => (
                  <div
                    key={event.id}
                    className="flex justify-between items-center p-2 rounded bg-[#080808] border border-zinc-800/80 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-[#18181b] text-amber-400 text-[10px]">
                        {event.type}
                      </span>
                      <span className="text-zinc-300 text-[11px]">
                        {event.type === "MINT" && `Minted to ${shortenAddress(event.to)}`}
                        {event.type === "LIST" && `Listed for ${formatEther(event.price)} ETH`}
                        {event.type === "CANCEL" && `Listing cancelled`}
                        {event.type === "SALE" && `Sold to ${shortenAddress(event.to)} for ${formatEther(event.price)} ETH`}
                      </span>
                    </div>
                    <span className="text-zinc-400 text-[10px]">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-zinc-400">No recorded state changes yet.</p>
            )}
          </div>
        </div>
      </div>

      <TransactionModal
        isOpen={txStep !== "idle"}
        onClose={() => {
          setTxStep("idle");
          resetWrite();
        }}
        step={txStep}
        title={
          txAction === "buy"
            ? "Purchasing Beast"
            : txAction === "approve"
            ? "Approving Marketplace"
            : txAction === "list"
            ? "Listing Beast for Sale"
            : "Cancelling Listing"
        }
        txHash={txHash}
        errorMessage={writeError ? decodeContractError(writeError) : undefined}
        successMessage={
          txAction === "buy"
            ? `Beast #${tokenId} successfully purchased! Ownership has settled.`
            : txAction === "approve"
            ? "Marketplace approved! Proceed with listing."
            : txAction === "list"
            ? `Beast #${tokenId} listed for ${listPrice} ETH.`
            : `Listing for Beast #${tokenId} cancelled.`
        }
      />
    </div>
  );
}
