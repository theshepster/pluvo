module.exports = {
  assertRevert: async function (promise) {
    try {
      await promise;
      assert.fail('Expected revert not received');
    } catch (error) {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    }
  },

  increaseTime: function (addSeconds) {
    sendRpc('evm_increaseTime', [addSeconds]);
  },

  mineBlock: function () {
    sendRpc('evm_mine');
  }
}

function sendRpc(method, params) {
  web3.currentProvider.send({
    jsonrpc: '2.0',
    method,
    params: params || [],
    id: new Date().getTime(),
  });
}