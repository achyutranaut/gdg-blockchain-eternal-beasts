import { ponder } from "ponder:registry";
import schema from "ponder:schema";

// Helper to fetch IPFS metadata and decode data URIs
async function fetchIpfsMetadata(uri: string) {
  if (!uri) return null;

  // Handle base64 encoded data URIs
  if (uri.startsWith("data:application/json;base64,")) {
    try {
      const base64 = uri.replace("data:application/json;base64,", "");
      const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to decode base64 data URI:", e);
      return null;
    }
  }

  // Handle standard HTTP / HTTPS metadata URLs
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    try {
      const res = await fetch(uri, { signal: AbortSignal.timeout(3500) });
      if (res.ok) return await res.json();
    } catch {
      // ignore
    }
  }

  const gateways = [
    "https://ipfs.io/ipfs/",
    "https://dweb.link/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/"
  ];

  let path = uri;
  if (uri.startsWith("ipfs://")) {
    path = uri.replace("ipfs://", "");
  }

  for (const gateway of gateways) {
    try {
      const res = await fetch(`${gateway}${path}`, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // try next gateway
    }
  }
  return null;
}

// 1. CardMinted Handler
ponder.on("ElementalBeastNFT:CardMinted", async ({ event, context }) => {
  const { tokenId, owner, tokenURI } = event.args;
  const blockNumber = BigInt(event.block.number);
  const txHash = event.transaction.hash;
  const timestamp = BigInt(event.block.timestamp);

  let metadata: any = null;
  try {
    metadata = await fetchIpfsMetadata(tokenURI);
  } catch (err) {
    console.error(`Failed to fetch metadata for token ${tokenId}:`, err);
  }

  const name = metadata?.name || `Elemental Beast #${tokenId.toString()}`;
  const description = metadata?.description || "A mysterious elemental creature born from primeval forces.";
  const image = metadata?.image || "";
  
  let element = "Fire";
  let rarity = "Common";
  let attack = 50;
  let defense = 50;
  let speed = 50;
  const traits = metadata?.attributes || [];

  if (Array.isArray(traits)) {
    for (const attr of traits) {
      if (attr.trait_type === "Element") element = String(attr.value);
      if (attr.trait_type === "Rarity") rarity = String(attr.value);
      if (attr.trait_type === "Attack") attack = Number(attr.value) || 50;
      if (attr.trait_type === "Defense") defense = Number(attr.value) || 50;
      if (attr.trait_type === "Speed") speed = Number(attr.value) || 50;
    }
  }

  await context.db.insert(schema.beasts).values({
    tokenId,
    owner,
    tokenUri: tokenURI,
    mintedAtBlock: blockNumber,
    mintedTxHash: txHash,
    name,
    description,
    image,
    element,
    rarity,
    attack,
    defense,
    speed,
    traits,
    updatedAt: timestamp,
  }).onConflictDoUpdate({
    owner,
    tokenUri: tokenURI,
    name,
    description,
    image,
    element,
    rarity,
    attack,
    defense,
    speed,
    traits,
    updatedAt: timestamp,
  });

  const logIndex = event.log.logIndex ?? 0;
  await context.db.insert(schema.activity).values({
    id: `${txHash}_${logIndex}`,
    type: "MINT",
    tokenId,
    from: "0x0000000000000000000000000000000000000000",
    to: owner,
    price: 0n,
    blockNumber,
    txHash,
    timestamp,
  }).onConflictDoNothing();
});

// 2. Transfer Handler (CRITICAL: Keeps derived ownership updated & resilient to mint order)
ponder.on("ElementalBeastNFT:Transfer", async ({ event, context }) => {
  const { from, to, tokenId } = event.args;
  const blockNumber = BigInt(event.block.number);
  const txHash = event.transaction.hash;
  const timestamp = BigInt(event.block.timestamp);
  const logIndex = event.log.logIndex ?? 0;

  // Record transfer history
  await context.db.insert(schema.transfers).values({
    id: `${txHash}_${logIndex}`,
    tokenId,
    from,
    to,
    blockNumber,
    txHash,
    timestamp,
  }).onConflictDoNothing();

  // If from == 0x0, this is a mint. The CardMinted event will insert the full metadata.
  // We use find() first to update owner safely only if the beast already exists, avoiding RecordNotFoundError.
  const existingBeast = await context.db.find(schema.beasts, { tokenId });
  if (existingBeast) {
    await context.db.update(schema.beasts, { tokenId }).set({
      owner: to,
      updatedAt: timestamp,
    });
  } else if (from !== "0x0000000000000000000000000000000000000000") {
    // If not a mint transfer but beast row doesn't exist yet, insert a placeholder record
    await context.db.insert(schema.beasts).values({
      tokenId,
      owner: to,
      tokenUri: "",
      mintedAtBlock: blockNumber,
      mintedTxHash: txHash,
      name: `Elemental Beast #${tokenId.toString()}`,
      description: "A mysterious elemental creature born from primeval forces.",
      image: "",
      element: "Fire",
      rarity: "Common",
      attack: 50,
      defense: 50,
      speed: 50,
      traits: [],
      updatedAt: timestamp,
    }).onConflictDoUpdate({
      owner: to,
      updatedAt: timestamp,
    });
  }

  // If transferred to another party while listed, close the listing if seller != to
  const existingListing = await context.db.find(schema.listings, { id: tokenId.toString() });
  if (existingListing && existingListing.active && existingListing.seller !== to && from !== "0x0000000000000000000000000000000000000000") {
    await context.db.update(schema.listings, { id: tokenId.toString() }).set({
      active: false,
    });

    await context.db.insert(schema.activity).values({
      id: `${txHash}_${logIndex}_transfer`,
      type: "TRANSFER",
      tokenId,
      from,
      to,
      price: 0n,
      blockNumber,
      txHash,
      timestamp,
    }).onConflictDoNothing();
  }
});

// 3. ItemListed Handler
ponder.on("Marketplace:ItemListed", async ({ event, context }) => {
  const { tokenId, seller, price } = event.args;
  const blockNumber = BigInt(event.block.number);
  const txHash = event.transaction.hash;
  const timestamp = BigInt(event.block.timestamp);
  const logIndex = event.log.logIndex ?? 0;

  await context.db.insert(schema.listings).values({
    id: tokenId.toString(),
    tokenId,
    seller,
    price,
    active: true,
    listedAtBlock: blockNumber,
    listedTxHash: txHash,
    cancelledAtBlock: null,
    soldAtBlock: null,
  }).onConflictDoUpdate({
    seller,
    price,
    active: true,
    listedAtBlock: blockNumber,
    listedTxHash: txHash,
    cancelledAtBlock: null,
    soldAtBlock: null,
  });

  await context.db.insert(schema.activity).values({
    id: `${txHash}_${logIndex}`,
    type: "LIST",
    tokenId,
    from: seller,
    to: undefined,
    price,
    blockNumber,
    txHash,
    timestamp,
  }).onConflictDoNothing();
});

// 4. ItemCancelled Handler
ponder.on("Marketplace:ItemCancelled", async ({ event, context }) => {
  const { tokenId, seller } = event.args;
  const blockNumber = BigInt(event.block.number);
  const txHash = event.transaction.hash;
  const timestamp = BigInt(event.block.timestamp);
  const logIndex = event.log.logIndex ?? 0;

  const existing = await context.db.find(schema.listings, { id: tokenId.toString() });
  if (existing) {
    await context.db.update(schema.listings, { id: tokenId.toString() }).set({
      active: false,
      cancelledAtBlock: blockNumber,
    });
  }

  await context.db.insert(schema.activity).values({
    id: `${txHash}_${logIndex}`,
    type: "CANCEL",
    tokenId,
    from: seller,
    to: undefined,
    price: 0n,
    blockNumber,
    txHash,
    timestamp,
  }).onConflictDoNothing();
});

// 5. ItemSold Handler
ponder.on("Marketplace:ItemSold", async ({ event, context }) => {
  const { tokenId, buyer, seller, price, feeAmount, royaltyAmount } = event.args;
  const blockNumber = BigInt(event.block.number);
  const txHash = event.transaction.hash;
  const timestamp = BigInt(event.block.timestamp);
  const logIndex = event.log.logIndex ?? 0;

  // Insert sales row
  await context.db.insert(schema.sales).values({
    id: `${txHash}_${logIndex}`,
    tokenId,
    buyer,
    seller,
    price,
    feeAmount,
    royaltyAmount,
    blockNumber,
    txHash,
    timestamp,
  }).onConflictDoNothing();

  // Mark listing inactive & sold
  const existingListing = await context.db.find(schema.listings, { id: tokenId.toString() });
  if (existingListing) {
    await context.db.update(schema.listings, { id: tokenId.toString() }).set({
      active: false,
      soldAtBlock: blockNumber,
    });
  }

  // Update beast owner if beast exists
  const existingBeast = await context.db.find(schema.beasts, { tokenId });
  if (existingBeast) {
    await context.db.update(schema.beasts, { tokenId }).set({
      owner: buyer,
      updatedAt: timestamp,
    });
  }

  // Insert activity
  await context.db.insert(schema.activity).values({
    id: `${txHash}_${logIndex}`,
    type: "SALE",
    tokenId,
    from: seller,
    to: buyer,
    price,
    blockNumber,
    txHash,
    timestamp,
  }).onConflictDoNothing();
});

// 6. ProceedsWithdrawn Handler
ponder.on("Marketplace:ProceedsWithdrawn", async ({ event, context }) => {
  const { recipient, amount } = event.args;
  const blockNumber = BigInt(event.block.number);
  const txHash = event.transaction.hash;
  const timestamp = BigInt(event.block.timestamp);
  const logIndex = event.log.logIndex ?? 0;

  await context.db.insert(schema.withdrawals).values({
    id: `${txHash}_${logIndex}`,
    recipient,
    amount,
    blockNumber,
    txHash,
    timestamp,
  }).onConflictDoNothing();
});
