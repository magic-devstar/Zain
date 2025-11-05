import React, { useEffect, useState } from "react";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import { useSelector } from 'react-redux';
import { toast } from "react-hot-toast";
import api from "../../utils/api";
import SecondaryBtn from "../../Components/Common/SecondaryBtn";
import PopupComponent from "../../Components/popups/PopupComponent";
import UpdateAccountInfo from "../../Components/popups/UpdateAccountInfo";
import StoreManagementSection from "../../Components/Common/StoreManagementSection";

function AccountsTab() {
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [stores, setStores] = useState([]);
    const [storesLoading, setStoresLoading] = useState(true);
    const userInfo = useSelector((state) => state.user.user);
    const isVendingCustomer = userInfo?.role === "Vending Customer";
    const isServiceCustomer = userInfo?.role === "Service Customer";

    const handleEditClick = () => {
        setPopupName("Edit User");
        setPopup(true);
    };

    const handleForgotPassword = async (email) => {
        setIsLoading(true);
        try {
            // Call the forgot password endpoint
            const response = await api.post("/auth/forgot-password/", { email });
            toast.success("Reset Link Sent !");
        } catch (error) {
            console.error("Error sending password reset email:", error);
            toast.error("Failed !");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStores = async () => {
        try {
            setStoresLoading(true);
            if (!userInfo?.id) return;
            // Fetch all stores and filter by this user (customer) to avoid URL conflicts in backend routes
            const res = await api.get(`/auth/stores/`, { params: { all: true } });
            const allStores = Array.isArray(res.data) ? res.data : [];
            const myStores = allStores.filter(s => s.customer === userInfo.id);
            setStores(myStores);
        } catch (e) {
            setStores([]);
        } finally {
            setStoresLoading(false);
        }
    };

    useEffect(() => {
        if (isVendingCustomer || isServiceCustomer) {
            fetchStores();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfo?.id]);

    return (
        <>
            <div className="bg-[#F3F6F980] border border-gray-200 p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b gap-2">
                    <div className="flex items-center ">
                        <img
                            src={userInfo.profile_image}
                            alt="User Profile"
                            className="w-16 h-16 rounded-full mr-4"
                        />
                        <h2 className="text-lg text-[#344054] font-semibold">{userInfo?.username || "N/A"}</h2>
                    </div>
                    <div className="flex gap-1 items-center justify-end w-full sm:w-auto">
                        <PrimaryBtn onClick={handleEditClick}>Edit</PrimaryBtn>
                        <SecondaryBtn onClick={() => handleForgotPassword(userInfo?.email)} disabled={isLoading}>
                            {isLoading ? "Sending..." : "Forgot Password?"}
                        </SecondaryBtn>
                    </div>
                </div>
                <div>
                    <p className="text-gray-600 mb-2"><strong>Full Name:</strong> {`${userInfo?.username || "N/A"} ${userInfo?.last_name || ""}`}</p>
                    <p className="text-gray-600 mb-2"><strong>Email:</strong> {userInfo?.email || "N/A"}</p>
                    <p className="text-gray-600 mb-2"><strong>Phone:</strong> {userInfo?.phone_number || "N/A"}</p>
                    {userInfo?.role !== "Vending Customer" && userInfo?.role !== "Service Customer" && (
                        <p className="text-gray-600 mb-2"><strong>Check in required:</strong> {userInfo?.check_in_required ? "Yes" : "No"}</p>
                    )}
                </div>
            </div>
            {(isVendingCustomer || isServiceCustomer) && (
                <div className="bg-[#F3F6F980] border border-gray-200 p-4 rounded-lg my-2">
                    <h1 className="font-semibold text-2xl mb-2">My Stores</h1>
                    <StoreManagementSection
                        customerId={userInfo?.id}
                        customerStores={stores}
                        storesLoading={storesLoading}
                        onStoresUpdate={fetchStores}
                        readOnly={true}
                    />
                </div>
            )}

            {popupName === "Edit User" && (
                <PopupComponent popup={popup} setPopup={setPopup}>
                    <UpdateAccountInfo onclose={() => { setPopup(false) }} />
                </PopupComponent>
            )}
        </>
    );
}

export default AccountsTab;
