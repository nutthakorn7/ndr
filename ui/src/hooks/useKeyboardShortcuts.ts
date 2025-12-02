import { useEffect, useRef } from 'react';

/**
 * Custom hook for handling keyboard shortcuts
 * @param {Object} shortcuts - Map of key combinations to callbacks
 * 
 * Supported formats:
 * - Single key: 'a', '/', 'Escape'
 * - With modifier: 'Ctrl+k', 'Meta+k'
 * - Sequence: 'g n' (press g, then n)
 */
export function useKeyboardShortcuts(shortcuts = {}) {
  const sequenceRef = useRef('');
  const sequenceTimerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isInputFocused = 
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable;

      // Build key combination string
      const modifiers = [];
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.metaKey) modifiers.push('Meta');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey && e.key.length > 1) modifiers.push('Shift'); // Only add Shift for special keys

      const key = e.key;
      const combination = modifiers.length > 0 
        ? `${modifiers.join('+')}+${key}`
        : key;

      // Handle sequences (e.g., "g n" for go to network)
      if (sequenceRef.current) {
        const fullSequence = `${sequenceRef.current} ${key}`;
        
        // Check if this completes a sequence
        if (shortcuts[fullSequence]) {
          e.preventDefault();
          shortcuts[fullSequence](e);
          sequenceRef.current = '';
          clearTimeout(sequenceTimerRef.current);
          return;
        }
      }

      // Check for direct match
      if (shortcuts[combination]) {
        // Allow '/' to work even in inputs for search
        if (combination === '/' && isInputFocused) {
          return; // Let it type normally
        }
        
        if (!isInputFocused) {
          e.preventDefault();
          shortcuts[combination](e);
        }
        return;
      }

      // Start a sequence if this key could be part of one
      const possibleSequences = Object.keys(shortcuts).filter(s => s.startsWith(key + ' '));
      if (possibleSequences.length > 0 && !isInputFocused) {
        e.preventDefault();
        sequenceRef.current = key;
        
        // Clear sequence after 1 second if no second key pressed
        clearTimeout(sequenceTimerRef.current);
        sequenceTimerRef.current = setTimeout(() => {
          sequenceRef.current = '';
        }, 1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(sequenceTimerRef.current);
    };
  }, [shortcuts]);
}

export default useKeyboardShortcuts;
