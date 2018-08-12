# Pluvo
## By Shep Moore-Berg
### Thesis Advisor: Scott Bradner
### Due: December 4, 2018

![Pluvo](./src/logo.png)

Pluvo is a distributed application on Ethereum. It implements the ERC-20 token standard, with two twists:
* Rain: To get Pluvos, simply register your Ethereum address. On a periodic basis, new Pluvos rain down onto all registered addresses, allowing you to earn new Pluvos just by being registered.
* Evaporation: Periodically, all addresses that hold Pluvos see a small percentage of their Pluvos disappear. This evaporation is what feeds the rain.

## Contract Walkthrough

### ERC-20 Public Functions

```
function totalSupply() public view returns (uint256)
```
Returns the total supply in circulation. That is, totalSupply() will return the total number of Pluvos that have entered circulation via collection of rain, less all Pluvos that have evaporated. It will always be equal to the sum of all ```balance``` amounts. However, because pending evaporation only evaporates from an account when it receives or transfers Pluvos, `totalSupply()` will typically return a value that is greater than the sum of `balanceOf()` for each account with Pluvo. See below.

```
function balanceOf(address _owner) public view returns (uint256 balance) {
```
Returns the balance of Pluvos owned `_owner`, less any pending evaporation. Evaporation only occurs from an Ethereum account when the account is the sender or recipient in a transaction; until then, the evaporation is merely pending. The `balanceOf()` function accounts for pending evaporation, which is unspendable, when showing the balance of the given account.

```
function transfer(address _to, uint256 _value) public returns (bool success)
```

Transfers `_value` Pluvo from the account of the message sender to the `_to` account. Behind the scenes, this function causes any pending evaporation to evaporate from the sender's and recipient's accounts.

```
function transferFrom(address _from, address _to, uint256 _value) 
public returns (bool success)
```

Transfers `_value` Pluvos from the `_from` account to the `_to` account. Checks to ensure that the message sender is allowed to send `_value` Pluvos from the `_from` account (see `approve()` and `allowance()` below). Behind the scenes, this function causes any pending evaporation to evaporate from the `_from` and `_to` accounts.

```
function approve(address _spender, uint256 _value) public returns (bool success)
```
The message sender approves `_spender` to transfer up to `_value` Pluvos from the message spender's account.

```
function allowance(address _owner, address _spender) public view returns (uint256 remaining)
```
Return how many Pluovs `_spender` is allowed to spend from `_owner`'s account.

The optional ERC-20 functions `name()`, `symbol()`, and `decimals()` are also available, returing "Pluvo", "PLV", and 18 respectively.

### Pluvo Public Functions

TODO

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

That command initializes the Ganache Ethereum test blockchain and sets it to run in the background on port 8545. The ```-d``` flag ensures that the 12-word recovery mnemonic will be the same one each time you run the ```ganache-cli -d``` command, so that when you reset the network, you will get the same private keys each time.

Open up MetaMask in your browser. Click in the upper-right corner and set your network to Localhost 8545. (If that is not an option, click Custom RPC and use 8545 as the port number.)

To connect MetaMask to your Ganache private keys, from the MetaMask login screen click "Import using account seed phrase." Copy the 12-word mnemonic from the command line into the box in MetaMask, and choose a secure password.

Now that you are logged in, you should see your first account, called Account 1, have a balance of 100 Ether. If you do not, click in the upper-right-hand corner of MetaMask and double check that your network is pointing to Localhost 8545. **Never use the Ganache-CLI accounts with any other network. Localhost 8545 only!**

You are ready to deploy and test Pluvo. In a terminal window within the /pluvo directory, enter the following commands in order:
```
truffle compile
truffle migrate
npm run start
```
The first command, `truffle compile`, compiles the Solidity contracts into JSON files that can be deployed to the blockchain. The compiled contracts live in the /build/contracts directory.

The second command, `truffle migrate`, deploys the compiled contracts to the custom ganache-cli blockchain that is running in the other terminal window. Truffle knows to deploy to the ganache-cli blockchain because in the `truffle.js` file, the development network is set to host 127.0.0.1 port 8545, which is where the ganache-cli blockchain is connected.

The last command, `npm run start`, runs the `/scripts/start.js` script. It compiles the user interface serves it up to port 3000. It uses hot-reloading, so any changes you make to the user interface will load automatically without requiring recompilation.

After several seconds, a browser window should open pointing to localhost:3000. Pluvo is yours for the testing.