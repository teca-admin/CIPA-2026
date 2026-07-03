
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import CheckinScreen from './components/CheckinScreen.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Tablets de check-in abrem a URL com ?checkin, o resto continua na urna normal.
const isCheckin = new URLSearchParams(window.location.search).has('checkin');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isCheckin ? <CheckinScreen /> : <App />}
  </React.StrictMode>
);
