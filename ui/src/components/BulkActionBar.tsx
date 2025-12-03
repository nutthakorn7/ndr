import React from 'react';
import { CheckSquare, Square, Download, Trash2, UserPlus, X } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onExport?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  onChangeStatus?: () => void;
  onClear: () => void;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
  }>;
}

export default function BulkActionBar({
  selectedCount,
  totalCount,
  onExport,
  onDelete,
  onAssign,
  onChangeStatus,
  onClear,
  actions = []
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-20 bg-[var(--sev-info)] border border-[var(--sev-info)] rounded-lg p-4 flex items-center justify-between shadow-lg animate-slideDown">
      <div className="flex items-center gap-4">
        <CheckSquare className="w-5 h-5 text-white" />
        <span className="text-white font-semibold">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Standard Actions */}
        {onExport && (
          <button
            onClick={onExport}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}

        {onAssign && (
          <button
            onClick={onAssign}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Assign
          </button>
        )}

        {onChangeStatus && (
          <button
            onClick={onChangeStatus}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-md transition-colors text-sm font-medium"
          >
            Change Status
          </button>
        )}

        {/* Custom Actions */}
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${
              action.variant === 'danger'
                ? 'bg-red-500/20 hover:bg-red-500/30 text-white'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}

        {onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-white rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}

        {/* Clear Selection */}
        <button
          onClick={onClear}
          className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-md transition-colors ml-2"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// CSS animation for slide down
const styles = `
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slideDown {
  animation: slideDown 200ms ease-out;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
