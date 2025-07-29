import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sources from './pages/Sources';
import Logs from './pages/Logs';
import Analytics from './pages/Analytics';
import Compliance from './pages/Compliance';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AddServer from './pages/AddServer';
import UEBA from './pages/UEBA';
import Alerts from './pages/Alerts';
import AIAssistantPage from './pages/AIAssistant';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
      <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="sources" element={<Sources />} />
          <Route path="logs" element={<Logs />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="add-server" element={<AddServer />} />
          <Route path="ueba" element={<UEBA />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="ai-assistant" element={<AIAssistantPage />} />
        </Route>
      </Routes>
      </AuthProvider>
  );
};

export default App; 