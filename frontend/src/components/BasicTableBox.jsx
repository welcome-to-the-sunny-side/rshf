import React from 'react';
import styles from './BasicTableBox.module.css';

export default function BasicTableBox({
  columns,
  data,
  backgroundColor = 'rgb(230, 240, 255)',
  className = '',
  sortable = false,
  noDataMessage // Added prop
}) {
  const showNoDataMessageRow = data.length === 0 && noDataMessage;

  return (
    <div className={`${styles.container} ${className}`}>
      <div className="contentBox tableContainer">
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={sortable ? `${styles.sortableColumn} ${styles.tableCellEllipsis}` : styles.tableCellEllipsis}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showNoDataMessageRow ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={styles.noDataCell} // Added class for styling
                  style={{ textAlign: 'center' }} // Added style for centering
                >
                  {noDataMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex} className={styles.tableCellEllipsis}>{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 