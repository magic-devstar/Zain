import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "react-loading-skeleton/dist/skeleton.css";
import PrimaryBtn from "./PrimaryBtn";
import TableSkeleton from "../LoadeingSkeletons/TableSkeleton";
import Pagination from "./Pagination";
import EditButton from "./EditButton";
import DeleteButton from "./DeleteButton";
import { AiOutlineCheck, AiOutlineClose, AiOutlineArrowUp, AiOutlineArrowDown } from "react-icons/ai";
import SearchInput from "./SearchInput";
import DynamicFilter from "../filters/DynamicFilter";
import useReportsToggle from "../../utils/useReportsToggle";
import { useNavigate, useLocation } from "react-router-dom";

const TableComponent = ({
  dataloading,
  columns,
  data,
  cells,
  heading,
  description,
  onCreateClick,
  actionIcons,
  apiEndpoint,
  itemsPerPage,
  renderData,
  onLoadingChange,
  extraParams,
  refresh,
  pageParamKey = "page",
  createBtn,
  EditClick,
  DeleteClick,
  hideDeleteBtn,
  hideEditBtn,
  createBtnText = "+ Create",
  sortable = true,
  onSortChange = null, // Callback for parent component to handle sorting
  pageId = "default", // Unique identifier for each page to save separate sorting configs
  showSearchBar = true, // New prop to control search bar visibility
  searchPlaceholder = "Search...", // Customizable search placeholder
  onSearchChange = null, // Callback for parent to handle search changes
  dynamicFilters = [], // Array of dynamic filter configurations
  onDynamicFilterChange = null // Callback for dynamic filter changes
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [refreshToggle, setRefreshToggle] = useState(0); // numeric counter to guarantee change detection
  const [isSearching, setIsSearching] = useState(false);
  // Initialize dynamic filter values synchronously to prevent double API calls
  const getInitialDynamicFilterValues = useMemo(() => {
    if (dynamicFilters && dynamicFilters.length > 0) {
      const initialValues = {};
      dynamicFilters.forEach(filter => {
        if (filter.defaultValue !== undefined && filter.defaultValue !== '') {
          initialValues[filter.fieldName] = filter.defaultValue;
        }
      });
      return initialValues;
    }
    return {};
  }, [dynamicFilters]);

  const [dynamicFilterValues, setDynamicFilterValues] = useState(() => getInitialDynamicFilterValues);
  const { reportsEnabled } = useReportsToggle();

  // Stable search change handler to prevent infinite re-renders
  const handleSearchChange = useCallback((query) => {
    setDebouncedSearchQuery(query);
    setIsSearching(true);
    setRefreshToggle(prev => prev + 1);
  }, []);


  // Dynamic filter change handler
  const handleDynamicFilterChange = useCallback((fieldName, value) => {
    setDynamicFilterValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setRefreshToggle(prev => prev + 1);
    
    // Call parent callback if provided
    if (onDynamicFilterChange) {
      onDynamicFilterChange(fieldName, value);
    }
  }, [onDynamicFilterChange]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (debouncedSearchQuery !== undefined && debouncedSearchQuery !== "") {
      // Only reset to page 1 if we're not already on page 1
      const queryParams = new URLSearchParams(location.search);
      const currentPage = parseInt(queryParams.get('page')) || 1;
      if (currentPage !== 1) {
        queryParams.set('page', 1);
        navigate(`?${queryParams.toString()}`);
      }
    }
  }, [debouncedSearchQuery, location.search, navigate]);

  // React to parent-provided refresh prop (boolean, number, or any changing token)
  useEffect(() => {
    // Only bump when parent signals a refresh (undefined means unused)
    if (typeof refresh !== 'undefined') {
      setRefreshToggle(prev => prev + 1);
    }
  }, [refresh]);

  // Load sorting config from localStorage on component mount - now page-specific
  const [sortConfig, setSortConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(`tableSortConfig_${pageId}`);
      return saved ? JSON.parse(saved) : { key: null, direction: 'asc' };
    } catch (error) {
      console.warn(`Failed to load sorting config for page ${pageId} from localStorage:`, error);
      return { key: null, direction: 'asc' };
    }
  });

  // Reset searching state when data loading is complete
  useEffect(() => {
    if (!dataloading && isSearching) {
      setIsSearching(false);
    }
  }, [dataloading, isSearching]);

  // Reload sorting config when pageId changes (user navigates to different page)
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(`tableSortConfig_${pageId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSortConfig(parsed);
      } else {
        setSortConfig({ key: null, direction: 'asc' });
      }
    } catch (error) {
      console.warn(`Failed to load sorting config for page ${pageId} from localStorage:`, error);
      setSortConfig({ key: null, direction: 'asc' });
    }
  }, [pageId]);

  const handleDeleteClick = (id) => {
    setConfirmDeleteId(id);
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const handleConfirmDelete = (id) => {
    DeleteClick(id);
    setConfirmDeleteId(null);
  };

  // Function to check if both buttons should be hidden
  const areBothButtonsHidden = (row) => {
    const isEditHidden = typeof hideEditBtn === 'function' ? hideEditBtn(row) : hideEditBtn;
    const isDeleteHidden = typeof hideDeleteBtn === 'function' ? hideDeleteBtn(row) : hideDeleteBtn;
    return isEditHidden && isDeleteHidden;
  };

  // Enhanced sorting function that calls parent callback for API-based sorting
  const handleSort = (key) => {
    if (!sortable) return;

    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    const newSortConfig = { key, direction };
    setSortConfig(newSortConfig);

    // Save sorting config to localStorage - now page-specific
    try {
      localStorage.setItem(`tableSortConfig_${pageId}`, JSON.stringify(newSortConfig));
    } catch (error) {
      console.warn(`Failed to save sorting config for page ${pageId} to localStorage:`, error);
    }

    // Call parent callback for API-based sorting
    if (onSortChange) {
      onSortChange(newSortConfig);
    }
  };

  // Sort data based on current sort configuration (fallback for client-side sorting)
  const getSortedData = () => {
    // Ensure data is always an array
    const safeData = Array.isArray(data) ? data : [];
    
    if (!sortConfig.key || !sortable || onSortChange) return safeData; // Don't sort client-side if using API sorting

    return [...safeData].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Convert to string for comparison if not numbers
      if (typeof aValue !== 'number' && typeof bValue !== 'number') {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Get sort icon for column header - now shows on all sortable columns
  const getSortIcon = (columnKey) => {
    if (!sortable || !Array.isArray(columns) || columns.find(col => col.key === columnKey)?.sortable === false) {
      return null;
    }

    if (sortConfig.key !== columnKey) {
      return <AiOutlineArrowUp className="ml-1 text-gray-400 hover:text-gray-600 transition-colors duration-200" />;
    }

    return sortConfig.direction === 'asc'
      ? <AiOutlineArrowUp className="ml-1 text-blue-600 font-bold" />
      : <AiOutlineArrowDown className="ml-1 text-blue-600 font-bold" />;
  };

  const sortedData = getSortedData();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        {heading && <h1 className="text-xl font-semibold text-gray-800">{heading}</h1>}
        <div className="flex items-center gap-4">
          {/* Search Bar - positioned on the left side of create button */}
          {createBtn && (
            <PrimaryBtn
              onClick={onCreateClick}
              disabled={dataloading}
            >
              {createBtnText}
            </PrimaryBtn>
          )}
        </div>
      </div>
      {/* Search Bar and Dynamic Filters Row */}
      {(!reportsEnabled && (showSearchBar || dynamicFilters.length > 0)) && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {showSearchBar && (
            <div className="flex-1 min-w-[300px]">
              <SearchInput
                placeholder={searchPlaceholder}
                onSearchChange={handleSearchChange}
                debounceMs={500}
              />
            </div>
          )}
          {dynamicFilters.length > 0 && (
            <div className="flex items-center gap-4 flex-wrap">
              {dynamicFilters.map((filterConfig, index) => (
                <DynamicFilter
                  key={`${filterConfig.fieldName}-${index}`}
                  {...filterConfig}
                  onFilterChange={handleDynamicFilterChange}
                  className="min-w-[200px]"
                />
              ))}
            </div>
          )}
        </div>
      )}
      {description && <hr className="m-0 my-3 p-0 text-gray-500" />}
      {/* <FilterBlock /> */}

      <div className="overflow-auto rounded-md mt-4">
        {dataloading ? (
          <TableSkeleton columns={columns} rows={15} />
        ) : (
          <div className={`${!reportsEnabled ? "max-h-[60dvh] md:max-h-[70svh] overflow-auto" : "max-h-[50svh] md:max-h-[60svh] overflow-auto"}`}>
            <table className="min-w-full table-fixed">
              <thead className="bg-gray-200 sticky top-0 z-10">
                <tr>
                  {Array.isArray(columns) && columns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-6 text-left w-[200px] ${sortable && col.sortable !== false
                          ? 'cursor-pointer hover:bg-gray-300 select-none transition-colors duration-200'
                          : ''
                        } ${sortConfig.key === col.key
                          ? 'bg-blue-100 border-b-2 border-blue-500'
                          : ''
                        }`}
                      onClick={() => sortable && col.sortable !== false && handleSort(col.key)}
                    >
                      <div className="flex items-center">
                        {col.name}
                        {getSortIcon(col.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={Array.isArray(columns) ? columns.length + (actionIcons ? 1 : 0) : 1}
                      className="py-8 px-6 text-center text-gray-500"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  <>
                    {sortedData.map((company, rowIndex) => (
                      <tr
                        key={company.id}
                        className={`border-b border-black-400 transition duration-150 ease-in-out
                        ${rowIndex % 2 === 0 ? "bg-gray-50" : "bg-white"}
                        hover:bg-[#438e8f34]
                      `}
                      >
                        {Array.isArray(cells) && cells.map((Cell, index) => (
                          <td key={index} className="py-3 px-6 text-left w-[200px]">
                            <Cell row={company} />
                          </td>
                        ))}
                        {actionIcons && (
                          <td className="py-3 px-6 text-left w-[200px]">
                            {areBothButtonsHidden(company) ? (
                              <span className="text-gray-500 text-sm">Not Available</span>
                            ) : (
                              <div className="flex space-x-2">
                                {hideEditBtn && typeof hideEditBtn === 'function' ? (
                                  !hideEditBtn(company) && <EditButton onClick={() => EditClick(company)} />
                                ) : !hideEditBtn ? (
                                  <EditButton onClick={() => EditClick(company)} />
                                ) : null}

                                {confirmDeleteId === company.id ? (
                                  <div className="flex gap-1 items-center cursor-pointer">
                                    <AiOutlineClose
                                      className="action-icon cancel-icon"
                                      style={{
                                        color: "red",
                                        fontSize: "1.5rem",
                                      }}
                                      onClick={handleCancelDelete}
                                    />
                                    <AiOutlineCheck
                                      className="action-icon confirm-icon"
                                      style={{
                                        color: "green",
                                        fontSize: "1.5rem",
                                      }}
                                      onClick={() =>
                                        handleConfirmDelete(company.id)
                                      }
                                    />
                                  </div>
                                ) : (
                                  <>
                                    {hideDeleteBtn && typeof hideDeleteBtn === 'function' ? (
                                      !hideDeleteBtn(company) && <DeleteButton onClick={() => handleDeleteClick(company.id)} />
                                    ) : !hideDeleteBtn ? (
                                      <DeleteButton onClick={() => handleDeleteClick(company.id)} />
                                    ) : null}
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}

                    {sortedData.length < 9 &&
                      Array.from({ length: 9 - sortedData.length }).map((_, index) => (
                        <tr
                          key={`empty-${index}`}
                          className={`border-b border-black-400 transition duration-150 ease-in-out
                          ${(sortedData.length + index) % 2 === 0 ? "bg-gray-50" : "bg-white"}
                          hover:bg-[#438e8f34]
                        `}
                        >
                          {Array.isArray(columns) && columns.map((col) => (
                            <td
                              className="py-3 px-6 text-left w-[200px] h-13"
                              key={col.key}
                            ></td>
                          ))}
                        </tr>
                      ))}
                  </>
                )}

              </tbody>
            </table>
          </div>

        )}
        <Pagination
          apiEndpoint={apiEndpoint}
          itemsPerPage={itemsPerPage}
          renderData={renderData}
          onLoadingChange={onLoadingChange}
          extraParams={useMemo(() => ({
            ...extraParams,
            ...(debouncedSearchQuery && debouncedSearchQuery.trim() !== "" && { search: debouncedSearchQuery.trim() }),
            ...Object.fromEntries(
              Object.entries(dynamicFilterValues).filter(([key, value]) => value !== '' && value !== null && value !== undefined)
            ),
            ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
          }), [extraParams, debouncedSearchQuery, dynamicFilterValues, sortConfig])}
          refreshToggle={refreshToggle}
          pageParamKey={pageParamKey}
        />


      </div>
    </>
  );
};

export default TableComponent;