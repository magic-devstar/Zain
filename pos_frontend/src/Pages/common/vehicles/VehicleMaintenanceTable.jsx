import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import VehicleMaintenanceFormPopup from '../../../Components/popups/VehicleMaintenanceFormPopup';
import TableComponent from '../../../Components/Common/TableComponent';
import PopupComponent from '../../../Components/popups/PopupComponent';
import api from '../../../utils/api';
import { useSelector } from 'react-redux';
import ImageCarousel from '../../../Components/Common/ImageCarousel';
import { EyeIcon } from "@heroicons/react/24/outline";

const VehicleMaintenanceTable = ({ vehicle, onMaintenanceUpdate, canCreateMaintenance }) => {
    const { vehicleId } = useParams();
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [selectedMaintenance, setSelectedMaintenance] = useState(null);
    const [showCarousel, setShowCarousel] = useState(false);
    const [carouselAttachments, setCarouselAttachments] = useState([]);
    const user = useSelector((state) => state.user.user);
    const isAdmin = user?.role === "Admin";
    const imageAPIBaseURL = api.defaults.baseURL.replace("/api/v1", "");

    const renderMaintenanceRecords = (records) => {
        setMaintenanceRecords(records);
    };

    const handleCreateMaintenance = () => {
        setSelectedMaintenance(null);
        setPopupName("Create Maintenance");
        setPopup(true);
    };

    const handleEditMaintenance = (maintenance) => {
        setSelectedMaintenance(maintenance);
        setPopupName("Edit Maintenance");
        setPopup(true);
    };

    const handleMaintenanceSubmit = async ({ data: maintenanceData, files }) => {
        try {
            setLoading(true);
            let response;

            if (maintenanceData.id) {
                response = await api.put(
                    `/common/api/vehicle-maintenance/${maintenanceData.id}/`,
                    maintenanceData
                );
            } else {
                response = await api.post(
                    '/common/api/vehicle-maintenance/',
                    maintenanceData
                );
            }

            if (files && files.length > 0) {
                const attachmentFormData = new FormData();
                files.forEach(file => {
                    attachmentFormData.append("images", file);
                });
                attachmentFormData.append("reference_type", "vehiclemaintenance");
                attachmentFormData.append("id", response.data.id);

                try {
                    await api.post("/common/api/attachments/attach_to_reference/", attachmentFormData, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                } catch (attachError) {
                    console.error("Attachment upload failed:", attachError.response?.data || attachError.message);
                    toast.error("Failed to upload attachments for the maintenance record.");
                }
            }

            toast.success(
                maintenanceData.id
                    ? "Maintenance record updated successfully!"
                    : "Maintenance record created successfully!"
            );
            setPopup(false);
            setRefreshToggle(prev => !prev);
            if (onMaintenanceUpdate) onMaintenanceUpdate();
            return response;

        } catch (error) {
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                Object.entries(errorData).forEach(([field, messages]) => {
                    if (Array.isArray(messages)) {
                        messages.forEach((msg) => toast.error(`${field}: ${msg}`));
                    } else {
                        toast.error(`${field}: ${messages}`);
                    }
                });
            } else {
                toast.error(error.message || "Failed to process maintenance record");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMaintenance = async (maintenanceId) => {
        try {
            setRefreshToggle(false);
            await api.delete(`/common/api/vehicle-maintenance/${maintenanceId}/`);
            toast.success('Maintenance record deleted successfully!');
            setRefreshToggle(true);
            if (onMaintenanceUpdate) onMaintenanceUpdate();
        } catch (error) {
            toast.error(error.message || "Failed to delete maintenance record");
        }
    };

    const handleImageClick = (attachmentsFromRow) => {
        if (!Array.isArray(attachmentsFromRow)) {
            setCarouselAttachments([]);
            setShowCarousel(true);
            return;
        }
        const transformedAttachments = attachmentsFromRow.map(att => {
            let relativePath = att.file;
            if (typeof att.file === 'string' && att.file.startsWith(imageAPIBaseURL)) {
                relativePath = att.file.substring(imageAPIBaseURL.length);
            }
            if (relativePath && !relativePath.startsWith('/')) {
                relativePath = '/' + relativePath;
            }
            return {
                ...att,
                file: relativePath
            };
        });
        setCarouselAttachments(transformedAttachments);
        setShowCarousel(true);
    };

    const columns = useMemo(() => [
        { name: "Images", key: "attachments" },
        { name: "Type", key: "maintenance_type_display" },
        { name: "Service Provider", key: "service_provider" },
        { name: "Cost", key: "cost" },
        { name: "Start Date", key: "start_date" },
        { name: "End Date", key: "end_date" },
        { name: "Mileage", key: "mileage_at_maintenance" },
        { name: "Next Service", key: "next_maintenance_date" },
        { name: "Actions", key: "actions" }
    ], []);

    const cells = useMemo(() => [
        // Images cell
        ({ row }) => (
            <div className="relative group w-12 h-12">
                {row.attachments && row.attachments.length > 0 ? (
                    <>
                        <img
                            src={row.attachments[0].file}
                            alt="Maintenance"
                            className="w-full h-full object-cover rounded"
                        />
                        <div 
                            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer rounded"
                            onClick={() => handleImageClick(row.attachments)}
                        >
                            <EyeIcon className="w-6 h-6 text-white" />
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        No Image
                    </div>
                )}
            </div>
        ),
        // Type cell
        ({ row }) => <div className="text-sm font-semibold">{row.maintenance_type_display}</div>,
        // Service Provider cell
        ({ row }) => <div className="text-sm">{row.service_provider}</div>,
        // Cost cell
        ({ row }) => <div className="text-sm">${row.cost}</div>,
        // Start Date cell
        ({ row }) => <div className="text-sm">{new Date(row.start_date).toLocaleString()}</div>,
        // End Date cell
        ({ row }) => <div className="text-sm">{row.end_date ? new Date(row.end_date).toLocaleString() : "In Progress"}</div>,
        // Mileage cell
        ({ row }) => <div className="text-sm">{row.mileage_at_maintenance}</div>,
        // Next Service cell
        ({ row }) => <div className="text-sm">{row.next_maintenance_date ? new Date(row.next_maintenance_date).toLocaleDateString() : "Not Scheduled"}</div>
    ], [imageAPIBaseURL]);

    return (
        <>
            <TableComponent
                dataloading={dataLoading}
                columns={columns}
                data={maintenanceRecords}
                cells={cells}
                heading="Maintenance Records"
                description="View and manage maintenance records for this vehicle."
                createBtn={canCreateMaintenance}
                createBtnText="Add Maintenance Record"
                onCreateClick={handleCreateMaintenance}
                actionIcons={true}
                apiEndpoint={`/common/api/vehicle-maintenance/?vehicle_id=${vehicleId}`}
                extraParams={{}}
                itemsPerPage={10}
                renderData={renderMaintenanceRecords}
                hideDeleteBtn={!isAdmin}
                onLoadingChange={setDataLoading}
                EditClick={(record) => handleEditMaintenance(record)}
                DeleteClick={(recordId) => handleDeleteMaintenance(recordId)}
                refresh={refreshToggle}
            />

            {(popupName === "Create Maintenance" || popupName === "Edit Maintenance") && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <VehicleMaintenanceFormPopup
                        onClose={() => setPopup(false)}
                        onSubmit={handleMaintenanceSubmit}
                        isSubmitting={loading}
                        vehicle={vehicle}
                        maintenanceDetails={selectedMaintenance}
                    />
                </PopupComponent>
            )}

            {showCarousel && (
                <PopupComponent popup={showCarousel} setPopup={setShowCarousel} loading={false}>
                    <ImageCarousel attachments={carouselAttachments} baseUrl={imageAPIBaseURL} />
                </PopupComponent>
            )}
        </>
    );
};

export default VehicleMaintenanceTable; 