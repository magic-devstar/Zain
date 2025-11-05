import React, { useEffect, useState } from "react";
import EditButton from "../../../Components/Common/EditButton";
import { IoBuild, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoConstruct } from "react-icons/io5";
import { useParams } from "react-router-dom";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import InventoryListPage from "./InventoryListPage";
import api from "../../../utils/api";
import BackButton from "../../../Components/Common/BackButton";
import Spinner from "../../../Components/Common/Spinner";
import PopupComponent from "../../../Components/popups/PopupComponent";
import WarehouseFormPopup from "../../../Components/popups/WarehouseFormPopup";
import Avatar from "../../../Components/Common/Avatar";
import { useSelector } from "react-redux";

function Warehousedetails() {
  const { warehouseId } = useParams();
  const user = useSelector((state) => state.user.user);
  const isAdmin = user?.role === "Admin";
  const [WarehouseDetails, setWarehouseDetails] = useState(null);
  const [popup, setPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [popupName, setPopupName] = useState("");

  const fetchWarehouseDetails = async () => {
    try {
      const response = await api.get(`/common/api/warehouses/${warehouseId}/`);
      setWarehouseDetails(response.data);
      console.log(response.data);

    } catch (error) {
      console.error("Error fetching Warehouse details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouseDetails();
  }, [warehouseId]);


  const handleEditWarehouse = () => {
    setPopupName("Edit Warehouse");
    setPopup(true);
  };


  const handleEditWarehouseSubmit = async (updatedData) => {
    try {
      const response = await api.patch(`/common/api/warehouses/${WarehouseDetails.id}/`, updatedData);
      console.log("Warehouse updated successfully", response);
      fetchWarehouseDetails();
    } catch (error) {
      console.error("Error updating Warehouse", error);
    }
  };

  if (loading) {
    return (
      <div className="h-[80svh] ">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      {/* Header Start */}
      <div className="flex flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
        <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-1">
          <BackButton />
          Warehouse Details
        </h1>
        <div className="flex flex-col md:flex-row">
          <button
            className={`border rounded-lg px-3 py-2 font-medium text-sm ${WarehouseDetails?.status === "active"
              ? "bg-green-100 text-green-700 border-green-300"
              : "bg-red-100 text-red-700 border-red-300"
              }`}
          >
            {WarehouseDetails?.status === "active" ? "Active" : "Inactive"}
          </button>

        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between  flex-wrap">
        {/* Status */}
        <div className="flex flex-wrap mb-4 lg:mb-0 lg:w-[60.4%] border border-gray-200 bg-white rounded-xl py-10 px-2 md:px-4 items-center justify-center gap-4">
          {WarehouseDetails?.inventory_status_summary && (
            <>
              {Object.entries(WarehouseDetails.inventory_status_summary).map(([key, value]) => (
                <div key={key} className="px-4 text-center">
                  <h4 className="mb-2 font-semibold opacity-80 capitalize">
                    {key.replace(/_/g, " ")}
                  </h4>
                  <div className="flex items-center gap-3 justify-center">
                    {/* Conditionally render SVGs based on the status */}
                    {key === 'available' && <IoCheckmarkCircleOutline size={30} className="text-green-500" />}
                    {key === 'in_use' && <IoBuild size={30} className="text-blue-500" />}
                    {key === 'in_repair' && <IoConstruct size={30} className="text-yellow-500" />}
                    <h2 className="text-3xl font-bold opacity-80">{value}</h2>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Company Information */}
        <div className="w-full lg:w-[39.4%] border border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4">
          <div className="flex gap-4 w-full">
            <div className="flex-1 lg:basis-1/2 lg:pr-2">
              <div className="flex justify-between">
                <p className="font-semibold text-[#212529] opacity-70 text-xs sm:text-sm">
                  Warehouse Information
                </p>
                {isAdmin && (
                  <EditButton onClick={handleEditWarehouse} />
                )}
              </div>
              <div className="text-sm">
                {/* Warehouse Name */}
                <p className="flex flex-col md:flex-row md:items-center md:gap-6">
                  <span className="font-semibold text-[#212529] opacity-50">Name : </span>
                  <span className="font-semibold text-primary">
                    {WarehouseDetails?.name || "N/A"}
                  </span>
                </p>

                {/* Total Number of Managers */}
                <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                  <span className="font-semibold text-[#212529] opacity-50">
                    Total Managers : 
                  </span>
                  <span className="font-semibold text-primary">
                    {WarehouseDetails?.warehouse_managers?.length || 0}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
      {/* Header End */}

      {/* Main Content */}
      <div className="flex flex-col-reverse lg:flex-row gap-3 mt-2">
        {/* Left Side */}
        <div className="w-full lg:w-2/3">
          <InventoryListPage />
        </div>

        {/* Right Side */}
        <div className="w-full lg:w-1/3 overflow-y-auto md:max-h-[100vh] scrollbar-custom-style">
          {/* Managers Section */}
          <div className="bg-white rounded-xl px-5 py-[21px] border border-gray-200 mb-4 overflow-auto">
            <div className="flex items-center justify-between mb-4 gap-2 w-full">
              <h2 className="font-semibold text-[#495057]">Managers</h2>
            </div>

            {WarehouseDetails?.warehouse_managers?.length > 0 ? (
              <div className="flex flex-col gap-4 w-full">
                {WarehouseDetails.warehouse_managers.map((item, index) => {
                  const user = item.manager;
                  const startTime = item.start_time ? item.start_time.slice(0, 5) : "Not set"; // Format time as HH:MM
                  const endTime = item.end_time ? item.end_time.slice(0, 5) : "Not set"; // Format time as HH:MM

                  return (
                    <div key={index} className="flex items-center gap-4 w-full justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar
                          user={user}
                          color="bg-primary"
                        />

                        {/* Info */}
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800">{user.username}</span>
                          <span className="text-sm text-gray-500">{user.email || "No email"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No managers available.</p>
            )}
          </div>
        </div>
      </div>
      {popupName === "Edit Warehouse" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <WarehouseFormPopup
            loading={loading}
            warehouse={WarehouseDetails}
            onSubmit={handleEditWarehouseSubmit}
            onClose={() => setPopup(false)}
          />
        </PopupComponent>
      )}
    </>
  );
}

export default Warehousedetails;
