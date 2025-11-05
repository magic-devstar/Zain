import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/api";
import BackButton from "../../Components/Common/BackButton";
import Spinner from "../../Components/Common/Spinner";
import { toast } from "react-hot-toast";
import { updateLicense } from "../../utils/apis/userUtils";
import ConfirmationPopup from "../../Components/Common/ConfirmationPopup";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import SecondaryBtn from "../../Components/Common/SecondaryBtn";
import StoreManagementSection from "../../Components/Common/StoreManagementSection";


function DeactivatedCustomerDetails() {
    const { customerId } = useParams();
    const [ServiceCustomerDetails, setServiceCustomerDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const origin = import.meta.env.VITE_BACKEND_URL;

    const fetchServiceCustomerDetails = async () => {
        try {
            const response = await api.get(`/auth/accounts/${customerId}/`);
            setServiceCustomerDetails(response.data);
            console.log(response.data);

        } catch (error) {
            console.error("Error fetching VendingCustomer details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await fetchServiceCustomerDetails();
            setLoading(false);
        };
        fetchData();
    }, [customerId]);


    if (loading) {
        return (
            <div className="h-[80svh] ">
                <Spinner />
            </div>
        );
    }


    const handleToggleStatus = async () => {
        try {
            const newStatus = !ServiceCustomerDetails.is_active;
            const response = await api.patch(`/auth/accounts/${customerId}/`, {
                is_active: newStatus,
            });
            toast.success(`Customer ${newStatus ? "activated" : "deactivated"} successfully`);
            fetchServiceCustomerDetails(); // Refresh data
        } catch (error) {
            toast.error("Failed to update status");
            console.error(error);
        }
    };

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
            const response = await updateLicense(customerId, selectedFile);
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
                    Customer Details
                </h1>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-3">
                        <label htmlFor="status-toggle" className="font-semibold text-gray-700">
                            Status:
                        </label>
                        <div className="flex items-center">
                            <button
                                onClick={handleToggleStatus}
                                className="relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                style={{
                                    backgroundColor: ServiceCustomerDetails?.is_active ? '#10B981' : '#EF4444',
                                }}
                            >
                                <span className="sr-only">Toggle Status</span>
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${ServiceCustomerDetails?.is_active ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
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
                                    <span className="font-semibold text-primary">
                                        {ServiceCustomerDetails?.email || "N/A"}
                                    </span>
                                </p>
                                <p className="flex  md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">
                                        Phone Number
                                    </span>
                                    <span className="font-semibold text-primary">
                                        {ServiceCustomerDetails?.phone_number || "N/A"}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* License Section - User Level */}
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

            {/* Store Management Section */}
            <StoreManagementSection
                customerId={customerId}
                customerStores={ServiceCustomerDetails?.store_profiles || []}
                storesLoading={loading}
                onStoresUpdate={fetchServiceCustomerDetails}
            />

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

export default DeactivatedCustomerDetails;
