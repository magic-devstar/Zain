import React, { useState } from 'react';
import PrimaryBtn from '../Common/PrimaryBtn';

function ResetPasswordPopup({ onSubmit, reseting = false }) {
    const [resetEmail, setResetEmail] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(resetEmail);
    };

    return (
        <form onSubmit={handleSubmit} className='flex flex-col items-center'>
            <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
            <input
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none mb-4"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
            />
            <PrimaryBtn type="submit" disabled={reseting}>
                {reseting ? "Sending..." : "Send Reset Email"}
            </PrimaryBtn>
        </form>
    );
}

export default ResetPasswordPopup;
