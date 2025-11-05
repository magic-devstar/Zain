import React, { useState, useEffect } from "react";
import PopupComponent from "./PopupComponent";
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";

function InvoiceChargeTypePopup({ popup, setPopup, initialData, onSubmit, isSubmitting, restrictToFixed = false }) {
  const [formData, setFormData] = useState({
    name: "",
    charge_type: restrictToFixed ? "FIXED" : "FIXED",
    value: "",
    is_compulsory: false,
    is_active: true,
    description: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        charge_type: initialData.charge_type || "FIXED",
        value: initialData.value?.toString() || "",
        is_compulsory: initialData.is_compulsory || false,
        is_active: initialData.is_active ?? true,
        description: initialData.description || "",
      });
    } else {
      setFormData({
        name: "",
        charge_type: restrictToFixed ? "FIXED" : "FIXED",
        value: "",
        is_compulsory: false,
        is_active: true,
        description: "",
      });
    }
    setErrors({});
  }, [initialData, popup]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.value) newErrors.value = "Value is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    // Ensure charge_type is FIXED when restrictToFixed is true
    const submitData = {
      ...formData,
      charge_type: restrictToFixed ? "FIXED" : formData.charge_type
    };
    
    try {
      await onSubmit(submitData);
    } catch (error) {
      // Optionally handle error
    }
  };

  return (
    <PopupComponent popup={popup} setPopup={setPopup} loading={isSubmitting}>
      <div className="max-w-md w-full">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {initialData ? "Edit Charge Type" : "Add Charge Type"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full border rounded-md px-3 py-2 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="e.g., Service Charge, Tax"
              required
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Charge Type <span className="text-red-500">*</span>
            </label>
            {restrictToFixed ? (
              <>
                <input
                  type="text"
                  value="Fixed Amount"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                  disabled
                />
                <input
                  type="hidden"
                  name="charge_type"
                  value="FIXED"
                />
              </>
            ) : (
              <select
                name="charge_type"
                value={formData.charge_type}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                <option value="FIXED">Fixed Amount</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="MANUAL">Manual</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="value"
              step="0.01"
              min="0"
              value={formData.value}
              onChange={handleChange}
              className={`w-full border rounded-md px-3 py-2 ${errors.value ? 'border-red-500' : 'border-gray-300'}`}
              placeholder={formData.charge_type === "FIXED" ? "0.00" : "0"}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.charge_type === "FIXED"
                ? "Enter amount in dollars"
                : formData.charge_type === "PERCENTAGE"
                ? "Enter percentage (e.g., 8.5 for 8.5%)"
                : "Enter amount in dollars"}
            </p>
            {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value}</p>}
          </div>

          {!restrictToFixed && (
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_compulsory"
                  checked={formData.is_compulsory}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Compulsory</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className={`w-full border rounded-md px-3 py-2 ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Description of when and why this charge is applied..."
              required
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          <div className="flex space-x-3 pt-4">
            <PrimaryBtn type="submit" className="flex-1" disabled={isSubmitting}>
              {initialData ? "Update" : "Create"}
            </PrimaryBtn>
            <SecondaryBtn type="button" onClick={() => setPopup(false)} className="flex-1" disabled={isSubmitting}>
              Cancel
            </SecondaryBtn>
          </div>
        </form>
      </div>
    </PopupComponent>
  );
}

export default InvoiceChargeTypePopup; 