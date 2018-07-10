pragma solidity ^0.4.24;

// Abstract contract for the full ERC 20 Token standard
contract EIP20Interface {
    /* This is a slight change to the ERC20 base standard.
    function totalSupply() constant returns (uint256 supply);
    is replaced with:
    uint256 public totalSupply;
    This automatically creates a getter function for the totalSupply.
    This is moved to the base contract since public getter functions are not
    currently recognised as an implementation of the matching abstract
    function by the compiler.
    */
    /// total amount of tokens
    uint256 public totalSupply;

    /// @param _owner The address from which the balance will be retrieved
    /// @return The balance
    function balanceOf(address _owner) public view returns (uint256 balance);

    /// @notice send `_value` token to `_to` from `msg.sender`
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return Whether the transfer was successful or not
    function transfer(address _to, uint256 _value) public returns (bool success);

    /// @notice send `_value` token to `_to` from `_from` on the condition it is approved by `_from`
    /// @param _from The address of the sender
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return Whether the transfer was successful or not
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success);

    /// @notice `msg.sender` approves `_spender` to spend `_value` tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @param _value The amount of tokens to be approved for transfer
    /// @return Whether the approval was successful or not
    function approve(address _spender, uint256 _value) public returns (bool success);

    /// @param _owner The address of the account owning tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @return Amount of remaining tokens allowed to spent
    function allowance(address _owner, address _spender) public view returns (uint256 remaining);

    // solhint-disable-next-line no-simple-event-func-name
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}

contract Pluvo is EIP20Interface {
    
    /*--------- CONSTANTS ---------*/
    
    uint256 constant private MAX_UINT256 = 2**256 - 1;
    
    /*--------- ERC20 Variables ---------*/
    
    struct Balance {
        uint256 amount;
        uint256 lastEvaporationBlock;
    }
    
    mapping (address => Balance) public balances;
    mapping (address => mapping (address => uint256)) public allowed;

    // The following variables are optional in ERC20
    string public name;
    uint8 public decimals;
    string public symbol;
    
    
    /*--------- ERC20 Functions ---------*/
    
    /// @notice send `_value` token to `_to` from `msg.sender`
    /// @notice first, the message sender's balance falls by amount evaporated since last transfer
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return Whether the transfer was successful or not
    function transfer(address _to, uint256 _value) public returns (bool success) {
        // evaporate from the sender
        evaporate(msg.sender);

        // ensure enough funds are available to send
        require(balances[msg.sender].amount >= _value);
        
        // evaporate from the recipient
        evaporate(_to);
        
        // send funds
        balances[msg.sender].amount -= _value;
        balances[_to].amount += _value;
        emit Transfer(msg.sender, _to, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    /// @notice send `_value` token to `_to` from `_from` on the condition it is approved by `_from`
    /// @notice first, the _from address balance falls by amount evaporated since last transfer
    /// @param _from The address of the sender
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return Whether the transfer was successful or not
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        // ensure the message sender is authorized to spend coins from the _from address
        uint256 allowance = allowed[_from][msg.sender];
        require(allowance >= _value);
        
        // evaporate from the _from address
        evaporate(_from);

        // ensure enough funds are available to send
        require(balances[_from].amount >= _value);
        
        // evaporate from the recipient
        evaporate(_to);
        
        // the _from address then pays the recipient
        balances[_to].amount += _value;
        balances[_from].amount -= _value;
        if (allowance < MAX_UINT256) {
            allowed[_from][msg.sender] -= _value;
        }
        emit Transfer(_from, _to, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    /// @notice Displays the address's balance, after evaporation has been paid.
    /// @notice This does not pay the evaporation, which would get paid at next transfer.
    /// @param _owner The address from which the balance will be retrieved.
    /// @return The balance as if evaporation been paid.
    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner].amount - calculateEvaporation(_owner);
    }

    /// @notice `msg.sender` approves `_spender` to spend `_value` tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @param _value The amount of tokens to be approved for transfer
    /// @return Whether the approval was successful or not
    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    /// @param _owner The address of the account owning tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @return Amount of remaining tokens allowed to spent
    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }
    
    
    /*--------- Pluvo Variables ---------*/

    // authorized recipients of rain, mapping from address to last rainfall collected
    mapping (address => uint256) public rainees;
    
    // used to store the amount and block number for each rainfall
    struct Rain {
        uint256 amount;
        uint256 block;
    }
    
    // stores payout amount and block number for each rainfall
    Rain[] public rainfallPayouts;
    
    // integer number representing coins evaporated per trillion coins per block
    uint256 public evaporationRate; 
    uint256 constant private EVAPORATION_DEMONINATOR = 1e12;

    
    /* number of blocks between rainfall payouts
     * this state variable exists to lessen number of contract calls that happen
     * when people collect their rain.
     */
    uint256 public blocksBetweenRainfalls;

    // maximum supply ever, used for calculating rain amount
    uint256 public maxSupply;
    
    // number of addresses registered as rainees
    uint256 public numberOfRainees;
    

    /*--------- Pluvo functions ---------*/
    
    /// @notice Counts 1 more than the number of past rainfalls. This is because the rainfallPayouts array is seeded with a (0, block.number) value in the constructor.
    /// @notice That is, this returns the index of the rainfall that is about to occur next. For example, a return value of 2 indicates that the next rainfall will be the second rainfall ever.
    /// @return Number of past rainfalls.
    function currentRainfallIndex() public view returns (uint256) {
        return rainfallPayouts.length;
    }
    
    /// @notice Determine the total amount of rain per block.
    /// @return Total rainfall per block.
    function rainfallPerBlock() public view returns (uint256) {
        return maxSupply * evaporationRate / EVAPORATION_DEMONINATOR;
    }
    
    /// @notice Set the evaporation rate, in coins per block per trillion coins.
    /// @return True if evaporation rate was updated; false otherwise.
    /// TODO: Enable authorization so only contract owner (or via proper governance) can update.
    function setEvaporationRate(uint256 newEvaporationRate) public returns (bool success) {
        evaporationRate = newEvaporationRate;
        return true;
    }
    
    /// @notice Set the rainfall frequency, in minimum number of blocks between rainfalls.
    /// @return True if rainfall frequency was updated; false otherwise.
    /// TODO: Enable authorization so only contract owner (or via proper governance) can update.
    function setRainfallFrequency(uint256 newFrequency) public returns (bool success) {
        blocksBetweenRainfalls = newFrequency;
        return true;
    }
    
    // TODO: Create API for authorization, so that not any message sender can activate this.
    /// @notice Register an address as an available rainee.
    /// @notice This function causes a rainfall before registration, if enough time has elapsed.
    /// @notice Note that this does not yet check for authorization.
    /// @param _rainee The address to register
    /// @return True if the address was registered, false if the address was already registered
    function registerAddress(address _rainee) public returns (bool success) {
        if (rainees[_rainee] == 0) {
            rain(); // rain first, if enough time has elapsed
            rainees[_rainee] = currentRainfallIndex();
            numberOfRainees++;
            return true;
        }
        return false;
    }
    
    // TODO: Create API for authorization, so that not any message sender can activate this.
    /// @notice Unregister an address, making it no longer an available rainee.
    /// @notice This function causes a rainfall before unregistration, if enough time has elapsed.
    /// @notice Note that this does not yet check for authorization.
    /// @param _rainee The address to unregister
    /// @return True if the address was unregistered, false if the address was already unregistered
    function unregisterAddress(address _rainee) public returns (bool success) {
        if (rainees[_rainee] > 0) {
            rain(); // rain first, if enough time has elapsed
            delete rainees[_rainee];
            numberOfRainees--;
            return true;
        }
        return false;
    }
    
    /// @notice Increase message sender's balance by amount of available rain.
    /// @notice Requires that message sender is authorized.
    /// @notice Collection first performs any evaporation.
    /// @return Amount collected.
    function collect() public returns (uint256 fundsCollected) {
        // ensure message sender is authorized
        require(rainees[msg.sender] > 0);

        // rain, if necessary
        rain(); // rain() only rains if enough time has elapsed
        
        // ensure there is rain to be collected by the user
        uint256 currentRainfallOfSender = rainees[msg.sender];
        uint256 currentRainfall = currentRainfallIndex();
        require(currentRainfall > currentRainfallOfSender);

        // calculate amount available to collect
        for (uint256 i = currentRainfallOfSender; i < currentRainfall; i++)
            fundsCollected += rainfallPayouts[i].amount;

        // evaporate from message sender
        // if current balance is zero, this updates the address's 
        // lastEvaporationBlock to the current block number
        evaporate(msg.sender);
        
        // pay collection to recipient
        balances[msg.sender].amount += fundsCollected;
        
        // update recipient's last rainfall collection index
        rainees[msg.sender] = currentRainfall;

        // implied: return fundsCollected;
    }
    
    /// @notice Store rainfall payout.
    /// @return True if enough time had elapsed since last rainfall.
    function rain() public {
        // note that rainfallPayouts[currentRainfallIndex() - 1] is guaranteed
        // to return a value because the rainfallPayouts array was seeded with
        // a Rain struct in the contract constructor
        uint256 lastRainBlock = rainfallPayouts[currentRainfallIndex() - 1].block;
        uint256 elapsedBlocks = block.number - lastRainBlock;
        
        // rain if enough time has elapsed and there are rainees
        if (elapsedBlocks >= blocksBetweenRainfalls && numberOfRainees > 0) {
            // determine rainfall total
            uint256 totalRain = rainfallPerBlock() * elapsedBlocks;

            // determine checkpoint
            uint256 checkpoint = lastRainBlock + blocksBetweenRainfalls;
            
            // store per-person rainfall amount
            // note that this does not store the current block number, but rather the lastRainBlock plus the number of blocks between rainfalls (i.e., the checkpoint). This is safe, because it is guaranteed that the number of rainees in the current block is equal to the number of rainees that existed at the checkpoint. This guarantee exists because rain is forced in the registerAddress() and unregisterAddress() functions.
            rainfallPayouts.push(Rain(totalRain/numberOfRainees, checkpoint));
            
            // update total supply
            totalSupply += totalRain;
            
            // rain again, if necessary
            rain();
        }
    }
    
    /// @notice Calculates evaporation amount for a given address, without evaporating.
    /// @notice chain-weights the per-block evaporation rate so evaporation will not be > 100%
    /// @param _addr address from which to calcuate evaporation
    function calculateEvaporation(address _addr) public view returns (uint256) {
        uint256 elapsedBlocks = block.number - balances[_addr].lastEvaporationBlock;
        //return balances[_addr].amount * (1 - (1 - evaporationRate / EVAPORATION_DEMONINATOR)**elapsedBlocks);
        uint256 k = balances[_addr].amount;
        uint256 q = EVAPORATION_DEMONINATOR / evaporationRate;
        uint256 precision = 8; // higher precision costs more gas
        return k - fractionalExponentiation(k, q, elapsedBlocks, true, precision);
    }
    
    /// @notice Evaporate coins for a given address.
    /// @param _addr address from which to perform evaporation
    function evaporate(address _addr) private {
        // for a zero balance, just update the lastEvaporationBlock
        if (balances[_addr].amount == 0)
            balances[_addr].lastEvaporationBlock = block.number;
        
        // for positive balances, evaporate coins and update lastEvaporationBlock
        // but only do so if evaporation amount is positive
        else {
            assert(balances[_addr].lastEvaporationBlock > 0); // must be true for positive balances
            uint256 evaporation = calculateEvaporation(_addr);
            if (evaporation > 0) {
                balances[_addr].amount -= evaporation; // pay evaporation
                balances[_addr].lastEvaporationBlock = block.number; // update to current block
            }
        }
    }
    
    
    /*--------- Contract Constructor ---------*/
    
    constructor () public {
        totalSupply = 0; // initialize to 0; supply will grow due to rain
        maxSupply = 10e12; // 12**24 would be better
        numberOfRainees = 0;
        name = "Pluvo";
        decimals = 12;
        symbol = "PLV";
        evaporationRate = 12**4; // 4.266%/year evaporation @ 15 second block intervals
        blocksBetweenRainfalls = 1; // 40320 would be 7 days @ 15 second block intervals
        rainfallPayouts.push(Rain(0, block.number));
    }
    
    
    /*--------- Math Functions ---------*/
    
    /// @notice Computes `k * (1+1/q) ^ n`, with precision `p`, for b = false
    /// @notice Computes `k * (1-1/q) ^ n`, with precision `p`, for b = true
    /// @notice Small values of p get a close approimation
    /// @param k coefficient
    /// @param q divisor (e.g., for 1.02^n, q = 100)
    /// @param n exponent
    /// @param b negative toggle (e.g., b = true for 0.99^n, b = false for 1.01^n)
    /// @param p precision parameter. (p ~ log(n) is usually enough). Higher p costs more gas
    /// @return result of computation (k * (1 ± 1/q) ^ n)
    function fractionalExponentiation(uint k, uint q, uint n, bool b, uint p) private pure returns (uint) {
        uint s = 0;
        uint N = 1;
        uint B = 1;
        for (uint i = 0; i < p; ++i) {
            uint256 update = k * N / B / (q**i);
            if (b && i % 2 == 1)
                s -= update;
            else
                s += update;
            N = N * (n-i);
            B = B * (i+1);
        }
        return s;
    }
    
    // TODO: DELETE THIS FOR PRODUCTION
    function blockNumber() public view returns (uint256){
        return block.number;
    }
    
}