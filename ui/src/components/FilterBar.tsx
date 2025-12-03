import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, Plus, ChevronDown } from 'lucide-react';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'text';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  config: FilterConfig[];
  filters: Record<string, any>;
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  config,
  filters,
  onFilterChange,
  onClearAll,
  className = ''
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    // Filter out empty values or 'all' defaults
    return value && value !== 'all' && value !== '';
  });

  const getLabelForKey = (key: string) => {
    return config.find(c => c.key === key)?.label || key;
  };

  const getLabelForValue = (key: string, value: string) => {
    const conf = config.find(c => c.key === key);
    if (conf?.options) {
      return conf.options.find(o => o.value === value)?.label || value;
    }
    return value;
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Add Filter Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setActiveDropdown(activeDropdown === 'add' ? null : 'add')}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--sev-info)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Filter
        </button>

        {activeDropdown === 'add' && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 py-1">
            {config.map((conf) => (
              <button
                key={conf.key}
                onClick={() => setActiveDropdown(conf.key)}
                className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex justify-between items-center"
              >
                {conf.label}
                <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            ))}
          </div>
        )}

        {/* Specific Filter Dropdowns */}
        {config.map((conf) => (
          activeDropdown === conf.key && (
            <div key={conf.key} className="absolute top-full left-0 mt-1 w-64 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 p-2">
              <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2 px-2 uppercase tracking-wider">
                Filter by {conf.label}
              </div>
              
              {conf.type === 'select' && conf.options && (
                <div className="max-h-60 overflow-y-auto">
                  {conf.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onFilterChange(conf.key, opt.value);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-[var(--bg-hover)] ${
                        filters[conf.key] === opt.value ? 'text-[var(--sev-info)] bg-[var(--bg-hover)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {conf.type === 'text' && (
                <div className="px-2 pb-2">
                  <input
                    type="text"
                    placeholder={conf.placeholder || `Enter ${conf.label}...`}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--sev-info)] outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onFilterChange(conf.key, e.currentTarget.value);
                        setActiveDropdown(null);
                      }
                    }}
                    autoFocus
                  />
                  <div className="text-xs text-[var(--text-secondary)] mt-2">
                    Press Enter to apply
                  </div>
                </div>
              )}
            </div>
          )
        ))}
      </div>

      {/* Active Filter Pills */}
      {activeFilters.map(([key, value]) => (
        <div
          key={key}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-full text-sm text-[var(--text-primary)] group"
        >
          <span className="text-[var(--text-secondary)] font-medium">{getLabelForKey(key)}:</span>
          <span className="font-semibold">{getLabelForValue(key, value)}</span>
          <button
            onClick={() => onFilterChange(key, 'all')} // Or '' depending on logic, standardized to 'all' usually resets
            className="ml-1 p-0.5 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* Clear All */}
      {activeFilters.length > 0 && (
        <button
          onClick={onClearAll}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--sev-critical)] hover:underline px-2 transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
};
