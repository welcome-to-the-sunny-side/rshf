import React, { useState, useEffect, useMemo } from 'react';
import TableBox from './TableBox';
import BasicTableBox from './BasicTableBox';
import styles from './PagedTableBox.module.css';

const PagedTableBox = ({ title, columns, data, backgroundColor, itemsPerPage = 15, className }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  // Calculate the current page's data
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  let currentData = data.slice(startIndex, endIndex);
  
  // Add empty rows to the last page if needed to maintain consistent height
  if (currentPage === totalPages && data.length % itemsPerPage !== 0 && data.length > 0) {
    const emptyRowsNeeded = itemsPerPage - (data.length % itemsPerPage);
    
    // Create a template based on the first row if available
    const templateRow = data.length > 0 ? data[0] : columns.map(() => "");
    
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

  // Handle jump to page
  const handleJumpToPage = () => {
    const pageNumber = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      setJumpPageInput(''); // Clear input after jumping
    }
  };

  // Handle enter key in jump to page input
  const handleJumpInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
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
  
  return (
    <div className={className}>
      {title ? (
        <TableBox 
          title={title}
          columns={columns}
          data={currentData}
          backgroundColor={backgroundColor}
        />
      ) : (
        <BasicTableBox 
          columns={columns}
          data={currentData}
          backgroundColor={backgroundColor}
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
      
      {totalPages > 1 && (
        <div className={styles.jumpToPageContainer}>
          <input
            type="text"
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            onKeyPress={handleJumpInputKeyPress}
            className={styles.jumpToPageInput}
            placeholder={`1-${totalPages}`}
            aria-label="Jump to page"
          />
          <button
            className={styles.pageButton}
            onClick={handleJumpToPage}
          >
            Jump
          </button>
        </div>
      )}
    </div>
  );
};

export default PagedTableBox; 