// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ElementalBeastNFT
 * @notice ERC-721 collectible NFT contract representing Elemental Beasts.
 * @dev Implements ERC-721, ERC-2981 royalties, role-based access control, and pause functionality.
 * Metadata is stored immutably upon mint (no tokenURI setter exists).
 */
contract ElementalBeastNFT is ERC721, ERC2981, AccessControl, Pausable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Maximum allowed royalty basis points (e.g. 1000 = 10%)
    uint96 public immutable MAX_ROYALTY_BPS;

    /// @dev Monotonically increasing counter for sequential token IDs starting at 1
    uint256 private _nextTokenId = 1;

    /// @dev Mapping from token ID to immutable token URI
    mapping(uint256 => string) private _tokenURIs;

    // --- Custom Errors ---
    error ElementalBeastNFT__ZeroAddress();
    error ElementalBeastNFT__EmptyTokenURI();
    error ElementalBeastNFT__RoyaltyTooHigh(uint96 royaltyBps, uint96 maxRoyaltyBps);
    error ElementalBeastNFT__TokenDoesNotExist(uint256 tokenId);

    // --- Events ---
    event CardMinted(uint256 indexed tokenId, address indexed owner, string tokenURI);
    event DefaultRoyaltyUpdated(address indexed receiver, uint96 feeNumerator);

    /**
     * @param admin Initial administrator and pauser
     * @param royaltyReceiver Recipient of secondary market royalties
     * @param defaultRoyaltyBps Initial royalty basis points (e.g. 500 = 5%)
     * @param maxRoyaltyBps Maximum immutable ceiling for royalties (e.g. 1000 = 10%)
     */
    constructor(
        address admin,
        address royaltyReceiver,
        uint96 defaultRoyaltyBps,
        uint96 maxRoyaltyBps
    ) ERC721("Elemental Beasts", "BEAST") {
        if (admin == address(0) || royaltyReceiver == address(0)) {
            revert ElementalBeastNFT__ZeroAddress();
        }
        if (defaultRoyaltyBps > maxRoyaltyBps) {
            revert ElementalBeastNFT__RoyaltyTooHigh(defaultRoyaltyBps, maxRoyaltyBps);
        }

        MAX_ROYALTY_BPS = maxRoyaltyBps;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        _setDefaultRoyalty(royaltyReceiver, defaultRoyaltyBps);
    }

    /**
     * @notice Open mint function allowing any user to summon an Elemental Beast.
     * @dev Token IDs are strictly sequential starting at 1. Token URI is immutable.
     * Blocked only when paused by PAUSER_ROLE.
     * @param to Recipient of the minted Beast
     * @param tokenURI_ IPFS URI (e.g. "ipfs://<CID>")
     * @return tokenId The newly minted token ID
     */
    function mint(address to, string calldata tokenURI_) external whenNotPaused returns (uint256 tokenId) {
        if (to == address(0)) {
            revert ElementalBeastNFT__ZeroAddress();
        }
        if (bytes(tokenURI_).length == 0) {
            revert ElementalBeastNFT__EmptyTokenURI();
        }

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = tokenURI_;

        emit CardMinted(tokenId, to, tokenURI_);
    }

    /**
     * @notice Returns the immutable token URI for a given token ID.
     * @param tokenId The identifier of the token
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    /**
     * @notice Returns the total number of tokens minted so far.
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @notice Pauses new minting in emergencies. Does not block transfers or approvals.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses minting.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Allows admin to update the default royalty receiver and bps within MAX_ROYALTY_BPS.
     * @param receiver New royalty recipient
     * @param royaltyBps New royalty basis points
     */
    function setDefaultRoyalty(address receiver, uint96 royaltyBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (receiver == address(0)) {
            revert ElementalBeastNFT__ZeroAddress();
        }
        if (royaltyBps > MAX_ROYALTY_BPS) {
            revert ElementalBeastNFT__RoyaltyTooHigh(royaltyBps, MAX_ROYALTY_BPS);
        }
        _setDefaultRoyalty(receiver, royaltyBps);
        emit DefaultRoyaltyUpdated(receiver, royaltyBps);
    }

    /**
     * @dev Override required for ERC-721, ERC-2981, and AccessControl.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
