import RegisterForm from './RegisterForm'
import { registerUser } from './RegisterFormActions'
import { drizzleConnect } from 'drizzle-react'

const mapStateToProps = state => {
  return {
    drizzleStatus: state.drizzleStatus
  }
}

const mapDispatchToProps = dispatch => {
  return {
    onRegisterFormSubmit: (formData) => {
      event.preventDefault();
      dispatch(registerUser(formData))
    }
  }
}

const RegisterFormContainer = drizzleConnect(
  RegisterForm, mapStateToProps, mapDispatchToProps
)

export default RegisterFormContainer
