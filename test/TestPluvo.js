//import assertRevert from 'openzeppelin-solidity/test/helpers/assertRevert.js';
const Pluvo = artifacts.require("./Pluvo.sol");

contract('Pluvo', function ([_, owner, recipient, anotherAccount]) {

  beforeEach(async function () {
    pluvo = await Pluvo.deployed();
  });

  describe('total supply', function () {
    it('should equal zero at construction', async function () {
      const totalSupply = await pluvo.totalSupply();

      assert.equal(totalSupply, 0);
    });

    // TODO: TEST TOTAL SUPPLY AFTER RAIN AND EVAPORATION

  });

  describe('balanceOf', function () {
    describe('when the requested account has no tokens', function () {
      it('returns zero', async function () {
        const balance = await pluvo.balanceOf(anotherAccount);

        assert.equal(balance, 0);
      });
    });

    /*
    describe('when the requested account has some tokens', function () {
      it('returns the total amount of tokens', async function () {
        const balance = await pluvo.balanceOf(owner);

        assert.equal(balance, 100);
      });
    });
    */
  });
  /*
  describe('transfer', function () {
    describe('when the recipient is not the zero address', function () {
      const to = recipient;

      describe('when the sender does not have enough balance', function () {
        const amount = 101;

        it('reverts', async function () {
          await assertRevert(pluvo.transfer(to, amount, { from: owner }));
        });
      });

      describe('when the sender has enough balance', function () {
        const amount = 100;

        it('transfers the requested amount', async function () {
          await pluvo.transfer(to, amount, { from: owner });

          const senderBalance = await pluvo.balanceOf(owner);
          assert.equal(senderBalance, 0);

          const recipientBalance = await pluvo.balanceOf(to);
          assert.equal(recipientBalance, amount);
        });

        it('emits a transfer event', async function () {
          const { logs } = await pluvo.transfer(to, amount, { from: owner });

          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Transfer');
          assert.equal(logs[0].args.from, owner);
          assert.equal(logs[0].args.to, to);
          assert(logs[0].args.value.eq(amount));
        });
      });
    });

    describe('when the recipient is the zero address', function () {
      const to = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(pluvo.transfer(to, 100, { from: owner }));
      });
    });
  });
  */
});
