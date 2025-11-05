import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';

// Assuming you're using environment variables for API URL, otherwise adjust accordingly
const origin = import.meta.env.VITE_BACKEND_URL;

const ResetPassword = () => {
  console.log("ResetPassword");
  const navigate = useNavigate();
  const { uid, token } = useParams();
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [message, setMessage] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    // Validation rules
    const passwordRegex = /^(?=.*[A-Z]).{8,}$/;

    if (!passwordRegex.test(newPassword1)) {
      setMessage("Password must be at least 8 characters long and contain at least one uppercase letter.");
      return;
    }

    if (newPassword1 !== newPassword2) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      const response = await api.post(`/auth/set-password/`, {
        uid,
        token,
        new_password1: newPassword1,
        new_password2: newPassword2
      });
      setMessage(response.data.message);
      navigate('/login');  // Redirect to a 'verified' page after password reset
    } catch (error) {
      if (error.response && error.response.data) {
        // Extract error messages from backend response
        const backendErrors = error.response.data;

        // If backend returns a message string
        if (typeof backendErrors === 'string') {
          setMessage(backendErrors);
        }
        // If backend returns an object with field errors
        else if (typeof backendErrors === 'object') {
          const errorMessages = Object.values(backendErrors).flat().join(' ');
          setMessage(errorMessages);
        }
      }
      console.error('Failed to reset password', error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row lg:gap-10 min-h-screen w-full bg-white rounded-lg"        >
      <div className="w-full max-w-sm  bg-white p-8 shadow-lg rounded-lg m-auto">
        <h3 className="text-lg font-semibold text-center mb-4">Reset Password</h3>
        {message && <p className="text-center text-red-500 mb-4">{message}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={newPassword1}
            onChange={(e) => setNewPassword1(e.target.value)}
            className="border border-gray-300 rounded-md p-2"
            required
          />
          <input
            type="password"
            placeholder="Re-enter New Password"
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
            className="border border-gray-300 rounded-md p-2"
            required
          />
          <button
            type="submit"
            className="w-full cursor-pointer bg-primary text-white p-2 rounded-md hover:bg-primary-dark transition duration-200"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
