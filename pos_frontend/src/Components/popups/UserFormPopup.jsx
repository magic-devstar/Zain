import React, { useState, useEffect } from 'react';
import { CameraIcon, XIcon } from 'lucide-react';
import PrimaryBtn from '../Common/PrimaryBtn';
import PhoneNumberInput from '../Common/PhoneNumberInput';
import usePermissions from '../../hooks/usePermissions';
import api from '../../utils/api';
import { useSelector } from 'react-redux';

const roleOptions = [
    "Admin", "Manager", "Technician", "Warehouse Manager",
    "Vending Customer", "Service Customer",
    "Reporter", "External User", "Partner"
];

function UserFormPopup({ onSubmit, loading, initialData = null, roleFixed = null }) {
    const permissions = usePermissions();
    const user = useSelector((state) => state.user.user);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone_number: '',
        pay_rate: '',
        role: 'Manager',
        is_active: true,
        check_in_required: false,
        is_broker: false,
        profile_image: null,
        store_id: '',
    });

    const [previewImage, setPreviewImage] = useState(null);
    const [stores, setStores] = useState([]);
    const [storesLoading, setStoresLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...initialData,
                role: roleFixed?.roles?.includes(initialData.role)
                    ? initialData.role
                    : roleFixed?.roles?.[0] || initialData.role,
                // Use store from partner_customer_link_store if available
                store_id: initialData.partner_customer_link_store?.store_id || initialData.store_id || ''
            }));

            if (initialData.profile_image && typeof initialData.profile_image === 'string') {
                setPreviewImage(initialData.profile_image);
            }
        } else if (roleFixed?.roles?.length) {
            setFormData(prev => ({
                ...prev,
                role: roleFixed.roles[0],
            }));
        }
    }, [initialData, roleFixed]);

    // Fetch stores when creating/editing a Partner/Employee as a Vending Customer
    useEffect(() => {
        const fetchStores = async () => {
            if (
                user?.role === 'Vending Customer' &&
                (formData.role === 'Partner' || formData.role === 'Employee')
            ) {
                try {
                    setStoresLoading(true);
                    const response = await api.get(`/auth/accounts/${user.id}/`, {
                        params: { all: 'true' }
                    });
                    if (response.data.store_profiles) {
                        setStores(response.data.store_profiles);
                    }
                } catch (error) {
                    console.error('Error fetching stores:', error);
                } finally {
                    setStoresLoading(false);
                }
            }
        };

        fetchStores();
    }, [formData.role, user]);



    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'checkbox') {
            setFormData({ ...formData, [name]: checked });
        } else if (type === 'file') {
            const file = files[0];
            if (file) {
                setPreviewImage(URL.createObjectURL(file));
                setFormData({ ...formData, [name]: file });
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const removeImage = () => {
        setFormData({ ...formData, profile_image: null });
        setPreviewImage(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Filter out fields that shouldn't be sent to backend
        const { permissions, is_superuser, store_profiles, ...cleanFormData } = formData;
        
        // Don't remove store_id - it's required for creating/updating partners/employees
        // The store_id will be sent as is
        
        onSubmit(cleanFormData);
    };

    const handlePhoneChange = (newPhone) => {
        setFormData({ ...formData, phone_number: newPhone });
    };


    useEffect(() => {
        if (formData.role === 'Technician' || formData.role === 'Warehouse Technician' || formData.role === 'External User') {
            setFormData(prev => ({ ...prev, check_in_required: true }));
        } else if (formData.role === 'Vending Customer' || formData.role === 'Service Customer') {
            setFormData(prev => ({ ...prev, check_in_required: false }));
        } else {
            setFormData(prev => (prev.check_in_required === true ? { ...prev } : { ...prev, check_in_required: false }));
        }
    }, [formData.role]);


    return (
        <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {initialData ? 'Edit User' : 'Create User'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Form Fields */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            placeholder='Enter username'
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            placeholder='Enter email'
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Phone Number</label>
                        <PhoneNumberInput value={formData.phone_number} onPhoneChange={handlePhoneChange} />
                    </div>

                    {formData.role !== 'Vending Customer' && formData.role !== 'Service Customer' && permissions.canAccessPayRates() && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Pay Rate</label>
                            <input
                                type="number"
                                name="pay_rate"
                                value={formData.pay_rate}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                placeholder='Enter pay rate'
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Role</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                            disabled={roleFixed?.roles?.length === 1} // disable if only one fixed role
                        >
                            {(roleFixed?.roles?.length ? roleFixed.roles : roleOptions).map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>

                    {/* Store selection for Vending Customer creating/editing Partner/Employee */}
                    {user?.role === 'Vending Customer' &&
                        (formData.role === 'Partner' || formData.role === 'Employee') && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Store <span className="text-red-500">*</span></label>
                            <select
                                name="store_id"
                                value={formData.store_id}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                disabled={storesLoading}
                                required
                            >
                                <option value="">Select a store</option>
                                {stores.map(store => (
                                    <option key={store.id} value={store.id}>
                                        {store.store_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Others</label>

                            <div className='flex items-center gap-2'>
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    className="w-4 h-4 cursor-pointer"
                                />
                                <label className="text-sm">Active</label>
                            </div>
                            {formData.role !== 'Vending Customer' && formData.role !== 'Service Customer' && permissions.canAccessPayRates() && (

                            <div className='flex items-center gap-2'>
                                <input
                                    type="checkbox"
                                    name="check_in_required"
                                    checked={
                                        formData.role === 'Technician' || formData.role === 'Warehouse Technician' || formData.role === 'External User'
                                            ? true
                                            : formData.role === 'Vending Customer' || formData.role === 'Service Customer'
                                                ? false
                                                : formData.check_in_required
                                    }
                                    onChange={handleChange}
                                    className="w-4 h-4 cursor-pointer"
                                    disabled={
                                        formData.role === 'Technician' ||
                                        formData.role === 'Warehouse Technician' ||
                                        formData.role === 'Vending Customer' ||
                                        formData.role === 'Service Customer' ||
                                        formData.role === 'External User'
                                    }
                                />
                                <label className="text-sm">Check-in Required</label>
                            </div>
                            )}

                            {formData.role === 'Vending Customer' && (
                                <div className='flex items-center gap-2'>
                                    <input
                                        type="checkbox"
                                        name="is_broker"
                                        checked={formData.is_broker}
                                        onChange={handleChange}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                    <label className="text-sm">Is Broker</label>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Profile Picture Upload */}
                <div className="flex flex-col justify-center items-center gap-12">
                    <div className="relative w-28 h-28">
                        <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden flex items-center justify-center border shadow">
                            {previewImage ? (
                                <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <CameraIcon className="w-8 h-8 text-gray-500" />
                            )}
                        </div>

                        <label className="absolute bottom-0 right-0 bg-primary p-1 rounded-full cursor-pointer hover:bg-blue-400 shadow">
                            <CameraIcon className="w-4 h-4 text-white" />
                            <input
                                type="file"
                                disabled={loading}
                                name="profile_image"
                                accept="image/*"
                                onChange={handleChange}
                                className="hidden"
                            />
                        </label>

                        {previewImage && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={removeImage}
                                className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow cursor-pointer"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <PrimaryBtn
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update' : 'Create')}
                        </PrimaryBtn>
                    </div>
                </div>



            </form>
        </>
    );
}

export default UserFormPopup;
