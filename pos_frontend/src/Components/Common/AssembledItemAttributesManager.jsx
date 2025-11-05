import { useState, useEffect } from "react";
import { IoAdd, IoClose, IoPencil } from "react-icons/io5";

const AssembledItemAttributesManager = ({ 
  item, 
  onUpdate, 
  disabled = false 
}) => {
  const [attributes, setAttributes] = useState({});
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [newAttributeKey, setNewAttributeKey] = useState("");
  const [newAttributeValue, setNewAttributeValue] = useState("");

  // Define required attributes that are always present
  const requiredAttributes = ['serial_number', 'mac_address', 'ip_address', 'service_tag', 'service_number'];

  useEffect(() => {
    if (item && item.attributes_list && item.attributes_list.length > 0) {
      // Use the first item's attributes as the base template
      setAttributes({ ...item.attributes_list[0] });
    } else {
      // Initialize with empty required attributes
      const initialAttributes = {};
      requiredAttributes.forEach(attr => {
        initialAttributes[attr] = '';
      });
      setAttributes(initialAttributes);
    }
  }, [item]);

  const handleAttributeChange = (key, value) => {
    const newAttributes = { ...attributes, [key]: value };
    setAttributes(newAttributes);
    
    // Update all items in the attributes_list with the new attributes
    const newAttributesList = Array(item.quantity || 1).fill().map(() => ({ ...newAttributes }));
    onUpdate('attributes_list', newAttributesList);
  };

  const handleAddAttribute = () => {
    if (!newAttributeKey.trim() || !newAttributeValue.trim()) return;
    
    const newAttributes = { ...attributes, [newAttributeKey.trim()]: newAttributeValue.trim() };
    setAttributes(newAttributes);
    
    // Update all items in the attributes_list with the new attributes
    const newAttributesList = Array(item.quantity || 1).fill().map(() => ({ ...newAttributes }));
    onUpdate('attributes_list', newAttributesList);
    
    // Reset form
    setNewAttributeKey("");
    setNewAttributeValue("");
    setShowAddAttribute(false);
  };

  const handleRemoveAttribute = (key) => {
    const newAttributes = { ...attributes };
    delete newAttributes[key];
    setAttributes(newAttributes);
    
    // Update all items in the attributes_list with the new attributes
    const newAttributesList = Array(item.quantity || 1).fill().map(() => ({ ...newAttributes }));
    onUpdate('attributes_list', newAttributesList);
  };

  const handleEditAttribute = (key, newKey, value) => {
    const newAttributes = { ...attributes };
    if (key !== newKey) {
      delete newAttributes[key];
    }
    newAttributes[newKey] = value;
    setAttributes(newAttributes);
    
    // Update all items in the attributes_list with the new attributes
    const newAttributesList = Array(item.quantity || 1).fill().map(() => ({ ...newAttributes }));
    onUpdate('attributes_list', newAttributesList);
  };

  if (!item.serial_number_required) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Item Attributes</h4>
        {!disabled && (
          <button
            type="button"
            onClick={() => setShowAddAttribute(true)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <IoAdd size={16} />
            Add Attribute
          </button>
        )}
      </div>

      {/* Required Attributes (Always Present) */}
      <div className="mb-3">
        <h5 className="text-xs font-medium text-gray-700 mb-2">Required Attributes:</h5>
        <div className="space-y-2">
          {requiredAttributes.map((key) => (
            <div key={key} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
              <input
                type="text"
                value={key}
                className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded bg-blue-100 text-blue-800 font-medium"
                readOnly
                disabled={true}
              />
              <input
                type="text"
                value={attributes[key] || ''}
                onChange={(e) => handleAttributeChange(key, e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={`Enter ${key.replace('_', ' ')}`}
                disabled={disabled}
                required
              />
            </div>
          ))}
        </div>
      </div>

      {/* Custom Attributes (User Added) */}
      {Object.keys(attributes).filter(key => !requiredAttributes.includes(key)).length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-700 mb-2">Custom Attributes:</h5>
          <div className="space-y-2">
            {Object.entries(attributes)
              .filter(([key]) => !requiredAttributes.includes(key))
              .map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-white rounded border">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => handleEditAttribute(key, e.target.value, value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Attribute key"
                    disabled={disabled}
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleAttributeChange(key, e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Attribute value"
                    disabled={disabled}
                  />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttribute(key)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Remove custom attribute"
                    >
                      <IoClose size={14} />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Add New Attribute Form */}
      {showAddAttribute && !disabled && (
        <div className="p-3 bg-white rounded border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={newAttributeKey}
              onChange={(e) => setNewAttributeKey(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Attribute key (e.g., serial_number, mac_address)"
            />
            <input
              type="text"
              value={newAttributeValue}
              onChange={(e) => setNewAttributeValue(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Attribute value"
            />
            <button
              type="button"
              onClick={handleAddAttribute}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={!newAttributeKey.trim() || !newAttributeValue.trim()}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddAttribute(false);
                setNewAttributeKey("");
                setNewAttributeValue("");
              }}
              className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quantity-based Attribute List */}
      {item.quantity > 1 && Object.keys(attributes).length > 0 && (
        <div className="mt-3">
          <h5 className="text-xs font-medium text-gray-600 mb-2">
            Attributes for {item.quantity} items:
          </h5>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {Array(item.quantity).fill().map((_, index) => (
              <div key={index} className="text-xs text-gray-500 bg-white p-2 rounded border">
                <span className="font-medium">Item {index + 1}:</span>{" "}
                {Object.entries(attributes).map(([key, value]) => (
                  <span key={key} className="mr-2">
                    {key}: {value}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-2 text-xs text-gray-500">
        <p>• <strong>Required attributes</strong> (blue boxes) are mandatory and cannot be removed</p>
        <p>• <strong>Custom attributes</strong> (white boxes) can be added, edited, or removed as needed</p>
        <p>• All attributes will be applied to all {item.quantity || 1} assembled item(s)</p>
        <p>• Required: serial_number, mac_address, ip_address, service_tag, service_number</p>
      </div>
    </div>
  );
};

export default AssembledItemAttributesManager;
