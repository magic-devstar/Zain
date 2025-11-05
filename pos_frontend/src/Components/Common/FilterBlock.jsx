import React, { useState } from "react";
import FilterContainer from "./FilterComponent";

const FilterBlock = ({ onFilterChange }) => {
    const initialState = {
        search: "",
        dateSubmitted: "",
        status: "",
        orderType: "",
        onlyMyOrders: "",
        court: "",
        servingCompany: ""
    }
    const [filters, setFilters] = useState(initialState);
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: value,
        }));
    };

    const handleSearchClick = () => {
        onFilterChange(filters);
    };

    const ResetState = () => {
        setFilters(initialState);
        onFilterChange(initialState);
    }
    return (
        <>
            <FilterContainer Search={handleSearchClick} ResetState={ResetState}>
                {/* Responsive grid for 6 columns on 2xl screens */}
                <div
                    className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 justify-center gap-2">

                    {/* Order / Case Information */}
                    <div className="flex flex-col gap-2 sm:w-full sm:col-span-2">
                        <label className="font-semibold opacity-90">Order / Case Information</label>
                        <input type="text" placeholder="Name, JOb number , or address"
                            className="outline-primary px-4 py-1  col-span-6  rounded-[4px] border-2 border-gray-200"
                            onChange={handleInputChange}
                            value={filters.search}
                            name="search"
                        />
                    </div>
                    {/* Priority Level */}
                    <div className="flex flex-col gap-2 sm:max-w-[300px]">
                        <label className="font-semibold opacity-90">Status</label>
                        <select name="status"
                            className="outline-primary px-4 w-full py-1 rounded-[4px] border-2 border-gray-200 cursor-pointer"
                            onChange={handleInputChange}
                            value={filters.status}
                        >
                            <option value="" selected disabled>
                                Any Type
                            </option>
                            {["Pending", "Awaiting_payment", "Attempted", "Assigned", "Action Needed", "Served", "Rejected", "In Progress"].map((ele, index) => (
                                <option key={index} value={ele}>
                                    {ele}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range */}
                    <div className="flex flex-col gap-2 sm:max-w-[300px]">
                        <label className="font-semibold opacity-90">Date Submitted</label>
                        <input placeholder="05/07/24 - 06/07/24" type="date"
                            className="outline-primary px-4 w-full py-1 rounded-[4px] border-2 border-gray-200 cursor-pointer"
                            onChange={handleInputChange}
                            value={filters.dateSubmitted}
                            name="dateSubmitted"
                        />
                    </div>

                    {/* Process Server */}
                    <div className="flex flex-col gap-2 sm:max-w-[300px]">
                        <label className="font-semibold opacity-90">Order type</label>
                        <select name="orderType"
                            className="outline-primary px-4 w-full py-1 rounded-[4px] border-2 border-gray-200 cursor-pointer"
                            onChange={handleInputChange}
                            value={filters.orderType}
                        >
                            <option value="" selected disabled>
                                Server Name
                            </option>
                            {["None"].map((ele, index) => (
                                <option key={index} value={ele}>
                                    {ele}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </FilterContainer>
        </>
    );
}

export default FilterBlock;