import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FilterComponent from "../Common/FilterComponent";

const TicketsFilter = ({ onFilterChange, hideTechnicianStatuses = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialState = {
        search: "",
        status: "",
    };

    const [filters, setFilters] = useState(initialState);

    // Define all possible status options
    const allStatusOptions = [
        { value: "OPEN", label: "OPEN" },
        { value: "IN PROGRESS", label: "IN PROGRESS" },
        { value: "PARTIALLY CLOSED", label: "PARTIALLY CLOSED" },
        { value: "PENDING APPROVAL", label: "PENDING APPROVAL" },
        { value: "CLOSED", label: "CLOSED" }
    ];

    // Filter status options based on hideTechnicianStatuses prop
    const getStatusOptions = () => {
        if (hideTechnicianStatuses) {
            return allStatusOptions.filter(option =>
                ["IN PROGRESS", "PARTIALLY CLOSED", "PENDING APPROVAL"].includes(option.value)
            )
        }
        return allStatusOptions;
    };


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
                    <label className="font-semibold opacity-90">Search by Ticket Name or ID</label>
                    <input
                        type="text"
                        placeholder="Search by Ticket Name or ID"
                        className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
                        onChange={handleInputChange}
                        value={filters.search}
                        name="search"
                    />
                </div>

                {/* Status Filter */}
                <div div className="flex flex-col gap-2 sm:max-w-[300px]">
                    <label className="font-semibold opacity-90">Status</label>
                    <select
                        name="status"
                        className="outline-primary px-4 w-full py-1 rounded-[4px] border-2 border-gray-200 cursor-pointer"
                        onChange={handleInputChange}
                        value={filters.status}
                    >
                        <option value="">All</option>
                        {getStatusOptions().map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </FilterComponent >
    );
};

export default TicketsFilter;
