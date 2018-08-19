const Pluvo = artifacts.require("./Pluvo.sol");
const BigNumber = require('bignumber.js');
const {assertRevert, increaseTime, mineBlock} = require('./helpers.js');

contract('Pluvo', async ([owner, recipient, spender]) => {
  let pluvo;
  let elapsedTime;
  let oneCollection;

  beforeEach(async () => {
    const maxSupply = 100;
    const numerator = 1;
    const denominator = 4;
    elapsedTime = 100;
    pluvo = await Pluvo.new(maxSupply, numerator, denominator, elapsedTime);
    oneCollection = BigNumber(maxSupply * numerator / denominator);
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
      increaseTime(elapsedTime);
      await pluvo.rain();
      const supply1 = await pluvo.totalSupply();
      assert(supply1.eq(supply0));
    });

    it('should stay the same after rain with > 0 recipients', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.rain();
      const supply1 = await pluvo.totalSupply();
      assert(supply1.eq(supply0));
    });

    it('should decrease after transfer that causes evaporation', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.rain();
      await pluvo.collect({ from: owner }); // collect should not rain here
      const supply1 = await pluvo.totalSupply();
      increaseTime(elapsedTime);
      await pluvo.transfer(recipient, 15, { from: owner });
      const supply2 = await pluvo.totalSupply();
      assert(supply2.lt(supply1));
    });

    it('should not decrease after transfer that does not causes evaporation', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.rain();
      await pluvo.collect({ from: owner }); // collect should not rain here
      const supply1 = await pluvo.totalSupply();
      await pluvo.transfer(recipient, 15, { from: owner });
      const supply2 = await pluvo.totalSupply();
      assert(supply2.eq(supply1));
    });

    it('should increase after collect()', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.rain();
      await pluvo.collect({ from: owner }); // collect should not rain herere
      const supply1 = await pluvo.totalSupply();
      assert(supply1.gt(supply0));
    });
  });

  describe('balanceOf()', () => {
    let balance0;
    
    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.rain();
      await pluvo.collect({ from: owner }); // collect should not rain here
      balance0 = await pluvo.balanceOf(owner);
    });

    it('should return zero for account with no balance', async () => {
      const balance = await pluvo.balanceOf(spender);
      assert(BigNumber(0).eq(balance));
    });

    it('should increase after rain collection', () => {
      assert(balance0.gt(0));
    });

    it('should increase after receipt from transfer', async () => {
      await pluvo.transfer(recipient, 10, { from: owner });
      const recipientBalance = await pluvo.balanceOf(recipient);
      assert(recipientBalance.gt(0));
    });

    it('should decrease after sending coins', async () => {
      await pluvo.transfer(recipient, 10, { from: owner });
      const balance1 = await pluvo.balanceOf(owner);
      assert(balance1.lt(balance0));
    });

    it('should decrease over time if rain can happen', async () => {
      increaseTime(elapsedTime);
      mineBlock(); // force block to be mined
      const balance1 = await pluvo.balanceOf(owner);
      assert(balance1.lt(balance0));
    });

    it('should not decrease over short period of time (no rain)', async () => {
      const balance1 = await pluvo.balanceOf(owner);
      increaseTime(10);
      mineBlock(); // force block to be mined
      const balance2 = await pluvo.balanceOf(owner);
      assert(balance2.eq(balance1));
    });

    it('should incorporate pending evaporation', async () => {
      increaseTime(elapsedTime);
      mineBlock(); // force block to be mined
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
      assert(balance0.gt(0), "Initial balance should be positive")
      increaseTime(elapsedTime*20); // enough time to evaporate all coins
      const balance = await pluvo.balanceOf(spender);
      assert(BigNumber(0).eq(balance));
    });
  });
    
  describe('transfer()', () => {
    const to = recipient;
    
    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.rain();
      await pluvo.collect({ from: owner }); // collect should not rain here
    });

    it('reverts when sender has insufficient initial balance', async () => {
      const amount = 99;
      await assertRevert(pluvo.transfer(to, amount, { from: owner }));
    });

    it('reverts when sender has insufficient balance ' +
      'after evaporation', async () => {
      const amount = 23;
      increaseTime(elapsedTime);
      const ownerBalance = await pluvo.balanceOf(owner);
      const ownerRawBalance = BigNumber((await pluvo.balances(owner))[0]);
      assert(
        ownerBalance.lt(amount), 
        `Update test parameters; test is only useful if ownerBalance
        (currently ${ownerBalance}) is less than amount to 
        send (${amount})`
      );
      assert(
        ownerRawBalance.gt(amount), 
        `Update test parameters; test is only useful if ownerRawBalance
        (currently ${ownerRawBalance}) is greater than amount to 
        send (${amount})`
      );
      await assertRevert(pluvo.transfer(to, amount, { from: owner }));
    });

    it('evaporates from sender if enough time has passed (tested with 0 transfer)', async () => {
      const amount = 0;
      const senderBalance0 = BigNumber((await pluvo.balances(owner))[0]);
      increaseTime(elapsedTime);
      await pluvo.transfer(to, amount, { from: owner });
      const senderBalance1 = BigNumber((await pluvo.balances(owner))[0]);
      assert(
        senderBalance1.lt(senderBalance0),
        `senderBalance0 is ${senderBalance0}, 
        senderBalance1 is ${senderBalance1}`
      );
    });

    it('does not evaporate from sender if not enough time has passed (tested with 0 transfer)', async () => {
      const amount = 0;
      const senderBalance0 = BigNumber((await pluvo.balances(owner))[0]);
      increaseTime(10);
      await pluvo.transfer(to, amount, { from: owner });
      const senderBalance1 = BigNumber((await pluvo.balances(owner))[0]);
      assert(
        senderBalance1.eq(senderBalance0),
        `senderBalance0 is ${senderBalance0}, 
        senderBalance1 is ${senderBalance1}`
      );
    });

    it('evaporates from recipient if enough time has passed (tested with 0 transfer)', async () => {
      let amount = 10;
      await pluvo.transfer(to, amount, { from: owner });
      const recipientBalance0 = BigNumber((await pluvo.balances(to))[0]);
      amount = 0;
      increaseTime(elapsedTime);
      await pluvo.transfer(to, amount, { from: owner });
      const recipientBalance1 = BigNumber((await pluvo.balances(to))[0]);
      assert(
        recipientBalance1.lt(recipientBalance0),
        `recipientBalance0 is ${recipientBalance0}, 
        recipientBalance1 is ${recipientBalance1}`
      );
    });

    it('does not evaporate from recipient if not enough time has passed (tested with 0 transfer)', async () => {
      let amount = 10;
      await pluvo.transfer(to, amount, { from: owner });
      const recipientBalance0 = BigNumber((await pluvo.balances(to))[0]);
      amount = 0;
      increaseTime(10);
      await pluvo.transfer(to, amount, { from: owner });
      const recipientBalance1 = BigNumber((await pluvo.balances(to))[0]);
      assert(
        recipientBalance1.eq(recipientBalance0),
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
        recipientBalance1.minus(amount).eq(recipientBalance0),
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
        senderBalance1.plus(amount).eq(senderBalance0),
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
      increaseTime(elapsedTime);
      await pluvo.rain();
      await pluvo.collect({ from: owner }); // collect should not rain here
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
      const amount = 23;
      increaseTime(elapsedTime);
      const ownerBalance = await pluvo.balanceOf(owner);
      const ownerRawBalance = BigNumber((await pluvo.balances(owner))[0]);
      assert(
        ownerBalance.lt(amount), 
        `Update test parameters; test is only useful if ownerBalance
        (currently ${ownerBalance}) is less than amount to 
        send (${amount})`
      );
      assert(
        ownerRawBalance.gt(amount), 
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
        ownerBalance.gt(amount), 
        `Update test parameters; test is only useful if ownerBalance
        (currently ${ownerBalance}) is greater than amount to 
        send (${amount})`
      );
      assert(
        allowance.lt(amount), 
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
        ownerBalance.lt(amount), 
        `Update test parameters; test is only useful if ownerBalance
        (currently ${ownerBalance}) is less than amount to 
        send (${amount})`
      );
      assert(
        allowance.gt(amount), 
        `Update test parameters; test is only useful if allowance
        (currently ${ownerBalance}) is greater than amount to 
        send (${amount})`
      );
      await assertRevert(pluvo.transferFrom(
        owner, to, amount, { from: spender }
      ));
    });

    it('evaporates from \'from\' if enough time has passed (tested with 0 transfer)', async () => {
      const amount = 0;
      const senderBalance0 = BigNumber((await pluvo.balances(owner))[0]);
      increaseTime(elapsedTime);
      await pluvo.transferFrom(owner, to, amount, { from: spender });
      const senderBalance1 = BigNumber((await pluvo.balances(owner))[0]);
      assert(
        senderBalance1.lt(senderBalance0),
        `senderBalance0 is ${senderBalance0}, 
        senderBalance1 is ${senderBalance1}`
      );
    });

    it('does not evaporate from \'from\' if not enough time has passed (tested with 0 transfer)', async () => {
      const amount = 0;
      const senderBalance0 = BigNumber((await pluvo.balances(owner))[0]);
      increaseTime(10);
      await pluvo.transferFrom(owner, to, amount, { from: spender });
      const senderBalance1 = BigNumber((await pluvo.balances(owner))[0]);
      assert(
        senderBalance1.eq(senderBalance0),
        `senderBalance0 is ${senderBalance0}, 
        senderBalance1 is ${senderBalance1}`
      );
    });

    it('evaporates from recipient if enough time has passed (tested with 0 transfer)', async () => {
      let amount = 10;
      await pluvo.transfer(to, amount, { from: owner });
      const recipientBalance0 = BigNumber((await pluvo.balances(to))[0]);
      amount = 0;
      increaseTime(elapsedTime);
      await pluvo.transferFrom(owner, to, amount, { from: spender });
      const recipientBalance1 = BigNumber((await pluvo.balances(to))[0]);
      assert(
        recipientBalance1.lt(recipientBalance0),
        `recipientBalance0 is ${recipientBalance0}, 
        recipientBalance1 is ${recipientBalance1}`
      );
    });

    it('does not evaporate from recipient if not enough time has passed (tested with 0 transfer)', async () => {
      let amount = 10;
      await pluvo.transfer(to, amount, { from: owner });
      const recipientBalance0 = BigNumber((await pluvo.balances(to))[0]);
      amount = 0;
      increaseTime(10);
      await pluvo.transferFrom(owner, to, amount, { from: spender });
      const recipientBalance1 = BigNumber((await pluvo.balances(to))[0]);
      assert(
        recipientBalance1.eq(recipientBalance0),
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
        recipientBalance1.minus(amount).eq(recipientBalance0),
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
        senderBalance1.plus(amount).eq(senderBalance0),
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
        allowance1.plus(amount).eq(allowance0),
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
        (await pluvo.numberOfRainees()).eq(0),
        "New Pluvo should start with zero rainees"
      );
      await pluvo.registerAddress(owner, { from: owner });
      assert(
        (await pluvo.numberOfRainees()).eq(1),
        "Registering address should increase numberOfRainees by 1"
      );
    });

    it('does another address sent by registrar', async () => {
      assert(
        (await pluvo.numberOfRainees()).eq(0),
        "New Pluvo should start with zero rainees"
      );
      await pluvo.registerAddress(recipient, { from: owner });
      assert(
        (await pluvo.numberOfRainees()).eq(1),
        "Registering address should increase numberOfRainees by 1"
      );
    });

    it('should revert if not called by registrar', async () => {
      await assertRevert(pluvo.registerAddress(owner, { from: recipient }));
      assert(
        (await pluvo.numberOfRainees()).eq(0),
        "There should still be no addresses registered"
      );
    });

    it('does not register an address twice', async () => {
      assert(
        (await pluvo.numberOfRainees()).eq(0),
        "New Pluvo should start with zero rainees"
      );
      await pluvo.registerAddress(owner, { from: owner });
      await pluvo.registerAddress(owner, { from: owner });
      assert(
        (await pluvo.numberOfRainees()).eq(1),
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
        (await pluvo.numberOfRainees()).eq(1),
        "There should have been one address registered"
      );
      await pluvo.unregisterAddress(owner, { from: owner });
      assert(
        (await pluvo.numberOfRainees()).eq(0),
        "There should be no more rainees after unregistration"
      );
    });

    it('should not unregister an unregistered address', async () => {
      assert(
        (await pluvo.numberOfRainees()).eq(1),
        "There should have been one address registered"
      );
      await pluvo.unregisterAddress(spender, { from: owner });
      assert(
        (await pluvo.numberOfRainees()).eq(1),
        "There should stil be one person registered"
      );
    });

    it('should revert if not called by registrar', async () => {
      await assertRevert(pluvo.unregisterAddress(owner, { from: recipient }));
      assert(
        (await pluvo.numberOfRainees()).eq(1),
        "There should still be one address registered"
      );
    });
  });

  describe('approve() and allowance()', () => {
    const to = recipient;
    
    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.rain();
      await pluvo.collect({ from: owner }); // collect should not rain here
    });

    it('approve() sets allowance() to amount', async () => {
      const amount = 12;
      await pluvo.approve(spender, amount, { from: owner });
      const allowance = await pluvo.allowance(owner, spender);
      assert(allowance.eq(amount));
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
      assert(recipientBalance.eq(amount));
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
      increaseTime(elapsedTime);
      await pluvo.rain();
      await pluvo.registerAddress(recipient, { from: owner });
      await assertRevert(pluvo.collect({ from: recipient }));
    });

    it('emits Collection event', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.rain();
      const { logs } = await pluvo.collect({ from: owner }); // no rain
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'Collection');
      assert.equal(logs[0].args.recipient, owner);
      assert(logs[0].args.amount.eq(oneCollection));
    });

    it('collects multiple rainfalls if available', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.rain();
      increaseTime(elapsedTime);
      await pluvo.rain();
      const { logs } = await pluvo.collect({ from: owner }); // no rain
      assert(logs[0].args.amount.gt(oneCollection));
    });

    it('rains before collection, if it is past time to rain', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      // not calling rain directly; testing to see if collect() rains
      const { logs } = await pluvo.collect({ from: owner });
      assert(logs[0].args.amount.eq(oneCollection), `Should have rained. Collected ${logs[0].args.amount} but wanted to collect ${oneCollection}`);
    });

    it('evaporates stored rain', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime*2);
      const { logs } = await pluvo.collect({ from: owner }); // rains twice
      assert(logs[0].args.amount.lt(oneCollection.times(2)), `Should have collected less than twice rainfall per person due to evaporation of the first rain. Collected ${logs[0].args.amount}.`);
    });

    it('evaporates from address after collection', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.collect({ from: owner }); // rains
      increaseTime(elapsedTime);
      await pluvo.collect({ from: owner }); // rains
      const rawBalance = BigNumber((await pluvo.balances(owner))[0]);
      assert(rawBalance.lt(oneCollection.times(2)), `Should have evaporated after the second collection. Raw balance was ${rawBalance}.`);
    });

    it('increases total supply', async () => {
      const totalSupply0 = await pluvo.totalSupply();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.collect({ from: owner }); // rains
      const totalSupply1 = await pluvo.totalSupply();
      assert(totalSupply1.minus(totalSupply0).eq(oneCollection), `Total supply went up by ${totalSupply1.minus(totalSupply0)} but should have only gone up by ${oneCollection}`);
    });

    it('increases address balance by collected amount', async () => {
      const balance0 = await pluvo.balanceOf(owner);
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.collect({ from: owner }); // rains
      const balance1 = await pluvo.balanceOf(owner);
      assert(balance1.minus(balance0).eq(oneCollection), `Balance went up by ${balance1.minus(balance0)} but should have only gone up by ${oneCollection}`);
    });
  });
  
  describe('collectRainfalls()', () => {

    it('collects only the requested number of rainfalls and no more', async () => {
      const balance0 = await pluvo.balanceOf(owner);
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime*2);
      await pluvo.collectRainfalls(1, { from: owner }); // rains twice
      const balance1 = await pluvo.balanceOf(owner);
      assert(balance1.minus(balance0).lt(oneCollection), `Balance went up by ${balance1.minus(balance0)} but should have only gone up by less than ${oneCollection}, because only one rainfall was collected, which has patially evaporated`);
    });

    it('collects all available rainfalls if the requested number is greater than the available number of rainalls', async () => {
      const balance0 = await pluvo.balanceOf(owner);
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.collectRainfalls(8, { from: owner }); // rains once
      const balance1 = await pluvo.balanceOf(owner);
      assert(balance1.minus(balance0).eq(oneCollection), `Balance went up by ${balance1.minus(balance0)} but should have only gone up by exactly ${oneCollection}`);
    });
  });

  describe('rain()', () => {
    it('does not rain if not enough time has passed', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime/2);
      await pluvo.rain();
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex0.eq(rainfallIndex1), `RainfallIndex0 = ${rainfallIndex0}, it should equal RainfallIndex1 = ${rainfallIndex1}`);
    });

    it('rains if enough time has passed', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.rain();
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(1), `RainfallIndex1 = ${rainfallIndex1}, it should be one more than RainfallIndex0 = ${rainfallIndex0}`);
    });

    it('rains twice if two periods have passed', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime*2);
      await pluvo.rain();
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(2), `RainfallIndex1 = ${rainfallIndex1}, it should be two more than RainfallIndex0 = ${rainfallIndex0}`);
    });

    it('rains 18 times if 18 periods have passed', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime*18);
      await pluvo.rain();
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(18), `RainfallIndex1 = ${rainfallIndex1}, it should be 18 more than RainfallIndex0 = ${rainfallIndex0}`);
    });

    it('rains during setEvaporationRate()', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.setEvaporationRate(2,7); // should rain
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(1), `RainfallIndex1 = ${rainfallIndex1}, it should be one more than RainfallIndex0 = ${rainfallIndex0}`);
    });

    it('rains during setRainfallPeriod()', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.setRainfallPeriod(27); // should rain
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(1), `RainfallIndex1 = ${rainfallIndex1}, it should be one more than RainfallIndex0 = ${rainfallIndex0}`);
    });
    
    it('rains during registerAddress()', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.registerAddress(recipient, { from: owner }); // should rain
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(1), `RainfallIndex1 = ${rainfallIndex1}, it should be one more than RainfallIndex0 = ${rainfallIndex0}`);
    });

    it('rains during unregisterAddress()', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.unregisterAddress(owner, { from: owner }); // should rain
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(1), `RainfallIndex1 = ${rainfallIndex1}, it should be one more than RainfallIndex0 = ${rainfallIndex0}`);
    });

    it('rains during collect()', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.collect(); // should rain
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(1), `RainfallIndex1 = ${rainfallIndex1}, it should be one more than RainfallIndex0 = ${rainfallIndex0}`);
    });

    it('rains during collectRainfalls()', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.collectRainfalls(1); // should rain
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(1), `RainfallIndex1 = ${rainfallIndex1}, it should be one more than RainfallIndex0 = ${rainfallIndex0}`);
    });
  });

  describe('reasonable gas costs', () => {

    const maxGas = 150000;

    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
    });

    it('rain() gas cost is not too high', async () => {
      const { receipt } = await pluvo.rain(); // rains
      assert.isBelow(receipt.gasUsed, maxGas);
    });

    it('evaporation gas cost is not too high (tested on a 0 transfer)', async () => {
      await pluvo.collect(); // rains
      var { receipt } = await pluvo.transfer(recipient, 0);
      const gas0 = receipt.gasUsed;
      increaseTime(elapsedTime*10);
      var { receipt } = await pluvo.transfer(recipient, 0);
      const gas1 = receipt.gasUsed;
      assert.isBelow(gas1-gas0, 3000);
    });

    it('collect() without rain gas cost is not too high', async () => {
      await pluvo.rain();
      const { receipt } = await pluvo.collect(); // no rain
      assert.isBelow(receipt.gasUsed, maxGas);
    });

    it('collection of 10 previous rains gas cost is not too high', async () => {
      increaseTime(elapsedTime*10);
      await pluvo.rain();
      const { receipt } = await pluvo.collect(); // no rain
      assert.isBelow(receipt.gasUsed, maxGas);
    });

  });

  describe('rainOnce()', () => {

    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
    });

    it('does not rain if not enough time has passed', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      increaseTime(elapsedTime/2);
      await pluvo.rainOnce();
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex0.eq(rainfallIndex1), `RainfallIndex0 = ${rainfallIndex0}, it should equal RainfallIndex1 = ${rainfallIndex1}`);
    });

    it('rains if enough time has passed', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      increaseTime(elapsedTime);
      await pluvo.rainOnce();
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(1), `RainfallIndex1 = ${rainfallIndex1}, it should be one more than RainfallIndex0 = ${rainfallIndex0}`);
    });

    it('rains exactly once if multiple periods have passed', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      increaseTime(elapsedTime*4);
      await pluvo.rainOnce();
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(1), `RainfallIndex1 = ${rainfallIndex1}, it should be one more than RainfallIndex0 = ${rainfallIndex0}`);
    });

    it('prevents rain() from raining again', async () => {
      const rainfallIndex0 = await pluvo.currentRainfallIndex();
      increaseTime(elapsedTime);
      await pluvo.rainOnce();
      await pluvo.rain(); // should not rain
      const rainfallIndex1 = await pluvo.currentRainfallIndex();
      assert(rainfallIndex1.minus(rainfallIndex0).eq(1), `RainfallIndex1 = ${rainfallIndex1}, it should be one more than RainfallIndex0 = ${rainfallIndex0}`);
    });

    it('pushes the right amount onto the rainfallPayouts array', async () => {
      increaseTime(elapsedTime);
      await pluvo.rainOnce();
      const rainAmount = (await pluvo.rainfallPayouts(1))[0];
      assert(rainAmount.eq(oneCollection), `Rained ${rainAmount}, it should have rained ${oneCollection}`);
    });
  });

  describe('calculateEvaporation()', () => {

    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.collect(); // rains
    });
  
    it('returns balance if maxEvaporations exceeds balance', async () => {
      increaseTime(elapsedTime*50); // at 1/4 per elapsedTime, 50 is big enough
      const evaporated = await pluvo.calculateEvaporation(owner);
      assert(evaporated.eq(oneCollection), `Evaporated ${evaporated}, but should have only evaporaed ${oneCollection}`);
    });

    it('returns 0 if evaporationNumerator = 0', async () => {
      await pluvo.setEvaporationRate(0,5);
      increaseTime(elapsedTime*5);
      const evaporated = await pluvo.calculateEvaporation(owner);
      assert(evaporated.eq(0), `Evaporated ${evaporated}, but should have evaporated 0`);
    });
  });

  describe('fractionalExponentiation(); make the fractionalExponentiation function public to run these tests', () => {

    // let balance;
    // let rate;
    // let periods;
    // let precision;

    // async function fe() {
    //   return await pluvo.fractionalExponentiation(balance, rate, periods, true, precision);
    // }

    // async function feGas() {
    //   return await pluvo.fractionalExponentiation.estimateGas(balance, rate, periods, true, precision);
    // }

    // beforeEach(async () => {
    //   balance = 20;
    //   rate = 10;
    //   precision = 8;
    // });

    // it('returns 0 if periods are too many', async () => {
    //   periods = 50;
    //   const result = await fe();
    //   assert(result.eq(0), `Result was ${result}, but it should have been 0`);
    // });

    // it('returns one tenth one period', async () => {
    //   periods = 1;
    //   const result = await fe();
    //   assert(result.eq(18), `Result was ${result}, but it should have been 18`);
    // });

    // it('returns one hundredth one period', async () => {
    //   periods = 1;
    //   balance = 100;
    //   rate = 100;
    //   const result = await fe();
    //   assert(result.eq(99), `Result was ${result}, but it should have been 99`);
    // });

    // it('returns one millionth after one period', async () => {
    //   periods = 1;
    //   balance = 1000000;
    //   rate = 1000000;
    //   const result = await fe();
    //   assert(result.eq(999999), `Result was ${result}, but it should have been 999999`);
    // });

    // it('returns one tenth after one hundred thousand periods', async () => {
    //   periods = 100000;
    //   balance = 1000;
    //   rate = 1000000;
    //   const result = await fe();
    //   assert(result.eq(904), `Result was ${result}, but it should have been 904`);
    // });

    // it('returns one billionth after one period', async () => {
    //   periods = 1;
    //   balance = 1000000000;
    //   rate = 1000000000;
    //   const result = await fe();
    //   assert(result.eq(999999999), `Result was ${result}, but it should have been 999999999`);
    // });

    // describe('precision checks', () => {

    //   // adjust these parameters and watch output to see when it converges
    //   beforeEach(async () => {
    //     periods = 10;
    //     balance = 100;
    //     rate = 1000;
    //   });

    //   it('precision 1', async () => {
    //     precision = 1;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 2', async () => {
    //     precision = 2;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 3', async () => {
    //     precision = 3;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 4', async () => {
    //     precision = 4;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 5', async () => {
    //     precision = 5;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 6', async () => {
    //     precision = 6;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 7', async () => {
    //     precision = 7;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 8', async () => {
    //     precision = 8;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 9', async () => {
    //     precision = 9;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 10', async () => {
    //     precision = 10;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 11', async () => {
    //     precision = 11;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });

    //   it('precision 12', async () => {
    //     precision = 12;
    //     console.log(`Precision ${precision}:  Gas was ${await feGas()} and result was ${await fe()}`);
    //     assert(true);
    //   });
    // });
  });

  describe('evaporate(), make evaporate() public to run these tests', () => {

    it('updates last evaporation time', async () => {
      let lastEvapTime = (await pluvo.balances(owner))[1];
      assert(lastEvapTime.eq(0), `last evaporation time should be 0 but was actually ${lastEvapTime}`);
      await pluvo.evaporate(owner);
      lastEvapTime = (await pluvo.balances(owner))[1];
      let now = web3.eth.getBlock('pending').timestamp;
      assert(lastEvapTime.eq(now), `last evaporation time should be ${now} but was actually ${lastEvapTime}`);
    });
    
    it('does not reduce balance when no time has elapsed', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.collect({ from: owner });
      let rawBalance0 = (await pluvo.balances(owner))[0];
      await pluvo.evaporate(owner);
      let rawBalance1 = (await pluvo.balances(owner))[0];
      assert(rawBalance0.eq(rawBalance1), `raw balance 0 of ${rawBalance0} should equal raw balance 1 of ${rawBalance1}`);
    });

    it('reduces balance by same amount as calculateEvaporation() when evaporation is due', async () => {
      await pluvo.registerAddress(owner, { from: owner });
      increaseTime(elapsedTime);
      await pluvo.collect({ from: owner });
      increaseTime(elapsedTime);
      let rawBalance0 = (await pluvo.balances(owner))[0];
      let pendingEvaporation = await pluvo.calculateEvaporation(owner);
      await pluvo.evaporate(owner);
      let rawBalance1 = (await pluvo.balances(owner))[0];
      assert(rawBalance0.eq(rawBalance1.plus(pendingEvaporation)), `raw balance 0 of ${rawBalance0} should equal raw balance 1 of ${rawBalance1} plus pending evaporation of ${pendingEvaporation}`);

      increaseTime(elapsedTime*4);
      rawBalance0 = (await pluvo.balances(owner))[0];
      pendingEvaporation = await pluvo.calculateEvaporation(owner);
      await pluvo.evaporate(owner);
      rawBalance1 = (await pluvo.balances(owner))[0];
      assert(rawBalance0.eq(rawBalance1.plus(pendingEvaporation)), `raw balance 0 of ${rawBalance0} should equal raw balance 1 of ${rawBalance1} plus pending evaporation of ${pendingEvaporation} after 4 periods`);
    });
  });

  describe('lastRainTime()', () => {

    beforeEach(async () => {
      await pluvo.registerAddress(owner, { from: owner });
    });

    it('tells the time of the contract construction with no rain', async () => {
      let contractTime = BigNumber(web3.eth.getBlock('latest').timestamp);
      let lastRainTime = await pluvo.lastRainTime();
      assert(lastRainTime.eq(contractTime), `lastRainTime is ${lastRainTime}, but it should equal the contract construction time ${contractTime}`);
    });

    it('rain() increases the last rain time', async () => {
      increaseTime(elapsedTime);
      let lastRainTime0 = await pluvo.lastRainTime();
      await pluvo.rain();
      let lastRainTime1 = await pluvo.lastRainTime();
      assert(lastRainTime1.gt(lastRainTime0), `lastRainTime1 ${lastRainTime1}, should be greater than lastRainTime0 ${lastRainTime0}`);    
    });

    it('tells the time of the last rainfall payout after rain', async () => {
      let contractTime = BigNumber(web3.eth.getBlock('latest').timestamp);
      increaseTime(elapsedTime);
      await pluvo.rain();
      let lastBlockTime = contractTime.plus(BigNumber(elapsedTime));
      let lastRainTime = await pluvo.lastRainTime();
      assert(lastRainTime.minus(lastBlockTime).abs().lte(1), `lastRainTime is ${lastRainTime}, but it should equal the last block time ${lastBlockTime}. Compare with contract construction time of ${contractTime}`);    
    });
  });

  describe('currentRainfallIndex()', () => {
    it('starts out saying 1', async () => {
      const rfi = await pluvo.currentRainfallIndex();
      assert(rfi.eq(1), `rainfall index is ${rfi}, should be 1`);
    });

    it('increases to 2 after the first rainfall', async () => {
      await pluvo.registerAddress(owner);
      increaseTime(elapsedTime);
      await pluvo.rain();
      const rfi = await pluvo.currentRainfallIndex();
      assert(rfi.eq(2), `rainfall index is ${rfi}, should be 2`);
    });

    it('increases to 5 after the four rainfalls', async () => {
      await pluvo.registerAddress(owner);
      increaseTime(elapsedTime*4);
      await pluvo.rain();
      const rfi = await pluvo.currentRainfallIndex();
      assert(rfi.eq(5), `rainfall index is ${rfi}, should be 5`);
    });
  });

  describe('rainPerRainfallPerPerson()', () => {
    it('reverts if there are no registered recipients', async () => {
      await assertRevert(pluvo.rainPerRainfallPerPerson());
    });

    it('equals 0 if the evaporation numerator is 0', async () => {
      await pluvo.setEvaporationRate(0, 4);
      await pluvo.registerAddress(owner);
      const rpp = await pluvo.rainPerRainfallPerPerson();
      assert(rpp.eq(0), `should be 0, but is ${rpp}`);
    });

    it('equals maxSupply * num / denom / numRainees', async () => {
      await pluvo.registerAddress(owner);
      await pluvo.registerAddress(recipient);
      await pluvo.registerAddress(spender);
      const ms = BigNumber(await pluvo.maxSupply());
      const num = await pluvo.evaporationNumerator();
      const denom = await pluvo.evaporationDenominator();
      const rainees = await pluvo.numberOfRainees();
      const rpp = await pluvo.rainPerRainfallPerPerson();
      const should = ms.times(num).idiv(denom).idiv(rainees);
      assert(should.eq(rpp), `should be ${should}, but is ${rpp}`);
    });
  });

  describe('setEvaporationRate()', () => {
    it('reverts if denom is less than num', async () => {
      await assertRevert(pluvo.setEvaporationRate(6,4));
    });

    it('reverts if denom is 0', async () => {
      await assertRevert(pluvo.setEvaporationRate(0,0));
    });

    it('reverts if submitted by non-parameterSetter', async () => {
      await assertRevert(pluvo.setEvaporationRate(10,11, { from: spender }));
    });

    it('causes rain', async () => {
      await pluvo.registerAddress(owner);
      increaseTime(elapsedTime);
      const index0 = await pluvo.currentRainfallIndex();
      await pluvo.setEvaporationRate(1,1);
      const index1 = await pluvo.currentRainfallIndex();
      assert(index1.minus(index0).eq(1), `rainfallIndex1 ${index1} should be 1 more than rainfallIndex0 ${index0}`);
    });

    it('updates the numerator', async () => {
      await pluvo.setEvaporationRate(25,27);
      const num = await pluvo.evaporationNumerator();
      assert(num.eq(25), `numerator was ${num}, should be 25`);
    });

    it('updates the denominator', async () => {
      await pluvo.setEvaporationRate(25,27);
      const denom = await pluvo.evaporationDenominator();
      assert(denom.eq(27), `numerator was ${denom}, should be 27`);
    });
  });

  describe('setRainfallPeriod()', () => {
    it('reverts if period is 0', async () => {
      await assertRevert(pluvo.setRainfallPeriod(0));
    });

    it('reverts if called by non-parameterSetter', async () => {
      await assertRevert(pluvo.setRainfallPeriod(44, { from: spender }));
    });

    it('causes rain', async () => {
      await pluvo.registerAddress(owner);
      increaseTime(elapsedTime);
      const index0 = await pluvo.currentRainfallIndex();
      await pluvo.setRainfallPeriod(145);
      const index1 = await pluvo.currentRainfallIndex();
      assert(index1.minus(index0).eq(1), `rainfallIndex1 ${index1} should be 1 more than rainfallIndex0 ${index0}`);
    });

    it('updates the seconds between rainfalls', async () => {
      await pluvo.setRainfallPeriod(145);
      const rp = await pluvo.secondsBetweenRainfalls();
      assert(rp.eq(145), `seconds was ${rp}, should be 145`);
    });
  });

  describe('setPrecision()', () => {
    it('reverts if precision is 0', async () => {
      await assertRevert(pluvo.setPrecision(0));
    });

    it('reverts if precision is 1', async () => {
      await assertRevert(pluvo.setPrecision(1));
    });

    it('reverts if precision is 2', async () => {
      await assertRevert(pluvo.setPrecision(2));
    });

    it('reverts if set by non-parameterSetter', async () => {
      await assertRevert(pluvo.setPrecision(7, { from: spender }));
    });

    it('updates precision', async () => {
      await pluvo.setPrecision(6);
      const prec = await pluvo.precision();
      assert(prec.eq(6), `seconds was ${prec}, should be 6`);
    });
  });

  describe('changeParameterSetter()', () => {
    it('reverts if set by non-parameterSetter', async () => {
      await assertRevert(pluvo.changeParameterSetter(spender, { from: spender }));
    });

    it('updates parameterSetter', async () => {
      await pluvo.changeParameterSetter(spender);
      const ps = await pluvo.parameterSetter();
      assert.equal(ps, spender);
    });
  });

  describe('changeRegistrar()', () => {
    it('reverts if set by non-registrar', async () => {
      await assertRevert(pluvo.changeRegistrar(spender, { from: spender }));
    });

    it('updates registrar', async () => {
      await pluvo.changeRegistrar(spender);
      const ps = await pluvo.registrar();
      assert.equal(ps, spender);
    });
  });

  // describe('when contracted is first constructed', () => {
  //   it('', async () => {
  //     assert(false, 'not implemented');
  //   });
  // });

});
