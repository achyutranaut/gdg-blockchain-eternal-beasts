// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {ElementalBeastNFT} from "../../src/ElementalBeastNFT.sol";
import {Marketplace} from "../../src/Marketplace.sol";

contract MarketplaceFuzzTest is Test {
    ElementalBeastNFT public nft;
    Marketplace public marketplace;

    address public admin = makeAddr("admin");
    address public feeRecipient = makeAddr("feeRecipient");
    address public royaltyReceiver = makeAddr("royaltyReceiver");
    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");

    uint96 public constant DEFAULT_ROYALTY_BPS = 500; // 5%
    uint96 public constant MAX_ROYALTY_BPS = 1000; // 10%
    uint96 public constant MAX_FEE_BPS = 1000; // 10%

    function setUp() public {
        vm.startPrank(admin);
        nft = new ElementalBeastNFT(admin, royaltyReceiver, DEFAULT_ROYALTY_BPS, MAX_ROYALTY_BPS);
        marketplace = new Marketplace(admin, address(nft), feeRecipient, 250, MAX_FEE_BPS);
        vm.stopPrank();
    }

    /**
     * @notice Invariant 6 test: fee + royalty + seller == msg.value for all valid prices, fees, and royalties.
     * Rounding remainder is always allocated to seller.
     */
    function testFuzz_ExactSettlementAccounting(
        uint256 price,
        uint96 feeBps,
        uint96 royaltyBps
    ) public {
        // Bound inputs to realistic and valid ranges
        price = bound(price, 1000, 1_000_000 ether);
        feeBps = uint96(bound(feeBps, 0, MAX_FEE_BPS));
        royaltyBps = uint96(bound(royaltyBps, 0, MAX_ROYALTY_BPS));

        // Update fee & royalty settings
        vm.prank(admin);
        marketplace.setProtocolFeeBps(feeBps);
        vm.prank(admin);
        nft.setDefaultRoyalty(royaltyReceiver, royaltyBps);

        // Mint and list
        vm.prank(seller);
        uint256 tokenId = nft.mint(seller, "ipfs://fuzz/test");

        vm.startPrank(seller);
        nft.approve(address(marketplace), tokenId);
        marketplace.listItem(tokenId, price);
        vm.stopPrank();

        uint256 prevSellerProceeds = marketplace.getProceeds(seller);
        uint256 prevFeeProceeds = marketplace.getProceeds(feeRecipient);
        uint256 prevRoyaltyProceeds = marketplace.getProceeds(royaltyReceiver);

        // Fund and execute purchase
        vm.deal(buyer, price);
        vm.prank(buyer);
        marketplace.buyItem{value: price}(tokenId);

        uint256 deltaSeller = marketplace.getProceeds(seller) - prevSellerProceeds;
        uint256 deltaFee = marketplace.getProceeds(feeRecipient) - prevFeeProceeds;
        uint256 deltaRoyalty = marketplace.getProceeds(royaltyReceiver) - prevRoyaltyProceeds;

        // Invariant: sum of credited proceeds equals price exactly
        assertEq(deltaSeller + deltaFee + deltaRoyalty, price);

        // Invariant: buyer receives the token
        assertEq(nft.ownerOf(tokenId), buyer);

        // Invariant: listing is inactive
        assertFalse(marketplace.getListing(tokenId).active);
    }
}
