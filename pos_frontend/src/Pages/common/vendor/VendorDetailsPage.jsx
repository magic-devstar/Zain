import { useEffect, useState } from "react";
import { IoBuild, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoConstruct } from "react-icons/io5";
import { useParams } from "react-router-dom";
import api from "../../../utils/api";
import BackButton from "../../../Components/Common/BackButton";
import Spinner from "../../../Components/Common/Spinner";
import EditButton from "../../../Components/Common/EditButton";
import PopupComponent from "../../../Components/popups/PopupComponent";
import VendorFormPopup from "../../../Components/popups/VendorformPopup";
import toast from "react-hot-toast";


function VendorDetailsPage() {
  const { vendorId } = useParams();
  const [vendorDetails, setVendorDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");

  const fetchVendorDetails = async () => {
    try {
      const response = await api.get(`/common/api/vendors/${vendorId}/`);
      const VendorData = response.data;
      setVendorDetails(VendorData);

    } catch (error) {
      console.error("Error fetching Vendor details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorDetails();
  }, [vendorId]);



  const handleEditVendor = () => {
    setPopupName("Edit Vendor");
    setPopup(true);
  };

  const handleEditVendorSubmit = async (updatedData) => {
    try {
      setLoading(true);
      const response = await api.patch(`/common/api/vendors/${vendorDetails.id}/`, updatedData);
      toast.success("Vendor Updated Successfully", response);
      setPopup(false);
      fetchVendorDetails();
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;

        // Show all field-level errors from DRF
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => toast.error(`${field}: ${msg}`));
          } else {
            toast.error(`${field}: ${messages}`);
          }
        });
      } else {
        toast.error(error.message || "Failed to create Vendor Item");
      }
    } finally {
      setLoading(false);
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
          Vendor Details
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row justify-between  flex-wrap">
        <div className="w-full border border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4">
          <div className="flex gap-4 w-full">
            <div className="flex-1 lg:basis-1/2 lg:pr-2">
              <div className="flex justify-between">
                <p className="font-semibold text-[#212529] opacity-70 text-xs sm:text-lg">
                  Vendor Information
                </p>
                <EditButton onClick={handleEditVendor} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm mt-4">
                {[
                  ["Name", vendorDetails?.name],
                  ["Contact Person", vendorDetails?.contact_person],
                  ["Phone", vendorDetails?.phone],
                  ["WhatsApp", vendorDetails?.whatsapp],
                  ["Email", vendorDetails?.email],
                  ["Address", vendorDetails?.address],
                  ["City", vendorDetails?.city],
                  ["County", vendorDetails?.county],
                  ["Zip Code", vendorDetails?.zip_code],
                  ["Created At", new Date(vendorDetails?.created_at).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                    <span className="font-semibold text-[#212529] opacity-50">{label}</span>
                    <span className="font-semibold text-primary break-words">{value || "N/A"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full border border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 mt-4">
          <div className="flex gap-4 w-full">
            <div className="flex-1 lg:basis-1/2 lg:pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm mt-4">
                {[
                  {
                    label: "Description",
                    value: vendorDetails?.description
                  },
                  {
                    label: "Notes",
                    value: vendorDetails?.notes
                  }
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col sm:gap-4">
                    <span className="font-semibold text-[#212529] opacity-50">{label}</span>
                    <span className="font-semibold text-primary break-words whitespace-pre-wrap">{value || "N/A"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {popupName === "Edit Vendor" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <VendorFormPopup
            loading={loading}
            initialData={vendorDetails}
            onSubmit={handleEditVendorSubmit}
          />
        </PopupComponent>
      )}
    </>
  );
}

export default VendorDetailsPage;
