import React, { useState } from 'react';
import TableComponent from '../../Components/Common/TableComponent';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaMapMarkerAlt } from 'react-icons/fa';
import TicketsPage from '../servicecustomer/TicketsPage';

function PartnerDashboard() {
    const [locations, setLocations] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const user = useSelector((state) => state.user.user);
    const navigate = useNavigate();

    const renderLocations = (locations) => {
        setLocations(locations);
    };

    const handleOpenMap = (location) => {
        try {
            const locationData = JSON.parse(location);
            if (locationData && typeof locationData.lat === 'number' && typeof locationData.lng === 'number') {
                const url = `https://www.google.com/maps?q=${locationData.lat},${locationData.lng}`;
                window.open(url, '_blank');
            } else {
                toast.error('Invalid location coordinates');
            }
        } catch (error) {
            console.error('Error parsing location:', error);
            toast.error('Invalid location format');
        }
    };

    const columns = [
        { name: "Location Name", key: "name" },
        { name: "Map", key: "map" },
        { name: "Customer", key: "customer" },
        { name: "Status", key: "status" },
    ];

    const cells = [
        ({ row }) => (
            <div className="flex items-center cursor-pointer"
                onClick={() => navigate(`locations/${row.location_details?.name}/${row.location_details?.id}`)}
            >
                <div className="text-sm font-medium">{row.location_details?.name}</div>
            </div>
        ),
        ({ row }) => (
            <div className="flex items-center">
                <button
                    onClick={() => handleOpenMap(row.location_details?.location)}
                    className="p-2 text-primary hover:text-primary_light transition-colors duration-200"
                    title="View on map"
                >
                    <FaMapMarkerAlt className="w-5 h-5" />
                </button>
            </div>
        ),
        ({ row }) => (
            <div className="text-sm">{row.location_details?.assigned_to_user?.username}</div>
        ),
        ({ row }) => (
            <span
                className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold ${row.location_details?.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
            >
                {row.location_details?.status === "active" ? "Active" : "Inactive"}
            </span>
        ),
    ];

    return (
        <div>
            {user.role === 'Partner' && (
                <>
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Partner Dashboard</h1>
                        <p className="mt-2 text-gray-600">Welcome back, {user?.username}!</p>
                    </div>

                    <div className="bg-white rounded-lg shadow">
                        <TableComponent
                            dataloading={dataLoading}
                            columns={columns}
                            data={locations}
                            cells={cells}
                            heading="Assigned Locations"
                            description="View and manage your assigned locations"
                            createBtn={false}
                            actionIcons={false}
                            apiEndpoint="/common/api/location-permissions/"
                            extraParams={{
                                user_id: user?.id
                            }}
                            itemsPerPage={10}
                            hideDeleteBtn={true}
                            renderData={renderLocations}
                            onLoadingChange={setDataLoading}
                        />
                    </div>
                </>
            )}
            {user.role === 'Employee' && (
                    <TicketsPage />
            )}
        </div>
    );
}

export default PartnerDashboard;
