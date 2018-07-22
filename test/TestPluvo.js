const Pluvo = artifacts.require("./Pluvo.sol");
const BigNumber = require('bignumber.js');
const {assertRevert, increaseTime, mineBlock} = require('./helpers.js');

contract('Pluvo', async ([owner, recipient, spender]) => {
  let pluvo;

  beforeEach(async () => {
    const maxSupply = 100;
    const numerator = 1;
    const denominator = 4;
    const period = 1;
    pluvo = await Pluvo.new(maxSupply, numerator, denominator, period);
  });

  describe('totalSupply()', () => { 
    let supply0;

    beforeEach(async () => {
      supply0 = await pluvo.totalSupply();
    });

    it('should equal zero at construction', async () => {
      assert(BigNumber(0).eq(supply0));
    });

    it('should stay the same after rain with no recipients', async () => {
      await pluvo.rain();
      const supply1 = await pluvo.totalSupply();
      assert(supply1.eq(supply0));
    });

    it('should stay the same after rain with > 0 recipients', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      await pluvo.rain();
      const supply1 = await pluvo.totalSupply();
      assert(supply1.eq(supply0));
    });

    it('should decrease after transfer that causes evaporation', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      await pluvo.collect({ from: owner }); // rain -> collect (period = 1)
      const supply1 = await pluvo.totalSupply();
      await pluvo.transfer(recipient, 15, { from: owner });
      const supply2 = await pluvo.totalSupply();
      assert(supply2.lt(supply1));
    });

    it('should increase after collect()', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      await pluvo.collect({ from: owner }); // rain -> collect (period = 1)
      const supply1 = await pluvo.totalSupply();
      assert(supply1.gt(supply0));
    });
  });

  describe('balanceOf()', () => {
    let balance0;
    
    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
      await pluvo.collect({ from: owner }); // rain -> collect (period = 1)
      balance0 = await pluvo.balanceOf(owner);
    });

    it('should return zero for account with no balance', async () => {
      const balance = await pluvo.balanceOf(spender);
      assert(BigNumber(0).eq(balance));
    });

    it('should increase after rain collection', () => {
      assert(balance0.gt(BigNumber(0)));
    });

    it('should increase after receipt from transfer', async () => {
      await pluvo.transfer(recipient, 10, { from: owner });
      const recipientBalance = await pluvo.balanceOf(recipient);
      assert(recipientBalance.gt(BigNumber(0)));
    });

    it('should decrease after sending coins', async () => {
      await pluvo.transfer(recipient, 10, { from: owner });
      const balance1 = await pluvo.balanceOf(owner);
      assert(balance1.lt(balance0));
    });

    it('should decrease between successive rain blocks', async () => {
      await pluvo.rain(); // force block to be mined
      const balance1 = await pluvo.balanceOf(owner);
      assert(balance1.lt(balance0));
    });

    it('should not decrease between nonrain blocks', async () => {
      await pluvo.setRainfallPeriod(4, { from: owner });
      const balance1 = await pluvo.balanceOf(owner);
      await pluvo.rain(); // force block to be mined
      const balance2 = await pluvo.balanceOf(owner);
      assert(balance2.eq(balance1));
    });

    it('should incorporate pending evaporation', async () => {
      await pluvo.rain(); // force block to be mined
      const pendingEvaporation = await pluvo.calculateEvaporation(owner);
      const ownerBalance = await pluvo.balanceOf(owner);
        
      // in the below line, the [0] is to access the .amount member
      // of the Solidity Balance struct. .amount is the first member
      // of the struct.
      const ownerRawBalance = BigNumber((await pluvo.balances(owner))[0]);

      assert(
        ownerRawBalance.minus(pendingEvaporation).eq(ownerBalance),
        `ownerRawBalance is ${ownerRawBalance}, 
        ownerBalance is ${ownerBalance}, 
        pendingEvaporation is ${pendingEvaporation}`
      );
    });

    it('should return 0 when all coins have evaporated', async () => {
      assert(false, 'not implemented');
    });
  });
    
  describe('transfer()', () => {
    const to = recipient;
    
    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
      await pluvo.collect({ from: owner }); // rain -> collect (period = 1)
    });

    it('reverts when sender has insufficient initial balance', async () => {
      const amount = 99;
      await assertRevert(pluvo.transfer(to, amount, { from: owner }));
    });

    it('reverts when sender has insufficient balance ' +
      'after evaporation', async () => {
      const amount = 40;
      const ownerBalance = await pluvo.balanceOf(owner);
      const ownerRawBalance = BigNumber((await pluvo.balances(owner))[0]);
      assert(
        ownerBalance.lt(BigNumber(amount)), 
        `Update test parameters; test is only useful if ownerBalance
        (currently ${ownerBalance}) is less than amount to 
        send (${amount})`
      );
      assert(
        ownerRawBalance.gt(BigNumber(amount)), 
        `Update test parameters; test is only useful if ownerRawBalance
        (currently ${ownerRawBalance}) is greater than amount to 
        send (${amount})`
      );
      await assertRevert(pluvo.transfer(to, amount, { from: owner }));
    });

    it('evaporates from sender (tested with 0 transfer)', async () => {
      const amount = 0;
      const senderBalance0 = BigNumber((await pluvo.balances(owner))[0]);
      await pluvo.transfer(to, amount, { from: owner });
      const senderBalance1 = BigNumber((await pluvo.balances(owner))[0]);
      assert(
        senderBalance1.lt(senderBalance0),
        `senderBalance0 is ${senderBalance0}, 
        senderBalance1 is ${senderBalance1}`
      );
    });

    it('evaporates from recipient (tested with 0 transfer)', async () => {
      let amount = 10;
      await pluvo.transfer(to, amount, { from: owner });
      const recipientBalance0 = BigNumber((await pluvo.balances(to))[0]);
      amount = 0;
      await pluvo.transfer(to, amount, { from: owner });
      const recipientBalance1 = BigNumber((await pluvo.balances(to))[0]);
      assert(
        recipientBalance1.lt(recipientBalance0),
        `recipientBalance0 is ${recipientBalance0}, 
        recipientBalance1 is ${recipientBalance1}`
      );
    });

    it('receiver receives requested amount (no evaporation)', async () => {
      await pluvo.setEvaporationRate(0, 1); // pause evaporation
      const amount = 10;
      const recipientBalance0 = await pluvo.balanceOf(to);
      await pluvo.transfer(to, amount, { from: owner });
      const recipientBalance1 = await pluvo.balanceOf(to);
      assert(
        recipientBalance1.minus(BigNumber(amount)).eq(recipientBalance0),
        `recipientBalance0 is ${recipientBalance0}, 
        recipientBalance1 is ${recipientBalance1}, 
        amount to send is ${amount}`
      );
    });

    it('sender is debited transfer amount (no evaporation)', async () => {
      await pluvo.setEvaporationRate(0, 1); // pause evaporation
      const amount = 10;
      const senderBalance0 = await pluvo.balanceOf(owner);
      await pluvo.transfer(to, amount, { from: owner });
      const senderBalance1 = await pluvo.balanceOf(owner);
      assert(
        senderBalance1.plus(BigNumber(amount)).eq(senderBalance0),
        `senderBalance0 is ${senderBalance0}, 
        senderBalance1 is ${senderBalance1}, 
        amount to send is ${amount}`
      );
    });

    it('emits a transfer event', async () => {
      const amount = 10;
      const { logs } = await pluvo.transfer(to, amount, { from: owner });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'Transfer');
      assert.equal(logs[0].args.from, owner);
      assert.equal(logs[0].args.to, to);
      assert(logs[0].args.value.eq(amount));
    });
  });

  describe('transferFrom()', () => {
    const to = recipient;
    
    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
      await pluvo.collect({ from: owner }); // rain -> collect (period = 1)
      await pluvo.approve(spender, 12, { from: owner });
    });

    it('reverts when \'from\' has insufficient initial balance', async () => {
      const amount = 99;
      await assertRevert(pluvo.transferFrom(
        owner, to, amount, { from: spender }
      ));
    });

    it('reverts when \'from\' has insufficient balance ' +
      'after evaporation', async () => {
      const amount = 40;
      const ownerBalance = await pluvo.balanceOf(owner);
      const ownerRawBalance = BigNumber((await pluvo.balances(owner))[0]);
      assert(
        ownerBalance.lt(BigNumber(amount)), 
        `Update test parameters; test is only useful if ownerBalance
        (currently ${ownerBalance}) is less than amount to 
        send (${amount})`
      );
      assert(
        ownerRawBalance.gt(BigNumber(amount)), 
        `Update test parameters; test is only useful if ownerRawBalance
        (currently ${ownerRawBalance}) is greater than amount to 
        send (${amount})`
      );
      await assertRevert(pluvo.transferFrom(
        owner, to, amount, { from: spender }
      ));    
    });

    it('reverts when \'from\' has sufficient balance ' +
      'but spender is does not have sufficient approval', async () => {
      const amount = 15;
      const ownerBalance = await pluvo.balanceOf(owner);
      const allowance = await pluvo.allowance(owner, spender);
      assert(
        ownerBalance.gt(BigNumber(amount)), 
        `Update test parameters; test is only useful if ownerBalance
        (currently ${ownerBalance}) is greater than amount to 
        send (${amount})`
      );
      assert(
        allowance.lt(BigNumber(amount)), 
        `Update test parameters; test is only useful if allowance
        (currently ${ownerBalance}) is less than amount to 
        send (${amount})`
      );
      await assertRevert(pluvo.transferFrom(
        owner, to, amount, { from: spender }
      ));
    });

    it('reverts when \'from\' has insufficient balance ' +
      'but spender has sufficient approval', async () => {
      await pluvo.approve(spender, 99, { from: owner });
      const amount = 70;
      const ownerBalance = await pluvo.balanceOf(owner);
      const allowance = await pluvo.allowance(owner, spender);
      assert(
        ownerBalance.lt(BigNumber(amount)), 
        `Update test parameters; test is only useful if ownerBalance
        (currently ${ownerBalance}) is less than amount to 
        send (${amount})`
      );
      assert(
        allowance.gt(BigNumber(amount)), 
        `Update test parameters; test is only useful if allowance
        (currently ${ownerBalance}) is greater than amount to 
        send (${amount})`
      );
      await assertRevert(pluvo.transferFrom(
        owner, to, amount, { from: spender }
      ));
    });

    it('evaporates from \'from\' (tested with 0 transfer)', async () => {
      const amount = 0;
      const senderBalance0 = BigNumber((await pluvo.balances(owner))[0]);
      await pluvo.transferFrom(owner, to, amount, { from: spender });
      const senderBalance1 = BigNumber((await pluvo.balances(owner))[0]);
      assert(
        senderBalance1.lt(senderBalance0),
        `senderBalance0 is ${senderBalance0}, 
        senderBalance1 is ${senderBalance1}`
      );
    });

    it('evaporates from recipient (tested with 0 transfer)', async () => {
      let amount = 10;
      await pluvo.transfer(to, amount, { from: owner });
      const recipientBalance0 = BigNumber((await pluvo.balances(to))[0]);
      amount = 0;
      await pluvo.transferFrom(owner, to, amount, { from: spender });
      const recipientBalance1 = BigNumber((await pluvo.balances(to))[0]);
      assert(
        recipientBalance1.lt(recipientBalance0),
        `recipientBalance0 is ${recipientBalance0}, 
        recipientBalance1 is ${recipientBalance1}`
      );
    });

    it('receiver receives requested amount (no evaporation)', async () => {
      await pluvo.setEvaporationRate(0, 1); // pause evaporation
      const amount = 10;
      const recipientBalance0 = await pluvo.balanceOf(to);
      await pluvo.transferFrom(owner, to, amount, { from: spender });
      const recipientBalance1 = await pluvo.balanceOf(to);
      assert(
        recipientBalance1.minus(BigNumber(amount)).eq(recipientBalance0),
        `recipientBalance0 is ${recipientBalance0}, 
        recipientBalance1 is ${recipientBalance1}, 
        amount to send is ${amount}`
      );
    });

    it('sender is debited transfer amount (no evaporation)', async () => {
      await pluvo.setEvaporationRate(0, 1); // pause evaporation
      const amount = 10;
      const senderBalance0 = await pluvo.balanceOf(owner);
      await pluvo.transferFrom(owner, to, amount, { from: spender });
      const senderBalance1 = await pluvo.balanceOf(owner);
      assert(
        senderBalance1.plus(BigNumber(amount)).eq(senderBalance0),
        `senderBalance0 is ${senderBalance0}, 
        senderBalance1 is ${senderBalance1}, 
        amount to send is ${amount}`
      );
    });

    it('allowance is reduced by the transfer amount', async () => {
      const amount = 10;
      const allowance0 = await pluvo.allowance(owner, spender);
      await pluvo.transferFrom(owner, to, amount, { from: spender });
      const allowance1 = await pluvo.allowance(owner, spender);
      assert(
        allowance1.plus(BigNumber(amount)).eq(allowance0),
        `allowance0 is ${allowance0}, 
        allowance1 is ${allowance1}, 
        amount to send is ${amount}`
      );
    });

    it('emits a transfer event', async () => {
      const amount = 10;
      const { logs } = 
        await pluvo.transferFrom(owner, to, amount, { from: spender });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'Transfer');
      assert.equal(logs[0].args.from, owner);
      assert.equal(logs[0].args.to, to);
      assert(logs[0].args.value.eq(amount));
    });
  });

  describe('registerAddress()', () => {
    it('registers registrar sent by registrar', async () => {
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(0)),
        "New Pluvo should start with zero rainees"
      );
      await pluvo.registerAddress(owner, { from: owner });
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(1)),
        "Registering address should increase numberOfRainees by 1"
      );
    });

    it('does another address sent by registrar', async () => {
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(0)),
        "New Pluvo should start with zero rainees"
      );
      await pluvo.registerAddress(recipient, { from: owner });
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(1)),
        "Registering address should increase numberOfRainees by 1"
      );
    });

    it('should revert if not called by registrar', async () => {
      await assertRevert(pluvo.registerAddress(owner, { from: recipient }));
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(0)),
        "There should still be no addresses registered"
      );
    });

    it('does not register an address twice', async () => {
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(0)),
        "New Pluvo should start with zero rainees"
      );
      await pluvo.registerAddress(owner, { from: owner });
      await pluvo.registerAddress(owner, { from: owner });
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(1)),
        "Registering address twice should only increase rainees once"
      );
    });
  });

  describe('unregisterAddress()', () => {
    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
    });

    it('should unregister a registered address', async () => {
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(1)),
        "There should have been one address registered"
      );
      await pluvo.unregisterAddress(owner, { from: owner });
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(0)),
        "There should be no more rainees after unregistration"
      );
    });

    it('should not unregister an unregistered address', async () => {
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(1)),
        "There should have been one address registered"
      );
      await pluvo.unregisterAddress(spender, { from: owner });
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(1)),
        "There should stil be one person registered"
      );
    });

    it('should revert if not called by registrar', async () => {
      await assertRevert(pluvo.unregisterAddress(owner, { from: recipient }));
      assert(
        (await pluvo.numberOfRainees()).eq(BigNumber(1)),
        "There should still be one address registered"
      );
    });
  });

  describe('approve() and allowance()', () => {
    const to = recipient;
    
    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
      await pluvo.collect({ from: owner }); // rain -> collect (period = 1)
    });

    it('approve() sets allowance() to amount', async () => {
      const amount = 12;
      await pluvo.approve(spender, amount, { from: owner });
      const allowance = await pluvo.allowance(owner, spender);
      assert(allowance.eq(BigNumber(amount)));
    });

    it('approve() allows tranferFrom() to occur', async () => {
      await pluvo.setEvaporationRate(0, 1); // pause evaporation
      const amount = 12;
      await assertRevert(pluvo.transferFrom(
        owner, to, amount, { from: spender }
      ));
      await pluvo.approve(spender, amount, { from: owner });
      pluvo.transferFrom(owner, to, amount, { from: spender });
      const recipientBalance = await pluvo.balanceOf(recipient);
      assert(recipientBalance.eq(BigNumber(amount)));
    });
  });


  describe('collect()', () => {

    it('reverts for unregistered address', async () => {
      await assertRevert(pluvo.collect({ from: owner }));
    });

    it('reverts when there has not been rain', async () => {
      await pluvo.setRainfallPeriod(10, { from: owner });
      await pluvo.registerAddress(owner, { from: owner });
      await assertRevert(pluvo.collect({ from: owner }));
    });

    it('reverts when rain came before registration', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      await pluvo.setRainfallPeriod(10, { from: owner }); // causes rain
      await pluvo.registerAddress(recipient, { from: owner });
      await assertRevert(pluvo.collect({ from: recipient }));
    });

    it('collects multiple rainfalls if available', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      const firstRainAmt = await pluvo.rain();
      await pluvo.rain();
      const collected = await pluvo.collect({ from: owner }); // causes rain
      assert(collected.gt(firstRainAmt));
    });

    it('rains before collection, if it is past time to rain', async () => {
      assert(false, 'not implemented');
    });

    it('evaporates stored rain', async () => {
      assert(false, 'not implemented');
    });

    it('evaporates from address after collection', async () => {
      assert(false, 'not implemented');
    });

    it('increases total supply', async () => {
      assert(false, 'not implemented');
    });

    it('increases address balance by collected amount', async () => {
      assert(false, 'not implemented');
    });

    it('returns amount of funds collected', async () => {
      assert(false, 'not implemented');
    });
  });
  
  describe('collectRainfalls()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('rain()', () => {
    it('totalSupply never exceeds maximum supply', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('calculateEvaporation()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('evaporate()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('rainees getter function', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('rainfallPayouts getter function', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('evaporationRate getter function', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('blocksBetweenRainfalls getter function', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('maxSupply getter function', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('numberOfRainees getter function', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('currentRainfallIndex()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('rainPerRainfallPerPerson()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('setEvaporationRate()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('setRainfallFrequency()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('changeParameterSetter()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('changeRegistrar()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('when contracted is first constructed', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('fractionalExponentiation()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

});
