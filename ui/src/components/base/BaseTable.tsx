import React from 'react';
import './BaseTable.css';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface BaseTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  selectedRowId?: string | number;
  emptyMessage?: string;
  className?: string;
  loading?: boolean;
}

/**
 * BaseTable - Reusable data table component
 * 
 * @example
 * ```tsx
 * const columns = [
 *   { key: 'name', header: 'Name' },
 *   { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> }
 * ];
 * 
 * <BaseTable data={items} columns={columns} />
 * ```
 */
export function BaseTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  selectedRowId,
  emptyMessage = 'No data available',
  className = '',
  loading = false
}: BaseTableProps<T>) {
  return (
    <div className={`table-container ${className}`}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th 
                key={String(col.key) + idx} 
                style={{ 
                  width: col.width, 
                  textAlign: col.align || 'left' 
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="table__loading">
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={selectedRowId === row.id ? 'table__row--selected' : ''}
              >
                {columns.map((col, idx) => (
                  <td key={String(col.key) + idx} style={{ textAlign: col.align || 'left' }}>
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
