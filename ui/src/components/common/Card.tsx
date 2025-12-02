import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  title?: string;
  action?: React.ReactNode;
}

export default function Card({ children, className = '', noPadding = false, title, action }: CardProps) {
  return (
    <div className={`bg-surface-2 border border-border-subtle rounded-lg shadow-elevation-1 overflow-hidden flex flex-col ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle min-h-[48px]">
          <h3 className="text-sm font-medium text-gray-200 tracking-wide">{title}</h3>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
}
