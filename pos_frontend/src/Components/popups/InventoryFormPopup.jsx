import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";
import CreatableSelect from "react-select/creatable";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import priceMatrixAPI from "../../api/priceMatrix";

const defaultLocationEntry = (warehouseId = "") => ({
    warehouse: warehouseId,
    aisle: "",
    shelf: "",
    bay: "",
});

const InventoryFormPopup = ({ inventoryDetails, onClose, onSubmit, isSubmitting }) => {
    const { warehouseId } = useParams();
    const isEditMode = !!inventoryDetails;
    const [step, setStep] = useState(1);
    const [inventoryData, setInventoryData] = useState({
        name: "",
        upc: "",
        description: "",
        category: null,
        unit_price: "",
        price: "",
        low_stock_threshold: 10,
        serial_number_required: false,
    });
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [categoryInput, setCategoryInput] = useState("");
    const [warehouses, setWarehouses] = useState([]);
    const [categoryError, setCategoryError] = useState(null);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [locationEntries, setLocationEntries] = useState(
        warehouseId
            ? [defaultLocationEntry(warehouseId)]
            : [defaultLocationEntry()]
    );
    const extractWarehouseId = (warehouse) => {
        if (warehouse == null) {
            console.warn("Warehouse is null or undefined");
            return null;
        }
        if (typeof warehouse === 'number' || typeof warehouse === 'string') {
            return String(warehouse);
        } else if (typeof warehouse === 'object' && 'id' in warehouse) {
            return String(warehouse.id);
        }
        console.warn(`Invalid warehouse format: ${JSON.stringify(warehouse)}`);
        return null;
    };


    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, whRes] = await Promise.all([
                    api.get("/common/api/inventory-categories/?all=true"),
                    api.get("/common/api/warehouses/?all=true"),
                ]);
                const categoryOptions = catRes.data.map((c) => ({
                    value: c.id,
                    label: c.name,
                }));
                setCategories(categoryOptions);
                setWarehouses(whRes.data);
            } catch (error) {
                console.error("Error fetching data:", error);
                setCategoryError("Failed to load categories");
                toast.error("Failed to load data. Please refresh and try again.");
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (isEditMode && inventoryDetails && categories.length > 0 && warehouses.length > 0) {
            setInventoryData({
                name: inventoryDetails.name || "",
                upc: inventoryDetails.upc || "",
                description: inventoryDetails.description || "",
                category: inventoryDetails.category || null,
                unit_price: String(inventoryDetails.unit_price) || "",
                price: String(inventoryDetails.price) || "",
                low_stock_threshold: inventoryDetails.low_stock_threshold || 10,
                serial_number_required: inventoryDetails.serial_number_required || false,
            });

            if (inventoryDetails.category) {
                const matchingCategory = categories.find(
                    (cat) => cat.value === inventoryDetails.category
                );
                if (matchingCategory) {
                    setSelectedCategory(matchingCategory);
                } else {
                    console.warn(`Category ID ${inventoryDetails.category} not found in categories`);
                    setSelectedCategory(null);
                    toast.error(`Category ID ${inventoryDetails.category} not found. Please select a valid category.`);
                }
            } else {
                setSelectedCategory(null);
            }

            // Initialize locationEntries with validated warehouse IDs
            const validWarehouseIds = new Set(warehouses.map(wh => String(wh.id)));
            const extractWarehouseId = (warehouse) => {
                if (typeof warehouse === 'number' || typeof warehouse === 'string') {
                    return String(warehouse);
                } else if (warehouse && typeof warehouse === 'object' && 'id' in warehouse) {
                    return String(warehouse.id);
                }
                console.warn(`Invalid warehouse format: ${JSON.stringify(warehouse)}`);
                return null;
            };

            const locationWarehouses = new Set(
                inventoryDetails.locations?.map(loc => {
                    const warehouseId = extractWarehouseId(loc.warehouse);
                    if (warehouseId && !validWarehouseIds.has(warehouseId)) {
                        console.warn(`Invalid warehouse ID in locations: ${warehouseId}`);
                    }
                    return warehouseId;
                }).filter(id => id && validWarehouseIds.has(id)) || []
            );
            const itemWarehouses = new Set(
                inventoryDetails.items?.map(item => {
                    const warehouseId = extractWarehouseId(item.warehouse);
                    if (warehouseId && !validWarehouseIds.has(warehouseId)) {
                        console.warn(`Invalid warehouse ID in items: ${warehouseId}`);
                    }
                    return warehouseId;
                }).filter(id => id && validWarehouseIds.has(id)) || []
            );
            const allWarehouses = new Set([...locationWarehouses, ...itemWarehouses]);

            const mappedEntries = Array.from(allWarehouses).map(warehouseId => {
                const existingLocation = inventoryDetails.locations?.find(
                    loc => extractWarehouseId(loc.warehouse) === warehouseId
                );
                return {
                    warehouse: warehouseId,
                    aisle: existingLocation?.aisle || "",
                    shelf: existingLocation?.shelf || "",
                    bay: existingLocation?.bay || "",
                };
            });

            setLocationEntries(
                mappedEntries.length > 0 ? mappedEntries : [defaultLocationEntry(warehouseId)]
            );
            console.log("inventoryDetails:", JSON.stringify(inventoryDetails, null, 2));
            console.log("locationEntries:", JSON.stringify(mappedEntries, null, 2));
        }
    }, [inventoryDetails, isEditMode, warehouseId, categories, warehouses]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setInventoryData((prev) => {
            const updatedData = {
                ...prev,
                [name]: type === "checkbox" ? checked : value,
            };
            
            // Auto-calculate price when unit_price changes using price matrix
            if (name === "unit_price") {
                if (value && !isNaN(Number.parseFloat(value))) {
                    // Use price matrix API to calculate sale price
                    priceMatrixAPI.calculateSalePrice(value)
                        .then(response => {
                            setInventoryData(prev => ({
                                ...prev,
                                price: response.sale_price.toFixed(2)
                            }));
                        })
                        .catch(error => {
                            console.error('Error calculating sale price:', error);
                            // Fallback to original calculation if API fails
                            const unitPrice = Number.parseFloat(value);
                            const markupPercentage = 20; // 20% markup as fallback
                            const calculatedPrice = unitPrice + (unitPrice * markupPercentage / 100);
                            setInventoryData(prev => ({
                                ...prev,
                                price: calculatedPrice.toFixed(2)
                            }));
                        });
                } else {
                    // Clear price when unit_price is empty or invalid
                    updatedData.price = "";
                }
            }
            
            return updatedData;
        });
    };

    const handleCategoryChange = useCallback((selectedOption) => {
        setSelectedCategory(selectedOption);
        setInventoryData((prev) => ({
            ...prev,
            category: selectedOption ? selectedOption.value : null,
        }));
        setCategoryInput(selectedOption ? selectedOption.label : "");
    }, []);

    const handleCreateCategory = useCallback(
        async (inputValue) => {
            if (!inputValue.trim() || isCreatingCategory) return;
            setIsCreatingCategory(true);
            try {
                const payload = { name: inputValue, description: "" };
                const response = await api.post("/common/api/inventory-categories/", payload);
                const newCat = {
                    value: response.data.id,
                    label: response.data.name,
                };
                setCategories((prev) => [...prev, newCat]);
                setSelectedCategory(newCat);
                setInventoryData((prev) => ({
                    ...prev,
                    category: newCat.value,
                }));
                setCategoryInput("");
                toast.success("Category created successfully!");
            } catch (error) {
                console.error("Error creating category:", error);
                setCategoryError("Failed to create category");
                toast.error("Failed to create category. Please try again.");
            } finally {
                setIsCreatingCategory(false);
            }
        },
        [isCreatingCategory]
    );

    const handleAddLocation = () => {
        setLocationEntries((prev) => [...prev, defaultLocationEntry()]);
    };

    const handleRemoveLocation = (idx) => {
        const warehouseId = locationEntries[idx].warehouse;
        if (inventoryDetails?.items?.some(item => String(extractWarehouseId(item.warehouse)) === warehouseId)) {
            toast.error("Cannot remove location for a warehouse with items.");
            return;
        }
        setLocationEntries((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleLocationEntryChange = (idx, field, value) => {
        if (field === "warehouse") {
            const validWarehouseIds = new Set(warehouses.map(wh => String(wh.id)));
            if (value && !validWarehouseIds.has(String(value))) {
                console.warn(`Invalid warehouse ID selected: ${value}`);
                toast.error(`Invalid warehouse selected: ${value}. Please select a valid warehouse.`);
                return;
            }
        }
        setLocationEntries((prev) =>
            prev.map((entry, i) =>
                i === idx ? { ...entry, [field]: value } : entry
            )
        );
    };

    const getAvailableWarehouses = useCallback(
        (currentIndex) => {
            const selectedWarehouseIds = locationEntries
                .map((entry, idx) => (idx !== currentIndex ? entry.warehouse : null))
                .filter((id) => id !== null && id !== "");
            return warehouses.filter((wh) => !selectedWarehouseIds.includes(String(wh.id)));
        },
        [locationEntries, warehouses]
    );

    const validateStep = useCallback(
        (currentStep) => {
            let isValid = true;
            const errors = [];

            if (currentStep === 1) {
                if (!inventoryData.name.trim()) {
                    errors.push("Name is required");
                    isValid = false;
                }
                if (!inventoryData.upc.trim()) {
                    errors.push("UPC is required");
                    isValid = false;
                }
                if (!selectedCategory && !categoryInput) {
                    errors.push("Category is required");
                    isValid = false;
                }
                if (!inventoryData.unit_price.trim()) {
                    errors.push("Unit Price is required");
                    isValid = false;
                } else if (isNaN(Number.parseFloat(inventoryData.unit_price))) {
                    errors.push("Unit Price must be a valid number");
                    isValid = false;
                }
                if (!inventoryData.price.trim()) {
                    errors.push("Price is required");
                    isValid = false;
                } else if (isNaN(Number.parseFloat(inventoryData.price))) {
                    errors.push("Price must be a valid number");
                    isValid = false;
                }
            } else if (currentStep === 2) {
                if (
                    locationEntries.length === 0 ||
                    locationEntries.some((entry) => !entry.warehouse || isNaN(Number.parseInt(entry.warehouse, 10)))
                ) {
                    errors.push("All locations must have a valid warehouse selected");
                    isValid = false;
                }
                // Ensure all item warehouses are included
                const itemWarehouses = new Set(
                    inventoryDetails?.items?.map(item => String(extractWarehouseId(item.warehouse))) || []
                );
                const locationWarehouses = new Set(
                    locationEntries.map(entry => entry.warehouse).filter(id => id)
                );
                const missingWarehouses = [...itemWarehouses].filter(id => !locationWarehouses.has(id));
                if (missingWarehouses.length > 0) {
                    errors.push(`Missing locations for warehouses with items: ${missingWarehouses.join(", ")}`);
                    isValid = false;
                }
            } else if (currentStep === 3) {
                for (const entry of locationEntries) {
                    if (!entry.warehouse || isNaN(Number.parseInt(entry.warehouse, 10))) {
                        errors.push("Warehouse is required and must be valid for each location");
                        isValid = false;
                    }
                }
                if (!inventoryData.name.trim()) {
                    errors.push("Name is required");
                    isValid = false;
                }
                if (!inventoryData.upc.trim()) {
                    errors.push("UPC is required");
                    isValid = false;
                }
                if (!selectedCategory) {
                    errors.push("Category is required");
                    isValid = false;
                }
                if (!inventoryData.unit_price.trim() || isNaN(Number.parseFloat(inventoryData.unit_price))) {
                    errors.push("Valid Unit Price is required");
                    isValid = false;
                }
                if (!inventoryData.price.trim() || isNaN(Number.parseFloat(inventoryData.price))) {
                    errors.push("Valid Price is required");
                    isValid = false;
                }
                // Same item warehouse validation as step 2
                const itemWarehouses = new Set(
                    inventoryDetails?.items?.map(item => String(extractWarehouseId(item.warehouse))) || []
                );
                const locationWarehouses = new Set(
                    locationEntries.map(entry => entry.warehouse).filter(id => id)
                );
                const missingWarehouses = [...itemWarehouses].filter(id => !locationWarehouses.has(id));
                if (missingWarehouses.length > 0) {
                    errors.push(`Missing locations for warehouses with items: ${missingWarehouses.join(", ")}`);
                    isValid = false;
                }
            }

            if (!isValid) {
                errors.forEach((error) => toast.error(error));
            }
            return isValid;
        },
        [inventoryData, selectedCategory, categoryInput, locationEntries, inventoryDetails]
    );

    const nextStep = useCallback(() => {
        if (validateStep(step)) {
            setStep((prev) => prev + 1);
        }
    }, [step, validateStep]);

    const prevStep = useCallback(() => setStep((prev) => prev - 1), []);

    const handleSubmit = useCallback(async () => {
        if (!validateStep(3) || isSubmitting) {
            return;
        }
        if (step !== 3) {
            return;
        }

        const invalidWarehouses = locationEntries.filter(
            (entry) => !entry.warehouse || isNaN(Number.parseInt(entry.warehouse, 10))
        );
        if (invalidWarehouses.length > 0) {
            toast.error("All locations must have a valid warehouse selected.");
            return;
        }

        // Validate item warehouses
        const itemWarehouses = new Set(
            inventoryDetails?.items?.map(item => String(extractWarehouseId(item.warehouse))) || []
        );
        const locationWarehouses = new Set(
            locationEntries.map(entry => entry.warehouse).filter(id => id)
        );
        const missingWarehouses = [...itemWarehouses].filter(id => !locationWarehouses.has(id));
        if (missingWarehouses.length > 0) {
            toast.error(`Missing locations for warehouses with items: ${missingWarehouses.join(", ")}`);
            return;
        }

        const payload = {
            id: isEditMode ? inventoryDetails.id : undefined,
            name: inventoryData.name,
            upc: inventoryData.upc,
            description: inventoryData.description,
            unit_price: Number.parseFloat(inventoryData.unit_price),
            price: Number.parseFloat(inventoryData.price),
            low_stock_threshold: Number.parseInt(inventoryData.low_stock_threshold, 10),
            serial_number_required: inventoryData.serial_number_required,
            category: selectedCategory ? selectedCategory.value : null,
            locations: locationEntries.map((entry) => ({
                warehouse: Number.parseInt(entry.warehouse, 10),
                aisle: entry.aisle || "",
                shelf: entry.shelf || "",
                bay: entry.bay || "",
            })),
        };

        try {
            await onSubmit(payload);
        } catch (error) {
            console.error("Submission error:", error.response?.data);
            toast.error(`Failed to ${isEditMode ? "update" : "create"} inventory: ${error.response?.data?.detail || error.message}`);
        } finally {
            onClose();
        }
    }, [inventoryData, selectedCategory, validateStep, locationEntries, isEditMode, inventoryDetails, step, onSubmit, onClose]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
        }
    };

    const renderInventoryDetailsForm = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Inventory Details</h2>
            {categoryError && <div className="text-red-500">{categoryError}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-gray-700">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={inventoryData.name}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-gray-700">
                        UPC <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            name="upc"
                            value={inventoryData.upc}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                            readOnly={isEditMode}
                        />
                        {!isEditMode && (
                            <PrimaryBtn
                                type="button"
                                onClick={async () => {
                                    const name = (inventoryData.name || "").trim();
                                    if (!name) {
                                        toast.error("Enter item name first to generate UPC");
                                        return;
                                    }
                                    try {
                                        const res = await api.post("/common/api/InventorySimple/generate-upc/", { name });
                                        const upc = res.data?.upc;
                                        if (upc) {
                                            setInventoryData(prev => ({ ...prev, upc }));
                                            toast.success("UPC generated");
                                        } else {
                                            toast.error("Failed to generate UPC");
                                        }
                                    } catch (err) {
                                        toast.error(err.response?.data?.detail || "Failed to generate UPC");
                                    }
                                }}
                            >
                                Generate UPC
                            </PrimaryBtn>
                        )}
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="block text-gray-700">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <CreatableSelect
                        options={categories}
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        onCreateOption={handleCreateCategory}
                        onInputChange={(inputValue) => setCategoryInput(inputValue)}
                        styles={customStyles}
                        isClearable
                        placeholder="Search or add category"
                        className="w-full"
                        inputValue={categoryInput}
                        isDisabled={isCreatingCategory}
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-gray-700">
                        Unit Price <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="unit_price"
                        value={inventoryData.unit_price}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="Enter unit price"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-gray-700">
                        Price <span className="text-red-500">*</span>
                        {inventoryData.unit_price && !isNaN(Number.parseFloat(inventoryData.unit_price)) && (
                            <span className="text-xs text-green-600 ml-1">(Auto-calculated via Price Matrix)</span>
                        )}
                    </label>
                    <input
                        type="number"
                        name="price"
                        value={inventoryData.price}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none`}
                        placeholder="price"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-gray-700">Low Stock Threshold</label>
                    <input
                        type="number"
                        name="low_stock_threshold"
                        value={inventoryData.low_stock_threshold}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                </div>
            </div>
            <div className="space-y-1">
                <label className="block text-gray-700">
                    Description
                </label>
                <textarea
                    type="text"
                    name="description"
                    rows={8}
                    value={inventoryData.description}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                />
            </div>
            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    name="serial_number_required"
                    checked={inventoryData.serial_number_required}
                    onChange={handleChange}
                    className="h-4 w-4"
                />
                <label className="text-gray-700">Serial Number Required</label>
            </div>
            <div className="flex justify-end pt-4">
                <PrimaryBtn type="button" onClick={nextStep}>Next</PrimaryBtn>
            </div>
        </div>
    );

    const renderWarehouseSelectionForm = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Warehouse Selection</h2>
            {locationEntries.map((entry, idx) => {
                const availableWarehouses = getAvailableWarehouses(idx);
                const isDisabled = warehouseId && entry.warehouse === warehouseId;
                const hasItems = inventoryDetails?.items?.some(
                    item => String(extractWarehouseId(item.warehouse)) === entry.warehouse
                );

                return (
                    <div className="border border-black-400 rounded p-4 mb-4" key={idx}>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-gray-700">
                                    Warehouse <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={entry.warehouse}
                                    onChange={(e) => handleLocationEntryChange(idx, "warehouse", e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    required
                                    disabled={isDisabled || hasItems}
                                >
                                    <option value="">Select Warehouse</option>
                                    {availableWarehouses.map((wh) => (
                                        <option key={wh.id} value={wh.id}>
                                            {wh.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {locationEntries.length > 1 && !hasItems && (
                                <div>
                                    <label className="block text-gray-700">
                                        <span className="text-primary"></span>
                                    </label>
                                    <SecondaryBtn
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => handleRemoveLocation(idx)}
                                        title="Remove warehouse"
                                    >
                                        ×
                                    </SecondaryBtn>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            <div className="flex justify-between pt-4">
                <SecondaryBtn type="button" onClick={prevStep}>
                    Back
                </SecondaryBtn>
                <div className="flex gap-2">
                    {!warehouseId && (
                        <SecondaryBtn
                            type="button"
                            onClick={handleAddLocation}
                            disabled={warehouses.length <= locationEntries.length}
                        >
                            Add Warehouse
                        </SecondaryBtn>
                    )}
                    <PrimaryBtn type="button" onClick={nextStep}>Next</PrimaryBtn>
                </div>
            </div>
        </div>
    );

    const renderLocationDetailsForm = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Location Details</h2>
            {locationEntries.map((entry, idx) => {
                const isOtherWarehouse = isEditMode && warehouseId && entry.warehouse !== warehouseId;
                const hasItems = inventoryDetails?.items?.some(
                    item => String(extractWarehouseId(item.warehouse)) === entry.warehouse
                );
                return (
                    <div className="border border-black-400 rounded p-4 mb-4" key={idx}>
                        <strong>
                            {warehouses.find((w) => String(w.id) === String(entry.warehouse))?.name || "Select Warehouse"}
                            {hasItems && <span className="text-red-500"> (Contains Items)</span>}
                        </strong>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            <div className="space-y-1">
                                <label className="block text-gray-700">Aisle</label>
                                <input
                                    type="text"
                                    value={entry.aisle}
                                    onChange={(e) => handleLocationEntryChange(idx, "aisle", e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    disabled={isOtherWarehouse}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-gray-700">Shelf</label>
                                <input
                                    type="text"
                                    value={entry.shelf}
                                    onChange={(e) => handleLocationEntryChange(idx, "shelf", e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    disabled={isOtherWarehouse}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-gray-700">Bay</label>
                                <input
                                    type="text"
                                    value={entry.bay}
                                    onChange={(e) => handleLocationEntryChange(idx, "bay", e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    disabled={isOtherWarehouse}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
            <div className="flex justify-between pt-4">
                <SecondaryBtn type="button" onClick={prevStep}>
                    Back
                </SecondaryBtn>
                <PrimaryBtn type="button" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Inventory" : "Create Inventory")}
                </PrimaryBtn>
            </div>
        </div>
    );

    const customStyles = {
        control: (provided) => ({
            ...provided,
            borderColor: "#D1D5DB",
            "&:hover": {
                borderColor: "#9CA3AF",
            },
        }),
    };

    let currentForm;
    switch (step) {
        case 1:
            currentForm = renderInventoryDetailsForm();
            break;
        case 2:
            currentForm = renderWarehouseSelectionForm();
            break;
        case 3:
            currentForm = renderLocationDetailsForm();
            break;
        default:
            currentForm = renderInventoryDetailsForm();
    }

    return (
        <div className="p-2 mx-auto">
            <div className="mb-4">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-medium">
                        {isEditMode ? "Update Inventory Item Type" : "Create New Inventory Item Type"}
                    </h3>
                    <div className="flex space-x-1">
                        {[1, 2, 3].map((stepNum) => (
                            <div
                                key={stepNum}
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === stepNum
                                    ? "bg-primary text-white"
                                    : step > stepNum
                                        ? "bg-primary_light text-gray-300"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                            >
                                {stepNum}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div>{currentForm}</div>
        </div>
    );
};

export default InventoryFormPopup;