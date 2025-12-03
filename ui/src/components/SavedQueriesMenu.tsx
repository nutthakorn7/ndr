import React, { useState } from 'react';
import { Star, Trash2, Search, Clock, Bookmark } from 'lucide-react';
import { SavedQuery } from '../hooks/useSavedQueries';

interface SavedQueriesMenuProps {
  queries: SavedQuery[];
  onLoad: (query: SavedQuery) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SavedQueriesMenu: React.FC<SavedQueriesMenuProps> = ({
  queries,
  onLoad,
  onDelete,
  onToggleFavorite,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredQueries = queries
    .filter(q => activeTab === 'all' || q.isFavorite)
    .filter(q => q.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded pl-8 pr-3 py-1 text-sm text-[var(--text-primary)] focus:border-[var(--sev-info)] outline-none"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-subtle)]">
          <button
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider ${
              activeTab === 'all' 
                ? 'text-[var(--sev-info)] border-b-2 border-[var(--sev-info)]' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All Queries
          </button>
          <button
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider ${
              activeTab === 'favorites' 
                ? 'text-[var(--sev-info)] border-b-2 border-[var(--sev-info)]' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites
          </button>
        </div>

        {/* List */}
        <div className="max-h-64 overflow-y-auto">
          {filteredQueries.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No queries found</p>
            </div>
          ) : (
            filteredQueries.map(q => (
              <div 
                key={q.id}
                className="group flex items-center justify-between p-3 hover:bg-[var(--bg-hover)] border-b border-[var(--border-subtle)] last:border-0 transition-colors"
              >
                <div 
                  className="flex-1 cursor-pointer min-w-0 mr-2"
                  onClick={() => {
                    onLoad(q);
                    onClose();
                  }}
                >
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{q.name}</div>
                  <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(q.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(q.id);
                    }}
                    className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${
                      q.isFavorite ? 'text-yellow-400' : 'text-[var(--text-secondary)]'
                    }`}
                    title={q.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star className={`w-4 h-4 ${q.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(q.id);
                    }}
                    className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-red-400"
                    title="Delete query"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
