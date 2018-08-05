import React, { Component } from 'react'
import { ContractData, ContractForm } from 'drizzle-react-components'
import logo from '../../logo.png'

const symbol = <ContractData contract="Pluvo" method="symbol" hideIndicator />;
const parameterSetter = <ContractData contract="Pluvo" method="parameterSetter" />;

class Parameters extends Component {
  render() {
    return (
      <main className="container">
        <div className="pure-g">
          <div className="pure-u-1-1 header">
            <img src={logo} alt="pluvo-logo" />
          </div>

          <div className="pure-u-1-1">
            <h2>Relevant Network Stats</h2>

            <p><strong>Total Supply</strong>: <ContractData contract="Pluvo" method="totalSupply" /> {symbol}</p>

            <p><strong>Max Supply</strong>: <ContractData contract="Pluvo" method="maxSupply" /> {symbol}</p>

            <p><strong>Evaporation Rate</strong>: <ContractData contract="Pluvo" method="evaporationRate" /> / <ContractData contract="Pluvo" method="evaporationDenominator" /> every <ContractData contract="Pluvo" method="secondsBetweenRainfalls" /> seconds</p>

            <p><strong>Parameter Setter</strong>: {parameterSetter}</p>

            <br/>

            <h2>Parameter Updates</h2>

            <h3>Set Evaporation Rate</h3>
            Only the parameter setter can update the evaporation rate.<br/>
            <ContractForm contract="Pluvo" method="setEvaporationRate" labels={['Numerator', 'Denominator  (must be > 0)']} />

            <h3>Set Rainfall Period</h3>
            Only the parameter setter can update the rainfall period.<br/>
            <ContractForm contract="Pluvo" method="setRainfallPeriod" labels={['Seconds between rainfalls (must be > 0)']} />

            <h3>Change Parameter Setter</h3>
            Only the parameter setter can change the parameter setter.<br/>
            <ContractForm contract="Pluvo" method="changeParameterSetter" labels={['New Parameter Setter']} />

          </div>
        </div>
      </main>
    )
  }
}

export default Parameters
