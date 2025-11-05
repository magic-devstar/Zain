import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import Select from "react-select";
import { useSelector } from 'react-redux';
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";

function GroupFormPopup({ initialData, onSubmit, onClose, isSubmitting }) {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        user_ids: [],
    });
    const [users, setUsers] = useState([]);
    const [errors, setErrors] = useState({});
    const user = useSelector((state) => state.user.user);

    useEffect(() => {
        if (initialData) {
            setFormData({
                id: initialData.id,
                name: initialData.name || "",
                description: initialData.description || "",
                user_ids: initialData.users?.map(user => user.id) || [],
            });
        }
        fetchUsers();
    }, [initialData]);

    const fetchUsers = async () => {
        try {
            const response = await api.get("/auth/get-users/?all=true&exclude=customers");
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = "Name is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            await onSubmit(formData);
        } catch (error) {
            console.error("Error submitting form:", error);
            if (error.response?.data) {
                setErrors(error.response.data);
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleUserSelect = (selectedOptions) => {
        setFormData(prev => ({
            ...prev,
            user_ids: selectedOptions.map(option => option.value)
        }));
    };

    const userOptions = users.map(user => ({
        value: user.id,
        label: `${user.username} (${user.email})`
    }));

    const selectedUsers = userOptions.filter(option =>
        formData.user_ids.includes(option.value)
    );

    return (
        <div className="max-w-2xl w-full">
            <h2 className="text-xl font-semibold mb-4">
                {initialData ? "Edit Group" : "Create Group"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary ${errors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                    />
                    {errors.name && (
                        <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                <div className="relative z-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Users
                    </label>
                    <Select
                        isMulti
                        options={userOptions}
                        value={selectedUsers}
                        onChange={handleUserSelect}
                        className="basic-multi-select"
                        classNamePrefix="select"
                        menuPortalTarget={document.body} // renders menu outside parent
                        styles={{
                            menuPortal: base => ({ ...base, zIndex: 9999 }),
                        }}
                    />
                </div>


                <div className="flex justify-end gap-2 pt-4">
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
                        {isSubmitting ? "Saving..." : "Save"}
                    </PrimaryBtn>
                </div>
            </form>
        </div>
    );
}

export default GroupFormPopup; 