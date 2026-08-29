// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {ElementalBeastNFT} from "../../src/ElementalBeastNFT.sol";
import {Marketplace} from "../../src/Marketplace.sol";

contract MarketplaceHandler is Test {
    ElementalBeastNFT public nft;
    Marketplace public marketplace;

    address public feeRecipient;
    address public royaltyReceiver;

    address[] public actors;
    uint256[] public mintedTokens;
    uint256 public totalMintedCount;

    constructor(
        ElementalBeastNFT _nft,
        Marketplace _marketplace,
        address _feeRecipient,
        address _royaltyReceiver
    ) {
        nft = _nft;
        marketplace = _marketplace;
        feeRecipient = _feeRecipient;
        royaltyReceiver = _royaltyReceiver;

        actors.push(makeAddr("actor1"));
        actors.push(makeAddr("actor2"));
        actors.push(makeAddr("actor3"));

        for (uint256 i = 0; i < actors.length; i++) {
            vm.deal(actors[i], 1_000 ether);
        }
    }

    function mint(uint256 actorSeed) external {
        address actor = actors[actorSeed % actors.length];
        vm.prank(actor);
        uint256 tokenId = nft.mint(actor, "ipfs://handler/token");
        mintedTokens.push(tokenId);
        totalMintedCount++;
    }

    function list(uint256 tokenSeed, uint256 price) external {
        if (mintedTokens.length == 0) return;
        uint256 tokenId = mintedTokens[tokenSeed % mintedTokens.length];
        address owner = nft.ownerOf(tokenId);

        // Bound price
        price = bound(price, 0.01 ether, 10 ether);

        Marketplace.Listing memory existing = marketplace.getListing(tokenId);
        if (existing.active) return;

        vm.startPrank(owner);
        nft.approve(address(marketplace), tokenId);
        marketplace.listItem(tokenId, price);
        vm.stopPrank();
    }

    function buy(uint256 tokenSeed, uint256 buyerSeed) external {
        if (mintedTokens.length == 0) return;
        uint256 tokenId = mintedTokens[tokenSeed % mintedTokens.length];

        Marketplace.Listing memory listing = marketplace.getListing(tokenId);
        if (!listing.active) return;

        address currentOwner = nft.ownerOf(tokenId);
        if (currentOwner != listing.seller) return;

        address buyer = actors[buyerSeed % actors.length];
        if (buyer == listing.seller) return; // avoid self-buy edge case in invariant test

        vm.deal(buyer, listing.price + 1 ether);
        vm.prank(buyer);
        marketplace.buyItem{value: listing.price}(tokenId);
    }

    function withdraw(uint256 actorSeed) external {
        address actor = actors[actorSeed % actors.length];
        uint256 proceeds = marketplace.getProceeds(actor);
        if (proceeds == 0) return;

        vm.prank(actor);
        marketplace.withdrawProceeds();
    }

    function getActors() external view returns (address[] memory) {
        return actors;
    }
}

contract MarketplaceInvariantTest is StdInvariant, Test {
    ElementalBeastNFT public nft;
    Marketplace public marketplace;
    MarketplaceHandler public handler;

    address public admin = makeAddr("admin");
    address public feeRecipient = makeAddr("feeRecipient");
    address public royaltyReceiver = makeAddr("royaltyReceiver");

    function setUp() public {
        vm.startPrank(admin);
        nft = new ElementalBeastNFT(admin, royaltyReceiver, 500, 1000);
        marketplace = new Marketplace(admin, address(nft), feeRecipient, 250, 1000);
        vm.stopPrank();

        handler = new MarketplaceHandler(nft, marketplace, feeRecipient, royaltyReceiver);

        targetContract(address(handler));
    }

    /**
     * @notice Invariant 10: Contract ETH balance always equals the sum of all unwithdrawn proceeds balances.
     */
    function invariant_ContractBalanceEqualsUnwithdrawnProceeds() public view {
        uint256 sumProceeds = 0;
        address[] memory actors = handler.getActors();
        for (uint256 i = 0; i < actors.length; i++) {
            sumProceeds += marketplace.getProceeds(actors[i]);
        }
        sumProceeds += marketplace.getProceeds(feeRecipient);
        sumProceeds += marketplace.getProceeds(royaltyReceiver);

        assertEq(address(marketplace).balance, sumProceeds);
    }
}
