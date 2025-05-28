import React, { useState } from 'react';
import TableBox from './TableBox'; // Assuming this is the preferred base
import BasicTableBox from './BasicTableBox'; // Or this, will confirm usage
import styles from './LazyLoadingSortablePagedTableBox.module.css';
// Potentially import PropTypes if used in the project
// import PropTypes from 'prop-types';

const LazyLoadingSortablePagedTableBox = ({
  title,
  columns = [],
  items = [],
  totalItems = 0,
  itemsPerPage = 15,
  currentPage = 1,
  onPageChange = () => {},
  sortConfig = { key: '', direction: 'asc' },
  onSortChange = () => {},
  isLoading = false,
  error = null,
  noDataMessage = "No data available.",
  className = '',
  tableBoxClassName = '',
  backgroundColor,
  // pinnedRows = [], // Revisit pinnedRows later if essential for MVP
}) => {
  // State for the jump to page input
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Header rendering logic
  // Columns for TableBox/BasicTableBox (interactive header elements)
  const tableBoxColumns = columns.map((col) => {
    const isSortable = col.sortable !== false; // Default to true
    const isCurrentSortCol = sortConfig.key === col.key;
    return (
      <div // Mimicking SortableTableBox's structure for headers
        key={`header-${col.key}`}
        className={isSortable ? styles.sortableHeader : ''} // Use exactly sortableHeader only like in SortablePagedTableBox
        onClick={() => isSortable && onSortChange(col.key)}
        role={isSortable ? "button" : undefined}
        tabIndex={isSortable ? 0 : undefined}
        onKeyPress={(e) => isSortable && (e.key === 'Enter' || e.key === ' ') && onSortChange(col.key)}
      >
        {col.label}
        {isSortable && isCurrentSortCol && (
          <span className={styles.sortIcon}>
            {sortConfig.direction === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    );
  });

  // Body rendering logic: Transform `items` based on `columns`' `render` function.
  // This transformed data will be passed to TableBox/BasicTableBox.
  const processedItems = items.map((item, itemIndex) => {
    return columns.map((col) => {
      if (col.render) {
        return col.render(item, itemIndex);
      }
      // Ensure item[col.key] is accessed safely and provide a fallback for undefined values.
      const cellValue = item[col.key];
      return cellValue !== undefined && cellValue !== null ? cellValue : '';
    });
  });
  
  // Handler for jump to page
  const handleJumpToPage = () => {
    const pageNumber = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
      setJumpPageInput(''); // Clear input after jumping
    }
  };

  // Handle enter key in jump to page input
  const handleJumpInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };
  
  // Render jump to page control
  const renderJumpToPage = () => {
    if (totalPages <= 1 || totalItems === 0) return null;
    
    return (
      <div className={styles.jumpToPageContainer}>
        <input
          type="text"
          value={jumpPageInput}
          onChange={(e) => setJumpPageInput(e.target.value)}
          onKeyPress={handleJumpInputKeyPress}
          className={styles.jumpToPageInput}
          placeholder={`1-${totalPages}`}
          aria-label="Jump to page"
          disabled={isLoading}
        />
        <button
          className={styles.pageButton}
          onClick={handleJumpToPage}
          disabled={isLoading}
        >
          Jump
        </button>
      </div>
    );
  };

  // Pagination rendering logic
  const renderPagination = () => {
    if (totalPages <= 1 || totalItems === 0) return null;
    // Basic Previous/Next for now, can enhance with page numbers like PagedTableBox
    // Re-using PagedTableBox's pagination style and logic would be ideal here.
    // For now, a simplified version:
    const pageNumbers = [];
    if (totalPages <= 7) { // Show all pages if 7 or less
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
    } else {
        pageNumbers.push(1); // Always show first page
        if (currentPage > 3) {
            pageNumbers.push('...');
        }
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            pageNumbers.push(i);
        }
        if (currentPage < totalPages - 2) {
            pageNumbers.push('...');
        }
        pageNumbers.push(totalPages); // Always show last page
    }

    return (
      <div className={styles.paginationContainer}> {/* Use styles from PagedTableBox.module.css */}
        <button 
          className={styles.pageButton} 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
        >
          ←
        </button>
        
        {pageNumbers.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className={styles.ellipsis}>...</span>
          ) : (
            <button
              key={page}
              className={`${styles.pageButton} ${currentPage === page ? styles.activePage : ''}`}
              onClick={() => onPageChange(page)}
              disabled={isLoading}
            >
              {page}
            </button>
          )
        ))}
        
        <button 
          className={styles.pageButton} 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
        >
          →
        </button>
      </div>
    );
  };

  if (isLoading && items.length === 0) { // Show loading only if there's no data yet
    return <div className={styles.loadingMessage}>Loading...</div>; 
  }

  if (error) {
    return <div className={styles.errorMessage}>{typeof error === 'string' ? error : 'An error occurred.'}</div>;
  }

  if (totalItems === 0 && !isLoading && !error) {
    return <div className={styles.noDataMessage}>{noDataMessage}</div>;
  }
  
  const TableComponent = title ? TableBox : BasicTableBox;

  return (
    <div className={`${styles.container} ${className}`}>
      <TableComponent
        title={title}
        columns={tableBoxColumns} 
        data={processedItems} 
        backgroundColor={backgroundColor}
        className={tableBoxClassName}
        sortable={true} /* This is critical to make th elements get .sortableColumn class */
      />
      {/* Display loading indicator subtly if loading more pages but data already exists */}
      {isLoading && items.length > 0 && <div className={styles.loadingMoreMessage}>Loading more...</div>}
      {renderPagination()}
      {renderJumpToPage()}
    </div>
  );
};

export default LazyLoadingSortablePagedTableBox;
