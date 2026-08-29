// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ElementalBeastNFT} from "./ElementalBeastNFT.sol";

/**
 * @title Marketplace
 * @notice Non-custodial marketplace for Elemental Beast NFTs on Base Sepolia.
 * @dev The contract never holds custody of NFTs prior to purchase.
 * Settlement is atomic and pull-based via pull-payment accounting.
 */
contract Marketplace is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    /// @notice Target NFT contract
    ElementalBeastNFT public immutable nftContract;

    /// @notice Immutable maximum protocol fee ceiling in basis points (e.g. 1000 = 10%)
    uint96 public immutable MAX_FEE_BPS;

    /// @notice Current protocol fee basis points
    uint96 public protocolFeeBps;

    /// @notice Address receiving protocol fees
    address public feeRecipient;

    /// @dev Mapping from token ID to active listing
    mapping(uint256 => Listing) private _listings;

    /// @dev Pull-payment balances accrued for sellers, feeRecipient, and royalty recipients
    mapping(address => uint256) private _proceeds;

    // --- Custom Errors ---
    error Marketplace__ZeroAddress();
    error Marketplace__AlreadyListed(uint256 tokenId);
    error Marketplace__NotListed(uint256 tokenId);
    error Marketplace__NotOwner(uint256 tokenId, address caller);
    error Marketplace__NotSeller(uint256 tokenId, address caller);
    error Marketplace__PriceZero();
    error Marketplace__NotApproved(uint256 tokenId);
    error Marketplace__IncorrectPayment(uint256 tokenId, uint256 expectedPrice, uint256 receivedValue);
    error Marketplace__StaleListing(uint256 tokenId, address listedSeller, address currentOwner);
    error Marketplace__ApprovalRevoked(uint256 tokenId);
    error Marketplace__FeeTooHigh(uint96 requestedFeeBps, uint96 maxFeeBps);
    error Marketplace__CombinedFeeAndRoyaltyTooHigh(uint96 combinedBps, uint96 maxCombinedBps);
    error Marketplace__NoProceeds();
    error Marketplace__TransferFailed();

    // --- Events ---
    event ItemListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ItemCancelled(uint256 indexed tokenId, address indexed seller);
    event ItemSold(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 feeAmount,
        uint256 royaltyAmount
    );
    event ProceedsWithdrawn(address indexed recipient, uint256 amount);
    event ProtocolFeeUpdated(uint96 oldFeeBps, uint96 newFeeBps);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    /**
     * @param admin Administrator receiving DEFAULT_ADMIN_ROLE, PAUSER_ROLE, and FEE_MANAGER_ROLE
     * @param nftContractAddress Address of the ElementalBeastNFT contract
     * @param initialFeeRecipient Address receiving protocol marketplace fees
     * @param initialFeeBps Initial protocol fee basis points (e.g. 250 = 2.5%)
     * @param maxFeeBps Immutable maximum fee cap (e.g. 1000 = 10%)
     */
    constructor(
        address admin,
        address nftContractAddress,
        address initialFeeRecipient,
        uint96 initialFeeBps,
        uint96 maxFeeBps
    ) {
        if (admin == address(0) || nftContractAddress == address(0) || initialFeeRecipient == address(0)) {
            revert Marketplace__ZeroAddress();
        }
        if (initialFeeBps > maxFeeBps) {
            revert Marketplace__FeeTooHigh(initialFeeBps, maxFeeBps);
        }

        nftContract = ElementalBeastNFT(nftContractAddress);
        uint96 nftMaxRoyalty = nftContract.MAX_ROYALTY_BPS();

        // Enforce constructor invariant: combined fee cap must never exceed 20% (2000 BPS)
        if (maxFeeBps + nftMaxRoyalty > 2000) {
            revert Marketplace__CombinedFeeAndRoyaltyTooHigh(maxFeeBps + nftMaxRoyalty, 2000);
        }

        MAX_FEE_BPS = maxFeeBps;
        protocolFeeBps = initialFeeBps;
        feeRecipient = initialFeeRecipient;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(FEE_MANAGER_ROLE, admin);
    }

    /**
     * @notice Lists an Elemental Beast for fixed-price sale without taking custody.
     * @param tokenId The NFT token ID
     * @param price Price in wei (must be > 0)
     */
    function listItem(uint256 tokenId, uint256 price) external whenNotPaused {
        if (price == 0) {
            revert Marketplace__PriceZero();
        }
        if (_listings[tokenId].active) {
            revert Marketplace__AlreadyListed(tokenId);
        }
        if (nftContract.ownerOf(tokenId) != msg.sender) {
            revert Marketplace__NotOwner(tokenId, msg.sender);
        }

        // Verify marketplace is approved
        if (!nftContract.isApprovedForAll(msg.sender, address(this)) && nftContract.getApproved(tokenId) != address(this)) {
            revert Marketplace__NotApproved(tokenId);
        }

        _listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit ItemListed(tokenId, msg.sender, price);
    }

    /**
     * @notice Cancels an active listing.
     * @param tokenId The NFT token ID
     */
    function cancelListing(uint256 tokenId) external {
        Listing storage listing = _listings[tokenId];
        if (!listing.active) {
            revert Marketplace__NotListed(tokenId);
        }
        if (listing.seller != msg.sender) {
            revert Marketplace__NotSeller(tokenId, msg.sender);
        }

        listing.active = false;

        emit ItemCancelled(tokenId, msg.sender);
    }

    /**
     * @notice Purchases a listed Elemental Beast.
     * @dev Checks on-chain owner and approval at execution time to guard against stale listings.
     * Settles pull-payments atomically to seller, feeRecipient, and royaltyRecipient.
     * @param tokenId The NFT token ID
     */
    function buyItem(uint256 tokenId) external payable nonReentrant whenNotPaused {
        Listing memory listing = _listings[tokenId];
        if (!listing.active) {
            revert Marketplace__NotListed(tokenId);
        }
        if (msg.value != listing.price) {
            revert Marketplace__IncorrectPayment(tokenId, listing.price, msg.value);
        }

        address currentOwner = nftContract.ownerOf(tokenId);
        if (currentOwner != listing.seller) {
            revert Marketplace__StaleListing(tokenId, listing.seller, currentOwner);
        }

        if (!nftContract.isApprovedForAll(listing.seller, address(this)) && nftContract.getApproved(tokenId) != address(this)) {
            revert Marketplace__ApprovalRevoked(tokenId);
        }

        // Checks-effects: mark listing inactive before external calls
        _listings[tokenId].active = false;

        // Calculate protocol fee
        uint256 feeAmount = (listing.price * protocolFeeBps) / 10000;

        // Calculate ERC-2981 royalty
        (address royaltyRecipient, uint256 royaltyAmount) = (address(0), 0);
        try nftContract.royaltyInfo(tokenId, listing.price) returns (address receiver, uint256 amount) {
            royaltyRecipient = receiver;
            royaltyAmount = amount;
        } catch {
            royaltyRecipient = address(0);
            royaltyAmount = 0;
        }

        // If royalty recipient is zero address or invalid, merge into seller amount
        if (royaltyRecipient == address(0)) {
            royaltyAmount = 0;
        }

        // Exact settlement accounting: remainder always allocated to seller
        uint256 nonSellerDeductions = feeAmount + royaltyAmount;
        if (nonSellerDeductions > listing.price) {
            // Safety clamp: should never happen with caps, but protects seller
            feeAmount = 0;
            royaltyAmount = 0;
            nonSellerDeductions = 0;
        }

        uint256 sellerAmount = listing.price - nonSellerDeductions;

        // Credit pull-payment balances
        if (feeAmount > 0) {
            _proceeds[feeRecipient] += feeAmount;
        }
        if (royaltyAmount > 0) {
            _proceeds[royaltyRecipient] += royaltyAmount;
        }
        _proceeds[listing.seller] += sellerAmount;

        // Transfer NFT to buyer
        nftContract.safeTransferFrom(listing.seller, msg.sender, tokenId);

        emit ItemSold(tokenId, msg.sender, listing.seller, listing.price, feeAmount, royaltyAmount);
    }

    /**
     * @notice Withdraws accrued proceeds for the caller.
     * @dev Zeroes balance before sending ETH to enforce Checks-Effects-Interactions.
     */
    function withdrawProceeds() external nonReentrant {
        uint256 amount = _proceeds[msg.sender];
        if (amount == 0) {
            revert Marketplace__NoProceeds();
        }

        _proceeds[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert Marketplace__TransferFailed();
        }

        emit ProceedsWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Updates the protocol fee basis points.
     * @param newFeeBps New protocol fee (cannot exceed MAX_FEE_BPS)
     */
    function setProtocolFeeBps(uint96 newFeeBps) external onlyRole(FEE_MANAGER_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) {
            revert Marketplace__FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        }
        uint96 oldBps = protocolFeeBps;
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(oldBps, newFeeBps);
    }

    /**
     * @notice Updates the protocol fee recipient address.
     * @param newFeeRecipient New fee receiver address
     */
    function setFeeRecipient(address newFeeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeRecipient == address(0)) {
            revert Marketplace__ZeroAddress();
        }
        address oldRecipient = feeRecipient;
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(oldRecipient, newFeeRecipient);
    }

    /**
     * @notice Pauses marketplace listing and buying in emergencies.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses the marketplace.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Returns listing details for a token ID.
     */
    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return _listings[tokenId];
    }

    /**
     * @notice Returns the withdrawable pull-payment proceeds for an address.
     */
    function getProceeds(address account) external view returns (uint256) {
        return _proceeds[account];
    }
}
