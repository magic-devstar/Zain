import React, { useState } from 'react';
import axios from 'axios';
import PrimaryBtn from '../../Common/PrimaryBtn';
import SecondaryBtn from '../../Common/SecondaryBtn';

const origin = import.meta.env.VITE_BACKEND_URL;

const Userprofileupdate = ({ onCancel, userInfo, refreshUserInfo }) => {
  const [firstName, setFirstName] = useState(userInfo?.username || '');
  const [lastName, setLastName] = useState(userInfo?.last_name || '');
  const [email, setEmail] = useState(userInfo?.email || '');
  const [Phone_number, setPhone] = useState(userInfo?.Phone_number || '');
  const [dateOfBirth, setDateOfBirth] = useState(userInfo?.DOB || '');
  const [address, setAddress] = useState(userInfo?.address || '');
  const [city, setCity] = useState(userInfo?.city || '');
  const [state, setState] = useState(userInfo?.state || '');
  const [apartment, setapartment] = useState(userInfo?.apartment || '');
  const [zip, setZip] = useState(userInfo?.zip_code || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const handleSave = async () => {
    setLoading(true);
    const data = {
      username: firstName,
      last_name: lastName,
      email,
      Phone_number,
      DOB: dateOfBirth,
      address,
      city,
      state,
      apartment,
      zip,
    };

    try {
      const response = await axios.patch(`${origin}/authentication/profile_update/`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Profile updated successfully:', response.data);
      refreshUserInfo();
      onCancel(); // Close the edit form after successful save
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update the profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <div className="p-4 bg-white rounded-lg">
        <h2 className="text-2xl font-semibold mb-2">Personal Info</h2>
        <p className="text-gray-500 mb-6">Update your personal info</p>

        <form className="space-y-6 w-full">
          <div className='space-y-6'>
            <h2 className="text-2xl font-semibold mb-2">Update Profile</h2>
            {error && <p className="text-red-500">{error}</p>}

            <div className="flex items-center">
              <label className="w-1/3 text-gray-700">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-2/3 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-gray-700">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-2/3 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-2/3 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-gray-700">Phone</label>
              <input
                type="text"
                value={Phone_number}
                onChange={(e) => setPhone(e.target.value)}
                className="w-2/3 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-gray-700">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-2/3 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-gray-700">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-2/3 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-gray-700">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-2/3 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-gray-700">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-2/3 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-gray-700">Appartment</label>
              <input
                type="text"
                value={apartment}
                onChange={(e) => setapartment(e.target.value)}
                className="w-2/3 px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center">
              <label className="w-1/3 text-gray-700">ZIP</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-2/3 px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <SecondaryBtn onClick={onCancel}>
              Cancel
            </SecondaryBtn>
            <PrimaryBtn onClick={handleSave}> {loading ? 'Saving...' : 'Save'} </PrimaryBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Userprofileupdate;
