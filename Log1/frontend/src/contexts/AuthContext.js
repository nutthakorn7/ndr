import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // Clear any corrupted localStorage first
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        try {
          const value = localStorage.getItem(key);
          if (value === '[object Object]' || value === 'undefined' || value === 'null') {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
      
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined' && token !== 'null' && token !== '[object Object]') {
        checkAuth();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      localStorage.removeItem('token');
      setIsLoading(false);
    }

  }, []); // Run only once on mount

  // Monitor localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      if (!token && isAuthenticated) {
        setIsAuthenticated(false);
        setUser(null);
        navigate('/login');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAuthenticated, navigate]);

  // Separate useEffect for monitoring auth changes
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (!token && isAuthenticated) {
        setIsAuthenticated(false);
        setUser(null);
        navigate('/login');
      }
    }, 2000); // Check every 2 seconds instead of 1

    return () => clearInterval(interval);
  }, [isAuthenticated, navigate]);

    const checkAuth = async (redirectOnError = true) => {
        try {
      const response = await authAPI.me();
      setUser(response.data);
      setIsAuthenticated(true);
        } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUser(null);
      if (redirectOnError) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
      }
    };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { access_token, user } = response.data;
      
      // Ensure token is a string
      if (access_token && typeof access_token === 'string') {
        localStorage.setItem('token', access_token);
        setUser(user);
        setIsAuthenticated(true);
        toast.success('Login successful');
        navigate('/');
      } else {
        throw new Error('Invalid token received');
      }
    } catch (error) {
      console.error('Login failed:', error);
      localStorage.removeItem('token');
      toast.error(error.response?.data?.detail || 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
      toast.success('Logged out successfully');
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 