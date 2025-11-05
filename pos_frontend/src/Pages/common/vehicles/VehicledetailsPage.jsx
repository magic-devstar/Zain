import { useEffect, useState } from "react";
import { IoBuild, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoConstruct } from "react-icons/io5";
import { useParams } from "react-router-dom";
import api from "../../../utils/api";
import BackButton from "../../../Components/Common/BackButton";
import Spinner from "../../../Components/Common/Spinner";
import ImageUploaderComponent from "../../../Components/Common/ImageUploaderComponent";
import { toast } from "react-hot-toast";
import VehicleUsagesTable from "./VehicleUsagesTable";
import VehicleMaintenanceTable from "./VehicleMaintenanceTable";
import { useSelector } from "react-redux";

// Utility function to format attribute keys
const formatAttributeKey = (key) => {
  return key
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Utility function to format status
const formatStatus = (status) => {
  if (!status) return "";
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Utility function to get status styles (can be copied or imported from VehiclesListPage if needed consistently)
const getStatusStyles = (status) => {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-800 border-green-300";
    case "in_use":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "in_maintenance":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "retired":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

function VehicledetailsPage() {
  const { vehicleId } = useParams();
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);

  const user = useSelector((state) => state.user.user);
  const isAdmin = user?.role === "Admin";
  const isManager = user?.role === "Manager";
  const origin = import.meta.env.VITE_BACKEND_URL;

  // Fetch vehicle details
  const fetchVehicleDetails = async () => {
    try {
      const response = await api.get(`/common/api/vehicles/${vehicleId}/`);
      const vehicleData = response.data;
      setImages(
        vehicleData.attachments?.map((att) => ({
          id: att.id,
          file: att.file.startsWith('http') ? att.file : `${origin}${att.file}`,
          url: att.file.startsWith('http') ? att.file : `${origin}${att.file}`,
          name: typeof att.file === 'string' ? att.file.split("/").pop() : 'unknown_file',
          isNew: false,
        })) || []
      );
      setVehicleDetails(vehicleData);
    } catch (error) {
      console.error("Error fetching vehicle details:", error);
      toast.error("Failed to fetch vehicle details.");
    } finally {
      setLoading(false);
    }
  };

  // Handle image uploads
  useEffect(() => {
    const uploadImages = async () => {
      const newImages = images.filter((img) => img.isNew);

      if (newImages.length > 0) {
        const imageFormData = new FormData();
        newImages.forEach((img) => {
          imageFormData.append("images", img.file);
        });
        imageFormData.append("reference_type", "vehicle");
        imageFormData.append("id", vehicleId);

        try {
          setLoading(true);
          const response = await api.post("/common/api/attachments/attach_to_reference/", imageFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          const newAttachments = response.data.map((att) => ({
            id: att.id,
            file: att.file.startsWith('http') ? att.file : `${origin}${att.file}`,
            url: att.file.startsWith('http') ? att.file : `${origin}${att.file}`,
            name: typeof att.file === 'string' ? att.file.split("/").pop() : 'unknown_file',
            isNew: false,
          }));
          setImages((prevImages) => [
            ...prevImages.filter((img) => !img.isNew),
            ...newAttachments,
          ]);
          toast.success("Images uploaded successfully.");
        } catch (error) {
          console.error("Attachment upload failed:", error.response?.data || error.message);
          toast.error("Failed to upload images.");
        } finally {
          setLoading(false);
        }
      }
    };

    if (images.some(img => img.isNew)) {
      uploadImages();
    }
  }, [images, vehicleId, origin]);

  // Fetch vehicle details on mount
  useEffect(() => {
    fetchVehicleDetails();
  }, [vehicleId]);

  const formatStatus = (status) => {
    if (!status) return "";
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading && !vehicleDetails) {
    return (
      <div className="h-[80svh]">
        <Spinner />
      </div>
    );
  }

  if (!vehicleDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-[80svh]">
        <p className="text-lg text-gray-600">Vehicle not found or error loading details.</p>
        <BackButton />
      </div>
    );
  }

  return (
    <>
      {/* Header Start */}
      <div className="flex flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
        <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-1">
          <BackButton />
          Vehicle Details
        </h1>
        <div className="flex flex-col md:flex-row gap-2">
          <button
            className={`border rounded-lg px-3 py-2 font-medium text-sm ${getStatusStyles(vehicleDetails?.status) || "bg-red-100 text-red-700 border-red-300"}`}
          >
            {formatStatus(vehicleDetails?.status)}
          </button>
        </div>
      </div>

      <div className="relative">
        {loading && vehicleDetails && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-xl">
            <Spinner />
          </div>
        )}
        <div className="flex flex-col lg:flex-row justify-between flex-wrap gap-2">
          {/* Vehicle Info */}
          <div className="flex flex-col gap-4 w-full border border-gray-200 bg-white rounded-xl py-6 px-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Vehicle Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ["Name", vehicleDetails?.name],
                ["VIN", vehicleDetails?.vin],
                ["Make", vehicleDetails?.make],
                ["Model", vehicleDetails?.model],
                ["Year", vehicleDetails?.year],
                ["Current Mileage", vehicleDetails?.current_mileage],
                ["Created At", new Date(vehicleDetails?.created_at).toLocaleString()],
                ["Updated At", new Date(vehicleDetails?.updated_at).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col">
                  <span className="font-medium text-gray-500">{label}</span>
                  <span className="font-semibold text-primary break-words">{value || "N/A"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Images section */}
          <div className="w-full border border-gray-200 bg-white rounded-xl py-6 px-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              Vehicle Images
            </h2>
            <ImageUploaderComponent images={images} showDeleteButton={isAdmin} setImages={setImages} loading={loading} disableUpload={!isManager && !isAdmin} />
          </div>

          {/* Vehicle Usage section */}
          <div className="w-full border border-gray-200 bg-white rounded-xl py-2 px-4 mt-2">
            <VehicleUsagesTable
              vehicle={vehicleDetails}
              onUsageUpdate={fetchVehicleDetails}
              canCreateUsage={vehicleDetails?.status === 'available'}
            />
          </div>

          {isAdmin || isManager && (
            <div className="w-full border border-gray-200 bg-white rounded-xl py-2 px-4 mt-2">
              <VehicleMaintenanceTable
                vehicle={vehicleDetails}
                onMaintenanceUpdate={fetchVehicleDetails}
                canCreateMaintenance={isAdmin || isManager}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default VehicledetailsPage;