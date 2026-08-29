import ElementalBeastNFTAbi from "./abis/ElementalBeastNFT.json";
import MarketplaceAbi from "./abis/Marketplace.json";

export const NFT_ABI = ElementalBeastNFTAbi;
export const MARKETPLACE_ABI = MarketplaceAbi;

export const CONTRACT_ADDRESSES = {
  // Base Sepolia deployed addresses
  baseSepolia: {
    nft: (process.env.NEXT_PUBLIC_NFT_ADDRESS || "0x9cCa84aCE2d3CF4045dB0aAd03c908c7f083cc01") as `0x${string}`,
    marketplace: (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0xCB509975dCa8C8accCD558DcD08dA9dE6788cCb0") as `0x${string}`,
    chainId: 84532,
    explorer: "https://sepolia.basescan.org",
  },
  // Anvil local addresses
  anvil: {
    nft: (process.env.NEXT_PUBLIC_ANVIL_NFT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`,
    marketplace: (process.env.NEXT_PUBLIC_ANVIL_MARKETPLACE_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512") as `0x${string}`,
    chainId: 31337,
    explorer: "",
  },
};

export function getContractAddresses(chainId?: number) {
  if (chainId === 31337) {
    return CONTRACT_ADDRESSES.anvil;
  }
  return CONTRACT_ADDRESSES.baseSepolia;
}

/**
 * Decodes Solidity custom errors into human-friendly error messages.
 */
export function decodeContractError(error: any): string {
  if (!error) return "An unknown error occurred.";

  const message = error?.message || error?.shortMessage || String(error);

  if (message.includes("User rejected") || message.includes("User denied")) {
    return "Transaction was rejected in your wallet.";
  }
  if (message.includes("insufficient funds")) {
    return "Insufficient ETH balance to cover price and gas fees.";
  }
  if (message.includes("Marketplace__AlreadyListed")) {
    return "This Beast is already actively listed on the marketplace.";
  }
  if (message.includes("Marketplace__NotListed")) {
    return "This Beast is not currently listed for sale.";
  }
  if (message.includes("Marketplace__NotOwner")) {
    return "You do not own this Beast.";
  }
  if (message.includes("Marketplace__NotSeller")) {
    return "Only the seller can cancel this listing.";
  }
  if (message.includes("Marketplace__PriceZero")) {
    return "Listing price must be greater than zero.";
  }
  if (message.includes("Marketplace__NotApproved")) {
    return "Marketplace is not approved to transfer this NFT. Please approve first.";
  }
  if (message.includes("Marketplace__IncorrectPayment")) {
    return "Incorrect payment amount sent for this listing.";
  }
  if (message.includes("Marketplace__StaleListing")) {
    return "Listing is stale: the seller no longer owns this NFT.";
  }
  if (message.includes("Marketplace__ApprovalRevoked")) {
    return "Listing invalid: seller revoked marketplace approval.";
  }
  if (message.includes("Marketplace__NoProceeds")) {
    return "You have no claimable proceeds to withdraw.";
  }
  if (message.includes("EnforcedPause")) {
    return "This contract action is currently paused for maintenance.";
  }
  if (message.includes("ElementalBeastNFT__EmptyTokenURI")) {
    return "Token URI cannot be empty.";
  }

  // Fallback to short message or truncated message
  if (error?.shortMessage) return error.shortMessage;
  return message.slice(0, 140);
}
