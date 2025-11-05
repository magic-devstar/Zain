import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FilterComponent from "../Common/FilterComponent";
import PrimaryBtn from "../Common/PrimaryBtn";

const REPAIR_STATUSES = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REPAIRED", label: "Repaired" },
];

function RepairsFilter({ onFilterChange, onPrint, printing = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const initialState = {
    search: "",
    status: "",
    start_date: "",
    end_date: "",
  };

  const [filters, setFilters] = useState(initialState);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    const queryParams = new URLSearchParams(location.search);
    queryParams.set("page", 1);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.set(key, value); else queryParams.delete(key);
    });
    navigate(`?${queryParams.toString()}`);
    onFilterChange(filters);
  };

  const handleReset = () => {
    setFilters(initialState);
    onFilterChange(initialState);
  };

  const handlePrint = () => {
    if (onPrint) onPrint(filters);
  };

  return (
    <FilterComponent
      Search={handleSearch}
      ResetState={handleReset}
      extraActions={
        <PrimaryBtn onClick={handlePrint} disabled={printing}>
          {printing ? "Generating..." : "Print Report"}
        </PrimaryBtn>
      }
    >
      <div className="flex flex-wrap gap-4 justify-start w-full">
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Search</label>
          <input
            type="text"
            placeholder="Search by ID, Vendor..."
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 w-60"
            name="search"
            value={filters.search}
            onChange={handleInputChange}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleInputChange}
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 cursor-pointer"
          >
            {REPAIR_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Start Date</label>
          <input
            type="date"
            name="start_date"
            value={filters.start_date}
            onChange={handleInputChange}
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">End Date</label>
          <input
            type="date"
            name="end_date"
            value={filters.end_date}
            onChange={handleInputChange}
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
          />
        </div>
      </div>
    </FilterComponent>
  );
}

export default RepairsFilter; 