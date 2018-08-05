import { Connect } from 'uport-connect'

export let uport = new Connect('Pluvo')
export const web3 = uport.getWeb3()
