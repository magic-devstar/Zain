import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { CameraIcon, XIcon } from 'lucide-react';
import PrimaryBtn from '../Common/PrimaryBtn';
import { useNavigate } from 'react-router-dom';
import PhoneNumberInput from '../Common/PhoneNumberInput';
import { updateUser } from '../../utils/apis/userUtils';
import api from '../../utils/api';
import { useDispatch } from 'react-redux';
import { setUserInfo } from '../../Redux/Slices/UserSlice';

function UpdateAccountInfo({onclose}) {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        username: '',
        email: '',
        phone_number: '',
        profile_image: null,
    });

    const [previewImage, setPreviewImage] = useState(null);


    const fetchUserData = async () => {
        try {
            const response = await api.get("/auth/profile/");
            dispatch(setUserInfo({ user: response.data }));
            const userInfo = response.data;


            setFormData(prev => ({
                ...userInfo
            }));

            if (userInfo.profile_image && typeof userInfo.profile_image === 'string') {
                const originUrl = import.meta.env.VITE_BACKEND_URL;
                const imageUrl = userInfo.profile_image.startsWith("http")
                    ? userInfo.profile_image
                    : `${originUrl}${userInfo.profile_image}`;
                setPreviewImage(imageUrl);
            }

        } catch (error) {
            toast.error("Failed to load user data");
            console.error(error);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

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


    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);

        if (!formData.phone_number || formData.phone_number.replace(/\D/g, "").length < 8) {
            toast.error("Please enter a valid number.");
            setLoading(false);
            return;
        }
        try {
            // Filter out fields that shouldn't be sent to backend
            const { permissions, is_superuser, store_profiles, ...cleanFormData } = formData;
            const response = await updateUser(cleanFormData.id, cleanFormData);
            fetchUserData();
            toast.success('Account Info Updated');
            onclose();
            // Optional: call a callback or close the popup if needed
        } catch (error) {
            toast.error('Failed to update user');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };


    const handlePhoneChange = (newPhone) => {
        setFormData({ ...formData, phone_number: newPhone });
    };


    return (
        <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Update Personal Info
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
                                name="profile_image"
                                accept="image/*"
                                onChange={handleChange}
                                className="hidden"
                            />
                        </label>

                        {previewImage && (
                            <button
                                type="button"
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
                            {loading ? 'Updating...' : 'Update'}
                        </PrimaryBtn>
                    </div>
                </div>
            </form>
        </>
    );
}

export default UpdateAccountInfo;
