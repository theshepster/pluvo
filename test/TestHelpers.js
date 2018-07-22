const {increaseTime, mineBlock} = require('./helpers.js');

describe('test blocktime increase', () => {
  it('advances time of the next block', async () =>{
    let elapsed = 3333333;
    let time0 = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    increaseTime(elapsed);
    mineBlock(); // force block to be mined
    let time1 = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    assert.approximately(time0 + elapsed, time1, 3, `time0 + elapsed: ${time0 + elapsed}, time1: ${time1}`)
  });
});