import React, { useState, useEffect } from 'react';
import Spinner from '../Common/Spinner';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';
import { MapPin, Section } from 'lucide-react';
import PrimaryBtn from '../Common/PrimaryBtn';
import SecondaryBtn from '../Common/SecondaryBtn';

const AssignLocationsPopup = ({ 
  isOpen, 
  onClose, 
  partnerId, 
  partnerName, 
  locations, 
  locationsLoading,
  onSuccess 
}) => {
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [existingPermissions, setExistingPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Fetch existing permissions when popup opens
  useEffect(() => {
    const fetchExistingPermissions = async () => {
      if (!isOpen || !partnerId) return;
      
      try {
        setLoadingPermissions(true);
        const response = await api.get('/common/api/location-permissions/', {
          params: {
            user_id: partnerId,
            all: true
          }
        });
        const permittedLocationIds = response.data.map(permission => permission.location);
        setExistingPermissions(response.data);
        setSelectedLocations(permittedLocationIds);
      } catch (error) {
        console.error("Failed to fetch existing permissions", error);
        toast.error("Failed to load existing permissions");
      } finally {
        setLoadingPermissions(false);
      }
    };

    fetchExistingPermissions();
  }, [isOpen, partnerId]);

  const handleLocationToggle = async (locationId) => {
    const isCurrentlySelected = selectedLocations.includes(locationId);
    
    if (isCurrentlySelected) {
      // Find the permission to delete
      const permissionToDelete = existingPermissions.find(p => p.location === locationId);
      if (permissionToDelete) {
        try {
          await api.delete(`/common/api/location-permissions/${permissionToDelete.id}/`);
          setExistingPermissions(prev => prev.filter(p => p.id !== permissionToDelete.id));
          toast.success("Location permission removed");
        } catch (error) {
          console.error("Failed to remove permission", error);
          toast.error("Failed to remove location permission");
          return; // Don't update selection if delete failed
        }
      }
    }
    
    setSelectedLocations(prev =>
      isCurrentlySelected
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleOpenMap = (location) => {
    try {
      const locationData = JSON.parse(location.location);
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

  const handleAssignLocations = async () => {
    try {
      setSubmitting(true);
      // Only assign locations that aren't already assigned
      const existingLocationIds = existingPermissions.map(p => p.location);
      const newLocationIds = selectedLocations.filter(id => !existingLocationIds.includes(id));
      
      if (newLocationIds.length > 0) {
        await api.post(`/common/api/location-permissions/bulk-assign/`, {
          user_id: partnerId,
          location_ids: newLocationIds,
        });
      }
      
      onSuccess();
      onClose();
      toast.success("Locations updated successfully");
    } catch (error) {
      console.error("Failed to assign locations", error);
      toast.error(error.response?.data?.detail || "Failed to update locations");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Assign Locations to {partnerName}</h2>
        {locationsLoading || loadingPermissions ? (
          <Spinner />
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {locations.length === 0 ? (
              <p className="text-gray-500">No locations available</p>
            ) : (
              locations.map((location) => (
                <div key={location.id} className="flex items-center justify-between mb-2 p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`location-${location.id}`}
                      checked={selectedLocations.includes(location.id)}
                      onChange={() => handleLocationToggle(location.id)}
                      className="mr-2"
                    />
                    <label htmlFor={`location-${location.id}`} className="text-sm">
                      {location.name}
                    </label>
                  </div>
                  {location.location && (
                    <button
                      onClick={() => handleOpenMap(location)}
                      className="p-2 text-primary hover:text-primary_light transition-colors duration-200"
                      title="View on map"
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        <div className="mt-4 flex justify-end space-x-2">
          <SecondaryBtn
            onClick={() => {
              onClose();
              setSelectedLocations([]);
            }}
            disabled={submitting}
          >
            Cancel
          </SecondaryBtn>
          <PrimaryBtn
            onClick={handleAssignLocations}
            disabled={locationsLoading || loadingPermissions || submitting}
          >
            {submitting ? "Updating..." : "Update Locations"}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
};

export default AssignLocationsPopup; 