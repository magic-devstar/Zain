import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoArrowLeft, GoPlus, GoX } from "react-icons/go";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";
import Select from "react-select";
import { invoiceAPI, invoiceChargeTypeAPI } from "../../../api/invoices";
import api from "../../../utils/api";
import { toast } from "react-hot-toast";
import BackButton from "../../../Components/Common/BackButton";
import InvoiceChargeTypePopup from "../../../Components/popups/InvoiceChargeTypePopup";

// Utility function to format attribute keys
const formatAttributeKey = (key) => {
    return key
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

const InvoiceCreatePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [stores, setStores] = useState([]);
    const [chargeTypes, setChargeTypes] = useState([]);

    const [invoiceData, setInvoiceData] = useState({
        store: "",
        status: "PENDING",
        due_date: "",
        notes: "",
    });

    const [chargesData, setChargesData] = useState([]);
    const [showChargeTypePopup, setShowChargeTypePopup] = useState(false);
    const [isCreatingChargeType, setIsCreatingChargeType] = useState(false);

    // Fetch initial data
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [storesRes, chargeTypesRes] = await Promise.all([
                api.get("/auth/stores/?all=true"),
                invoiceChargeTypeAPI.getChargeTypes({ all: true, is_active: true, charge_type: "FIXED" })
            ]);

            console.log("Charge Types Response:", chargeTypesRes);

            const allStores = storesRes.data.map(store => ({
                value: store.id,
                label: `${store.store_name} (${store.customer_name})`
            }));

            const chargeTypesData = Array.isArray(chargeTypesRes) ? chargeTypesRes : [];
            setStores(allStores);
            setChargeTypes(chargeTypesData.map(ct => {
                const parsedValue = parseFloat(ct.value);
                const safeValue = isNaN(parsedValue) ? 0 : parsedValue;

                let label;
                if (ct.charge_type === 'FIXED') {
                    label = `${ct.name} ($${safeValue.toFixed(2)})`;
                } else if (ct.charge_type === 'PERCENTAGE') {
                    label = `${ct.name} (${safeValue.toFixed(2)}%)`;
                } else if (ct.charge_type === 'FIXED') {
                    label = `${ct.name} ($${safeValue.toFixed(2)})`;
                } else {
                    label = ct.name;
                }

                return {
                    ...ct,
                    value: ct.id, // Use ID as value for selection
                    amount: safeValue, // Store amount separately
                    label: label
                };
            }));
        } catch (error) {
            console.error("Error fetching initial data:", error);
            toast.error("Failed to load initial data");
        }
    };

    const handleStoreChange = (selectedOption) => {
        setInvoiceData(prev => ({
            ...prev,
            store: selectedOption ? selectedOption.value : "",
        }));
    };



    const handleAddCharge = () => {
        setChargesData((prev) => [
            ...prev,
            {
                charge_type_id: "",
                amount: "",
                description: "",
            },
        ]);
    };

    const handleRemoveCharge = (idx) => {
        setChargesData((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleChargeChange = (idx, field, value) => {
        setChargesData((prev) =>
            prev.map((charge, i) =>
                i === idx ? { ...charge, [field]: value } : charge
            )
        );
    };

    const handleChargeTypeChange = (idx, selectedOption) => {
        console.log("Selected Charge Type:", selectedOption);
        console.log("Current Charge Types:", chargeTypes);
        console.log("Current Charges Data:", chargesData);

        setChargesData((prev) =>
            prev.map((charge, i) => {
                if (i !== idx) return charge;

                if (!selectedOption) {
                    console.log(`Clearing charge type for index ${idx}`);
                    return {
                        ...charge,
                        charge_type_id: "",
                        amount: "",
                        description: charge.description || "",
                    };
                }

                const chargeType = chargeTypes.find(ct => ct.value === selectedOption.value);
                if (!chargeType) {
                    console.log(`Charge type not found for value ${selectedOption.value}`);
                    return charge;
                }

                // Only set the amount if it's not already manually entered
                let amount = charge.amount;
                if (!amount || amount === "") {
                    amount = chargeType.amount; // Use the stored amount value
                    if (chargeType.charge_type === "PERCENTAGE") {
                        // For percentage charges without items, use 0 as subtotal
                        const subtotal = 0;
                        amount = (subtotal * amount) / 100;
                    } else if (chargeType.charge_type === "FIXED") {
                        // For fixed charges, use the amount directly
                        amount = chargeType.amount;
                    }
                }

                console.log(`Updating charge ${idx} with charge_type_id: ${selectedOption.value}, amount: ${amount}`);
                return {
                    ...charge,
                    charge_type_id: selectedOption.value,
                    amount: amount.toString(),
                };
            })
        );
    };

    const handleCreateChargeType = async (chargeTypeData) => {
        setIsCreatingChargeType(true);
        try {
            const newChargeType = await invoiceChargeTypeAPI.createChargeType(chargeTypeData);
            toast.success("Charge type created successfully");
            
            // Add the new charge type to the list
            const parsedValue = parseFloat(newChargeType.value);
            const safeValue = isNaN(parsedValue) ? 0 : parsedValue;
            
            const newChargeTypeOption = {
                ...newChargeType,
                value: newChargeType.id, // Use ID as value for selection
                amount: safeValue, // Store amount separately
                label: `${newChargeType.name} (${newChargeType.charge_type === 'FIXED' ? `$${safeValue.toFixed(2)}` : `${safeValue.toFixed(2)}%`})`
            };
            
            setChargeTypes(prev => [...prev, newChargeTypeOption]);
            setShowChargeTypePopup(false);
        } catch (error) {
            console.error("Error creating charge type:", error);
            toast.error("Failed to create charge type");
        } finally {
            setIsCreatingChargeType(false);
        }
    };

    const validateForm = () => {
        const errors = [];

        if (!invoiceData.store) {
            errors.push("Store is required");
        }
        
        // Check if at least one charge is selected
        const selectedCharges = chargesData.filter(charge => charge.charge_type_id && charge.charge_type_id !== "");
        if (selectedCharges.length === 0) {
            errors.push("At least one charge is required");
        }
        
        // Only validate charges that have a charge_type_id (are actually selected)
        selectedCharges.forEach((charge, idx) => {
            if (!charge.amount || parseFloat(charge.amount) < 0) {
                errors.push(`Charge ${idx + 1}: Amount must be 0 or greater`);
            }
        });

        if (errors.length > 0) {
            errors.forEach((error) => toast.error(error));
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm() || loading) {
            return;
        }

        setLoading(true);
        try {
            const submitData = {
                ...invoiceData,
                items_data: [],
                charges_data: chargesData
                    .filter(charge => charge.charge_type_id && charge.charge_type_id !== "")
                    .map(charge => ({
                        charge_type_id: charge.charge_type_id,
                        amount: charge.amount,
                        description: charge.description,
                    })),
            };

            console.log("Submitting Invoice Data:", submitData);

            await invoiceAPI.createInvoice(submitData);
            toast.success("Invoice created successfully");
            navigate(-1);
        } catch (error) {
            console.error("Error creating invoice:", error);
            toast.error("Failed to create invoice");
        } finally {
            setLoading(false);
        }
    };

    const customStyles = {
        control: (provided) => ({
            ...provided,
            borderColor: "#d1d5db",
            "&:hover": {
                borderColor: "#9ca3af",
            },
        }),
    };

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Create Invoice</h1>
                    <p className="text-gray-600">Create a new invoice by manually selecting items and charges</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Invoice Details */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Store <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    options={stores}
                                    value={stores.find(s => s.value === invoiceData.store)}
                                    onChange={handleStoreChange}
                                    styles={customStyles}
                                    placeholder="Select Store"
                                    isClearable
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={invoiceData.due_date}
                                    onChange={(e) => setInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={invoiceData.notes}
                                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                                rows={3}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                placeholder="Additional notes for the invoice..."
                            />
                        </div>
                    </div>

                    {/* Additional Charges */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-800">Additional Charges</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowChargeTypePopup(true)}
                                    className="flex items-center px-3 py-1 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded"
                                >
                                    <GoPlus className="mr-1" />
                                    New Charge Type
                                </button>
                                <button
                                    onClick={handleAddCharge}
                                    className={`flex items-center px-3 py-1 text-sm ${
                                        chargesData.filter(charge => charge.charge_type_id && charge.charge_type_id !== "").length === 0
                                            ? "text-red-600 hover:text-red-800 border border-red-300 rounded"
                                            : "text-blue-600 hover:text-blue-800"
                                    }`}
                                >
                                    <GoPlus className="mr-1" />
                                    {chargesData.filter(charge => charge.charge_type_id && charge.charge_type_id !== "").length === 0 
                                        ? "Add Charge (Required)" 
                                        : "Add Charge"
                                    }
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {chargesData.map((charge, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-sm font-medium text-gray-700">Charge {idx + 1}</h3>
                                        <button
                                            onClick={() => handleRemoveCharge(idx)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <GoX />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Charge Type <span className="text-red-500">*</span>
                                            </label>
                                            <Select
                                                options={chargeTypes}
                                                value={chargeTypes.find(ct => ct.value === charge.charge_type_id)}
                                                onChange={(opt) => handleChargeTypeChange(idx, opt)}
                                                styles={customStyles}
                                                placeholder="Select Charge Type"
                                                isClearable
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Amount <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={charge.amount}
                                                onChange={(e) => handleChargeChange(idx, "amount", e.target.value)}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Description
                                            </label>
                                            <input
                                                type="text"
                                                value={charge.description}
                                                onChange={(e) => handleChargeChange(idx, "description", e.target.value)}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                                placeholder="Optional description"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">$0.00</span>
                            </div>
                            {chargesData.filter(charge => charge.charge_type_id && charge.charge_type_id !== "").length === 0 ? (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                    <p>No charges selected</p>
                                    <p className="text-xs mt-1">Add at least one charge to create the invoice</p>
                                </div>
                            ) : (
                                <>
                                    <div className="border-t pt-3">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Additional Charges:</p>
                                        {chargesData
                                            .filter(charge => charge.charge_type_id && charge.charge_type_id !== "")
                                            .map((charge, index) => (
                                            <div key={index} className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    {chargeTypes.find(ct => ct.value === charge.charge_type_id)?.name || 'Unknown'}:
                                                </span>
                                                <span>${parseFloat(charge.amount || 0).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t pt-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Charges:</span>
                                            <span className="font-medium">
                                                ${chargesData
                                                    .filter(charge => charge.charge_type_id && charge.charge_type_id !== "")
                                                    .reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="border-t pt-3">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total Amount:</span>
                                    <span>
                                        ${chargesData
                                            .filter(charge => charge.charge_type_id && charge.charge_type_id !== "")
                                            .reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex gap-2 items-center justify-end">
                            <PrimaryBtn
                                onClick={handleSubmit}
                                disabled={loading || chargesData.filter(charge => charge.charge_type_id && charge.charge_type_id !== "").length === 0}
                                className="w-full"
                            >
                                {loading ? "Creating..." : "Create Invoice"}
                            </PrimaryBtn>
                            <SecondaryBtn
                                onClick={() => navigate("/invoices")}
                                className="w-full"
                            >
                                Cancel
                            </SecondaryBtn>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charge Type Creation Popup */}
            <InvoiceChargeTypePopup
                popup={showChargeTypePopup}
                setPopup={setShowChargeTypePopup}
                onSubmit={handleCreateChargeType}
                isSubmitting={isCreatingChargeType}
                restrictToFixed={true}
            />
        </div>
    );
};

export default InvoiceCreatePage;