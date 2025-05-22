import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import WebSocketTest from './pages/WebSocketTest';
import { Toaster } from 'react-hot-toast';

function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);
  const socketInitialized = useRef(false);

  useEffect(() => {
    // Only try to initialize once
    if (socketInitialized.current) return;
    socketInitialized.current = true;
  }, []);

  // Initialize dark mode based on user preference or saved setting
  useEffect(() => {
    // First check localStorage
    const savedDarkMode = localStorage.getItem('darkMode');
    
    if (savedDarkMode !== null) {
      // User has a saved preference
      const isDark = savedDarkMode === 'true';
      setIsDarkMode(isDark);
      applyDarkMode(isDark);
    } else {
      // No saved preference, check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      applyDarkMode(prefersDark);
      
      // Save the initial preference
      localStorage.setItem('darkMode', String(prefersDark));
    }
    
    // Add listener for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only apply if user hasn't set a manual preference
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
        applyDarkMode(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Apply dark mode to HTML element and body
  const applyDarkMode = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.setAttribute('data-theme', 'light');
    }
  };

  // Only render the app once we've determined the initial dark mode setting
  if (isDarkMode === null) {
    return null; // Or a loading spinner
  }

  return (
    <>
    <Toaster
      toastOptions={{
        style: {
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--text-secondary)',
        },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: 'var(--bg-secondary)',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444', 
            secondary: 'var(--bg-secondary)',
          },
        },
      }}
    />
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<WebSocketTest />} />
        
      </Routes>
    </Router>
    </>
  );
}

export default App;
