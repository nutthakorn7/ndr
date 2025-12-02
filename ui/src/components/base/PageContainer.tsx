import React from 'react';
import './PageContainer.css';

export interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

/**
 * PageContainer - Standard page wrapper with max-width
 * 
 * @example
 * ```tsx
 * <PageContainer maxWidth="xl">
 *   <PageHeader title="Dashboard" />
 *   {content}
 * </PageContainer>
 * ```
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'xl',
  className = ''
}) => {
  const classes = [
    'page-container',
    `page-container--${maxWidth}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
};
