#!/usr/bin/env node

/**
 * One-time script to pin all built-in beast SVG artworks to IPFS via Pinata.
 *
 * Usage:
 *   node scripts/pin-builtin-artworks.mjs
 *
 * Requires PINATA_JWT (and optionally PINATA_GATEWAY) environment variables
 * (reads from ../.env automatically). Outputs a TypeScript map you can paste
 * into lib/ipfs-cids.ts.
 *
 * Uses the official `pinata` SDK (same client as lib/pinata.ts) so this
 * script and the app's upload route go through identical upload logic —
 * no separate raw-fetch implementation to keep in sync.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PinataSDK } from "pinata";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from frontend root
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const PINATA_JWT = process.env.PINATA_JWT;
if (!PINATA_JWT) {
  console.error("Error: PINATA_JWT environment variable is required.");
  console.error("Set it in frontend/.env or export it before running this script.");
  process.exit(1);
}

const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

const BEASTS_DIR = path.resolve(__dirname, "../public/beasts");

const BEAST_FILES = [
  { name: "WOLF", file: "wolf.svg" },
  { name: "SERPENT", file: "serpent.svg" },
  { name: "TURTLE", file: "turtle.svg" },
  { name: "EAGLE", file: "eagle.svg" },
  { name: "DRAGON", file: "dragon.svg" },
  { name: "RAVEN", file: "raven.svg" },
  { name: "LION", file: "lion.svg" },
  { name: "BEAR", file: "bear.svg" },
  { name: "PHOENIX", file: "phoenix.svg" },
  { name: "TIGER", file: "tiger.svg" },
];

async function pinFile(filePath, fileName) {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: "image/svg+xml" });
  const file = new File([blob], fileName, { type: "image/svg+xml" });

  const upload = await pinata.upload.public
    .file(file)
    .name(`elemental-beasts-${fileName}`);

  return upload.cid;
}

async function main() {
  console.log("🔥 Pinning built-in beast artworks to IPFS via Pinata (public network)...\n");

  const results = {};

  for (const beast of BEAST_FILES) {
    const filePath = path.join(BEASTS_DIR, beast.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️  Skipping ${beast.name}: ${filePath} not found`);
      continue;
    }

    process.stdout.write(` 📌 Pinning ${beast.name} (${beast.file})...`);
    const cid = await pinFile(filePath, beast.file);
    results[beast.name] = cid;
    console.log(` ✅ ${cid}`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Copy this into frontend/lib/ipfs-cids.ts:\n");
  console.log("export const BEAST_IPFS_CIDS: Record<string, string> = {");
  for (const [name, cid] of Object.entries(results)) {
    console.log(`  ${name}: "${cid}",`);
  }
  console.log("};");
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\n✅ Done! Pinned ${Object.keys(results).length} artworks.`);
  console.log("\nSpot-check one on a public gateway before trusting the rest:");
  const firstCid = Object.values(results)[0];
  if (firstCid) console.log(`  https://ipfs.io/ipfs/${firstCid}`);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message || err);
  process.exit(1);
});