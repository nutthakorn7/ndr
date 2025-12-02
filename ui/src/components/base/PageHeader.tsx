import React from 'react';
import './PageHeader.css';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader - Standard page header with title and actions
 * 
 * @example
 * ```tsx
 * <PageHeader 
 *   title="Dashboard" 
 *   subtitle="Overview of your network"
 *   actions={<BaseButton>Export</BaseButton>}
 * />
 * ```
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className = ''
}) => {
  return (
    <div className={`page-header ${className}`}>
      {breadcrumbs && (
        <div className="page-header__breadcrumbs">
          {breadcrumbs}
        </div>
      )}
      <div className="page-header__main">
        <div className="page-header__content">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && (
            <p className="page-header__subtitle">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="page-header__actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
