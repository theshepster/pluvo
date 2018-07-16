//import assertRevert from 'openzeppelin-solidity/test/helpers/assertRevert.js';
const Pluvo = artifacts.require("./Pluvo.sol");

contract('Pluvo', function ([_, owner, recipient, anotherAccount]) {

  beforeEach(async () => {
    pluvo = await Pluvo.deployed();
  });

  describe('totalSupply()', () => {
    it('should equal zero at construction', async () => {
      const totalSupply = await pluvo.totalSupply();

      assert.equal(totalSupply, 0);
    });

    it('should increase after rain', async () => {
        assert(false, 'not implemented');
    });

    it('should stay the same after evaporation', async () => {
        assert(false, 'not implemented');
    });

    it('should stay the same after collection', async () => {
        assert(false, 'not implemented');
    });

    it('should stay the same after transfer', async () => {
        assert(false, 'not implemented');
    });
  });

  describe('balanceOf()', () => {
    it('should return zero for account with no balance', async () => {
        const balance = await pluvo.balanceOf(anotherAccount);
        assert.equal(balance, 0);
    });

    it('should be positive for an address with coins', async () => {
        assert(false, 'not implemented');
    });

    it('should increase after receipt', async () => {
        assert(false, 'not implemented');
    });

    it('should decrease after sending coins', async () => {
        assert(false, 'not implemented');
    });

    it('should increase after rain collection', async () => {
        assert(false, 'not implemented');
    });

    it('should decrease between successive blocks', async () => {
        assert(false, 'not implemented');
    });

    it('should incorporate pending evaporation', async () => {
        assert(false, 'not implemented');
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
