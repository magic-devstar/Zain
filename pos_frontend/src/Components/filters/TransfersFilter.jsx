import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FilterComponent from "../Common/FilterComponent";
import { Printer } from 'lucide-react';
import PrimaryBtn from "../Common/PrimaryBtn";
import api from "../../utils/api";

const TransfersFilter = ({ onFilterChange, showPrintOption = false, onPrintClick, printing = false }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const initialState = {
        transfer_type: "",
        source_type: "",
        source_id: "",
        destination_type: "",
        destination_id: "",
        start_date: "",
        end_date: "",
    };

    const [filters, setFilters] = useState(initialState);
    const [sourceOptions, setSourceOptions] = useState([]);
    const [destinationOptions, setDestinationOptions] = useState([]);

    const TRANSFER_TYPES = [
        { value: "VENDOR_TO_WAREHOUSE", label: "Vendor to Warehouse" },
        { value: "WAREHOUSE_TO_WAREHOUSE", label: "Warehouse to Warehouse" },
        { value: "WAREHOUSE_TO_STORE", label: "Warehouse to Store" },
        { value: "STORE_TO_WAREHOUSE", label: "Store to Warehouse" },
    ];


    // Fetch source and destination options based on transfer type
    useEffect(() => {
        const fetchOptions = async () => {
            setSourceOptions([]);
            setDestinationOptions([]);
            setFilters((prev) => ({
                ...prev,
                source_type: "",
                source_id: "",
                destination_type: "",
                destination_id: "",
            }));

            if (!filters.transfer_type) return;

            try {
                let sourceEndpoint, destinationEndpoint, sourceType, destinationType, sourceResponse, destinationResponse;

                switch (filters.transfer_type) {
                    case "VENDOR_TO_WAREHOUSE":
                        sourceEndpoint = "/common/api/vendors/?all=true";
                        destinationEndpoint = "/common/api/warehouses/?all=true";
                        sourceType = "vendor";
                        destinationType = "warehouse";
                        sourceResponse = await api.get(sourceEndpoint);
                        destinationResponse = await api.get(destinationEndpoint);
                        setSourceOptions(sourceResponse.data.map(item => ({
                            value: item.id,
                            label: item.name || item.username,
                        })));
                        setDestinationOptions(destinationResponse.data.map(item => ({
                            value: item.id,
                            label: item.name || item.username,
                        })));
                        break;

                    case "WAREHOUSE_TO_WAREHOUSE":
                        sourceEndpoint = "/common/api/warehouses/?all=true";
                        destinationEndpoint = "/common/api/warehouses/?all=true";
                        sourceType = "warehouse";
                        destinationType = "warehouse";
                        sourceResponse = await api.get(sourceEndpoint);
                        destinationResponse = await api.get(destinationEndpoint);
                        setSourceOptions(sourceResponse.data.map(item => ({
                            value: item.id,
                            label: item.name || item.username,
                        })));
                        setDestinationOptions(destinationResponse.data.map(item => ({
                            value: item.id,
                            label: item.name || item.username,
                        })));
                        break;

                    case "WAREHOUSE_TO_STORE":
                        sourceEndpoint = "/common/api/warehouses/?all=true";
                        sourceType = "warehouse";
                        destinationType = "store";
                        sourceResponse = await api.get(sourceEndpoint);
                        setSourceOptions(sourceResponse.data.map(item => ({
                            value: item.id,
                            label: item.name || item.username,
                        })));
                        // Fetch stores
                        const storesResponse = await api.get("/auth/stores/?all=true");
                        setDestinationOptions(storesResponse.data.map(store => ({
                            value: store.id,
                            label: store.store_name || `Store ${store.id}`,
                        })));
                        break;

                    case "STORE_TO_WAREHOUSE":
                        destinationEndpoint = "/common/api/warehouses/?all=true";
                        sourceType = "store";
                        destinationType = "warehouse";
                        destinationResponse = await api.get(destinationEndpoint);
                        setDestinationOptions(destinationResponse.data.map(item => ({
                            value: item.id,
                            label: item.name || item.username,
                        })));
                        // Fetch stores
                        const storesSourceResponse = await api.get("/auth/stores/?all=true");
                        setSourceOptions(storesSourceResponse.data.map(store => ({
                            value: store.id,
                            label: store.store_name || `Store ${store.id}`,
                        })));
                        break;

                    default:
                        return;
                }

                setFilters((prev) => ({
                    ...prev,
                    source_type: sourceType,
                    destination_type: destinationType,
                }));
            } catch (error) {
                console.error("Error fetching filter options:", error);
            }
        };

        fetchOptions();
    }, [filters.transfer_type]);


    const handleInputChange = (eChange) => {
        const { name, value } = eChange.target;
        setFilters((prevFilters) => ({
            ...prevFilters,
            [name]: value,
        }));
    };

    const handleSearchClick = () => {
        const queryParams = new URLSearchParams();
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
        setSourceOptions([]);
        setDestinationOptions([]);
        navigate();
        onFilterChange({});
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
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <label className="text-sm font-semibold text-gray-700">Transfer Type</label>
                    <select
                        className="w-full sm:w-60 px-4 py-2 rounded-lg text-sm border-gray-300 border focus:outline-none focus:ring-2 focus:ring-blue-600"
                        onChange={handleInputChange}
                        value={filters.transfer_type}
                        name="transfer_type"
                    >
                        <option value="">Select Transfer Type</option>
                        {TRANSFER_TYPES.map((type) => (
                            <option key={`type-${type.value}`} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <label className="text-sm font-semibold text-gray-700">
                        {filters.source_type === "vendor" ? "Vendor" : filters.source_type === "account" ? "Customer" : "Warehouse"}
                    </label>
                    <select
                        className="w-full sm:w-60 px-4 py-2 rounded-lg text-sm border-gray-300 border focus:outline-none focus:ring-2 focus:ring-blue-600"
                        onChange={handleInputChange}
                        value={filters.source_id}
                        name="source_id"
                        disabled={!filters.transfer_type}
                    >
                        <option value="">Select Source</option>
                        {sourceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <label className="text-sm font-semibold text-gray-700">
                        {filters.destination_type === "account" ? "Customer" : "Warehouse"}
                    </label>
                    <select
                        className="w-full sm:w-60 px-4 py-2 rounded-lg text-sm border-gray-300 border focus:outline-none focus:ring-2 focus:ring-blue-600"
                        onChange={handleInputChange}
                        value={filters.destination_id}
                        name="destination_id"
                        disabled={!filters.source_id}
                    >
                        <option value="">Select Destination</option>
                        {destinationOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date range */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">Start Date</label>
                    <input type="date" name="start_date" value={filters.start_date} onChange={handleInputChange} className="px-4 py-2 rounded-lg text-sm border-gray-300 border" />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">End Date</label>
                    <input type="date" name="end_date" value={filters.end_date} onChange={handleInputChange} className="px-4 py-2 rounded-lg text-sm border-gray-300 border" />
                </div>

                {showPrintOption && (
                    <PrimaryBtn
                        className="mt-2"
                        onClick={handlePrintButtonClick}
                        title="Print Transfers"
                        type="button"
                        disabled={printing}
                    >
                        <Printer size={24} />
                        {printing ? "Generating..." : "Print"}
                    </PrimaryBtn>
                )}
            </div>
        </FilterComponent>
    );
};

export default React.memo(TransfersFilter);