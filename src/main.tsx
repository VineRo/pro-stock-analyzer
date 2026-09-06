import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

let appRoot: ReactDOM.Root | null = null;

function mountApp() {
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    rootElement.className = 'w-screen h-screen';
    document.body.appendChild(rootElement);
  }

  if (!appRoot) {
    appRoot = ReactDOM.createRoot(rootElement);
  }

  appRoot.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
