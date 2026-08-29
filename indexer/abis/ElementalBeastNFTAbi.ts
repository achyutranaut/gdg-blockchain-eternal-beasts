export const ElementalBeastNFTAbi = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "admin", "type": "address", "internalType": "address" },
      { "name": "royaltyReceiver", "type": "address", "internalType": "address" },
      { "name": "defaultRoyaltyBps", "type": "uint96", "internalType": "uint96" },
      { "name": "maxRoyaltyBps", "type": "uint96", "internalType": "uint96" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "CardMinted",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "owner", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "tokenURI", "type": "string", "indexed": false, "internalType": "string" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      { "name": "from", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "to", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      { "name": "owner", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "approved", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ApprovalForAll",
    "inputs": [
      { "name": "owner", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "operator", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "approved", "type": "bool", "indexed": false, "internalType": "bool" }
    ],
    "anonymous": false
  }
] as const;
