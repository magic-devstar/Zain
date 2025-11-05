import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FilterComponent from "../Common/FilterComponent";
import PrimaryBtn from "../Common/PrimaryBtn"; // Assuming this might be needed later
import { Printer } from "lucide-react";

const VehicleFilter = ({ onFilterChange, onPrintClick, showPrintOption = false, printing = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialState = {
        search: "",
        status: "" // Added status to initial state
    };

    const [filters, setFilters] = useState(initialState);

    const vehicleStatusOptions = [
        { value: "", label: "All Statuses" },
        { value: "available", label: "Available" },
        { value: "in_use", label: "In Use" },
        { value: "in_maintenance", label: "In Maintenance" },
        { value: "retired", label: "Retired" },
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: value,
        }));
    };

    const handleSearchClick = () => {
        const queryParams = new URLSearchParams(location.search);
        queryParams.set("page", 1); 

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                queryParams.set(key, value);
            } else {
                queryParams.delete(key);
            }
        });

        navigate(`?${queryParams.toString()}`);
        onFilterChange(filters);
    };

    const handleResetClick = () => {
        setFilters(initialState);
        onFilterChange(initialState);
        navigate(location.pathname); // Reset URL query params
    };

    const handlePrintButtonClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (onPrintClick) {
            onPrintClick(filters);
        }
    };

    return (
        <FilterComponent 
            Search={handleSearchClick} 
            ResetState={handleResetClick}
            extraActions={
                showPrintOption && (
                    <PrimaryBtn
                        className="mt-2"
                        onClick={handlePrintButtonClick}
                        title="Print Vehicles"
                        type="button"
                        disabled={printing}
                    >
                        <Printer size={24} />
                        {printing ? "Generating..." : "Print"}
                    </PrimaryBtn>
                )
            }
        >
            <div className="flex flex-wrap items-center w-full gap-4">
                {/* Search Field */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="search" className="font-semibold opacity-90">Search</label>
                    <input
                        type="text"
                        id="search"
                        placeholder="Search by name, VIN, make, model..."
                        className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 w-80"
                        onChange={handleInputChange}
                        value={filters.search}
                        name="search"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="status" className="font-semibold opacity-90">Status</label>
                    <select
                        id="status"
                        name="status"
                        value={filters.status}
                        onChange={handleInputChange}
                        className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 w-full sm:w-auto min-w-[180px] h-[34px]"
                    >
                        {vehicleStatusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </FilterComponent>
    );
};

export default VehicleFilter; 