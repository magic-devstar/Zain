import React, { useState, useEffect } from "react";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import PhoneNumberInput from "../../Components/Common/PhoneNumberInput";
import toast from "react-hot-toast";

const VendorFormPopup = ({ onSubmit, initialData = {}, loading }) => {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        address: "",
        city: "",
        county: "",
        zip_code: "",
        email: "",
        phone: "",
        whatsapp: "",
        contact_person: "",
        notes: "",
    });

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setFormData({
                name: initialData.name || "",
                description: initialData.description || "",
                address: initialData.address || "",
                city: initialData.city || "",
                county: initialData.county || "",
                zip_code: initialData.zip_code || "",
                email: initialData.email || "",
                phone: initialData.phone || "",
                whatsapp: initialData.whatsapp || "",
                contact_person: initialData.contact_person || "",
                notes: initialData.notes || "",
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhoneChange = (field) => (value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate phone numbers
        const validatePhoneNumber = (number) => {
            if (!number) return true; // Allow empty phone numbers
            // Remove all non-digit characters and check length
            const digits = number.replace(/\D/g, '');
            return digits.length >= 10;
        };

        if (!validatePhoneNumber(formData.phone)) {
            toast.error("Phone number must have at least 10 digits");
            return;
        }

        if (!validatePhoneNumber(formData.whatsapp)) {
            toast.error("WhatsApp number must have at least 10 digits");
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { name: "name", label: "Name" },
                    { name: "contact_person", label: "Contact Person" },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "whatsapp", label: "WhatsApp", type: "tel" },
                    { name: "email", label: "Email", type: "email" },
                    { name: "city", label: "City" },
                    { name: "county", label: "County" },
                    { name: "zip_code", label: "Zip Code" },
                    { name: "description", label: "Description", multiline: true },
                    { name: "address", label: "Address", multiline: true },
                    { name: "notes", label: "Notes", multiline: true },
                ].map(({ name, label, type = "text", multiline }) => (
                    <div key={name} className="space-y-1">
                        <label className="block text-gray-700 font-medium">{label}</label>
                        {multiline ? (
                            <textarea
                                name={name}
                                value={formData[name] || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                rows={3}
                                required={name === "name"}
                            />
                        ) : name === "phone" || name === "whatsapp" ? (
                            <PhoneNumberInput
                                value={formData[name]}
                                onPhoneChange={handlePhoneChange(name)}
                            />
                        ) : (
                            <input
                                type={type}
                                name={name}
                                value={formData[name] || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                required={name === "name"}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Form actions */}
            <div className="flex justify-end pt-4">
                <PrimaryBtn type="submit" disabled={loading}>
                    {initialData?.id ? "Update Vendor" : "Create Vendor"}
                </PrimaryBtn>
            </div>
        </form>
    );
};

export default VendorFormPopup;
