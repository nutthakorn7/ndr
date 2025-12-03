import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Keyboard, 
  X, 
  LayoutDashboard, 
  Search, 
  Bell, 
  Workflow, 
  Settings, 
  HelpCircle 
} from 'lucide-react';

interface ShortcutGroup {
  category: string;
  shortcuts: {
    keys: string[];
    description: string;
    icon?: React.ElementType;
  }[];
}

export const ShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastKeyTime, setLastKeyTime] = useState<number>(0);
  const navigate = useNavigate();

  const shortcuts: ShortcutGroup[] = [
    {
      category: 'Navigation',
      shortcuts: [
        { keys: ['g', 'd'], description: 'Go to Dashboard', icon: LayoutDashboard },
        { keys: ['g', 'i'], description: 'Go to Investigation', icon: Search },
        { keys: ['g', 'a'], description: 'Go to Alerts', icon: Bell },
        { keys: ['g', 'p'], description: 'Go to Playbooks', icon: Workflow },
        { keys: ['g', 's'], description: 'Go to Settings', icon: Settings },
      ]
    },
    {
      category: 'Global',
      shortcuts: [
        { keys: ['?'], description: 'Show Keyboard Shortcuts', icon: HelpCircle },
        { keys: ['/'], description: 'Focus Search (Investigation)', icon: Search },
      ]
    }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const now = Date.now();

      // Toggle Help Modal (?)
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // Close Modal (Esc)
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      // Navigation Sequence Logic (g + key)
      if (e.key === 'g') {
        setLastKeyTime(now);
        return;
      }

      // Check if 'g' was pressed recently (within 500ms)
      if (now - lastKeyTime < 500) {
        switch (e.key) {
          case 'd':
            navigate('/');
            setIsOpen(false);
            break;
          case 'i':
            navigate('/investigation');
            setIsOpen(false);
            break;
          case 'a':
            navigate('/alerts');
            setIsOpen(false);
            break;
          case 'p':
            navigate('/playbooks');
            setIsOpen(false);
            break;
          case 's':
            navigate('/settings');
            setIsOpen(false);
            break;
        }
        setLastKeyTime(0); // Reset
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lastKeyTime, navigate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[var(--sev-info)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-2 gap-8">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                {group.category}
              </h3>
              <div className="space-y-3">
                {group.shortcuts.map((shortcut, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                      {shortcut.icon && <shortcut.icon className="w-4 h-4 text-[var(--text-secondary)]" />}
                      <span className="text-sm">{shortcut.description}</span>
                    </div>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, kIdx) => (
                        <kbd 
                          key={kIdx}
                          className="px-2 py-1 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded text-xs font-mono text-[var(--text-primary)] min-w-[24px] text-center shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--bg-app)] border-t border-[var(--border-subtle)] text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-[10px] font-mono mx-1">?</kbd> to toggle this menu at any time
          </p>
        </div>
      </div>
    </div>
  );
};
