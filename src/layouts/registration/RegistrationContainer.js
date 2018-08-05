import Registration from './Registration'
import { drizzleConnect } from 'drizzle-react'

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    Pluvo: state.contracts.Pluvo,
    drizzleStatus: state.drizzleStatus
  }
}

const RegistrationContainer = drizzleConnect(Registration, mapStateToProps);

export default RegistrationContainer
