export interface BeastRecord {
  tokenId: string;
  owner: string;
  tokenUri: string;
  name: string;
  description: string;
  image: string;
  element: string;
  rarity: string;
  attack: number;
  defense: number;
  speed: number;
  traits: Array<{ trait_type: string; value: string | number }>;
  mintedAtBlock: number;
  mintedTxHash: string;
  updatedAt: number;
}

export interface ListingRecord {
  id: string;
  tokenId: string;
  seller: string;
  price: string; // in wei
  active: boolean;
  listedAtBlock: number;
  listedTxHash: string;
}

export interface ActivityRecord {
  id: string;
  type: "MINT" | "LIST" | "CANCEL" | "SALE" | "TRANSFER";
  tokenId: string;
  from?: string;
  to?: string;
  price?: string;
  blockNumber: number;
  txHash: string;
  timestamp: number;
}

export interface SaleRecord {
  id: string;
  tokenId: string;
  buyer: string;
  seller: string;
  price: string;
  feeAmount: string;
  royaltyAmount: string;
  blockNumber: number;
  txHash: string;
  timestamp: number;
}

const INDEXER_URLS = [
  process.env.NEXT_PUBLIC_INDEXER_URL,
  "http://127.0.0.1:42069",
  "http://127.0.0.1:42070",
  "http://localhost:42069",
  "http://localhost:42070",
].filter(Boolean) as string[];

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

/**
 * The browser writes complete metadata immediately after a confirmed mint. The
 * indexer may briefly be unable to fetch newly pinned IPFS metadata, so an
 * incomplete indexer response must not erase that known-good metadata.
 */
export function mergeIndexerBeast(
  existing: BeastRecord | undefined,
  incoming: BeastRecord
): BeastRecord {
  if (!existing) return incoming;

  return {
    ...existing,
    ...incoming,
    tokenUri: hasText(incoming.tokenUri) ? incoming.tokenUri : existing.tokenUri,
    name: hasText(incoming.name) ? incoming.name : existing.name,
    description: hasText(incoming.description) ? incoming.description : existing.description,
    image: hasText(incoming.image) ? incoming.image : existing.image,
    traits: incoming.traits.length > 0 ? incoming.traits : existing.traits,
  };
}

// Read model database syncing with Ponder indexer API and providing local fallback
class ReadModelDatabase {
  private beasts: Map<string, BeastRecord> = new Map();
  private listings: Map<string, ListingRecord> = new Map();
  private sales: SaleRecord[] = [];
  private activity: ActivityRecord[] = [];
  private lastFetchTime = 0;

  constructor() {
    this.syncFromIndexer();
  }

  public async syncFromIndexer() {
    for (const baseUrl of INDEXER_URLS) {
      try {
        const res = await fetch(`${baseUrl}/beasts`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const beastsData: any[] = await res.json();
          for (const b of beastsData) {
            const tokenId = String(b.tokenId);
            const incoming: BeastRecord = {
              tokenId,
              owner: b.owner,
              tokenUri: b.tokenUri || "",
              name: b.name || `Beast #${b.tokenId}`,
              description: b.description || "",
              image: b.image || "",
              element: b.element || "Fire",
              rarity: b.rarity || "Common",
              attack: Number(b.attack) || 50,
              defense: Number(b.defense) || 50,
              speed: Number(b.speed) || 50,
              traits: b.traits || [],
              mintedAtBlock: Number(b.mintedAtBlock) || 0,
              mintedTxHash: b.mintedTxHash || "",
              updatedAt: Number(b.updatedAt) || Date.now(),
            };
            this.beasts.set(tokenId, mergeIndexerBeast(this.beasts.get(tokenId), incoming));
          }

          // Fetch listings
          try {
            const listRes = await fetch(`${baseUrl}/listings`, { signal: AbortSignal.timeout(2000) });
            if (listRes.ok) {
              const listData: any[] = await listRes.json();
              this.listings.clear();
              for (const item of listData) {
                const l = item.listing || item;
                if (l && l.tokenId) {
                  this.listings.set(String(l.tokenId), {
                    id: String(l.tokenId),
                    tokenId: String(l.tokenId),
                    seller: l.seller,
                    price: String(l.price),
                    active: Boolean(l.active),
                    listedAtBlock: Number(l.listedAtBlock) || 0,
                    listedTxHash: l.listedTxHash || "",
                  });
                }
              }
            }
          } catch {}

          // Fetch activity
          try {
            const actRes = await fetch(`${baseUrl}/activity`, { signal: AbortSignal.timeout(2000) });
            if (actRes.ok) {
              const actData: any[] = await actRes.json();
              this.activity = actData.map((a) => ({
                id: a.id,
                type: a.type,
                tokenId: String(a.tokenId),
                from: a.from,
                to: a.to,
                price: a.price ? String(a.price) : undefined,
                blockNumber: Number(a.blockNumber) || 0,
                txHash: a.txHash || "",
                timestamp: Number(a.timestamp) || Date.now(),
              }));
            }
          } catch {}

          this.lastFetchTime = Date.now();
          return;
        }
      } catch {
        // Try next indexer URL
      }
    }
  }

  // Beast CRUD
  async getBeastAsync(tokenId: string): Promise<BeastRecord | undefined> {
    if (Date.now() - this.lastFetchTime > 3000) {
      await this.syncFromIndexer();
    }
    return this.beasts.get(tokenId);
  }

  getBeast(tokenId: string): BeastRecord | undefined {
    // Trigger background sync if stale
    if (Date.now() - this.lastFetchTime > 3000) {
      this.syncFromIndexer().catch(() => {});
    }
    return this.beasts.get(tokenId);
  }

  async getAllBeastsAsync(): Promise<BeastRecord[]> {
    if (Date.now() - this.lastFetchTime > 3000) {
      await this.syncFromIndexer();
    }
    return Array.from(this.beasts.values()).sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
  }

  getAllBeasts(): BeastRecord[] {
    if (Date.now() - this.lastFetchTime > 3000) {
      this.syncFromIndexer().catch(() => {});
    }
    return Array.from(this.beasts.values()).sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
  }

  async getBeastsByOwnerAsync(owner: string): Promise<BeastRecord[]> {
    if (Date.now() - this.lastFetchTime > 3000) {
      await this.syncFromIndexer();
    }
    const clean = owner.toLowerCase();
    return Array.from(this.beasts.values())
      .filter((b) => b.owner.toLowerCase() === clean)
      .sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
  }

  getBeastsByOwner(owner: string): BeastRecord[] {
    if (Date.now() - this.lastFetchTime > 3000) {
      this.syncFromIndexer().catch(() => {});
    }
    const clean = owner.toLowerCase();
    return Array.from(this.beasts.values())
      .filter((b) => b.owner.toLowerCase() === clean)
      .sort((a, b) => Number(b.tokenId) - Number(a.tokenId));
  }

  upsertBeast(beast: BeastRecord) {
    this.beasts.set(beast.tokenId, beast);
  }

  // Listing CRUD
  async getListingAsync(tokenId: string): Promise<ListingRecord | undefined> {
    if (Date.now() - this.lastFetchTime > 3000) {
      await this.syncFromIndexer();
    }
    return this.listings.get(tokenId);
  }

  getListing(tokenId: string): ListingRecord | undefined {
    if (Date.now() - this.lastFetchTime > 3000) {
      this.syncFromIndexer().catch(() => {});
    }
    return this.listings.get(tokenId);
  }

  async getActiveListingsAsync(): Promise<ListingRecord[]> {
    if (Date.now() - this.lastFetchTime > 3000) {
      await this.syncFromIndexer();
    }
    return Array.from(this.listings.values()).filter((l) => l.active);
  }

  getActiveListings(): ListingRecord[] {
    if (Date.now() - this.lastFetchTime > 3000) {
      this.syncFromIndexer().catch(() => {});
    }
    return Array.from(this.listings.values()).filter((l) => l.active);
  }

  upsertListing(listing: ListingRecord) {
    this.listings.set(listing.tokenId, listing);
  }

  // Sales & Activity
  async getSalesAsync(): Promise<SaleRecord[]> {
    if (Date.now() - this.lastFetchTime > 3000) {
      await this.syncFromIndexer();
    }
    return this.sales;
  }

  getSales(): SaleRecord[] {
    if (Date.now() - this.lastFetchTime > 3000) {
      this.syncFromIndexer().catch(() => {});
    }
    return this.sales;
  }

  addSale(sale: SaleRecord) {
    this.sales.unshift(sale);
  }

  async getActivityAsync(tokenId?: string): Promise<ActivityRecord[]> {
    if (Date.now() - this.lastFetchTime > 3000) {
      await this.syncFromIndexer();
    }
    if (tokenId) {
      return this.activity.filter((a) => a.tokenId === tokenId).sort((a, b) => b.timestamp - a.timestamp);
    }
    return [...this.activity].sort((a, b) => b.timestamp - a.timestamp);
  }

  getActivity(tokenId?: string): ActivityRecord[] {
    if (Date.now() - this.lastFetchTime > 3000) {
      this.syncFromIndexer().catch(() => {});
    }
    if (tokenId) {
      return this.activity.filter((a) => a.tokenId === tokenId).sort((a, b) => b.timestamp - a.timestamp);
    }
    return [...this.activity].sort((a, b) => b.timestamp - a.timestamp);
  }

  addActivity(item: ActivityRecord) {
    this.activity.unshift(item);
  }
}

// Global singleton
export const db = new ReadModelDatabase();
