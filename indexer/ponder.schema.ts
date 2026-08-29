import { onchainTable } from "ponder";

export const beasts = onchainTable("beasts", (t) => ({
  tokenId: t.bigint().primaryKey(),
  owner: t.hex().notNull(),
  tokenUri: t.text().notNull(),
  mintedAtBlock: t.bigint().notNull(),
  mintedTxHash: t.hex().notNull(),
  name: t.text(),
  description: t.text(),
  image: t.text(),
  element: t.text(),
  rarity: t.text(),
  attack: t.integer(),
  defense: t.integer(),
  speed: t.integer(),
  traits: t.json(),
  updatedAt: t.bigint().notNull(),
}));

export const listings = onchainTable("listings", (t) => ({
  id: t.text().primaryKey(), // tokenId string
  tokenId: t.bigint().notNull(),
  seller: t.hex().notNull(),
  price: t.bigint().notNull(),
  active: t.boolean().notNull(),
  listedAtBlock: t.bigint().notNull(),
  listedTxHash: t.hex().notNull(),
  cancelledAtBlock: t.bigint(),
  soldAtBlock: t.bigint(),
}));

export const sales = onchainTable("sales", (t) => ({
  id: t.text().primaryKey(), // txHash_logIndex
  tokenId: t.bigint().notNull(),
  buyer: t.hex().notNull(),
  seller: t.hex().notNull(),
  price: t.bigint().notNull(),
  feeAmount: t.bigint().notNull(),
  royaltyAmount: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  txHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const transfers = onchainTable("transfers", (t) => ({
  id: t.text().primaryKey(), // txHash_logIndex
  tokenId: t.bigint().notNull(),
  from: t.hex().notNull(),
  to: t.hex().notNull(),
  blockNumber: t.bigint().notNull(),
  txHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const withdrawals = onchainTable("withdrawals", (t) => ({
  id: t.text().primaryKey(), // txHash_logIndex
  recipient: t.hex().notNull(),
  amount: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  txHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const activity = onchainTable("activity", (t) => ({
  id: t.text().primaryKey(), // txHash_logIndex
  type: t.text().notNull(), // "MINT" | "LIST" | "CANCEL" | "SALE" | "TRANSFER"
  tokenId: t.bigint().notNull(),
  from: t.hex(),
  to: t.hex(),
  price: t.bigint(),
  blockNumber: t.bigint().notNull(),
  txHash: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));
