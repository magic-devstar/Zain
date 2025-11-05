import React from 'react';
import PrimaryBtn from './PrimaryBtn';
import SecondaryBtn from './SecondaryBtn';

const ConfirmationPopup = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-sm">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">{message}</h2>
                <div className="flex justify-end gap-4 mt-6">
                    <SecondaryBtn onClick={onCancel}>
                        Cancel
                    </SecondaryBtn>
                    <PrimaryBtn onClick={onConfirm}>
                        Proceed
                    </PrimaryBtn>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationPopup; 