import { useState, useEffect } from 'react';

const QuantityStatusForm = ({ data, handleChange, prevStep, handleSubmit }) => {
  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'in_use', label: 'In Use' },
    { value: 'reserved', label: 'Reserved' },
  ];

  return (
    <div className="form-container">
      <h2>Quantity and Status</h2>
      <div className="form-group">
        <label>Quantity</label>
        <input 
          type="number" 
          name="quantity" 
          value={data.quantity} 
          onChange={handleChange} 
          min="0"
        />
      </div>
      <div className="form-group">
        <label>Status</label>
        <select 
          name="status" 
          value={data.status} 
          onChange={handleChange}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-actions">
        <button onClick={prevStep}>Back</button>
        <button onClick={handleSubmit}>Create Inventory</button>
      </div>
    </div>
  );
};

export default QuantityStatusForm;
