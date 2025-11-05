import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";
import Select from "react-select";
import api from "../../utils/api";
import priceMatrixAPI from "../../api/priceMatrix";
import { toast } from "react-hot-toast";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useSelector } from "react-redux";

const AssemblyTicketFormPopup = ({ ticketDetails, onclose, onSubmit, isSubmitting = false }) => {
    const user = useSelector((state) => state.user.user);
    const isTechnician = user?.role === "Technician";
    const isEditMode = !!ticketDetails;
    const isTicketClosed = ticketDetails?.status === "CLOSED";
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        deadline: "",
        assembly_notes: "",
    });

    // Items used in assembly (like regular tickets)
    const [selectedItems, setSelectedItems] = useState([]);
    const [bulkGroups, setBulkGroups] = useState([]); // aggregated simple items (no serial number required) -- each {quantity, used_qty, defective_qty}
    const bulkGroupsRef = useRef([]); // keeps the latest snapshot of bulkGroups

    // Keep the ref updated whenever bulkGroups changes
    useEffect(() => {
        bulkGroupsRef.current = bulkGroups;
    }, [bulkGroups]);
    const [bulkInventoryOption, setBulkInventoryOption] = useState(null);
    const [bulkQuantity, setBulkQuantity] = useState(1);
    const [usedItems, setUsedItems] = useState([]);
    const [defectiveItems, setDefectiveItems] = useState([]);
    const availablePoolRef = useRef({});
    const ticketItemIdsRef = useRef([]);

    // Assembled item attributes (only if serialized)
    const [assembledItemAttributes, setAssembledItemAttributes] = useState({
        serial_number: "",
        mac_address: "",
        ip_address: "",
        service_tag: "",
        service_number: "",
    });

    const [availableItems, setAvailableItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showInventorySelection, setShowInventorySelection] = useState(false);
    const [availableTechnicians, setAvailableTechnicians] = useState([]);
    const [assignedTechnicians, setAssignedTechnicians] = useState([]);

    // Add state for multiple assembled items and selected index
    const [assembledItems, setAssembledItems] = useState([
        {
            name: '',
            upc: '',
            category: '',
            unit_price: '',
            price: '',
            quantity: 1,
            serial_number_required: false,
            attributes_list: [],
        },
    ]);
    const [selectedAssembledIndex, setSelectedAssembledIndex] = useState(0);

    // Handlers for assembled items
    const addAssembledItem = () => {
        setAssembledItems([
            ...assembledItems,
            {
                name: '',
                upc: '',
                category: '',
                unit_price: '',
                price: '',
                quantity: 1,
                serial_number_required: false,
                attributes_list: [],
            },
        ]);
        setSelectedAssembledIndex(assembledItems.length);
    };
    const removeAssembledItem = (index) => {
        const newItems = assembledItems.filter((_, i) => i !== index);
        setAssembledItems(newItems);
        if (selectedAssembledIndex >= newItems.length) {
            setSelectedAssembledIndex(Math.max(0, newItems.length - 1));
        }
    };
    const updateAssembledItem = (index, key, value) => {
        setAssembledItems(assembledItems.map((item, i) => {
            if (i === index) {
                const updatedItem = { ...item, [key]: value };
                
                // Auto-calculate price when unit_price changes
                if (key === 'unit_price' && value && !isNaN(Number.parseFloat(value))) {
                    // Use price matrix API to calculate sale price
                    priceMatrixAPI.calculateSalePrice(value)
                        .then(response => {
                            setAssembledItems(prev => prev.map((item, idx) => 
                                idx === index ? { ...item, price: response.sale_price.toFixed(2) } : item
                            ));
                        })
                        .catch(error => {
                            console.error('Error calculating sale price:', error);
                            // Fallback to original calculation if API fails
                            const unitPrice = Number.parseFloat(value);
                            const markupPercentage = 20; // 20% markup as fallback
                            const calculatedPrice = unitPrice + (unitPrice * markupPercentage / 100);
                            setAssembledItems(prev => prev.map((item, idx) => 
                                idx === index ? { ...item, price: calculatedPrice.toFixed(2) } : item
                            ));
                        });
                } else if (key === 'unit_price') {
                    // Clear price when unit_price is empty or invalid
                    updatedItem.price = "";
                }
                
                return updatedItem;
            }
            return item;
        }));
    };
    const updateAttributesList = (index, attributesList) => {
        setAssembledItems(assembledItems.map((item, i) =>
            i === index ? { ...item, attributes_list: attributesList } : item
        ));
    };

    useEffect(() => {
        fetchAvailableItems();
        fetchCategories();
        fetchTechnicians();
        
        if (isEditMode && ticketDetails) {
            setFormData({
                title: ticketDetails.title || "",
                description: ticketDetails.description || "",
                deadline: ticketDetails.deadline ? new Date(ticketDetails.deadline).toISOString().split('T')[0] : "",
                assembly_notes: ticketDetails.assembly_notes || "",
            });

            // Load assembled items (NEW)
            if (Array.isArray(ticketDetails.assembled_items) && ticketDetails.assembled_items.length > 0) {
                setAssembledItems(ticketDetails.assembled_items.map(item => ({
                    ...item,
                    quantity: Number(item.quantity) || 1,
                    price: item.price || item.unit_price || '',
                    attributes_list: item.serial_number_required ? (item.attributes_list || item.serial_attributes || []) : [],
                })));
                setSelectedAssembledIndex(0);
            } else {
                setAssembledItems([{
                    name: '',
                    upc: '',
                    category: '',
                    unit_price: '',
                    price: '',
                    quantity: 1,
                    serial_number_required: false,
                    attributes_list: [],
                }]);
                setSelectedAssembledIndex(0);
            }

            // Load existing items if editing
            if (ticketDetails.items && ticketDetails.items.length > 0) {
                ticketItemIdsRef.current = ticketDetails.items.map(it => it.id);
                const serialItems = [];
                const bulkMap = {};
                ticketDetails.items.forEach(item => {
                    if (item.serial_number_required) {
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
                        const isUsed = ticketDetails.item_usages && ticketDetails.item_usages[item.id];
                        const isDefective = ticketDetails.defective_items && ticketDetails.defective_items[item.id];

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
                setSelectedItems(serialItems);
                setBulkGroups(Object.values(bulkMap));
            } else {
                ticketItemIdsRef.current = [];
            }

            // Load used/defective items
            if (ticketDetails.item_usages && typeof ticketDetails.item_usages === 'object') {
                const usedIds = Object.keys(ticketDetails.item_usages)
                    .filter(id => ticketDetails.item_usages[id])
                    .map(Number);
                setUsedItems(usedIds);
            }

            if (ticketDetails.defective_items && typeof ticketDetails.defective_items === 'object') {
                const defectiveIds = Object.keys(ticketDetails.defective_items)
                    .filter(id => ticketDetails.defective_items[id])
                    .map(Number);
                setDefectiveItems(defectiveIds);
            }

            // Load assembled item attributes if they exist
            if (ticketDetails.assembled_item_attributes) {
                setAssembledItemAttributes(ticketDetails.assembled_item_attributes);
            }
            
            // Load assigned technicians
            if (ticketDetails.assigned_to_users && Array.isArray(ticketDetails.assigned_to_users)) {
                setAssignedTechnicians(ticketDetails.assigned_to_users.map(user => user.id));
            }
        }
    }, [ticketDetails, isEditMode]);

    // Build quick lookup pool of eligible simple items
    useEffect(() => {
        const pool = {};
        const ticketIds = ticketItemIdsRef.current || [];
        (Array.isArray(availableItems) ? availableItems : []).forEach(item => {
            if (!item.serial_number_required) {
                const eligible = item.status === "available" || (item.status === "in_use" && ticketIds.includes(item.id));
                if (eligible) {
                    const key = `${item.inventory_id}-${item.warehouse}`;
                    if (!pool[key]) pool[key] = [];
                    pool[key].push(item);
                }
            }
        });
        availablePoolRef.current = pool;
    }, [availableItems, ticketDetails]);

    const fetchAvailableItems = async () => {
        try {
            const response = await api.get("/common/api/inventory-items?all=true");
            // Filter out items already assigned to another assembly ticket, unless they are in the current ticket
            let filtered = response.data;
            if (isEditMode && ticketDetails) {
                filtered = response.data.filter(item => {
                    if (Array.isArray(item.assembly_ticket_ids)) {
                        return item.assembly_ticket_ids.length === 0 || item.assembly_ticket_ids.includes(ticketDetails.id);
                    }
                    return true;
                });
            } else {
                filtered = response.data.filter(item => {
                    if (Array.isArray(item.assembly_ticket_ids)) {
                        return item.assembly_ticket_ids.length === 0;
                    }
                    return true;
                });
            }
            setAvailableItems(filtered);
        } catch (error) {
            console.error("Error fetching available items:", error);
            toast.error("Failed to load available items");
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get("/common/api/inventory-categories?all=true");
            setCategories(response.data.map((cat) => ({
                value: cat.id,
                label: cat.name,
            })));
        } catch (error) {
            console.error("Error fetching categories:", error);
            toast.error("Failed to load categories");
        }
    };

    const fetchTechnicians = async () => {
        try {
            const response = await api.get("/auth/technician-users/", { params: { all: true } });
            setAvailableTechnicians(response.data);
        } catch (error) {
            console.error("Error fetching technicians:", error);
            toast.error("Failed to load technicians");
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleAssembledItemAttributeChange = (field, value) => {
        setAssembledItemAttributes(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    // Create technician options for the dropdown
    const technicianOptions = useMemo(() => 
        availableTechnicians.map(tech => ({
            value: tech.id,
            label: tech.username || tech.email || `User ${tech.id}`,
        })), [availableTechnicians]
    );

    // Options for bulk-selecting simple inventory (serial_number_required === false)
    const simpleInventoryOptions = useMemo(() => {
        const map = {};
        (Array.isArray(availableItems) ? availableItems : []).forEach(item => {
            const ticketIds = ticketItemIdsRef.current || [];
            const eligible = item.status === "available" || (item.status === "in_use" && ticketIds.includes(item.id));
            if (!item.serial_number_required && eligible) {
                const key = `${item.inventory_id}-${item.warehouse}`;
                if (!map[key]) {
                    map[key] = {
                        value: key,
                        label: `${item.inventory_name} (${item.warehouse_name})`,
                        inventory_id: item.inventory_id,
                        warehouse_id: item.warehouse,
                        inventory_name: item.inventory_name,
                        warehouse_name: item.warehouse_name,
                    };
                }
            }
        });
        return Object.values(map);
    }, [availableItems]);

    // Item management functions (similar to regular ticket system)
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
            const itemToRemove = prev[index];
            const itemIdToRemove = itemToRemove.item_id;
            setUsedItems(prevUsed => prevUsed.filter(id => id !== itemIdToRemove));
            setDefectiveItems(prevDefective => prevDefective.filter(id => id !== itemIdToRemove));
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    // Bulk group helpers
    const handleAddBulkGroup = useCallback(() => {
        if (!bulkInventoryOption) {
            toast.error("Select inventory");
            return;
        }
        // Allow empty string
        if (bulkQuantity === "" || Number(bulkQuantity) < 1) {
            toast.error("Quantity must be at least 1");
            return;
        }
        const pool = availablePoolRef.current[bulkInventoryOption.value] || [];
        const existing = bulkGroups.find(g => g.key === bulkInventoryOption.value);
        const existingQty = existing ? (existing.quantity === "" ? 0 : Number(existing.quantity)) : 0;
        const allowedRemaining = pool.length - existingQty;
        if (Number(bulkQuantity) > allowedRemaining) {
            toast.error(`Only ${allowedRemaining} items available for selected inventory.`);
            return;
        }
        setBulkGroups(prev => {
            const existingIndex = prev.findIndex(g => g.key === bulkInventoryOption.value);
            if (existingIndex !== -1) {
                const updated = [...prev];
                const prevQty = updated[existingIndex].quantity === "" ? 0 : Number(updated[existingIndex].quantity);
                updated[existingIndex].quantity = prevQty + Number(bulkQuantity);
                return updated;
            }
            return [
                ...prev,
                {
                    key: bulkInventoryOption.value,
                    inventory_id: bulkInventoryOption.inventory_id,
                    inventory_name: bulkInventoryOption.inventory_name,
                    warehouse_id: bulkInventoryOption.warehouse_id,
                    warehouse_name: bulkInventoryOption.warehouse_name,
                    quantity: Number(bulkQuantity),
                    used_qty: 0,
                    defective_qty: 0,
                    item_ids: [], // will be filled on submit / edit load
                },
            ];
        });
        setBulkInventoryOption(null);
        setBulkQuantity(1);
    }, [bulkInventoryOption, bulkQuantity, bulkGroups]);

    const handleRemoveBulkGroup = useCallback((key) => {
        setBulkGroups(prev => prev.filter(g => g.key !== key));
    }, []);

    // In the bulkGroups state, allow quantity to be a string for editing
    // Update updateBulkGroupQuantity to handle empty string and not coerce to 0 immediately
    const updateBulkGroupQuantity = useCallback((key, value) => {
        setBulkGroups(prev => prev.map(g => {
            if (g.key !== key) return g;
            // Allow empty string for editing
            if (value === "") {
                return { ...g, quantity: "" };
            }
            let newQty = parseInt(value, 10);
            if (isNaN(newQty) || newQty < 0) newQty = 0;
            const pool = availablePoolRef.current[key] || [];
            if (newQty > pool.length) newQty = pool.length;
            // Ensure used/defective do not exceed newQty
            const newUsed = Math.min(g.used_qty, newQty);
            const remainingForDef = newQty - newUsed;
            const newDef = Math.min(g.defective_qty, remainingForDef);
            const trimmedIds = (g.item_ids || []).slice(0, newQty);
            return { ...g, quantity: newQty, used_qty: newUsed, defective_qty: newDef, item_ids: trimmedIds };
        }));
    }, []);

    const updateBulkGroupCounts = useCallback((key, field, value) => {
        setBulkGroups(prev => prev.map(g => {
            if (g.key !== key) return g;
            // Allow empty string for editing
            if (value === "") {
                return { ...g, [field]: "" };
            }
            let newVal = parseInt(value, 10);
            if (isNaN(newVal) || newVal < 0) newVal = 0;
            const otherField = field === 'used_qty' ? 'defective_qty' : 'used_qty';
            const maxAllowed = g.quantity === "" ? 0 : g.quantity - (g[otherField] === "" ? 0 : g[otherField]);
            if (newVal > maxAllowed) newVal = maxAllowed;
            return { ...g, [field]: newVal };
        }));
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
                    if (prevItemId) {
                        if (usedItems.includes(prevItemId)) {
                            setUsedItems(prevUsed => prevUsed.filter(id => id !== prevItemId));
                        }
                        setDefectiveItems(prevDefective => prevDefective.filter(id => id !== prevItemId));
                    }
                }
            }
            return updatedItems;
        });
    }, [availableItems, usedItems]);

    const handleUsedItemChange = useCallback((itemId, isChecked) => {
        setUsedItems(prev => {
            if (isChecked) {
                // If marking as used, remove from defective items
                setDefectiveItems(prevDefective => prevDefective.filter(id => id !== itemId));
                return [...prev, itemId];
            } else {
                return prev.filter(id => id !== itemId);
            }
        });
    }, []);

    const handleDefectiveItemChange = useCallback((itemId, isChecked) => {
        setDefectiveItems(prev => {
            if (isChecked) {
                // If marking as defective, remove from used items
                setUsedItems(prevUsed => prevUsed.filter(id => id !== itemId));
                return [...prev, itemId];
            } else {
                return prev.filter(id => id !== itemId);
            }
        });
    }, []);

    const getFilteredItemOptions = useCallback((currentIndex) => {
        const selectedItemIds = selectedItems
            .filter((_, index) => index !== currentIndex)
            .map(item => item.item_id)
            .filter(Boolean);

        // Get IDs of items associated with the current ticket
        const ticketItemIds = (ticketDetails?.items || []).map(item => item.id);

        return (Array.isArray(availableItems) ? availableItems : [])
            .filter(item =>
                !item.serial_number_required ? false :
                !selectedItemIds.includes(item.id) && // Exclude already selected items in current form
                (
                    item.status === 'available' || // Include all available items
                    (item.status === 'in_use' && ticketItemIds.includes(item.id)) // Include in_use items only if they are in the current ticket
                )
            )
            .map(item => ({
                value: item.id,
                label: `${item.inventory_name} (${item.warehouse_name}) - ${Object.entries(item.attributes || {})
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ') || 'No attributes'}`
            }));
    }, [availableItems, selectedItems, ticketDetails]);

    const validateForm = () => {
        if (!formData.title.trim()) {
            toast.error("Title is required");
            return false;
        }

        if (!formData.description.trim()) {
            toast.error("Description is required");
            return false;
        }

        const totalItemsCount = selectedItems.length + bulkGroups.reduce((acc, g) => acc + g.quantity, 0);
        if (totalItemsCount === 0) {
            toast.error("At least one item is required");
            return false;
        }

        // Validate bulk group counts
        for (const group of bulkGroups) {
            if (group.used_qty + group.defective_qty > group.quantity) {
                toast.error(`Used + Defective exceeds quantity for ${group.inventory_name}`);
                return false;
            }
        }

        // Validate that all selected items have an item_id
        for (let i = 0; i < selectedItems.length; i++) {
            if (!selectedItems[i].item_id) {
                toast.error(`Item ${i + 1}: Please select an inventory item`);
                return false;
            }
        }

        // Validate assembled item attributes if serial number is required
        if (assembledItems[selectedAssembledIndex]?.serial_number_required) {
            const requiredFields = ['serial_number', 'mac_address', 'ip_address', 'service_tag', 'service_number'];
            for (const field of requiredFields) {
                if (!assembledItems[selectedAssembledIndex].attributes_list?.[0]?.[field]?.trim()) {
                    toast.error(`Assembled item ${field.replace('_', ' ')} is required`);
                    return false;
                }
            }
        }

        // Validate that all assembled items have required fields
        for (let i = 0; i < assembledItems.length; i++) {
            const item = assembledItems[i];
            if (!item.name?.toString().trim()) {
                toast.error(`Assembled item ${i + 1}: Name is required`);
                return false;
            }
            if (!item.unit_price || isNaN(Number.parseFloat(item.unit_price)) || Number.parseFloat(item.unit_price) <= 0) {
                toast.error(`Assembled item ${i + 1}: Valid unit price is required`);
                return false;
            }
            if (!item.price || isNaN(Number.parseFloat(item.price)) || Number.parseFloat(item.price) <= 0) {
                toast.error(`Assembled item ${i + 1}: Price is required (auto-calculated from unit price)`);
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Build sets first for clarity
        const usedSet = new Set();
        const defectiveSet = new Set();

        let allItemIds = selectedItems.map(item => item.item_id).filter(Boolean);

        // Expand bulk groups into individual item IDs
        for (const group of bulkGroupsRef.current) { // Use ref.current here
            const pool = availablePoolRef.current[group.key] || [];
            let groupIds = [...(group.item_ids || [])];
            const needed = group.quantity - groupIds.length;
            if (needed > 0) {
                const remaining = pool.filter(it => !groupIds.includes(it.id) && !allItemIds.includes(it.id));
                if (remaining.length < needed) {
                    toast.error(`Not enough available items for ${group.inventory_name}`);
                    return;
                }
                groupIds = groupIds.concat(remaining.slice(0, needed).map(it => it.id));
            } else if (needed < 0) {
                groupIds = groupIds.slice(0, group.quantity);
            }
            allItemIds = allItemIds.concat(groupIds);

            // allocate used/defective ids from groupIds
            const usedSlice = groupIds.slice(0, group.used_qty);
            const defectiveSlice = groupIds.slice(group.used_qty, group.used_qty + group.defective_qty);
            usedSlice.forEach(id => usedSet.add(id));
            defectiveSlice.forEach(id => defectiveSet.add(id));
        }

        // Serial item checkbox selections
        usedItems.forEach(itemId => {
            if (allItemIds.includes(itemId)) usedSet.add(itemId);
        });

        defectiveItems.forEach(itemId => {
            if (allItemIds.includes(itemId)) defectiveSet.add(itemId);
        });

        // Ensure exclusivity
        defectiveSet.forEach(id => {
            if (usedSet.has(id)) defectiveSet.delete(id);
        });

        // Final sanity: if a group's used_qty is zero, ensure its IDs are not in usedSet
        bulkGroupsRef.current.forEach(group => { // Use ref.current here
            if (group.used_qty === 0) {
                const groupIds = [...(group.item_ids || [])];
                groupIds.forEach(id => usedSet.delete(id));
            }
            if (group.defective_qty === 0) {
                const groupIds = [...(group.item_ids || [])];
                groupIds.forEach(id => defectiveSet.delete(id));
            }

            // Enforce per-group caps in case some IDs (e.g. from a previous edit) are still present
            // in `usedSet` / `defectiveSet`. We iterate the group's item_ids in order and keep
            // only up to the specified quota.
            const groupItemIds = [...(group.item_ids || [])];

            // Trim USED ids beyond the allowed `used_qty`
            if (group.used_qty < groupItemIds.length) {
                let seen = 0;
                groupItemIds.forEach(id => {
                    if (usedSet.has(id)) {
                        if (seen < group.used_qty) {
                            seen += 1; // keep
                        } else {
                            usedSet.delete(id); // exceed quota ⇒ remove
                        }
                    }
                });
            }

            // Trim DEFECTIVE ids beyond the allowed `defective_qty`
            if (group.defective_qty < groupItemIds.length) {
                let seenDef = 0;
                groupItemIds.forEach(id => {
                    if (defectiveSet.has(id)) {
                        if (seenDef < group.defective_qty) {
                            seenDef += 1; // keep
                        } else {
                            defectiveSet.delete(id); // exceed quota ⇒ remove
                        }
                    }
                });
            }
        });

        // Ensure set sizes match the user-specified counts. This serves as a final guard in
        // case any earlier logic ends up with more IDs than the counts allow.
        const expectedUsed = bulkGroupsRef.current.reduce((n, g) => n + g.used_qty, 0) + usedItems.length;
        const expectedDef = bulkGroupsRef.current.reduce((n, g) => n + g.defective_qty, 0) + defectiveItems.length;

        if (usedSet.size > expectedUsed) {
            const extra = Array.from(usedSet).slice(expectedUsed);
            extra.forEach(id => usedSet.delete(id));
        }

        if (defectiveSet.size > expectedDef) {
            const extraD = Array.from(defectiveSet).slice(expectedDef);
            extraD.forEach(id => defectiveSet.delete(id));
        }

        // Rebuild dictionaries after pruning
        // Start by marking every selected item as false. This way, if an item was previously
        // marked as used/defective but the user has now decreased the counts, we explicitly
        // send `false` for that item instead of leaving it unchanged.
        const itemUsagesDict = {};
        const defectiveItemsDict = {};

        // Initialize all items to false so that removed items are correctly cleared.
        allItemIds.forEach(id => {
            itemUsagesDict[id] = false;
            defectiveItemsDict[id] = false;
        });

        // Now override the ones that are actually marked as used / defective.
        usedSet.forEach(id => { itemUsagesDict[id] = true; });
        defectiveSet.forEach(id => { defectiveItemsDict[id] = true; });

        // Flag removals (explicit false) when editing
        if (isEditMode && ticketDetails) {
            const prevUsedIds = Object.keys(ticketDetails.item_usages || {}).map(Number);
            prevUsedIds.forEach(id => {
                if (!usedSet.has(id)) {
                    itemUsagesDict[id] = false;
                }
            });

            const prevDefectiveIds = Object.keys(ticketDetails.defective_items || {}).map(Number);
            prevDefectiveIds.forEach(id => {
                if (!defectiveSet.has(id)) {
                    defectiveItemsDict[id] = false;
                }
            });
        }

        const payload = {
            ...formData,
            ticket_items: allItemIds,
            item_usages: itemUsagesDict,
            defective_items: defectiveItemsDict,
            assembled_items: assembledItems.map(item => ({
                ...item,
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.unit_price) || 0,
                price: Number(item.price) || 0,
                attributes_list: item.serial_number_required ? (item.attributes_list || []).slice(0, Number(item.quantity) || 1) : [],
            })),
            assembled_item_attributes: null, // Not used anymore, but set to null for compatibility
            assigned_to: assignedTechnicians,
        };

        try {
            await onSubmit(payload);
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    const customStyles = {
        control: (provided) => ({
            ...provided,
            borderColor: "#D1D5DB",
            "&:hover": {
                borderColor: "#9CA3AF",
            },
        }),
    };

    return (
        <div className="p-1  md:w-2xl w-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                    {isEditMode ? "Edit Assembly Ticket" : "Create Assembly Ticket"}
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
               

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleChange("title", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isTicketClosed || isTechnician}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Deadline
                        </label>
                        <input
                            type="date"
                            value={formData.deadline}
                            onChange={(e) => handleChange("deadline", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isTicketClosed || isTechnician}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={isTicketClosed || isTechnician}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assign To Technicians
                    </label>
                    <Select
                        isMulti
                        options={technicianOptions}
                        value={technicianOptions.filter(opt => assignedTechnicians.includes(opt.value))}
                        onChange={selectedOptions => {
                            const selectedIds = selectedOptions ? selectedOptions.map(s => s.value) : [];
                            if (selectedIds.length <= 3) {
                                setAssignedTechnicians(selectedIds);
                            } else {
                                toast.error('You can assign a maximum of 3 technicians.');
                                setAssignedTechnicians(selectedIds.slice(0, 3));
                            }
                        }}
                        styles={customStyles}
                        placeholder="Search and select technicians..."
                        isClearable
                        isDisabled={isTicketClosed || isTechnician}
                    />
                    <p className="text-sm text-gray-500 mt-1">Max 3 Technicians can be assigned.</p>
                </div>

                 {/* Assembled Items Section */}
                 <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold mb-0">Assembled Items</h3>
                        {!isTechnician && (
                            <PrimaryBtn type="button" className="px-3 py-1 bg-blue-500 text-white rounded" onClick={addAssembledItem}>Add Item</PrimaryBtn>
                        )}
                    </div>
                    <div className="flex flex-row gap-2 mb-4 flex-wrap">
                        {assembledItems.map((item, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className={`relative flex items-center px-4 py-2 rounded shadow-sm border transition-colors duration-150 ${selectedAssembledIndex === idx ? 'bg-blue-100 border-blue-400' : 'bg-gray-100 border-gray-300'} hover:bg-blue-50`}
                                onClick={() => setSelectedAssembledIndex(idx)}
                            >
                                <span className="pr-6">{item.name ? (item.name.length > 20 ? item.name.slice(0, 20) + '...' : item.name) : `AssembledItem #${idx + 1}`}</span>
                                {assembledItems.length > 1 && !isTechnician && (
                                    <span
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 cursor-pointer"
                                        onClick={e => { e.stopPropagation(); removeAssembledItem(idx); }}
                                        title="Delete"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    {/* Details Form for Selected Item */}
                    {assembledItems[selectedAssembledIndex] && (
                        <div className="mb-4 bg-gray">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                    <input type="text" value={assembledItems[selectedAssembledIndex].name} onChange={e => updateAssembledItem(selectedAssembledIndex, 'name', e.target.value)} className="w-full px-2 py-1 border rounded" required  placeholder="Assemble Machine Name" disabled={isTechnician} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">UPC</label>
                                    <input type="text" value={assembledItems[selectedAssembledIndex].upc} onChange={e => updateAssembledItem(selectedAssembledIndex, 'upc', e.target.value)} className="w-full px-2 py-1 border rounded" required placeholder="Enter the UPC" disabled={isTechnician} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                                    <Select options={categories} value={categories.find(cat => cat.value === assembledItems[selectedAssembledIndex].category)} onChange={opt => updateAssembledItem(selectedAssembledIndex, 'category', opt?.value || '')} styles={customStyles} placeholder="Select Category" className="w-full" isClearable  isDisabled={isTechnician} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                                    <input type="number" step="0.01" value={assembledItems[selectedAssembledIndex].unit_price} onChange={e => updateAssembledItem(selectedAssembledIndex, 'unit_price', e.target.value)} className="w-full px-2 py-1 border rounded" required placeholder="Enter Price of Unit" disabled={isTechnician} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                                    <input 
                                        type="text" 
                                        value={assembledItems[selectedAssembledIndex].price} 
                                        readOnly 
                                        className="w-full px-2 py-1 border rounded bg-gray-50 text-gray-600 cursor-not-allowed" 
                                        placeholder="Auto-calculated"
                                        disabled={isTechnician}
                                    />
                                    {assembledItems[selectedAssembledIndex].unit_price && !isNaN(Number.parseFloat(assembledItems[selectedAssembledIndex].unit_price)) && (
                                        <span className="text-xs text-green-600">Auto-calculated via Price Matrix</span>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                    <input type="number" min={1} value={assembledItems[selectedAssembledIndex].quantity} onChange={e => updateAssembledItem(selectedAssembledIndex, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-2 py-1 border rounded" required disabled={isTechnician} />
                                </div>
                                <div className="flex items-center mt-2">
                                    <input type="checkbox" checked={assembledItems[selectedAssembledIndex].serial_number_required} onChange={e => updateAssembledItem(selectedAssembledIndex, 'serial_number_required', e.target.checked)} className="mr-2" disabled={isTechnician} />
                                    <label className="text-xs font-medium text-gray-700">Serial Number Required</label>
                                </div>
                            </div>
                            {assembledItems[selectedAssembledIndex].serial_number_required && (
                                <div className="mt-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Serial Attributes (one per quantity)</label>
                                    {[...Array(assembledItems[selectedAssembledIndex].quantity)].map((_, attrIdx) => (
                                        <div key={attrIdx} className="grid grid-cols-5 gap-2 mb-1">
                                            {['serial_number', 'mac_address', 'ip_address', 'service_tag', 'service_number'].map(field => (
                                                <input
                                                    key={field}
                                                    type="text"
                                                    placeholder={field.replace('_', ' ')}
                                                    value={assembledItems[selectedAssembledIndex].attributes_list?.[attrIdx]?.[field] || ''}
                                                    onChange={e => {
                                                        const newList = assembledItems[selectedAssembledIndex].attributes_list ? [...assembledItems[selectedAssembledIndex].attributes_list] : [];
                                                        newList[attrIdx] = { ...newList[attrIdx], [field]: e.target.value };
                                                        updateAttributesList(selectedAssembledIndex, newList);
                                                    }}
                                                    disabled={isTechnician}
                                                    className="px-2 py-1 border rounded text-xs"
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Items Used in Assembly */}
                <div className="border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">
                            {isEditMode ? "Items in Assembly Ticket" : "Items Used in Assembly"}
                        </h3>
                        {!isTicketClosed && (
                            <PrimaryBtn
                                onClick={() => setShowInventorySelection(true)}
                                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Select</span>
                            </PrimaryBtn>
                        )}
                    </div>

                    {selectedItems.length + bulkGroups.length > 0 ? (
                        <div className="space-y-3">
                            {bulkGroups.map(group => (
                                <div key={group.key} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{group.inventory_name}</h4>
                                            <p className="text-sm text-gray-600">Warehouse: {group.warehouse_name}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <span>Quantity:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={group.quantity === 0 ? "0" : group.quantity === "" ? "" : group.quantity}
                                                    onChange={e => updateBulkGroupQuantity(group.key, e.target.value)}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                                                    disabled={isTicketClosed || isTechnician}
                                                />
                                                <span>(Used {group.used_qty}, Defective {group.defective_qty})</span>
                                            </div>
                                        </div>
                                        {!isTicketClosed && !isTechnician && (
                                            <button type="button" onClick={() => handleRemoveBulkGroup(group.key)} className="ml-2 text-red-600 hover:text-red-800 p-1">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {selectedItems.map((item, idx) => {
                                const isUsed = item.item_id && usedItems.includes(item.item_id);
                                const isDefective = item.item_id && defectiveItems.includes(item.item_id);
                                
                                return (
                                    <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">{item.inventory_name}</h4>
                                                <p className="text-sm text-gray-600">Warehouse: {item.warehouse_name}</p>
                                                {Object.entries(item.attributes || {}).length > 0 && (
                                                    <p className="text-sm text-gray-600">
                                                        Attributes: {Object.entries(item.attributes || {})
                                                            .map(([key, value]) => `${key}: ${value}`)
                                                            .join(', ')}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 mt-2">
                                                    {isUsed && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            Used
                                                        </span>
                                                    )}
                                                    {isDefective && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            Defective
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {!isTicketClosed && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="ml-2 text-red-600 hover:text-red-800 p-1"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                            <p>No items selected</p>
                            <p className="text-sm">Click "Select Items" to add inventory items</p>
                        </div>
                    )}

                    {selectedItems.length + bulkGroups.length > 0 && (
                        <div className="text-sm text-gray-600 mt-4">
                            <p>Total Items: {selectedItems.length + bulkGroups.reduce((acc, g) => acc + g.quantity, 0)}</p>
                            <p>Used Items: {usedItems.length}</p>
                            {defectiveItems.length > 0 && (
                                <p>Defective Items: {defectiveItems.length}</p>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assembly Notes
                    </label>
                    <textarea
                        value={formData.assembly_notes}
                        onChange={(e) => handleChange("assembly_notes", e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add any additional notes..."
                        disabled={isTicketClosed}
                    />
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                    <SecondaryBtn type="button" onClick={onclose}>
                        Cancel
                    </SecondaryBtn>
                    {!isTicketClosed && (
                        <PrimaryBtn type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : (isEditMode ? "Update Ticket" : "Create Ticket")}
                        </PrimaryBtn>
                    )}
                </div>
            </form>

            {/* Inventory Selection Popup */}
            {showInventorySelection && (
                <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">Select Inventory Items</h2>
                            <button 
                                onClick={() => setShowInventorySelection(false)} 
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">
                                    {isEditMode ? "Items in Assembly Ticket" : "Items Used in Assembly"}
                                </h3>
                                {!isTicketClosed && !isTechnician && (
                                    <PrimaryBtn
                                        onClick={addItem}
                                        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        <span>Add Item</span>
                                    </PrimaryBtn>
                                )}
                            </div>

                            <div className="space-y-4">
                                {/* Bulk add section */}
                                {!isTicketClosed && !isTechnician && (
                                    <div className="border border-gray-200 rounded-lg p-4 space-y-2">
                                        <h4 className="font-medium">Add Non-Serialized Items (Bulk)</h4>
                                        <div className="flex flex-col md:flex-row gap-3 ">
                                            <div className="flex-1">
                                                <Select
                                                    options={simpleInventoryOptions}
                                                    value={bulkInventoryOption}
                                                    onChange={setBulkInventoryOption}
                                                    styles={customStyles}
                                                    placeholder="Select inventory"
                                                    isClearable
                                                />
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                value={bulkQuantity === 0 ? "0" : bulkQuantity === "" ? "" : bulkQuantity}
                                                onChange={e => setBulkQuantity(e.target.value)}
                                                className=" px-3  border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <PrimaryBtn type="button" onClick={handleAddBulkGroup}>Add</PrimaryBtn>
                                        </div>
                                    </div>
                                )}
                                {selectedItems.map((item, idx) => {
                                    const isUsed = item.item_id && usedItems.includes(item.item_id);
                                    const isDefective = item.item_id && defectiveItems.includes(item.item_id);
                                    const isExistingItem = item.item_id;

                                    return (
                                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    {isExistingItem ? (
                                                        <div className="border border-gray-200 rounded p-3 bg-gray-50">
                                                            <h4 className="font-medium text-gray-900">{item.inventory_name}</h4>
                                                            <p className="text-sm text-gray-600">Warehouse: {item.warehouse_name}</p>
                                                            {Object.entries(item.attributes || {}).length > 0 && (
                                                                <p className="text-sm text-gray-600">
                                                                    Attributes: {Object.entries(item.attributes || {})
                                                                        .map(([key, value]) => `${key}: ${value}`)
                                                                        .join(', ')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Select
                                                            options={getFilteredItemOptions(idx)}
                                                            value={getFilteredItemOptions(idx).find(opt => opt.value === item.item_id)}
                                                            onChange={(opt) => updateItem(idx, "item", opt?.value)}
                                                            styles={customStyles}
                                                            placeholder="Select inventory item"
                                                            isDisabled={isTicketClosed || isTechnician}
                                                        />
                                                    )}
                                                </div>
                                                {!isTicketClosed && !isTechnician && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(idx)}
                                                        className="ml-2 text-red-600 hover:text-red-800 p-1"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {item.item_id && (
                                                <div className="mt-3 text-sm text-gray-600">
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isUsed}
                                                                onChange={e => handleUsedItemChange(item.item_id, e.target.checked)}
                                                                className="form-checkbox h-4 w-4 text-blue-600"
                                                                disabled={isDefective || isTicketClosed}
                                                            />
                                                            <span>Used in Assembly</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isDefective}
                                                                onChange={e => handleDefectiveItemChange(item.item_id, e.target.checked)}
                                                                className="form-checkbox h-4 w-4 text-red-500"
                                                                disabled={isUsed || isTicketClosed}
                                                            />
                                                            <span>Defective</span>
                                                        </div>
                                                    </div>
                                                    {!isExistingItem && (
                                                        <div className="mt-2 space-y-1">
                                                            <p>Item Name: {item.inventory_name}</p>
                                                            <p>Warehouse: {item.warehouse_name}</p>
                                                            {Object.entries(item.attributes || {}).length > 0 && (
                                                                <p>Attributes: {Object.entries(item.attributes || {})
                                                                    .map(([key, value]) => `${key}: ${value}`)
                                                                    .join(', ')}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Bulk group listing inside selection popup */}
                                {bulkGroups.map(group => (
                                    <div key={group.key} className=" border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="font-medium text-gray-900">{group.inventory_name}</h4>
                                                <p className="text-sm text-gray-600">Warehouse: {group.warehouse_name}</p>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <span>Quantity:</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={group.quantity === 0 ? "0" : group.quantity === "" ? "" : group.quantity}
                                                        onChange={e => updateBulkGroupQuantity(group.key, e.target.value)}
                                                        className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                                                        disabled={isTicketClosed}
                                                    />
                                                    <span>(Used {group.used_qty}, Defective {group.defective_qty})</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <span>Used ({group.used_qty})</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={group.used_qty === 0 ? "0" : group.used_qty === "" ? "" : group.used_qty}
                                                            onChange={e => updateBulkGroupCounts(group.key, 'used_qty', e.target.value)}
                                                            className="w-16 px-2 py-1 border border-gray-300 rounded-md"
                                                            disabled={isTicketClosed}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span>Defective ({group.defective_qty})</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={group.defective_qty === 0 ? "0" : group.defective_qty === "" ? "" : group.defective_qty}
                                                            onChange={e => updateBulkGroupCounts(group.key, 'defective_qty', e.target.value)}
                                                            className="w-16 px-2 py-1 border border-gray-300 rounded-md"
                                                            disabled={isTicketClosed}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            {!isTicketClosed && !isTechnician && (
                                                <button type="button" onClick={() => handleRemoveBulkGroup(group.key)} className="text-red-600 hover:text-red-800 p-1">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {selectedItems.length + bulkGroups.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No items selected. Click "Add Item" to start.</p>
                                    </div>
                                )}

                                {selectedItems.length + bulkGroups.length > 0 && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-medium mb-2">Summary</h4>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p>Total Items: {selectedItems.length + bulkGroups.reduce((acc, g) => acc + g.quantity, 0)}</p>
                                            <p>Used Items: {usedItems.length}</p>
                                            {defectiveItems.length > 0 && (
                                                <p>Defective Items: {defectiveItems.length}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-6 border-t mt-6">
                            <SecondaryBtn
                                type="button"
                                onClick={() => setShowInventorySelection(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Close
                            </SecondaryBtn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssemblyTicketFormPopup; 