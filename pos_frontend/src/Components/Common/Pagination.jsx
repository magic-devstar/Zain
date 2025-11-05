import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  LiaAngleDoubleLeftSolid,
  LiaAngleDoubleRightSolid,
} from 'react-icons/lia';
import SkeletonLine from '../LoadeingSkeletons/SkeletonLine';

const Pagination = ({
  apiEndpoint,           // API endpoint for fetching data
  itemsPerPage = 10,     // Number of items per page
  renderData = () => { }, // Function to render the fetched data
  onLoadingChange = () => { },
  extraParams = {},
  refreshToggle,
  pageParamKey = "page"   // URL query parameter key to sync pagination state. Allows multiple independent paginators on the same view.
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextUrl, setNextUrl] = useState(null);
  const [previousUrl, setPreviousUrl] = useState(null);

  // Sync current page with URL param
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const pageFromUrl = parseInt(queryParams.get(pageParamKey)) || 1;
    setCurrentPage(pageFromUrl);
  }, [location.search, pageParamKey]);

  // Fetch data when currentPage changes
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const pageFromUrl = parseInt(queryParams.get(pageParamKey)) || 1;

    const fetchData = async () => {
      try {
        setLoading(true);
        if (onLoadingChange) onLoadingChange(true);
        console.log('🔄 Pagination fetching data with params:', {
          page: pageFromUrl,
          ...extraParams,
        });
        const response = await api.get(apiEndpoint, {
          params: {
            page: pageFromUrl,   // backend expects 'page'
            ...extraParams,
          },
        });
        console.log('✅ Pagination data fetched:', response.data);
        setData(response.data.results);
        setNextUrl(response.data.next);
        setPreviousUrl(response.data.previous);
        setTotalPages(Math.ceil(response.data.count / itemsPerPage));
      } catch (error) {
        console.error('❌ Error fetching data:', error);
      } finally {
        if (onLoadingChange) onLoadingChange(false);
        setLoading(false);
      }
    };

    fetchData();
  }, [location.search, apiEndpoint, itemsPerPage, refreshToggle, JSON.stringify(extraParams)]);



  // Handle refresh to refresh the data 
  const handleRefresh = () => {
    console.log('🔄 Pagination handleRefresh called');
    if (currentPage) {
      const params = new URLSearchParams(location.search);
      params.set(pageParamKey, currentPage);
      navigate(`?${params.toString()}`);
    }
  };

  // Handle "Next" button click
  const handleNextClick = () => {
    if (nextUrl) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      const params = new URLSearchParams(location.search);
      params.set(pageParamKey, nextPage);
      navigate(`?${params.toString()}`);
    }
  };

  // Handle "Previous" button click
  const handlePreviousClick = () => {
    if (previousUrl) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      const params = new URLSearchParams(location.search);
      params.set(pageParamKey, prevPage);
      navigate(`?${params.toString()}`);
    }
  };


  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5; // pages shown near current
    const sidePages = 2;       // always show first 2 and last 2
    const startPages = [1, 2];
    const endPages = [totalPages - 1, totalPages];

    if (totalPages <= 7) {
      return [...Array(totalPages).keys()].map(n => n + 1);
    }

    const range = (start, end) => {
      const arr = [];
      for (let i = start; i <= end; i++) arr.push(i);
      return arr;
    };

    if (currentPage <= 4) {
      pages.push(...range(1, 5), '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', ...range(totalPages - 4, totalPages));
    } else {
      pages.push(1, '...', ...range(currentPage - 1, currentPage + 1), '...', totalPages);
    }

    return pages;
  };


  return (
    <div>
      {/* Render the data here */}
      <div>{renderData(data)}</div>

      {/* Pagination Controls */}
      <div className="flex gap-2 items-center justify-center bg-gray-200">
        {/* Previous button */}
        <button
          className="px-1 sm:px-4 py-2"
          disabled={currentPage === 1}
          onClick={handlePreviousClick}
        >
          <LiaAngleDoubleLeftSolid className="text-xl text-[#C4C4C4] hover:text-black duration-300 cursor-pointer" />
        </button>

        {loading ? (
          <span className="px-2 text-gray-500"><SkeletonLine height={20} width={150} /></span>
        ) : totalPages === 0 ? (
          <span className="px-2 text-gray-500">No Data Found!</span>
        ) : (

          getPageNumbers().map((page, idx) =>
            typeof page === 'number' ? (
              <button
                key={idx}
                onClick={() => {
                  setCurrentPage(page);
                  const params = new URLSearchParams(location.search);
                  params.set(pageParamKey, page);
                  navigate(`?${params.toString()}`);
                }}
                className={`h-6 w-6 rounded-lg cursor-pointer ${currentPage === page
                  ? 'bg-primary text-white'
                  : 'bg-[#F1F1F1] text-black'
                  }`}
              >
                {page}
              </button>
            ) : (
              <span key={idx} className="px-2 text-gray-500">...</span>
            )
          )
        )}



        {/* Next button */}
        <button
          className="px-1 sm:px-4 py-2 cursor-pointer"
          disabled={currentPage === totalPages}
          onClick={handleNextClick}
        >
          <LiaAngleDoubleRightSolid className="text-xl text-[#C4C4C4] hover:text-black duration-300 cursor-pointer" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;