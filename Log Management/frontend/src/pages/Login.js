import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  EyeIcon, 
  EyeSlashIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const Login = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login({ username, password });
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Advanced Security',
      description: 'Real-time threat detection and response'
    },
    {
      icon: ChartBarIcon,
      title: 'Smart Analytics',
      description: 'AI-powered insights and visualizations'
    },
    {
      icon: CogIcon,
      title: 'Easy Integration',
      description: 'Connect all your security tools seamlessly'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50 flex">
      {/* Left side - Branding and Features */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center p-12 scale-hero relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary-900/90 via-secondary-800/90 to-primary-900/90"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-400/20 to-accent-400/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-accent-400/20 to-primary-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
        
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center space-x-4 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-accent-500 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">zcrLog</h1>
              <p className="text-primary-200 text-sm">Professional Security Analytics</p>
            </div>
          </div>

          {/* Hero content */}
          <div className="mb-12">
            <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
              Next-generation
              <br />
              <span className="bg-gradient-to-r from-primary-300 to-accent-300 bg-clip-text text-transparent">
                Security Intelligence
              </span>
            </h2>
            <p className="text-xl text-secondary-200 leading-relaxed">
              Unify your security data, detect advanced threats, and respond faster 
              with AI-powered analytics designed for modern enterprises.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4 glass-effect rounded-2xl p-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                  <p className="text-secondary-300 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">99.9%</div>
              <div className="text-xs text-secondary-300">Uptime</div>
            </div>
            <div className="text-center">
                             <div className="text-2xl font-bold text-white">&lt; 100ms</div>
              <div className="text-xs text-secondary-300">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">24/7</div>
              <div className="text-xs text-secondary-300">Monitoring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">Z</span>
            </div>
            <span className="text-2xl font-bold gradient-text">zcrLog</span>
          </div>

          {/* Form header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-secondary-900 mb-2">
              Welcome back
            </h2>
            <p className="text-secondary-600">
              Sign in to your zcrLog dashboard
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-secondary-900 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-scale w-full"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-secondary-900 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-scale w-full pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 bg-white border-secondary-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-secondary-600">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base group"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  Sign in
                  <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-primary-50 border border-primary-200 rounded-xl">
            <h3 className="text-sm font-semibold text-primary-900 mb-2">Demo Credentials</h3>
            <div className="text-sm text-primary-700 space-y-1">
              <div>Username: <code className="bg-primary-100 px-2 py-1 rounded text-xs">admin</code></div>
              <div>Password: <code className="bg-primary-100 px-2 py-1 rounded text-xs">admin123</code></div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-secondary-500">
              © 2024 zcrLog Professional. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
