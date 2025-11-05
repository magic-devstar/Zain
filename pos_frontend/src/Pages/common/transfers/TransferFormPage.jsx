
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";
import Select from "react-select";
import api from "../../../utils/api";
import { toast } from "react-hot-toast";
import AttributeInputPopup from "../../../Components/popups/AttributeInputPopup";

const defaultItemEntry = (isVendorToWarehouse = false) => ({
    inventory_id: "",
    quantity: 1,
    attributes: isVendorToWarehouse ? [{
        serial_number: "",
        mac_address: "",
        ip_address: "",
        service_tag: "",
        service_number: ""
    }] : [],
    item_ids: isVendorToWarehouse ? [] : [],
});

const TransferFormPage = () => {
    const navigate = useNavigate();
    const [transferData, setTransferData] = useState({
        transfer_type: "",
        source_content_type: "",
        source_object_id: "",
        destination_content_type: "",
        destination_object_id: "",
        reference_number: "",
    });
    const [itemsData, setItemsData] = useState([defaultItemEntry()]);
    const [transferTypes] = useState([
        { value: "VENDOR_TO_WAREHOUSE", label: "Vendor to Warehouse" },
        { value: "WAREHOUSE_TO_WAREHOUSE", label: "Warehouse to Warehouse" },
        { value: "WAREHOUSE_TO_STORE", label: "Warehouse to Store" },
        { value: "STORE_TO_WAREHOUSE", label: "Store to Warehouse" },
    ]);
    const [vendors, setVendors] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [stores, setStores] = useState([]);
    const [inventories, setInventories] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAttributePopup, setShowAttributePopup] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState({
        itemIdx: null,
        attrIdx: null,
        fieldName: "",
        value: "",
        isEditing: false
    });

    // Loading states
    const [isLoadingVendors, setIsLoadingVendors] = useState(false);
    const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
    const [isLoadingStores, setIsLoadingStores] = useState(false);
    const [isLoadingInventories, setIsLoadingInventories] = useState(false);
    const [isLoadingInventoryItems, setIsLoadingInventoryItems] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingVendors(true);
            setIsLoadingWarehouses(true);
            setIsLoadingStores(true);
            setIsLoadingInventories(true);

            try {
                const [vendorRes, warehouseRes, storesRes, inventoryRes] = await Promise.all([
                    api.get("/common/api/vendors/?all=true"),
                    api.get("/common/api/warehouses/?all=true"),
                    api.get("/auth/stores/?all=true"),
                    api.get("/common/api/inventory/?all=true"),
                ]);
                setVendors(vendorRes.data.map(v => ({ value: v.id, label: v.name })));
                setWarehouses(warehouseRes.data.map(w => ({ value: w.id, label: w.name })));
                setStores(storesRes.data.map(s => ({
                    value: s.id,
                    label: s.store_name || `Store ${s.id}`,
                    customer_name: s.customer_name,
                    customer_email: s.customer_email
                })));
                setInventories(inventoryRes.data.map(i => ({
                    value: i.id,
                    label: i.name,
                    serial_number_required: i.serial_number_required,
                    available_quantities: i.items.reduce((acc, item) => {
                        if (item.status === "available") {
                            acc[item.warehouse] = (acc[item.warehouse] || 0) + 1;
                        }
                        return acc;
                    }, {})
                })));
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load data. Please refresh and try again.");
            } finally {
                setIsLoadingVendors(false);
                setIsLoadingWarehouses(false);
                setIsLoadingStores(false);
                setIsLoadingInventories(false);
            }
        };
        fetchData();
    }, []);

    const fetchInventoryItems = useCallback(async (sourceType, sourceId) => {
        if (!sourceType || !sourceId) {
            setInventoryItems([]);
            return;
        }
        setIsLoadingInventoryItems(true);
        try {
            let endpoint;
            if (sourceType === "warehouse" && transferData.transfer_type !== "WAREHOUSE_TO_WAREHOUSE") {
                endpoint = `/common/api/inventory-items/?warehouse_id=${sourceId}&status=available&all=true`;
            } else if (sourceType === "store") {
                endpoint = `/common/api/inventory-items/?store_id=${sourceId}&status=consumed&all=true`;
            } else {
                setInventoryItems([]);
                setIsLoadingInventoryItems(false);
                return;
            }
            const response = await api.get(endpoint);
            setInventoryItems(response.data.map((item) => ({
                value: item.id,
                label: `${item.inventory_name} - Item ${item.id} ${item.attributes.serial_number ? `(${item.attributes.serial_number})` : ""}`,
                attributes: item.attributes,
            })));
        } catch (error) {
            console.error("Error fetching inventory items:", error);
            toast.error("Failed to load inventory items.");
            setInventoryItems([]);
        } finally {
            setIsLoadingInventoryItems(false);
        }
    }, [transferData.transfer_type]);

    const handleTransferChange = useCallback((name, selectedOptionOrValue) => {
        setTransferData((prev) => {
            const value = typeof selectedOptionOrValue === 'string' || typeof selectedOptionOrValue === 'number'
                ? selectedOptionOrValue
                : (selectedOptionOrValue ? selectedOptionOrValue.value : "");
            const newData = { ...prev, [name]: value };

            if (name === "transfer_type") {
                newData.source_content_type = "";
                newData.source_object_id = "";
                newData.destination_content_type = "";
                newData.destination_object_id = "";
                setItemsData([defaultItemEntry(newData.transfer_type === "VENDOR_TO_WAREHOUSE")]);
                setInventoryItems([]);
            }
            return newData;
        });
    }, []);

    const handleSourceChange = useCallback((selectedOption) => {
        const sourceType = transferData.transfer_type === "VENDOR_TO_WAREHOUSE" ? "vendor" :
            transferData.transfer_type === "STORE_TO_WAREHOUSE" ? "store" : "warehouse";
        if (transferData.transfer_type === "WAREHOUSE_TO_WAREHOUSE" && selectedOption && selectedOption.value === transferData.destination_object_id) {
            toast.error("Source and destination warehouses cannot be the same.");
            return;
        }
        setTransferData((prev) => ({
            ...prev,
            source_content_type: sourceType,
            source_object_id: selectedOption ? selectedOption.value : "",
        }));
        if (selectedOption && transferData.transfer_type !== "WAREHOUSE_TO_WAREHOUSE") {
            fetchInventoryItems(sourceType, selectedOption.value);
        } else {
            setInventoryItems([]);
        }
    }, [transferData.transfer_type, transferData.destination_object_id, fetchInventoryItems]);

    const handleDestinationChange = useCallback((selectedOption) => {
        const destType = transferData.transfer_type === "WAREHOUSE_TO_STORE" ? "store" : "warehouse";
        if (transferData.transfer_type === "WAREHOUSE_TO_WAREHOUSE" && selectedOption && selectedOption.value === transferData.source_object_id) {
            toast.error("Source and destination warehouses cannot be the same.");
            return;
        }
        setTransferData((prev) => ({
            ...prev,
            destination_content_type: destType,
            destination_object_id: selectedOption ? selectedOption.value : "",
        }));
    }, [transferData.transfer_type, transferData.source_object_id]);

    const handleItemChange = useCallback((idx, field, value) => {
        setItemsData((prev) =>
            prev.map((item, i) =>
                i === idx ? { ...item, [field]: value } : item
            )
        );
    }, []);

    const handleAttributeChange = useCallback((itemIdx, attrIdx, field, value) => {
        setItemsData((prev) =>
            prev.map((item, i) =>
                i === itemIdx
                    ? {
                        ...item,
                        attributes: item.attributes.map((attr, j) =>
                            j === attrIdx ? { ...attr, [field]: value } : attr
                        ),
                    }
                    : item
            )
        );
    }, []);

    const handleItemIdsChange = useCallback((idx, selectedOptions) => {
        setItemsData((prev) =>
            prev.map((item, i) =>
                i === idx
                    ? {
                        ...item,
                        item_ids: selectedOptions.map((opt) => opt.value),
                        quantity: selectedOptions.length,
                    }
                    : item
            )
        );
    }, []);

    const handleAddItem = useCallback(() => {
        setItemsData((prev) => [...prev, defaultItemEntry(transferData.transfer_type === "VENDOR_TO_WAREHOUSE")]);
    }, [transferData.transfer_type]);

    const handleRemoveItem = useCallback((idx) => {
        setItemsData((prev) => prev.filter((_, i) => i !== idx));
    }, []);

    const handleAddAttribute = useCallback((idx) => {
        setItemsData((prev) =>
            prev.map((item, i) =>
                i === idx
                    ? {
                        ...item,
                        attributes: [
                            ...item.attributes,
                            { serial_number: "", mac_address: "", ip_address: "", service_tag: "", service_number: "" },
                        ],
                        quantity: item.attributes.length + 1,
                    }
                    : item
            )
        );
    }, []);

    const handleRemoveAttribute = useCallback((itemIdx, attrIdx) => {
        setItemsData((prev) =>
            prev.map((item, i) =>
                i === itemIdx
                    ? {
                        ...item,
                        attributes: item.attributes.filter((_, j) => j !== attrIdx),
                        quantity: item.attributes.length - 1 || 1,
                    }
                    : item
            )
        );
    }, []);

    const getSourceOptions = useCallback(() => {
        switch (transferData.transfer_type) {
            case "VENDOR_TO_WAREHOUSE":
                return vendors;
            case "WAREHOUSE_TO_WAREHOUSE":
            case "WAREHOUSE_TO_STORE":
                return warehouses;
            case "STORE_TO_WAREHOUSE":
                return stores;
            default:
                return [];
        }
    }, [transferData.transfer_type, vendors, warehouses, stores]);

    const getDestinationOptions = useCallback(() => {
        switch (transferData.transfer_type) {
            case "VENDOR_TO_WAREHOUSE":
            case "WAREHOUSE_TO_WAREHOUSE":
            case "STORE_TO_WAREHOUSE":
                return warehouses;
            case "WAREHOUSE_TO_STORE":
                return stores;
            default:
                return [];
        }
    }, [transferData.transfer_type, warehouses, stores]);

    const validateForm = useCallback(() => {
        let isValid = true;
        const errors = [];

        if (!transferData.transfer_type) {
            errors.push("Transfer type is required");
            isValid = false;
        }
        if (!transferData.source_content_type || !transferData.source_object_id) {
            errors.push("Source is required");
            isValid = false;
        }
        if (!transferData.destination_content_type || !transferData.destination_object_id) {
            errors.push("Destination is required");
            isValid = false;
        }
        if (transferData.transfer_type === "WAREHOUSE_TO_WAREHOUSE" && transferData.source_object_id === transferData.destination_object_id) {
            errors.push("Source and destination warehouses cannot be the same");
            isValid = false;
        }
        if (transferData.transfer_type === "VENDOR_TO_WAREHOUSE" && !transferData.reference_number) {
            errors.push("Reference Number is required for Vendor to Warehouse transfers");
            isValid = false;
        }
        if (itemsData.length === 0) {
            errors.push("At least one item is required");
            isValid = false;
        }

        const isVendorToWarehouse = transferData.transfer_type === "VENDOR_TO_WAREHOUSE";
        const isWarehouseToWarehouse = transferData.transfer_type === "WAREHOUSE_TO_WAREHOUSE";

        itemsData.forEach((item, idx) => {
            if (isVendorToWarehouse || isWarehouseToWarehouse) {
                if (!item.inventory_id) {
                    errors.push(`Item ${idx + 1}: Inventory item is required`);
                    isValid = false;
                }
                if (item.quantity < 1) {
                    errors.push(`Item ${idx + 1}: Quantity must be at least 1`);
                    isValid = false;
                }
                const inventory = inventories.find(i => i.value === item.inventory_id);
                if (inventory) {
                    if (isVendorToWarehouse && inventory.serial_number_required) {
                        if (item.attributes.length !== item.quantity) {
                            errors.push(`Item ${idx + 1}: Number of attributes (${item.attributes.length}) must match quantity (${item.quantity})`);
                            isValid = false;
                        }
                        item.attributes.forEach((attr, j) => {
                            // Validate required default fields
                            ['serial_number', 'mac_address', 'ip_address', 'service_tag', 'service_number'].forEach((field) => {
                                if (!attr[field] || !attr[field].trim()) {
                                    errors.push(`Item ${idx + 1}, Attribute ${j + 1}: ${field.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} is required`);
                                    isValid = false;
                                }
                            });
                        });
                    }
                    if (transferData.source_object_id && (isWarehouseToWarehouse || transferData.transfer_type === "WAREHOUSE_TO_CUSTOMER")) {
                        const availableQty = inventory.available_quantities[transferData.source_object_id] || 0;
                        if (item.quantity > availableQty) {
                            errors.push(`Item ${idx + 1}: Transfer quantity (${item.quantity}) exceeds available stock (${availableQty}) in source warehouse`);
                            isValid = false;
                        }
                    }
                }
            } else {
                if (item.item_ids.length === 0) {
                    errors.push(`Item ${idx + 1}: At least one inventory item must be selected`);
                    isValid = false;
                }
                if (transferData.transfer_type === "WAREHOUSE_TO_STORE") {
                    const inventory = inventories.find(i => item.item_ids.some(id => inventoryItems.find(item => item.value === id)?.inventory_id === i.value));
                    if (inventory) {
                        const availableQty = inventory.available_quantities[transferData.source_object_id] || 0;
                        if (item.item_ids.length > availableQty) {
                            errors.push(`Item ${idx + 1}: Selected items (${item.item_ids.length}) exceed available stock (${availableQty}) in source warehouse`);
                            isValid = false;
                        }
                    }
                }
            }
        });

        if (!isValid) {
            errors.forEach((error) => toast.error(error));
        }
        return isValid;
    }, [transferData, itemsData, inventories, inventoryItems]);

    const handleSubmit = useCallback(async () => {
        if (!validateForm() || isSubmitting) {
            return;
        }
        setIsSubmitting(true);

        const payload = {
            transfer_type: transferData.transfer_type,
            source_content_type: transferData.source_content_type,
            source_object_id: Number.parseInt(transferData.source_object_id, 10),
            destination_content_type: transferData.destination_content_type,
            destination_object_id: Number.parseInt(transferData.destination_object_id, 10),
            reference_number: transferData.reference_number,
            items_data: itemsData.map((item) => ({
                inventory_id: Number.parseInt(item.inventory_id, 10) || undefined,
                quantity: Number.parseInt(item.quantity, 10) || item.item_ids.length,
                attributes: item.attributes,
                item_ids: item.item_ids,
            })),
        };

        console.log("Submitting payload:", JSON.stringify(payload, null, 2));

        try {
            await api.post("/common/api/transfer/", payload);
            toast.success("Transfer created successfully!");
            navigate(-1);
        } catch (error) {
            console.error("Submission error:", error.response?.data);
            toast.error(`Failed to create transfer: ${error.response?.data?.detail || error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    }, [transferData, itemsData, isSubmitting, validateForm, navigate]);

    const handleCancel = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    const customStyles = {
        control: (provided) => ({
            ...provided,
            borderColor: "#D1D5DB",
            "&:hover": {
                borderColor: "#9CA3AF",
            },
        }),
    };

    const isVendorToWarehouse = transferData.transfer_type === "VENDOR_TO_WAREHOUSE";
    const isWarehouseToWarehouse = transferData.transfer_type === "WAREHOUSE_TO_WAREHOUSE";

    return (
        <div className="mx-auto w-full h-full">
            <h1 className="text-2xl font-bold mb-6">Create New Transfer</h1>
            <div className="space-y-6">
                {/* Transfer Details */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Transfer Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="block text-gray-700">
                                Transfer Type <span className="text-red-500">*</span>
                            </label>
                            <Select
                                options={transferTypes}
                                value={transferTypes.find((t) => t.value === transferData.transfer_type)}
                                onChange={(opt) => handleTransferChange("transfer_type", opt)}
                                styles={customStyles}
                                placeholder="Select Transfer Type"
                                className="w-full"
                                isDisabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-gray-700">
                                Source <span className="text-red-500">*</span>
                            </label>
                            <Select
                                options={getSourceOptions()}
                                value={getSourceOptions().find((opt) => opt.value === transferData.source_object_id)}
                                onChange={handleSourceChange}
                                styles={customStyles}
                                placeholder="Select Source"
                                className="w-full"
                                isLoading={
                                    (transferData.transfer_type === "VENDOR_TO_WAREHOUSE" && isLoadingVendors) ||
                                    ((transferData.transfer_type === "WAREHOUSE_TO_WAREHOUSE" || transferData.transfer_type === "WAREHOUSE_TO_STORE") && isLoadingWarehouses) ||
                                    (transferData.transfer_type === "STORE_TO_WAREHOUSE" && isLoadingStores)
                                }
                                isDisabled={!transferData.transfer_type || isSubmitting}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-gray-700">
                                Destination <span className="text-red-500">*</span>
                            </label>
                            <Select
                                options={getDestinationOptions()}
                                value={getDestinationOptions().find((opt) => opt.value === transferData.destination_object_id)}
                                onChange={handleDestinationChange}
                                styles={customStyles}
                                placeholder="Select Destination"
                                className="w-full"
                                isLoading={
                                    ((transferData.transfer_type === "VENDOR_TO_WAREHOUSE" || transferData.transfer_type === "WAREHOUSE_TO_WAREHOUSE" || transferData.transfer_type === "STORE_TO_WAREHOUSE") && isLoadingWarehouses) ||
                                    (transferData.transfer_type === "WAREHOUSE_TO_STORE" && isLoadingStores)
                                }
                                isDisabled={!transferData.transfer_type || isSubmitting}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                        <div className="space-y-1 md:col-span-1">
                            <label className="block text-gray-700">
                                Reference Number {transferData.transfer_type === "VENDOR_TO_WAREHOUSE" && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="text"
                                name="reference_number"
                                value={transferData.reference_number}
                                onChange={(e) => handleTransferChange("reference_number", e.target.value)}
                                className="custom-input-style w-full"
                                placeholder="Enter Reference Number"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                </div>

                {/* Inventory Items */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Inventory Items</h2>
                    {itemsData.map((item, idx) => {
                        const selectedInventory = inventories.find((inv) => inv.value === item.inventory_id);
                        const isSerialized = selectedInventory?.serial_number_required;
                        const availableQty = selectedInventory?.available_quantities[transferData.source_object_id] || 0;

                        return (
                            <div className="border border-gray-400 rounded p-4 mb-4" key={idx}>
                                {(isVendorToWarehouse || isWarehouseToWarehouse) ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="block text-gray-700">
                                                    Inventory Item <span className="text-red-500">*</span>
                                                </label>
                                                <Select
                                                    options={inventories}
                                                    value={inventories.find((inv) => inv.value === item.inventory_id)}
                                                    onChange={(opt) => handleItemChange(idx, "inventory_id", opt.value)}
                                                    styles={customStyles}
                                                    placeholder="Select Inventory"
                                                    className="w-full"
                                                    isLoading={isLoadingInventories}
                                                    isDisabled={isSubmitting}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-gray-700">
                                                    Quantity <span className="text-red-500">*</span>
                                                    {isWarehouseToWarehouse && item.inventory_id && (
                                                        <span className="text-gray-500"> (Available: {availableQty})</span>
                                                    )}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                                    min="1"
                                                    max={isWarehouseToWarehouse ? availableQty : undefined}
                                                    className="custom-input-style"
                                                    required
                                                    disabled={(isVendorToWarehouse && isSerialized) || isSubmitting}
                                                />
                                            </div>
                                        </div>
                                        {isVendorToWarehouse && isSerialized && (
                                            <div className="mt-4 flex flex-col items-end w-full">
                                                {item.attributes.map((attr, attrIdx) => (
                                                    <div className="border border-gray-300 rounded p-2 mb-2 w-full" key={attrIdx}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="text-sm font-medium">Attributes for Item {idx + 1}, Set {attrIdx + 1}</h4>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingAttribute({
                                                                        itemIdx: idx,
                                                                        attrIdx: attrIdx,
                                                                        fieldName: "",
                                                                        value: "",
                                                                        isEditing: false
                                                                    });
                                                                    setShowAttributePopup(true);
                                                                }}
                                                                className="text-sm text-blue-600 hover:text-blue-800"
                                                                disabled={isSubmitting}
                                                            >
                                                                + Add Custom Attribute
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                            {/* Default Attributes */}
                                                            {['serial_number', 'mac_address', 'ip_address', 'service_tag', 'service_number'].map((key) => (
                                                                <div key={key} className="flex flex-col">
                                                                    <label className="block text-xs text-gray-600 mb-1 capitalize">
                                                                        {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} <span className="text-red-500">*</span>
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={attr[key] || ''}
                                                                        onChange={(e) => handleAttributeChange(idx, attrIdx, key, e.target.value)}
                                                                        className="custom-input-style flex-1"
                                                                        disabled={isSubmitting}
                                                                        required
                                                                    />
                                                                </div>
                                                            ))}
                                                            {/* Custom Attributes */}
                                                            {Object.entries(attr).filter(([key]) => !['serial_number', 'mac_address', 'ip_address', 'service_tag', 'service_number'].includes(key)).map(([key, value]) => (
                                                                <div key={key} className="flex flex-col">
                                                                    <label className="block text-xs text-gray-600 mb-1 capitalize">
                                                                        {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                                    </label>
                                                                    <div className="flex gap-2 items-center">
                                                                        <input
                                                                            type="text"
                                                                            value={value}
                                                                            onChange={(e) => handleAttributeChange(idx, attrIdx, key, e.target.value)}
                                                                            className="custom-input-style flex-1"
                                                                            disabled={isSubmitting}
                                                                        />
                                                                        <div className="flex gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditingAttribute({
                                                                                        itemIdx: idx,
                                                                                        attrIdx: attrIdx,
                                                                                        fieldName: key,
                                                                                        value: value,
                                                                                        isEditing: true
                                                                                    });
                                                                                    setShowAttributePopup(true);
                                                                                }}
                                                                                className="text-blue-600 hover:text-blue-800 p-2"
                                                                                disabled={isSubmitting}
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const newAttr = { ...attr };
                                                                                    delete newAttr[key];
                                                                                    setItemsData(prev =>
                                                                                        prev.map((item, i) =>
                                                                                            i === idx
                                                                                                ? {
                                                                                                    ...item,
                                                                                                    attributes: item.attributes.map((a, j) =>
                                                                                                        j === attrIdx ? newAttr : a
                                                                                                    )
                                                                                                }
                                                                                                : item
                                                                                        )
                                                                                    );
                                                                                }}
                                                                                className="text-red-600 hover:text-red-800 p-2"
                                                                                disabled={isSubmitting}
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                   
                                                    </div>
                                                ))}
                                                <SecondaryBtn
                                                    type="button"
                                                    onClick={() => handleAddAttribute(idx)}
                                                    className="mt-2"
                                                    disabled={isSubmitting}
                                                >
                                                    Add More Attributes
                                                </SecondaryBtn>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="space-y-1 mb-1">
                                        <label className="block text-gray-700">
                                            Select Items <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            isMulti
                                            options={inventoryItems}
                                            value={inventoryItems.filter((opt) => item.item_ids.includes(opt.value))}
                                            onChange={(opts) => handleItemIdsChange(idx, opts)}
                                            styles={customStyles}
                                            placeholder="Select Inventory Items"
                                            className="w-full"
                                            isLoading={isLoadingInventoryItems}
                                            isDisabled={!transferData.source_object_id || isSubmitting}
                                        />
                                        {item.item_ids.length > 0 && (
                                            <div className="mt-2">
                                                <h3 className="text-lg font-medium">Selected Items</h3>
                                                {item.item_ids.map((itemId) => {
                                                    const selectedItem = inventoryItems.find((i) => i.value === itemId);
                                                    return (
                                                        <div key={itemId} className="border border-gray-300 rounded p-2 mb-2">
                                                            <p><strong>{selectedItem?.label}</strong></p>
                                                            {selectedItem?.attributes && Object.keys(selectedItem.attributes).length > 0 && (
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                                    {Object.entries(selectedItem.attributes).map(([key, value]) => (
                                                                        <div key={key}>
                                                                            <label className="block text-gray-600 capitalize">{key.replace("_", " ")}</label>
                                                                            <input
                                                                                type="text"
                                                                                value={value}
                                                                                className="px-2 py-1 border border-gray-300 rounded-md bg-gray-100"
                                                                                disabled
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {itemsData.length > 1 && (
                                    <SecondaryBtn
                                        type="button"
                                        onClick={() => handleRemoveItem(idx)}
                                        className="mt-2"
                                        disabled={isSubmitting}
                                    >
                                        Remove Item
                                    </SecondaryBtn>
                                )}
                            </div>
                        );
                    })}
                    <SecondaryBtn type="button" onClick={handleAddItem} className="mt-2" disabled={isSubmitting}>
                        Add Item
                    </SecondaryBtn>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4 pt-4">
                    <SecondaryBtn type="button" onClick={handleCancel} disabled={isSubmitting}>
                        Cancel
                    </SecondaryBtn>
                    <PrimaryBtn type="button" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Create Transfer"}
                    </PrimaryBtn>
                </div>
            </div>

            {/* Attribute Input Popup */}
            <AttributeInputPopup
                isOpen={showAttributePopup}
                onClose={() => {
                    setShowAttributePopup(false);
                    setEditingAttribute({
                        itemIdx: null,
                        attrIdx: null,
                        fieldName: "",
                        value: "",
                        isEditing: false
                    });
                }}
                onSave={(fieldName, value) => {
                    const { itemIdx, attrIdx, isEditing } = editingAttribute;
                    if (isEditing) {
                        // If editing, first remove the old field
                        const newAttr = { ...itemsData[itemIdx].attributes[attrIdx] };
                        delete newAttr[editingAttribute.fieldName];
                        // Then add the new value
                        newAttr[fieldName] = value;
                        setItemsData(prev =>
                            prev.map((item, i) =>
                                i === itemIdx ? {
                                    ...item,
                                    attributes: item.attributes.map((a, j) =>
                                        j === attrIdx ? newAttr : a
                                    )
                                } : item
                            )
                        );
                    } else {
                        // If adding new, just add the new field
                        handleAttributeChange(itemIdx, attrIdx, fieldName, value);
                    }
                }}
                initialFieldName={editingAttribute.fieldName}
                initialValue={editingAttribute.value}
                isEditing={editingAttribute.isEditing}
            />
        </div>
    );
};

export default TransferFormPage;