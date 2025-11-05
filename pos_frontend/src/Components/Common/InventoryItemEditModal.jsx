import { useState, useEffect } from "react";
import { IoClose, IoSave } from "react-icons/io5";
import { toast } from "react-hot-toast";
import api from "../../utils/api";

const InventoryItemEditModal = ({ isOpen, onClose, item, onSave }) => {
  const [attributes, setAttributes] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item && item.attributes) {
      setAttributes({ ...item.attributes });
    }
  }, [item]);

  const handleAttributeChange = (key, value) => {
    setAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAddAttribute = () => {
    const newKey = prompt("Enter attribute key:");
    if (newKey && newKey.trim()) {
      setAttributes(prev => ({
        ...prev,
        [newKey.trim()]: ""
      }));
    }
  };

  const handleRemoveAttribute = (key) => {
    const newAttributes = { ...attributes };
    delete newAttributes[key];
    setAttributes(newAttributes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item) return;

    try {
      setLoading(true);
      const response = await api.patch(`/common/api/inventory-items/${item.id}/`, {
        attributes: attributes
      });
      
      toast.success("Item attributes updated successfully!");
      onSave(response.data);
      onClose();
    } catch (error) {
      console.error("Error updating item attributes:", error);
      if (error.response?.data) {
        const data = error.response.data;
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => toast.error(`${field}: ${msg}`));
          } else {
            toast.error(`${field}: ${msg}`);
          }
        });
      } else {
        toast.error("Failed to update item attributes");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Item Attributes</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <IoClose size={24} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Item ID:</strong> #{item.id} | 
            <strong> Status:</strong> {item.status.replace("_", " ").toUpperCase()} |
            <strong> Warehouse:</strong> {item.warehouse_name}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {Object.entries(attributes).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (newValue !== key) {
                      const newAttributes = { ...attributes };
                      delete newAttributes[key];
                      newAttributes[newValue] = value;
                      setAttributes(newAttributes);
                    }
                  }}
                  className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Attribute key"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleAttributeChange(key, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Attribute value"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(key)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                >
                  <IoClose size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleAddAttribute}
              className="w-full p-2 border-2 border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 rounded"
            >
              + Add New Attribute
            </button>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 p-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 p-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <IoSave size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryItemEditModal;
