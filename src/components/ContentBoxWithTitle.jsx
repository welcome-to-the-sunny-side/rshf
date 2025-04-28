import React from 'react';
import styles from './ContentBoxWithTitle.module.css';

export default function ContentBoxWithTitle({ title, children, backgroundColor = 'rgb(230, 240, 255)', className = '' }) {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.titleBox} style={{ backgroundColor }}>{title}</div>
      <div className={styles.contentBox}>
        {children}
      </div>
    </div>
  );
} 