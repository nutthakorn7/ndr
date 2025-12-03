import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Settings, GripVertical, RotateCcw, X, Check } from 'lucide-react';
import { Column } from './base/BaseTable';

interface ColumnCustomizerProps<T> {
  allColumns: Column<T>[];
  preferences: { key: string; visible: boolean; order: number }[];
  onToggle: (key: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onReset: () => void;
}

interface SortableItemProps {
  id: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
}

function SortableItem({ id, label, visible, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center gap-3 p-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded mb-2 group hover:border-[var(--sev-info)] transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 flex items-center gap-2">
        <input 
          type="checkbox" 
          checked={visible} 
          onChange={onToggle}
          className="rounded border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--sev-info)] focus:ring-0 focus:ring-offset-0"
        />
        <span className="text-sm text-[var(--text-primary)]">{label}</span>
      </div>
    </div>
  );
}

export function ColumnCustomizer<T>({ 
  allColumns, 
  preferences, 
  onToggle, 
  onMove, 
  onReset 
}: ColumnCustomizerProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = preferences.findIndex((p) => p.key === active.id);
      const newIndex = preferences.findIndex((p) => p.key === over?.id);
      onMove(oldIndex, newIndex);
    }
  };

  // Map preferences to actual columns to get headers
  const items = preferences.map(pref => {
    const col = allColumns.find(c => String(c.key) === pref.key);
    return {
      id: pref.key,
      label: col?.header || pref.key,
      visible: pref.visible
    };
  });

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 border rounded text-sm font-medium flex items-center gap-2 transition-colors ${
          isOpen 
            ? 'bg-[var(--bg-hover)] border-[var(--sev-info)] text-[var(--text-primary)]' 
            : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
        }`}
      >
        <Settings className="w-4 h-4" />
        Columns
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-app)] rounded-t-lg">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase">Customize Columns</h3>
              <button 
                onClick={onReset}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--sev-info)] flex items-center gap-1 transition-colors"
                title="Reset to default"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            
            <div className="p-3 max-h-[300px] overflow-y-auto">
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={items.map(i => i.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item) => (
                    <SortableItem 
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      visible={item.visible}
                      onToggle={() => onToggle(item.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div className="p-2 border-t border-[var(--border-subtle)] bg-[var(--bg-app)] rounded-b-lg flex justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-[var(--sev-info)] text-white rounded text-xs font-medium hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
