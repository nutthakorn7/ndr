import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[var(--sev-info)] opacity-10 rounded-full blur-2xl" style={{ width: '120px', height: '120px' }} />
        <div className="relative bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-full p-6">
          <Icon className="w-12 h-12 text-[var(--text-secondary)]" strokeWidth={1.5} />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                action.variant === 'secondary'
                  ? 'bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-panel)]'
                  : 'bg-[var(--sev-info)] text-white hover:opacity-90 shadow-lg shadow-blue-500/20'
              }`}
            >
              {action.label}
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-6 py-3 bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-md font-medium transition-all hover:bg-[var(--bg-panel)]"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact variant for smaller spaces
export function EmptyStateCompact({
  icon: Icon,
  message,
  action
}: {
  icon: LucideIcon;
  message: string;
  action?: EmptyStateProps['action'];
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <Icon className="w-8 h-8 text-[var(--text-secondary)] mb-3" strokeWidth={1.5} />
      <p className="text-sm text-[var(--text-secondary)] mb-3">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[var(--sev-info)] text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
