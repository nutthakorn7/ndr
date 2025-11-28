import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import './App.css';

import { ToastProvider } from './components/Toast';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#1a1a1a',
        color: 'white',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  // Auth disabled - just show dashboard
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}

export default App;
