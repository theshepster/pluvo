import React, { Component } from 'react'

class RegisterForm extends Component {
  constructor(props) {
    super(props)

    this.state = {
      email: '',
      firstName: '',
      lastName: '',
      id: ''
    }
  }

  onInputChange(event) {
    this.setState({ [event.target.name]: event.target.value })
  }

   handleSubmit(event) {
    event.preventDefault();

    // add any form validation here

    this.props.onRegisterFormSubmit(this.state)
  }

  render() {
    return(
      <form className="pure-form pure-form-stacked" onSubmit={this.handleSubmit.bind(this)} >
        <fieldset>

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="text" value={this.state.email} onChange={this.onInputChange.bind(this)} placeholder="Email" />

          <label htmlFor="firstName">First Name</label>
          <input id="firstName" name="firstName" type="text" value={this.state.firstName} onChange={this.onInputChange.bind(this)} placeholder="First Name" />

          <label htmlFor="lastName">Last Name</label>
          <input id="lastName" name="lastName" type="text" value={this.state.lastName} onChange={this.onInputChange.bind(this)} placeholder="Last Name" />

          <label htmlFor="id">ID</label>
          <input id="id" name="id" type="text" value={this.state.id} onChange={this.onInputChange.bind(this)} placeholder="ID" />

          <button type="submit" className="pure-button pure-button-primary">Register</button>

        </fieldset>
      </form>
    )
  }
}

export default RegisterForm
