import React, { useState } from "react";
import FilterComponent from "../Common/FilterComponent";

const InvoiceChargeTypeFilter = ({ onFilterChange, initialFilters = { name: '', charge_type: '' } }) => {
  const [filters, setFilters] = useState(initialFilters);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchClick = () => {
    onFilterChange(filters);
  };

  const handleResetClick = () => {
    setFilters({ name: '', charge_type: '' });
    onFilterChange({ name: '', charge_type: '' });
  };

  return (
    <FilterComponent Search={handleSearchClick} ResetState={handleResetClick}>
      <div className="flex gap-2 w-full flex-wrap">
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Name</label>
          <input
            type="text"
            placeholder="Search by name..."
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            onChange={handleInputChange}
            value={filters.name}
            name="name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Type</label>
          <select
            value={filters.charge_type}
            onChange={handleInputChange}
            name="charge_type"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="FIXED">Fixed Amount</option>
            <option value="PERCENTAGE">Percentage</option>
          </select>
        </div>
      </div>
    </FilterComponent>
  );
};

export default InvoiceChargeTypeFilter; 