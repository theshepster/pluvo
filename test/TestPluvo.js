const Pluvo = artifacts.require("./Pluvo.sol");
const BigNumber = require('bignumber.js');

async function assertRevert(promise) {
  try {
    await promise;
    assert.fail('Expected revert not received');
  } catch (error) {
    const revertFound = error.message.search('revert') >= 0;
    assert(revertFound, `Expected "revert", got ${error} instead`);
  }
}

contract('Pluvo', async ([owner, recipient, anotherAccount]) => {
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
      const balance = await pluvo.balanceOf(anotherAccount);
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

    it('should decrease between successive blocks', async () => {
      await pluvo.rain(); // force block to be mined
      const balance1 = await pluvo.balanceOf(owner);
      assert(balance1.lt(balance0));
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
        `
          ownerRawBalance is ${ownerRawBalance}, 
          ownerBalance is ${ownerBalance}, 
          pendingEvaporation is ${pendingEvaporation}
        `
      );
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
        send (${amount})
        `)
      assert(
        ownerRawBalance.gt(BigNumber(amount)), 
        `Update test parameters; test is only useful if ownerRawBalance
        (currently ${ownerRawBalance}) is greater than amount to 
        send (${amount})
        `)
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
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('approve()', () => {
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('allowance()', () => {
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

  describe('registerAddress()', () => {
    let pluvo;

    beforeEach(async () => {
      const maxSupply = 100;
      const numerator = 1;
      const denominator = 4;
      const period = 1;
      pluvo = await Pluvo.new(maxSupply, numerator, denominator, period);
    });

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
    let pluvo;

    beforeEach(async () => {
      const maxSupply = 100;
      const numerator = 1;
      const denominator = 4;
      const period = 1;
      pluvo = await Pluvo.new(maxSupply, numerator, denominator, period);
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
      await pluvo.unregisterAddress(anotherAccount, { from: owner });
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

  describe('collect()', () => {
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
