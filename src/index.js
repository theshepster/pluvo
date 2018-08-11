import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, IndexRoute, browserHistory } from 'react-router'
import { syncHistoryWithStore } from 'react-router-redux'
import { DrizzleProvider } from 'drizzle-react'

// Layouts
import App from './App'
import HomeContainer from './layouts/home/HomeContainer'
import RegistrationContainer from './layouts/registration/RegistrationContainer'
import RegisterFormContainer from './user/ui/registerform/RegisterFormContainer'
import ParametersContainer from './layouts/parameters/ParametersContainer'
import { LoadingContainer } from 'drizzle-react-components'

import store from './store'
import drizzleOptions from './drizzleOptions'

// Initialize react-router-redux.
const history = syncHistoryWithStore(browserHistory, store)

ReactDOM.render((
    <DrizzleProvider options={drizzleOptions} store={store}>
      <LoadingContainer>
        <Router history={history}>
          <Route path="/" component={App}>
            <IndexRoute component={HomeContainer} />
            <Route path="/registration" component={RegistrationContainer}/>
            <Route path="/register" component={RegisterFormContainer}/>
            <Route path="/parameters" component={ParametersContainer}/>
          </Route>
        </Router>
      </LoadingContainer>
    </DrizzleProvider>
  ),
  document.getElementById('root')
);
