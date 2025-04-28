import React from 'react';
import styles from './TableBox.module.css';

export default function TableBox({ 
  title, 
  columns, 
  data,
  backgroundColor = 'rgb(230, 240, 255)', // Same default as TitledBox
  className = ''
}) {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.titleBox} style={{ backgroundColor }}>
        {title}
      </div>
      <div className="contentBox tableContainer">
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                {columns.map((column, colIndex) => (
                  <td key={colIndex}>{row[colIndex]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 