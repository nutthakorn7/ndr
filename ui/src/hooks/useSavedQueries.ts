import { useState, useEffect } from 'react';

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  filters: Record<string, any>;
  isFavorite: boolean;
  createdAt: number;
}

export function useSavedQueries() {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('saved_queries');
    if (stored) {
      try {
        setSavedQueries(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse saved queries', e);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('saved_queries', JSON.stringify(savedQueries));
  }, [savedQueries]);

  const saveQuery = (name: string, query: string, filters: Record<string, any>) => {
    const newQuery: SavedQuery = {
      id: crypto.randomUUID(),
      name,
      query,
      filters,
      isFavorite: false,
      createdAt: Date.now()
    };
    setSavedQueries(prev => [newQuery, ...prev]);
  };

  const deleteQuery = (id: string) => {
    setSavedQueries(prev => prev.filter(q => q.id !== id));
  };

  const toggleFavorite = (id: string) => {
    setSavedQueries(prev => prev.map(q => 
      q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
    ));
  };

  return {
    savedQueries,
    saveQuery,
    deleteQuery,
    toggleFavorite
  };
}
