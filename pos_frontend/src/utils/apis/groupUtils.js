import api from "../api";

export const getGroups = async () => {
    try {
        const response = await api.get("/common/api/groups/");
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.detail || "Failed to fetch groups");
    }
};

export const getGroup = async (id) => {
    try {
        const response = await api.get(`/common/api/groups/${id}/`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.detail || "Failed to fetch group details");
    }
};

export const createGroup = async (groupData) => {
    try {
        const response = await api.post("/common/api/groups/", groupData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateGroup = async (id, groupData) => {
    try {
        const response = await api.put(`/common/api/groups/${id}/`, groupData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteGroup = async (id) => {
    try {
        await api.delete(`/common/api/groups/${id}/`);
    } catch (error) {
        throw new Error(error.response?.data?.detail || "Failed to delete group");
    }
}; 