import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'table' | 'card' | 'chart' | 'text';
  rows?: number;
  columns?: number;
  height?: string;
}

export default function SkeletonLoader({ 
  variant = 'table', 
  rows = 5, 
  columns = 5,
  height = '200px'
}: SkeletonLoaderProps) {
  
  if (variant === 'table') {
    return (
      <div className="w-full space-y-2 animate-pulse">
        {/* Table Header */}
        <div className="flex gap-4 p-4 bg-[var(--bg-hover)] rounded-lg">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-[var(--border-subtle)] rounded flex-1" />
          ))}
        </div>
        
        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 p-4 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-4 bg-[var(--border-subtle)] rounded flex-1"
                style={{ opacity: 0.7 - (rowIndex * 0.1) }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-[var(--border-subtle)] rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-[var(--border-subtle)] rounded w-full" />
          <div className="h-4 bg-[var(--border-subtle)] rounded w-5/6" />
          <div className="h-4 bg-[var(--border-subtle)] rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div 
        className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg p-4 flex items-end justify-around gap-2 animate-pulse"
        style={{ height }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--sev-info)] rounded-t opacity-40"
            style={{
              width: '100%',
              height: `${Math.random() * 60 + 40}%`
            }}
          />
        ))}
      </div>
    );
  }

  // Text variant
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-[var(--border-subtle)] rounded"
          style={{ width: `${Math.random() * 30 + 70}%` }}
        />
      ))}
    </div>
  );
}

// Shimmer effect for skeleton
export function SkeletonShimmer() {
  return (
    <div className="relative overflow-hidden bg-[var(--bg-panel)] rounded-lg" style={{ height: '100%' }}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// CSS for shimmer animation
const styles = `
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
