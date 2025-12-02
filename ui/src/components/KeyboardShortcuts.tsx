import { useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import './KeyboardShortcuts.css';

interface Shortcut {
  keys: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: '?', description: 'Show keyboard shortcuts' },
  { keys: '/', description: 'Focus search' },
  { keys: 'Esc', description: 'Close modals/dialogs' },
  { keys: 'Ctrl + K', description: 'Quick command palette (coming soon)' },
  { keys: 'P', description: 'Pause/Resume threat feed' },
  { keys: 'T', description: 'Toggle theme (dark/light)' },
  { keys: '1-5', description: 'Switch between main tabs' },
  { keys: 'Ctrl + E', description: 'Export current view' },
];

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for '?' key
  useState(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  });

  if (!isOpen) {
    return (
      <button
        className="shortcuts-hint"
        onClick={() => setIsOpen(true)}
        title="Keyboard shortcuts"
      >
        <Keyboard className="w-4 h-4" />
        <span>?</span>
      </button>
    );
  }

  return (
    <div className="shortcuts-overlay" onClick={() => setIsOpen(false)}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <div className="header-title">
            <Keyboard className="w-5 h-5" />
            <h2>Keyboard Shortcuts</h2>
          </div>
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="shortcuts-content">
          <div className="shortcuts-grid">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <div className="shortcut-keys">
                  {shortcut.keys.split(' + ').map((key, i) => (
                    <span key={i}>
                      <kbd className="key">{key}</kbd>
                      {i < shortcut.keys.split(' + ').length - 1 && <span className="plus">+</span>}
                    </span>
                  ))}
                </div>
                <div className="shortcut-description">{shortcut.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="shortcuts-footer">
          <p>Press <kbd className="key">?</kbd> or <kbd className="key">Esc</kbd> to close</p>
        </div>
      </div>
    </div>
  );
}
