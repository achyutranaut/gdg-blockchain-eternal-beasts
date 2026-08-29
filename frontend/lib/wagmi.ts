import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  rabbyWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { baseSepolia, foundry } from "viem/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Browser Extensions & Installed",
      wallets: [
        injectedWallet,
        metaMaskWallet,
        coinbaseWallet,
        rabbyWallet,
        rainbowWallet,
      ],
    },
    {
      groupName: "Mobile & QR Code",
      wallets: [
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: "Elemental Beasts NFT Marketplace",
    projectId,
  }
);

export const config = createConfig({
  connectors,
  chains: [baseSepolia, foundry],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org"),
    [foundry.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});
