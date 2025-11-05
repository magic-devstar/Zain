import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LuSearch } from 'react-icons/lu';

const SearchInput = ({ 
  placeholder = "Search...", 
  onSearchChange, 
  debounceMs = 500,
  className = "",
  disabled = false 
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const isInitialMount = useRef(true);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Notify parent when debounced search changes
  useEffect(() => {
    // Skip the initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Only call onSearchChange if there's an actual change and callback is stable
    if (onSearchChange && debouncedSearchQuery !== undefined) {
      onSearchChange(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery]); // Remove onSearchChange from dependencies

  // Handle input change
  const handleInputChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
  }, []);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInputChange}
        className={`w-64 p-2 pl-10 pr-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 ${
          isSearching ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
        disabled={disabled || isSearching}
      />
      <LuSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
        isSearching ? 'text-blue-400' : 'text-gray-400'
      }`} size={20} />
      {searchQuery && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          type="button"
          disabled={disabled || isSearching}
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchInput;
