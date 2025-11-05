import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../utils/api'; // Assuming you have this API utility
import toast from 'react-hot-toast';
import PrimaryBtn from '../../../Components/Common/PrimaryBtn';

const TicketReview = () => {
    const navigate = useNavigate();
    const { ticketId } = useParams();
    const [reviewText, setReviewText] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        // Validation rules
        if (!reviewText.trim()) {
            setMessage('Review text is required.');
            return;
        }
        

        try {
            const response = await api.post(`common/api/tickets-review/${ticketId}/review/`, {
                reviewText,
            });
            toast.success(response.data.message || 'Review submitted successfully!');
            navigate('/'); // Redirect to home or another page
        } catch (error) {
            if (error.response && error.response.data) {
                const backendErrors = error.response.data;
                if (typeof backendErrors === 'string') {
                    setMessage(backendErrors);
                } else if (typeof backendErrors === 'object') {
                    const errorMessages = Object.values(backendErrors).flat().join(' ');
                    setMessage(errorMessages);
                }
            } else {
                setMessage('Failed to submit review. Please try again.');
            }
            console.error('Failed to submit review', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Submit Ticket Review</h2>
                {message && (
                    <div className={`mb-4 p-3 rounded ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="reviewText" className="block text-sm font-medium text-gray-700">
                            Review
                        </label>
                        <textarea
                            id="reviewText"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                            rows="8"
                            required
                        />
                    </div>
                    <div className='w-full flex justify-center'>
                        <PrimaryBtn
                            type="submit"
                        >
                            Submit Review
                        </PrimaryBtn>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TicketReview;