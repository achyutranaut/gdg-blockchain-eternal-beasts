import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";

export const walletsRouter = router({
  portfolio: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      if (!input.address) {
        return { ownedBeasts: [], activeListings: [], totalValue: "0" };
      }
      const ownedBeasts = await db.getBeastsByOwnerAsync(input.address);
      const activeListings = (await db.getActiveListingsAsync())
        .filter((l) => l.seller.toLowerCase() === input.address.toLowerCase());

      const allBeasts = await db.getAllBeastsAsync();
      const beastsMap = new Map(allBeasts.map((b) => [b.tokenId, b]));
      const listingsWithBeasts = activeListings.map((l) => ({
        listing: l,
        beast: beastsMap.get(l.tokenId) || null,
      }));

      return {
        ownedBeasts,
        activeListings: listingsWithBeasts,
      };
    }),
});
