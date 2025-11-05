import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import api from "../../utils/api";
import Select from "react-select";
import toast from "react-hot-toast";
import Spinner from "../Common/Spinner";
import SecondaryBtn from "../Common/SecondaryBtn";

const RepairFormPopup = ({
    onClose,
    onSubmit,
    submitting,
    repair = null,
}) => {
    // Form state
    const [formData, setFormData] = useState({
        id: null,
        vendor: null,
        status: "PENDING",
        information: { notes: "", tracking_number: "", reference_number: "" },
    });

    // Inventory and vendor state
    const [inventoryItems, setInventoryItems] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);

    // Get user from Redux store
    const user = useSelector((state) => state.user.user);

    // Predefined status options for the dropdown
    const statusOptions = [
        { value: "PENDING", label: "Pending" },
        { value: "APPROVED", label: "Approved" },
        { value: "REPAIRED", label: "Repaired" },
    ];

    // Determine if fields should be disabled
    const isFieldsDisabled = (formData.status === "APPROVED" || formData.status === "REPAIRED") && user?.role !== "Admin";
    const isStatusDisabled = formData.status === "REPAIRED" && user?.role !== "Admin";

    // Status options for warehouse manager
    const warehouseManagerStatusOptions = [
        { value: "APPROVED", label: "Approved" },
        { value: "REPAIRED", label: "Repaired" },
    ];

    // Fetch inventory items and vendors on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [inventoryResponse, vendorsResponse] = await Promise.all([
                    api.get("/common/api/inventory/?all=true"),
                    api.get("/common/api/vendors/?all=true"),
                ]);
                setInventoryItems(inventoryResponse.data);
                setVendors(vendorsResponse.data);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load inventory or vendors");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Process repair data when editing
    useEffect(() => {
        if (!repair) {
            resetForm();
            return;
        }

        setFormData({
            id: repair.id,
            vendor: repair.vendor || null,
            status: repair.status,
            information: {
                notes: repair.information?.notes || "",
                tracking_number: repair.information?.tracking_number || "",
                reference_number: repair.information?.reference_number || "",
            },
        });

        // Process selected inventory items
        if (repair.inventory_items_details) {
            const processedItems = repair.inventory_items_details.map((item) => ({
                id: item.id,
                inventory_id: item.inventory_id,
                inventory_name: item.inventory_name,
                warehouse_name: item.warehouse_name,
                warehouse: item.warehouse,
                attributes: item.attributes,
            }));
            setSelectedItems(processedItems);
        }
    }, [repair]);

    const resetForm = () => {
        setFormData({
            id: null,
            vendor: null,
            status: "PENDING",
            information: { notes: "", tracking_number: "", reference_number: "" },
        });
        setSelectedItems([]);
        setSearchQuery("");
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (["notes", "tracking_number", "reference_number"].includes(name)) {
            setFormData((prev) => ({
                ...prev,
                information: { ...prev.information, [name]: value },
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleVendorChange = (selectedOption) => {
        setFormData((prev) => ({
            ...prev,
            vendor: selectedOption ? selectedOption.value : null,
        }));
    };

    const handleStatusChange = (selectedOption) => {
        setFormData((prev) => ({
            ...prev,
            status: selectedOption ? selectedOption.value : "PENDING",
        }));
    };

    // Calculate available quantity for non-serialized items (remaining after selection)
    const getAvailableQuantityForGroup = useMemo(() => {
        return (inventoryId, warehouseId) => {
            const inventory = inventoryItems.find((inv) => inv.id === inventoryId);
            if (!inventory) return 0;

            // Get all available items for this inventory and warehouse
            const availableItems = inventory.items.filter(
                (item) =>
                    item.warehouse === warehouseId &&
                    item.status === "available" &&
                    Object.keys(item.attributes || {}).length === 0
            );

            // Get items that are in repair status but belong to this repair
            const itemsInThisRepair = inventory.items.filter(
                (item) =>
                    item.warehouse === warehouseId &&
                    item.status === "in_repair" &&
                    Object.keys(item.attributes || {}).length === 0 &&
                    selectedItems.some(selected => selected.id === item.id)
            );

            // Total available = available items + items already in this repair
            const totalAvailable = availableItems.length + itemsInThisRepair.length;

            // Count how many are currently selected in this repair
            const selectedCount = selectedItems.filter(
                (item) =>
                    item.inventory_id === inventoryId &&
                    item.warehouse === warehouseId &&
                    Object.keys(item.attributes || {}).length === 0
            ).length;

            return totalAvailable - selectedCount;
        };
    }, [inventoryItems, selectedItems]);

    // NEW: Get the true total available for selection (for max and label)
    const getTotalAvailableForGroup = (inventoryId, warehouseId) => {
        const inventory = inventoryItems.find((inv) => inv.id === inventoryId);
        if (!inventory) return 0;
        const availableItems = inventory.items.filter(
            (item) =>
                item.warehouse === warehouseId &&
                item.status === "available" &&
                Object.keys(item.attributes || {}).length === 0
        );
        const itemsInThisRepair = inventory.items.filter(
            (item) =>
                item.warehouse === warehouseId &&
                item.status === "in_repair" &&
                Object.keys(item.attributes || {}).length === 0 &&
                selectedItems.some(selected => selected.id === item.id)
        );
        return availableItems.length + itemsInThisRepair.length;
    };

    // Get currently selected quantity for a group
    const getSelectedQuantityForGroup = (inventoryId, warehouseId) => {
        return selectedItems.filter(
            (item) =>
                item.inventory_id === inventoryId &&
                item.warehouse === warehouseId &&
                Object.keys(item.attributes || {}).length === 0
        ).length;
    };

    const handleItemQuantityChange = (inventoryId, warehouseId, quantity) => {
        if (isFieldsDisabled) return; // Prevent changes when fields disabled

        const inventory = inventoryItems.find((inv) => inv.id === inventoryId);
        if (!inventory) return;

        // Get available items and items already in this repair
        const availableItems = inventory.items.filter(
            (item) =>
                item.warehouse === warehouseId &&
                item.status === "available" &&
                Object.keys(item.attributes || {}).length === 0
        );

        const itemsInThisRepair = inventory.items.filter(
            (item) =>
                item.warehouse === warehouseId &&
                item.status === "in_repair" &&
                Object.keys(item.attributes || {}).length === 0 &&
                selectedItems.some(selected => selected.id === item.id)
        );

        // Combine available items and items already in this repair
        const allSelectableItems = [...availableItems, ...itemsInThisRepair];

        // Remove existing non-serialized items for this group
        setSelectedItems((prev) =>
            prev.filter(
                (item) =>
                    !(item.inventory_id === inventoryId && 
                      item.warehouse === warehouseId && 
                      Object.keys(item.attributes || {}).length === 0)
            )
        );

        // Add new items based on quantity
        if (quantity > 0 && quantity <= allSelectableItems.length) {
            const newItems = allSelectableItems.slice(0, quantity).map((item) => ({
                id: item.id,
                inventory_id: item.inventory_id,
                inventory_name: item.inventory_name,
                warehouse_name: item.warehouse_name,
                warehouse: item.warehouse,
                attributes: item.attributes,
            }));
            setSelectedItems((prev) => [...prev, ...newItems]);
        }
    };

    const handleManualItemToggle = (item) => {
        if (isFieldsDisabled) return; // Prevent changes when fields disabled

        if (selectedItems.some((selected) => selected.id === item.id)) {
            setSelectedItems((prev) => prev.filter((selected) => selected.id !== item.id));
        } else {
            setSelectedItems((prev) => [
                ...prev,
                {
                    id: item.id,
                    inventory_id: item.inventory_id,
                    inventory_name: item.inventory_name,
                    warehouse_name: item.warehouse_name,
                    warehouse: item.warehouse,
                    attributes: item.attributes,
                },
            ]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (selectedItems.length === 0) {
            toast.error("At least one inventory item is required");
            return;
        }

        const payload = {
            ...formData,
            inventory_items: selectedItems.map((item) => item.id),
        };

        onSubmit(payload);
    };

    // Prepare options for react-select
    const vendorOptions = vendors.map((vendor) => ({
        value: vendor.id,
        label: vendor.name,
    }));

    // Filter inventory items based on search query and exclude items already in other repairs
    const filteredItems = useMemo(() => {
        return inventoryItems.reduce((acc, inv) => {
            inv.locations.forEach((loc) => {
                const items = inv.items.filter((item) => item.warehouse === loc.warehouse);
                
                // Filter out items that are already in other repairs (unless they're in this repair)
                const availableItems = items.filter((item) => {
                    // If item is in repair status but not in this repair, exclude it
                    if (item.status === "in_repair" && formData.id) {
                        // Check if this item belongs to the current repair being edited
                        const isInCurrentRepair = selectedItems.some(selected => selected.id === item.id);
                        return isInCurrentRepair;
                    }
                    return item.status === "available";
                });

                const filteredItems = availableItems.filter((item) => {
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    const attributesStr = JSON.stringify(item.attributes || {}).toLowerCase();
                    return (
                        inv.name.toLowerCase().includes(query) ||
                        inv.upc.toLowerCase().includes(query) ||
                        loc.warehouse_name.toLowerCase().includes(query) ||
                        attributesStr.includes(query) ||
                        item.id.toString().includes(query) ||
                        item.inventory_name.toLowerCase().includes(query) ||
                        item.inventory_upc.toLowerCase().includes(query)
                    );
                });

                if (filteredItems.length > 0) {
                    const key = `${inv.id}-${loc.warehouse}`;
                    acc[key] = {
                        inventory_id: inv.id,
                        inventory_name: inv.name,
                        warehouse_id: loc.warehouse,
                        warehouse_name: loc.warehouse_name,
                        available_quantity: filteredItems.filter((i) => i.status === "available").length,
                        items: filteredItems,
                        serial_number_required: inv.serial_number_required,
                    };
                }
            });
            return acc;
        }, {});
    }, [inventoryItems, searchQuery, selectedItems, formData.id]);

    const isEditing = !!formData.id;

    return (
        <div className="transform transition-all w-full lg:w-[70vw]" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-lg">Repair Ticket Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-gray-700 font-medium">Vendor</label>
                            <Select
                                name="vendor"
                                value={vendorOptions.find((option) => option.value === formData.vendor) || null}
                                onChange={handleVendorChange}
                                options={vendorOptions}
                                placeholder="Select Vendor"
                                isClearable
                                isDisabled={isFieldsDisabled}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-gray-700 font-medium">Tracking Number</label>
                            <input
                                type="text"
                                name="tracking_number"
                                value={formData.information.tracking_number || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                disabled={isFieldsDisabled}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-gray-700 font-medium">Reference Number</label>
                            <input
                                type="text"
                                name="reference_number"
                                value={formData.information.reference_number || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                disabled={isFieldsDisabled}
                            />
                        </div>
                        {/* Conditionally render Status field based on user role */}
                        {isEditing && (user?.role === "Admin" || (user?.role === "Warehouse Manager" && formData.status === "APPROVED")) && (
                            <div className="space-y-1">
                                <label className="block text-gray-700 font-medium">Status</label>
                                <Select
                                    name="status"
                                    value={
                                        (user?.role === "Admin" ? statusOptions : warehouseManagerStatusOptions).find(
                                            (option) => option.value === formData.status
                                        ) || null
                                    }
                                    onChange={handleStatusChange}
                                    options={user?.role === "Admin" ? statusOptions : warehouseManagerStatusOptions}
                                    placeholder="Select Status"
                                    isDisabled={isStatusDisabled}
                                />
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="block text-gray-700 font-medium">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.information.notes || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                rows={4}
                                disabled={isFieldsDisabled}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-lg">Inventory Items</h3>

                    {!isFieldsDisabled && (
                        <>
                            <div className="space-y-1">
                                <label className="block text-gray-700 font-medium">Search Items</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, UPC, warehouse, attributes..."
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                    disabled={isFieldsDisabled}
                                />
                            </div>

                            {loading && <Spinner />}

                            {!loading && (
                                <div className="space-y-4 max-h-80 overflow-auto">
                                    {Object.values(filteredItems).map((group) => {
                                        const selectedQuantity = getSelectedQuantityForGroup(group.inventory_id, group.warehouse_id);
                                        const availableQuantity = getAvailableQuantityForGroup(group.inventory_id, group.warehouse_id);
                                        const hasNonSerializedItems = group.items.some((item) => Object.keys(item.attributes || {}).length === 0);
                                        const hasSerializedItems = group.items.some((item) => Object.keys(item.attributes || {}).length > 0);

                                        return (
                                            <div key={`${group.inventory_id}-${group.warehouse_id}`} className="border border-gray-200 p-3 rounded">
                                                <h4 className="font-medium">
                                                    {group.inventory_name} at {group.warehouse_name} 
                                                    {hasNonSerializedItems && (
                                                        <span className="text-sm text-gray-600 ml-2">
                                                            (Available: {availableQuantity}, Selected: {selectedQuantity})
                                                        </span>
                                                    )}
                                                </h4>

                                                {/* Non-serialized items quantity selector */}
                                                {hasNonSerializedItems && (
                                                    <div className="mt-2">
                                                        <label className="block text-gray-700 font-medium">Quantity (Non-serialized items)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={getTotalAvailableForGroup(group.inventory_id, group.warehouse_id)}
                                                            value={selectedQuantity}
                                                            onChange={(e) =>
                                                                handleItemQuantityChange(
                                                                    group.inventory_id,
                                                                    group.warehouse_id,
                                                                    parseInt(e.target.value) || 0
                                                                )
                                                            }
                                                            className="w-20 border border-gray-300 rounded-md px-3 py-2"
                                                            disabled={isFieldsDisabled}
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {getTotalAvailableForGroup(group.inventory_id, group.warehouse_id)} items available
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Serialized items individual selection */}
                                                {hasSerializedItems && (
                                                    <div className="mt-2 space-y-2 max-h-40 overflow-auto">
                                                        <label className="block text-gray-700 font-medium">Serialized Items (Select individually)</label>
                                                        {group.items
                                                            .filter((item) => Object.keys(item.attributes || {}).length > 0)
                                                            .map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    className="flex items-center space-x-2 p-2 bg-gray-50 rounded"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedItems.some((selected) => selected.id === item.id)}
                                                                        onChange={() => handleManualItemToggle(item)}
                                                                        disabled={isFieldsDisabled}
                                                                    />
                                                                    <span>
                                                                        {item.inventory_name} (ID: {item.id})
                                                                        {Object.keys(item.attributes || {}).length > 0 && (
                                                                            <div className="flex flex-col gap-1 mt-1">
                                                                                {Object.entries(item.attributes).map(([key, value]) => (
                                                                                    <div key={key} className="text-sm text-gray-600">
                                                                                        <span className="font-medium">
                                                                                            {key
                                                                                                .replace(/_/g, " ")
                                                                                                .split(" ")
                                                                                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                                                                                .join(" ")}:
                                                                                        </span>{" "}
                                                                                        {value}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {selectedItems.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <h4 className="font-medium">Selected Items ({selectedItems.length})</h4>
                            <div className="space-y-2 max-h-40 overflow-auto">
                                {selectedItems.map((item) => (
                                    <div key={item.id} className="p-2 bg-gray-50 rounded flex justify-between items-center">
                                        <span>
                                            {item.inventory_name} at {item.warehouse_name}
                                            {Object.keys(item.attributes || {}).length > 0 && (
                                                <div className="flex flex-col gap-1 mt-1">
                                                    {Object.entries(item.attributes).map(([key, value]) => (
                                                        <div key={key} className="text-sm text-gray-600">
                                                            <span className="font-medium">
                                                                {key
                                                                    .replace(/_/g, " ")
                                                                    .split(" ")
                                                                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                                                    .join(" ")}:
                                                            </span>{" "}
                                                            {value}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </span>
                                        {!isFieldsDisabled && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedItems((prev) => prev.filter((i) => i.id !== item.id))}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <SecondaryBtn
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </SecondaryBtn>
                    <PrimaryBtn type="submit" disabled={submitting}>
                        {isEditing ? "Update Repair Ticket" : "Create Repair Ticket"}
                    </PrimaryBtn>
                </div>
            </form>
        </div>
    );
};

export default RepairFormPopup;