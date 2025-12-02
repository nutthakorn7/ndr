import React, { forwardRef } from 'react';
import './BaseInput.css';

export interface BaseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

/**
 * BaseInput - Consistent form input component
 * 
 * @example
 * ```tsx
 * <BaseInput 
 *   label="Email" 
 *   type="email"
 *   error="Invalid email"
 * />
 * ```
 */
export const BaseInput = forwardRef<HTMLInputElement, BaseInputProps>(({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}, ref) => {
  const inputClasses = [
    'input',
    error && 'input--error',
    icon && 'input--with-icon',
    icon && iconPosition === 'left' && 'input--icon-left',
    icon && iconPosition === 'right' && 'input--icon-right',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input-wrapper">
      {label && (
        <label className="input__label">
          {label}
        </label>
      )}
      <div className="input__container">
        {icon && iconPosition === 'left' && (
          <span className="input__icon input__icon--left">{icon}</span>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <span className="input__icon input__icon--right">{icon}</span>
        )}
      </div>
      {error && (
        <span className="input__error">{error}</span>
      )}
      {helperText && !error && (
        <span className="input__helper">{helperText}</span>
      )}
    </div>
  );
});

BaseInput.displayName = 'BaseInput';
