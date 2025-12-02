import { useState, useEffect, useCallback } from 'react';
import { Search, Zap, Navigation, Shield, Network, Target } from 'lucide-react';
import './CommandPalette.css';

export default function CommandPalette({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Navigation commands
  const commands = [
    { id: 'overview', label: 'Go to Overview', icon: Shield, action: () => onNavigate('overview') },
    { id: 'network', label: 'Go to Network Analytics', icon: Network, action: () => onNavigate('network') },
    { id: 'threats', label: 'Go to Threat Intelligence', icon: Target, action: () => onNavigate('threats') },
    { id: 'assets', label: 'Go to Asset Inventory', icon: Shield, action: () => onNavigate('assets') },
    { id: 'sensors', label: 'Go to Sensor Management', icon: Navigation, action: () => onNavigate('sensors') },
  ];

  // Filter commands based on query
  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    }
  }, [filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-search-box">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="command-results">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`command-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <cmd.icon className="w-5 h-5 text-cyan-400" />
                <span>{cmd.label}</span>
                <kbd className="command-kbd">⏎</kbd>
              </div>
            ))
          ) : (
            <div className="command-empty">
              <p>No commands found</p>
            </div>
          )}
        </div>
        <div className="command-footer">
          <span className="command-hint">
            <kbd>↑</kbd> <kbd>↓</kbd> Navigate
          </span>
          <span className="command-hint">
            <kbd>⏎</kbd> Execute
          </span>
          <span className="command-hint">
            <kbd>Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}
