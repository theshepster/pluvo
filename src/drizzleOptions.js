import Pluvo from './../build/contracts/Pluvo.json'

const drizzleOptions = {
  web3: {
    block: false,
    fallback: {
      type: 'ws',
      url: 'ws://127.0.0.1:8545'
    }
  },
  contracts: [Pluvo],
  events: {
    Pluvo: ['Transfer', 'Approval', 'Collection']
  },
  polls: {
    accounts: 1500
  }
}

export default drizzleOptions