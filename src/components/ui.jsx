// components/ui.jsx
// This file contains simple UI components that mimic Element UI's behavior
import React from 'react';

// Radio components
export const Radio = ({ children, value, checked, onChange, ...props }) => {
  return (
    <label className="radio">
      <input
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
        {...props}
      />
      <span className="radio-label">{children}</span>
    </label>
  );
};

Radio.Group = ({ children, value, onChange, ...props }) => {
  return (
    <div
      className="radio-group"
      {...props}
    >
      {React.Children.map(children, (child) => {
        return React.cloneElement(child, {
          checked: child.props.value === value,
          onChange: (e) => onChange && onChange(e.target.value),
        });
      })}
    </div>
  );
};

// Button component
export const Button = ({ children, type = 'default', onClick, className = '', ...props }) => {
  const buttonClass = `button ${type} ${className}`;

  return (
    <button
      className={buttonClass}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Input component
export const Input = ({ value, onChange, className = '', ...props }) => {
  return (
    <input
      className={`input ${className}`}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
};

// TextArea component
Input.TextArea = ({ value, onChange, className = '', ...props }) => {
  return (
    <textarea
      className={`textarea ${className}`}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
};

// Form components
export const Form = ({ children, ...props }) => {
  return <form {...props}>{children}</form>;
};

Form.Item = ({ label, children, ...props }) => {
  return (
    <div
      className="form-item"
      {...props}
    >
      {label && <label className="form-item-label">{label}</label>}
      <div className="form-item-content">{children}</div>
    </div>
  );
};

// Dialog component
export const Dialog = ({ title, visible, width = '50%', onClose, children, footer, ...props }) => {
  if (!visible) return null;

  return (
    <div className="dialog-wrapper">
      <div
        className="dialog-mask"
        onClick={onClose}
      ></div>
      <div
        className="dialog"
        style={{ width }}
        {...props}
      >
        <div className="dialog-header">
          <span className="dialog-title">{title}</span>
          <button
            className="dialog-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
};

// Spin component
export const Spin = ({ spinning = false, children }) => {
  return (
    <div className="spin-container">
      {spinning && (
        <div className="spin-overlay">
          <div className="spin-indicator"></div>
        </div>
      )}
      <div className={spinning ? 'spin-content spin-blur' : 'spin-content'}>{children}</div>
    </div>
  );
};
