// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {ElementalBeastNFT} from "../../src/ElementalBeastNFT.sol";
import {Marketplace} from "../../src/Marketplace.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Malicious buyer attempting to re-enter marketplace during onERC721Received
contract ReentrantBuyer is IERC721Receiver {
    Marketplace public marketplace;
    ElementalBeastNFT public nft;
    uint256 public targetTokenId;
    bool public hasAttacked;

    constructor(Marketplace _marketplace, ElementalBeastNFT _nft) {
        marketplace = _marketplace;
        nft = _nft;
    }

    function buy(uint256 tokenId, uint256 price) external payable {
        targetTokenId = tokenId;
        marketplace.buyItem{value: price}(tokenId);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        if (!hasAttacked) {
            hasAttacked = true;
            // Attempt to re-enter buyItem
            try marketplace.buyItem{value: 1 ether}(targetTokenId) {
                // If it succeeded, reentrancy guard failed
            } catch {
                // Expected revert from ReentrancyGuard
            }
        }
        return this.onERC721Received.selector;
    }

    receive() external payable {}
}

// Malicious contract that can receive NFTs but reverts when receiving ETH
contract RevertingProceedsReceiver is IERC721Receiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    receive() external payable {
        revert("I refuse ETH");
    }
}

contract MarketplaceAdversarialTest is Test {
    ElementalBeastNFT public nft;
    Marketplace public marketplace;

    address public admin = makeAddr("admin");
    address public feeRecipient = makeAddr("feeRecipient");
    address public royaltyReceiver = makeAddr("royaltyReceiver");
    address public seller = makeAddr("seller");

    function setUp() public {
        vm.startPrank(admin);
        nft = new ElementalBeastNFT(admin, royaltyReceiver, 500, 1000);
        marketplace = new Marketplace(admin, address(nft), feeRecipient, 250, 1000);
        vm.stopPrank();

        // Mint token #1
        vm.prank(seller);
        nft.mint(seller, "ipfs://adversarial/1");
    }

    function test_ReentrancyProtectionOnBuy() public {
        ReentrantBuyer attacker = new ReentrantBuyer(marketplace, nft);
        vm.deal(address(attacker), 10 ether);

        vm.startPrank(seller);
        nft.approve(address(marketplace), 1);
        marketplace.listItem(1, 1 ether);
        vm.stopPrank();

        // Attacker buys token 1; onERC721Received will attempt to re-enter
        attacker.buy{value: 1 ether}(1, 1 ether);

        // Buyer received the token and reentrancy was caught
        assertEq(nft.ownerOf(1), address(attacker));
        assertFalse(marketplace.getListing(1).active);
    }

    function test_RevertingSellerDoesNotBlockMarketplace() public {
        RevertingProceedsReceiver badSeller = new RevertingProceedsReceiver();

        // Mint to badSeller
        vm.prank(address(badSeller));
        uint256 tokenId = nft.mint(address(badSeller), "ipfs://bad/1");

        // List item via badSeller prank
        vm.startPrank(address(badSeller));
        nft.approve(address(marketplace), tokenId);
        marketplace.listItem(tokenId, 1 ether);
        vm.stopPrank();

        // Legitimate buyer purchases item
        address buyer = makeAddr("buyer");
        vm.deal(buyer, 2 ether);
        vm.prank(buyer);
        marketplace.buyItem{value: 1 ether}(tokenId);

        // Sale succeeds seamlessly because pull payments are used instead of push payments!
        assertEq(nft.ownerOf(tokenId), buyer);
        assertEq(marketplace.getProceeds(address(badSeller)), 0.925 ether);

        // If badSeller tries to withdraw, their revert only fails their own withdrawal
        vm.prank(address(badSeller));
        vm.expectRevert(Marketplace.Marketplace__TransferFailed.selector);
        marketplace.withdrawProceeds();
    }

    function test_CrossRolePrivilegeEscalationRejected() public {
        address pauser = makeAddr("pauser");
        address feeManager = makeAddr("feeManager");

        vm.startPrank(admin);
        marketplace.grantRole(marketplace.PAUSER_ROLE(), pauser);
        marketplace.grantRole(marketplace.FEE_MANAGER_ROLE(), feeManager);
        vm.stopPrank();

        // Pauser cannot modify fees
        vm.prank(pauser);
        vm.expectRevert();
        marketplace.setProtocolFeeBps(500);

        // Fee manager cannot pause
        vm.prank(feeManager);
        vm.expectRevert();
        marketplace.pause();
    }
}
