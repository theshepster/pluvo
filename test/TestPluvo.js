import assertRevert from 'openzeppelin-solidity/test/helpers/assertRevert.js';
const Pluvo = artifacts.require("./Pluvo.sol");

contract('Pluvo', async ([_, owner, recipient, anotherAccount]) => {
  
  /*
   * These statements create state to be shared between tests.
   * TODO: Consider whether these should go in a "before()" function.
   */
  pluvo = await Pluvo.deployed();
  const supply0 = await pluvo.totalSupply.call();
  await pluvo.registerAddress(owner);
  const ownerBalance0 = await pluvo.balanceOf(owner);
  await pluvo.rain();
  const supply1 = await.pluvo.totalSupply.call();
  await pluvo.collect({ from: owner });
  const ownerBalance1 = await pluvo.balanceOf(owner);
  const supply2 = await.pluvo.totalSupply.call();
  await pluvo.transfer(recipient, 1, { from: owner });
  const supply3 = await pluvo.totalSupply.call();
  
  /*
   * Fill this in to get a clean slate before each test
  beforeEach(async () => {  
  });
  */

  describe('totalSupply()', () => { 
    it('should equal zero at construction', () => {
      assert.equal(supply0, 0);
    });

    it('should increase after rain', () => {
      assert.isAbove(supply1, supply0);
    });

    it('should stay the same after transfer', async () => {
      assert.equal(supply2, supply3);
    });

    it('should stay the same after collection', () => {
        assert.equal(supply1, supply2);
    });
  });

  describe('balanceOf()', () => {
    it('should return zero for account with no balance', async () => {
        const balance = await pluvo.balanceOf(anotherAccount);
        assert.equal(balance, 0);
    });

    it('should be positive for an address with coins', async () => {
        const balance = await pluvo.balanceOf(owner);
        assert.isAbove(balance, 0);
    });

    it('should increase after receipt', async () => {
        const balance = await pluvo.balanceOf(recipient);
        assert.isAbove(balance, 0);
    });

    it('should decrease after sending coins', async () => {
        const balance = await pluvo.balanceOf(owner);
        assert.isBelow(balance, ownerBalance1);
    });

    it('should increase after rain collection', () => {
        assert.equal(ownerBalance0, ownerBalance1);
    });

    it('should decrease between successive blocks', () => {
        // TODO: SIMULATE PASSAGE OF TIME
        assert(false, 'not implemented');
    });

    it('should incorporate pending evaporation', async () => {
        const pendingEvaporation = await pluvo.calculateEvaporation.call(owner);
        const ownerBalance = await.pluvo.balanceOf.call(owner);
        const ownerRawBalance = await.pluvo.balance.call(owner);
        assert.equal(ownerRawBalance, ownerBalance - pendingEvaporation);
    });
  });
  
  describe('transfer()', () => {
    const to = recipient;
    const amount = 101;

    it('reverts when sender has insufficient initial balance', async () => {
      await assertRevert(pluvo.transfer(to, amount, { from: owner }));
    });

    it('reverts when sender has insufficient balance' +
       'after evaporation', async () => {
      await assertRevert(pluvo.transfer(to, amount, { from: owner }));
    });

    it('evaporates from sender before sending', async () => {
      assert(false, 'not implemented');
    });

    it('evaporates from recipient before receiving', async () => {
      assert(false, 'not implemented');
    });

    it('transfers the requested amount (after evaporation)', async () => {
      await pluvo.transfer(to, amount, { from: owner });

      const senderBalance = await pluvo.balanceOf(owner);
      assert.equal(senderBalance, 0);

      const recipientBalance = await pluvo.balanceOf(to);
      assert.equal(recipientBalance, amount);
    });

    it('emits a transfer event', async () => {
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
    it('', async () => {
      assert(false, 'not implemented');
    });
  });

  describe('unregisterAddress()', () => {
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
    it('', async () => {
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
