import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FilterComponent from "../Common/FilterComponent";
import { Printer } from 'lucide-react';
import PrimaryBtn from "../Common/PrimaryBtn";

const SimpleFilter = ({ onFilterChange, showPrintOption = false, onPrintClick }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialState = {
        search: ""
    };

    const [filters, setFilters] = useState(initialState);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: value,
        }));
    };

    const handleSearchClick = () => {
        // Update query params in URL
        const queryParams = new URLSearchParams(location.search);
        queryParams.set("page", 1); // Always reset page to 1

        // Add all filters to query params
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                queryParams.set(key, value);
            } else {
                queryParams.delete(key);
            }
        });

        navigate(`?${queryParams.toString()}`);

        // Notify parent
        onFilterChange(filters);
    };

    const handleResetClick = () => {
        setFilters(initialState);
        onFilterChange(initialState);
    };

    const handlePrintButtonClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onPrintClick();
    };


    return (
        <FilterComponent Search={handleSearchClick} ResetState={handleResetClick}>
            <div className="flex flex-wrap items-center w-full justify-between gap-2 min-w-0">
                {/* Search Field */}
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <label className="font-semibold opacity-90">Search</label>
                    <input
                        type="text"
                        placeholder="Search here"
                        className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 w-full max-w-80 min-w-0"
                        onChange={handleInputChange}
                        value={filters.search}
                        name="search"
                    />
                </div>
                {showPrintOption && (
                    <PrimaryBtn
                        title="Print Tickets"
                        onClick={handlePrintButtonClick}
                        type="button"
                    >
                        <Printer size={20} className="" />
                        Print
                    </PrimaryBtn>
                )}
            </div>
        </FilterComponent >
    );
};

export default SimpleFilter;
