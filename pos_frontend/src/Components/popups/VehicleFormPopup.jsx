import React, { useState, useEffect } from "react";
import ImageUploaderComponent from '../../Components/Common/ImageUploaderComponent';
import { XMarkIcon } from "@heroicons/react/24/outline";
import api from "../../utils/api"; // Import api to get baseURL
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";

function VehicleFormPopup({ onClose, onSubmit, isSubmitting, vehicleDetails }) {
    const [formData, setFormData] = useState({
        name: "",
        vin: "",
        make: "",
        model: "",
        year: "",
        status: "available",
        current_mileage: 0,
        attachments: []
    });

    const imageAPIBaseURL = api.defaults.baseURL.replace("/api/v1", ""); // Define base URL

    useEffect(() => {
        if (vehicleDetails) {
            // Filter for valid attachment objects before mapping
            const validAttachments = Array.isArray(vehicleDetails.attachments)
                ? vehicleDetails.attachments.filter(att => att && typeof att.file === 'string') 
                : [];

            const formattedAttachments = validAttachments.map(att => {
                const fileName = att.file.substring(att.file.lastIndexOf('/') + 1);
                let fullUrl = att.file;
                
                if (fullUrl && !fullUrl.startsWith('http') && imageAPIBaseURL) {
                    fullUrl = `${imageAPIBaseURL}${fullUrl.startsWith('/') ? '' : '/'}${fullUrl}`;
                }

                return {
                    id: att.id,      
                    url: fullUrl,   
                    name: fileName,  
                    isNew: false,
                    backendId: att.id 
                };
            });

            setFormData({
                id: vehicleDetails.id,
                name: vehicleDetails.name || "",
                vin: vehicleDetails.vin || "",
                make: vehicleDetails.make || "",
                model: vehicleDetails.model || "",
                year: vehicleDetails.year ? vehicleDetails.year.toString() : "",
                status: vehicleDetails.status || "available",
                current_mileage: vehicleDetails.current_mileage || 0,
                attachments: formattedAttachments
            });
        } else {
            setFormData({
                name: "",
                vin: "",
                make: "",
                model: "",
                year: "",
                status: "available",
                current_mileage: 0,
                attachments: []
            });
        }
    }, [vehicleDetails, imageAPIBaseURL]); // Added imageAPIBaseURL to dependency array

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUploaderFilesChange = (newImageObjects) => {
        setFormData(prev => ({ ...prev, attachments: newImageObjects }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const vehicleDataPayload = {
            name: formData.name || '',
            vin: formData.vin || '',
            make: formData.make || '',
            model: formData.model || '',
            year: formData.year || '',
            status: formData.status || 'available',
            current_mileage: formData.current_mileage ? formData.current_mileage.toString() : '0',
        };

        if (vehicleDetails && vehicleDetails.id) {
            vehicleDataPayload.id = vehicleDetails.id;
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
        
        onSubmit({ data: vehicleDataPayload, files: filesToUpload });
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{vehicleDetails ? "Edit Vehicle" : "Create Vehicle"}</h2>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-4">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Model</label>
                            <input
                                type="text"
                                name="model"
                                value={formData.model}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Year</label>
                            <input
                                type="number"
                                name="year"
                                value={formData.year}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                                min={1900}
                                max={new Date().getFullYear() + 1}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            >
                                <option value="available">Available</option>
                                <option value="in_use">In Use</option>
                                <option value="in_maintenance">In Maintenance</option>
                                <option value="retired">Retired</option>
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Current Mileage</label>
                            <input
                                type="number"
                                name="current_mileage"
                                value={formData.current_mileage}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                                min={0}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">VIN</label>
                            <input
                                type="text"
                                name="vin"
                                value={formData.vin}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                                maxLength={17}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Make</label>
                            <input
                                type="text"
                                name="make"
                                value={formData.make}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                            <ImageUploaderComponent
                                images={formData.attachments}
                                setImages={handleUploaderFilesChange}
                            />
                        </div>
                    </div>
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
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Submitting..." : (vehicleDetails ? "Save Changes" : "Create Vehicle")}
                    </PrimaryBtn>
                </div>
            </form>
        </div>
    );
}

export default VehicleFormPopup;