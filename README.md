# Pluvo
## By Shep Moore-Berg
### Thesis Advisor: Scott Bradner
### Due: December 4, 2018

<p align="center">
  <img src="./src/logo.png">
</p>

Pluvo is a distributed application on Ethereum. It implements the ERC-20 token standard, with two twists:

* Rain: To get Pluvos, simply register your Ethereum address. On a periodic basis, new Pluvos rain down onto all registered addresses, allowing you to earn new Pluvos just by being registered.
* Evaporation: Periodically, all addresses that hold Pluvos see a small percentage of their Pluvos disappear. This evaporation is what feeds the rain.

To collect Pluvos after rainfalls, call the `collect` function (or the `collectRainfalls(maxCollections)` function) from a registered address. Evaporation happens automatically.

## Contract Walkthrough

### ERC-20 Public Functions

```
function totalSupply() public view returns (uint256)
```
Returns the total supply in circulation. That is, totalSupply() will return the total number of Pluvos that have entered circulation via collection of rain, less all Pluvos that have evaporated. It will always be equal to the sum of all ```balance``` amounts. However, because pending evaporation only evaporates from an account when it receives or transfers Pluvos, `totalSupply()` will typically return a value that is greater than the sum of `balanceOf()` for each account with Pluvo. See `balanceOf()` below for more details.

```
function balanceOf(address _owner) public view returns (uint256 balance) {
```
Returns the balance of Pluvos owned by `_owner`, less any pending evaporation. Evaporation only occurs from an Ethereum account when the account is the sender or recipient in a transaction; until then, the evaporation is pending. The `balanceOf()` function accounts for pending evaporation, which is unspendable, when showing the balance of the given account.

```
function transfer(address _to, uint256 _value) public returns (bool success)
```

Transfers `_value` Pluvos from the account of the message sender to the `_to` account. Behind the scenes, this function causes any pending evaporation to evaporate from the sender's and recipient's accounts.

```
function transferFrom(address _from, address _to, uint256 _value) 
public returns (bool success)
```

Transfers `_value` Pluvos from the `_from` account to the `_to` account. Checks to ensure that the message sender is allowed to send `_value` Pluvos from the `_from` account (see `approve()` and `allowance()` below). Behind the scenes, this function causes any pending evaporation to evaporate from the `_from` and `_to` accounts.

```
function approve(address _spender, uint256 _value) public returns (bool success)
```
The message sender approves `_spender` to transfer up to `_value` Pluvos from the message sender's account.

```
function allowance(address _owner, address _spender) public view returns (uint256 remaining)
```
Returns how many Pluovs `_spender` is allowed to spend from `_owner`'s account.

#### ERC-20 Public Variables with Getters

The following two arrays are public and therefore have associated getter functions:

    mapping (address => Balance) balances
    mapping (address => mapping (address => uint256)) allowed

For reference, the `Balance` struct is defined as:

    struct Balance {
        uint256 amount;
        uint256 lastEvaporationTime;
    }

The optional ERC-20 functions `name()`, `symbol()`, and `decimals()` are also available, returing "Pluvo", "PLV", and 18 respectively.

### Pluvo Public Functions

    function currentRainfallIndex() public view returns (uint256)

 Counts one more than the number of past rainfalls. This is because the rainfallPayouts array is seeded with a (0, block.timestamp) value in the constructor. (The `rainfallPayouts` array stores the amount that each registered address is allowed to collect for each periodic rainfall.) That is, this returns the index of the rainfall that is about to occur next. For example, a return value of 2 indicates that the next rainfall will be the second rainfall ever.

    function lastRainTime() public view returns (uint256)

Returns the last time when rain happened. That is, it returns the timestamp of the last block when a `Rain` struct was added to the `rainfallPayouts` array.

    function rainPerRainfallPerPerson() public view returns (uint256)

Returns the current amout of rain eligible for each registered address to collect in the next rainfall, if the next rainfall were to occur in the current block. Calculated by multiplying the maximum supply by the evaporation rate and dividing by the number of registered addresses.

    function setEvaporationRate(uint256 _evaporationNumerator, uint256 _evaporationDenominator) public onlyBy(parameterSetter)

Sets the new evaporation rate to be `_evaporationNumerator / _evaporationDenominator`. Solidity does not support floating point math, so the numerator and denominator are both integers. Only the address designated as the `parameterSetter` is allowed to invoke this function.

    function setRainfallPeriod(uint256 _secondsBetweenRainfalls) public onlyBy(parameterSetter)

Sets the new number of seconds between rainfalls. Any pending rainfalls occur before the new period is established. Only the address designated as the `parameterSetter` is allowed to invoke this function.

    function registerAddress(address _rainee) public onlyBy(registrar) returns (bool success)

Registers a new address to receive rainfall payouts. Only the address designated as the `registrar` is allowed to invoke this function. The registrar, who owns the `registrar` address, should implement separate functionality to allow users to request registration and to prevent the same person from registering multiple addresses.

    function unregisterAddress(address _rainee) public onlyBy(registrar) returns (bool success)

 Removers a registered address from the list of rainfall payout recipients. Only the address designated as the `registrar` is allowed to invoke this function. The registrar, who owns the `registrar` address, should implement functionality to allow the person who registered the address (and only that person) to unregister.

    function changeParameterSetter(address _parameterSetter) public onlyBy(parameterSetter)

The `parameterSetter` can invoke this function to select a new `parameterSetter`.

    function changeRegistrar(address _registrar) public onlyBy(registrar)

The `registrar` can invoke this function to select a new `registrar`.

    function collectRainfalls(uint256 maxCollections) public returns (uint256 fundsCollected)

Registered addresses can invoke this function to collect up to `maxCollections` of rain. `maxCollections` represents the number of rainfalls, not the amount of rain, to collect. Note that, when rainfalls occur, the registered addresses only get the rain when they collect it by calling `collectRainfalls(maxCollections)` or `collect()`.

    function collect() public returns (uint256 fundsCollected)

Registered addresses can invoke this function to collect all available rain.

    function rain() public returns (uint256 rainfallsDue) {

Causes one or more rainfalls to occur. `rain()` calculates the amount of time that has elapsed since the last rainfall, integer-divides that by the number of seconds between rainfalls, and pushes that many rainfall payouts (each one equal to the `rainPerRainfallPerPerson()`) to the `rainfallPayouts` array.

    function calculateEvaporation(address _addr) public view returns (uint256)

Returns the amount of pending evaporation from address `_addr`. Note that `_addr` does not have to be a registered address, because all addresses experience evaporation.

#### Pluvo Public Variables with Getters

The following variables are public and therefore have getter functions:

    address parameterSetter
    address registrar
    mapping (address => uint256) rainees
    Rain[] rainfallPayouts
    uint256 evaporationRate
    uint256 evaporationDenominator
    uint256 secondsBetweenRainfalls
    uint256 maxSupply
    uint256 numberOfRainees

For reference, the `Rain` struct is defined as:

    struct Rain {
        uint256 amount;
        uint256 rainTime;
    }


### Pluvo Events

    event Collection(address indexed recipient, uint256 amount)

Event emitted by the `collect()` function. Exposes the collector (`recipient`) and amount collected (`amount`).

## Contributing

Pluvo is currently in development. To play along:

``` 
git clone https://github.com/theshepster/pluvo.git
cd pluvo
npm install
```

The project uses Truffle and the Ganache-CLI, so install those (globally, if that is okay with you):
```
npm i -g truffle ganache-cli
```
The ```truffle``` command will be what you use for compiling the Solidity smart contracts, migrating them to the blockchain, and running the tests. The ```ganache-cli``` is a custom development Ethereum blockchain and will be used as the private test network.

The last prerequisite is to have MetaMask installed. Get it by either downloading the Chrome extension or downloading the Brave browser.

Once you have finished the above ```npm``` commands and installed MetaMask, it is time to get the development blockchain ready. Open a new terminal window and type:
```
ganache-cli -d
```

This command initializes the Ganache Ethereum test blockchain, which runs in the background and connects to port 8545. The ```-d``` flag ensures that the 12-word recovery mnemonic will be the same one each time you run the ```ganache-cli -d``` command, so that when you reset the network, you will get the same private keys each time.

Open up MetaMask in your browser. Click in the upper-right corner and set your network to Localhost 8545. (If that is not an option, click Custom RPC and use 8545 as the port number.)

To connect MetaMask to your Ganache private keys, from the MetaMask login screen click "Import using account seed phrase." Copy the 12-word mnemonic from the command line (which appeared immediately after you entered the `ganache-cli -d` command) into the box in MetaMask, and choose a secure password.

Now that you are logged in, you should see your first account, called Account 1, have a balance of 100 Ether. If you do not, click in the upper-right-hand corner of MetaMask and double check that your network is pointing to Localhost 8545. **Never use the Ganache-CLI accounts with any other network in MetaMask. Localhost 8545 only!**

You are ready to deploy and test Pluvo. In a terminal window within the /pluvo directory, enter the following commands in order:
```
truffle compile
truffle migrate
npm run start
```
The first command, `truffle compile`, compiles the Solidity contracts into JSON files that can be deployed to the blockchain. The compiled contracts live in the /build/contracts directory. If you make any changes to the `Pluvo.sol` file, run `truffle compile` to prepare the updated contract for deployment.

The second command, `truffle migrate`, deploys the compiled contracts to the custom ganache-cli blockchain that is running in the other terminal window. Truffle knows to deploy to the ganache-cli blockchain because in the `truffle.js` file, the development network is set to host 127.0.0.1 port 8545, which is where the ganache-cli blockchain is connected.

The last command, `npm run start`, runs the `/scripts/start.js` script. It compiles the user interface serves it up to port 3000. It uses hot-reloading, so any changes you make to the user interface will load automatically without requiring recompilation.

After several seconds, a browser window should open pointing to localhost:3000. Pluvo is yours for the testing.

#### Understanding Accounts

The GanacheCLI blockchain gives you 10 accounts. The first account will be the account that deploys the contracts to the blockchain, so you should see that, after deployment, the ETH balance of Acccount 1 is less than 100. This is because some ETH was spent to deploy the contracts. Additionally, in Pluvo, the `parameterSetter` and `registrar` addresses will be set to Account 1.

In order to play around with aditional accounts, within MetaMask click on Add Accounts. Because the ganache-cli tool uses an HD wallet, the second account that MetaMask generates for you will automatically be the second account that ganache-cli created for you, meaning it will be pre-funded with 100 ETH.