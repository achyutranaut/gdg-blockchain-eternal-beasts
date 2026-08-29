import { createConfig } from "ponder";
import { ElementalBeastNFTAbi } from "./abis/ElementalBeastNFTAbi.js";
import { MarketplaceAbi } from "./abis/MarketplaceAbi.js";

export default createConfig({
  chains: {
    baseSepolia: {
      id: 84532,
      rpc: process.env.PONDER_RPC_URL_84532 || "https://sepolia.base.org",
    },
  },
  contracts: {
    ElementalBeastNFT: {
      abi: ElementalBeastNFTAbi,
      chain: "baseSepolia",
      address: (process.env.NFT_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`,
      startBlock: Number(process.env.START_BLOCK || 0),
    },
    Marketplace: {
      abi: MarketplaceAbi,
      chain: "baseSepolia",
      address: (process.env.MARKETPLACE_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`,
      startBlock: Number(process.env.START_BLOCK || 0),
    },
  },
});
