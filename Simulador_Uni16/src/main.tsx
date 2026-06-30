import React from 'react';
import ReactDOM from 'react-dom/client';
import { CPUProvider } from './context/CPUContext';
import { App } from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CPUProvider>
      <App />
    </CPUProvider>
  </React.StrictMode>
);