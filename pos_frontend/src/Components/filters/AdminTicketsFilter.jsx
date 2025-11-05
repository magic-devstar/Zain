import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Printer } from 'lucide-react';
import PrimaryBtn from "../Common/PrimaryBtn";

const AdminTicketsFilter = ({ onFilterChange, showPrintOption = false, onPrintClick }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const debounceTimeoutRef = useRef(null);
    
    const initialState = {
        search: ""
    };

    const [filters, setFilters] = useState(initialState);

    // Initialize filters from URL on mount
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const searchParam = queryParams.get("search") || "";
        
        if (searchParam !== filters.search) {
            setFilters({ search: searchParam });
            onFilterChange({ search: searchParam });
        }
    }, []); // Only run on mount

    // Debounced search function
    const debouncedSearch = (searchValue) => {
        // Clear existing timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Set new timeout
        debounceTimeoutRef.current = setTimeout(() => {
            // Update query params in URL
            const queryParams = new URLSearchParams(location.search);
            queryParams.set("page", 1); // Always reset page to 1

            // Add search filter to query params
            if (searchValue) {
                queryParams.set("search", searchValue);
            } else {
                queryParams.delete("search");
            }

            navigate(`?${queryParams.toString()}`);

            // Notify parent
            onFilterChange({ search: searchValue });
        }, 500);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: value,
        }));
        
        // Trigger debounced search
        debouncedSearch(value);
    };

    const handleResetClick = () => {
        setFilters(initialState);
        onFilterChange(initialState);
        
        // Clear URL params
        const queryParams = new URLSearchParams(location.search);
        queryParams.delete("search");
        queryParams.set("page", 1);
        navigate(`?${queryParams.toString()}`);
    };

    const handlePrintButtonClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onPrintClick();
    };

    return (
        <div className="flex flex-wrap items-center w-full justify-between gap-2 min-w-0 p-2 w-full">
            <input
                type="text"
                placeholder="Search here"
                className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 w-full"
                onChange={handleInputChange}
                value={filters.search}
                name="search"
            />
        </div>
    );
};

export default AdminTicketsFilter;
