export const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

/**
 * Resolves an ipfs:// URI or raw CID to a gateway URL with fallback capabilities.
 * Passes through local paths (/beasts/*.svg), data URIs, blob URIs, and HTTP URLs unchanged.
 */
export function resolveIpfsUrl(uri: string | undefined, gatewayIndex = 0): string {
  if (!uri || uri.trim() === "") return "/placeholder-card.png";

  // Local asset paths — pass through unchanged
  if (uri.startsWith("/")) return uri;

  // HTTP(S) URLs — already resolved
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;

  // Data URIs (base64 images) and blob URLs — pass through
  if (uri.startsWith("data:") || uri.startsWith("blob:")) return uri;

  // IPFS protocol URIs
  if (uri.startsWith("ipfs://")) {
    const path = uri.replace("ipfs://", "");
    const gateway = IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length];
    return `${gateway}${path}`;
  }

  // Raw CID (starts with Qm... or bafy...) — resolve via gateway
  if (uri.startsWith("Qm") || uri.startsWith("bafy")) {
    const gateway = IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length];
    return `${gateway}${uri}`;
  }

  // Fallback: treat as relative path
  return uri;
}

export interface CardMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/**
 * Fetches and parses IPFS metadata with gateway fallback.
 */
export async function fetchMetadataFromIpfs(tokenUri: string): Promise<CardMetadata | null> {
  if (!tokenUri) return null;
  if (tokenUri.startsWith("data:application/json;base64,")) {
    try {
      const json = atob(tokenUri.replace("data:application/json;base64,", ""));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    const url = resolveIpfsUrl(tokenUri, i);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // try next gateway
    }
  }
  return null;
}
