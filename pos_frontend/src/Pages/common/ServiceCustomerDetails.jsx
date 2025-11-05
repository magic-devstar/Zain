import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/api";
import BackButton from "../../Components/Common/BackButton";
import Spinner from "../../Components/Common/Spinner";
import SecondaryBtn from "../../Components/Common/SecondaryBtn";
import { toast } from "react-hot-toast";
import { updateLicense } from "../../utils/apis/userUtils";
import TicketsPage from "../servicecustomer/TicketsPage";
import { TransfersTable } from "../../Components/Common/TransfersTable";
import ConsumedItemsTable from "../../Components/Common/ConsumedItemsTable";
import ConfirmationPopup from "../../Components/Common/ConfirmationPopup";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import StoreManagementSection from "../../Components/Common/StoreManagementSection";


function ServiceCustomerDetails() {
    const { serviceCustomerId } = useParams();
    const [ServiceCustomerDetails, setServiceCustomerDetails] = useState(null);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [transfersLoading, setTransfersLoading] = useState(true);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const origin = import.meta.env.VITE_BACKEND_URL;

    const fetchServiceCustomerDetails = async () => {
        try {
            const response = await api.get(`/auth/accounts/${serviceCustomerId}/`);
            setServiceCustomerDetails(response.data);
            console.log(response.data);

        } catch (error) {
            console.error("Error fetching ServiceCustomer details:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomerTransfers = async () => {
        try {
            setTransfersLoading(true);
            
            let allTransfers = [];
            
            // Fetch all transfers related to customer stores using the new customer_stores parameter
            const customerStoresTransfers = await api.get(`/common/api/transfer/`, {
                params: {
                    customer_stores: serviceCustomerId,
                },
            });
            allTransfers.push(...(customerStoresTransfers.data.results || customerStoresTransfers.data));
            
            // Also fetch legacy CUSTOMER_TO_WAREHOUSE transfers (source is customer)
            const customerToWarehouse = await api.get(`/common/api/transfer/`, {
                params: {
                    source_id: serviceCustomerId,
                    source_type: "account",
                    transfer_type: "CUSTOMER_TO_WAREHOUSE",
                },
            });
            allTransfers.push(...(customerToWarehouse.data.results || customerToWarehouse.data));
            
            // Also fetch legacy WAREHOUSE_TO_CUSTOMER transfers (destination is customer)
            const warehouseToCustomer = await api.get(`/common/api/transfer/`, {
                params: {
                    destination_id: serviceCustomerId,
                    destination_type: "account",
                    transfer_type: "WAREHOUSE_TO_CUSTOMER",
                },
            });
            allTransfers.push(...(warehouseToCustomer.data.results || warehouseToCustomer.data));
            
            // Remove duplicates based on transfer ID
            const uniqueTransfers = allTransfers.filter((transfer, index, self) => 
                index === self.findIndex(t => t.id === transfer.id)
            );
            
            // Combine and sort transfers by created_at (newest first)
            const combinedTransfers = uniqueTransfers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setTransfers(combinedTransfers);
        } catch (error) {
            console.error("Error fetching transfers:", error);
            toast.error("Failed to load related transfers.");
        } finally {
            setTransfersLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setTransfersLoading(true);
            // setStoresLoading(true); // This line is removed
            await fetchServiceCustomerDetails();
            await fetchCustomerTransfers();
            setLoading(false);
            setTransfersLoading(false);
            // setStoresLoading(false); // This line is removed
        };
        fetchData();
    }, [serviceCustomerId]);

    const consumedItems = useMemo(() => {
        if (!transfers || transfers.length === 0) {
            return [];
        }
        const uniqueItems = new Map(); // Using Map to track unique items by ID
        transfers.forEach(transfer => {
            // Consider items from transfers TO the customer or TO stores
            if ((transfer.transfer_type === "WAREHOUSE_TO_CUSTOMER" || transfer.transfer_type === "WAREHOUSE_TO_STORE") && 
                transfer.items && Array.isArray(transfer.items)) {
                transfer.items.forEach(item => {
                    if (item.status === "consumed" && !uniqueItems.has(item.id)) {
                        uniqueItems.set(item.id, {
                            id: item.id,
                            inventory_name: item.inventory__name || "N/A",
                            inventory_upc: item.inventory__upc || "N/A",
                            attributes: item.attributes || {},
                            warehouse_name: transfer.source_name || "N/A",
                            store_name: transfer.transfer_type === "WAREHOUSE_TO_STORE" ? transfer.destination_name : "Direct to Customer", // Store name for store transfers
                            transfer_id: transfer.id,
                            transfer_date: transfer.created_at,
                            updated_at: transfer.created_at,
                        });
                    }
                });
            }
        });
        // Convert Map values to array and sort
        return Array.from(uniqueItems.values())
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }, [transfers]);

    if (loading && !ServiceCustomerDetails) {
        return (
            <div className="h-[80svh] ">
                <Spinner />
            </div>
        );
    }

    const handleLicenseUpdate = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setSelectedFile(file);
                setShowConfirmation(true);
            }
        };
        input.click();
    };

    const handleConfirmLicenseUpdate = async () => {
        try {
            setLoading(true);
            const response = await updateLicense(serviceCustomerId, selectedFile);
            toast.success("License updated successfully!");
            fetchServiceCustomerDetails();
            setShowConfirmation(false);
            setSelectedFile(null);
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to update license");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Header Start */}
            <div className="flex flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
                <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-1">
                    <BackButton />
                    Service Customer Details
                </h1>
                <div className="flex gap-2 items-center">
                    <SecondaryBtn
                    >
                        Service Customer
                    </SecondaryBtn>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between flex-wrap mb-2">
                <div className="flex flex-wrap lg:mb-0 w-full border border-x-[3px] border-x-primary border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 items-center justify-center gap-4">
                    <div className="flex gap-4 w-full">
                        <div className="flex-1 lg:pr-2">
                            <div className="flex justify-between mb-4">
                                <p className="font-semibold text-primary text-xs sm:text-sm">
                                    Customer Information
                                </p>
                            </div>
                            <div className="text-sm">
                                {/* VendingCustomer Name */}
                                <p className="flex  md:items-center md:gap-6">
                                    <span className="font-semibold text-[#212529] opacity-50">Customer Name</span>
                                    <span className="font-semibold text-primary">
                                        {ServiceCustomerDetails?.username || "N/A"}
                                    </span>
                                </p>
                                <p className="flex  md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">
                                        Email
                                    </span>
                                    {ServiceCustomerDetails?.email && ServiceCustomerDetails.email !== "N/A" ? (
                                        <a 
                                            href={`mailto:${ServiceCustomerDetails.email}`}
                                            className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                            title={`Click to send email to ${ServiceCustomerDetails.email}`}
                                        >
                                            {ServiceCustomerDetails.email}
                                        </a>
                                    ) : (
                                        <span className="font-semibold text-primary">N/A</span>
                                    )}
                                </p>
                                <p className="flex  md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">
                                        Phone Number
                                    </span>
                                    {ServiceCustomerDetails?.phone_number && ServiceCustomerDetails.phone_number !== "N/A" ? (
                                        <a 
                                            href={`tel:${ServiceCustomerDetails.phone_number.replace(/[\s\+]/g, '')}`}
                                            className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                            title={`Click to call ${ServiceCustomerDetails.phone_number}`}
                                        >
                                            {ServiceCustomerDetails.phone_number}
                                        </a>
                                    ) : (
                                        <span className="font-semibold text-primary">N/A</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Store Management Section */}
            <StoreManagementSection
                customerId={serviceCustomerId}
                customerStores={ServiceCustomerDetails?.store_profiles || []}
                storesLoading={loading}
                onStoresUpdate={fetchServiceCustomerDetails}
            />

            {/* License Section - Now at User Level */}
            {ServiceCustomerDetails?.license && (
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-primary mb-3">License</h2>
                    <div className="border border-x-[3px] border-x-primary border-gray-200 bg-white rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#212529] opacity-50">License Document</span>
                            <div className="flex gap-2">
                                <PrimaryBtn
                                    onClick={() => {
                                        window.open(`${origin}${ServiceCustomerDetails.license}`, '_blank');
                                    }}
                                >
                                    View License
                                </PrimaryBtn>
                                <SecondaryBtn
                                    onClick={handleLicenseUpdate}
                                    className="text-primary underline ml-4"
                                >
                                    Update License
                                </SecondaryBtn>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-col-reverse gap-3 mt-2">
                <div className="flex justify-between flex-col sm:flex-row mb-2">
                    <div className="flex flex-col lg:flex-row justify-between flex-wrap mt-1 w-full">
                        <div className="flex flex-wrap lg:mb-0 w-full">
                            <TransfersTable transfers={transfers} transfersLoading={transfersLoading} />
                        </div>
                    </div>
                </div>
                <div className="w-full">
                    <ConsumedItemsTable consumedItems={consumedItems} loading={transfersLoading} />
                </div>
                <div className="w-full">
                    <TicketsPage />
                </div>
            </div>

            {showConfirmation && (
                <ConfirmationPopup
                    message="Are you sure you want to update the license image?"
                    onConfirm={handleConfirmLicenseUpdate}
                    onCancel={() => {
                        setShowConfirmation(false);
                        setSelectedFile(null);
                    }}
                    loading={loading}
                />
            )}
        </>
    );
}

export default ServiceCustomerDetails;
