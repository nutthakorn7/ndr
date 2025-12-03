import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Investigation from './pages/Investigation';
import Alerts from './pages/Alerts';
import Playbooks from './pages/Playbooks';
import './App.css';
import './styles/themes.css';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ShortcutsHelp } from './components/ShortcutsHelp';
import AiChatWidget from './components/AiChatWidget';

function App() {
  // const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        // setUser(JSON.parse(savedUser));
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
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingSpinner size="large" message="Loading page..." />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/event-search" element={<Dashboard initialSearch={true} />} />
                <Route path="/:tab" element={<Dashboard />} />
                <Route path="investigation" element={<Investigation />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="playbooks" element={<Playbooks />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <AiChatWidget />
            <ShortcutsHelp />
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
