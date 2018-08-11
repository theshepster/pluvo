import fetch from 'isomorphic-fetch';

export function registerUser(formData) {
  return fetch('https://shepmb-test.slsgateway.com/users', {
    method: 'POST',
    mode: 'CORS',
    body: JSON.stringify(formData),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(response => {
    return response.text();
  });
}
