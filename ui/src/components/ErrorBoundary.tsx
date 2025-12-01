import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackMessage?: string;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null
    };
  }

  static getDerivedStateFromError(_: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now();
    const timeSinceLastError = this.state.lastErrorTime 
      ? now - this.state.lastErrorTime 
      : Infinity;
    
    // Only increment count if error happened within 5 seconds of last error
    const newCount = timeSinceLastError < 5000 
      ? this.state.errorCount + 1 
      : 1;
    
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      errorCount: newCount,
      lastErrorTime: now
    });

    // Call optional error handler prop
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const componentName = this.props.componentName || 'Component';

      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
            
            <h2>Something went wrong</h2>
            
            <p className="error-message">
              {this.props.fallbackMessage || 
                `The ${componentName} encountered an unexpected error and couldn't recover.`}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  <strong>Error: </strong>
                  {this.state.error.toString()}
                  {'\n\n'}
                  <strong>Component Stack:</strong>
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button 
                className="error-retry-btn primary"
                onClick={this.handleReset}
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              {this.state.errorCount > 1 && (
                <button 
                  className="error-retry-btn secondary"
                  onClick={this.handleReload}
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
              )}
              
              <button 
                className="error-retry-btn text"
                onClick={this.handleGoHome}
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>

            {this.state.errorCount > 2 && (
              <div className="error-warning">
                <p>⚠️ This error has occurred {this.state.errorCount} times.</p>
                <p>There may be a persistent issue. Please contact support if this continues.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
