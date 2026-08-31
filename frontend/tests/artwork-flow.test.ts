import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mergeIndexerBeast, type BeastRecord } from "../server/db";
import { BEAST_ARTWORK_MAP } from "../lib/elements";
import { BEAST_IPFS_CIDS } from "../lib/ipfs-cids";
import { IPFS_GATEWAYS, resolveIpfsUrl } from "../lib/ipfs";

const beast = (overrides: Partial<BeastRecord> = {}): BeastRecord => ({
  tokenId: "6",
  owner: "0xowner",
  tokenUri: "ipfs://metadata-cid",
  name: "TIGER",
  description: "Stored metadata",
  image: "ipfs://tiger-image-cid",
  element: "Lightning",
  rarity: "Rare",
  attack: 80,
  defense: 70,
  speed: 60,
  traits: [{ trait_type: "Element", value: "Lightning" }],
  mintedAtBlock: 1,
  mintedTxHash: "0xtx",
  updatedAt: 1,
  ...overrides,
});

describe("minted NFT artwork integrity", () => {
  it.each(["WOLF", "TIGER", "DRAGON"])("has a pinned built-in artwork for %s", (id) => {
    expect(BEAST_ARTWORK_MAP[id]).toMatch(/^\/beasts\/.+\.svg$/);
    expect(BEAST_IPFS_CIDS[id]).toMatch(/^baf/);
  });

  it("resolves a custom IPFS image without consulting a beast name", () => {
    expect(resolveIpfsUrl("ipfs://custom-image-cid")).toContain("custom-image-cid");
  });

  it("prefers Pinata for pinned artwork before trying mirror gateways", () => {
    expect(IPFS_GATEWAYS[0]).toBe("https://gateway.pinata.cloud/ipfs/");
  });

  it("uses a neutral placeholder, never Wolf, for a missing image", () => {
    expect(resolveIpfsUrl("")).toBe("/placeholder-beast.svg");
  });

  it("does not let an empty indexer image erase an already synced image", () => {
    const merged = mergeIndexerBeast(beast(), beast({ image: "", tokenUri: "", description: "", traits: [] }));
    expect(merged.image).toBe("ipfs://tiger-image-cid");
    expect(merged.tokenUri).toBe("ipfs://metadata-cid");
    expect(merged.description).toBe("Stored metadata");
    expect(merged.traits).toHaveLength(1);
  });

  it("accepts a valid indexer image when one is available", () => {
    const merged = mergeIndexerBeast(beast({ image: "ipfs://old" }), beast({ image: "ipfs://fresh" }));
    expect(merged.image).toBe("ipfs://fresh");
  });

  it("keeps post-mint card rendering independent of BEAST_ARTWORK_MAP and Wolf", () => {
    const cardSource = readFileSync("components/BeastCard.tsx", "utf8");
    expect(cardSource).not.toContain("BEAST_ARTWORK_MAP");
    expect(cardSource).not.toContain('"/beasts/wolf.svg"');
    expect(cardSource).toContain("useIpfsImage(beast.image)");
  });

  it("posts the explicit selected artwork ID to the upload route", () => {
    const mintSource = readFileSync("app/mint/page.tsx", "utf8");
    const uploadSource = readFileSync("app/api/upload/route.ts", "utf8");
    expect(mintSource).toContain('formData.append("builtinArtworkId", selectedArtworkId)');
    expect(uploadSource).toContain("builtinArtworkId:");
  });
});
