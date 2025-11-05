import api from "../api";
import NoSleep from 'nosleep.js';
import { toast } from "react-hot-toast";

export async function createTicket(ticketData) {
    const noSleep = new NoSleep();
    let noSleepEnabled = false;

    try {
        if (!noSleepEnabled) {
            noSleep.enable();
            window.noSleepActive = true;
            noSleepEnabled = true;
        }
        const formData = new FormData();

        formData.append("title", ticketData.title);
        formData.append("representativeName", ticketData.representativeName);
        formData.append("representativePhone", ticketData.representativePhone);
        formData.append("flagged", ticketData.flagged);
        formData.append("payable", ticketData.payable);
        formData.append("paid", ticketData.paid);
        formData.append("description", ticketData.description || "");
        formData.append("ticketNotes", ticketData.ticketNotes || "");
        formData.append("status", ticketData.status || "OPEN");

        if (ticketData.deadline) {
            formData.append("deadline", ticketData.deadline);
        }

        if (ticketData.store) {
            formData.append("store", ticketData.store);
        }

        if (Array.isArray(ticketData.assigned_to)) {
            ticketData.assigned_to.forEach(userId => {
                formData.append("assigned_to", userId);
            });
        }

        // Items
        const validItems = Array.isArray(ticketData.ticket_items)
            ? ticketData.ticket_items.filter(item => item)
            : [];
        try {
            formData.append("ticket_items", JSON.stringify(validItems));
        } catch (e) {
            console.error("Failed to convert ticket items:", e);
            throw new Error("Invalid ticket item data");
        }

        // Used Items
        const usedItems = ticketData.item_usages && typeof ticketData.item_usages === 'object'
            ? ticketData.item_usages
            : {};
        try {
            formData.append("item_usages", JSON.stringify(usedItems));
        } catch (e) {
            console.error("Failed to convert used item IDs:", e);
            throw new Error("Invalid used item IDs data");
        }

        // Defective Items
        const defectiveItems = ticketData.defective_items && typeof ticketData.defective_items === 'object'
            ? ticketData.defective_items
            : {};
        try {
            formData.append("defective_items", JSON.stringify(defectiveItems));
        } catch (e) {
            console.error("Failed to convert defective item IDs:", e);
            throw new Error("Invalid defective item IDs data");
        }

        // Charges
        const charges = Array.isArray(ticketData.charges) ? ticketData.charges : [];
        try {
            formData.append("charges", JSON.stringify(charges));
        } catch (e) {
            console.error("Failed to convert charges:", e);
            throw new Error("Invalid charges data");
        }

        const ticketResponse = await api.post("/common/api/tickets/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        const ticketId = ticketResponse.data.id;

        if (Array.isArray(ticketData.images) && ticketData.images.length > 0) {
            const imageFormData = new FormData();
            ticketData.images.forEach((file) => {
                if (file instanceof File) {
                    imageFormData.append("images", file);
                }
            });
            imageFormData.append("reference_type", "ticket");
            imageFormData.append("id", ticketId);

            try {
                await api.post("/common/api/attachments/attach_to_reference/", imageFormData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } catch (error) {
                console.error("Attachment upload failed:", error.response?.data || error.message);
                toast.error("Failed to upload attachments.");
            }
        }

        return ticketResponse;

    } finally {
        if (noSleepEnabled) {
            noSleep.disable();
            window.noSleepActive = false;
        }
    }
}

export async function updateTicket(ticketData, ticketId) {
    const noSleep = new NoSleep();
    let noSleepEnabled = false;

    try {
        if (!noSleepEnabled) {
            noSleep.enable();
            window.noSleepActive = true;
            noSleepEnabled = true;
        }
        const formData = new FormData();

        formData.append("title", ticketData.title);
        formData.append("representativeName", ticketData.representativeName);
        formData.append("representativePhone", ticketData.representativePhone);
        formData.append("flagged", ticketData.flagged);
        formData.append("payable", ticketData.payable);
        formData.append("paid", ticketData.paid);
        formData.append("status", ticketData.status || "");
        formData.append("description", ticketData.description || "");
        formData.append("ticketNotes", ticketData.ticketNotes || "");

        if (ticketData.deadline) {
            formData.append("deadline", ticketData.deadline);
        }

        if (ticketData.store) {
            formData.append("store", ticketData.store);
        }

        if (Array.isArray(ticketData.assigned_to)) {
            ticketData.assigned_to.forEach(userId => {
                formData.append("assigned_to", userId);
            });
        }

        // Items
        const validItems = Array.isArray(ticketData.ticket_items)
            ? ticketData.ticket_items.filter(item => item)
            : [];
        try {
            formData.append("ticket_items", JSON.stringify(validItems));
        } catch (e) {
            console.error("Failed to stringify ticket items:", e);
            throw new Error("Invalid ticket item data");
        }

        // Used Items
        const usedItems = ticketData.item_usages && typeof ticketData.item_usages === 'object'
            ? ticketData.item_usages
            : {};
        try {
            formData.append("item_usages", JSON.stringify(usedItems));
        } catch (e) {
            console.error("Failed to stringify used item IDs:", e);
            throw new Error("Invalid used item IDs data");
        }

        // Defective Items
        const defectiveItems = ticketData.defective_items && typeof ticketData.defective_items === 'object'
            ? ticketData.defective_items
            : {};
        try {
            formData.append("defective_items", JSON.stringify(defectiveItems));
        } catch (e) {
            console.error("Failed to stringify defective item IDs:", e);
            throw new Error("Invalid defective item IDs data");
        }

        // Charges
        const charges = Array.isArray(ticketData.charges) ? ticketData.charges : [];
        try {
            formData.append("charges", JSON.stringify(charges));
        } catch (e) {
            console.error("Failed to stringify charges:", e);
            throw new Error("Invalid charges data");
        }

        const ticketResponse = await api.patch(`/common/api/tickets/${ticketId}/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        if (Array.isArray(ticketData.images) && ticketData.images.length > 0) {
            const imageFormData = new FormData();
            ticketData.images.forEach((file) => {
                if (file instanceof File) {
                    imageFormData.append("images", file);
                }
            });
            imageFormData.append("reference_type", "ticket");
            imageFormData.append("id", ticketId);

            try {
                await api.post("/common/api/attachments/attach_to_reference/", imageFormData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } catch (error) {
                console.error("Attachment upload failed:", error.response?.data || error.message);
                toast.error("Failed to upload attachments.");
            }
        }

        return ticketResponse;
    } finally {
        if (noSleepEnabled) {
            noSleep.disable();
            window.noSleepActive = false;
        }
    }
}

export async function deleteTicket(ticketId) {
    try {
        const response = await api.delete(`/common/api/tickets/${ticketId}/`);
        toast.success("Ticket deleted successfully!");
        return response;
    } catch (error) {
        console.error("Failed to delete ticket:", error.response?.data || error.message);
        toast.error("Failed to delete the ticket.");
        throw error;
    }
}

export async function updateTicketStatus(ticketId, newStatus) {
    try {
        const response = await api.post(`/common/api/tickets/${ticketId}/change_status/`, {
            status: newStatus,
        });
        toast.success(`Ticket status updated to ${newStatus}`);
        return response;
    } catch (error) {
        console.error("Failed to change ticket status:", error.response?.data || error.message);
        toast.error("Failed to update ticket status.");
        throw error;
    }
}