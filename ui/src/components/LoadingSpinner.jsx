import React from 'react';
import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 'medium', message = 'Loading...' }) {
  return (
    <div className={`loading-container ${size}`}>
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}
