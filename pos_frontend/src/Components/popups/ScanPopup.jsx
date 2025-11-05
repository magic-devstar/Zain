import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import PopupComponent from "./PopupComponent";
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";
import Spinner from "../Common/Spinner";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import useBasePath from "../../utils/useBasePath ";

const ScanPopup = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [scanning, setScanning] = useState(false);
  const [manualUPC, setManualUPC] = useState("");
  const [loading, setLoading] = useState(false);
  const [inventoryDetails, setInventoryDetails] = useState(null);
  const [popup, setPopup] = useState(isOpen);

  const handleScan = async (err, result) => {
    if (result) {
      const upc = result.text.trim();
      setScanning(false);
      await fetchInventoryDetails(upc);
    }
    if (err && scanning) {
      console.error("QR scan error:", err);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualUPC.trim()) {
      toast.error("Please enter a UPC code.");
      return;
    }
    await fetchInventoryDetails(manualUPC.trim());
    setManualUPC("");
  };

  const fetchInventoryDetails = async (upc) => {
    try {
      setLoading(true);
      const response = await api.get(`/common/api/InventorySimple/?upc=${upc}&all=true`);
      
      if (response.data && response.data.length > 0) {
        setInventoryDetails(response.data[0]);
        toast.success("Inventory details found!");
      } else {
        toast.error("No inventory found with this UPC code.");
        setInventoryDetails(null);
      }
    } catch (error) {
      console.error("Error fetching inventory details:", error);
      toast.error("Failed to fetch inventory details.");
      setInventoryDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleScanButtonClick = () => {
    const isHttp = window.location.protocol === "http:";
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (isHttp && !isLocalhost) {
      toast.error("Scanner requires HTTPS or localhost. Please access the site via HTTPS to use this feature on a non-local server.");
      setScanning(false);
      return;
    }
    setScanning(!scanning);
  };

  const handleTransferClick = () => {
    if (inventoryDetails) {
      // Navigate to transfer form page using base path
      navigate(`${basePath}/transfers/create`);
      onClose(); // Close the popup after navigation
    }
  };

  const handleClose = () => {
    setScanning(false);
    setManualUPC("");
    setInventoryDetails(null);
    setPopup(false);
    onClose();
  };

  const renderInventoryDetails = () => {
    if (!inventoryDetails) return null;

    return (
      <div className="bg-gray-50 p-4 rounded-lg mt-4">
        <div className="flex items-center mb-3">
          <h3 className="text-lg font-semibold">Inventory Details</h3>
          <button
            data-btnbelowtooltip="Go to Transfers"
            onClick={handleTransferClick}
            className="p-2 text-primary hover:text-primary_light transition-colors duration-200 cursor-pointer"
            title="Go to Transfers"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Details */}
          <div className="space-y-4">
            {/* Basic Information */}
            <div>
              <h4 className="font-semibold mb-2">Basic Information</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{inventoryDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">UPC</p>
                  <p className="font-medium">{inventoryDetails.upc}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="font-medium">{inventoryDetails.description || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium">{inventoryDetails.category_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Serial Number Required</p>
                  <p className="font-medium">{inventoryDetails.serial_number_required ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Low Stock Threshold</p>
                  <p className="font-medium">{inventoryDetails.low_stock_threshold || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unit Price</p>
                  <p className="font-medium">${inventoryDetails.unit_price || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="font-medium">${inventoryDetails.price || '0.00'}</p>
                </div>
              </div>
            </div>

            {/* Quantity Summary */}
            <div>
              <h4 className="font-semibold mb-2">Quantity Summary</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 p-3 rounded text-center">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-blue-600">{inventoryDetails.total_quantity || 0}</p>
                </div>
                <div className="bg-green-50 p-3 rounded text-center">
                  <p className="text-sm text-gray-600">Available</p>
                  <p className="text-xl font-bold text-green-600">{inventoryDetails.available_quantity || 0}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded text-center">
                  <p className="text-sm text-gray-600">In Use</p>
                  <p className="text-xl font-bold text-orange-600">{(inventoryDetails.total_quantity || 0) - (inventoryDetails.available_quantity || 0)}</p>
                </div>
              </div>
            </div>



            {/* Warehouse Names */}
            {inventoryDetails.warehouse_names && inventoryDetails.warehouse_names.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Available in Warehouses</h4>
                <div className="flex flex-wrap gap-2">
                  {inventoryDetails.warehouse_names.map((warehouse, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {warehouse}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Items */}
          <div className="space-y-4">
            {/* Warehouse Locations */}
            {inventoryDetails.locations && inventoryDetails.locations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Warehouse Locations</h4>
                <div className="space-y-3">
                  {inventoryDetails.locations.map((location, index) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium">{location.warehouse_name}</h5>
                        <span className="text-xs text-gray-500">Warehouse {location.warehouse}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-gray-600">Aisle:</span>
                          <span className="ml-1">{location.aisle || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Shelf:</span>
                          <span className="ml-1">{location.shelf || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Bay:</span>
                          <span className="ml-1">{location.bay || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-green-600 font-medium">{location.available_quantity}</div>
                          <div className="text-gray-500">Available</div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-600 font-medium">{location.in_use_quantity}</div>
                          <div className="text-gray-500">In Use</div>
                        </div>
                        <div className="text-center">
                          <div className="text-red-600 font-medium">{location.consumed_quantity}</div>
                          <div className="text-gray-500">Consumed</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Items */}
            <div>
              <h4 className="font-semibold mb-2">Individual Items ({inventoryDetails.items?.length || 0})</h4>
              {inventoryDetails.items && inventoryDetails.items.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">ID</th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left">Warehouse</th>
                        <th className="p-2 text-left">Customer</th>
                        <th className="p-2 text-left">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryDetails.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono text-xs">{item.id}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.status === 'available' ? 'bg-green-100 text-green-800' :
                              item.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
                              item.status === 'consumed' ? 'bg-red-100 text-red-800' :
                              item.status === 'in_repair' ? 'bg-orange-100 text-orange-800' :
                              item.status === 'defective' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-2">{item.warehouse_name || 'N/A'}</td>
                          <td className="p-2">{item.store_name || item.customer_name || 'N/A'}</td>
                          <td className="p-2 text-xs">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No items found for this inventory
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Update popup state when isOpen changes
  useEffect(() => {
    setPopup(isOpen);
  }, [isOpen]);
  
  if (!popup) return null;
  
  const popupContent = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center" style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="fixed inset-0 bg-black bg-opacity-50" style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={handleClose}></div>
      <div className="relative bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ zIndex: 999999, position: 'relative' }}>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Scan QR Code</h2>
        {/* Scanner Section */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <PrimaryBtn onClick={handleScanButtonClick} disabled={loading}>
              {scanning ? "Stop Scanning" : "Scan Barcode"}
            </PrimaryBtn>
            {scanning && (
              <div className="mt-2">
                <BarcodeScannerComponent
                  width={300}
                  height={300}
                  onUpdate={handleScan}
                  facingMode="environment"
                  torch={false}
                />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-col gap-2">
              <label className="font-medium">Manual UPC Entry</label>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualUPC}
                  onChange={(e) => setManualUPC(e.target.value)}
                  placeholder="Enter UPC code"
                  className="flex-1 border border-gray-200 rounded p-2"
                />
                <PrimaryBtn type="submit" disabled={loading}>
                  Search
                </PrimaryBtn>
              </form>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center">
            <Spinner />
          </div>
        )}

        {/* Inventory Details */}
        {renderInventoryDetails()}

        {/* Close Button */}
        <div className="flex justify-end">
          <SecondaryBtn onClick={handleClose}>
            Close
          </SecondaryBtn>
        </div>
        </div>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
};

export default ScanPopup; 