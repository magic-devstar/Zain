import React from "react";
import PrimaryButton from "../Common/PrimaryBtn"; // You can change it to your button component
import SecondaryBtn from "../Common/SecondaryBtn";    // Or just use <button> directly

function DeleteConfirmPopup({ loading, onClose, itemName, onSubmit }) {

    return (
        <>
            <h2 className="text-lg font-semibold mb-4 text-center">
                Confirm Deletion
            </h2>
            <p className="text-center text-gray-600 mb-6">
                Are you sure you want to delete selected <span className="font-bold">{itemName}</span>?
            </p>
            <div className="flex justify-center gap-4">
                <SecondaryBtn onClick={onClose} disabled={loading} >
                    No
                </SecondaryBtn>
                <PrimaryButton onClick={onSubmit} disabled={loading} >
                    Yes, Delete
                </PrimaryButton>
            </div>
        </ >
    );
}

export default DeleteConfirmPopup;
