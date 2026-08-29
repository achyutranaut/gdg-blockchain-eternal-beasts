import { Hono } from "hono";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { eq, desc, and } from "ponder";

const app = new Hono();

// Helper to safely serialize BigInts to strings for JSON responses
function serializeBigInts(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === "object") {
    const res: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      res[key] = serializeBigInts(obj[key]);
    }
    return res;
  }
  return obj;
}

// 1. Health Check
app.get("/hello", (c) => {
  return c.json({
    message: "Elemental Beasts API is working",
    network: "Base Sepolia (84532)",
    status: "healthy",
  });
});

// 2. All Beasts with optional filters (element, rarity, owner)
app.get("/beasts", async (c) => {
  const element = c.req.query("element");
  const rarity = c.req.query("rarity");
  const owner = c.req.query("owner");

  let query = db.select().from(schema.beasts);

  const conditions = [];
  if (element && element !== "All") {
    conditions.push(eq(schema.beasts.element, element));
  }
  if (rarity && rarity !== "All") {
    conditions.push(eq(schema.beasts.rarity, rarity));
  }
  if (owner) {
    conditions.push(eq(schema.beasts.owner, owner.toLowerCase() as `0x${string}`));
  }

  const results = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(schema.beasts.tokenId))
    : await query.orderBy(desc(schema.beasts.tokenId));

  return c.json(serializeBigInts(results));
});

// 3. Single Beast by tokenId (including active listing and provenance)
app.get("/beasts/:tokenId", async (c) => {
  const tokenIdStr = c.req.param("tokenId");
  const tokenId = BigInt(tokenIdStr);

  const [beast] = await db
    .select()
    .from(schema.beasts)
    .where(eq(schema.beasts.tokenId, tokenId))
    .limit(1);

  if (!beast) {
    return c.json({ error: "Beast not found" }, 404);
  }

  const [activeListing] = await db
    .select()
    .from(schema.listings)
    .where(and(eq(schema.listings.tokenId, tokenId), eq(schema.listings.active, true)))
    .limit(1);

  const beastActivity = await db
    .select()
    .from(schema.activity)
    .where(eq(schema.activity.tokenId, tokenId))
    .orderBy(desc(schema.activity.blockNumber));

  return c.json(
    serializeBigInts({
      beast,
      listing: activeListing || null,
      history: beastActivity,
    })
  );
});

// 4. Marketplace Active Listings (joined with Beast metadata)
app.get("/listings", async (c) => {
  const activeListings = await db
    .select()
    .from(schema.listings)
    .where(eq(schema.listings.active, true))
    .orderBy(desc(schema.listings.listedAtBlock));

  const allBeasts = await db.select().from(schema.beasts);
  const beastsMap = new Map(allBeasts.map((b) => [b.tokenId.toString(), b]));

  const listingsWithBeasts = activeListings.map((listing) => ({
    listing,
    beast: beastsMap.get(listing.tokenId.toString()) || null,
  }));

  return c.json(serializeBigInts(listingsWithBeasts));
});

// 5. Activity Feed (with limit)
app.get("/activity", async (c) => {
  const limitParam = Number(c.req.query("limit") || 30);
  const limit = Math.min(Math.max(limitParam, 1), 100);

  const items = await db
    .select()
    .from(schema.activity)
    .orderBy(desc(schema.activity.blockNumber))
    .limit(limit);

  const allBeasts = await db.select().from(schema.beasts);
  const beastsMap = new Map(allBeasts.map((b) => [b.tokenId.toString(), b]));

  const activityWithBeasts = items.map((item) => ({
    ...item,
    beast: beastsMap.get(item.tokenId.toString()) || null,
  }));

  return c.json(serializeBigInts(activityWithBeasts));
});

// 6. Analytics & Market Telemetry
app.get("/analytics", async (c) => {
  const allBeasts = await db.select().from(schema.beasts);
  const activeListings = await db
    .select()
    .from(schema.listings)
    .where(eq(schema.listings.active, true));
  const allSales = await db.select().from(schema.sales);

  // Calculate floor price
  let floorPrice = "0";
  if (activeListings.length > 0 && activeListings[0]) {
    let min = activeListings[0].price;
    for (const l of activeListings) {
      if (l.price < min) min = l.price;
    }
    floorPrice = min.toString();
  }

  // Total volume
  let totalVolumeWei = 0n;
  for (const s of allSales) {
    totalVolumeWei += s.price;
  }

  // Unique holders
  const uniqueOwners = new Set(allBeasts.map((b) => b.owner.toLowerCase()));

  // Element breakdown
  const elementCounts: Record<string, number> = {};
  for (const b of allBeasts) {
    const el = b.element || "Unknown";
    elementCounts[el] = (elementCounts[el] || 0) + 1;
  }

  // Rarity breakdown
  const rarityCounts: Record<string, number> = {};
  for (const b of allBeasts) {
    const r = b.rarity || "Common";
    rarityCounts[r] = (rarityCounts[r] || 0) + 1;
  }

  return c.json(
    serializeBigInts({
      totalMinted: allBeasts.length,
      activeListingsCount: activeListings.length,
      totalSalesCount: allSales.length,
      totalVolumeWei: totalVolumeWei.toString(),
      floorPriceWei: floorPrice,
      uniqueHolders: uniqueOwners.size,
      elementDistribution: Object.entries(elementCounts).map(([name, count]) => ({ name, count })),
      rarityDistribution: Object.entries(rarityCounts).map(([name, count]) => ({ name, count })),
    })
  );
});

export default app;