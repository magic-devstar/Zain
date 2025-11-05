import React, { useState, useMemo } from "react";
import TableComponent from "../../../Components/Common/TableComponent";
import api from "../../../utils/api";
import PopupComponent from "../../../Components/popups/PopupComponent";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSelector } from 'react-redux';
import { EyeIcon } from "@heroicons/react/24/outline";
import ImageCarousel from "../../../Components/Common/ImageCarousel";
import VehicleFormPopup from "../../../Components/popups/VehicleFormPopup";
import VehicleFilter from "../../../Components/filters/VehicleFilter";
import { PAGE_IDS } from "../../../utils/sortingUtils";
import useReportsToggle from "../../../utils/useReportsToggle";
function VehiclesListPage() {
    const user = useSelector((state) => state.user.user);
    const isAdmin = user?.role === "Admin";
    const isManager = user?.role === "Manager";
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [vehicleDetails, setVehicleDetails] = useState(null);
    const [filters, setFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [showCarousel, setShowCarousel] = useState(false);
    const [carouselAttachments, setCarouselAttachments] = useState([]);
    const [printing, setPrinting] = useState(false);
    const imageAPIBaseURL = api.defaults.baseURL.replace("/api/v1", "");
    const { reportsEnabled } = useReportsToggle();
    const renderVehicles = (vehiclesData) => {
        setVehicles(vehiclesData);
    };

    const handleCreateVehicle = () => {
        setVehicleDetails(null);
        setPopupName("Create Vehicle");
        setPopup(true);
    };

    const handleVehicleSubmit = async ({ data: vehicleData, files }) => {
        try {
            setLoading(true);
            setRefreshToggle(false);

            const vehicleResponse = await api.post("/common/api/vehicles/", vehicleData);
            const vehicleId = vehicleResponse.data.id;
            toast.success("Vehicle created successfully!");

            if (files && files.length > 0) {
                const attachmentFormData = new FormData();
                files.forEach(file => {
                    attachmentFormData.append("images", file);
                });
                attachmentFormData.append("reference_type", "vehicle");
                attachmentFormData.append("id", vehicleId);

                try {
                    await api.post("/common/api/attachments/attach_to_reference/", attachmentFormData, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                } catch (attachError) {
                    console.error("Attachment upload failed:", attachError.response?.data || attachError.message);
                    toast.error("Failed to upload attachments for the vehicle.");
                }
            }

            setRefreshToggle(true);
            setPopup(false);
            return vehicleResponse;

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
                toast.error(error.message || "Failed to create vehicle");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEditVehicle = (vehicle) => {
        setVehicleDetails(vehicle);
        setPopupName("Edit Vehicle");
        setPopup(true);
    };

    const handleEditVehicleSubmit = async ({ data: vehicleData, files }) => {
        try {
            setLoading(true);
            setRefreshToggle(false);
            const vehicleId = vehicleData.id;

            const vehicleResponse = await api.put(`/common/api/vehicles/${vehicleId}/`, vehicleData);
            toast.success("Vehicle updated successfully!");

            if (files && files.length > 0) {
                const attachmentFormData = new FormData();
                files.forEach(file => {
                    attachmentFormData.append("images", file);
                });
                attachmentFormData.append("reference_type", "vehicle");
                attachmentFormData.append("id", vehicleId);

                try {
                    await api.post("/common/api/attachments/attach_to_reference/", attachmentFormData, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                } catch (attachError) {
                    console.error("Attachment upload failed:", attachError.response?.data || attachError.message);
                    toast.error("Failed to upload new attachments for the vehicle.");
                }
            }

            setPopup(false);
            setRefreshToggle(true);
            return vehicleResponse;

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
                toast.error(error.message || "Failed to update vehicle");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteVehicle = async (vehicleId) => {
        try {
            setRefreshToggle(false);
            await api.delete(`/common/api/vehicles/${vehicleId}/`);
            toast.success('Vehicle deleted!');
            setRefreshToggle(true);
        } catch (error) {
            toast.error(error.message || "Failed to delete vehicle");
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
            return {
                ...att,
                file: relativePath
            };
        });
        setCarouselAttachments(transformedAttachments);
        setShowCarousel(true);
    };

    const handlePrintReport = async (currentFilters = filters) => {
        try {
            setPrinting(true);

            // Prepare params with all=true to get all vehicles
            const params = { ...currentFilters, all: true };
            Object.keys(params).forEach((k) => {
                if (params[k] === "" || params[k] === null) delete params[k];
            });

            const { data: allVehicles } = await api.get("/common/api/vehicles/", { params });

            if (!allVehicles || allVehicles.length === 0) {
                toast.error("No vehicles found for the selected filters");
                return;
            }

            // Generate HTML rows for the report
            const htmlRows = allVehicles.map(vehicle => {
                const statusFormatted = vehicle.status
                    ? vehicle.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                    : 'N/A';

                return `<tr>
                    <td>${vehicle.name || 'N/A'}</td>
                    <td>${vehicle.vin || 'N/A'}</td>
                    <td>${vehicle.make || 'N/A'}</td>
                    <td>${vehicle.model || 'N/A'}</td>
                    <td>${vehicle.year || 'N/A'}</td>
                    <td>${statusFormatted}</td>
                    <td>${vehicle.current_mileage || 'N/A'}</td>
                </tr>`;
            }).join('\n');

            // Create hidden iframe for printing
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();

            const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Vehicles Report</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 40px;
            background: #f9fafb;
            color: #1f2937;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,.1);
            padding: 30px;
            border: 1px solid #e5e7eb;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0060AC;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header img {
            max-width: 130px;
            height: auto;
        }
        .company-info {
            text-align: right;
        }
        .company-info h2 {
            margin: 0 0 5px 0;
            color: #0060AC;
            font-size: 24px;
        }
        .company-info p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }
        .report-title {
            font-size: 32px;
            font-weight: 800;
            color: #0060AC;
            margin: 0 0 10px 0;
            text-transform: uppercase;
        }
        .report-subtitle {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th, td {
            padding: 12px 15px;
            text-align: left;
            font-size: 14px;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #0060AC;
            color: #fff;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }
        td {
            background: #fff;
        }
        tr:hover td {
            background: #f9fafb;
        }
        .status-available {
            background: #dcfce7;
            color: #166534;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-in_use {
            background: #dbeafe;
            color: #1e40af;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-in_maintenance {
            background: #fef3c7;
            color: #92400e;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-retired {
            background: #fee2e2;
            color: #991b1b;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .summary {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .summary h3 {
            margin: 0 0 15px 0;
            color: #1f2937;
            font-size: 18px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-number {
            font-size: 24px;
            font-weight: 700;
            color: #0060AC;
        }
        .summary-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        @media print {
            body {
                padding: 0;
                background: #fff;
            }
            .container {
                box-shadow: none;
                border: none;
                max-width: none;
            }
            .header {
                page-break-inside: avoid;
            }
            table {
                page-break-inside: auto;
            }
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
        }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <img src='/assets/images/logo.png' alt='T Technologies INC Logo'/>
            <div class='company-info'>
                <h2>T Technologies INC</h2>
                <p>720 Cotton Farm Rd, Pinetops, NC 27864</p>
                <p>Phone: 252-827-1002</p>
            </div>
        </div>
        <h1 class='report-title'>Vehicles Report</h1>
        <p class='report-subtitle'>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>VIN</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Current Mileage</th>
                </tr>
            </thead>
            <tbody>
                ${htmlRows}
            </tbody>
        </table>
    </div>
</body>
</html>`;

            doc.write(htmlContent);
            doc.close();

            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    document.body.removeChild(iframe);
                }, 300);
            };

        } catch (error) {
            console.error("Print vehicles error:", error);
            toast.error(error.message || "Failed to generate vehicles report");
        } finally {
            setPrinting(false);
        }
    };

    const handleSortChange = (newSortConfig) => {
        console.log('Vehicles sorting changed:', newSortConfig);
        setSortConfig(newSortConfig);
        setRefreshToggle(prev => !prev);
    };

    const columns = useMemo(() => {
        const baseColumns = [
            { name: "Image", key: "attachments", sortable: false },
            { name: "Name", key: "name", sortable: true },
            { name: "VIN", key: "vin", sortable: true },
            { name: "Make", key: "make", sortable: true },
            { name: "Model", key: "model", sortable: true },
            { name: "Year", key: "year", sortable: true },
            { name: "Status", key: "status", sortable: true },
            { name: "Mileage", key: "current_mileage", sortable: true },
        ];

        if (isAdmin) {
            baseColumns.push({ name: "Actions", key: "actions", sortable: false });
        }

        return baseColumns;
    }, [isAdmin]);

    const formatStatus = (status) => {
        if (!status) return "";
        return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

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

    const cells = useMemo(() => [
        ({ row }) => {
            if (!row.attachments || row.attachments.length === 0) {
                return (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        No Image
                    </div>
                );
            }

            return (
                <div className="relative group w-12 h-12">
                    <img
                        src={row.attachments[0].file}
                        alt={row.name || "Vehicle image"}
                        className="w-full h-full object-cover rounded"
                        onError={(e) => { e.target.onerror = null; e.target.src = '../../../../assets/images/vehicle_placeholder.png'; }}
                    />
                    <div
                        className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer rounded"
                        onClick={() => handleImageClick(row.attachments)}
                    >
                        <EyeIcon className="w-6 h-6 text-white" />
                    </div>
                </div>
            );
        },
        ({ row }) => (
            <div
                className="text-sm font-semibold cursor-pointer"
                onClick={() => navigate(`${row.id}`)}
            >
                {row.name}
            </div>
        ),
        ({ row }) => <div className="text-sm">{row.vin}</div>,
        ({ row }) => <div className="text-sm">{row.make}</div>,
        ({ row }) => <div className="text-sm">{row.model}</div>,
        ({ row }) => <div className="text-sm">{row.year}</div>,
        ({ row }) => (
            <div className={`text-xs px-2 py-1 rounded-full border text-center ${getStatusStyles(row.status)}`}>
                {formatStatus(row.status)}
            </div>
        ),
        ({ row }) => <div className="text-sm">{row.current_mileage}</div>,
    ], [imageAPIBaseURL, navigate]);

    return (
        <>
            {reportsEnabled && (
                <VehicleFilter
                    onFilterChange={(newFilters) => {
                        setFilters(newFilters);
                        // Clear sorting when filters change to avoid confusion
                        setSortConfig({ key: null, direction: 'asc' });
                        setRefreshToggle(prev => !prev);
                    }}
                    onPrintClick={handlePrintReport}
                    showPrintOption={true} 
                    printing={printing}
                />
            )}
            <TableComponent
                dataloading={dataLoading}
                columns={columns}
                data={vehicles}
                cells={cells}
                heading="Vehicles List"
                description="Create and manage your vehicles here."
                createBtn={isAdmin || isManager}
                onCreateClick={handleCreateVehicle}
                actionIcons={isAdmin}
                apiEndpoint="/common/api/vehicles/"
                extraParams={{
                    ...filters,
                    ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
                }}
                itemsPerPage={10}
                renderData={renderVehicles}
                hideDeleteBtn={!isAdmin}
                hideEditBtn={!isAdmin}
                onLoadingChange={setDataLoading}
                EditClick={(vehicle) => handleEditVehicle(vehicle)}
                DeleteClick={(vehicleId) => handleDeleteVehicle(vehicleId)}
                refresh={refreshToggle}
                onSortChange={handleSortChange}
                pageId={PAGE_IDS.VEHICLE_LIST}
            />
            {popupName === "Create Vehicle" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <VehicleFormPopup
                        onClose={() => setPopup(false)}
                        onSubmit={handleVehicleSubmit}
                        isSubmitting={loading}
                    />
                </PopupComponent>
            )}
            {popupName === "Edit Vehicle" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <VehicleFormPopup
                        vehicleDetails={vehicleDetails}
                        onSubmit={handleEditVehicleSubmit}
                        isSubmitting={loading}
                    />
                </PopupComponent>
            )}
            {showCarousel && (
                <PopupComponent popup={showCarousel} setPopup={setShowCarousel} loading={false}>
                    <ImageCarousel attachments={carouselAttachments} />
                </PopupComponent>
            )}
        </>
    );
}

export default VehiclesListPage;