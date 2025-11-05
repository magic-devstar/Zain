import { useState, useEffect } from 'react';

const WarehouseSelectionForm = ({ data, handleChange, nextStep, prevStep }) => {
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    const fetchWarehouses = async () => {
      const res = await fetch('/api/warehouses/');
      const data = await res.json();
      setWarehouses(data);
    };
    fetchWarehouses();
  }, []);

  return (
    <div className="form-container">
      <h2>Select Warehouse</h2>
      <div className="form-group">
        <label>Warehouse</label>
        <select 
          name="warehouse" 
          value={data.warehouse} 
          onChange={handleChange}
        >
          <option value="">Select Warehouse</option>
          {warehouses.map(wh => (
            <option key={wh.id} value={wh.id}>{wh.name}</option>
          ))}
        </select>
      </div>
      <div className="form-actions">
        <button onClick={prevStep}>Back</button>
        <button onClick={nextStep}>Next</button>
      </div>
    </div>
  );
};

export default WarehouseSelectionForm;
