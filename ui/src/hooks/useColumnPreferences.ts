import { useState, useEffect, useCallback } from 'react';
import { Column } from '../components/base/BaseTable';

interface UseColumnPreferencesProps<T> {
  tableId: string;
  defaultColumns: Column<T>[];
}

interface ColumnPreference {
  key: string;
  visible: boolean;
  order: number;
}

export function useColumnPreferences<T>({ tableId, defaultColumns }: UseColumnPreferencesProps<T>) {
  const [preferences, setPreferences] = useState<ColumnPreference[]>([]);

  // Load preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem(`table_prefs_${tableId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with default columns to handle schema changes
        const merged = defaultColumns.map((col, index) => {
          const savedPref = parsed.find((p: ColumnPreference) => p.key === String(col.key));
          return {
            key: String(col.key),
            visible: savedPref ? savedPref.visible : true,
            order: savedPref ? savedPref.order : index,
          };
        });
        setPreferences(merged.sort((a, b) => a.order - b.order));
      } catch (e) {
        console.error('Failed to parse column preferences', e);
        initializeDefaults();
      }
    } else {
      initializeDefaults();
    }
  }, [tableId, defaultColumns]);

  const initializeDefaults = useCallback(() => {
    const defaults = defaultColumns.map((col, index) => ({
      key: String(col.key),
      visible: true,
      order: index,
    }));
    setPreferences(defaults);
  }, [defaultColumns]);

  // Save preferences whenever they change
  useEffect(() => {
    if (preferences.length > 0) {
      localStorage.setItem(`table_prefs_${tableId}`, JSON.stringify(preferences));
    }
  }, [preferences, tableId]);

  const toggleColumn = useCallback((key: string) => {
    setPreferences(prev => prev.map(p => 
      p.key === key ? { ...p, visible: !p.visible } : p
    ));
  }, []);

  const moveColumn = useCallback((fromIndex: number, toIndex: number) => {
    setPreferences(prev => {
      const newPrefs = [...prev];
      const [moved] = newPrefs.splice(fromIndex, 1);
      newPrefs.splice(toIndex, 0, moved);
      // Update order indices
      return newPrefs.map((p, index) => ({ ...p, order: index }));
    });
  }, []);

  const resetPreferences = useCallback(() => {
    localStorage.removeItem(`table_prefs_${tableId}`);
    initializeDefaults();
  }, [tableId, initializeDefaults]);

  // Computed visible columns for the table
  const visibleColumns = defaultColumns
    .filter(col => {
      const pref = preferences.find(p => p.key === String(col.key));
      return pref ? pref.visible : true;
    })
    .sort((a, b) => {
      const prefA = preferences.find(p => p.key === String(a.key));
      const prefB = preferences.find(p => p.key === String(b.key));
      return (prefA?.order ?? 0) - (prefB?.order ?? 0);
    });

  return {
    preferences,
    visibleColumns,
    toggleColumn,
    moveColumn,
    resetPreferences
  };
}
