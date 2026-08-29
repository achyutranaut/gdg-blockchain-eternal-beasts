// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {ElementalBeastNFT} from "../../src/ElementalBeastNFT.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract ElementalBeastNFTTest is Test {
    ElementalBeastNFT public nft;

    address public admin = makeAddr("admin");
    address public royaltyReceiver = makeAddr("royaltyReceiver");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");

    uint96 public constant DEFAULT_ROYALTY_BPS = 500; // 5%
    uint96 public constant MAX_ROYALTY_BPS = 1000; // 10%

    string public constant TOKEN_URI_1 = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/1.json";
    string public constant TOKEN_URI_2 = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/2.json";

    event CardMinted(uint256 indexed tokenId, address indexed owner, string tokenURI);
    event DefaultRoyaltyUpdated(address indexed receiver, uint96 feeNumerator);

    function setUp() public {
        vm.prank(admin);
        nft = new ElementalBeastNFT(admin, royaltyReceiver, DEFAULT_ROYALTY_BPS, MAX_ROYALTY_BPS);
    }

    function test_InitialConfiguration() public view {
        assertEq(nft.name(), "Elemental Beasts");
        assertEq(nft.symbol(), "BEAST");
        assertEq(nft.MAX_ROYALTY_BPS(), MAX_ROYALTY_BPS);
        assertTrue(nft.hasRole(nft.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(nft.hasRole(nft.PAUSER_ROLE(), admin));
        assertTrue(nft.hasRole(nft.MINTER_ROLE(), admin));
        assertEq(nft.totalMinted(), 0);

        (address receiver, uint256 royaltyAmount) = nft.royaltyInfo(1, 10000);
        assertEq(receiver, royaltyReceiver);
        assertEq(royaltyAmount, 500); // 5% of 10000
    }

    function test_RevertConstructorZeroAddress() public {
        vm.expectRevert(ElementalBeastNFT.ElementalBeastNFT__ZeroAddress.selector);
        new ElementalBeastNFT(address(0), royaltyReceiver, DEFAULT_ROYALTY_BPS, MAX_ROYALTY_BPS);

        vm.expectRevert(ElementalBeastNFT.ElementalBeastNFT__ZeroAddress.selector);
        new ElementalBeastNFT(admin, address(0), DEFAULT_ROYALTY_BPS, MAX_ROYALTY_BPS);
    }

    function test_RevertConstructorRoyaltyTooHigh() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                ElementalBeastNFT.ElementalBeastNFT__RoyaltyTooHigh.selector,
                1200,
                MAX_ROYALTY_BPS
            )
        );
        new ElementalBeastNFT(admin, royaltyReceiver, 1200, MAX_ROYALTY_BPS);
    }

    function test_MintSuccess() public {
        vm.expectEmit(true, true, false, true);
        emit CardMinted(1, user1, TOKEN_URI_1);

        vm.prank(user1);
        uint256 tokenId = nft.mint(user1, TOKEN_URI_1);

        assertEq(tokenId, 1);
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.tokenURI(1), TOKEN_URI_1);
        assertEq(nft.balanceOf(user1), 1);
        assertEq(nft.totalMinted(), 1);
    }

    function test_SequentialTokenIDs() public {
        vm.prank(user1);
        uint256 id1 = nft.mint(user1, TOKEN_URI_1);

        vm.prank(user2);
        uint256 id2 = nft.mint(user2, TOKEN_URI_2);

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.ownerOf(2), user2);
        assertEq(nft.totalMinted(), 2);
    }

    function test_RevertMintToZeroAddress() public {
        vm.expectRevert(ElementalBeastNFT.ElementalBeastNFT__ZeroAddress.selector);
        nft.mint(address(0), TOKEN_URI_1);
    }

    function test_RevertMintEmptyTokenURI() public {
        vm.expectRevert(ElementalBeastNFT.ElementalBeastNFT__EmptyTokenURI.selector);
        nft.mint(user1, "");
    }

    function test_PauseBlocksMintingOnly() public {
        vm.prank(user1);
        nft.mint(user1, TOKEN_URI_1);

        vm.prank(admin);
        nft.pause();

        // Minting reverts when paused
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(user2);
        nft.mint(user2, TOKEN_URI_2);

        // Transfers are NEVER blocked by pause
        vm.prank(user1);
        nft.transferFrom(user1, user2, 1);
        assertEq(nft.ownerOf(1), user2);

        // Unpause resumes minting
        vm.prank(admin);
        nft.unpause();

        vm.prank(user2);
        uint256 id2 = nft.mint(user2, TOKEN_URI_2);
        assertEq(id2, 2);
    }

    function test_SetDefaultRoyalty() public {
        address newReceiver = makeAddr("newRoyalty");
        uint96 newBps = 750; // 7.5%

        vm.expectEmit(true, false, false, true);
        emit DefaultRoyaltyUpdated(newReceiver, newBps);

        vm.prank(admin);
        nft.setDefaultRoyalty(newReceiver, newBps);

        (address receiver, uint256 royaltyAmount) = nft.royaltyInfo(1, 10000);
        assertEq(receiver, newReceiver);
        assertEq(royaltyAmount, 750);
    }

    function test_RevertSetDefaultRoyaltyUnauthorized() public {
        vm.expectRevert();
        vm.prank(user1);
        nft.setDefaultRoyalty(user1, 500);
    }

    function test_RevertSetDefaultRoyaltyTooHigh() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                ElementalBeastNFT.ElementalBeastNFT__RoyaltyTooHigh.selector,
                1001,
                MAX_ROYALTY_BPS
            )
        );
        vm.prank(admin);
        nft.setDefaultRoyalty(royaltyReceiver, 1001);
    }
}
