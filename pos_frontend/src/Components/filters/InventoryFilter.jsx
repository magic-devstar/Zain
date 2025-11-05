import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FilterComponent from "../Common/FilterComponent";
import { Printer } from 'lucide-react';
import PrimaryBtn from "../Common/PrimaryBtn";

const InventoryFilter = ({ onFilterChange, title = "Inventory", showPrintOption = false, onPrintClick, printing = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialState = {
        search: "",
        low_stock_min: "",
        low_stock_max: "",
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

    const handlePrintButtonClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (onPrintClick) {
            onPrintClick(filters);
        }
    };

    return (
        <FilterComponent Search={handleSearchClick} ResetState={handleResetClick}>
            <div className="flex flex-wrap items-end w-full gap-4">
                {/* Search Field */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <label className="text-sm font-semibold text-gray-700">Search by {title} Name</label>
                    <input
                        type="text"
                        placeholder={`Search by ${title} Name`}
                        className="w-full sm:w-60 px-4 py-2 rounded-lg text-sm border-gray-300 border focus:outline-none focus:ring-2 focus:ring-blue-600"
                        onChange={handleInputChange}
                        value={filters.search}
                        name="search"
                    />
                </div>

                {/* Low Stock Min Range */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <label className="text-sm font-semibold text-gray-700">Low Stock Min</label>
                    <input
                        type="number"
                        placeholder="Min quantity"
                        className="w-full sm:w-40 px-4 py-2 rounded-lg text-sm border-gray-300 border focus:outline-none focus:ring-2 focus:ring-blue-600"
                        onChange={handleInputChange}
                        value={filters.low_stock_min}
                        name="low_stock_min"
                        min="0"
                    />
                </div>

                {/* Low Stock Max Range */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <label className="text-sm font-semibold text-gray-700">Low Stock Max</label>
                    <input
                        type="number"
                        placeholder="Max quantity"
                        className="w-full sm:w-40 px-4 py-2 rounded-lg text-sm border-gray-300 border focus:outline-none focus:ring-2 focus:ring-blue-600"
                        onChange={handleInputChange}
                        value={filters.low_stock_max}
                        name="low_stock_max"
                        min="0"
                    />
                </div>

                {showPrintOption && (
                    <PrimaryBtn
                        className="mt-2"
                        onClick={handlePrintButtonClick}
                        title="Print Inventory"
                        type="button"
                        disabled={printing}
                    >
                        <Printer size={24} />
                        {printing ? "Generating..." : "Print"}
                    </PrimaryBtn>
                )}
            </div>
        </FilterComponent >
    );
};

export default InventoryFilter; 