import React, { useState, useEffect } from "react";
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";

const AttributeInputPopup = ({ 
    isOpen, 
    onClose, 
    onSave, 
    initialFieldName = "", 
    initialValue = "",
    isEditing = false 
}) => {
    const [fieldName, setFieldName] = useState(initialFieldName);
    const [fieldValue, setFieldValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) {
            setFieldName(initialFieldName);
            setFieldValue(initialValue);
        }
    }, [isOpen, initialFieldName, initialValue]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!fieldName.trim()) {
            toast.error("Field name is required");
            return;
        }
        onSave(fieldName.trim(), fieldValue);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">
                    {isEditing ? "Edit Attribute" : "Add New Attribute"}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field Name
                        </label>
                        <input
                            type="text"
                            value={fieldName}
                            onChange={(e) => setFieldName(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                            placeholder="Enter field name"
                            required
                            disabled={isEditing}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Value
                        </label>
                        <input
                            type="text"
                            value={fieldValue}
                            onChange={(e) => setFieldValue(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                            placeholder="Enter value"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <SecondaryBtn type="button" onClick={onClose}>
                            Cancel
                        </SecondaryBtn>
                        <PrimaryBtn type="submit">
                            {isEditing ? "Update" : "Add"}
                        </PrimaryBtn>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AttributeInputPopup;
