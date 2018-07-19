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
  

  /*
   * Fill this in to get a clean slate before each test
  beforeEach(async () => {  
  });
  */

  describe('ERC20 functions', async () => {
    /*
    * These statements create state to be shared between tests.
    */
    let pluvo = await Pluvo.deployed();
    const supply0 = await pluvo.totalSupply.call();
    await pluvo.registerAddress(owner);
    const ownerBalance0 = await pluvo.balanceOf(owner);
    await pluvo.rain();
    const supply1 = await pluvo.totalSupply.call();
    await pluvo.collect({ from: owner });
    const ownerBalance1 = await pluvo.balanceOf(owner);
    const supply2 = await pluvo.totalSupply.call();
    await pluvo.transfer(recipient, 15, { from: owner });
    const supply3 = await pluvo.totalSupply.call();

    describe('totalSupply()', () => { 
      it('should equal zero at construction', () => {
        assert(BigNumber(0).eq(supply0));
      });

      it('should stay the same after rain', () => {
        assert(supply1.eq(supply0));
      });

      it('should decrease after transfer, ' +
         'which causes evaporation', async () => {
        assert(supply3.lt(supply2));
      });

      it('should increase after collect()', () => {
          assert(supply2.gt(supply1));
      });
    });

    describe('balanceOf()', () => {
      it('should return zero for account with no balance', async () => {
          const balance = await pluvo.balanceOf(anotherAccount);
          assert(BigNumber(0).eq(balance));
      });

      it('should be positive for an address with coins', async () => {
          assert(ownerBalance1.gt(BigNumber(0)));
      });

      it('should increase after receipt', async () => {
          const balance = await pluvo.balanceOf(recipient);
          assert(balance.gt(BigNumber(0)));
      });

      it('should decrease after sending coins', async () => {
          const balance = await pluvo.balanceOf(owner);
          assert(balance.lt(ownerBalance1));
      });

      it('should increase after rain collection', () => {
          assert(ownerBalance1.gt(ownerBalance0));
      });

      it('should decrease between successive blocks', () => {
          // TODO: SIMULATE PASSAGE OF TIME
          assert(false, 'not implemented');
      });

      it('should incorporate pending evaporation', async () => {
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
      let pluvo; // this is a new instance
      
      beforeEach(async () => {
        const maxSupply = 100;
        const numerator = 1;
        const denominator = 4;
        const period = 1;
        pluvo = await Pluvo.new(maxSupply, numerator, denominator, period);
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

      it('evaporates from sender before sending', async () => {
        assert(false, 'not implemented');
      });

      it('evaporates from recipient before receiving', async () => {
        assert(false, 'not implemented');
      });

      // TODO: MAKE THIS ONLY HAVE ONE ASSERT, TO TEST THE UNITS SEPARATELY
      // TODO: USE BIGNUMBER COMPARISONS
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

    it('does not register an address sent by non-registrar', async () => {
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
