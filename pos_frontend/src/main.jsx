import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GoogleOAuthProvider } from "@react-oauth/google";
import store from './Redux/Store.js';
import { Provider } from 'react-redux';

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <Provider store={store}>
    <GoogleOAuthProvider clientId="145401905760-ad922uhj00270l9mbo09gt32jlsrmfnf.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </Provider>
  // </StrictMode >,
)
