import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../../utils/api";
import PopupComponent from "../popups/PopupComponent";
import StoreEditPopup from "../popups/StoreEditPopup";
import PrimaryBtn from "./PrimaryBtn";
import SecondaryBtn from "./SecondaryBtn";

function StoreManagementSection({ customerId, customerStores, storesLoading, onStoresUpdate, readOnly = false }) {
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [currentStore, setCurrentStore] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [expandedStoreId, setExpandedStoreId] = useState(null);
    const [storeFilter, setStoreFilter] = useState('active'); // 'all', 'active', 'inactive'

    const handleEditStore = (store) => {
        setCurrentStore(store);
        setIsCreating(false);
        setPopupName("Edit Store");
        setPopup(true);
    };

    const handleCreateStore = () => {
        setCurrentStore(null);
        setIsCreating(true);
        setPopupName("Create Store");
        setPopup(true);
    };

    const handleSubmit = async (formData) => {
        if (!formData) {
            // Cancel action
            setPopup(false);
            return;
        }

        try {
            setLoading(true);
            let response;

            if (isCreating) {
                // Create new store
                const storeData = {
                    customer: customerId,
                    ...formData,
                    open: formData.open_time,
                    close: formData.close_time,
                };
                response = await api.post("/auth/stores/", storeData);
                toast.success("Store created successfully!");
            } else {
                // Update existing store
                const updateUrl = `/auth/stores/${currentStore.id}/update/`;
                console.log('Updating store with URL:', updateUrl);
                response = await api.put(updateUrl, {
                    ...formData,
                    open: formData.open_time,
                    close: formData.close_time,
                });
                toast.success("Store updated successfully!");
            }

            // Refresh stores list
            if (onStoresUpdate) {
                onStoresUpdate();
            }

            setPopup(false);
            return response;
        } catch (error) {
            console.error("Store operation failed:", error);
            const errorMessage = error.response?.data?.detail ||
                error.response?.data?.message ||
                "Failed to save store";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStore = async (storeId) => {
        if (!window.confirm("Are you sure you want to delete this store?")) {
            return;
        }

        try {
            setLoading(true);
            const deleteUrl = `/auth/stores/${storeId}/delete/`;
            console.log('Deleting store with URL:', deleteUrl);
            await api.delete(deleteUrl);
            toast.success("Store deleted successfully!");

            // Refresh stores list
            if (onStoresUpdate) {
                onStoresUpdate();
            }
        } catch (error) {
            console.error("Store deletion failed:", error);
            const errorMessage = error.response?.data?.detail ||
                error.response?.data?.message ||
                "Failed to delete store";
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const toggleStore = (storeId) => {
        setExpandedStoreId(expandedStoreId === storeId ? null : storeId);
    };

    // Filter stores based on selected filter
    const filteredStores = customerStores.filter(store => {
        if (storeFilter === 'active') return store.is_active === true;
        if (storeFilter === 'inactive') return store.is_active === false;
        return true; // 'all'
    });
    
    return (
        <>
            {/* All Stores Section */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-3 flex-wrap gap-3">
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-primary mb-2">
                            Stores ({filteredStores.length} of {customerStores.length}) {storesLoading && "(Loading...)"}
                        </h2>
                        {/* Filter Buttons */}
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => setStoreFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    storeFilter === 'all'
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All Stores
                            </button>
                            <button
                                onClick={() => setStoreFilter('active')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    storeFilter === 'active'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => setStoreFilter('inactive')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    storeFilter === 'inactive'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Inactive
                            </button>
                        </div>
                    </div>
                    {!readOnly && (
                        <PrimaryBtn
                            onClick={handleCreateStore}
                            disabled={storesLoading}
                        >
                            Add New Store
                        </PrimaryBtn>
                    )}
                </div>

                {customerStores.length === 0 && !storesLoading && (
                    <p className="text-gray-500">No stores found for this customer.</p>
                )}

                {filteredStores.length === 0 && customerStores.length > 0 && !storesLoading && (
                    <p className="text-gray-500">
                        {storeFilter === 'active' && "No active stores found."}
                        {storeFilter === 'inactive' && "No inactive stores found."}
                        {storeFilter === 'all' && "No stores found."}
                    </p>
                )}

                {filteredStores.length > 0 && (
                    <div className="grid grid-cols-1 gap-3">
                        {filteredStores.map((store, index) => (
                            <div key={store.id} className="border border-x-[3px] border-x-primary border-gray-200 bg-white rounded-xl overflow-hidden">
                                {/* Collapsible Header */}
                                <div 
                                    className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => toggleStore(store.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <svg 
                                            className={`w-5 h-5 text-primary transition-transform ${expandedStoreId === store.id ? 'rotate-180' : ''}`}
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        <h3 className="font-semibold text-primary text-lg">
                                            Store {index + 1}: {store.store_name}
                                        </h3>
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            store.is_active 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {store.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    {!readOnly && (
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <SecondaryBtn
                                                onClick={() => handleEditStore(store)}
                                                disabled={loading}
                                            >
                                                Edit
                                            </SecondaryBtn>
                                            <SecondaryBtn
                                                onClick={() => handleDeleteStore(store.id)}
                                                disabled={loading}
                                                className="bg-red-500 hover:bg-red-600 text-white"
                                            >
                                                Delete
                                            </SecondaryBtn>
                                        </div>
                                    )}
                                </div>

                                {/* Collapsible Content */}
                                {expandedStoreId === store.id && (
                                    <div className="p-6 pt-0 border-t border-gray-200">

                                {/* Store Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-primary text-sm border-b border-gray-200 pb-1">Store Information</h4>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Store Name</span>
                                                <span className="font-semibold text-primary">{store.store_name || "N/A"}</span>
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Status</span>
                                                <span className={`font-semibold ${
                                                    store.is_active ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                    {store.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Address</span>
                                                <span className="font-semibold text-primary">{store.store_address || "N/A"}</span>
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">City</span>
                                                <span className="font-semibold text-primary">{store.store_city || "N/A"}</span>
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Zip Code</span>
                                                <span className="font-semibold text-primary">{store.store_zip_code || "N/A"}</span>
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Billing Email</span>
                                                {store.store_billing_email && store.store_billing_email !== "N/A" ? (
                                                    <a 
                                                        href={`mailto:${store.store_billing_email}`}
                                                        className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                        title={`Click to send email to ${store.store_billing_email}`}
                                                    >
                                                        {store.store_billing_email}
                                                    </a>
                                                ) : (
                                                    <span className="font-semibold text-primary">N/A</span>
                                                )}
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Phone</span>
                                                {store.store_phone && store.store_phone !== "N/A" ? (
                                                    <a 
                                                        href={`tel:${store.store_phone.replace(/[\s\+]/g, '')}`}
                                                        className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                        title={`Click to call ${store.store_phone}`}
                                                    >
                                                        {store.store_phone}
                                                    </a>
                                                ) : (
                                                    <span className="font-semibold text-primary">N/A</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-primary text-sm border-b border-gray-200 pb-1">Owner Information</h4>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Owner Name</span>
                                                <span className="font-semibold text-primary">{store.owner_name || "N/A"}</span>
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Owner Email</span>
                                                {store.owner_email && store.owner_email !== "N/A" ? (
                                                    <a 
                                                        href={`mailto:${store.owner_email}`}
                                                        className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                        title={`Click to send email to ${store.owner_email}`}
                                                    >
                                                        {store.owner_email}
                                                    </a>
                                                ) : (
                                                    <span className="font-semibold text-primary">N/A</span>
                                                )}
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Owner Phone</span>
                                                {store.owner_phone && store.owner_phone !== "N/A" ? (
                                                    <a 
                                                        href={`tel:${store.owner_phone.replace(/[\s\+]/g, '')}`}
                                                        className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                        title={`Click to call ${store.owner_phone}`}
                                                    >
                                                        {store.owner_phone}
                                                    </a>
                                                ) : (
                                                    <span className="font-semibold text-primary">N/A</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-primary text-sm border-b border-gray-200 pb-1">Manager Information</h4>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Manager Name</span>
                                                <span className="font-semibold text-primary">{store.manager_name || "N/A"}</span>
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Manager Email</span>
                                                {store.manager_email && store.manager_email !== "N/A" ? (
                                                    <a 
                                                        href={`mailto:${store.manager_email}`}
                                                        className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                        title={`Click to send email to ${store.manager_email}`}
                                                    >
                                                        {store.manager_email}
                                                    </a>
                                                ) : (
                                                    <span className="font-semibold text-primary">N/A</span>
                                                )}
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Manager Phone</span>
                                                {store.manager_phone && store.manager_phone !== "N/A" ? (
                                                    <a 
                                                        href={`tel:${store.manager_phone.replace(/[\s\+]/g, '')}`}
                                                        className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                        title={`Click to call ${store.manager_phone}`}
                                                    >
                                                        {store.manager_phone}
                                                    </a>
                                                ) : (
                                                    <span className="font-semibold text-primary">N/A</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-primary text-sm border-b border-gray-200 pb-1">Distributor Information</h4>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Distributor Name</span>
                                                <span className="font-semibold text-primary">{store.distributor_name || "N/A"}</span>
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Distributor Email</span>
                                                {store.distributor_email && store.distributor_email !== "N/A" ? (
                                                    <a 
                                                        href={`mailto:${store.distributor_email}`}
                                                        className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                        title={`Click to send email to ${store.distributor_email}`}
                                                    >
                                                        {store.distributor_email}
                                                    </a>
                                                ) : (
                                                    <span className="font-semibold text-primary">N/A</span>
                                                )}
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Distributor Phone</span>
                                                {store.distributor_phone && store.distributor_phone !== "N/A" ? (
                                                    <a 
                                                        href={`tel:${store.distributor_phone.replace(/[\s\+]/g, '')}`}
                                                        className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                        title={`Click to call ${store.distributor_phone}`}
                                                    >
                                                        {store.distributor_phone}
                                                    </a>
                                                ) : (
                                                    <span className="font-semibold text-primary">N/A</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-primary text-sm border-b border-gray-200 pb-1">Operating Hours</h4>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Open</span>
                                                <span className="font-semibold text-primary">{store.open || "N/A"}</span>
                                            </p>
                                            <p className="flex flex-col">
                                                <span className="font-semibold text-[#212529] opacity-50">Close</span>
                                                <span className="font-semibold text-primary">{store.close || "N/A"}</span>
                                            </p>
                                        </div>
                                    </div>


                                </div>
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-primary text-sm border-b border-gray-200 pb-1">Preferred Software</h4>
                                    <div className="text-sm flex flex gap-2 flex-wrap">
                                        {store.preferred_software && Object.keys(store.preferred_software).length > 0 ? (
                                            Object.entries(store.preferred_software).map(([software, enabled]) => (
                                                <div key={software} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={enabled}
                                                        disabled={true}
                                                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                                                    />
                                                    <label className="ml-2 block text-sm text-gray-700">
                                                        {software}
                                                    </label>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500">No software preferences set</p>
                                        )}
                                    </div>
                                </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Store Edit/Create Popup */}
            {popupName === "Edit Store" || popupName === "Create Store" ? (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <StoreEditPopup
                        loading={loading}
                        initialData={currentStore}
                        onSubmit={handleSubmit}
                        isCreating={isCreating}
                    />
                </PopupComponent>
            ) : null}
        </>
    );
}

export default StoreManagementSection; 