import { useState, useEffect } from 'react';

const LocationDetailsForm = ({ data, handleChange, nextStep, prevStep }) => {
  return (
    <div className="form-container">
      <h2>Location Details</h2>
      <div className="form-group">
        <label>Aisle</label>
        <input 
          type="text" 
          name="aisle" 
          value={data.aisle} 
          onChange={handleChange} 
        />
      </div>
      <div className="form-group">
        <label>Shelf</label>
        <input 
          type="text" 
          name="shelf" 
          value={data.shelf} 
          onChange={handleChange} 
        />
      </div>
      <div className="form-group">
        <label>Bay</label>
        <input 
          type="text" 
          name="bay" 
          value={data.bay} 
          onChange={handleChange} 
        />
      </div>
      <div className="form-actions">
        <button onClick={prevStep}>Back</button>
        <button onClick={nextStep}>Next</button>
      </div>
    </div>
  );
};

export default LocationDetailsForm;
