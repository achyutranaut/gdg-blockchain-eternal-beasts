export const MarketplaceAbi = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "admin", "type": "address", "internalType": "address" },
      { "name": "nftContract", "type": "address", "internalType": "address" },
      { "name": "feeRecipient", "type": "address", "internalType": "address" },
      { "name": "protocolFeeBps", "type": "uint96", "internalType": "uint96" },
      { "name": "maxFeeBps", "type": "uint96", "internalType": "uint96" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ItemListed",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "seller", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ItemCancelled",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "seller", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ItemSold",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "seller", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "feeAmount", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "royaltyAmount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProceedsWithdrawn",
    "inputs": [
      { "name": "recipient", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  }
] as const;
