import React, { Component } from 'react'
import { AccountData, ContractData, ContractForm } from 'drizzle-react-components'
import logo from '../../logo.png'

const symbol = <ContractData contract="Pluvo" method="symbol" hideIndicator />;
const registrar = <ContractData contract="Pluvo" method="registrar" />;
const parameterSetter = <ContractData contract="Pluvo" method="parameterSetter" />;

class Home extends Component {
  render() {
    return (
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1 header">
            <img src={logo} alt="drizzle-logo" />
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
            <h2>Network Stats</h2>

            <p><strong>Total Supply</strong>: <ContractData contract="Pluvo" method="totalSupply" /> {symbol}</p>

            <p><strong>Max Supply</strong>: <ContractData contract="Pluvo" method="maxSupply" /> {symbol}</p>

            <p><strong>Number of Accounts Registered</strong>: <ContractData contract="Pluvo" method="numberOfRainees" /></p>

            <p><strong>Evaporation Rate</strong>: <ContractData contract="Pluvo" method="evaporationRate" /> / <ContractData contract="Pluvo" method="evaporationDenominator" /> every <ContractData contract="Pluvo" method="secondsBetweenRainfalls" /> seconds</p>

            <p><strong>Registrar</strong>: {registrar}</p>

            <p><strong>Parameter Setter</strong>: {parameterSetter}</p>

            <br/><br/>


            <h2>Account Actions</h2>

            <h3>Collect</h3>
            <ContractForm contract="Pluvo" method="collect" />

            <h3>Send Tokens</h3>
            <ContractForm contract="Pluvo" method="transfer" labels={['To Address', 'Amount to Send']} />

            <br/><br/>
            
            <h2>Network Actions</h2>

            <h3>Register</h3>
            Only the registrar can register addresses.<br/>
            <ContractForm contract="Pluvo" method="registerAddress" labels={['Address to Register']} />

            <h3>Unregister</h3>
            Only the registrar can unregister addresses.<br/>
            <ContractForm contract="Pluvo" method="unregisterAddress" labels={['Address to Unregister']} />

            <h3>Set Evaporation Rate</h3>
            Only the parameter setter can update the evaporation rate.<br/>
            <ContractForm contract="Pluvo" method="setEvaporationRate" labels={['Numerator', 'Denominator  (must be > 0)']} />

            <h3>Set Rainfall Period</h3>
            Only the parameter setter can update the rainfall period.<br/>
            <ContractForm contract="Pluvo" method="setRainfallPeriod" labels={['Seconds between rainfalls (must be > 0)']} />

            <h3>Change Registrar</h3>
            Only the registrar can change the registrar.<br/>
            <ContractForm contract="Pluvo" method="changeRegistrar" labels={['New Registrar']} />

            <h3>Change Parameter Setter</h3>
            Only the parameter setter can change the parameter setter.<br/>
            <ContractForm contract="Pluvo" method="changeParameterSetter" labels={['New Parameter Setter']} />

            <br/><br/>
          </div>
          
        </div>
      </main>
    )
  }
}

export default Home
