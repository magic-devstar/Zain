import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Calendar, MapPin, PlusCircle, Trash2 } from 'lucide-react';
import Select from 'react-select';
import { toast } from 'react-hot-toast';
import ImageUploaderComponent from '../Common/ImageUploaderComponent';
import PrimaryBtn from '../Common/PrimaryBtn';
import SecondaryBtn from '../Common/SecondaryBtn';
import api from '../../utils/api';
import { useSelector } from 'react-redux';
import SignatureCanvas from 'react-signature-canvas';
import PhoneNumberInput from '../Common/PhoneNumberInput';
import { UsedItemsInvoiceButton } from '../../Pages/common/tickets/UsedItemsInvoiceButton ';

function InventorySelectionPopup({ isOpen, onClose, availableItems, selectedItems, setSelectedItems, usedItems, setUsedItems, defectiveItems, setDefectiveItems, bulkGroups, setBulkGroups, isTechnician, isWarehouseTechnician, initialData }) {
    const [tempSelectedItems, setTempSelectedItems] = useState(selectedItems);
    const [tempUsedItems, setTempUsedItems] = useState(usedItems);
    const [tempDefectiveItems, setTempDefectiveItems] = useState([]);
    const [bulkInventoryOption, setBulkInventoryOption] = useState(null);
    const [bulkQuantity, setBulkQuantity] = useState(1);
    const user = useSelector((state) => state.user.user);

    // Initialize tempDefectiveItems when component mounts or when defectiveItems changes
    useEffect(() => {
        if (Array.isArray(defectiveItems)) {
            setTempDefectiveItems(defectiveItems);
        } else if (initialData?.defective_items && typeof initialData.defective_items === 'object') {
            const defectiveItemsArray = Object.keys(initialData.defective_items)
                .filter(id => initialData.defective_items[id])
                .map(Number);
            setTempDefectiveItems(defectiveItemsArray);
        } else {
            setTempDefectiveItems([]);
        }
    }, [defectiveItems, initialData]);

    // Load existing items if editing (similar to assembly ticket)
    useEffect(() => {
        if (initialData?.items && initialData.items.length > 0) {
            const serialItems = [];
            const bulkMap = {};
            
            initialData.items.forEach(item => {
                if (item.serial_number_required || (item.attributes && Object.keys(item.attributes).length > 0)) {
                    // Serialized item
                    serialItems.push({
                        item_id: item.id,
                        inventory_id: item.inventory_id,
                        inventory_name: item.inventory_name,
                        warehouse_id: item.warehouse,
                        warehouse_name: item.warehouse_name,
                        status: item.status,
                        attributes: item.attributes || {}
                    });
                } else {
                    // Non-serialized item - group by inventory_id-warehouse
                    const key = `${item.inventory_id}-${item.warehouse}`;
                    if (!bulkMap[key]) {
                        bulkMap[key] = {
                            key,
                            inventory_id: item.inventory_id,
                            inventory_name: item.inventory_name,
                            warehouse_id: item.warehouse,
                            warehouse_name: item.warehouse_name,
                            quantity: 0,
                            used_qty: 0,
                            defective_qty: 0,
                            item_ids: [],
                        };
                    }
                    const isUsed = initialData.item_usages && initialData.item_usages[item.id];
                    const isDefective = initialData.defective_items && initialData.defective_items[item.id];

                    bulkMap[key].quantity += 1;
                    if (isUsed) {
                        bulkMap[key].used_qty += 1;
                    }
                    if (isDefective) {
                        bulkMap[key].defective_qty += 1;
                    }
                    bulkMap[key].item_ids.push(item.id);
                }
            });
            
            setTempSelectedItems(serialItems);
            setBulkGroups(Object.values(bulkMap));
        }
    }, [initialData]);

    // Build bulk inventory options for non-serialized items
    const bulkInventoryOptions = useMemo(() => {
        const options = [];
        const groupedItems = {};

        // Get IDs of items already in the current ticket
        const ticketItemIds = initialData?.items ? initialData.items.map(item => item.id) : [];

        (Array.isArray(availableItems) ? availableItems : []).forEach(item => {
            // Check if item is non-serialized (no serial_number_required or no attributes)
            const isNonSerialized = !item.serial_number_required && 
                (!item.attributes || Object.keys(item.attributes).length === 0);

            if (isNonSerialized) {
                const key = `${item.inventory_id}-${item.warehouse}`;
                if (!groupedItems[key]) {
                    groupedItems[key] = {
                        value: key,
                        inventory_id: item.inventory_id,
                        inventory_name: item.inventory_name,
                        warehouse_id: item.warehouse,
                        warehouse_name: item.warehouse_name,
                        label: `${item.inventory_name} (${item.warehouse_name})`,
                        items: [],
                        total_available: 0
                    };
                }
                groupedItems[key].items.push(item);
                
                // Count available items (including items already in this ticket)
                if (item.status === 'available' || (item.status === 'in_use' && ticketItemIds.includes(item.id))) {
                    groupedItems[key].total_available++;
                }
            }
        });

        return Object.values(groupedItems).filter(group => group.total_available > 0);
    }, [availableItems, initialData]);

    const addItem = useCallback(() => {
        setTempSelectedItems(prev => [{
            item_id: null,
            inventory_id: null,
            inventory_name: '',
            warehouse_id: null,
            warehouse_name: '',
            status: 'available',
            attributes: {}
        }, ...prev]);
    }, []);

    // Bulk group management functions
    const handleAddBulkGroup = useCallback(() => {
        if (!bulkInventoryOption) {
            toast.error("Select inventory");
            return;
        }
        if (bulkQuantity === "" || Number(bulkQuantity) < 1) {
            toast.error("Quantity must be at least 1");
            return;
        }
        
        const selectedOption = bulkInventoryOptions.find(opt => opt.value === bulkInventoryOption.value);
        if (!selectedOption) {
            toast.error("Selected inventory not found");
            return;
        }
        
        const existing = bulkGroups.find(g => g.key === bulkInventoryOption.value);
        const existingQty = existing ? Number(existing.quantity) : 0;
        
        // Get IDs of items already in the current ticket for this inventory/warehouse
        const ticketItemIds = initialData?.items ? initialData.items.map(item => item.id) : [];
        const existingInTicket = availableItems.filter(item => 
            item.inventory_id === selectedOption.inventory_id && 
            item.warehouse === selectedOption.warehouse_id &&
            ticketItemIds.includes(item.id)
        ).length;
        
        const allowedRemaining = selectedOption.total_available - existingQty + existingInTicket;
        
        if (Number(bulkQuantity) > allowedRemaining) {
            toast.error(`Only ${allowedRemaining} items available for selected inventory.`);
            return;
        }
        
        setBulkGroups(prev => {
            const existingIndex = prev.findIndex(g => g.key === bulkInventoryOption.value);
            if (existingIndex !== -1) {
                const updated = [...prev];
                const prevQty = Number(updated[existingIndex].quantity);
                updated[existingIndex].quantity = prevQty + Number(bulkQuantity);
                return updated;
            }
            return [
                ...prev,
                {
                    key: bulkInventoryOption.value,
                    inventory_id: selectedOption.inventory_id,
                    inventory_name: selectedOption.inventory_name,
                    warehouse_id: selectedOption.warehouse_id,
                    warehouse_name: selectedOption.warehouse_name,
                    quantity: Number(bulkQuantity),
                    used_qty: 0,
                    defective_qty: 0,
                    item_ids: [], // will be filled on submit
                },
            ];
        });
        setBulkInventoryOption(null);
        setBulkQuantity(1);
    }, [bulkInventoryOption, bulkQuantity, bulkGroups, bulkInventoryOptions]);

    const handleRemoveBulkGroup = useCallback((key) => {
        setBulkGroups(prev => prev.filter(g => g.key !== key));
    }, []);

    const updateBulkGroupQuantity = useCallback((key, value) => {
        setBulkGroups(prev => prev.map(g => {
            if (g.key !== key) return g;
            if (value === "") {
                return { ...g, quantity: "" };
            }
            let newQty = parseInt(value, 10);
            if (isNaN(newQty) || newQty < 0) newQty = 0;
            
            // Find the selected option to check available quantity
            const selectedOption = bulkInventoryOptions.find(opt => opt.value === key);
            const maxAvailable = selectedOption ? selectedOption.total_available : 0;
            
            // Get IDs of items already in the current ticket for this inventory/warehouse
            const ticketItemIds = initialData?.items ? initialData.items.map(item => item.id) : [];
            const existingInTicket = availableItems.filter(item => 
                item.inventory_id === selectedOption?.inventory_id && 
                item.warehouse === selectedOption?.warehouse_id &&
                ticketItemIds.includes(item.id)
            ).length;
            
            const adjustedMaxAvailable = maxAvailable + existingInTicket;
            if (newQty > adjustedMaxAvailable) newQty = adjustedMaxAvailable;
            
            // Ensure used/defective do not exceed newQty
            const newUsed = Math.min(g.used_qty, newQty);
            const remainingForDef = newQty - newUsed;
            const newDef = Math.min(g.defective_qty, remainingForDef);
            
            return { ...g, quantity: newQty, used_qty: newUsed, defective_qty: newDef };
        }));
    }, [bulkInventoryOptions]);

    const updateBulkGroupCounts = useCallback((key, field, value) => {
        setBulkGroups(prev => prev.map(g => {
            if (g.key !== key) return g;
            if (value === "") {
                return { ...g, [field]: "" };
            }
            let newVal = parseInt(value, 10);
            if (isNaN(newVal) || newVal < 0) newVal = 0;
            const otherField = field === 'used_qty' ? 'defective_qty' : 'used_qty';
            const maxAllowed = g.quantity - g[otherField];
            if (newVal > maxAllowed) newVal = maxAllowed;
            return { ...g, [field]: newVal };
        }));
    }, []);

    const removeItem = useCallback((index) => {
        setTempSelectedItems(prev => {
            const itemToRemove = prev[index];
            if (initialData?.status === "CLOSED" && itemToRemove.item_id && tempUsedItems.includes(itemToRemove.item_id)) {
                toast.error("Cannot remove used items from a closed ticket.");
                return prev;
            }
            
            // For serialized items, remove specific item
            const itemIdToRemove = itemToRemove.item_id;
            setTempUsedItems(prevUsed => prevUsed.filter(id => id !== itemIdToRemove));
            setTempDefectiveItems(prevDefective => prevDefective.filter(id => id !== itemIdToRemove));
            
            return prev.filter((_, i) => i !== index);
        });
    }, [initialData?.status, tempUsedItems]);

    const updateItem = useCallback((index, field, value) => {
        setTempSelectedItems(prev => {
            const updatedItems = [...prev];
            if (field === 'item') {
                const selectedItem = availableItems.find(item => item.id === value);
                if (selectedItem) {
                    const prevItemId = updatedItems[index].item_id;
                    updatedItems[index] = {
                        item_id: selectedItem.id,
                        inventory_id: selectedItem.inventory_id,
                        inventory_name: selectedItem.inventory_name,
                        warehouse_id: selectedItem.warehouse,
                        warehouse_name: selectedItem.warehouse_name,
                        status: selectedItem.status,
                        attributes: selectedItem.attributes || {},
                        is_non_serialized: false,
                        quantity: 1
                    };
                    if (prevItemId) {
                        if (tempUsedItems.includes(prevItemId)) {
                            setTempUsedItems(prevUsed => prevUsed.filter(id => id !== prevItemId));
                        }
                        setTempDefectiveItems(prevDefective => prevDefective.filter(id => id !== prevItemId));
                    }
                }
            }
            return updatedItems;
        });
    }, [availableItems, tempUsedItems]);

    const handleUsedItemChange = useCallback((itemId, isChecked) => {
        setTempUsedItems(prev => {
            if (isChecked) {
                // If marking as used, remove from defective items
                setTempDefectiveItems(prevDefective => prevDefective.filter(id => id !== itemId));
                return [...prev, itemId];
            } else {
                return prev.filter(id => id !== itemId);
            }
        });
    }, []);

    const handleDefectiveItemChange = useCallback((itemId, isChecked) => {
        setTempDefectiveItems(prev => {
            if (isChecked) {
                // If marking as defective, remove from used items
                setTempUsedItems(prevUsed => prevUsed.filter(id => id !== itemId));
                return [...prev, itemId];
            } else {
                return prev.filter(id => id !== itemId);
            }
        });
    }, []);



    const getFilteredItemOptions = useCallback((currentIndex) => {
        const selectedItemIds = tempSelectedItems
            .filter((_, index) => index !== currentIndex)
            .map(item => item.item_id)
            .filter(Boolean);

        // Get IDs of items associated with the current ticket
        const ticketItemIds = (initialData?.items || []).map(item => item.id);

        return (Array.isArray(availableItems) ? availableItems : [])
            .filter(item =>
                !selectedItemIds.includes(item.id) && // Exclude already selected items
                (
                    item.status === 'available' || // Include all available items
                    ((item.status === 'in_use' || item.status === 'consumed') && ticketItemIds.includes(item.id)) // Include in_use or consumed items only if they are in the current ticket
                ) &&
                // Only show serialized items in this dropdown
                (item.serial_number_required || (item.attributes && Object.keys(item.attributes).length > 0))
            )
            .map(item => ({
                value: item.id,
                label: `${item.inventory_name} (${item.warehouse_name}) - ${Object.entries(item.attributes || {})
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ') || 'No attributes'}`
            }));
    }, [availableItems, tempSelectedItems, initialData]);

    const handleSave = () => {
        setSelectedItems(tempSelectedItems);
        setUsedItems(tempUsedItems);
        setDefectiveItems(tempDefectiveItems);
        setBulkGroups(bulkGroups);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white p-3 rounded-lg shadow-lg w-[95vw] h-[90vh] overflow-auto">
                <h2 className="text-lg font-semibold mb-3">Select Inventory Items</h2>
                
                {/* Non-Serialized Items Section */}
                {!isTechnician && !isWarehouseTechnician && initialData?.status !== "CLOSED" && (
                    <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <h3 className="text-base font-medium mb-2">Non-Serialized Items (Quantity Selection)</h3>
                        
                        {/* Add Non-Serialized Item */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Select Item</label>
                                <Select
                                    value={bulkInventoryOption}
                                    onChange={setBulkInventoryOption}
                                    options={bulkInventoryOptions}
                                    placeholder="Select inventory..."
                                    className="w-full"
                                />
                                {bulkInventoryOption && (
                                    <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                        <p className="text-xs text-blue-800">
                                            <span className="font-medium">Available:</span> {bulkInventoryOption.total_available} items
                                        </p>
                                        {bulkGroups.find(g => g.key === bulkInventoryOption.value) && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                <span className="font-medium">Already assigned:</span> {bulkGroups.find(g => g.key === bulkInventoryOption.value).quantity} items
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={bulkInventoryOption ? bulkInventoryOption.total_available : undefined}
                                    value={bulkQuantity}
                                    onChange={(e) => setBulkQuantity(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                                {bulkInventoryOption && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Max: {bulkInventoryOption.total_available} items
                                    </p>
                                )}
                            </div>
                            <div className="flex items-end">
                                <PrimaryBtn type="button" onClick={handleAddBulkGroup} className="text-xs px-2 py-1">Add</PrimaryBtn>
                            </div>
                        </div>

                        {/* Display Bulk Groups */}
                        {bulkGroups.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700">Assigned Non-Serialized Items:</h4>
                                {bulkGroups.map((group) => (
                                    <div key={group.key} className="p-2 border border-gray-200 rounded-lg bg-white">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h5 className="text-sm font-medium">{group.inventory_name}</h5>
                                                <p className="text-xs text-gray-600">Warehouse: {group.warehouse_name}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveBulkGroup(group.key)}
                                                className="text-red-600 hover:text-red-800 p-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Total Quantity</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={group.quantity}
                                                    onChange={(e) => updateBulkGroupQuantity(group.key, e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Used</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={group.quantity}
                                                    value={group.used_qty}
                                                    onChange={(e) => updateBulkGroupCounts(group.key, 'used_qty', e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Defective</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={group.quantity}
                                                    value={group.defective_qty}
                                                    onChange={(e) => updateBulkGroupCounts(group.key, 'defective_qty', e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Serialized Items Section */}
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-medium text-gray-700">Serialized Items (Individual Selection)</span>
                    <div className="flex items-center gap-4">
                        {initialData?.status !== "CLOSED" && (
                            <>
                                {!isTechnician && !isWarehouseTechnician && (
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="flex items-center text-primary cursor-pointer my-2 text-sm"
                                    >
                                        <PlusCircle size={16} className="mr-1" />
                                        Add Serialized Item
                                    </button>
                                )}
                            </>
                        )}
                        {tempUsedItems.length > 0 && (
                            <UsedItemsInvoiceButton
                                ticketData={initialData}
                                usedItems={tempUsedItems}
                                availableItems={availableItems}
                            />
                        )}
                    </div>
                </div>
                
                <div className="space-y-2">
                    {tempSelectedItems.map((item, idx) => {
                        const isUsed = item.item_id && tempUsedItems.includes(item.item_id);
                        const isDefective = item.item_id && tempDefectiveItems.includes(item.item_id);
                        const isDisabled =
                            (
                                ["CLOSED", "PARTIALLY CLOSED", "PENDING APPROVAL"].includes(initialData?.status) &&
                                ["Technician", "Warehouse Technician"].includes(user?.role)
                            ) ||
                            ["Service Customer", "Vending Customer"].includes(user?.role);

                        const removeItemDisabled = (isTechnician || isWarehouseTechnician) || (initialData?.status === "CLOSED" && (isUsed || isDefective));

                        return (
                            <div key={idx} className="space-y-1 border-b pb-2">
                                {!isTechnician && !isWarehouseTechnician && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Serialized Item</label>
                                            <Select
                                                options={getFilteredItemOptions(idx)}
                                                value={getFilteredItemOptions(idx).find(opt => opt.value === item.item_id) || null}
                                                onChange={selectedOption => updateItem(idx, 'item', selectedOption?.value)}
                                                className="w-full"
                                                classNamePrefix="react-select"
                                                placeholder="Select serialized item..."
                                                isClearable
                                                isDisabled={isTechnician || isWarehouseTechnician}
                                            />
                                        </div>
                                        {(initialData || tempSelectedItems.length > 1) && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="text-red-500 hover:text-red-700 cursor-pointer p-1 mt-5"
                                                title="Remove Item"
                                                disabled={removeItemDisabled}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                )}
                                
                                {item.item_id && (
                                    <div className="text-xs text-gray-600">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isUsed}
                                                    onChange={e => handleUsedItemChange(item.item_id, e.target.checked)}
                                                    className="form-checkbox h-4 w-4 text-primary"
                                                    disabled={isDisabled || isDefective}
                                                />
                                                <span>Used</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isDefective}
                                                    onChange={e => handleDefectiveItemChange(item.item_id, e.target.checked)}
                                                    className="form-checkbox h-4 w-4 text-red-500"
                                                    disabled={isDisabled || isUsed}
                                                />
                                                <span>Defective</span>
                                            </div>
                                        </div>
                                        <p className="text-xs">Item Name: {item.inventory_name}</p>
                                        <p className="text-xs">Warehouse: {item.warehouse_name}</p>
                                        {Object.keys(item.attributes || {}).length > 0 && (
                                            <div className="grid grid-cols-2 gap-1 mt-1">
                                                {Object.entries(item.attributes).map(([key, value]) => (
                                                    <div key={key} className="text-xs text-gray-600">
                                                        <span className="font-medium">
                                                            {key
                                                                .replace(/_/g, ' ')
                                                                .split(' ')
                                                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                                .join(' ')}:
                                                        </span>{' '}
                                                        {value}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <SecondaryBtn type="button" onClick={onClose} className="text-xs px-2 py-1">
                        Cancel
                    </SecondaryBtn>
                    {initialData?.status !== "CLOSED" && (
                        <PrimaryBtn type="button" onClick={handleSave} className="text-xs px-2 py-1">
                            Save Selection
                        </PrimaryBtn>
                    )}
                </div>
            </div>
        </div>
    );
}


function TicketFormPopup({ onClose, onSubmit, initialData = null }) {
    const origin = import.meta.env.VITE_BACKEND_URL;
    
    // Local storage key for saving ticket form data
    const STORAGE_KEY = 'ticket_form_draft';
    
    const [title, setTitle] = useState('');
    const [representativeName, setRepresentativeName] = useState('');
    const [representativePhone, setRepresentativePhone] = useState('');
    const [flagged, setFlagged] = useState(false);
    const [paid, setPaid] = useState(false);
    const [payable, setPayable] = useState(false);
    const [hasPaidSignature, setHasPaidSignature] = useState(false);
    const [hasCustomerSignature, setHasCustomerSignature] = useState(false);
    const [description, setDescription] = useState('');
    const [ticketNotes, setTicketNotes] = useState('');
    const [deadline, setDeadline] = useState('');
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [availableItems, setAvailableItems] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [assignTo, setAssignTo] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedItems, setSelectedItems] = useState(() => {
        if (Array.isArray(initialData?.items) && initialData.items.length > 0) {
            return initialData.items.map(item => ({
                item_id: item.id,
                inventory_id: item.inventory_id,
                inventory_name: item.inventory_name,
                warehouse_id: item.warehouse,
                warehouse_name: item.warehouse_name,
                status: item.status,
                attributes: item.attributes || {}
            }));
        }
        return [];
    });
    const [charges, setCharges] = useState(() => {
        if (Array.isArray(initialData?.charges) && initialData.charges.length > 0) {
            return initialData.charges.map(charge => ({
                id: charge.id || Math.random().toString(36).substring(2),
                amount: charge.amount,
                description: charge.description
            }));
        }
        return [];
    });
    const [signatureBtnIsOpen, setSignatureBtnIsOpen] = useState(false);
    const [signatureModalIsOpen, setSignatureModalIsOpen] = useState(false);
    const [signatureType, setSignatureType] = useState('');
    const [signatureDataUrl, setSignatureDataUrl] = useState(null);
    const user = useSelector((state) => state.user.user);
    const isTechnician = user?.role === "Technician";
    const isWarehouseTechnician = user?.role === "Warehouse Technician";
    const isServiceCustomer = user?.role === "Service Customer";
    const isVendingCustomer = user?.role === "Vending Customer";
    const isEmployee = user?.role === "Employee";
    const isAdmin = user?.role === "Admin";
    const isManager = user?.role === "Manager";
    const [status, setStatus] = useState(initialData?.status || "OPEN");
    const signatureCanvasRef = useRef(null);
    const [availableCustomers, setAvailableCustomers] = useState([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [usedItems, setUsedItems] = useState(() => {
        if (initialData?.item_usages && typeof initialData.item_usages === 'object') {
            return Object.keys(initialData.item_usages)
                .filter(id => initialData.item_usages[id])
                .map(Number);
        }
        return [];
    });
    const [defectiveItems, setDefectiveItems] = useState(() => {
        if (initialData?.defective_items && typeof initialData.defective_items === 'object') {
            return Object.keys(initialData.defective_items)
                .filter(id => initialData.defective_items[id])
                .map(Number);
        }
        return [];
    });
    const [isInventoryPopupOpen, setIsInventoryPopupOpen] = useState(false);
    const [showInvoiceConfirmation, setShowInvoiceConfirmation] = useState(false);
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
    const [bulkGroups, setBulkGroups] = useState([]); // For non-serialized items
    const [hasDraft, setHasDraft] = useState(false);
    const [draftLoaded, setDraftLoaded] = useState(false);

    // Local storage utility functions
    const saveToLocalStorage = useCallback((formData) => {
        try {
            // Don't save if this is an edit (initialData exists)
            if (initialData) return;
            
            const dataToSave = {
                title: formData.title,
                representativeName: formData.representativeName,
                representativePhone: formData.representativePhone,
                flagged: formData.flagged,
                paid: formData.paid,
                payable: formData.payable,
                description: formData.description,
                ticketNotes: formData.ticketNotes,
                deadline: formData.deadline,
                selectedCustomer: formData.selectedCustomer,
                assignTo: formData.assignTo,
                selectedItems: formData.selectedItems,
                usedItems: formData.usedItems,
                defectiveItems: formData.defectiveItems,
                bulkGroups: formData.bulkGroups,
                charges: formData.charges,
                // Don't save images as they can be large and cause storage issues
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    }, [initialData]);

    const loadFromLocalStorage = useCallback(() => {
        try {
            if (initialData || draftLoaded) return; // Don't load draft if editing existing ticket or already loaded
            
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                
                // Check if saved data is not too old (24 hours)
                const isDataFresh = Date.now() - parsedData.timestamp < 24 * 60 * 60 * 1000;
                if (!isDataFresh) {
                    localStorage.removeItem(STORAGE_KEY);
                    setHasDraft(false);
                    setDraftLoaded(true);
                    return;
                }
                
                // Restore form data
                setTitle(parsedData.title || '');
                setRepresentativeName(parsedData.representativeName || '');
                setRepresentativePhone(parsedData.representativePhone || '');
                setFlagged(parsedData.flagged || false);
                setPaid(parsedData.paid || false);
                setPayable(parsedData.payable || false);
                setDescription(parsedData.description || '');
                setTicketNotes(parsedData.ticketNotes || '');
                setDeadline(parsedData.deadline || '');
                
                // Restore selected customer only if it still exists in available customers
                const customerExists = availableCustomers.some(customer => customer.id === parsedData.selectedCustomer);
                setSelectedCustomer(customerExists ? parsedData.selectedCustomer : '');
                
                // Restore assigned users only if they still exist in available users
                const validAssignTo = parsedData.assignTo?.filter(userId => 
                    availableUsers.some(user => user.id === userId)
                ) || [];
                setAssignTo(validAssignTo);
                
                // Restore selected items only if they still exist in available items
                const validSelectedItems = parsedData.selectedItems?.filter(item => 
                    availableItems.some(availableItem => availableItem.id === item.item_id)
                ) || [];
                setSelectedItems(validSelectedItems);
                
                // Restore used and defective items only if they're in the valid selected items
                const validItemIds = validSelectedItems.map(item => item.item_id);
                const validUsedItems = parsedData.usedItems?.filter(itemId => 
                    validItemIds.includes(itemId)
                ) || [];
                const validDefectiveItems = parsedData.defectiveItems?.filter(itemId => 
                    validItemIds.includes(itemId)
                ) || [];
                
                setUsedItems(validUsedItems);
                setDefectiveItems(validDefectiveItems);
                
                // Restore bulk groups only if the inventory items still exist
                const validBulkGroups = parsedData.bulkGroups?.filter(group => 
                    availableItems.some(item => 
                        item.inventory_id === group.inventory_id && 
                        item.warehouse === group.warehouse_id
                    )
                ) || [];
                setBulkGroups(validBulkGroups);
                
                setCharges(parsedData.charges || []);
                
                setHasDraft(true);
                setDraftLoaded(true);
                // Show toast notification
                toast.success('Draft ticket data restored from local storage');
            } else {
                setHasDraft(false);
                setDraftLoaded(true);
            }
        } catch (error) {
            console.error('Error loading from local storage:', error);
            localStorage.removeItem(STORAGE_KEY);
            setHasDraft(false);
            setDraftLoaded(true);
        }
    }, [initialData, availableCustomers, availableUsers, availableItems, draftLoaded]);

    const clearLocalStorage = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            setDraftLoaded(false);
        } catch (error) {
            console.error('Error clearing local storage:', error);
        }
    }, []);

    useEffect(() => {
        if (status === 'PENDING APPROVAL' && !signatureDataUrl) {
            setSignatureBtnIsOpen(true);
        }
    }, [status, signatureDataUrl]);

    // Load draft data when component mounts and data is available
    useEffect(() => {
        // Only load draft when we have the necessary data loaded
        if (!isLoadingCustomers && !isLoadingItems && availableCustomers.length > 0 && availableUsers.length > 0) {
            loadFromLocalStorage();
        }
    }, [loadFromLocalStorage, isLoadingCustomers, isLoadingItems, availableCustomers.length, availableUsers.length]);

    // Auto-save form data to local storage when form fields change
    useEffect(() => {
        if (!initialData) { // Only auto-save for new tickets, not edits
            const formData = {
                title,
                representativeName,
                representativePhone,
                flagged,
                paid,
                payable,
                description,
                ticketNotes,
                deadline,
                selectedCustomer,
                assignTo,
                selectedItems,
                usedItems,
                defectiveItems,
                bulkGroups,
                charges
            };
            
            // Debounce the save to avoid excessive localStorage writes
            const timeoutId = setTimeout(() => {
                saveToLocalStorage(formData);
            }, 1000);
            
            return () => clearTimeout(timeoutId);
        }
    }, [
        title, representativeName, representativePhone, flagged, paid, payable,
        description, ticketNotes, deadline, selectedCustomer, assignTo,
        selectedItems, usedItems, defectiveItems, bulkGroups, charges,
        initialData, saveToLocalStorage
    ]);

    // For service/vending customers, do not prefill with user id. We'll require store selection.
    useEffect(() => {
        if (!initialData) {
            setSelectedCustomer('');
        }
    }, [initialData]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingItems(true);
            setIsLoadingCustomers(true);
            try {
                const [techniciansRes, itemsRes, storesRes] = await Promise.all([
                    api.get(`/auth/technician-users/`, { params: { all: true } }),
                    api.get(`/common/api/inventory-items/`, { params: { all: true } }),
                    api.get("/auth/stores/?all=true")
                ]);

                setAvailableItems(itemsRes.data || []);
                setAvailableUsers(techniciansRes.data || []);

                // If current user is a customer, only show their stores
                const allStores = Array.isArray(storesRes.data) ? storesRes.data : [];
                if (isServiceCustomer || isVendingCustomer) {
                    const myStores = allStores.filter(store => store.customer === user?.id);
                    setAvailableCustomers(myStores);
                    // Auto-select if only one store
                    if (!initialData && myStores.length === 1) {
                        setSelectedCustomer(myStores[0].id);
                    }
                } else {
                    setAvailableCustomers(allStores);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load data.');
                setAvailableItems([]);
                setAvailableUsers([]);
                setAvailableCustomers([]);
            } finally {
                setIsLoadingItems(false);
                setIsLoadingCustomers(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            setRepresentativeName(initialData.representativeName || '');
            setRepresentativePhone(initialData.representativePhone || '');
            setFlagged(initialData.flagged || false);
            setPayable(initialData.payable || false);
            setPaid(initialData.paid || false);
            setDescription(initialData.description || '');
            setTicketNotes(initialData.technician_notes || '');
            setStatus(initialData.status || 'OPEN');
            setDeadline(initialData.deadline ? initialData.deadline.split('T')[0] : '');
            if (initialData.store) {
                const matchingCustomer = availableCustomers.find(
                    customer => customer.id === initialData.store
                );
                if (matchingCustomer) {
                    setSelectedCustomer(matchingCustomer.id);
                }
            }
            setImages(
                initialData.attachments?.map(att => ({
                    id: att.id,
                    file: `${origin}${att.file}`,
                    url: `${origin}${att.file}`,
                    name: att.file.split('/').pop(),
                })) || []
            );
            setAssignTo(
                initialData.assigned_to_users?.map(user => user.id) || []
            );

            const initialItems = Array.isArray(initialData.items) && initialData.items.length > 0
                ? initialData.items.map(item => ({
                    item_id: item.id,
                    inventory_id: item.inventory_id,
                    inventory_name: item.inventory_name,
                    warehouse_id: item.warehouse,
                    warehouse_name: item.warehouse_name,
                    status: item.status,
                    attributes: item.attributes || {}
                }))
                : [];
            setSelectedItems(initialItems);
            const initialUsedItems = initialData.item_usages && typeof initialData.item_usages === 'object'
                ? Object.keys(initialData.item_usages)
                    .filter(id => initialData.item_usages[id])
                    .map(Number)
                : [];
            setUsedItems(initialUsedItems);

            const initialCharges = Array.isArray(initialData.charges) && initialData.charges.length > 0
                ? initialData.charges.map(charge => ({
                    id: charge.id || Math.random().toString(36).substring(2),
                    amount: charge.amount,
                    description: charge.description,
                    invoice_created: charge.invoice_created || false,
                    invoice_id: charge.invoice_id,
                    invoice_number: charge.invoice_number,
                    invoice_created_at: charge.invoice_created_at
                }))
                : [];
            setCharges(initialCharges);

            const hasExistingCustomerSignature = initialData?.attachments?.some(
                att => att.file.includes('signature.png')
            );
            setHasCustomerSignature(hasExistingCustomerSignature);
        }
    }, [initialData, availableCustomers, origin]);

    const handlePaidChange = useCallback((e) => {
        if (!(isTechnician || isWarehouseTechnician)) {
            setPaid(!paid);
            return;
        }
        if (!hasPaidSignature) {
            setSignatureType('paid');
            setSignatureModalIsOpen(true);
        }
    }, [isTechnician, isWarehouseTechnician, paid, hasPaidSignature]);

    const handleSignatureSubmit = useCallback(async () => {
        const canvas = signatureCanvasRef.current?.getCanvas();
        if (!canvas || signatureCanvasRef.current?.isEmpty()) {
            toast.error("Please provide a signature.");
            return;
        }

        const ctx = canvas.getContext('2d');
        const label = `${user?.username || 'Technician'} (${new Date().toLocaleString()})`;
        ctx.font = '16px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText(label, 10, canvas.height - 10);

        const signatureData = canvas.toDataURL();
        const dataUrlToBlob = (dataUrl) => {
            const [, base64Data] = dataUrl.split(',');
            const mime = dataUrl.match(/:(.*?);/)[1];
            const binary = atob(base64Data);
            const array = [];
            for (let i = 0; i < binary.length; i++) {
                array.push(binary.charCodeAt(i));
            }
            return new Blob([new Uint8Array(array)], { type: mime });
        };

        const signatureBlob = dataUrlToBlob(signatureData);
        const fileName = signatureType === 'paid' ? 'technician-signature.png' : 'signature.png';
        const signatureFile = new File([signatureBlob], fileName, { type: signatureBlob.type });

        const signatureImage = {
            id: Date.now() + Math.random().toString(36).substring(2),
            file: signatureFile,
            url: signatureData,
            name: fileName,
        };

        setImages(prevImages => [...prevImages, signatureImage]);
        setSignatureModalIsOpen(false);

        if (signatureType === 'paid') {
            setPaid(true);
            setHasPaidSignature(true);
        } else if (signatureType === 'status') {
            setHasCustomerSignature(true);
        }
        setSignatureDataUrl(signatureData);
    }, [signatureType, user?.username]);

    const handleSignatureClear = useCallback(() => {
        signatureCanvasRef.current?.clear();
        setSignatureDataUrl(null);
    }, []);

    const handleInternalSubmit = useCallback(async (e) => {
        e.preventDefault();
        if ((isTechnician || isWarehouseTechnician) &&
            ["PENDING APPROVAL", "PARTIALLY CLOSED"].includes(status) &&
            representativePhone.replace(/\D/g, "").length < 10) {
            toast.error("Please enter a valid Representative Phone Number.");
            return;
        }
        if (status === "PENDING APPROVAL" && !hasCustomerSignature) {
            setSignatureType('status');
            setSignatureModalIsOpen(true);
            toast.error("Customer signature is required for PENDING APPROVAL.");
            return;
        }

        if (status === "PENDING APPROVAL" && payable && !paid) {
            if ((isTechnician || isWarehouseTechnician) && !hasPaidSignature) {
                setSignatureType('paid');
                setSignatureModalIsOpen(true);
                toast.error("Payment signature is required for PENDING APPROVAL when payable.");
                return;
            } else {
                toast.error("The Paid checkbox must be checked for PENDING APPROVAL when payable.");
                return;
            }
        }

        if (!selectedCustomer) {
            toast.error("Store selection is required");
            return;
        }

        setIsLoading(true);
        // Handle serialized items
        const serializedItems = selectedItems.filter(item => item.item_id); // Only items with actual item_id
        const itemUsagesDict = usedItems.reduce((acc, itemId) => {
            acc[itemId] = true;
            return acc;
        }, {});
        const defectiveItemsDict = defectiveItems.reduce((acc, itemId) => {
            acc[itemId] = true;
            return acc;
        }, {});
        
        // Handle bulk groups (non-serialized items)
        const nonSerializedItems = bulkGroups.map(group => ({
            inventory_id: group.inventory_id,
            warehouse_id: group.warehouse_id,
            quantity: group.quantity
        }));
        
        // Add bulk group used/defective items to the dictionaries
        bulkGroups.forEach(group => {
            let itemsToProcess = [];
            
            if (group.item_ids && group.item_ids.length > 0) {
                // If we have existing item IDs (from editing), start with those
                itemsToProcess = [...group.item_ids];
                
                // If we need more items than we have existing ones, get additional available items
                if (group.quantity > group.item_ids.length) {
                    const additionalNeeded = group.quantity - group.item_ids.length;
                    const availableItemsForGroup = availableItems.filter(item => 
                        item.inventory_id === group.inventory_id && 
                        item.warehouse === group.warehouse_id &&
                        item.status === 'available' &&
                        (!item.attributes || Object.keys(item.attributes).length === 0) &&
                        !group.item_ids.includes(item.id) // Don't include items already in the group
                    );
                    
                    // Take the additional needed items
                    const additionalItems = availableItemsForGroup.slice(0, additionalNeeded);
                    itemsToProcess.push(...additionalItems.map(item => item.id));
                } else {
                    // If we need fewer items, take only the first 'quantity' number
                    itemsToProcess = group.item_ids.slice(0, group.quantity);
                }
            } else {
                // For new items, get from availableItems
                const availableItemsForGroup = availableItems.filter(item => 
                    item.inventory_id === group.inventory_id && 
                    item.warehouse === group.warehouse_id &&
                    item.status === 'available' &&
                    (!item.attributes || Object.keys(item.attributes).length === 0)
                );
                
                // Take the first 'quantity' number of items
                const itemsToAssign = availableItemsForGroup.slice(0, group.quantity);
                itemsToProcess = itemsToAssign.map(item => item.id);
            }
            
            // Mark the first 'used_qty' items as used
            for (let i = 0; i < Math.min(group.used_qty, itemsToProcess.length); i++) {
                itemUsagesDict[itemsToProcess[i]] = true;
            }
            
            // Mark the next 'defective_qty' items as defective
            for (let i = group.used_qty; i < Math.min(group.used_qty + group.defective_qty, itemsToProcess.length); i++) {
                defectiveItemsDict[itemsToProcess[i]] = true;
            }
        });
        
        // Combine serialized and non-serialized item IDs for ticket_items
        const nonSerializedItemIds = [];
        
        // Get the actual item IDs for non-serialized items
        bulkGroups.forEach(group => {
            let itemsToInclude = [];
            
            if (group.item_ids && group.item_ids.length > 0) {
                // If we have existing item IDs (from editing), start with those
                itemsToInclude = [...group.item_ids];
                
                // If we need more items than we have existing ones, get additional available items
                if (group.quantity > group.item_ids.length) {
                    const additionalNeeded = group.quantity - group.item_ids.length;
                    const availableItemsForGroup = availableItems.filter(item => 
                        item.inventory_id === group.inventory_id && 
                        item.warehouse === group.warehouse_id &&
                        item.status === 'available' &&
                        (!item.attributes || Object.keys(item.attributes).length === 0) &&
                        !group.item_ids.includes(item.id) // Don't include items already in the group
                    );
                    
                    // Take the additional needed items
                    const additionalItems = availableItemsForGroup.slice(0, additionalNeeded);
                    itemsToInclude.push(...additionalItems.map(item => item.id));
                } else {
                    // If we need fewer items, take only the first 'quantity' number
                    itemsToInclude = group.item_ids.slice(0, group.quantity);
                }
            } else {
                // For new items, get from availableItems
                const availableItemsForGroup = availableItems.filter(item => 
                    item.inventory_id === group.inventory_id && 
                    item.warehouse === group.warehouse_id &&
                    item.status === 'available' &&
                    (!item.attributes || Object.keys(item.attributes).length === 0)
                );
                
                // Take the first 'quantity' number of items
                const itemsToAssign = availableItemsForGroup.slice(0, group.quantity);
                itemsToInclude = itemsToAssign.map(item => item.id);
            }
            
            nonSerializedItemIds.push(...itemsToInclude);
        });
        
        const allTicketItemIds = [
            ...serializedItems.map(item => item.item_id),
            ...nonSerializedItemIds
        ];
        
        const ticketData = {
            title,
            representativeName,
            representativePhone,
            flagged,
            paid,
            payable,
            description,
            ticketNotes,
            store: selectedCustomer,
            status,
            deadline,
            assigned_to: assignTo,
            ticket_items: allTicketItemIds,
            item_usages: itemUsagesDict,
            defective_items: defectiveItemsDict,
            non_serialized_items: nonSerializedItems,
            charges: charges.filter(charge => charge.amount && charge.description),
            images: images.map(img => img.file).filter(Boolean),
        };

        try {
            await onSubmit(ticketData);
            // Clear local storage on successful submission
            clearLocalStorage();
            onClose();
        } catch (err) {
            console.error('Submission failed:', err);
            const errorMessage = err.response?.data?.ticket_items?.ticket_items ||
                err.response?.data?.detail ||
                'Failed to submit ticket. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [
        isTechnician, isWarehouseTechnician, status, representativePhone, payable, paid, hasPaidSignature,
        selectedCustomer, isServiceCustomer, isVendingCustomer, title, representativeName, flagged,
        description, ticketNotes, deadline, assignTo, selectedItems, usedItems, defectiveItems, bulkGroups, charges, images, onSubmit, onClose
    ]);

    const addItem = useCallback(() => {
        setSelectedItems(prev => [...prev, {
            item_id: null,
            inventory_id: null,
            inventory_name: '',
            warehouse_id: null,
            warehouse_name: '',
            status: 'available',
            attributes: {}
        }]);
    }, []);

    const removeItem = useCallback((index) => {
        setSelectedItems(prev => {
            const itemIdToRemove = prev[index].item_id;
            setUsedItems(prevUsed => prevUsed.filter(id => id !== itemIdToRemove));
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    const updateItem = useCallback((index, field, value) => {
        setSelectedItems(prev => {
            const updatedItems = [...prev];
            if (field === 'item') {
                const selectedItem = availableItems.find(item => item.id === value);
                if (selectedItem) {
                    const prevItemId = updatedItems[index].item_id;
                    updatedItems[index] = {
                        item_id: selectedItem.id,
                        inventory_id: selectedItem.inventory_id,
                        inventory_name: selectedItem.inventory_name,
                        warehouse_id: selectedItem.warehouse,
                        warehouse_name: selectedItem.warehouse_name,
                        status: selectedItem.status,
                        attributes: selectedItem.attributes || {}
                    };
                    // Update usedItems if the item was previously used
                    if (prevItemId && usedItems.includes(prevItemId)) {
                        setUsedItems(prevUsed => prevUsed.filter(id => id !== prevItemId));
                    }
                }
            }
            return updatedItems;
        });
    }, [availableItems, usedItems]);

    const handleUsedItemChange = useCallback((itemId, isChecked) => {
        setUsedItems(prev => {
            if (isChecked) {
                return [...prev, itemId];
            } else {
                return prev.filter(id => id !== itemId);
            }
        });
    }, []);

    const addCharge = useCallback(() => {
        setCharges(prev => [...prev, {
            id: Math.random().toString(36).substring(2),
            amount: '',
            description: ''
        }]);
    }, []);

    const removeCharge = useCallback((index) => {
        setCharges(prev => prev.filter((_, i) => i !== index));
    }, []);

    const updateCharge = useCallback((index, field, value) => {
        setCharges(prev => {
            const updatedCharges = [...prev];
            updatedCharges[index] = {
                ...updatedCharges[index],
                [field]: value
            };
            return updatedCharges;
        });
    }, []);

    const handleCreateInvoice = useCallback(() => {
        if (charges.length === 0) {
            toast.error("No charges to create invoice from");
            return;
        }
        
        // Check if any charge already has an invoice created
        const hasInvoiceCreated = charges.some(charge => charge.invoice_created);
        if (hasInvoiceCreated) {
            toast.error("An invoice has already been created from this ticket's charges");
            return;
        }
        
        setShowInvoiceConfirmation(true);
    }, [charges]);

    const confirmCreateInvoice = useCallback(async () => {
        try {
            setIsCreatingInvoice(true);
            const response = await api.post(`/common/api/tickets/${initialData.id}/create-invoice/`);
            
            toast.success(`Invoice created successfully! Invoice #${response.data.invoice_number}`);
            setShowInvoiceConfirmation(false);
            
            // Refresh the ticket data to get updated charges with invoice_created flags
            if (initialData?.id) {
                try {
                    const ticketResponse = await api.get(`/common/api/tickets/${initialData.id}/`);
                    // Update the charges with the new invoice_created flags
                    setCharges(ticketResponse.data.charges || []);
                } catch (error) {
                    console.error('Error refreshing ticket data:', error);
                }
            }
            
        } catch (error) {
            console.error('Error creating invoice:', error);
            toast.error(error.response?.data?.detail || 'Failed to create invoice');
        } finally {
            setIsCreatingInvoice(false);
        }
    }, [initialData?.id]);

    const userOptions = useMemo(() => (Array.isArray(availableUsers) ? availableUsers : []).map(user => ({
        value: user.id,
        label: user.username || user.email || `User ${user.id}`,
    })), [availableUsers]);

    // Modified itemOptions to include all available items, including selected ones
    const itemOptions = useMemo(() => {
        return (Array.isArray(availableItems) ? availableItems : []).map(item => ({
            value: item.id,
            label: `${item.inventory_name} (${item.warehouse_name}) - ${Object.entries(item.attributes || {})
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ') || 'No attributes'}`
        }));
    }, [availableItems]);

    const customerOptions = useMemo(() => (Array.isArray(availableCustomers) ? availableCustomers : []).map(store => ({
        value: store.id,
        label: `${store.store_name} (${store.customer_name})`,
    })), [availableCustomers]);

    const allStatusOptions = useMemo(() => [
        { value: "OPEN", label: "OPEN" },
        { value: "IN PROGRESS", label: "IN PROGRESS" },
        { value: "PARTIALLY CLOSED", label: "PARTIALLY CLOSED" },
        { value: "PENDING APPROVAL", label: "PENDING APPROVAL" },
        { value: "CLOSED", label: "CLOSED" },
    ], []);

    const statusOptions = useMemo(() =>
        ["Technician", "Warehouse Technician"].includes(user?.role)
            ? allStatusOptions.filter(option => option.value !== "CLOSED")
            : allStatusOptions
        , [user?.role, allStatusOptions]);

    const handleStatusSignature = useCallback(() => {
        setSignatureType('status');
        setSignatureModalIsOpen(true);
    }, []);

    useEffect(() => {
        if (signatureModalIsOpen && signatureCanvasRef.current) {
            signatureCanvasRef.current.clear();
        }
    }, [signatureModalIsOpen]);


    // Function to get filtered item options for a specific dropdown
    const getFilteredItemOptions = useCallback((currentIndex) => {
        // Get IDs of items selected in other dropdowns
        const selectedItemIds = selectedItems
            .filter((_, index) => index !== currentIndex) // Exclude the current dropdown
            .map(item => item.item_id)
            .filter(Boolean); // Remove null/undefined item_ids

        // Filter availableItems to exclude already selected items
        return (Array.isArray(availableItems) ? availableItems : [])
            .filter(item => !selectedItemIds.includes(item.id))
            .map(item => ({
                value: item.id,
                label: `${item.inventory_name} (${item.warehouse_name}) - ${Object.entries(item.attributes || {})
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ') || 'No attributes'
                    }`,
            }));
    }, [availableItems, selectedItems]);

    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${signatureModalIsOpen ? 'block' : 'hidden'}`}
                onClick={() => setSignatureModalIsOpen(false)}
            >
                <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded-lg shadow-lg h-[90vh] w-[95vw]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-lg font-semibold mb-3">
                        {signatureType === 'paid'
                            ? "Please provide your signature to confirm payment"
                            : "Please sign the document"}
                    </h2>
                    <SignatureCanvas
                        penColor="red"
                        ref={signatureCanvasRef}
                        canvasProps={{
                            width: window.innerWidth * 0.9,
                            height: window.innerHeight * 0.6,
                            className: 'signature-canvas'
                        }}
                    />
                    <div className="mt-3 flex justify-between">
                        <PrimaryBtn
                            type="button"
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                            onClick={handleSignatureSubmit}
                        >
                            Submit Signature
                        </PrimaryBtn>
                        <PrimaryBtn onClick={() => setSignatureModalIsOpen(false)} className="px-2 py-1 text-xs">
                            Close
                        </PrimaryBtn>
                        <SecondaryBtn
                            type="button"
                            className="px-2 py-1 bg-gray-300 text-black rounded text-xs"
                            onClick={handleSignatureClear}
                        >
                            Clear
                        </SecondaryBtn>
                    </div>
                </div>
            </div>

            {/* Draft Indicator */}
            {!initialData && hasDraft && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-blue-800">
                                Draft ticket data available
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                clearLocalStorage();
                                setHasDraft(false);
                                setDraftLoaded(false);
                                // Reset form to empty state
                                setTitle('');
                                setRepresentativeName('');
                                setRepresentativePhone('');
                                setFlagged(false);
                                setPaid(false);
                                setPayable(false);
                                setDescription('');
                                setTicketNotes('');
                                setDeadline('');
                                setSelectedCustomer('');
                                setAssignTo([]);
                                setSelectedItems([]);
                                setUsedItems([]);
                                setDefectiveItems([]);
                                setBulkGroups([]);
                                setCharges([]);
                                toast.success('Draft cleared and form reset');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                            Start Fresh
                        </button>
                    </div>
                </div>
            )}

            <InventorySelectionPopup
                isOpen={isInventoryPopupOpen}
                onClose={() => setIsInventoryPopupOpen(false)}
                availableItems={availableItems}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                usedItems={usedItems}
                setUsedItems={setUsedItems}
                defectiveItems={defectiveItems}
                setDefectiveItems={setDefectiveItems}
                bulkGroups={bulkGroups}
                setBulkGroups={setBulkGroups}
                isTechnician={isTechnician}
                isWarehouseTechnician={isWarehouseTechnician}
                initialData={initialData}
            />

            {/* Invoice Creation Confirmation Popup */}
            {showInvoiceConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full mx-4">
                        <h3 className="text-base font-semibold mb-3">Create Invoice</h3>
                        <p className="text-sm text-gray-600 mb-3">
                            Are you sure you want to create an invoice from the ticket charges?
                        </p>
                        <div className="mb-3">
                            <p className="text-xs font-medium text-gray-700">Charges to be included:</p>
                            <div className="mt-1 space-y-1">
                                {charges.map((charge, index) => (
                                    <div key={index} className="text-xs text-gray-600">
                                        • {charge.description}: ${parseFloat(charge.amount || 0).toFixed(2)}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs font-semibold text-gray-800 mt-1">
                                Total: ${charges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <SecondaryBtn
                                type="button"
                                onClick={() => setShowInvoiceConfirmation(false)}
                                disabled={isCreatingInvoice}
                                className="text-xs px-2 py-1"
                            >
                                Cancel
                            </SecondaryBtn>
                            <PrimaryBtn
                                type="button"
                                onClick={confirmCreateInvoice}
                                disabled={isCreatingInvoice}
                                className="text-xs px-2 py-1"
                            >
                                {isCreatingInvoice ? (
                                    <>
                                        <svg
                                            className="animate-spin -ml-1 mr-1 h-3 w-3 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Creating...
                                    </>
                                ) : (
                                    'Create Invoice'
                                )}
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}


            <form onSubmit={handleInternalSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            placeholder="Enter ticket title"
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                            disabled={isTechnician || isWarehouseTechnician}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Calendar size={14} className="text-gray-500" /> Deadline
                        </label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            disabled={isTechnician || isWarehouseTechnician}
                        />
                    </div>

                    {(!isVendingCustomer && !isServiceCustomer && !isEmployee) && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Assign To</label>
                            <Select
                                isMulti
                                options={userOptions}
                                value={userOptions.filter(opt => assignTo.includes(opt.value))}
                                onChange={selectedOptions => {
                                    const selectedIds = selectedOptions ? selectedOptions.map(s => s.value) : [];
                                    if (initialData && selectedIds.length === 0) {
                                        toast.error('At least one technician must be assigned.');
                                        return;
                                    }
                                    if (selectedIds.length <= 3) {
                                        setAssignTo(selectedIds);
                                    } else {
                                        toast.error('You can assign a maximum of 3 users.');
                                        setAssignTo(selectedIds.slice(0, 3));
                                    }
                                }}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                placeholder="Search and select users..."
                                isLoading={!availableUsers.length && !isLoading}
                                isDisabled={isTechnician || isWarehouseTechnician}
                            />
                            <p className="text-xs text-gray-500 mt-1">Max 3 Technicians can be assigned.</p>
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Enter ticket description here"
                            rows={6}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                            disabled={isTechnician || isWarehouseTechnician}
                        />
                        {(!isVendingCustomer && !isServiceCustomer && !isEmployee) && (
                            <div className='flex w-full items-center justify-between mt-2'>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                    <Select
                                        options={statusOptions}
                                        value={statusOptions.find(opt => opt.value === status)}
                                        onChange={selected => setStatus(selected?.value)}
                                        classNamePrefix="react-select"
                                        isDisabled={
                                            ["PARTIALLY CLOSED", "PENDING APPROVAL", "CLOSED"].includes(initialData?.status) &&
                                            ["Technician", "Service Customer", "Vending Customer"].includes(user?.role)
                                        }
                                    />
                                </div>
                                {(status === "PENDING APPROVAL" || status === "PARTIALLY CLOSED") && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Customer Signature</label>
                                        <PrimaryBtn onClick={handleStatusSignature} className="text-xs px-2 py-1">
                                            Take Signature
                                        </PrimaryBtn>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 md:col-span-1">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Store</label>
                            <Select
                                options={customerOptions}
                                value={customerOptions.find(opt => opt.value === selectedCustomer)}
                                onChange={selected => setSelectedCustomer(selected?.value)}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                placeholder="Search for store..."
                                isLoading={isLoadingCustomers}
                                isDisabled={isTechnician || isWarehouseTechnician}
                                isClearable
                            />
                        </div>
                        {(isTechnician || isWarehouseTechnician) && (
                            <>
                                {(status === "PENDING APPROVAL" || status === "PARTIALLY CLOSED" || status === "CLOSED") && (
                                    <>
                                        <span className="text-xs font-medium text-gray-700">Representative Information</span>
                                        <div className='flex gap-1 flex-col sm:flex-row justify-between'>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    value={representativeName}
                                                    placeholder="Enter Representative Name"
                                                    onChange={e => setRepresentativeName(e.target.value)}
                                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                                    required
                                                    disabled={
                                                        ["PARTIALLY CLOSED", "PENDING APPROVAL", "CLOSED"].includes(initialData?.status)
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                                                <PhoneNumberInput
                                                    value={representativePhone}
                                                    onPhoneChange={(phone) => setRepresentativePhone(phone)}
                                                    disabled={
                                                        ["PARTIALLY CLOSED", "PENDING APPROVAL", "CLOSED"].includes(initialData?.status)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        <div className='flex justify-between px-2'>
                            {(!isVendingCustomer && !isServiceCustomer && !isEmployee) && (
                                <>
                                    <label className="flex items-center gap-2 justify-end text-xs font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={payable}
                                            onChange={e => setPayable(e.target.checked)}
                                            className="form-checkbox h-4 w-4"
                                            disabled={isTechnician || isWarehouseTechnician}
                                        />
                                        <span>Payable</span>
                                    </label>
                                    {payable && (status === "PENDING APPROVAL" || status === "PARTIALLY CLOSED" || status === "CLOSED") && (
                                        <label className="flex items-center gap-2 justify-end text-xs font-medium text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={paid}
                                                onChange={handlePaidChange}
                                                className="form-checkbox h-4 w-4"
                                                disabled={
                                                    hasPaidSignature ||
                                                    ((initialData?.status === "CLOSED") && (isTechnician || isWarehouseTechnician))
                                                }
                                            />
                                            <span>Paid</span>
                                        </label>
                                    )}
                                </>
                            )}
                        </div>

                        {(status === "PENDING APPROVAL" || status === "PARTIALLY CLOSED") && (
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Approval Notes</label>
                                <textarea
                                    value={ticketNotes}
                                    onChange={e => setTicketNotes(e.target.value)}
                                    placeholder="Enter your notes for approval"
                                    rows={3}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                    required
                                />
                            </div>
                        )}

                    </div>
                    {(!isVendingCustomer && !isServiceCustomer && !isEmployee) && (
                        <div className="md:col-span-2 border-t">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Items Required</label>
                            <div className="grid grid-cols-2 p-2">
                                <div className='flex items-center gap-2'>
                                    <PrimaryBtn
                                        type="button"
                                        onClick={() => setIsInventoryPopupOpen(true)}
                                        disabled={isLoadingItems}
                                        className="text-xs px-2 py-1"
                                    >
                                        {isLoadingItems ? (
                                            <>
                                                <svg
                                                    className="animate-spin -ml-1 mr-1 h-3 w-3 text-white"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                    />
                                                </svg>
                                                Loading Items...
                                            </>
                                        ) : (
                                            'Manage Items'
                                        )}
                                    </PrimaryBtn>
                                    {selectedItems.length > 0 && (
                                        <div className="text-xs text-gray-600">
                                            <p>Selected Items: {selectedItems.length}</p>
                                            <p>Used Items: {usedItems.length}</p>
                                            {defectiveItems.length > 0 && (
                                                <p>Defective Items: {defectiveItems.length}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {!isTechnician && !isWarehouseTechnician && (
                                    <label className="flex items-center gap-2 justify-end text-xs font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={flagged}
                                            onChange={e => setFlagged(e.target.checked)}
                                            className="form-checkbox h-4 w-4"
                                            disabled={isTechnician || isWarehouseTechnician}
                                        />
                                        <span>Flagged</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Ticket Charges Section */}
                    {(isAdmin || isManager || isTechnician) && (
                        <div className="md:col-span-2 border-t">
                            {charges.some(c => c.invoice_created) && (
                                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-xs text-blue-700">
                                        <strong>🔒 Charges Locked:</strong> Charges cannot be modified because an invoice has been created from them.
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-medium text-gray-700">Ticket Charges</label>
                                {initialData?.status !== "CLOSED" && !charges.some(c => c.invoice_created) && (
                                    <button
                                        type="button"
                                        onClick={addCharge}
                                        className="flex items-center text-primary cursor-pointer text-xs px-2 py-1"
                                    >
                                        <PlusCircle size={14} className="mr-1" />
                                        Add Charge
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {charges.map((charge, index) => (
                                    <div key={charge.id || index} className="flex items-center gap-2 p-2 border border-gray-200 rounded-md">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={charge.amount}
                                                onChange={e => updateCharge(index, 'amount', e.target.value)}
                                                placeholder="Amount"
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                                disabled={initialData?.status === "CLOSED" || charges.some(c => c.invoice_created)}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={charge.description}
                                                onChange={e => updateCharge(index, 'description', e.target.value)}
                                                placeholder="Description"
                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                                disabled={initialData?.status === "CLOSED" || charges.some(c => c.invoice_created)}
                                            />
                                        </div>
                                        {initialData?.status !== "CLOSED" && !charges.some(c => c.invoice_created) && (
                                            <button
                                                type="button"
                                                onClick={() => removeCharge(index)}
                                                className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                                                title="Remove Charge"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {charges.length === 0 && (
                                    <div className="text-xs text-gray-500 text-center py-3">
                                        No charges added yet
                                    </div>
                                )}
                                {charges.length > 0 && (
                                    <div className="text-xs text-gray-600 mt-2">
                                        <p>Total Charges: ${charges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0).toFixed(2)}</p>
                                        {initialData && (
                                            <>
                                                {charges.some(charge => charge.invoice_created) ? (
                                                    <div className="mt-2 px-3 py-1.5 bg-gray-400 text-white rounded-md cursor-not-allowed text-sm">
                                                        Invoice Already Created
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleCreateInvoice}
                                                        className="mt-2 px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                                                    >
                                                        Create Invoice
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div
                        className="overflow-auto max-h-80 md:col-span-3"
                    >
                        <ImageUploaderComponent
                            images={images}
                            showDeleteButton={true}
                            setImages={setImages}
                            disableUpload={
                                initialData?.status === "CLOSED" &&
                                (isTechnician || isVendingCustomer || isServiceCustomer || isWarehouseTechnician)
                            }
                        />
                    </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <SecondaryBtn type="button" disabled={isLoading} onClick={onClose} className="text-xs px-2 py-1">
                        Close
                    </SecondaryBtn>
                    <PrimaryBtn type="submit" disabled={isLoading} className="text-xs px-2 py-1">
                        {isLoading ? (
                            <>
                                <svg
                                    className="animate-spin -ml-1 mr-1 h-3 w-3 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                {initialData ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            initialData ? 'Update Ticket' : 'Create Ticket'
                        )}
                    </PrimaryBtn>
                </div>
            </form>
        </>
    );
}

export default TicketFormPopup;