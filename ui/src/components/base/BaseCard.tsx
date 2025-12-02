import React from 'react';
import './BaseCard.css';

export interface BaseCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  elevated?: boolean;
  bordered?: boolean;
  footer?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * BaseCard - Reusable card container component
 * 
 * @example
 * ```tsx
 * <BaseCard title="My Card" elevated>
 *   <p>Content here</p>
 * </BaseCard>
 * ```
 * 
 * @see Design System: ui/DESIGN_SYSTEM.md#card
 */
export const BaseCard: React.FC<BaseCardProps> = ({
  title,
  subtitle,
  children,
  elevated,
  bordered,
  footer,
  className = '',
  onClick
}) => {
  const classes = [
    'card',
    elevated && 'card--elevated',
    bordered && 'card--bordered',
    onClick && 'card--clickable',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick}>
      {(title || subtitle) && (
        <div className="card__header">
          {title && <h3 className="card__title">{title}</h3>}
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="card__body">
        {children}
      </div>
      {footer && (
        <div className="card__footer">
          {footer}
        </div>
      )}
    </div>
  );
};
