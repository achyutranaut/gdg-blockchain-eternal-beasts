import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";

export const beastsRouter = router({
  byId: publicProcedure
    .input(z.object({ tokenId: z.string() }))
    .query(async ({ input }) => {
      const beast = await db.getBeastAsync(input.tokenId);
      const listing = await db.getListingAsync(input.tokenId);
      const history = await db.getActivityAsync(input.tokenId);
      return {
        beast: beast || null,
        listing: listing?.active ? listing : null,
        history,
      };
    }),

  all: publicProcedure
    .input(
      z.object({
        element: z.string().optional(),
        rarity: z.string().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      let items = await db.getAllBeastsAsync();
      if (input?.element && input.element !== "All") {
        items = items.filter((b) => b.element.toLowerCase() === input.element!.toLowerCase());
      }
      if (input?.rarity && input.rarity !== "All") {
        items = items.filter((b) => b.rarity.toLowerCase() === input.rarity!.toLowerCase());
      }
      if (input?.search) {
        const query = input.search.toLowerCase();
        items = items.filter(
          (b) =>
            b.name.toLowerCase().includes(query) ||
            b.tokenId.includes(query) ||
            b.description.toLowerCase().includes(query)
        );
      }
      return items;
    }),

  byOwner: publicProcedure
    .input(z.object({ owner: z.string() }))
    .query(async ({ input }) => {
      if (!input.owner) return [];
      return await db.getBeastsByOwnerAsync(input.owner);
    }),

  syncBeast: publicProcedure
    .input(
      z.object({
        tokenId: z.string(),
        owner: z.string(),
        tokenUri: z.string(),
        name: z.string(),
        description: z.string(),
        image: z.string(),
        element: z.string(),
        rarity: z.string(),
        attack: z.number().optional(),
        defense: z.number().optional(),
        speed: z.number().optional(),
        traits: z.array(z.object({ trait_type: z.string(), value: z.union([z.string(), z.number()]) })).optional(),
        txHash: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const now = Date.now();
      const beast = {
        tokenId: input.tokenId,
        owner: input.owner,
        tokenUri: input.tokenUri,
        name: input.name,
        description: input.description,
        image: input.image,
        element: input.element,
        rarity: input.rarity,
        attack: input.attack || 50,
        defense: input.defense || 50,
        speed: input.speed || 50,
        traits: input.traits || [],
        mintedAtBlock: 1,
        mintedTxHash: input.txHash || "0x0",
        updatedAt: now,
      };
      db.upsertBeast(beast);
      db.addActivity({
        id: `mint_${input.tokenId}_${now}`,
        type: "MINT",
        tokenId: input.tokenId,
        to: input.owner,
        blockNumber: 1,
        txHash: input.txHash || "0x0",
        timestamp: now,
      });
      return { success: true, beast };
    }),
});
