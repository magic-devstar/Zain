import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import AssignLocationsPopup from "../../Components/popups/AssignLocationsPopup";
import AssignedLocationsTable from "../../Components/Common/AssignedLocationsTable";
import Spinner from "../../Components/Common/Spinner";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";

const PartnerDetailPage = () => {
  const { partnerId } = useParams();
  const [locations, setLocations] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [partnerDetails, setPartnerDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch partner details
  useEffect(() => {
    const fetchPartnerDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/auth/get-users/${partnerId}/`);
        setPartnerDetails(response.data);
      } catch (error) {
        console.error("Failed to fetch partner details", error);
        toast.error("Failed to fetch partner details");
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerDetails();
  }, [partnerId]);

  // Fetch locations accessible to the logged-in user
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLocationsLoading(true);
        const response = await api.get(`/common/api/vending-customer-locations/?all=true&vending_customer=${partnerId}`);
        setLocations(response.data);
      } catch (error) {
        console.error("Failed to fetch locations", error);
        toast.error("Failed to fetch locations");
      } finally {
        setLocationsLoading(false);
      }
    };

    if (isPopupOpen) {
      fetchLocations();
    }
  }, [isPopupOpen]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (!partnerDetails) {
    return (
      <div className="text-center text-gray-500 py-8">
        Partner not found
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center mb-4">
          <img
            src={partnerDetails.profile_image || `https://ui-avatars.com/api/?name=${partnerDetails.username}`}
            alt={partnerDetails.username}
            className="w-24 h-24 rounded-full mr-6 object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{partnerDetails.username}</h1>
            <p className="text-gray-600">{partnerDetails.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p>{partnerDetails.phone_number || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold ${partnerDetails.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
            >
              {partnerDetails.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        {partnerDetails.role === "Partner" && (
          <PrimaryBtn
            onClick={() => setIsPopupOpen(true)}
            className="mt-4"
          >
            Assign Locations
          </PrimaryBtn>
        )}
      </div>

      {partnerDetails.role === "Partner" && (
        <>
          <AssignLocationsPopup
            isOpen={isPopupOpen}
            onClose={() => setIsPopupOpen(false)}
            partnerId={partnerId}
            partnerName={partnerDetails.username}
            locations={locations}
            locationsLoading={locationsLoading}
            onSuccess={() => setRefreshToggle(prev => !prev)}
          />

          <AssignedLocationsTable
            partnerId={partnerId}
            onRefresh={refreshToggle}
          />
        </>
      )}

    </div>
  );
};

export default PartnerDetailPage;