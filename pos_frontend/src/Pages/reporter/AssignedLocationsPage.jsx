import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from 'react-hot-toast';
import TableComponent from "../../Components/Common/TableComponent";
import PopupComponent from "../../Components/popups/PopupComponent";
import LocationFomrPopup from "../../Components/popups/LocationFomrPopup";
import { createLocation, deleteLocation, updateLocation } from "../../utils/apis/locationUtils";
import { useSelector } from 'react-redux';
import LocationsFilter from "../../Components/filters/LocationsFilter";

function AssignedLocationsPage() {
    const navigate = useNavigate();
    const [dataLoading, setDataLoading] = useState(true);
    const [Locations, setLocations] = useState([]);
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [LocationDetails, setLocationDetails] = useState(null);
    const { vendingCustomerId } = useParams();
    const user = useSelector((state) => state.user.user);
    const isReporter = user?.role === "Reporter";
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

    const columns = [
        { name: "Name", key: "name" },
        { name: "Created at", key: "created_at" },
        { name: "Status", key: "status" },
        { name: "Actions", key: "actions" },
    ];

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
            }} />
            <TableComponent
                dataloading={dataLoading}
                columns={columns}
                data={Locations}
                cells={cells}
                heading="Assigned Locations"
                description="Manage your Assigned Locations here."
                createBtn={true}
                onCreateClick={handleCreateLocation}
                actionIcons={true}
                hideDeleteBtn={isReporter}
                apiEndpoint="/common/api/vending-customer-locations/"
                extraParams={{
                    ...(vendingCustomerId ? { vending_customer: vendingCustomerId } : {}),
                    ...filters,
                }}
                itemsPerPage={10}
                renderData={renderLocations}
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

export default AssignedLocationsPage;