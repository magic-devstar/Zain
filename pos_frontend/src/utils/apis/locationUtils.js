import api from "../api";
import { toast } from "react-hot-toast";

/**
 * Create a location.
 * @param {Object} locationData - The location form data.
 * @param {string|null} vendingCustomerId - Optional vending customer ID to send as a query param.
 * @returns {Promise<Object>} - Returns the API response or throws an error.
 */
export async function createLocation(locationData, vendingCustomerId = null) {
    const formData = new FormData();

    for (const key in locationData) {
        const value = locationData[key];
        if (value === undefined || value === null) continue;
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    }

    try {
        const response = await api.post("/common/api/vending-customer-locations/", formData, {
            params: vendingCustomerId ? { vending_customer: vendingCustomerId } : {}
        });
        toast.success("Location created successfully.");
        return response.data;
    } catch (error) {
        handleApiError(error, "Failed to create location.");
        throw error;
    }
}


/**
 * Update an existing location.
 * @param {number} locationId - The location ID to update.
 * @param {Object} locationData - The updated location form data.
 * @returns {Promise<Object>} - Returns the API response or throws an error.
 */
export async function updateLocation(locationId, locationData) {
    const formData = new FormData();

    for (const key in locationData) {
        const value = locationData[key];
        if (value === undefined || value === null) continue;
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    }

    try {
        const response = await api.put(`/common/api/vending-customer-locations/${locationId}/`, formData);
        toast.success("Location updated successfully.");
        return response.data;
    } catch (error) {
        handleApiError(error, "Failed to update location.");
        throw error;
    }
}

/**
 * Delete a location by ID.
 * @param {number} locationId - The ID of the location to delete.
 * @returns {Promise<void>} - Resolves if successful or throws an error.
 */
export async function deleteLocation(locationId) {
    try {
        await api.delete(`/common/api/vending-customer-locations/${locationId}/`);
        toast.success("Location deleted successfully.");
    } catch (error) {
        handleApiError(error, "Failed to delete location.");
        throw error;
    }
}

/**
 * Handle and display API error messages.
 * @param {Object} error - The error object returned by the API.
 * @param {string} defaultMsg - A default error message.
 */
function handleApiError(error, defaultMsg) {
    console.error("API Error:", error.response?.data || error.message);
    const backendErrors = error.response?.data;
    if (backendErrors) {
        for (const field in backendErrors) {
            const messages = Array.isArray(backendErrors[field]) ? backendErrors[field] : [backendErrors[field]];
            messages.forEach((errMsg) => {
                toast.error(`${field}: ${errMsg}`);
            });
        }
    } else {
        toast.error(defaultMsg);
    }
}
