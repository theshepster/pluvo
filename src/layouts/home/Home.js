import React, { Component } from 'react'
import { AccountData, ContractData, ContractForm } from 'drizzle-react-components'
import logo from '../../logo.png'

const symbol = <ContractData contract="Pluvo" method="symbol" hideIndicator />;

class Home extends Component {
  render() {
    return (
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1 header">
            <img src={logo} alt="pluvo-logo" />
            <p>Welcome to Pluvo.</p>
            <p>First, register your address. Note, registration only works if you are the official registrar.</p>
            <p>Then, collect some Pluvo by clicking "Collect." If there has been rain, you will receive some Pluvo.</p>

            <br/><br/>
          </div>
        
          <div className="pure-u-1-1">
            <h2>Active Account</h2>
            <AccountData accountIndex="0" units="ether" precision="3" />
            <p><strong>My Balance</strong>: <ContractData contract="Pluvo" method="balanceOf" methodArgs={[this.props.accounts[0]]} /> {symbol} </p>
            <br/>
          </div>

          <div className="pure-u-1-1">
            
            <h2>Account Actions</h2>

            <h3>Collect Rain</h3>
            <ContractForm contract="Pluvo" method="collectRainfalls" labels={['Number of Rainfalls to Collect']} />

            <h3>Collect All Available Rain</h3>
            <ContractForm contract="Pluvo" method="collect" />

            <h3>Send Tokens</h3>
            <ContractForm contract="Pluvo" method="transfer" labels={['To Address', 'Amount to Send']} />

          </div>        

        </div>
      </main>
    )
  }
}

export default Home
