import React, { Component } from 'react'
import { AccountData, ContractData, ContractForm } from 'drizzle-react-components'
import logo from '../../logo.png'

class Home extends Component {
  render() {
    return (
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1 header">
            <img src={logo} alt="drizzle-logo" />
            <h1>Some Drizzle Examples</h1>
            <p>Examples of how to get started with Drizzle in various situations.</p>

            <br/><br/>
          </div>
        
          <div className="pure-u-1-1">
            <h2>Active Account</h2>
            <AccountData accountIndex="0" units="ether" precision="3" />

            <br/><br/>
          </div>

          <div className="pure-u-1-1">
            <h2>Pluvo</h2>
            <p>Here we have a form with custom, friendly labels. Also note the token symbol will not display a loading indicator. We've suppressed it with the <code>hideIndicator</code> prop because we know this variable is constant.</p>
            <p><strong>Total Supply</strong>: <ContractData contract="Pluvo" method="totalSupply" methodArgs={[{from: this.props.accounts[0]}]} /> <ContractData contract="Pluvo" method="symbol" hideIndicator /></p>
            <p><strong>My Balance</strong>: <ContractData contract="Pluvo" method="balanceOf" methodArgs={[this.props.accounts[0]]} /></p>
            <p><strong>Number of Accounts Registered</strong>: <ContractData contract="Pluvo" method="numberOfRainees" /></p>
            <h3>Send Tokens</h3>
            <ContractForm contract="Pluvo" method="transfer" labels={['To Address', 'Amount to Send']} />
            <h3>Register</h3>
            <ContractForm contract="Pluvo" method="registerAddress" labels={['Address to Register']} />
            <h3>Rain</h3>
            <ContractForm contract="Pluvo" method="rain" />
            <h3>Collect</h3>
            <ContractForm contract="Pluvo" method="collect" />

            <br/><br/>
          </div>
          
        </div>
      </main>
    )
  }
}

export default Home
