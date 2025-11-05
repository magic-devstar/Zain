import React, { useState, useEffect } from "react";
import ImageUploaderComponent from '../Common/ImageUploaderComponent';
import api from "../../utils/api";
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";
import { toast } from "react-hot-toast";

function VehicleMaintenanceFormPopup({ onClose, onSubmit, isSubmitting, vehicle, maintenanceDetails }) {
    const [formData, setFormData] = useState({
        maintenance_type: 'repair',
        description: '',
        cost: '',
        service_provider: '',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: '',
        mileage_at_maintenance: '',
        next_maintenance_date: '',
        next_maintenance_mileage: '',
        attachments: []
    });

    const imageAPIBaseURL = api.defaults.baseURL.replace("/api/v1", "");

    useEffect(() => {
        if (maintenanceDetails) {
            const validAttachments = Array.isArray(maintenanceDetails.attachments)
                ? maintenanceDetails.attachments.filter(att => att && typeof att.file === 'string')
                : [];

            const formattedAttachments = validAttachments.map(att => ({
                id: att.id,
                url: att.file.startsWith('http') ? att.file : `${imageAPIBaseURL}${att.file.startsWith('/') ? '' : '/'}${att.file}`,
                name: att.file.substring(att.file.lastIndexOf('/') + 1),
                isNew: false,
                backendId: att.id
            }));

            setFormData({
                maintenance_type: maintenanceDetails.maintenance_type || 'repair',
                description: maintenanceDetails.description || '',
                cost: maintenanceDetails.cost || '',
                service_provider: maintenanceDetails.service_provider || '',
                start_date: maintenanceDetails.start_date ? new Date(maintenanceDetails.start_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                end_date: maintenanceDetails.end_date ? new Date(maintenanceDetails.end_date).toISOString().slice(0, 16) : '',
                mileage_at_maintenance: maintenanceDetails.mileage_at_maintenance || '',
                next_maintenance_date: maintenanceDetails.next_maintenance_date || '',
                next_maintenance_mileage: maintenanceDetails.next_maintenance_mileage || '',
                attachments: formattedAttachments
            });
        } else if (vehicle) {
            setFormData(prev => ({
                ...prev,
                mileage_at_maintenance: vehicle.current_mileage || ''
            }));
        }
    }, [maintenanceDetails, vehicle, imageAPIBaseURL]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUploaderFilesChange = (newImageObjects) => {
        setFormData(prev => ({ ...prev, attachments: newImageObjects }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const maintenanceData = {
            vehicle: vehicle.id,
            maintenance_type: formData.maintenance_type,
            description: formData.description,
            cost: parseFloat(formData.cost),
            service_provider: formData.service_provider,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            mileage_at_maintenance: parseInt(formData.mileage_at_maintenance),
            next_maintenance_date: formData.next_maintenance_date || null,
            next_maintenance_mileage: formData.next_maintenance_mileage ? parseInt(formData.next_maintenance_mileage) : null
        };

        if (maintenanceDetails && maintenanceDetails.id) {
            maintenanceData.id = maintenanceDetails.id;
        }

        const filesToUpload = [];
        if (formData.attachments && formData.attachments.length > 0) {
            formData.attachments.forEach((imgObject) => {
                const file = imgObject.file || imgObject;
                if (file instanceof File) {
                    filesToUpload.push(file);
                }
            });
        }

        onSubmit({ data: maintenanceData, files: filesToUpload });
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                    {maintenanceDetails ? "Edit Maintenance Record" : "Create Maintenance Record"}
                </h2>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-4">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Maintenance Type</label>
                            <select
                                name="maintenance_type"
                                value={formData.maintenance_type}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            >
                                <option value="repair">Repair</option>
                                <option value="scheduled">Scheduled Maintenance</option>
                                <option value="inspection">Inspection</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                rows="4"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Cost</label>
                            <input
                                type="number"
                                name="cost"
                                value={formData.cost}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                                step="0.01"
                                min="0"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Service Provider</label>
                            <input
                                type="text"
                                name="service_provider"
                                value={formData.service_provider}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Start Date</label>
                            <input
                                type="datetime-local"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">End Date</label>
                            <input
                                type="datetime-local"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Mileage at Maintenance</label>
                            <input
                                type="number"
                                name="mileage_at_maintenance"
                                value={formData.mileage_at_maintenance}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                                min="0"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Next Maintenance Date</label>
                            <input
                                type="date"
                                name="next_maintenance_date"
                                value={formData.next_maintenance_date}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Next Maintenance Mileage</label>
                            <input
                                type="number"
                                name="next_maintenance_mileage"
                                value={formData.next_maintenance_mileage}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                min="0"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                            <ImageUploaderComponent
                                images={formData.attachments}
                                setImages={handleUploaderFilesChange}
                                loading={isSubmitting}
                                showDeleteButton={true}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                    <SecondaryBtn
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </SecondaryBtn>
                    <PrimaryBtn
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Submitting..." : (maintenanceDetails ? "Update Record" : "Create Record")}
                    </PrimaryBtn>
                </div>
            </form>
        </div>
    );
}

export default VehicleMaintenanceFormPopup; 