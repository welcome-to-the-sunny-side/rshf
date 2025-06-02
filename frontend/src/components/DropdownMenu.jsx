import React, { useState, useRef, useEffect } from 'react';
import styles from './DropdownMenu.module.css';

/**
 * Custom dropdown menu for consistent styling.
 * Props:
 * - value: selected value
 * - onChange: (event) => void
 * - disabled: disables the dropdown
 * - children: <option> elements (value, children)
 * - className: extra classes
 * - ...rest: other props
 */
const DropdownMenu = ({ value, onChange, disabled, children, className = '', ...rest }) => {
  const [open, setOpen] = useState(false);
  const [minWidth, setMinWidth] = useState(undefined);
  const wrapperRef = useRef(null);
  const measureRef = useRef(null);

  // Convert children (option elements) to array of { value, label }
  const options = React.Children.toArray(children)
    .filter(child => React.isValidElement(child) && child.type === 'option')
    .map(child => ({ value: child.props.value, label: child.props.children }));

  const selected = options.find(opt => String(opt.value) === String(value));

  // Find the longest label (as string)
  const longestLabel = options.reduce((max, opt) => {
    const labelStr = String(opt.label);
    return labelStr.length > max.length ? labelStr : max;
  }, selected ? String(selected.label) : '');

  // Measure the width of the longest label
  useEffect(() => {
    if (measureRef.current) {
      setMinWidth(measureRef.current.offsetWidth + 36); // add padding & icon width
    }
  }, [longestLabel, options.length]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Keyboard navigation
  function handleKeyDown(e) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(o => !o);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleSelect(option) {
    if (disabled) return;
    if (option.value !== value) {
      // Simulate a synthetic event with target.value
      onChange && onChange({ target: { value: option.value } });
    }
    setOpen(false);
  }

  return (
    <div
      className={
        `${styles.dropdownWrapper} ${open ? styles.open : ''} ${disabled ? styles.disabled : ''} ${className}`
      }
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      ref={wrapperRef}
      {...rest}
    >
      {/* Hidden span for measuring the longest label */}
      <span
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          height: 'auto',
          width: 'auto',
          whiteSpace: 'nowrap',
          fontSize: '0.8rem',
          fontWeight: 400,
          padding: '6px 28px 6px 16px',
          fontFamily: 'inherit',
        }}
        aria-hidden="true"
      >
        {longestLabel}
      </span>
      <button
        type="button"
        className={styles.dropdownMenu}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={minWidth ? { minWidth } : {}}
      >
        <span className={styles.dropdownSelected}>{selected ? selected.label : ''}</span>
        <span className={styles.dropdownIcon} aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      {open && (
        <ul className={styles.dropdownList} role="listbox">
          {options.map(option => (
            <li
              key={option.value}
              className={
                styles.dropdownOption +
                (String(option.value) === String(value) ? ' ' + styles.selected : '')
              }
              role="option"
              aria-selected={String(option.value) === String(value)}
              tabIndex={-1}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownMenu;
