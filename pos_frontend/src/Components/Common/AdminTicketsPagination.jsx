import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import {
  LiaAngleDoubleLeftSolid,
  LiaAngleDoubleRightSolid,
} from 'react-icons/lia';
import SkeletonLine from '../LoadeingSkeletons/SkeletonLine';

const AdminTicketsPagination = ({
  apiEndpoint,           // API endpoint for fetching data
  itemsPerPage = 10,     // Number of items per page
  renderData = () => { }, // Function to render the fetched data
  onLoadingChange = () => { },
  extraParams = {},
  onCountChange = () => { },
  refresh,
  id = 'default',         // Unique ID for each pagination instance
  transparent = false     // When true, removes the default background color
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [previousUrl, setPreviousUrl] = useState(null);

  // Fetch data when currentPage changes or when refresh is triggered
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (onLoadingChange) onLoadingChange(true);

        const response = await api.get(apiEndpoint, {
          params: {
            page: currentPage,
            ...extraParams,
          },
        });

        setData(response.data.results);
        setNextUrl(response.data.next);
        setPreviousUrl(response.data.previous);
        setTotalPages(Math.ceil(response.data.count / itemsPerPage));
        onCountChange(response.data.count);
      } catch (error) {
        console.error(`Error fetching data for ${id}:`, error);
      } finally {
        if (onLoadingChange) onLoadingChange(false);
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, apiEndpoint, itemsPerPage, refresh, id, JSON.stringify(extraParams)]);

  // Handle "Next" button click
  const handleNextClick = () => {
    if (nextUrl) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Handle "Previous" button click
  const handlePreviousClick = () => {
    if (previousUrl) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Handle page number click
  const handlePageClick = (page) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= 7) {
      return [...Array(totalPages).keys()].map(n => n + 1);
    }

    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }

    return pages;
  };

  return (
    <div>
      {/* Render the data */}
      <div>{renderData(data)}</div>

      {/* Pagination Controls - Only show if there's more than one page */}
      <div className={`flex gap-2 items-center justify-center ${transparent ? 'bg-transparent' : 'bg-gray-200'} py-2 rounded`}>
        {/* Previous button */}
        <button
          className="px-1 sm:px-4 py-2"
          disabled={currentPage === 1}
          onClick={handlePreviousClick}
        >
          <LiaAngleDoubleLeftSolid
            className={`text-xl ${currentPage === 1 ? 'text-[#C4C4C4]' : 'text-[#C4C4C4] hover:text-black duration-300 cursor-pointer'}`}
          />
        </button>

        {loading ? (
          <span className="px-2 text-gray-500"><SkeletonLine height={20} width={150} /></span>
        ) : totalPages === 0 ? (
          <span className="px-2 text-gray-500">No Data Found!</span>
        ) : (
          getPageNumbers().map((page, idx) =>
            typeof page === 'number' ? (
              <button
                key={`${id}-${idx}`}
                onClick={() => handlePageClick(page)}
                className={`h-6 w-6 rounded-lg cursor-pointer ${currentPage === page
                  ? 'bg-primary text-white'
                  : 'bg-[#F1F1F1] text-black'
                  }`}
              >
                {page}
              </button>
            ) : (
              <span key={`${id}-${idx}`} className="px-2 text-gray-500">...</span>
            )
          )
        )}

        {/* Next button */}
        <button
          className="px-1 sm:px-4 py-2"
          disabled={currentPage === totalPages}
          onClick={handleNextClick}
        >
          <LiaAngleDoubleRightSolid
            className={`text-xl ${currentPage === totalPages ? 'text-[#C4C4C4]' : 'text-[#C4C4C4] hover:text-black duration-300 cursor-pointer'}`}
          />
        </button>
      </div>
    </div>
  );
};

export default AdminTicketsPagination;