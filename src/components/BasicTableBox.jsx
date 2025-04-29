import React from 'react';
import styles from './BasicTableBox.module.css';

export default function BasicTableBox({ 
  columns, 
  data,
  backgroundColor = 'rgb(230, 240, 255)',
  className = '',
  sortable = false
}) {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className="contentBox tableContainer">
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index} className={sortable ? styles.sortableColumn : ''}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 