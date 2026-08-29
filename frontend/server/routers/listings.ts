import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";

export const listingsRouter = router({
  search: publicProcedure
    .input(
      z.object({
        element: z.string().optional(),
        rarity: z.string().optional(),
        minPrice: z.string().optional(),
        maxPrice: z.string().optional(),
        sortBy: z.enum(["newest", "price_asc", "price_desc", "rarity"]).optional().default("newest"),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const activeListings = await db.getActiveListingsAsync();
      const allBeasts = await db.getAllBeastsAsync();
      const beastsMap = new Map(allBeasts.map((b) => [b.tokenId, b]));

      let items = activeListings
        .map((listing) => {
          const beast = beastsMap.get(listing.tokenId);
          return {
            listing,
            beast: beast || {
              tokenId: listing.tokenId,
              owner: listing.seller,
              tokenUri: "",
              name: `Beast #${listing.tokenId}`,
              description: "Elemental creature",
              image: "/placeholder-card.png",
              element: "Fire",
              rarity: "Common",
              attack: 50,
              defense: 50,
              speed: 50,
              traits: [],
              mintedAtBlock: 1,
              mintedTxHash: "",
              updatedAt: Date.now(),
            },
          };
        })
        .filter((item) => item.beast !== null);

      if (input?.element && input.element !== "All") {
        items = items.filter((i) => i.beast.element.toLowerCase() === input.element!.toLowerCase());
      }
      if (input?.rarity && input.rarity !== "All") {
        items = items.filter((i) => i.beast.rarity.toLowerCase() === input.rarity!.toLowerCase());
      }
      if (input?.search) {
        const q = input.search.toLowerCase();
        items = items.filter(
          (i) =>
            i.beast.name.toLowerCase().includes(q) ||
            i.beast.tokenId.includes(q) ||
            i.beast.description.toLowerCase().includes(q)
        );
      }
      if (input?.minPrice) {
        const min = BigInt(input.minPrice);
        items = items.filter((i) => BigInt(i.listing.price) >= min);
      }
      if (input?.maxPrice) {
        const max = BigInt(input.maxPrice);
        items = items.filter((i) => BigInt(i.listing.price) <= max);
      }

      // Sort
      const sortBy = input?.sortBy || "newest";
      if (sortBy === "price_asc") {
        items.sort((a, b) => (BigInt(a.listing.price) > BigInt(b.listing.price) ? 1 : -1));
      } else if (sortBy === "price_desc") {
        items.sort((a, b) => (BigInt(a.listing.price) < BigInt(b.listing.price) ? 1 : -1));
      } else if (sortBy === "rarity") {
        const order: Record<string, number> = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
        items.sort((a, b) => (order[b.beast.rarity] || 0) - (order[a.beast.rarity] || 0));
      } else {
        items.sort((a, b) => Number(b.listing.tokenId) - Number(a.listing.tokenId));
      }

      return items;
    }),

  byTokenId: publicProcedure
    .input(z.object({ tokenId: z.string() }))
    .query(async ({ input }) => {
      const listing = await db.getListingAsync(input.tokenId);
      return listing?.active ? listing : null;
    }),

  syncListing: publicProcedure
    .input(
      z.object({
        tokenId: z.string(),
        seller: z.string(),
        price: z.string(),
        active: z.boolean(),
        txHash: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const now = Date.now();
      const listing = {
        id: input.tokenId,
        tokenId: input.tokenId,
        seller: input.seller,
        price: input.price,
        active: input.active,
        listedAtBlock: 1,
        listedTxHash: input.txHash || "0x0",
      };
      db.upsertListing(listing);
      db.addActivity({
        id: `list_${input.tokenId}_${now}`,
        type: input.active ? "LIST" : "CANCEL",
        tokenId: input.tokenId,
        from: input.seller,
        price: input.price,
        blockNumber: 1,
        txHash: input.txHash || "0x0",
        timestamp: now,
      });
      return { success: true, listing };
    }),

  syncSale: publicProcedure
    .input(
      z.object({
        tokenId: z.string(),
        buyer: z.string(),
        seller: z.string(),
        price: z.string(),
        feeAmount: z.string().optional().default("0"),
        royaltyAmount: z.string().optional().default("0"),
        txHash: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      // Mark listing inactive
      const existing = await db.getListingAsync(input.tokenId);
      if (existing) {
        db.upsertListing({ ...existing, active: false });
      }

      // Update beast owner
      const beast = await db.getBeastAsync(input.tokenId);
      if (beast) {
        db.upsertBeast({ ...beast, owner: input.buyer, updatedAt: now });
      }

      // Record sale
      const sale = {
        id: `sale_${input.tokenId}_${now}`,
        tokenId: input.tokenId,
        buyer: input.buyer,
        seller: input.seller,
        price: input.price,
        feeAmount: input.feeAmount,
        royaltyAmount: input.royaltyAmount,
        blockNumber: 1,
        txHash: input.txHash || "0x0",
        timestamp: now,
      };
      db.addSale(sale);

      db.addActivity({
        id: `sale_${input.tokenId}_${now}`,
        type: "SALE",
        tokenId: input.tokenId,
        from: input.seller,
        to: input.buyer,
        price: input.price,
        blockNumber: 1,
        txHash: input.txHash || "0x0",
        timestamp: now,
      });

      return { success: true, sale };
    }),
});
