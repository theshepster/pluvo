import React, { Component } from 'react'
import { ContractData, ContractForm } from 'drizzle-react-components'
import logo from '../../logo.png'

const registrar = <ContractData contract="Pluvo" method="registrar" />;

class Registration extends Component {
  render() {
    return (
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1 header">
            <img src={logo} alt="pluvo-logo" />
          </div>

          <div className="pure-u-1-1">
            <h2>Relevant Network Stats</h2>

            <p><strong>Number of Accounts Registered</strong>: <ContractData contract="Pluvo" method="numberOfRainees" /></p>

            <p><strong>Registrar</strong>: {registrar}</p>

            <br/>

            <h2>Registration Actions</h2>

            <h3>Register</h3>
            Only the registrar can register addresses.<br/>
            <ContractForm contract="Pluvo" method="registerAddress" labels={['Address to Register']} />

            <h3>Unregister</h3>
            Only the registrar can unregister addresses.<br/>
            <ContractForm contract="Pluvo" method="unregisterAddress" labels={['Address to Unregister']} />

            <h3>Change Registrar</h3>
            Only the registrar can change the registrar.<br/>
            <ContractForm contract="Pluvo" method="changeRegistrar" labels={['New Registrar']} />

          </div>
        </div>
      </main>
    )
  }
}

export default Registration
