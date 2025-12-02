import { X } from 'lucide-react';
import './ShortcutsHelp.css';

export default function ShortcutsHelp({ onClose }) {
  return (
    <div className="shortcuts-help">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3>Keyboard Shortcuts</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="shortcuts-list">
        <div className="shortcut-item">
          <span>Search</span>
          <div className="shortcut-keys">
            <kbd className="shortcut-key">/</kbd>
          </div>
        </div>
        <div className="shortcut-item">
          <span>Command Palette</span>
          <div className="shortcut-keys">
            <kbd className="shortcut-key">Cmd</kbd>
            <kbd className="shortcut-key">K</kbd>
          </div>
        </div>
        <div className="shortcut-item">
          <span>Close / Escape</span>
          <div className="shortcut-keys">
            <kbd className="shortcut-key">Esc</kbd>
          </div>
        </div>
        <div className="shortcut-item">
          <span>Go to Dashboard</span>
          <div className="shortcut-keys">
            <kbd className="shortcut-key">g</kbd>
            <kbd className="shortcut-key">d</kbd>
          </div>
        </div>
        <div className="shortcut-item">
          <span>Go to Network</span>
          <div className="shortcut-keys">
            <kbd className="shortcut-key">g</kbd>
            <kbd className="shortcut-key">n</kbd>
          </div>
        </div>
        <div className="shortcut-item">
          <span>Go to Threats</span>
          <div className="shortcut-keys">
            <kbd className="shortcut-key">g</kbd>
            <kbd className="shortcut-key">t</kbd>
          </div>
        </div>
        <div className="shortcut-item">
          <span>Show this help</span>
          <div className="shortcut-keys">
            <kbd className="shortcut-key">?</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
