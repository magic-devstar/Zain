import api from "../api";
import { toast } from "react-hot-toast";

/**
 * Create a user using FormData for file upload support.
 * @param {Object} userData - The user form data.
 * @returns {Promise<Object>} - Returns the API response or throws an error.
 */
export async function createUser(userData) {
    const formData = new FormData();

    // Append all fields directly to FormData
    for (const key in userData) {
        const value = userData[key];

        if (value === undefined || value === null) continue;

        if (key === 'profile_image' && value instanceof File) {
            formData.append(key, value);
        } else {
            formData.append(key, value);
        }
    }

    try {
        const response = await api.post("/auth/accounts/create/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    } catch (error) {
        // Log error details for debugging
        console.error("User creation failed:", error.response?.data || error.message);

        // Extract backend errors (assuming they are returned in a structure like: { email: ["error message"] })
        const backendErrors = error.response?.data;

        // Show error messages for each field, if present
        if (backendErrors) {
            for (const field in backendErrors) {
                backendErrors[field].forEach((errMsg) => {
                    toast.error(`${field}: ${errMsg}`);
                });
            }
        } else {
            toast.error("Failed to create user.");
        }

        throw error; // Rethrow error to be handled by caller if needed
    }
}



/**
 * Update an existing user using FormData for file upload support.
 * @param {number} userId - The user ID to update.
 * @param {Object} userData - The updated user form data.
 * @returns {Promise<Object>} - Returns the API response or throws an error.
 */
/**
 * Update an existing user using FormData for file upload support.
 * @param {number} userId - The user ID to update.
 * @param {Object} userData - The updated user form data.
 * @returns {Promise<Object>} - Returns the API response or throws an error.
 */
export async function updateUser(userId, userData) {
    const formData = new FormData();

    for (const key in userData) {
        const value = userData[key];

        if (value === undefined || value === null) continue;

        // Handle license field at user level (not in customer_profile)
        if (key === 'license' && value instanceof File) {
            formData.append(key, value);
        }
        // Only append profile_image if it's a new file
        else if (key === 'profile_image' && value instanceof File) {
            formData.append(key, value);
        } else if (key === 'customer_profile' && typeof value === 'object') {
            // Flatten customer_profile
            for (const subKey in value) {
                if (value[subKey] !== undefined && value[subKey] !== null) {
                    if (subKey === 'preferred_software' && typeof value[subKey] === 'object') {
                        formData.append(`customer_profile.${subKey}`, JSON.stringify(value[subKey]));
                    } else if (subKey !== 'license') {
                        // Don't append license from customer_profile since it's at user level
                        formData.append(`customer_profile.${subKey}`, value[subKey]);
                    }
                }
            }
        } else if (key !== 'profile_image' && key !== 'license') {
            formData.append(key, value);
        }
    }

    try {
        const response = await api.put(`/auth/accounts/update/${userId}/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

/**
 * Handle and display API error messages.
 * @param {Object} error - The error object returned by the API.
 */
function handleApiError(error) {
    console.error("API Error:", error.response?.data || error.message);
    const backendErrors = error.response?.data;

    function showErrors(errors, prefix = "") {
        for (const field in errors) {
            const value = errors[field];

            if (Array.isArray(value)) {
                // Direct list of error messages
                value.forEach((errMsg) => {
                    toast.error(`${prefix}${field}: ${errMsg}`);
                });
            } else if (typeof value === "object" && value !== null) {
                // Nested object, recurse
                showErrors(value, `${prefix}${field}.`);
            } else {
                // Fallback for unexpected structure
                toast.error(`${prefix}${field}: ${value}`);
            }
        }
    }

    if (backendErrors) {
        showErrors(backendErrors);
    } else {
        toast.error("Something went wrong. Please try again.");
    }
}


/**
 * Delete a user by ID.
 * @param {number} userId - The ID of the user to delete.
 * @returns {Promise<void>} - Resolves if successful or throws an error.
 */
export async function deleteUser(userId) {
    try {
        await api.delete(`/auth/accounts/delete/${userId}/`);
        toast.success("User deleted successfully.");
    } catch (error) {
        console.error("User deletion failed:", error.response?.data || error.message);

        const backendErrors = error.response?.data;
        if (backendErrors) {
            for (const field in backendErrors) {
                const messages = Array.isArray(backendErrors[field]) ? backendErrors[field] : [backendErrors[field]];
                messages.forEach((errMsg) => {
                    toast.error(`${field}: ${errMsg}`);
                });
            }
        } else {
            toast.error("Failed to delete user.");
        }

        throw error;
    }
}

export const updateLicense = async (userId, licenseFile) => {
    try {
        const formData = new FormData();
        formData.append('license', licenseFile);
        
        const response = await api.post(`/auth/accounts/${userId}/update-license/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Permissions APIs
export async function getUserPermissions(userId) {
    const response = await api.get(`/auth/accounts/${userId}/permissions/`);
    return response.data; // { permissions: number[] }
}

export async function updateUserPermissions(userId, permissions) {
    const response = await api.patch(`/auth/accounts/${userId}/permissions/`, { permissions });
    return response.data; // { permissions: number[] }
}
