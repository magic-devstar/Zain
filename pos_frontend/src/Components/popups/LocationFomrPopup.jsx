import React, { useState, useEffect } from 'react';
import PrimaryBtn from '../Common/PrimaryBtn';
import SecondaryBtn from '../Common/SecondaryBtn';
import MapPickerModal from '../Common/MapPickerModal';
import { toast } from 'react-hot-toast';
import { MapPin } from 'lucide-react';
import { useSelector } from 'react-redux';
import api from '../../utils/api';

function LocationFomrPopup({ onClose, onSubmit, initialData = null, loading }) {
    const user = useSelector((state) => state.user.user);
    const isVendingCustomer = user?.role === 'Vending Customer';
    const isReporter = user?.role === "Reporter";
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        status: 'inactive',
        assigned_to: '',
        location: null, // { lat: ..., lng: ... }
    });

    // Fetch users for the dropdown
    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            try {
                const response = await api.get(`/auth/get-users/`, {
                    params: {
                        role: 'Reporter',
                        all: true,
                    },
                });
                setUsers(response.data);
            } catch (error) {
                toast.error('Failed to load users');
                console.error(error);
            } finally {
                setLoadingUsers(false);
            }
        };

        fetchUsers();
    }, []);

    // Populate form with initialData
    useEffect(() => {
        if (initialData) {
            let parsedLocation = null;
            try {
                if (initialData.location) {
                    parsedLocation = JSON.parse(initialData.location);
                }
            } catch (error) {
                console.error('Invalid location format', error);
            }

            const newFormData = {
                name: initialData.name || '',
                status: initialData.status || 'inactive',
                assigned_to: initialData.assigned_to ? String(initialData.assigned_to) : '', // Use assigned_to directly
                location: parsedLocation,
            };
            console.log('formData.assigned_to:', newFormData.assigned_to); // Debug: Should log user ID (e.g., "30")
            setFormData(newFormData);
        } else {
            setFormData({
                name: '',
                assigned_to: '',
                status: 'inactive',
                location: null,
            });
        }
    }, [initialData]);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by this browser.');
            return;
        }

        setGettingLocation(true);

        const options = {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds
            maximumAge: 300000 // 5 minutes
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // Validate coordinates
                if (latitude === 0 && longitude === 0) {
                    toast.error('Invalid location received. Please try again or use map picker.');
                    setGettingLocation(false);
                    return;
                }

                setFormData((prev) => ({
                    ...prev,
                    location: {
                        lat: latitude,
                        lng: longitude,
                    },
                }));
                
                toast.success(`Location set! (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`);
                setGettingLocation(false);
            },
            (error) => {
                let errorMessage = 'Unable to retrieve your location.';
                
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable. Please try again or use map picker.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Please try again or use map picker.';
                        break;
                    default:
                        errorMessage = 'An unknown error occurred while getting location.';
                }
                
                toast.error(errorMessage);
                console.error('Geolocation error:', error);
                setGettingLocation(false);
            },
            options
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.location) {
            toast.error('Please select a location.');
            return;
        }
        // if (!isVendingCustomer && !formData.assigned_to) {
        //     toast.error('Please select a user to assign.');
        //     return;
        // }

        // Prepare payload
        const payload = {
            name: formData.name,
            status: formData.status,
            location: formData.location ? JSON.stringify(formData.location) : null,
            assigned_to: formData.assigned_to || null, // Send ID directly
        };

        console.log('Payload sent to onSubmit:', JSON.stringify(payload, null, 2)); // Debug: Log the payload

        onSubmit(payload);
        onClose();
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold mb-4">
                {initialData ? 'Edit Location' : 'Create New Location'}
            </h2>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Enter location name"
                    value={formData.name}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                    disabled={isReporter}
                />
            </div>
            {(!isVendingCustomer && !isReporter) && (
                <>
                    <div className="mb-4">
                        <label htmlFor="status" className="block text-sm font-semibold mb-2">
                            Status
                        </label>
                        <select
                            id="status"
                            value={formData.status}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, status: e.target.value }))
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="assignedTo" className="block text-sm font-semibold mb-2">
                            Assign To a Reporter
                        </label>
                        {loadingUsers ? (
                            <div className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none">
                                Loading users...
                            </div>
                        ) : (
                            <select
                                id="assignedTo"
                                value={formData.assigned_to}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, assigned_to: e.target.value }))
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            >
                                <option value="">Select a Reporter</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.username}
                                    </option>
                                ))}


                            </select>
                        )}
                    </div>
                </>
            )}

            <div className="flex items-center gap-2 mb-4">
                <PrimaryBtn 
                    type="button" 
                    disabled={isReporter || gettingLocation} 
                    onClick={handleUseCurrentLocation}
                    className={gettingLocation ? 'opacity-50 cursor-not-allowed' : ''}
                >
                    {gettingLocation ? 'Getting Location...' : 'Use My Location'}
                </PrimaryBtn>
                <span>OR</span>
                <SecondaryBtn type="button" disabled={isReporter} onClick={() => setShowMapPicker(true)}>
                    Pick on Map
                </SecondaryBtn>
            </div>
            {formData?.location && (
                <>
                    {formData?.location && typeof formData.location.lat === 'number' && typeof formData.location.lng === 'number' ? (
                        <button
                            data-btnbelowtooltip="Open in Map"
                            className="w-full flex justify-center items-center px-3 py-1 bg-primary text-white text-sm rounded cursor-pointer transition"
                            onClick={() => {
                                const url = `https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}`;
                                window.open(url, '_blank');
                            }}
                        >
                            <MapPin size={26} />
                        </button>
                    ) : (
                        <span>Invalid location format</span>
                    )}
                </>
            )}

            <div className="flex justify-end mt-6 space-x-3">
                <SecondaryBtn onClick={onClose} disabled={loading}>
                    Cancel
                </SecondaryBtn>
                <PrimaryBtn type="submit" disabled={loading || isReporter}>
                    {initialData ? 'Update' : 'Create'}
                </PrimaryBtn>
            </div>

            {showMapPicker && (
                <MapPickerModal
                    onClose={() => setShowMapPicker(false)}
                    onSelect={(coords) => {
                        setFormData((prev) => ({ ...prev, location: coords }));
                        setShowMapPicker(false);
                        toast.success('Location selected on map!');
                    }}
                />
            )}
        </form>
    );
}

export default LocationFomrPopup;