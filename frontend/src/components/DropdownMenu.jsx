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
  const wrapperRef = useRef(null);

  // Convert children (option elements) to array of { value, label }
  const options = React.Children.toArray(children)
    .filter(child => React.isValidElement(child) && child.type === 'option')
    .map(child => ({ value: child.props.value, label: child.props.children }));

  const selected = options.find(opt => String(opt.value) === String(value));

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
      <button
        type="button"
        className={styles.dropdownMenu}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
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
