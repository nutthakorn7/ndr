import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import './App.css';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

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
        background: '#0f172a'
      }}>
        <LoadingSpinner size="large" message="Loading NDR Dashboard..." />
      </div>
    );
  }

  // Auth disabled - just show dashboard
  return (
    <ErrorBoundary fallbackMessage="Dashboard encountered an error. Please refresh the page.">
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
