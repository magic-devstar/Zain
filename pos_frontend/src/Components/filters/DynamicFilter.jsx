import React, { useState, useEffect } from 'react';

/**
 * DynamicFilter - A reusable filter component that can handle different input types
 * 
 * @param {string} fieldName - The field name to be sent to the API
 * @param {string} label - Display label for the filter
 * @param {string|number} defaultValue - Default value for the filter
 * @param {Array} options - Array of options for select type: [{value: 'val', label: 'Label'}]
 * @param {Function} onFilterChange - Callback function: (fieldName, value) => void
 * @param {string} className - Additional CSS classes
 * @param {string} placeholder - Placeholder text
 * @param {string} type - Input type: 'select', 'text', 'number', 'date'
 * @param {Object} inputProps - Additional props to pass to the input element
 * 
 * @example
 * // Status filter
 * <DynamicFilter
 *   fieldName="is_active"
 *   label="Status"
 *   defaultValue="true"
 *   options={[
 *     { value: 'true', label: 'Active' },
 *     { value: 'false', label: 'Inactive' }
 *   ]}
 *   onFilterChange={(field, value) => console.log(field, value)}
 * />
 * 
 * @example
 * // Text search filter
 * <DynamicFilter
 *   fieldName="search"
 *   label="Search"
 *   type="text"
 *   placeholder="Enter search term..."
 *   onFilterChange={(field, value) => console.log(field, value)}
 * />
 */
const DynamicFilter = ({
  fieldName,
  label,
  defaultValue,
  options = [],
  onFilterChange,
  className = "",
  placeholder = "Select an option",
  type = "select", // "select", "text", "number", "date"
  inputProps = {}
}) => {
  const [selectedValue, setSelectedValue] = useState(defaultValue);

  // Update selected value when defaultValue changes
  useEffect(() => {
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  const handleChange = (value) => {
    setSelectedValue(value);
    // Call parent callback with field name and value
    if (onFilterChange) {
      onFilterChange(fieldName, value);
    }
  };

  const renderInput = () => {
    switch (type) {
      case 'text':
        return (
          <input
            type="text"
            value={selectedValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...inputProps}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={selectedValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...inputProps}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={selectedValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...inputProps}
          />
        );
      case 'select':
      default:
        return (
          <select
            value={selectedValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            {...inputProps}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <label className="text-sm text-gray-600 mb-2 font-medium">
        {label}
      </label>
      {renderInput()}
    </div>
  );
};

export default DynamicFilter;
