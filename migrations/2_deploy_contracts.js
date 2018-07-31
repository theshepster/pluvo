var Pluvo = artifacts.require("./Pluvo.sol");
var SimpleStorage = artifacts.require("SimpleStorage"); // TODO: REMOVE
var TutorialToken = artifacts.require("TutorialToken"); // TODO: REMOVE
var ComplexStorage = artifacts.require("ComplexStorage"); // TODO: REMOVE

// TODO: UPDATE THESE PARAMETERS BEFORE LIVENET DEPLOYMENT
const maxSupply = 100;
const evaporationRate = 1;
const evaporationDenominator = 4;
const blocksBetweenRainfalls = 1;

module.exports = function(deployer) {
  deployer.deploy(SimpleStorage); // TODO: REMOVE
  deployer.deploy(TutorialToken); // TODO: REMOVE
  deployer.deploy(ComplexStorage); // TODO: REMOVE
  deployer.deploy(
    Pluvo, 
    maxSupply, 
    evaporationRate, 
    evaporationDenominator, 
    blocksBetweenRainfalls
  );
};
