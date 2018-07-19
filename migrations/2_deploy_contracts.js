var Pluvo = artifacts.require("./Pluvo.sol");

// TODO: UPDATE THESE PARAMETERS BEFORE LIVENET DEPLOYMENT
const maxSupply = 100;
const evaporationRate = 1;
const evaporationDenominator = 4;
const blocksBetweenRainfalls = 1;

module.exports = function(deployer) {
  deployer.deploy(
    Pluvo, 
    maxSupply, 
    evaporationRate, 
    evaporationDenominator, 
    blocksBetweenRainfalls
  );
};
