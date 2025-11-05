import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from 'react-hot-toast';
import TableComponent from "../../Components/Common/TableComponent";
import PopupComponent from "../../Components/popups/PopupComponent";
import LocationFomrPopup from "../../Components/popups/LocationFomrPopup";
import { createLocation, deleteLocation, updateLocation } from "../../utils/apis/locationUtils";
import { useSelector } from 'react-redux';
import LocationsFilter from "../../Components/filters/LocationsFilter";
import Avatar from "../../Components/Common/Avatar";
import api from "../../utils/api";

function LocationsPage() {
    const navigate = useNavigate();
    const [dataLoading, setDataLoading] = useState(true);
    const [Locations, setLocations] = useState([]);
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [LocationDetails, setLocationDetails] = useState(null);
    const [printing, setPrinting] = useState(false);
    const { vendingCustomerId } = useParams();
    const user = useSelector((state) => state.user.user);
    const isVendingCustomer = user?.role === "Vending Customer";
    const isManager = user?.role === "Manager";
    const isAdmin = user?.role === "Admin";
    const [filters, setFilters] = useState({});

    const renderLocations = (LocationsData) => {
        setLocations(LocationsData);
    };

    const handleCreateLocation = () => {
        setPopupName("Create Location");
        setPopup(true);
    };

    const handleLocationSubmit = async (LocationData) => {
        try {
            setLoading(true);
            setRefreshToggle(false);
            const response = await createLocation(LocationData, vendingCustomerId);
            setRefreshToggle(true);
            return response;
        } catch (error) {
            toast.error(error.message || "Failed to create Location");
        } finally {
            setLoading(false);
        }
    };

    const handleEditLocation = (Location) => {
        setLocationDetails(Location);
        setPopupName("Edit Location");
        setPopup(true);
    };

    const handleEditLocationSubmit = async (updatedData) => {
        try {
            setRefreshToggle(false);
            const response = await updateLocation(LocationDetails.id, updatedData);
            console.log("Location updated successfully", response);
            setRefreshToggle(true);
        } catch (error) {
            console.error("Error updating Location", error);
        }
    };

    const handleDeleteLocation = async (LocationId) => {
        try {
            setRefreshToggle(false);
            let response;
            response = await deleteLocation(LocationId);
            setRefreshToggle(true);
            return response;
        } catch (error) {
            toast.error(error.message || "Failed to delete Location");
        }
    };

    const handlePrintReport = async (currentFilters = filters) => {
        try {
            setPrinting(true);

            const params = { 
                ...currentFilters, 
                all: true,
                ...(vendingCustomerId ? { vending_customer: vendingCustomerId } : {})
            };
            
            // Remove empty values
            Object.keys(params).forEach((k) => { 
                if (params[k] === "" || params[k] === null) delete params[k]; 
            });

            const { data: allLocations } = await api.get("/common/api/vending-customer-locations/", { params });

            if (!allLocations || allLocations.length === 0) { 
                toast.error("No locations found for selected filters"); 
                return; 
            }

            // Build HTML rows for the report
            const htmlRows = allLocations.map(location => `
                <tr>
                    <td>${location.name}</td>
                    <td>${new Date(location.created_at).toLocaleString()}</td>
                    <td>${location.assigned_to_user ? location.assigned_to_user.username : 'N/A'}</td>
                    <td>${location.status.charAt(0).toUpperCase() + location.status.slice(1)}</td>
                </tr>
            `).join('');

            // Create iframe for printing
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
            doc.write(`
                <html>
                    <head>
                        <title>Locations Report</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; font-weight: bold; }
                            .header { text-align: center; margin-bottom: 20px; }
                            .header h1 { margin: 0; color: #333; }
                            .header p { margin: 5px 0; color: #666; }
                            @media print {
                                body { margin: 0; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Locations Report</h1>
                            <p>Generated on: ${new Date().toLocaleString()}</p>
                            <p>Total Locations: ${allLocations.length}</p>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Created At</th>
                                    <th>Assigned To</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${htmlRows}
                            </tbody>
                        </table>
                    </body>
                </html>
            `);
            doc.close();

            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    document.body.removeChild(iframe);
                }, 300);
            };
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to generate locations report');
        } finally {
            setPrinting(false);
        }
    };

    const columnsBase = [
        { name: "Name", key: "name" },
        { name: "Created at", key: "created_at" },
        { name: "Assigned to", key: "assigned_to" },
        { name: "Status", key: "status" },
    ];
    const columns = (isAdmin || isManager)
        ? [...columnsBase, { name: "Actions", key: "actions" }]
        : columnsBase;

    const cells = [
        ({ row }) => (
            <div className="text-sm font-semibold cursor-pointer"
                onClick={() => navigate(`${row.name}/${row.id}`)}
            >{row.name}</div>
        ),
        ({ row }) => (
            <div className="text-sm font-medium text-gray-700">
                {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }).format(new Date(row.created_at))}
            </div>
        ),
        ({ row }) => (
            <div className="text-sm font-medium text-gray-700">
                {row?.assigned_to_user ? (
                    <div className="flex flex-col gap-4 w-full">
                        <div className="flex items-center gap-4 w-full justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar
                                    user={row.assigned_to_user}
                                    color="bg-primary"
                                />
                                {/* Info */}
                                <div className="flex flex-col">
                                    <span className="font-semibold text-gray-800">{row.assigned_to_user.username}</span>
                                    <span className="text-sm text-gray-500">{row.assigned_to_user.email || "No email"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">N/A.</p>
                )}
            </div>
        ),

        ({ row }) => {
            const statusColors = {
                active: "bg-blue-100 text-blue-700 border border-blue-300",
                inactive: "bg-gray-200 text-gray-800 border border-gray-400",
            };

            return (
                <div
                    className={`px-3 py-1 text-xs font-medium rounded-full w-fit ${statusColors[row.status] || "bg-red-100 text-red-700 border border-red-300"
                        }`}
                >
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                </div>
            );
        }
    ];

    return (
        <>
            <LocationsFilter
                title="Location"
                onFilterChange={(newFilters) => {
                    setFilters(newFilters);
                    setRefreshToggle(prev => !prev);
                }}
                showPrintOption={true}
                onPrintClick={handlePrintReport}
                printing={printing}
            />

            <TableComponent
                dataloading={dataLoading}
                columns={columns}
                data={Locations}
                cells={cells}
                heading="All Locations"
                description="Create and manage your Locations here."
                createBtn={isAdmin || isManager}
                onCreateClick={handleCreateLocation}
                actionIcons={isAdmin || isManager}
                hideDeleteBtn={!isAdmin}
                apiEndpoint="/common/api/vending-customer-locations/"
                extraParams={{
                    ...(vendingCustomerId ? { vending_customer: vendingCustomerId } : {}),
                    ...filters,
                }}
                itemsPerPage={10}
                renderData={renderLocations}
                hideEditBtn={!(isAdmin || isManager)}
                EditClick={(Location) => handleEditLocation(Location)}
                DeleteClick={(LocationId) => handleDeleteLocation(LocationId)}
                onLoadingChange={setDataLoading}
                refresh={refreshToggle}
            />

            {popupName === "Create Location" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <LocationFomrPopup
                        loading={loading}
                        onSubmit={handleLocationSubmit}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}
            {popupName === "Edit Location" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <LocationFomrPopup
                        loading={loading}
                        initialData={LocationDetails}
                        onSubmit={handleEditLocationSubmit}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}
        </>
    );
}

export default LocationsPage;