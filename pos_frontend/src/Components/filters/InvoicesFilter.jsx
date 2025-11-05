import React, { useState, useEffect } from "react";
import FilterComponent from "../Common/FilterComponent";
import PrimaryBtn from "../Common/PrimaryBtn";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../utils/api";

const InvoicesFilter = ({ onFilterChange, onPrint, printing = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  const initialState = {
    search: "",
    status: "",
    store_id: "",
    start_date: "",
    end_date: "",
    transfer_id: "",
    min_amount: "",
    max_amount: "",
  };

  const [filters, setFilters] = useState(initialState);

  // Fetch stores for the dropdown
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const storesRes = await api.get("/auth/stores/?all=true");
        setStores(storesRes.data || []);
      } catch (error) {
        console.error('Error fetching stores:', error);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

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

  const handlePrintClick = () => {
    if (onPrint) {
      onPrint(filters);
    }
  };

  return (
    <FilterComponent
      Search={handleSearchClick}
      ResetState={handleResetClick}
      extraActions={
        <PrimaryBtn onClick={handlePrintClick} disabled={printing}>
          {printing ? "Generating..." : "Print Report"}
        </PrimaryBtn>
      }
    >
      <div className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 justify-center gap-2">
        {/* Search Field */}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="font-semibold opacity-90">Search</label>
          <input
            type="text"
            placeholder="Search by invoice number, customer name..."
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            onChange={handleInputChange}
            value={filters.search}
            name="search"
          />
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Status</label>
          <select
            value={filters.status}
            onChange={handleInputChange}
            name="status"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Store Filter */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Store</label>
          <select
            value={filters.store_id}
            onChange={handleInputChange}
            name="store_id"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200 cursor-pointer"
            disabled={loading}
          >
            <option value="">All Stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.store_name} ({store.customer_name})
              </option>
            ))}
          </select>
        </div>

        {/* Transfer ID Filter */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Transfer ID</label>
          <input
            type="text"
            placeholder="Transfer reference"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            onChange={handleInputChange}
            value={filters.transfer_id}
            name="transfer_id"
          />
        </div>

        {/* Date Range Filters */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Start Date</label>
          <input
            type="date"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            onChange={handleInputChange}
            value={filters.start_date}
            name="start_date"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">End Date</label>
          <input
            type="date"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            onChange={handleInputChange}
            value={filters.end_date}
            name="end_date"
          />
        </div>

        {/* Amount Range Filters */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Min Amount</label>
          <input
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            onChange={handleInputChange}
            value={filters.min_amount}
            name="min_amount"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold opacity-90">Max Amount</label>
          <input
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            className="outline-primary px-4 py-1 rounded-[4px] border-2 border-gray-200"
            onChange={handleInputChange}
            value={filters.max_amount}
            name="max_amount"
          />
        </div>
      </div>
    </FilterComponent>
  );
};

export default InvoicesFilter; 