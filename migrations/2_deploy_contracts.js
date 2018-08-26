var Pluvo = artifacts.require("./Pluvo.sol");

// TODO: UPDATE THESE PARAMETERS BEFORE LIVENET DEPLOYMENT
const maxSupply = 100;
const evaporationNumerator = 1;
const evaporationDenominator = 10;
const secondsBetweenRainfalls = 30;

module.exports = function(deployer) {
  deployer.deploy(
    Pluvo, 
    maxSupply, 
    evaporationNumerator, 
    evaporationDenominator, 
    secondsBetweenRainfalls
  );
};
