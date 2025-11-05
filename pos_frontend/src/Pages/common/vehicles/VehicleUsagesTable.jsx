import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import VehicleUsageFormPopup from '../../../Components/popups/VehicleUsageFormPopup';
import TableComponent from '../../../Components/Common/TableComponent';
import PopupComponent from '../../../Components/popups/PopupComponent';
import api from '../../../utils/api';
import PrimaryBtn from '../../../Components/Common/PrimaryBtn';
import SecondaryBtn from '../../../Components/Common/SecondaryBtn';
import { useSelector } from 'react-redux';

const VehicleUsagesTable = ({ vehicle, onUsageUpdate, canCreateUsage }) => {
  const { vehicleId } = useParams();
  const [usages, setUsages] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [selectedUsage, setSelectedUsage] = useState(null);
  const user = useSelector((state) => state.user.user);
  const isAdmin = user?.role === "Admin";

  // Render function for TableComponent
  const renderUsages = (usagesData) => {
    setUsages(usagesData);
  };

  // Handle create usage action
  const handleCreateUsage = () => {
    setSelectedUsage(null);
    setPopupName("Create Usage");
    setPopup(true);
  };

  // Handle return usage action
  const handleReturnUsage = (usage) => {
    if (usage.return_time) {
      toast.error('This vehicle usage has already been returned.');
      return;
    }
    setSelectedUsage(usage);
    setPopupName("Return Usage");
    setPopup(true);
  };

  // Handle usage form submission (create or update)
  const handleUsageSubmit = async ({ data, pickupFiles, returnFiles }) => {
    try {
      setLoading(true);
      setRefreshToggle(false);
      
      const formData = new FormData();
      
      // Always include vehicle ID for new usages
      if (!selectedUsage) {
        data.vehicle = vehicleId;
      }
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          // Convert objects to JSON strings for FormData
          if (typeof value === 'object' && !Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value);
          }
        }
      });

      if (pickupFiles && pickupFiles.length > 0) {
        pickupFiles.forEach((file) => {
          formData.append('pickup_attachments', file);
        });
      }

      if (returnFiles && returnFiles.length > 0) {
        returnFiles.forEach((file) => {
          formData.append('return_attachments', file);
        });
      }

      if (selectedUsage) {
        // Update (return) existing usage
        await api.patch(`/common/api/vehicles/${vehicleId}/usages/${selectedUsage.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Vehicle usage returned successfully.');
      } else {
        // Create new usage - you can also add vehicle_id as query param for extra safety
        await api.post(`/common/api/vehicles/${vehicleId}/usages/?vehicle_id=${vehicleId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Vehicle usage created successfully.');
      }
      
      setPopup(false);
      setRefreshToggle(true);
      if (onUsageUpdate) {
        onUsageUpdate();
      }
    } catch (error) {
      console.error('Error submitting vehicle usage:', error.response?.data || error.message);
      if (error.response && error.response.data) {
        const data = error.response.data;
        // Show all field-level errors from DRF
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => toast.error(`${msg}`));
          } else {
            toast.error(`${field}: ${messages}`);
          }
        });
      } else {
        toast.error('Failed to submit vehicle usage.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle edit usage (optional)
  const handleEditUsage = (usage) => {
    setSelectedUsage(usage);
    setPopupName("Edit Usage");
    setPopup(true);
  };

  // Handle delete usage (optional)
  const handleDeleteUsage = async (usageId) => {
    try {
      setRefreshToggle(false);
      await api.delete(`/common/api/vehicles/${vehicleId}/usages/${usageId}/`);
      toast.success('Vehicle usage deleted successfully!');
      setRefreshToggle(true);
    } catch (error) {
      console.error("Error deleting usage", error);
      toast.error('Failed to delete vehicle usage.');
    }
  };

  // Dynamically build columns based on available data
  const columns = useMemo(() => {
    const hasPrimaryVehicle = usages.some(
      (row) => row.is_secondary_usage && row.primary_usage_details
    );
    const hasSecondaryVehicles = usages.some(
      (row) =>
        row.secondary_vehicles_details &&
        row.secondary_vehicles_details.length > 0
    );

    const baseColumns = [
      { name: 'User', key: 'user' },
      { name: 'Vehicle Type', key: 'vehicle_type' },
    ];

    if (hasPrimaryVehicle) {
      baseColumns.push({ name: 'Primary Vehicle', key: 'primary_vehicle' });
    }

    if (hasSecondaryVehicles) {
      baseColumns.push({ name: 'Secondary Vehicles', key: 'secondary_vehicles' });
    }

    baseColumns.push(
      { name: 'Pickup Time', key: 'pickup_time' },
      { name: 'Return Time', key: 'return_time' },
      { name: 'Pickup Mileage', key: 'pickup_mileage' },
      { name: 'Return Mileage', key: 'return_mileage' },
      { name: 'Status', key: 'status' },
      { name: 'Return', key: 'return' },
      { name: 'Actions', key: 'actions' }
    );

    return baseColumns;
  }, [usages]);

  // Table cells rendering aligned with dynamic columns
  const cells = useMemo(() => {
    const cellRenderers = [
      ({ row }) => <div className="text-sm text-gray-900">{row.user || 'N/A'}</div>,
      ({ row }) => (
        <div className="text-sm">
          <span
            className={`px-2 py-1 rounded-full text-xs ${row.is_secondary_usage ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-green-100 text-green-800 border border-green-300'}`}
          >
            {row.is_secondary_usage ? 'Secondary' : 'Primary'}
          </span>
        </div>
      ),
    ];

    // Conditionally push primary vehicle cell
    const hasPrimaryVehicle = usages.some(
      (row) => row.is_secondary_usage && row.primary_usage_details
    );
    if (hasPrimaryVehicle) {
      cellRenderers.push(({ row }) =>
        row.is_secondary_usage && row.primary_usage_details ? (
          <div className="text-sm text-gray-900">
            <div className="text-xs bg-gray-50 p-1 rounded border">
              {row.primary_usage_details.vehicle_name} ({row.primary_usage_details.vehicle_vin})
            </div>
          </div>
        ) : null
      );
    }

    // Conditionally push secondary vehicles cell
    const hasSecondaryVehicles = usages.some(
      (row) =>
        row.secondary_vehicles_details &&
        row.secondary_vehicles_details.length > 0
    );
    if (hasSecondaryVehicles) {
      cellRenderers.push(({ row }) =>
        row.secondary_vehicles_details && row.secondary_vehicles_details.length > 0 ? (
          <div className="text-sm text-gray-900 space-y-1">
            {row.secondary_vehicles_details.map((vehicle) => (
              <div key={vehicle.id} className="text-xs bg-blue-50 p-1 rounded border">
                {vehicle.name} ({vehicle.vin})
              </div>
            ))}
          </div>
        ) : null
      );
    }

    // Remaining static cells
    cellRenderers.push(
      ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.pickup_time ? new Date(row.pickup_time).toLocaleString() : 'N/A'}
        </div>
      ),
      ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.return_time ? new Date(row.return_time).toLocaleString() : 'Not Returned'}
        </div>
      ),
      ({ row }) => <div className="text-sm text-gray-900">{row.pickup_mileage || 'N/A'}</div>,
      ({ row }) => <div className="text-sm text-gray-900">{row.return_mileage || 'N/A'}</div>,
      ({ row }) => (
        <div className="text-sm">
          <span
            className={`px-2 py-1 rounded-full text-xs ${row.return_time ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-yellow-100 text-yellow-800 border border-yellow-300'}`}
          >
            {row.return_time ? 'Returned' : 'In Use'}
          </span>
        </div>
      ),
      ({ row }) => (
        <div className="text-sm space-x-2">
          {!row.return_time ? (
            <PrimaryBtn
              onClick={() => handleReturnUsage(row)}
              className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded text-xs"
            >
              Return Vehicle
            </PrimaryBtn>
          ) : (
            <SecondaryBtn disabled className="text-gray-400 px-2 py-1 rounded text-xs">
              Returned
            </SecondaryBtn>
          )}
        </div>
      )
    );

    return cellRenderers;
  }, [usages]);

  return (
    <>
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={usages}
        cells={cells}
        heading="Vehicle Usages"
        description="Manage vehicle usage records for this vehicle."
        createBtn={canCreateUsage}
        createBtnText="Pick Vehicle"
        onCreateClick={handleCreateUsage}
        actionIcons={true}
        apiEndpoint={`/common/api/vehicles/${vehicleId}/usages/`}
        extraParams={{}}
        itemsPerPage={10}
        renderData={renderUsages}
        hideDeleteBtn={!isAdmin}
        onLoadingChange={setDataLoading}
        EditClick={(row) => (isAdmin || row.owner) && handleEditUsage(row)}
        DeleteClick={(usageId) => handleDeleteUsage(usageId)}
        refresh={refreshToggle}
        hideEditBtn={(row) => !(isAdmin || row.owner)}
      />
      
      {popupName === "Create Usage" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <VehicleUsageFormPopup
            onClose={() => setPopup(false)}
            onSubmit={handleUsageSubmit}
            isSubmitting={loading}
            vehicleId={vehicleId} // Pass vehicleId to the form
            vehicle={vehicle}
          />
        </PopupComponent>
      )}
      
      {popupName === "Return Usage" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <VehicleUsageFormPopup
            onClose={() => setPopup(false)}
            onSubmit={handleUsageSubmit}
            isSubmitting={loading}
            usageDetails={selectedUsage}
            vehicleId={vehicleId} // Pass vehicleId to the form
            vehicle={vehicle}
          />
        </PopupComponent>
      )}
      
      {popupName === "Edit Usage" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <VehicleUsageFormPopup
            onClose={() => setPopup(false)}
            onSubmit={handleUsageSubmit}
            isSubmitting={loading}
            usageDetails={selectedUsage}
            vehicleId={vehicleId} // Pass vehicleId to the form
            vehicle={vehicle}
          />
        </PopupComponent>
      )}
    </>
  );
};

export default VehicleUsagesTable;