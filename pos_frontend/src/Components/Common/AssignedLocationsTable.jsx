import React, { useState, useMemo } from "react";
import TableComponent from "./TableComponent";
import { toast } from "react-hot-toast";
import api from "../../utils/api";
import { MapPin } from "lucide-react";

const AssignedLocationsTable = ({ partnerId, onRefresh }) => {
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Table columns for permitted locations
  const columns = useMemo(() => [
    { name: "Location Name", key: "location_details.name" },
    { name: "Assigned By", key: "assigned_by_user.username" },
    { name: "Assigned At", key: "assigned_at" },
    { name: "Map", key: "map" },
    { name: "Actions", key: "actions" },
  ], []);

  const handleOpenMap = (location) => {
    try {
      const locationData = JSON.parse(location.location_details.location);
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

  const cells = useMemo(() => [
    ({ row }) => <div className="text-sm">{row.location_details.name}</div>,
    ({ row }) => <div className="text-sm">{row.assigned_by_user?.username || "Unknown"}</div>,
    ({ row }) => <div className="text-sm">{new Date(row.assigned_at).toLocaleString()}</div>,
    ({ row }) => (
      <button
        data-btnbelowtooltip="Open in Map"
        className="p-2 text-primary hover:text-primary_light transition-colors duration-200 cursor-pointer"
        onClick={() => handleOpenMap(row)}
      >
        <MapPin className="w-5 h-5" />
      </button>
    ),
  ], []);

  const handleDeletePermission = async (permissionId) => {
    try {
      await api.delete(`/common/api/location-permissions/${permissionId}/`);
      toast.success("Location permission removed successfully");
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to delete permission", error);
      toast.error(error.response?.data?.detail || "Failed to remove location permission");
    }
  };

  return (
    <TableComponent
      columns={columns}
      cells={cells}
      data={permissions}
      dataloading={permissionsLoading}
      heading="Assigned Locations"
      description="Locations assigned to this partner"
      apiEndpoint="/common/api/location-permissions/"
      extraParams={{
        user_id: partnerId
      }}
      itemsPerPage={10}
      renderData={setPermissions}
      onLoadingChange={setPermissionsLoading}
      refresh={onRefresh}
      hideCreateBtn={true}
      actionIcons={true}
      DeleteClick={handleDeletePermission}
      hideEditBtn={true}
    />
  );
};

export default AssignedLocationsTable; 