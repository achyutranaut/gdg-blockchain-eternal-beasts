// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {ElementalBeastNFT} from "../src/ElementalBeastNFT.sol";
import {Marketplace} from "../src/Marketplace.sol";

contract DeployScript is Script {
    function run() external returns (ElementalBeastNFT nft, Marketplace marketplace) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);
        address royaltyReceiver = vm.envOr("ROYALTY_RECEIVER", deployer);

        uint96 defaultRoyaltyBps = 500; // 5%
        uint96 maxRoyaltyBps = 1000;    // 10%
        uint96 initialFeeBps = 250;     // 2.5%
        uint96 maxFeeBps = 1000;        // 10%

        console2.log("Deploying contracts with deployer:", deployer);
        console2.log("Fee recipient:", feeRecipient);
        console2.log("Royalty receiver:", royaltyReceiver);

        vm.startBroadcast(deployerPrivateKey);

        nft = new ElementalBeastNFT(
            deployer,
            royaltyReceiver,
            defaultRoyaltyBps,
            maxRoyaltyBps
        );
        console2.log("ElementalBeastNFT deployed at:", address(nft));

        marketplace = new Marketplace(
            deployer,
            address(nft),
            feeRecipient,
            initialFeeBps,
            maxFeeBps
        );
        console2.log("Marketplace deployed at:", address(marketplace));

        vm.stopBroadcast();
    }
}
