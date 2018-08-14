pragma solidity ^0.4.24;
pragma experimental "v0.5.0";

import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Pluvo is DetailedERC20("Pluvo", "PLV", 18) {
    using SafeMath for uint256;

    /*--------- CONSTANTS ---------*/
    
    uint256 constant private MAX_UINT256 = 2**256 - 1;
    
    /*--------- ERC20 Variables ---------*/
    
    struct Balance {
        uint256 amount;
        uint256 lastEvaporationTime;
    }
    
    mapping (address => Balance) public balances;
    mapping (address => mapping (address => uint256)) public allowed;
    
    /// total amount of tokens
    uint256 public totalSupply;

    /*--------- Contract Constructor ---------*/
    
    constructor (
        uint256 _maxSupply,
        uint256 _evaporationNumerator,
        uint256 _evaporationDenominator,
        uint256 _secondsBetweenRainfalls
    ) public {
        require(_evaporationDenominator >= _evaporationNumerator);
        require(_evaporationDenominator > 0);
        require(_maxSupply > 0);
        totalSupply = 0; // initialize to 0; supply will grow due to rain
        numberOfRainees = 0;  // initialize to 0; no one has registered yet
        maxSupply = _maxSupply;
        evaporationNumerator = _evaporationNumerator;
        evaporationDenominator = _evaporationDenominator;
        secondsBetweenRainfalls = _secondsBetweenRainfalls;
        rainfallPayouts.push(Rain(0, block.timestamp));
        parameterSetter = msg.sender;
        registrar = msg.sender;
    }
    
    /*--------- Modifiers ---------*/
    
    /// @notice Restrict function access to given address
    modifier onlyBy(address _account) {
        require(msg.sender == _account, "Sender unauthorized.");
        _;
    }
    
    /*--------- ERC20 Functions ---------*/
    
    /// @notice Return the total supply
    /// @return total supply
    function totalSupply() public view returns (uint256) {
        return totalSupply;
    }

    /// @notice send `_value` token to `_to` from `msg.sender`
    /// @notice first, the message sender's balance falls by 
    ///         amount evaporated since last transfer
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return Whether the transfer was successful or not
    function transfer(address _to, uint256 _value) 
        public returns (bool success) {
        // evaporate from the sender
        evaporate(msg.sender);

        // ensure enough funds are available to send
        require(balances[msg.sender].amount >= _value);
        
        // evaporate from the recipient
        evaporate(_to);
        
        // send funds
        balances[msg.sender].amount = balances[msg.sender].amount.sub(_value);
        balances[_to].amount = balances[_to].amount.add(_value);
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    /// @notice send `_value` token to `_to` from `_from` 
    ///         on the condition it is approved by `_from`
    /// @notice first, the _from address balance falls
    ///         by amount evaporated since last transfer
    /// @param _from The address of the sender
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return Whether the transfer was successful or not
    function transferFrom(address _from, address _to, uint256 _value) 
        public returns (bool success) {
        // ensure message sender is authorized to spend from the _from address
        uint256 allowance = allowed[_from][msg.sender];
        require(allowance >= _value);
        
        // evaporate from the _from address
        evaporate(_from);

        // ensure enough funds are available to send
        require(balances[_from].amount >= _value);
        
        // evaporate from the recipient
        evaporate(_to);
        
        // the _from address then pays the recipient
        balances[_from].amount = balances[_from].amount.sub(_value);
        balances[_to].amount = balances[_to].amount.add(_value);
        if (allowance < MAX_UINT256) {
            allowed[_from][msg.sender] =
                allowed[_from][msg.sender].sub(_value);
        }
        emit Transfer(_from, _to, _value);
        return true;
    }

    /// @notice Displays the address's balance, 
    ///         after evaporation has been paid.
    /// @notice This does not pay the evaporation, 
    ///         which would get paid at next transfer.
    /// @param _owner The address from which the balance will be retrieved.
    /// @return The balance as if evaporation been paid.
    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner].amount.sub(calculateEvaporation(_owner));
    }

    /// @notice `msg.sender` approves `_spender` to spend `_value` tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @param _value The amount of tokens to be approved for transfer
    /// @return Whether the approval was successful or not
    function approve(address _spender, uint256 _value) 
        public returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    /// @param _owner The address of the account owning tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @return Amount of remaining tokens allowed to spent
    function allowance(address _owner, address _spender) 
        public view returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }
    
    
    /*--------- Pluvo Variables ---------*/
    
    // address of parameter setter, for functions that require authorization
    address public parameterSetter;
    
    // registrar address, authorized to register and unregister addresses
    address public registrar;
    
    // authorized recipients of rain, 
    // mapping from address to last rainfall collected
    mapping (address => uint256) public rainees;
    
    // used to store the amount and time for each rainfall
    struct Rain {
        uint256 amount;
        uint256 rainTime;
    }
    
    // stores payout amount and time for each rainfall
    Rain[] public rainfallPayouts;
    
    // evaporationNumerator coins per evaporationDenominator evaporate per rainfall
    uint256 public evaporationNumerator; 
    uint256 public evaporationDenominator;
    
    // number of seconds between rainfall payouts
    uint256 public secondsBetweenRainfalls;

    // maximum supply ever, used for calculating rain amount
    uint256 public maxSupply;
    
    // number of addresses registered as rainees
    uint256 public numberOfRainees;
    

    /*--------- Pluvo events ---------*/

    event Collection(address indexed recipient, uint256 amount);


    /*--------- Pluvo functions ---------*/
    
    /// @notice Counts 1 more than the number of past rainfalls. This is 
    /// because the rainfallPayouts array is seeded with a (0, block.timestamp)
    /// value in the constructor.
    /// @notice That is, this returns the index of the rainfall that is about 
    /// to occur next. For example, a return value of 2 indicates that the 
    /// next rainfall will be the second rainfall ever.
    /// @return Number of past rainfalls.
    function currentRainfallIndex() public view returns (uint256) {
        return rainfallPayouts.length;
    }

    /// @notice This is guaranteed to return a value because the 
    /// rainfallPayouts array was seeded with a Rain struct in the constructor
    /// @notice Determine the last time when rain happened
    /// @return Last time when rain happened
    function lastRainTime() public view returns (uint256) {
        return rainfallPayouts[currentRainfallIndex().sub(1)].rainTime;
    }

    /// @notice Determine the total amount of rainfall due to each recipient 
    /// in the next rainfall.
    /// @return Total rainfall due in a rainfall to each registered address.
    function rainPerRainfallPerPerson() public view returns (uint256) {
        require(numberOfRainees > 0);
        return 
            maxSupply
            .mul(evaporationNumerator)
            .div(evaporationDenominator)
            .div(numberOfRainees);
    }
    
    /// @notice Set the evaporation rate numerator and denominator.
    /// @return True if evaporation rate was updated; false otherwise.
    function setEvaporationRate(
        uint256 _evaporationNumerator,
        uint256 _evaporationDenominator
    ) public onlyBy(parameterSetter) {
        require(_evaporationDenominator >= _evaporationNumerator);
        require(_evaporationDenominator > 0);
        rain();
        evaporationNumerator = _evaporationNumerator;
        evaporationDenominator = _evaporationDenominator;
    }
    
    /// @notice Set the rainfall period, in seconds between rainfalls.
    /// @notice Will rain if a rain is due given the current 
    /// secondsBetweenRainfalls.
    function setRainfallPeriod(uint256 _secondsBetweenRainfalls) 
        public onlyBy(parameterSetter) {
        require(_secondsBetweenRainfalls > 0);
        rain();
        secondsBetweenRainfalls = _secondsBetweenRainfalls;
    }
    
    /// @notice Register an address as an available rainee.
    /// @notice This function causes a rainfall before registration, if enough 
    /// time has elapsed.
    /// @notice Note that this does not yet check for authorization.
    /// @param _rainee The address to register
    /// @return True if the address was registered, false if the address was 
    /// already registered
    function registerAddress(address _rainee) 
        public onlyBy(registrar) returns (bool success) {
        if (rainees[_rainee] == 0) {
            rain(); // rain first, if enough time has elapsed
            rainees[_rainee] = currentRainfallIndex();
            numberOfRainees = numberOfRainees.add(1);
            return true;
        }
        return false;
    }
    
    /// @notice Unregister an address, making it no longer an available rainee.
    /// @notice This function causes a rainfall before unregistration,
    /// if enough time has elapsed.
    /// @notice Note that this does not yet check for authorization.
    /// @param _rainee The address to unregister
    /// @return True if the address was unregistered, 
    /// false if the address was already unregistered
    function unregisterAddress(address _rainee) 
        public onlyBy(registrar) returns (bool success) {
        if (rainees[_rainee] > 0) {
            rain(); // rain first, if enough time has elapsed
            delete rainees[_rainee];
            numberOfRainees = numberOfRainees.sub(1);
            return true;
        }
        return false;
    }
    
    /// @notice Changes the parameterSetter
    function changeParameterSetter(address _parameterSetter) 
        public onlyBy(parameterSetter) {
        parameterSetter = _parameterSetter;
    }

    /// @notice Changes the registrar
    function changeRegistrar(address _registrar) public onlyBy(registrar) {
        registrar = _registrar;
    }
    
    /// @notice Increase message sender's balance by amount of available rain.
    /// @notice Requires that message sender is authorized.
    /// @notice Collection first performs any evaporation.
    /// @notice This function allows user to specify the maximum number of
    /// rainfalls to collect, thereby saving gas if there are many rainfalls
    /// to collect.
    /// @param maxCollections maximum number of rainfalls to collect
    /// @return Amount collected.
    function collectRainfalls(uint256 maxCollections) 
        public returns (uint256 fundsCollected) {
        // ensure message sender is authorized
        require(rainees[msg.sender] > 0);

        // ensure the sender wants to collect rain
        require(maxCollections > 0);

        // rain, if necessary
        rain(); // rain() only rains if enough time has elapsed
        
        // ensure there is rain to be collected by the user
        uint256 currentRainfallOfSender = rainees[msg.sender];
        uint256 currentRainfall = currentRainfallIndex();
        require(currentRainfall > currentRainfallOfSender);

        // determine upper limit of rainfalls to collect
        uint256 upperLimit;
        if (currentRainfall.sub(currentRainfallOfSender) > maxCollections)
            upperLimit = currentRainfallOfSender + maxCollections;
        else
            upperLimit = currentRainfall;

        // calculate amount available to collect
        // subtract evaporation before collection
        for (uint256 i = currentRainfallOfSender; i < upperLimit; i++) {
            uint256 amt = rainfallPayouts[i].amount;
            uint256 time = rainfallPayouts[i].rainTime;
            fundsCollected = 
                fundsCollected.add(amt).sub(calculateEvaporation(amt, time));
        }

        // evaporate from message sender
        // if current balance is zero, this updates the address's 
        // lastEvaporationTime to the current time
        evaporate(msg.sender);
        
        // pay collection to recipient
        balances[msg.sender].amount = 
            balances[msg.sender].amount.add(fundsCollected);
        
        // update recipient's last rainfall collection index
        rainees[msg.sender] = upperLimit;

        // update total supply
        totalSupply = totalSupply.add(fundsCollected);

        // emit event so web3.js can see what happened
        emit Collection(msg.sender, fundsCollected);

        // implied: return fundsCollected;
    }

    /// @notice Increase message sender's balance by amount of available rain.
    /// @notice Requires that message sender is authorized.
    /// @notice Collection first performs any evaporation.
    /// @return Amount collected.
    function collect() public returns (uint256 fundsCollected) {
        return collectRainfalls(MAX_UINT256);
    }

    /// @notice Calculate number of rainfalls due if rain() gets called
    /// @return rainfallsDue Number of rainfalls due in next rain()
    function rainfallsDue() public view returns (uint256) {
        return block.timestamp.sub(lastRainTime()).div(secondsBetweenRainfalls);
    }

    /// @notice Store one rainfall payout, without error checking
    function rainOnceForce() private {
        rainfallPayouts.push(
            Rain(
                rainPerRainfallPerPerson(), 
                secondsBetweenRainfalls.add(lastRainTime())
            )
        );
    }

    /// @notice Store one rainfall payout.
    /// @notice Addresses can call this function to store one rainfall payout
    /// if calling rain() would cost too much gas (e.g., if it has been many
    /// periods since the last rainfall)
    function rainOnce() public {
        if (numberOfRainees > 0 && rainfallsDue() > 0)
            rainOnceForce();
    }

    /// @notice Store rainfall payout(s) due since last rainfall.
    /// @notice If multiple rainfalls should have occurred, store the rain 
    /// from each of them.
    function rain() public {
        if (numberOfRainees > 0) {
            uint256 maxRainfalls = rainfallsDue();
            for (uint256 i = 1; i <= maxRainfalls; i++)
                rainOnceForce();
        }
    }
    
    /// @notice Calculates evaporation amount for a given balance and time
    /// without evaporating.
    /// @notice chain-weights the per-rainfall evaporation rate so evaporation
    /// will not be > 100%
    /// @param balance amount of coins to evaporate
    /// @param lastTime last time when evaporation occurred
    function calculateEvaporation(
        uint256 balance, 
        uint256 lastTime
    ) private view returns (uint256) {
        require(block.timestamp >= lastTime);
        if (evaporationNumerator == 0)
            return 0;
        
        uint256 elapsedEvaporations = 
            block.timestamp.sub(lastTime).div(secondsBetweenRainfalls);

        uint256 q = evaporationDenominator.div(evaporationNumerator);
        uint256 precision = 8; // higher precision costs more gas
        uint256 maxEvaporation = 
            balance.sub( 
                fractionalExponentiation(
                    balance, q, elapsedEvaporations, true, precision
                )
            );
        if (maxEvaporation > balance)
            return balance;
        else
            return maxEvaporation;
    }

    /// @notice Calculates evaporation amount for a given address,
    /// without evaporating.
    /// @notice chain-weights the per-rainfall evaporation rate
    /// so evaporation will not be > 100%
    /// @param _addr address from which to calcuate evaporation
    function calculateEvaporation(address _addr) 
        public view returns (uint256) {
        return calculateEvaporation(
            balances[_addr].amount,
            balances[_addr].lastEvaporationTime
        );
    }

    
    /// @notice Evaporate coins for a given address.
    /// @notice Only evaporate in the same block as rain.
    /// @param _addr address from which to perform evaporation
    function evaporate(address _addr) private {
        // for a zero balance, just update the lastEvaporationTime
        if (balances[_addr].amount == 0)
            balances[_addr].lastEvaporationTime = lastRainTime();
        
        // for positive balances, evaporate coins and update 
        // the lastEvaporationTime,
        // but only do so if evaporation amount is positive
        else {
            // this assert must be true for positive balances
            assert(balances[_addr].lastEvaporationTime > 0); 
            uint256 evaporation = calculateEvaporation(_addr);
            if (evaporation > 0) {
                balances[_addr].amount = 
                    balances[_addr].amount.sub(evaporation); // pay evaporation
                balances[_addr].lastEvaporationTime = lastRainTime();
                totalSupply = totalSupply.sub(evaporation);
            }
        }
    }
    
    
    /*--------- Math Functions ---------*/
    
    /// @notice Computes `k * (1+1/q) ^ n`, with precision `p`, for b = false
    /// @notice Computes `k * (1-1/q) ^ n`, with precision `p`, for b = true
    /// @notice Small values of p get a close approimation
    /// @param k coefficient
    /// @param q divisor (e.g., for 1.02^n, q = 50)
    /// @param n exponent
    /// @param b negative toggle (e.g., b = true for 0.99^n,
    /// b = false for 1.01^n)
    /// @param p precision parameter. (p ~ log(n) is usually enough). 
    /// Higher p costs more gas
    /// @return result of computation (k * (1 ± 1/q) ^ n)
    function fractionalExponentiation(uint k, uint q, uint n, bool b, uint p) 
        private pure returns (uint) {
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
        if (s > k)
            return 0;
        else
            return s;
    }
    
    // TODO: DELETE THIS FOR PRODUCTION
    function blockTime() public view returns (uint256) {
        return block.timestamp;
    }
}
