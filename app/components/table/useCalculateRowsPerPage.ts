import { useState, useEffect } from 'react';

const useCalculateRowsPerPage = (rowHeight: number = 40, minRows: number = 5,availableHeightOffset: number = 180 ) => {
  const [rowsPerPage, setRowsPerPage] = useState(minRows);

  useEffect(() => {
    const calculateRowsPerPage = () => {
      const totalHeight = window.innerHeight; 
      const availableHeight = totalHeight - availableHeightOffset; 
      const calculatedRows = Math.max(
        Math.floor(availableHeight / rowHeight),
        minRows,
      );
      setRowsPerPage(calculatedRows);
    };

    calculateRowsPerPage();
    window.addEventListener('resize', calculateRowsPerPage);

    return () => window.removeEventListener('resize', calculateRowsPerPage);
  }, [rowHeight, minRows]);

  return rowsPerPage;
};

export default useCalculateRowsPerPage;
