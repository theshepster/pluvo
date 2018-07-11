pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Pluvo.sol";

contract TestPluvo {

    Pluvo pluvo = Pluvo(DeployedAddresses.Pluvo());

    function testName() public {
        Assert.equal(pluvo.name(), "Pluvo", "Name should be Pluvo");
    }

    function testSymbol() public {
        Assert.equal(pluvo.symbol(), "PLV", "Symbol should be PLV");
    }

    function testDecimals() public {
        Assert.equal(uint(pluvo.decimals()), uint(12), "Decimals should be 12");
    }
}