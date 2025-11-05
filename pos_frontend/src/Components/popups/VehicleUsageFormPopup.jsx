import React, { useState, useEffect } from "react";
import ImageUploaderComponent from '../../Components/Common/ImageUploaderComponent';
import { XMarkIcon } from "@heroicons/react/24/outline";
import api from "../../utils/api";
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";
import { toast } from "react-hot-toast";

function VehicleUsageFormPopup({ onClose, onSubmit, isSubmitting, vehicle, usageDetails }) {
    const [formData, setFormData] = useState({
        pickup_time: new Date().toISOString().slice(0, 16),
        pickup_mileage: "",
        pickup_notes: "",
        return_time: "",
        return_mileage: "",
        return_notes: "",
        pickup_attachments: [],
        return_attachments: [],
        secondary_vehicles: [],
        secondary_vehicle_mileages: {},
    });

    const [availableVehicles, setAvailableVehicles] = useState([]);
    const [loadingVehicles, setLoadingVehicles] = useState(false);
    const imageAPIBaseURL = api.defaults.baseURL.replace("/api/v1", "");

    // Fetch available vehicles for secondary selection
    const fetchAvailableVehicles = async () => {
        try {
            setLoadingVehicles(true);
            const response = await api.get("/common/api/vehicles/?status=available&all=true");
            // Filter out the current vehicle from available options
            const filteredVehicles = response.data.filter(v => v.id !== vehicle?.id);
            setAvailableVehicles(filteredVehicles);
        } catch (error) {
            console.error("Failed to fetch available vehicles:", error);
            toast.error("Failed to load available vehicles");
        } finally {
            setLoadingVehicles(false);
        }
    };

    useEffect(() => {
        if (!usageDetails && vehicle) {
            fetchAvailableVehicles();
        }
    }, [vehicle, usageDetails]);

    // Fetch secondary vehicle usages when returning a primary vehicle
    useEffect(() => {
        if (usageDetails && !usageDetails.is_secondary_usage && usageDetails.secondary_vehicles_details?.length > 0) {
            // The secondary vehicle usages should already be included in the usageDetails
            // from the API response, so we don't need to fetch them separately
        }
    }, [usageDetails]);

    useEffect(() => {
        if (usageDetails) {
            const validPickupAttachments = Array.isArray(usageDetails.pickup_attachments)
                ? usageDetails.pickup_attachments.filter(att => att && typeof att.file === 'string')
                : [];
            const validReturnAttachments = Array.isArray(usageDetails.return_attachments)
                ? usageDetails.return_attachments.filter(att => att && typeof att.file === 'string')
                : [];

            const formattedPickupAttachments = validPickupAttachments.map(att => ({
                id: att.id,
                url: att.file.startsWith('http') ? att.file : `${imageAPIBaseURL}${att.file.startsWith('/') ? '' : '/'}${att.file}`,
                name: att.file.substring(att.file.lastIndexOf('/') + 1),
                isNew: false,
                backendId: att.id
            }));

            const formattedReturnAttachments = validReturnAttachments.map(att => ({
                id: att.id,
                url: att.file.startsWith('http') ? att.file : `${imageAPIBaseURL}${att.file.startsWith('/') ? '' : '/'}${att.file}`,
                name: att.file.substring(att.file.lastIndexOf('/') + 1),
                isNew: false,
                backendId: att.id
            }));

            setFormData({
                pickup_time: usageDetails.pickup_time ? new Date(usageDetails.pickup_time).toISOString().slice(0, 16) : "",
                pickup_mileage: usageDetails.pickup_mileage || "",
                pickup_notes: usageDetails.pickup_notes || "",
                return_time: usageDetails.return_time ? new Date(usageDetails.return_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                return_mileage: usageDetails.return_mileage || usageDetails.pickup_mileage || "",
                return_notes: usageDetails.return_notes || "",
                pickup_attachments: formattedPickupAttachments,
                return_attachments: formattedReturnAttachments,
                secondary_vehicles: usageDetails.secondary_vehicles_details || [],
                secondary_vehicle_mileages: {},
            });
        } else if (vehicle) {
            setFormData(prev => ({
                ...prev,
                pickup_mileage: vehicle.current_mileage || "",
            }));
        }
    }, [usageDetails, vehicle, imageAPIBaseURL]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Allow selecting only one secondary vehicle
    const handleSecondaryVehicleChange = (e) => {
        const selectedId = parseInt(e.target.value);
        const selectedVehicle = availableVehicles.find(vehicle => vehicle.id === selectedId);
        setFormData(prev => ({ ...prev, secondary_vehicles: selectedVehicle ? [selectedVehicle] : [] }));
    };

    const handleSecondaryVehicleMileageChange = (vehicleId, mileage) => {
        setFormData(prev => ({
            ...prev,
            secondary_vehicle_mileages: {
                ...prev.secondary_vehicle_mileages,
                [vehicleId]: mileage
            }
        }));
    };

    const handlePickupUploaderFilesChange = (newImageObjects) => {
        setFormData(prev => ({ ...prev, pickup_attachments: newImageObjects }));
    };

    const handleReturnUploaderFilesChange = (newImageObjects) => {
        setFormData(prev => ({ ...prev, return_attachments: newImageObjects }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.pickup_notes || !formData.pickup_notes.trim()) {
            toast.error("Pickup notes are required.");
            return;
        }

        // Validation for new usage (pickup)
        if (!usageDetails && formData.pickup_attachments.length === 0) {
            toast.error("At least one pickup attachment is required.");
            return;
        }

        // Validation for returning a vehicle
        if (usageDetails && formData.return_attachments.length === 0) {
            toast.error("At least one return attachment is required when returning the vehicle.");
            return;
        }

        // Validation for secondary vehicle mileages when returning
        if (usageDetails && formData.secondary_vehicles.length > 0) {
            const nonReturnedSecondaryVehicles = formData.secondary_vehicles.filter(vehicle => {
                const secondaryUsage = usageDetails.secondary_vehicle_usages?.find(
                    usage => usage.vehicle === vehicle.id
                );
                const isReturned = secondaryUsage?.is_returned || false;
                return !isReturned;
            });

            const missingMileages = nonReturnedSecondaryVehicles.filter(vehicle => 
                !formData.secondary_vehicle_mileages[vehicle.id] || 
                formData.secondary_vehicle_mileages[vehicle.id] === ''
            );

            if (missingMileages.length > 0) {
                toast.error(`Please enter return mileage for: ${missingMileages.map(v => v.name).join(', ')}`);
                return;
            }

            // Validate that mileages are not less than pickup mileages
            for (const vehicle of nonReturnedSecondaryVehicles) {
                const returnMileage = parseInt(formData.secondary_vehicle_mileages[vehicle.id]);
                const pickupMileage = vehicle.current_mileage || 0;
                
                if (returnMileage < pickupMileage) {
                    toast.error(`Return mileage for ${vehicle.name} cannot be less than pickup mileage (${pickupMileage})`);
                    return;
                }
            }
        }

        // Validate secondary vehicles before submission
        if (!usageDetails && formData.secondary_vehicles.length > 0) {
            // Check if all selected secondary vehicles are still available
            const selectedIds = formData.secondary_vehicles.map(v => v.id);
            const availableIds = availableVehicles.map(v => v.id);
            const unavailableIds = selectedIds.filter(id => !availableIds.includes(id));
            
            if (unavailableIds.length > 0) {
                toast.error(`Some selected vehicles (IDs: ${unavailableIds.join(', ')}) are no longer available. Please refresh and try again.`);
                // Refresh available vehicles
                fetchAvailableVehicles();
                return;
            }
        }

        const usageDataPayload = {
            pickup_time: formData.pickup_time,
            pickup_mileage: formData.pickup_mileage ? parseInt(formData.pickup_mileage) : null,
            pickup_notes: formData.pickup_notes,
        };

        // Include secondary vehicles for both creation and returns
        if (formData.secondary_vehicles.length > 0) {
            usageDataPayload.secondary_vehicles = formData.secondary_vehicles.map(v => v.id);
        }

        if (usageDetails) {
            usageDataPayload.return_time = formData.return_time || null;
            usageDataPayload.return_mileage = formData.return_mileage ? parseInt(formData.return_mileage) : null;
            usageDataPayload.return_notes = formData.return_notes || null;
            
            // Add secondary vehicle mileages if any
            if (Object.keys(formData.secondary_vehicle_mileages).length > 0) {
                usageDataPayload.secondary_vehicle_mileages = formData.secondary_vehicle_mileages;
            }
        }

        const pickupFiles = formData.pickup_attachments
            .filter(img => img.isNew && img.file instanceof File)
            .map(img => img.file);

        const returnFiles = formData.return_attachments
            .filter(img => img.isNew && img.file instanceof File)
            .map(img => img.file);

        onSubmit({ data: usageDataPayload, pickupFiles, returnFiles });
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{usageDetails ? "Return Vehicle" : "Pick Vehicle"}</h2>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-4">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Pickup Time</label>
                            <input
                                type="datetime-local"
                                name="pickup_time"
                                value={formData.pickup_time}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                                disabled
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Pickup Mileage</label>
                            <input
                                type="number"
                                name="pickup_mileage"
                                value={formData.pickup_mileage}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                                disabled={!!usageDetails}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Pickup Notes</label>
                            <textarea
                                name="pickup_notes"
                                value={formData.pickup_notes}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                rows="4"
                                required
                                disabled={!!usageDetails}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Attachments (Required)</label>
                            <ImageUploaderComponent
                                images={formData.pickup_attachments}
                                setImages={handlePickupUploaderFilesChange}
                                loading={isSubmitting}
                                disabled={!!usageDetails}
                                showDeleteButton={!usageDetails}
                                disableUpload={!!usageDetails}
                            />
                        </div>
                        
                        {/* Secondary Vehicles Selection - Only show for new usage */}
                        {!usageDetails && (
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Secondary Vehicles (Optional)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={fetchAvailableVehicles}
                                        disabled={loadingVehicles || isSubmitting}
                                        className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                                    >
                                        {loadingVehicles ? 'Refreshing...' : 'Refresh'}
                                    </button>
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                    Select additional vehicles to take along with the primary vehicle
                                </div>
                                {loadingVehicles ? (
                                    <div className="text-sm text-gray-500">Loading available vehicles...</div>
                                ) : (
                                    <select
                                        value={formData.secondary_vehicles[0]?.id || ''}
                                        onChange={handleSecondaryVehicleChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        disabled={isSubmitting}
                                    >
                                        <option value="" disabled>Select vehicle</option>
                                        {availableVehicles.map(vehicle => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.name} - {vehicle.make} {vehicle.model} ({vehicle.year})
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {formData.secondary_vehicles.length > 0 && (
                                    <div className="mt-2">
                                        <div className="text-xs font-medium text-gray-700 mb-1">Selected Secondary Vehicles:</div>
                                        <div className="space-y-1">
                                            {formData.secondary_vehicles.map(vehicle => (
                                                <div key={vehicle.id} className="text-xs bg-blue-50 p-2 rounded border">
                                                    {vehicle.name} - {vehicle.make} {vehicle.model} ({vehicle.year})
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Show secondary vehicles being returned when returning */}
                        {usageDetails && formData.secondary_vehicles.length > 0 && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Secondary Vehicles Being Returned
                                </label>
                                <div className="text-xs text-gray-600 mb-2">
                                    Enter the current mileage for each secondary vehicle that hasn't been returned yet
                                </div>
                                <div className="space-y-3">
                                    {formData.secondary_vehicles.map(vehicle => {
                                        // Check if this secondary vehicle has been returned
                                        const secondaryUsage = usageDetails.secondary_vehicle_usages?.find(
                                            usage => usage.vehicle === vehicle.id
                                        );
                                        const isReturned = secondaryUsage?.is_returned || false;
                                        // Defensive: fallback to empty object if undefined
                                        const secondaryVehicleMileages = formData.secondary_vehicle_mileages || {};
                                        return (
                                            <div key={vehicle.id} className={`p-3 rounded border ${
                                                isReturned ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                                            }`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="text-sm font-medium">
                                                        {vehicle.name} - {vehicle.make} {vehicle.model} ({vehicle.year})
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        isReturned 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {isReturned ? 'Already Returned' : 'Needs Return'}
                                                    </span>
                                                </div>
                                                {!isReturned && (
                                                    <div className="flex items-center space-x-2">
                                                        <label className="text-xs text-gray-600">Return Mileage:</label>
                                                        <input
                                                            type="number"
                                                            value={secondaryVehicleMileages[vehicle.id] || ''}
                                                            onChange={(e) => handleSecondaryVehicleMileageChange(vehicle.id, e.target.value)}
                                                            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                                                            placeholder="Enter mileage"
                                                            min={vehicle.current_mileage || 0}
                                                            required
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    {usageDetails && (
                        <div className="space-y-4">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Return Time</label>
                                <input
                                    type="datetime-local"
                                    name="return_time"
                                    value={formData.return_time}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                    disabled
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Return Mileage</label>
                                <input
                                    type="number"
                                    name="return_mileage"
                                    value={formData.return_mileage}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                    min={usageDetails.pickup_mileage}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Return Notes</label>
                                <textarea
                                    name="return_notes"
                                    value={formData.return_notes}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    rows="4"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Return Attachments (Required)</label>
                                <ImageUploaderComponent
                                    images={formData.return_attachments}
                                    setImages={handleReturnUploaderFilesChange}
                                    loading={isSubmitting}
                                    showDeleteButton={true}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                    <SecondaryBtn
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </SecondaryBtn>
                    <PrimaryBtn
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Submitting..." : (usageDetails ? "Return Vehicle" : "Pick Vehicle")}
                    </PrimaryBtn>
                </div>
            </form>
        </div>
    );
}

export default VehicleUsageFormPopup;