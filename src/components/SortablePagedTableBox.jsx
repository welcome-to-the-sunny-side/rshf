import React, { useState, useEffect } from 'react';
import TableBox from './TableBox';
import BasicTableBox from './BasicTableBox';
import styles from './PagedTableBox.module.css';
import sortStyles from './SortablePagedTableBox.module.css';

const SortablePagedTableBox = ({ 
  title, 
  columns, 
  data, 
  backgroundColor, 
  itemsPerPage = 15, 
  className,
  initialSortColumnIndex = -1,
  initialSortDirection = 'desc',
  pinnedRows = [] // Rows that should stay at the top regardless of sorting
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumnIndex, setSortColumnIndex] = useState(initialSortColumnIndex);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);
  const [sortedData, setSortedData] = useState([...pinnedRows, ...data]);
  
  // Effect to sort data when sort parameters change
  useEffect(() => {
    if (sortColumnIndex >= 0 && sortColumnIndex < columns.length) {
      const nonPinnedData = data.slice(0);
      
      // Sort the non-pinned data
      nonPinnedData.sort((a, b) => {
        // Extract the text content for comparison
        const textA = getTextContentFromCell(a[sortColumnIndex]);
        const textB = getTextContentFromCell(b[sortColumnIndex]);
        
        // Convert to comparable values (handling numbers with commas)
        const valueA = getComparableValue(textA);
        const valueB = getComparableValue(textB);
        
        // Compare based on type
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        
        // String comparison
        return sortDirection === 'asc' 
          ? String(valueA).localeCompare(String(valueB)) 
          : String(valueB).localeCompare(String(valueA));
      });
      
      // Combine pinned rows with sorted non-pinned data
      setSortedData([...pinnedRows, ...nonPinnedData]);
    } else {
      // No sorting, just combine pinned and original data
      setSortedData([...pinnedRows, ...data]);
    }
    
    // Reset to first page when sort changes
    setCurrentPage(1);
  }, [sortColumnIndex, sortDirection, data, pinnedRows, columns.length]);
  
  // Helper function to extract text content from a cell (which might be a React element)
  const getTextContentFromCell = (cell) => {
    // Handle null/undefined values
    if (cell === null || cell === undefined) return '';
    
    // If it's a primitive (string, number, etc.), convert to string
    if (typeof cell !== 'object') return String(cell);
    
    // If it's a React element, try to access text content
    if (React.isValidElement(cell)) {
      const props = cell.props;
      
      // Get content directly from Link components (common in our tables)
      if (cell.type && cell.type.name === 'Link' && props.children) {
        return String(props.children);
      }
      
      // Handle spans with text content (also common in our tables)
      if (cell.type === 'span' && props.children) {
        return String(props.children);
      }
      
      // For other elements, try the children
      if (props.children) {
        if (typeof props.children === 'string' || typeof props.children === 'number') {
          return String(props.children);
        } else if (Array.isArray(props.children)) {
          // Only extract strings or numbers from the array
          return props.children
            .filter(child => typeof child === 'string' || typeof child === 'number')
            .join('');
        }
      }
    }
    
    // Fallback
    return '';
  };
  
  // Helper function to convert a string value to a comparable value (number or string)
  const getComparableValue = (value) => {
    // Check if empty
    if (!value) return value;
    
    // Remove commas from the string and try to parse as a number
    const cleanedValue = value.replace(/,/g, '');
    const numberValue = parseFloat(cleanedValue);
    
    if (!isNaN(numberValue)) {
      return numberValue;
    }
    
    // Check if it's a date (common formats like "Mar 15, 2022" or "2022-03-15")
    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime())) {
      return dateValue.getTime(); // Convert to timestamp for comparison
    }
    
    // Otherwise return the original string
    return value;
  };
  
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  
  // Calculate the current page's data
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  let currentData = sortedData.slice(startIndex, endIndex);
  
  // Add empty rows to the last page if needed to maintain consistent height
  if (currentPage === totalPages && sortedData.length % itemsPerPage !== 0 && sortedData.length > 0) {
    const emptyRowsNeeded = itemsPerPage - (sortedData.length % itemsPerPage);
    
    // Create a template based on the first row if available
    const templateRow = sortedData.length > 0 ? sortedData[0] : columns.map(() => "");
    
    // Create empty rows that mimic the structure of real data rows
    for (let i = 0; i < emptyRowsNeeded; i++) {
      // Create empty cells that preserve the structure
      const emptyRow = templateRow.map(() => (
        <span className={styles.spacerCell}>&nbsp;</span>
      ));
      currentData.push(emptyRow);
    }
  }
  
  // Handle page navigation
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
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    
    // Always show first page
    pageNumbers.push(1);
    
    // Show ellipsis if needed
    if (currentPage > 3) {
      pageNumbers.push('...');
    }
    
    // Add pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pageNumbers.push(i);
    }
    
    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      pageNumbers.push('...');
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
  // Handle column header click for sorting
  const handleHeaderClick = (columnIndex) => {
    if (columnIndex === sortColumnIndex) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to 'asc'
      setSortColumnIndex(columnIndex);
      setSortDirection('asc');
    }
  };
  
  // Create sortable column headers
  const renderSortableColumns = () => {
    return columns.map((column, index) => (
      <div 
        key={index} 
        className={sortStyles.sortableHeader}
        onClick={() => handleHeaderClick(index)}
      >
        {column}
        {sortColumnIndex === index && (
          <span className={sortStyles.sortIcon}>
            {sortDirection === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    ));
  };
  
  const sortableColumns = renderSortableColumns();
  
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
              >
                {page}
              </button>
            )
          ))}
          
          <button 
            className={styles.pageButton} 
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};

export default SortablePagedTableBox; 