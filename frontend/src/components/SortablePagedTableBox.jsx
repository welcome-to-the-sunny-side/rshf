import React, { useState, useEffect, useMemo } from 'react';
import TableBox from './TableBox';
import BasicTableBox from './BasicTableBox';
import styles from './PagedTableBox.module.css';
import sortStyles from './SortablePagedTableBox.module.css';

// Helper functions moved outside the component for stability
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

const SortablePagedTableBox = ({ 
  title, 
  columns, 
  data, // This should be memoized by the parent component
  backgroundColor, 
  itemsPerPage = 15, 
  className,
  initialSortColumnIndex = -1,
  initialSortDirection = 'desc',
  pinnedRows = [] // Parent should memoize this if it's not static
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumnIndex, setSortColumnIndex] = useState(initialSortColumnIndex);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);

  // Memoize the sorting logic to produce stable sortedData
  const sortedData = useMemo(() => {
    let dataToSort = [...data]; // Work with a copy of the potentially memoized data prop
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

  // Effect to reset page only when sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortColumnIndex, sortDirection]);
  
  // Calculate total pages based on the memoized sortedData
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Ensure currentPage is valid after data/sorting changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages); // Go to last page if current is out of bounds
    } else if (currentPage < 1 && totalPages > 0) {
        setCurrentPage(1)
    }
  }, [currentPage, totalPages]);

  // Calculate the current page's data slice based on sortedData
  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    let pageData = sortedData.slice(startIndex, endIndex);

    // Add empty rows logic (remains the same)
    if (currentPage === totalPages && sortedData.length % itemsPerPage !== 0 && sortedData.length > 0) {
      const emptyRowsNeeded = itemsPerPage - (sortedData.length % itemsPerPage);
      const templateRow = sortedData.length > 0 ? sortedData[0] : columns.map(() => "");
      for (let i = 0; i < emptyRowsNeeded; i++) {
        const emptyRow = templateRow.map((_, idx) => (
          <span key={`empty-${i}-${idx}`} className={styles.spacerCell}>&nbsp;</span>
        ));
        pageData.push(emptyRow);
      }
    }
    return pageData;
  }, [currentPage, sortedData, itemsPerPage, totalPages, columns]); // Include columns for templateRow stability
  
  // --- Pagination Handlers (remain the same) ---
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // --- Page Number Generation (remains the same) ---
  const getPageNumbers = () => {
    const pageNumbers = [];
    if (totalPages <= 1) return pageNumbers;
    pageNumbers.push(1);
    if (currentPage > 3) {
      pageNumbers.push('...');
    }
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pageNumbers.push(i);
    }
    if (currentPage < totalPages - 2) {
      pageNumbers.push('...');
    }
    pageNumbers.push(totalPages);
    return pageNumbers;
  };

  // --- Sort Handler (remains the same) ---
  const handleHeaderClick = (columnIndex) => {
    if (columnIndex === sortColumnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumnIndex(columnIndex);
      setSortDirection('asc'); // Default to ascending when changing column
    }
  };

  // --- Render Sortable Columns (remains the same, but uses stable columns prop) ---
  const sortableColumns = useMemo(() => {
      return columns.map((column, index) => (
        <div 
          key={`header-${index}`}
          className={sortStyles.sortableHeader}
          onClick={() => handleHeaderClick(index)}
          role="button" // Add accessibility role
          tabIndex={0}  // Make it focusable
          onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleHeaderClick(index)} // Keyboard activation
        >
          {column}
          {sortColumnIndex === index && (
            <span className={sortStyles.sortIcon}>
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      ));
  }, [columns, sortColumnIndex, sortDirection]); // Depend on columns reference
  
  return (
    <div className={className}>
      {title ? (
        <TableBox 
          title={title}
          columns={sortableColumns}
          data={currentData}
          backgroundColor={backgroundColor}
          sortable={true}
        />
      ) : (
        <BasicTableBox 
          columns={sortableColumns}
          data={currentData}
          backgroundColor={backgroundColor}
          sortable={true}
        />
      )}
      
      {totalPages > 1 && (
        <div className={styles.paginationContainer}>
          <button 
            className={styles.pageButton} 
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            aria-label="Previous Page" // Add accessibility label
          >
            ←
          </button>
          
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className={styles.ellipsis}>...</span>
            ) : (
              <button
                key={page}
                className={`${styles.pageButton} ${currentPage === page ? styles.activePage : ''}`}
                onClick={() => goToPage(page)}
                aria-current={currentPage === page ? 'page' : undefined} // Accessibility
                aria-label={`Go to page ${page}`} // Accessibility
              >
                {page}
              </button>
            )
          ))}
          
          <button 
            className={styles.pageButton} 
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            aria-label="Next Page" // Add accessibility label
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};

export default SortablePagedTableBox; 