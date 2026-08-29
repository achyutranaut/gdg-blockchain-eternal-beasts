import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";

export const activityRouter = router({
  feed: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(30),
        tokenId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit || 30;
      const allActivity = await db.getActivityAsync(input?.tokenId);
      const feed = allActivity.slice(0, limit);

      const allBeasts = await db.getAllBeastsAsync();
      const beastsMap = new Map(allBeasts.map((b) => [b.tokenId, b]));

      return feed.map((item) => ({
        ...item,
        beast: beastsMap.get(item.tokenId) || null,
      }));
    }),
});
