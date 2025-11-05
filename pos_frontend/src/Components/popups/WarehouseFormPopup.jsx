import { useState, useEffect } from "react";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import api from "../../utils/api";
import Select from "react-select";
import toast from "react-hot-toast";
import Spinner from "../Common/Spinner";

const WarehouseFormPopup = ({
    onClose,
    onSubmit,
    warehouse = null,
}) => {
    // Form state
    const [formData, setFormData] = useState({
        id: null,
        name: "",
        status: "active",
    });

    // Manager assignment state
    const [newManager, setNewManager] = useState({
        managerId: ""
    });
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Current managers state
    const [assignedManagers, setAssignedManagers] = useState([]);
    
    // Fetch managers on component mount
    useEffect(() => {
        const fetchManagers = async () => {
            try {
                setLoading(true);
                const response = await api.get("/auth/get-users/", {
                    params: { role: "Warehouse Manager", all: true }
                });
                setManagers(response.data);
            } catch (error) {
                console.error("Error fetching managers:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchManagers();
    }, []);

    // Process warehouse data whenever it changes or when managers load
    useEffect(() => {
        // Only process if we have a warehouse
        if (!warehouse) {
            resetForm();
            return;
        }
        
        // Set basic warehouse info
        setFormData({
            id: warehouse.id,
            name: warehouse.name,
            status: warehouse.status,
        });
        
        // Only process warehouse managers if we have managers loaded
        if (managers.length === 0 || !warehouse.warehouse_managers) {
            return;
        }
        
        // Process each manager in the warehouse_managers array
        const processedManagers = warehouse.warehouse_managers.map(wm => {
            // Determine the manager ID based on the structure
            // It could be either an ID directly or a manager object with an ID
            const managerId = typeof wm.manager === 'object' ? wm.manager.id : wm.manager;
            
            // Find the manager in our loaded managers array
            const foundManager = managers.find(m => m.id === managerId);
            
            return {
                id: wm.id,
                manager: foundManager || null
            };
        }).filter(m => m.manager !== null); // Remove any entries where manager wasn't found
        
        setAssignedManagers(processedManagers);
    }, [warehouse, managers]);

    const resetForm = () => {
        setFormData({
            id: null,
            name: "",
            status: "active",
        });
        setNewManager({
            managerId: ""
        });
        setAssignedManagers([]);
    };

    const handleWarehouseChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleManagerChange = (selectedOption) => {
        setNewManager((prev) => ({
            ...prev,
            managerId: selectedOption ? selectedOption.value : "",
        }));
    };

    const addManager = () => {
        if (!newManager.managerId) return;

        const managerId = parseInt(newManager.managerId);
        const selectedManager = managers.find(m => m.id === managerId);

        if (!selectedManager) return;

        // Check if manager is already assigned
        if (assignedManagers.some(m => m.manager && m.manager.id === selectedManager.id)) {
            toast.error("This manager is already assigned to this warehouse");
            return;
        }

        setAssignedManagers(prev => [
            ...prev,
            {
                id: null, // Will be set by backend when saved
                manager: selectedManager
            }
        ]);

        // Reset the new manager form
        setNewManager({
            managerId: ""
        });
    };

    const removeManager = (managerAssignmentId, index) => {
        // If there's no ID (newly added manager), remove by index
        if (!managerAssignmentId) {
            setAssignedManagers(prev => 
                prev.filter((_, idx) => idx !== index)
            );
            return;
        }
        
        // Otherwise remove by ID
        setAssignedManagers(prev =>
            prev.filter(m => m.id !== managerAssignmentId)
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name) {
            alert("Warehouse name is required");
            return;
        }

        // Create a safe payload with null checks
        const payload = {
            ...formData,
            warehouse_managers: assignedManagers
                .filter(m => m && m.manager) // Filter out any invalid entries
                .map(m => ({
                    id: m.id,
                    manager: m.manager.id
                })),
        };
        
        onSubmit(payload);
        onClose();
    };

    // Prepare the options for react-select
    const managerOptions = managers.map(manager => ({
        value: manager.id,
        label: `${manager.username}`,
    }));

    return (
        <div className="transform transition-all" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-lg">Warehouse Information</h3>
                    <div className="space-y-1">
                        <label className="block text-gray-700 font-medium">Name*</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ""}
                            onChange={handleWarehouseChange}
                            required
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-gray-700 font-medium">Status</label>
                        <select
                            name="status"
                            value={formData.status || "active"}
                            onChange={handleWarehouseChange}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-lg">Warehouse Managers</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        {!loading && (
                            <>
                                <div className="space-y-1">
                                    <label className="block text-gray-700 font-medium">Manager</label>
                                    <Select
                                        name="managerId"
                                        value={newManager.managerId ? managerOptions.find(option => option.value === parseInt(newManager.managerId)) : null}
                                        onChange={handleManagerChange}
                                        options={managerOptions}
                                        placeholder="Select Manager"
                                        isClearable
                                    />
                                </div>
                                <PrimaryBtn onClick={addManager} type="button">
                                    Add
                                </PrimaryBtn>
                            </>
                        )}
                    </div>
                    
                    {loading && (
                        <Spinner />
                    )}

                    {(!loading && assignedManagers.length > 0) && (
                        <div className="mt-4 space-y-2">
                            <h4 className="font-medium">Assigned Managers ({assignedManagers.length})</h4>
                            <div className="space-y-2 max-h-40 overflow-auto w-full">
                                {assignedManagers.map((manager, index) => (
                                    <div key={`manager-${index}-${manager.id || 'new'}`} className="grid grid-cols-6 gap-2 items-center p-2 bg-gray-50 rounded">
                                        <div className="col-span-4">
                                            <span className="font-medium">{manager?.manager?.username}</span>
                                            {manager?.manager?.email && (
                                                <div className="text-xs text-gray-500">{manager?.manager?.email}</div>
                                            )}
                                        </div>

                                        <div className="col-span-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeManager(manager.id, index)}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <PrimaryBtn type="submit">
                        {formData.id ? "Update Warehouse" : "Create Warehouse"}
                    </PrimaryBtn>
                </div>
            </form>
        </div>
    );
};

export default WarehouseFormPopup;