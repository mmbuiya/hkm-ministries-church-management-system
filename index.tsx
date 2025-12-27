
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './components/AuthContext';
import './dark-mode.css';

import { AuthorizedApolloProvider } from './components/AuthorizedApolloProvider';
import { ClerkAuthProvider } from './components/ClerkAuthProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ClerkAuthProvider>
      <AuthProvider>
        <AuthorizedApolloProvider>
          <App />
        </AuthorizedApolloProvider>
      </AuthProvider>
    </ClerkAuthProvider>
  </React.StrictMode>
);
