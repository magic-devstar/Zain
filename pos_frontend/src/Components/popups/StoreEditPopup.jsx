import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";
import PhoneNumberInput from "../Common/PhoneNumberInput";
import { getPreferredSoftwareOptions } from "../../api/platformConfig";

function StoreEditPopup({ loading, initialData, onSubmit, isCreating = false }) {
    const [formData, setFormData] = useState({
        store_name: "",
        store_address: "",
        store_city: "",
        store_zip_code: "",
        store_billing_email: "",
        store_phone: "",
        owner_name: "",
        owner_email: "",
        owner_phone: "",
        distributor_name: "",
        distributor_email: "",
        distributor_phone: "",
        manager_name: "",
        manager_email: "",
        manager_phone: "",
        open_time: "06:00",
        close_time: "01:00",
        is_active: true,
        preferred_software: {
            "Standup": false,
            "Fish Table": false,
            "Frontier": false,
            "Stampede": false,
            "Golden Dragon": false,
            "Fire Dragon": false,
            "Fortune 2 Go": false,
            "Fortune": false,
            "Frontier 2.0": false,
            "River": false,
            "Kiosk": false,
            "ATM": false,
        },
    });

    const [softwareOptions, setSoftwareOptions] = useState([]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                store_name: initialData.store_name || "",
                store_address: initialData.store_address || "",
                store_city: initialData.store_city || "",
                store_zip_code: initialData.store_zip_code || "",
                store_billing_email: initialData.store_billing_email || "",
                store_phone: initialData.store_phone || "",
                owner_name: initialData.owner_name || "",
                owner_email: initialData.owner_email || "",
                owner_phone: initialData.owner_phone || "",
                distributor_name: initialData.distributor_name || "",
                distributor_email: initialData.distributor_email || "",
                distributor_phone: initialData.distributor_phone || "",
                manager_name: initialData.manager_name || "",
                manager_email: initialData.manager_email || "",
                manager_phone: initialData.manager_phone || "",
                open_time: initialData.open || "06:00",
                close_time: initialData.close || "01:00",
                is_active: initialData.is_active !== undefined ? initialData.is_active : true,
                preferred_software: initialData.preferred_software || {
                    "Standup": false,
                    "Fish Table": false,
                    "Frontier": false,
                    "Stampede": false,
                    "Golden Dragon": false,
                    "Fire Dragon": false,
                    "Fortune 2 Go": false,
                    "Fortune": false,
                    "Frontier 2.0": false,
                    "River": false,
                    "Kiosk": false,
                    "ATM": false,
                },
            });
        }
    }, [initialData]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const options = await getPreferredSoftwareOptions();
                setSoftwareOptions(options);
                // Ensure preferred_software contains keys for all options
                setFormData(prev => {
                    const next = { ...prev };
                    if (!next.preferred_software) next.preferred_software = {};
                    (options || []).forEach(label => {
                        const key = label.replace(/ \(.*\)/, "");
                        if (next.preferred_software[key] === undefined) {
                            next.preferred_software[key] = false;
                        }
                    });
                    return next;
                });
            } catch (e) {
                // fallback to existing defaults if API fails
                const fallback = [
                    "Standup",
                    "Fish Table",
                    "Frontier",
                    "Stampede",
                    "Golden Dragon (Kiosk and online only)",
                    "Fire Dragon (Online)",
                    "Fortune 2 Go (Online)",
                    "Fortune",
                    "Frontier 2.0",
                    "River (Online)",
                    "Kiosk (Physical Machine to play online games, Golden Dragon and Magic City Only)",
                    "ATM",
                ];
                setSoftwareOptions(fallback);
                setFormData(prev => {
                    const next = { ...prev };
                    if (!next.preferred_software) next.preferred_software = {};
                    fallback.forEach(label => {
                        const key = label.replace(/ \(.*\)/, "");
                        if (next.preferred_software[key] === undefined) {
                            next.preferred_software[key] = false;
                        }
                    });
                    return next;
                });
            }
        };
        fetchOptions();
    }, []);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSoftwareChange = (software) => {
        setFormData(prev => ({
            ...prev,
            preferred_software: {
                ...prev.preferred_software,
                [software]: !prev.preferred_software[software]
            }
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.store_name.trim()) {
            toast.error("Store name is required");
            return;
        }
        if (!formData.store_address.trim()) {
            toast.error("Store address is required");
            return;
        }
        if (!formData.store_city.trim()) {
            toast.error("Store city is required");
            return;
        }
        if (!formData.store_zip_code.trim()) {
            toast.error("Store zip code is required");
            return;
        }
        if (!formData.store_billing_email.trim()) {
            toast.error("Store billing email is required");
            return;
        }
        if (!formData.store_phone.replace(/\D/g, "").length >= 10) {
            toast.error("Please enter a valid Store Phone number");
            return;
        }
        if (!formData.owner_name.trim()) {
            toast.error("Owner name is required");
            return;
        }
        if (!formData.owner_email.trim()) {
            toast.error("Owner email is required");
            return;
        }
        if (!formData.owner_phone.replace(/\D/g, "").length >= 10) {
            toast.error("Please enter a valid Owner Phone number");
            return;
        }
        if (!formData.manager_name.trim()) {
            toast.error("Manager name is required");
            return;
        }
        if (!formData.manager_email.trim()) {
            toast.error("Manager email is required");
            return;
        }
        if (!formData.manager_phone.replace(/\D/g, "").length >= 10) {
            toast.error("Please enter a valid Manager Phone number");
            return;
        }
        if (!Object.values(formData.preferred_software).some(value => value)) {
            toast.error("Please select at least one preferred software option");
            return;
        }

        onSubmit(formData);
    };

    return (
        <div>
            <h2 className="text-xl font-semibold text-primary mb-6">
                {isCreating ? "Create New Store" : "Edit Store"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Store Information */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-primary mb-4">Store Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Store Name *</label>
                            <input
                                type="text"
                                value={formData.store_name}
                                onChange={(e) => handleInputChange('store_name', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Store Address *</label>
                            <input
                                type="text"
                                value={formData.store_address}
                                onChange={(e) => handleInputChange('store_address', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Store City *</label>
                            <input
                                type="text"
                                value={formData.store_city}
                                onChange={(e) => handleInputChange('store_city', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Store Zip Code *</label>
                            <input
                                type="text"
                                value={formData.store_zip_code}
                                onChange={(e) => handleInputChange('store_zip_code', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Store Billing Email *</label>
                            <input
                                type="email"
                                value={formData.store_billing_email}
                                onChange={(e) => handleInputChange('store_billing_email', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Store Phone *</label>
                            <PhoneNumberInput
                                value={formData.store_phone}
                                onPhoneChange={(phone) => handleInputChange('store_phone', phone)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                {/* Owner Information */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-primary mb-4">Owner Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Owner Name *</label>
                            <input
                                type="text"
                                value={formData.owner_name}
                                onChange={(e) => handleInputChange('owner_name', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Owner Email *</label>
                            <input
                                type="email"
                                value={formData.owner_email}
                                onChange={(e) => handleInputChange('owner_email', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Owner Phone *</label>
                            <PhoneNumberInput
                                value={formData.owner_phone}
                                onPhoneChange={(phone) => handleInputChange('owner_phone', phone)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                {/* Distributor Information */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-primary mb-4">Distributor Information (Optional)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Distributor Name</label>
                            <input
                                type="text"
                                value={formData.distributor_name}
                                onChange={(e) => handleInputChange('distributor_name', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Distributor Email</label>
                            <input
                                type="email"
                                value={formData.distributor_email}
                                onChange={(e) => handleInputChange('distributor_email', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Distributor Phone</label>
                            <PhoneNumberInput
                                value={formData.distributor_phone}
                                onPhoneChange={(phone) => handleInputChange('distributor_phone', phone)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                {/* Manager Information */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-primary mb-4">Manager Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Manager Name *</label>
                            <input
                                type="text"
                                value={formData.manager_name}
                                onChange={(e) => handleInputChange('manager_name', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Manager Email *</label>
                            <input
                                type="email"
                                value={formData.manager_email}
                                onChange={(e) => handleInputChange('manager_email', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Manager Phone *</label>
                            <PhoneNumberInput
                                value={formData.manager_phone}
                                onPhoneChange={(phone) => handleInputChange('manager_phone', phone)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                {/* Operating Hours */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-primary mb-4">Operating Hours</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Open Time</label>
                            <input
                                type="time"
                                value={formData.open_time}
                                onChange={(e) => handleInputChange('open_time', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Close Time</label>
                            <input
                                type="time"
                                value={formData.close_time}
                                onChange={(e) => handleInputChange('close_time', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Store Status */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-primary mb-4">Store Status</h3>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => handleInputChange('is_active', e.target.checked)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            disabled={loading}
                        />
                        <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                            Store is Active
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Uncheck to deactivate this store. Deactivated stores will not appear in active operations.
                    </p>
                </div>

                {/* Preferred Software */}
                <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-primary mb-4">Preferred Software *</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Select only what you want. Do not select all boxes unless you want EVERYTHING.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {softwareOptions.map((software) => (
                            <div key={software} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={software}
                                    checked={formData.preferred_software[software.replace(/ \(.*\)/, "")] || false}
                                    onChange={() => handleSoftwareChange(software.replace(/ \(.*\)/, ""))}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                    disabled={loading}
                                />
                                <label htmlFor={software} className="ml-2 text-sm text-gray-700">
                                    {software}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                    <SecondaryBtn
                        type="button"
                        onClick={() => onSubmit(null)} // Cancel action
                        disabled={loading}
                    >
                        Cancel
                    </SecondaryBtn>
                    <PrimaryBtn
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : (isCreating ? "Create Store" : "Update Store")}
                    </PrimaryBtn>
                </div>
            </form>
        </div>
    );
}

export default StoreEditPopup; 