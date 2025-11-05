import React, { useState, useEffect } from "react";
import FilterComponent from "../../Common/FilterComponent";
import { Printer } from 'lucide-react';
import PrimaryBtn from "../../Common/PrimaryBtn";
import api from "../../../utils/api";
import { toast } from "react-hot-toast";

function CashDrawerFilter({ filters, setFilters, onFilterChange, onReset, onPrintClick, printing = false }) {
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      const storesRes = await api.get("/auth/stores/?all=true");

      const allStores = storesRes.data.map(store => ({
        ...store,
        role: store.customer_name
      }));

      setCustomers(allStores);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setCustomersLoading(false);
    }
  };

  const customerOptions = customers.map(store => ({
    value: store.id,
    label: `${store.store_name} (${store.customer_name})`
  }));

  const handlePrintClick = () => {
    // Pass the current filters to the print function
    onPrintClick(filters);
  };

  return (
    <FilterComponent
      Search={() => onFilterChange(filters)}
      ResetState={() => {
        setFilters({});
        onReset && onReset();
      }}
      extraActions={
        <PrimaryBtn
          onClick={handlePrintClick}
          disabled={printing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          {printing ? "Printing..." : "Print"}
        </PrimaryBtn>
      }
    >
      <div className="flex gap-4 w-full flex-wrap">
        {/* Date Filter */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Date</label>
          <input
            type="date"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            value={filters.date || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>

        {/* Customer Filter */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Store</label>
          <select
            value={filters.customer_id || ""}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              customer_id: e.target.value ? parseInt(e.target.value) : null 
            }))}
            disabled={customersLoading}
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 min-w-[200px]"
          >
            <option value="">{customersLoading ? "Loading stores..." : "Select a store..."}</option>
            {customerOptions.map(store => (
              <option key={store.value} value={store.value}>
                {store.label}
              </option>
            ))}
          </select>
        </div>

        {/* User Filter */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">User</label>
          <input
            type="text"
            placeholder="Search by username"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            value={filters.user || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, user: e.target.value }))}
          />
        </div>

        {/* Amount Range Filter */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Amount Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min amount"
              className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 w-24"
              value={filters.min_amount || ""}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                min_amount: e.target.value ? parseFloat(e.target.value) : null 
              }))}
            />
            <span className="text-gray-500 self-center">to</span>
            <input
              type="number"
              placeholder="Max amount"
              className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 w-24"
              value={filters.max_amount || ""}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                max_amount: e.target.value ? parseFloat(e.target.value) : null 
              }))}
            />
          </div>
        </div>
      </div>
    </FilterComponent>
  );
}

export default CashDrawerFilter; 