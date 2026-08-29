// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {ElementalBeastNFT} from "../../src/ElementalBeastNFT.sol";
import {Marketplace} from "../../src/Marketplace.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract MarketplaceTest is Test {
    ElementalBeastNFT public nft;
    Marketplace public marketplace;

    address public admin = makeAddr("admin");
    address public feeRecipient = makeAddr("feeRecipient");
    address public royaltyReceiver = makeAddr("royaltyReceiver");
    address public seller = makeAddr("seller");
    address public buyer = makeAddr("buyer");
    address public stranger = makeAddr("stranger");

    uint96 public constant DEFAULT_ROYALTY_BPS = 500; // 5%
    uint96 public constant MAX_ROYALTY_BPS = 1000; // 10%
    uint96 public constant INITIAL_FEE_BPS = 250; // 2.5%
    uint96 public constant MAX_FEE_BPS = 1000; // 10%

    string public constant TOKEN_URI_1 = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/1.json";
    uint256 public constant LISTING_PRICE = 1 ether;

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

    function setUp() public {
        vm.startPrank(admin);
        nft = new ElementalBeastNFT(admin, royaltyReceiver, DEFAULT_ROYALTY_BPS, MAX_ROYALTY_BPS);
        marketplace = new Marketplace(admin, address(nft), feeRecipient, INITIAL_FEE_BPS, MAX_FEE_BPS);
        vm.stopPrank();

        // Mint token #1 to seller
        vm.prank(seller);
        nft.mint(seller, TOKEN_URI_1);

        // Fund buyer
        vm.deal(buyer, 100 ether);
    }

    function test_InitialState() public view {
        assertEq(address(marketplace.nftContract()), address(nft));
        assertEq(marketplace.MAX_FEE_BPS(), MAX_FEE_BPS);
        assertEq(marketplace.protocolFeeBps(), INITIAL_FEE_BPS);
        assertEq(marketplace.feeRecipient(), feeRecipient);
        assertTrue(marketplace.hasRole(marketplace.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(marketplace.hasRole(marketplace.PAUSER_ROLE(), admin));
        assertTrue(marketplace.hasRole(marketplace.FEE_MANAGER_ROLE(), admin));
    }

    function test_ConstructorRevertsOnInvalidInputs() public {
        vm.expectRevert(Marketplace.Marketplace__ZeroAddress.selector);
        new Marketplace(address(0), address(nft), feeRecipient, INITIAL_FEE_BPS, MAX_FEE_BPS);

        vm.expectRevert(Marketplace.Marketplace__ZeroAddress.selector);
        new Marketplace(admin, address(0), feeRecipient, INITIAL_FEE_BPS, MAX_FEE_BPS);

        vm.expectRevert(Marketplace.Marketplace__ZeroAddress.selector);
        new Marketplace(admin, address(nft), address(0), INITIAL_FEE_BPS, MAX_FEE_BPS);

        vm.expectRevert(
            abi.encodeWithSelector(
                Marketplace.Marketplace__FeeTooHigh.selector,
                1100,
                MAX_FEE_BPS
            )
        );
        new Marketplace(admin, address(nft), feeRecipient, 1100, MAX_FEE_BPS);
    }

    function test_ListItemSuccess() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);

        vm.expectEmit(true, true, false, true);
        emit ItemListed(1, seller, LISTING_PRICE);

        marketplace.listItem(1, LISTING_PRICE);
        vm.stopPrank();

        Marketplace.Listing memory listing = marketplace.getListing(1);
        assertEq(listing.seller, seller);
        assertEq(listing.price, LISTING_PRICE);
        assertTrue(listing.active);
    }

    function test_RevertListPriceZero() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);

        vm.expectRevert(Marketplace.Marketplace__PriceZero.selector);
        marketplace.listItem(1, 0);
        vm.stopPrank();
    }

    function test_RevertListNotOwner() public {
        vm.startPrank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Marketplace.Marketplace__NotOwner.selector, 1, stranger)
        );
        marketplace.listItem(1, LISTING_PRICE);
        vm.stopPrank();
    }

    function test_RevertListNotApproved() public {
        vm.startPrank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(Marketplace.Marketplace__NotApproved.selector, 1)
        );
        marketplace.listItem(1, LISTING_PRICE);
        vm.stopPrank();
    }

    function test_RevertDuplicateListing() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);
        marketplace.listItem(1, LISTING_PRICE);

        vm.expectRevert(
            abi.encodeWithSelector(Marketplace.Marketplace__AlreadyListed.selector, 1)
        );
        marketplace.listItem(1, LISTING_PRICE);
        vm.stopPrank();
    }

    function test_CancelListingSuccess() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);
        marketplace.listItem(1, LISTING_PRICE);

        vm.expectEmit(true, true, false, true);
        emit ItemCancelled(1, seller);

        marketplace.cancelListing(1);
        vm.stopPrank();

        Marketplace.Listing memory listing = marketplace.getListing(1);
        assertFalse(listing.active);
    }

    function test_RevertCancelNotSeller() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);
        marketplace.listItem(1, LISTING_PRICE);
        vm.stopPrank();

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Marketplace.Marketplace__NotSeller.selector, 1, stranger)
        );
        marketplace.cancelListing(1);
    }

    function test_RevertCancelNotListed() public {
        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(Marketplace.Marketplace__NotListed.selector, 1)
        );
        marketplace.cancelListing(1);
    }

    function test_BuyItemSuccessAndAccounting() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);
        marketplace.listItem(1, LISTING_PRICE);
        vm.stopPrank();

        // 2.5% fee = 0.025 ether
        // 5% royalty = 0.05 ether
        // seller amount = 0.925 ether
        uint256 expectedFee = (LISTING_PRICE * INITIAL_FEE_BPS) / 10000;
        uint256 expectedRoyalty = (LISTING_PRICE * DEFAULT_ROYALTY_BPS) / 10000;
        uint256 expectedSeller = LISTING_PRICE - expectedFee - expectedRoyalty;

        assertEq(expectedFee, 0.025 ether);
        assertEq(expectedRoyalty, 0.05 ether);
        assertEq(expectedSeller, 0.925 ether);

        vm.expectEmit(true, true, true, true);
        emit ItemSold(1, buyer, seller, LISTING_PRICE, expectedFee, expectedRoyalty);

        vm.prank(buyer);
        marketplace.buyItem{value: LISTING_PRICE}(1);

        // Verification 1: Ownership moved
        assertEq(nft.ownerOf(1), buyer);

        // Verification 2: Listing is inactive
        Marketplace.Listing memory listing = marketplace.getListing(1);
        assertFalse(listing.active);

        // Verification 3: Pull payment proceeds correctly credited
        assertEq(marketplace.getProceeds(seller), expectedSeller);
        assertEq(marketplace.getProceeds(feeRecipient), expectedFee);
        assertEq(marketplace.getProceeds(royaltyReceiver), expectedRoyalty);

        // Verification 4: Invariant contract balance == sum of proceeds
        assertEq(address(marketplace).balance, LISTING_PRICE);
    }

    function test_RevertBuyIncorrectPayment() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);
        marketplace.listItem(1, LISTING_PRICE);
        vm.stopPrank();

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(
                Marketplace.Marketplace__IncorrectPayment.selector,
                1,
                LISTING_PRICE,
                0.5 ether
            )
        );
        marketplace.buyItem{value: 0.5 ether}(1);
    }

    function test_RevertBuyStaleListingAfterTransfer() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);
        marketplace.listItem(1, LISTING_PRICE);

        // Seller transfers NFT directly to stranger
        nft.transferFrom(seller, stranger, 1);
        vm.stopPrank();

        // Buyer attempts to purchase stale listing
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(
                Marketplace.Marketplace__StaleListing.selector,
                1,
                seller,
                stranger
            )
        );
        marketplace.buyItem{value: LISTING_PRICE}(1);
    }

    function test_RevertBuyApprovalRevokedAfterListing() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);
        marketplace.listItem(1, LISTING_PRICE);

        // Seller revokes approval by approving address(0)
        nft.approve(address(0), 1);
        vm.stopPrank();

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(Marketplace.Marketplace__ApprovalRevoked.selector, 1)
        );
        marketplace.buyItem{value: LISTING_PRICE}(1);
    }

    function test_WithdrawProceedsSuccess() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);
        marketplace.listItem(1, LISTING_PRICE);
        vm.stopPrank();

        vm.prank(buyer);
        marketplace.buyItem{value: LISTING_PRICE}(1);

        uint256 sellerProceeds = marketplace.getProceeds(seller);
        uint256 sellerInitialBal = seller.balance;

        vm.expectEmit(true, false, false, true);
        emit ProceedsWithdrawn(seller, sellerProceeds);

        vm.prank(seller);
        marketplace.withdrawProceeds();

        assertEq(marketplace.getProceeds(seller), 0);
        assertEq(seller.balance, sellerInitialBal + sellerProceeds);

        // Fee recipient withdraws
        vm.prank(feeRecipient);
        marketplace.withdrawProceeds();
        assertEq(marketplace.getProceeds(feeRecipient), 0);

        // Royalty recipient withdraws
        vm.prank(royaltyReceiver);
        marketplace.withdrawProceeds();
        assertEq(marketplace.getProceeds(royaltyReceiver), 0);

        // Contract balance is now 0
        assertEq(address(marketplace).balance, 0);
    }

    function test_RevertWithdrawNoProceeds() public {
        vm.prank(stranger);
        vm.expectRevert(Marketplace.Marketplace__NoProceeds.selector);
        marketplace.withdrawProceeds();
    }

    function test_SetProtocolFeeBounds() public {
        vm.startPrank(admin);

        vm.expectEmit(false, false, false, true);
        emit ProtocolFeeUpdated(INITIAL_FEE_BPS, 500);
        marketplace.setProtocolFeeBps(500);
        assertEq(marketplace.protocolFeeBps(), 500);

        // Cannot exceed MAX_FEE_BPS (1000)
        vm.expectRevert(
            abi.encodeWithSelector(
                Marketplace.Marketplace__FeeTooHigh.selector,
                1001,
                MAX_FEE_BPS
            )
        );
        marketplace.setProtocolFeeBps(1001);
        vm.stopPrank();
    }

    function test_SetFeeRecipient() public {
        address newFeeRecipient = makeAddr("newFeeRecipient");
        vm.startPrank(admin);

        vm.expectEmit(true, true, false, false);
        emit FeeRecipientUpdated(feeRecipient, newFeeRecipient);
        marketplace.setFeeRecipient(newFeeRecipient);
        assertEq(marketplace.feeRecipient(), newFeeRecipient);

        vm.expectRevert(Marketplace.Marketplace__ZeroAddress.selector);
        marketplace.setFeeRecipient(address(0));
        vm.stopPrank();
    }

    function test_PauseBlocksListingAndBuying() public {
        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);
        marketplace.listItem(1, LISTING_PRICE);
        vm.stopPrank();

        vm.prank(admin);
        marketplace.pause();

        // Buying reverts when paused
        vm.prank(buyer);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        marketplace.buyItem{value: LISTING_PRICE}(1);

        // Mint a second token for seller
        vm.prank(seller);
        nft.mint(seller, "ipfs://test/2");

        // Listing reverts when paused
        vm.startPrank(seller);
        nft.approve(address(marketplace), 2);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        marketplace.listItem(2, LISTING_PRICE);
        vm.stopPrank();

        // Unpause resumes
        vm.prank(admin);
        marketplace.unpause();

        vm.prank(buyer);
        marketplace.buyItem{value: LISTING_PRICE}(1);
        assertEq(nft.ownerOf(1), buyer);
    }
}
