"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Upload, Loader2, ArrowRight } from "lucide-react";
import { ELEMENTS, RARITIES, CREATURE_NAMES, BEAST_ARTWORK_MAP, BeastElement, BeastRarity } from "@/lib/elements";
import { getContractAddresses, NFT_ABI, decodeContractError } from "@/lib/contracts";
import { TransactionModal, TxStep } from "@/components/TransactionModal";
import { PhysicalBeastCard } from "@/components/cards/PhysicalBeastCard";
import { trpc } from "@/lib/trpc";
import { keccak256, toBytes } from "viem";

const CARD_MINTED_EVENT_TOPIC = keccak256(
  toBytes("CardMinted(uint256,address,string)")
);

type MintContext = {
  owner: `0x${string}`;
  tokenUri: string;
  imageUri: string;
  name: string;
  description: string;
  element: BeastElement;
  rarity: BeastRarity;
  attack: number;
  defense: number;
  speed: number;
};

export default function SummonPage() {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const addresses = getContractAddresses(chainId);

  // 1. Central Summon Configuration State
  const [selectedElement, setSelectedElement] = useState<BeastElement>("Fire");
  const [selectedRarity, setSelectedRarity] = useState<BeastRarity>("Rare");
  const [selectedBeast, setSelectedBeast] = useState<string>("WOLF");
  const [selectedPlateIndex, setSelectedPlateIndex] = useState<number>(0);
  const [customArtworkUrl, setCustomArtworkUrl] = useState<string | null>(null);
  const [customFile, setCustomFile] = useState<File | null>(null);

  // Lore / Description
  const [description, setDescription] = useState(
    "Forged in subterranean magma veins, commands unyielding infernal resolve."
  );

  // Combat Stats
  const [attack, setAttack] = useState(84);
  const [defense, setDefense] = useState(68);
  const [speed, setSpeed] = useState(76);

  // Upload & Transaction state
  const [isUploadingToIpfs, setIsUploadingToIpfs] = useState(false);
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);
  const [mintContext, setMintContext] = useState<MintContext | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncBeastMutation = trpc.beasts.syncBeast.useMutation();

  const { writeContract, data: txHash, isPending: isPrompting, error: writeError, reset: resetWrite } = useWriteContract();

  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Preload all beast vectors & plate artworks in the browser cache in the background
  useEffect(() => {
    if (typeof window === "undefined") return;

    const imagesToPreload = [
      ...Object.values(BEAST_ARTWORK_MAP),
      ...Object.values(ELEMENTS).flatMap((el) => el.sampleImages),
    ];

    imagesToPreload.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  // Clean up any generated custom object URLs on unmount
  useEffect(() => {
    return () => {
      if (customArtworkUrl && customArtworkUrl.startsWith("blob:")) {
        URL.revokeObjectURL(customArtworkUrl);
      }
    };
  }, [customArtworkUrl]);

  React.useEffect(() => {
    if (isPrompting) {
      setTxStep("wallet_confirmation");
    } else if (isConfirming) {
      setTxStep("pending");
    } else if (writeError) {
      setTxStep("failed");
    }
  }, [isPrompting, isConfirming, writeError]);

  const syncConfirmedMint = async () => {
    if (!receipt || !mintContext || !txHash || !addresses?.nft) return;

    setSyncError(null);
    setTxStep("syncing");

    const mintLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === addresses.nft.toLowerCase() &&
        log.topics[0]?.toLowerCase() === CARD_MINTED_EVENT_TOPIC.toLowerCase()
    );
    const tokenIdTopic = mintLog?.topics[1];

    if (!tokenIdTopic) {
      setSyncError("The mint was confirmed, but its CardMinted event could not be found.");
      setTxStep("sync_failed");
      return;
    }

    try {
      const tokenId = BigInt(tokenIdTopic).toString();
      await syncBeastMutation.mutateAsync({
        tokenId,
        owner: mintContext.owner,
        tokenUri: mintContext.tokenUri,
        name: mintContext.name,
        description: mintContext.description,
        image: mintContext.imageUri,
        element: mintContext.element,
        rarity: mintContext.rarity,
        attack: mintContext.attack,
        defense: mintContext.defense,
        speed: mintContext.speed,
        txHash,
      });
      setMintedTokenId(tokenId);
      setTxStep("confirmed");
    } catch (error) {
      console.error("Failed to synchronize confirmed mint:", error);
      setSyncError("Your NFT was minted, but we could not save it to the collection. Please retry the sync.");
      setTxStep("sync_failed");
    }
  };

  useEffect(() => {
    if (isSuccess && receipt && mintContext) {
      void syncConfirmedMint();
    }
  // syncConfirmedMint is intentionally invoked only when Wagmi supplies a new receipt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, receipt]);

  const elementInfo = ELEMENTS[selectedElement] || ELEMENTS.Fire;

  // Derive active artwork for the live preview card
  const activeArtworkUrl = useMemo(() => {
    if (customArtworkUrl) return customArtworkUrl;
    const samplePlates = elementInfo.sampleImages || [];
    return samplePlates[selectedPlateIndex] || samplePlates[0] || BEAST_ARTWORK_MAP[selectedBeast] || "/beasts/wolf.svg";
  }, [customArtworkUrl, elementInfo, selectedPlateIndex, selectedBeast]);

  // Handle Beast selection
  const handleSelectBeast = (beastName: string) => {
    setSelectedBeast(beastName);

    // Don't change artwork/plate state while custom artwork is active.
    if (customArtworkUrl) {
      return;
    }
    const beastArtwork = BEAST_ARTWORK_MAP[beastName];
    if (beastArtwork) {
      const plateIdx = elementInfo.sampleImages.indexOf(beastArtwork);

      if (plateIdx >= 0) {
        setSelectedPlateIndex(plateIdx);
      }
    }
  };

  // Handle Element selection
  const handleSelectElement = (elem: BeastElement) => {
    setSelectedElement(elem);
    const targetElementInfo = ELEMENTS[elem];
    if (targetElementInfo?.defaultCreature) {
      setSelectedBeast(targetElementInfo.defaultCreature);
    }
    // Don't change the selected plate while custom artwork is active.
    if (!customArtworkUrl) {
      setSelectedPlateIndex(0);
    }
  };

  // Handle Plate Selection
  const handleSelectPlate = (idx: number) => {
    setSelectedPlateIndex(idx);
    if (customArtworkUrl && customArtworkUrl.startsWith("blob:")) {
      URL.revokeObjectURL(customArtworkUrl);
    }
    setCustomArtworkUrl(null);
    setCustomFile(null);
  };

  // Handle Custom File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (customArtworkUrl && customArtworkUrl.startsWith("blob:")) {
        URL.revokeObjectURL(customArtworkUrl);
      }
      setCustomFile(file);
      setCustomArtworkUrl(URL.createObjectURL(file));
    }
  };

  // Submit flow: Client validation -> /api/upload -> mint()
  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      alert("Please connect your wallet first to summon a Beast.");
      return;
    }

    if (!addresses?.nft) {
      alert("NFT contract address is not configured for this network.");
      return;
    }

    try {
      // --------------------------------------------------
      // STEP 1: Upload image + metadata to IPFS
      // --------------------------------------------------

      setIsUploadingToIpfs(true);

      const formData = new FormData();

      if (customFile) {
        // Custom artwork
        formData.append("file", customFile);
      } else {
        // Built-in artwork
        //
        // IMPORTANT:
        // The upload route validates this against the built-in artwork manifest.
        const builtinArtworkId = Object.entries(BEAST_ARTWORK_MAP).find(
          ([, path]) => path === activeArtworkUrl
        )?.[0];

        if (!builtinArtworkId) {
          setIsUploadingToIpfs(false);

          alert(
            "Couldn't identify the selected built-in artwork. Please select another plate or upload a custom image."
          );

          return;
        }

        formData.append("builtinArtworkId", builtinArtworkId);
      }

      formData.append("name", selectedBeast);
      formData.append("description", description);
      formData.append("element", selectedElement);
      formData.append("rarity", selectedRarity);
      formData.append("attack", String(attack));
      formData.append("defense", String(defense));
      formData.append("speed", String(speed));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await res.json();

      setIsUploadingToIpfs(false);

      if (!res.ok || !uploadResult.success) {
        alert(
          uploadResult.error ||
          "Failed to upload artwork and metadata to IPFS."
        );

        return;
      }

      const tokenUri: string = uploadResult.tokenUri;

      if (!tokenUri || !tokenUri.startsWith("ipfs://")) {
        alert("Invalid IPFS metadata URI returned by the server.");
        return;
      }

      console.log("IPFS upload successful:");
      console.log("Metadata CID:", uploadResult.metadataCid);
      console.log("Token URI:", tokenUri);
      console.log("Image URI:", uploadResult.imageUri);

      // --------------------------------------------------
      // STEP 2: Mint NFT on-chain
      // --------------------------------------------------

      setMintContext({
        owner: address,
        tokenUri,
        imageUri: uploadResult.imageUri,
        name: selectedBeast,
        description,
        element: selectedElement,
        rarity: selectedRarity,
        attack,
        defense,
        speed,
      });

      writeContract(
        {
          address: addresses.nft,
          abi: NFT_ABI,
          functionName: "mint",
          args: [address, tokenUri],
        }
      );
    } catch (err: any) {
      console.error("Mint preparation error:", err);

      setIsUploadingToIpfs(false);

      alert(
        `Error preparing mint: ${err?.message || "Unknown error"
        }`
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ivory-50 tracking-tight">
            SUMMON A BEAST
          </h1>
          <p className="text-sm text-zinc-400 mt-1 font-sans">
            Configure elemental identity and attributes. The live preview updates instantly.
          </p>
        </div>
        <div className="text-xs font-mono text-zinc-400">
          Free Mint + Gas • Base Sepolia
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live Reactive Preview Card with Priority Preload */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center lg:sticky lg:top-20 space-y-3">
          <div className="w-full text-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Live Preview
            </span>
          </div>

          <PhysicalBeastCard
            name={selectedBeast}
            element={selectedElement}
            rarity={selectedRarity}
            imageUrl={activeArtworkUrl}
            attack={attack}
            defense={defense}
            speed={speed}
            tokenId="NEW"
            priority={true}
            interactive={true}
          />
        </div>

        {/* Right Column: 5-Stage Creation Sequence */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleMint}
            className="p-6 rounded bg-[#0d0d10] border border-zinc-800 space-y-7 card-metallic-bevel"
          >
            {/* 01 ELEMENT */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-ivory-100 font-mono tracking-wider">01 ELEMENT</span>
                <span className="text-xs font-mono font-bold" style={{ color: elementInfo.color }}>
                  {selectedElement.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono">
                {Object.values(ELEMENTS).map((elem) => (
                  <button
                    key={elem.name}
                    type="button"
                    onClick={() => handleSelectElement(elem.name)}
                    className={`py-2.5 px-2 rounded border text-center transition-all ${selectedElement === elem.name
                      ? "bg-[#18181b] border-zinc-400 text-ivory-50 font-bold shadow-inner"
                      : "bg-[#080808] border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                  >
                    <span className="text-xs block font-bold" style={{ color: elem.color }}>
                      {elem.name.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 02 RARITY */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-ivory-100 font-mono tracking-wider">02 RARITY</span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: RARITIES[selectedRarity]?.color }}
                >
                  {selectedRarity.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                {(Object.keys(RARITIES) as BeastRarity[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRarity(r)}
                    className={`py-2 px-3 rounded border text-xs transition-all text-center ${selectedRarity === r
                      ? "bg-[#18181b] border-zinc-400 text-ivory-50 font-bold shadow-inner"
                      : "bg-[#080808] border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* 03 BEAST */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-ivory-100 font-mono tracking-wider">03 BEAST</span>
                <span className="text-xs text-ivory-100 font-mono font-bold">{selectedBeast}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
                {CREATURE_NAMES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleSelectBeast(c)}
                    className={`py-2 px-2 rounded border text-xs transition-all text-center ${selectedBeast === c
                      ? "bg-[#18181b] border-zinc-400 text-ivory-50 font-bold shadow-inner"
                      : "bg-[#080808] border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 04 ARTWORK / PLATE */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-ivory-100 font-mono tracking-wider">04 ARTWORK & PLATE</span>
                <span className="text-xs text-zinc-400 font-mono">
                  {customArtworkUrl ? "CUSTOM UPLOAD" : `PLATE ${selectedPlateIndex + 1}`}
                </span>
              </div>

              {/* Sample Art Plate Selector */}
              <div className="grid grid-cols-2 gap-3">
                {elementInfo.sampleImages.map((img, idx) => {
                  const isSelected = selectedPlateIndex === idx && !customArtworkUrl;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectPlate(idx)}
                      className={`relative aspect-video rounded overflow-hidden cursor-pointer border-2 transition-all ${isSelected
                        ? "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)] opacity-100 scale-[1.02]"
                        : "border-zinc-800 opacity-60 hover:opacity-100"
                        }`}
                    >
                      <Image
                        src={img}
                        alt={`Plate ${idx + 1}`}
                        fill
                        sizes="240px"
                        unoptimized={img.endsWith(".svg")}
                        className="object-cover"
                      />
                      <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${isSelected ? "bg-amber-400 text-obsidian-950" : "bg-[#080808]/90 text-zinc-300"
                          }`}>
                          PLATE {idx + 1}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Upload */}
              <div>
                <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded p-3 cursor-pointer bg-[#080808] transition-colors ${customArtworkUrl ? "border-amber-400/80 bg-[#121215]" : "border-zinc-800 hover:border-zinc-700"
                  }`}>
                  <Upload className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-xs text-zinc-300 font-mono">
                    {customArtworkUrl ? "Replace Custom Artwork" : "Upload Custom Artwork (PNG, SVG, JPG)"}
                  </span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* 05 STATS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-ivory-100 font-mono tracking-wider">05 STATS</span>
                <span className="text-xs text-zinc-400 font-mono">{attack} ATK / {defense} DEF / {speed} SPD</span>
              </div>

              <div className="space-y-3 bg-[#080808] p-4 rounded border border-zinc-800">
                {/* Attack */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-red-400 font-bold">Attack (ATK)</span>
                    <span className="text-ivory-100 font-bold">{attack}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="99"
                    value={attack}
                    onChange={(e) => setAttack(Number(e.target.value))}
                    className="w-full accent-red-500 h-1 bg-[#18181b] rounded cursor-pointer"
                  />
                </div>

                {/* Defense */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-blue-400 font-bold">Defense (DEF)</span>
                    <span className="text-ivory-100 font-bold">{defense}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="99"
                    value={defense}
                    onChange={(e) => setDefense(Number(e.target.value))}
                    className="w-full accent-blue-500 h-1 bg-[#18181b] rounded cursor-pointer"
                  />
                </div>

                {/* Speed */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-yellow-400 font-bold">Speed (SPD)</span>
                    <span className="text-ivory-100 font-bold">{speed}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="99"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full accent-yellow-500 h-1 bg-[#18181b] rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Final Action Button */}
            <button
              type="submit"
              disabled={isUploadingToIpfs || isPrompting || isConfirming}
              className="w-full py-3.5 bg-ivory-100 hover:bg-white text-obsidian-950 disabled:opacity-50 font-bold rounded text-xs tracking-wider uppercase font-mono transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isUploadingToIpfs ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Pinning Metadata to IPFS...</span>
                </>
              ) : isPrompting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Confirm in Wallet...</span>
                </>
              ) : isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Minting on Base Sepolia...</span>
                </>
              ) : (
                <>
                  <span>SUMMON BEAST</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txStep !== "idle"}
        onClose={() => {
          setTxStep("idle");
          resetWrite();
          setMintContext(null);
          setSyncError(null);
          if (txStep === "confirmed") {
            router.push("/my-collection");
          }
        }}
        step={txStep}
        title="Summoning Elemental Beast"
        txHash={txHash}
        errorMessage={syncError || (writeError ? decodeContractError(writeError) : undefined)}
        successMessage={`Your ${selectedBeast} has been minted and added to your collection${mintedTokenId ? ` as #${mintedTokenId}` : ""}.`}
        onRetry={txStep === "sync_failed" ? () => void syncConfirmedMint() : undefined}
      />
    </div>
  );
}
