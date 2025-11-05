import React from "react";
import FilterComponent from "../../Common/FilterComponent";
import { Printer } from 'lucide-react';
import PrimaryBtn from "../../Common/PrimaryBtn";

function VaultFilter({ filters, setFilters, onFilterChange, onPrintClick, printing = false }) {
  const handlePrintClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (onPrintClick) {
      onPrintClick(filters);
    }
  };

  return (
    <FilterComponent 
      Search={() => onFilterChange(filters)} 
      ResetState={() => {
        setFilters({});
        onFilterChange({});
      }}
      extraActions={
        <PrimaryBtn
          onClick={handlePrintClick}
          disabled={printing}
          title="Print Vault Report"
          type="button"
        >
          <Printer size={20} />
          {printing ? "Generating..." : "Print Report"}
        </PrimaryBtn>
      }
    >
      <div className="flex flex-wrap items-center w-full gap-4">
        {/* Start Date */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Start Date</label>
          <input
            type="date"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            value={filters.start_date || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">End Date</label>
          <input
            type="date"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            value={filters.end_date || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
          />
        </div>

        {/* Entry Type Filter */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Transaction Type</label>
          <select
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 cursor-pointer"
            value={filters.entry_type || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, entry_type: e.target.value }))}
          >
            <option value="">All Transaction Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
        </div>

        {/* Description contains */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Description</label>
          <input
            type="text"
            placeholder="Search description..."
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            value={filters.description || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        {/* Amount filters */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Amount</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Min"
              className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 w-28"
              value={filters.amount_min || ""}
              onChange={(e) => setFilters(prev => ({ ...prev, amount_min: e.target.value }))}
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="number"
              step="0.01"
              placeholder="Max"
              className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 w-28"
              value={filters.amount_max || ""}
              onChange={(e) => setFilters(prev => ({ ...prev, amount_max: e.target.value }))}
            />
          </div>
        </div>
      </div>
    </FilterComponent>
  );
}

export default VaultFilter; 