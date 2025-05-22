import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import socketService from './services/socketService'

// Initialize socket connection with retry mechanism
const initializeSocket = () => {
  console.log('Initializing WebSocket connection...');
  
  // Check if browser is online
  if (!navigator.onLine) {
    console.warn('Browser is offline, will connect when online');
    
    // Add event listener to connect when online
    window.addEventListener('online', () => {
      console.log('Browser is now online, connecting WebSocket');
      socketService.connect();
    }, { once: true });
    
    return;
  }
  
  // Try to connect
  socketService.connect();
  
  // Check connection status after a delay
  setTimeout(() => {
    const readyState = socketService.getReadyState();
    if (readyState !== 1) { // 1 = OPEN
      console.warn('WebSocket failed to connect on initial attempt, will retry when app loads');
    } else {
      console.log('WebSocket connected successfully on startup');
    }
  }, 3000);
};

// Initialize socket connection
initializeSocket();

// Initial dark mode setup
const darkModeSetup = () => {
  // Check for existing preference in localStorage
  const savedDarkMode = localStorage.getItem('darkMode');
  
  if (savedDarkMode !== null) {
    // User has a saved preference
    return savedDarkMode === 'true';
  } else {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Save the preference
    localStorage.setItem('darkMode', String(prefersDark));
    return prefersDark;
  }
};

// Apply initial dark mode
const isDarkMode = darkModeSetup();
if (isDarkMode) {
  document.documentElement.classList.add('dark');
  document.body.setAttribute('data-theme', 'dark');
} else {
  document.documentElement.classList.remove('dark');
  document.body.setAttribute('data-theme', 'light');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
