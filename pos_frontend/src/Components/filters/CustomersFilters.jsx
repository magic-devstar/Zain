import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FilterComponent from "../Common/FilterComponent";

const CustomersFilters = ({ onFilterChange }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialState = {
        search: "",
        status: ""
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

    return (
        <FilterComponent Search={handleSearchClick} ResetState={handleResetClick}>
            <div className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 justify-center gap-2">
                {/* Search Field */}
                <div className="flex flex-col gap-2 sm:w-full sm:col-span-2">
                    <label className="font-semibold opacity-90">Search Name or Email or Phone</label>
                    <input
                        type="text"
                        placeholder="Search by Name, Email, or Phone"
                        className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
                        onChange={handleInputChange}
                        value={filters.search}
                        name="search"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-2 sm:max-w-[300px]">
                    <label className="font-semibold opacity-90">Status</label>
                    <select
                        name="status"
                        className="outline-primary px-4 w-full py-1 rounded-[4px] border-2 border-gray-200 cursor-pointer"
                        onChange={handleInputChange}
                        value={filters.status}
                    >
                        <option value="">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
        </FilterComponent >
    );
};

export default CustomersFilters;
