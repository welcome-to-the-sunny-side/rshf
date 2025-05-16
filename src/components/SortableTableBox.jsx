import React, { useState, useMemo } from 'react';
import TableBox from './TableBox';
import BasicTableBox from './BasicTableBox';
import sortStyles from './SortablePagedTableBox.module.css';

// Helper functions for sorting
const getTextContentFromCell = (cell) => {
  // Handle null/undefined values
  if (cell === null || cell === undefined) return '';
  // If it's a primitive (string, number, etc.), convert to string
  if (typeof cell !== 'object') return String(cell);
  // If it's a React element, try to access text content
  if (React.isValidElement(cell)) {
    const props = cell.props;
    // Get content directly from Link components
    if (cell.type && cell.type.name === 'Link' && props.children) {
      return String(props.children);
    }
    // Handle spans with text content
    if (cell.type === 'span' && props.children) {
      return String(props.children);
    }
    // For other elements, try the children
    if (props.children) {
      if (typeof props.children === 'string' || typeof props.children === 'number') {
        return String(props.children);
      } else if (Array.isArray(props.children)) {
        return props.children
          .filter(child => typeof child === 'string' || typeof child === 'number')
          .join('');
      }
    }
  }
  // Fallback
  return '';
};

const getComparableValue = (value) => {
  if (!value) return value;
  const cleanedValue = value.replace(/,/g, '');
  const numberValue = parseFloat(cleanedValue);
  if (!isNaN(numberValue)) {
    return numberValue;
  }
  const dateValue = new Date(value);
  if (!isNaN(dateValue.getTime())) {
    return dateValue.getTime();
  }
  return value;
};

const SortableTableBox = ({ 
  title, 
  columns, 
  data,
  backgroundColor, 
  className,
  initialSortColumnIndex = -1,
  initialSortDirection = 'desc',
  pinnedRows = []
}) => {
  const [sortColumnIndex, setSortColumnIndex] = useState(initialSortColumnIndex);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);

  // Memoize the sorting logic to produce stable sortedData
  const sortedData = useMemo(() => {
    let dataToSort = [...data];
    if (sortColumnIndex >= 0 && sortColumnIndex < columns.length) {
      dataToSort.sort((a, b) => {
        const textA = getTextContentFromCell(a[sortColumnIndex]);
        const textB = getTextContentFromCell(b[sortColumnIndex]);
        const valueA = getComparableValue(textA);
        const valueB = getComparableValue(textB);

        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        return sortDirection === 'asc' 
          ? String(valueA).localeCompare(String(valueB)) 
          : String(valueB).localeCompare(String(valueA));
      });
    }
    // Always return the combined data (pinned first, then sorted/unsorted)
    return [...pinnedRows, ...dataToSort];
  }, [data, pinnedRows, sortColumnIndex, sortDirection, columns.length]);

  // Handle column header clicks for sorting
  const handleHeaderClick = (columnIndex) => {
    if (columnIndex === sortColumnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumnIndex(columnIndex);
      setSortDirection('asc'); // Default to ascending when changing column
    }
  };

  // Create sortable column headers
  const sortableColumns = useMemo(() => {
    return columns.map((column, index) => (
      <div 
        key={`header-${index}`}
        className={sortStyles.sortableHeader}
        onClick={() => handleHeaderClick(index)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleHeaderClick(index)}
      >
        {column}
        {sortColumnIndex === index && (
          <span className={sortStyles.sortIcon}>
            {sortDirection === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    ));
  }, [columns, sortColumnIndex, sortDirection]);
  
  return (
    <div className={className}>
      {title ? (
        <TableBox 
          title={title}
          columns={sortableColumns}
          data={sortedData}
          backgroundColor={backgroundColor}
          sortable={true}
        />
      ) : (
        <BasicTableBox 
          columns={sortableColumns}
          data={sortedData}
          backgroundColor={backgroundColor}
          sortable={true}
        />
      )}
    </div>
  );
};

export default SortableTableBox;
