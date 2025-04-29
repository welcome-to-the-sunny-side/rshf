import React from 'react';
import BasicTableBox from './BasicTableBox';
import styles from './TableBox.module.css';

export default function TableBox({ 
  title, 
  columns, 
  data,
  backgroundColor = 'rgb(230, 240, 255)', // Same default as TitledBox
  className = '',
  sortable = false
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.titleBox} style={{ backgroundColor }}>
        {title}
      </div>
      <BasicTableBox
        columns={columns}
        data={data}
        backgroundColor={backgroundColor}
        className={className}
        sortable={sortable}
      />
    </div>
  );
} 