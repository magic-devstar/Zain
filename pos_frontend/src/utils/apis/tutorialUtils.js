import api from "../api";
import NoSleep from 'nosleep.js';
import { toast } from "react-hot-toast";

export async function createTutorial(tutorialData) {
    const noSleep = new NoSleep();
    let noSleepEnabled = false;

    try {
        if (!noSleepEnabled) {
            noSleep.enable();
            window.noSleepActive = true;
            noSleepEnabled = true;
        }

        const formData = new FormData();

        // Append basic tutorial data
        formData.append("title", tutorialData.title);
        formData.append("description", tutorialData.description || "");
        formData.append("content", tutorialData.content || "");

        // Create the tutorial
        const tutorialResponse = await api.post("/common/api/tutorials/", formData);
        const tutorialId = tutorialResponse.data.id;

        // Handle attachments if any
        if (Array.isArray(tutorialData.attachments) && tutorialData.attachments.length > 0) {
            const attachmentFormData = new FormData();
            tutorialData.attachments.forEach((file) => {
                if (file instanceof File) {
                    attachmentFormData.append("files", file);
                }
            });
            attachmentFormData.append("reference_type", "tutorial");
            attachmentFormData.append("id", tutorialId);

            try {
                await api.post("/common/api/attachments/attach_to_reference/", attachmentFormData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } catch (error) {
                console.error("Attachment upload failed:", error.response?.data || error.message);
                toast.error("Failed to upload attachments.");
            }
        }

        return tutorialResponse;
    } catch (error) {
        if (error.response && error.response.data) {
            const data = error.response.data;
            Object.entries(data).forEach(([field, messages]) => {
                if (Array.isArray(messages)) {
                    messages.forEach((msg) => toast.error(`${field}: ${msg}`));
                } else {
                    toast.error(`${field}: ${messages}`);
                }
            });
        } else {
            toast.error(error.message || "Failed to create tutorial");
        }
        throw error;
    } finally {
        if (noSleepEnabled) {
            noSleep.disable();
            window.noSleepActive = false;
        }
    }
}

export async function updateTutorial(tutorialId, tutorialData) {
    const noSleep = new NoSleep();
    let noSleepEnabled = false;

    try {
        if (!noSleepEnabled) {
            noSleep.enable();
            window.noSleepActive = true;
            noSleepEnabled = true;
        }

        const formData = new FormData();

        // Append basic tutorial data
        formData.append("title", tutorialData.title);
        formData.append("description", tutorialData.description || "");
        formData.append("content", tutorialData.content || "");

        // Update the tutorial
        const tutorialResponse = await api.patch(`/common/api/tutorials/${tutorialId}/`, formData);

        // Handle attachments if any
        if (Array.isArray(tutorialData.attachments) && tutorialData.attachments.length > 0) {
            const attachmentFormData = new FormData();
            tutorialData.attachments.forEach((file) => {
                if (file instanceof File) {
                    attachmentFormData.append("files", file);
                }
            });
            attachmentFormData.append("reference_type", "tutorial");
            attachmentFormData.append("id", tutorialId);

            try {
                await api.post("/common/api/attachments/attach_to_reference/", attachmentFormData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } catch (error) {
                console.error("Attachment upload failed:", error.response?.data || error.message);
                toast.error("Failed to upload attachments.");
            }
        }

        return tutorialResponse;
    } catch (error) {
        if (error.response && error.response.data) {
            const data = error.response.data;
            Object.entries(data).forEach(([field, messages]) => {
                if (Array.isArray(messages)) {
                    messages.forEach((msg) => toast.error(`${field}: ${msg}`));
                } else {
                    toast.error(`${field}: ${messages}`);
                }
            });
        } else {
            toast.error(error.message || "Failed to update tutorial");
        }
        throw error;
    } finally {
        if (noSleepEnabled) {
            noSleep.disable();
            window.noSleepActive = false;
        }
    }
}

export async function deleteTutorial(tutorialId) {
    const noSleep = new NoSleep();
    let noSleepEnabled = false;

    try {
        if (!noSleepEnabled) {
            noSleep.enable();
            window.noSleepActive = true;
            noSleepEnabled = true;
        }

        const response = await api.delete(`/common/api/tutorials/${tutorialId}/`);
        toast.success("Tutorial deleted successfully!");
        return response;
    } catch (error) {
        console.error("Failed to delete tutorial:", error.response?.data || error.message);
        toast.error("Failed to delete the tutorial.");
        throw error;
    } finally {
        if (noSleepEnabled) {
            noSleep.disable();
            window.noSleepActive = false;
        }
    }
} 