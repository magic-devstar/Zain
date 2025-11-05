import api from "../api";
import NoSleep from 'nosleep.js';
import { toast } from "react-hot-toast";


/**
 * Create a reading.
 * @param {Object} readingData - The reading form data.
 * @returns {Promise<Object>} - Returns the API response or throws an error.
 */
export async function createReading(readingData) {
    const noSleep = new NoSleep();
    let noSleepEnabled = false;

    try {
        // Enable NoSleep before starting upload
        if (!noSleepEnabled) {
            noSleep.enable();
            window.noSleepActive = true; 
            noSleepEnabled = true;
        }

        const formData = new FormData();

        for (const key in readingData) {
            const value = readingData[key];
            if (value === undefined || value === null) continue;

            // Append non-image fields
            if (key !== "images") {
                formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
            }
        }

        try {
            // Create the reading (without attachments)
            const response = await api.post("/common/api/readings-attachments/", formData);
            toast.success("Reading created successfully.");

            // If there are images, upload them separately
            if (Array.isArray(readingData.images) && readingData.images.length > 0) {
                await uploadAttachments(readingData.images, response.data.id); // Upload attachments to a separate endpoint
            }

            return response.data;
        } catch (error) {
            handleApiError(error, "Failed to create reading.");
            throw error;
        }
    } finally {
        // Disable NoSleep when done
        if (noSleepEnabled) {
            noSleep.disable();
            window.noSleepActive = false; 
        }
    }
}


// Not being used any where
/**
 * Update an existing reading.
 * @param {number} readingId - The reading ID to update.
 * @param {Object} readingData - The updated reading form data.
 * @returns {Promise<Object>} - Returns the API response or throws an error.
 */
export async function updateReading(readingId, readingData) {
    const noSleep = new NoSleep();
    let noSleepEnabled = false;

    try {
        // Enable NoSleep before starting upload
        if (!noSleepEnabled) {
            noSleep.enable();
            window.noSleepActive = true; 
            noSleepEnabled = true;
        }

        const formData = new FormData();

        for (const key in readingData) {
            const value = readingData[key];
            if (value === undefined || value === null) continue;

            // Handling images (attachments)
            if (key === "images" && Array.isArray(value)) {
                value.forEach((file) => {
                    formData.append("attachments[]", file);  // Append each file in the "attachments[]"
                });
            } else {
                formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
            }
        }

        try {
            const response = await api.put(`/common/api/readings-attachments/${readingId}/`, formData);
            toast.success("Reading updated successfully.");
            return response.data;
        } catch (error) {
            handleApiError(error, "Failed to update reading.");
            throw error;
        }
    } finally {
        // Disable NoSleep when done
        if (noSleepEnabled) {
            noSleep.disable();
            window.noSleepActive = false; 
        }
    }
}

/**
 * Delete a reading by ID.
 * @param {number} readingId - The ID of the reading to delete.
 * @returns {Promise<void>} - Resolves if successful or throws an error.
 */
export async function deleteReading(readingId) {
    try {
        await api.delete(`/common/api/readings-attachments/${readingId}/`);
        toast.success("Reading deleted successfully.");
    } catch (error) {
        handleApiError(error, "Failed to delete reading.");
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



/**
 * Upload attachments to a separate endpoint.
 * @param {Array} images - The array of image files to upload.
 * @param {number} referenceId - The reference ID (reading ID or ticket ID).
 * @returns {Promise<void>} - Resolves if successful or throws an error.
 */
async function uploadAttachments(images, referenceId) {
    const imageFormData = new FormData();
    images.forEach((file) => {
        if (file instanceof File) {
            imageFormData.append("images", file);
        }
    });

    imageFormData.append("reference_type", "reading"); // or "ticket" depending on the context
    imageFormData.append("id", referenceId);

    try {
        await api.post("/common/api/attachments/attach_to_reference/", imageFormData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Attachments uploaded successfully.");
    } catch (error) {
        console.error("Attachment upload failed:", error.response?.data || error.message);
        toast.error("Failed to upload attachments.");
        throw error;
    }
}