import { useEffect, useState } from "react";
import { IoBuild, IoCheckmarkCircleOutline, IoCloseCircleOutline, IoConstruct, IoPencil, IoPrint, IoSearch, IoTime } from "react-icons/io5";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../utils/api";
import BackButton from "../../../Components/Common/BackButton";
import Spinner from "../../../Components/Common/Spinner";
import ImageUploaderComponent from "../../../Components/Common/ImageUploaderComponent";
import { toast } from "react-hot-toast";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import LabelPrintModal from "../../../Components/Common/LabelPrintModal";
import InventoryItemEditModal from "../../../Components/Common/InventoryItemEditModal";

// Utility function to format attribute keys
const formatAttributeKey = (key) => {
  return key
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

function InventoryDetailsPage() {
  const { inventoryId } = useParams();
  const navigate = useNavigate();
  const [inventoryDetails, setInventoryDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [activeWarehouseIds, setActiveWarehouseIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch inventory details
  const fetchInventoryDetails = async () => {
    try {
      const response = await api.get(`/common/api/inventory/${inventoryId}/`);
      const inventoryData = response.data;
      inventoryData.status_summary = getStatusSummary(inventoryData.statuses || []);
      setImages(
        inventoryData.attachments?.map((att) => ({
          id: att.id,
          file: `${origin}${att.file}`,
          url: `${origin}${att.file}`,
          name: att.file.split("/").pop(),
          isNew: false,
        })) || []
      );
      setInventoryDetails(inventoryData);
      if (inventoryData.locations?.length > 0) {
        setActiveWarehouseIds(new Set(inventoryData.locations.map(loc => loc.warehouse)));
      }
    } catch (error) {
      console.error("Error fetching inventory details:", error);
      toast.error("Failed to fetch inventory details.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate status summary
  const getStatusSummary = (statuses) => {
    const summary = {};
    statuses.forEach((item) => {
      if (!summary[item.status]) {
        summary[item.status] = 0;
      }
      summary[item.status] += item.quantity;
    });
    return summary;
  };

  // Handle image uploads
  useEffect(() => {
    const uploadImages = async () => {
      console.log("Images state:", images);
      const newImages = images.filter((img) => img.isNew);
      console.log("New images to upload:", newImages);

      if (newImages.length > 0) {
        const imageFormData = new FormData();
        newImages.forEach((img) => {
          imageFormData.append("images", img.file);
        });
        imageFormData.append("reference_type", "inventory");
        imageFormData.append("id", inventoryId);

        try {
          setLoading(true);
          const response = await api.post("/common/api/attachments/attach_to_reference/", imageFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          console.log("API response:", response.data);

          const newAttachments = response.data.map((att) => ({
            id: att.id,
            file: `${origin}${att.file}`,
            url: `${origin}${att.file}`,
            name: att.file.split("/").pop(),
            isNew: false,
          }));
          setImages((prevImages) => [
            ...prevImages.filter((img) => !img.isNew),
            ...newAttachments,
          ]);
          toast.success("Images uploaded successfully.");
        } catch (error) {
          console.error("Attachment upload failed:", error.response?.data || error.message);
          toast.error("Failed to upload images.");
        } finally {
          setLoading(false);
        }
      } else {
        console.log("No new images to upload");
      }
    };

    uploadImages();
  }, [images, inventoryId]);

  // Fetch inventory details on mount
  useEffect(() => {
    fetchInventoryDetails();
  }, [inventoryId]);

  // Toggle warehouse expansion
  const toggleWarehouse = (warehouseId) => {
    setActiveWarehouseIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(warehouseId)) {
        newSet.delete(warehouseId);
      } else {
        newSet.add(warehouseId);
      }
      return newSet;
    });
  };

  // Handle opening edit modal for inventory item
  const handleEditItem = (item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  // Handle saving edited item
  const handleSaveItem = (updatedItem) => {
    // Update the item in the local state
    setInventoryDetails(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      )
    }));
    toast.success("Item updated successfully!");
  };

  const origin = import.meta.env.VITE_BACKEND_URL;

  // Search filter function
  const filterItems = (items, searchQuery) => {
    if (!searchQuery && statusFilter === "all") return items;

    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Search in attributes
      const attributesMatch = item.attributes && Object.entries(item.attributes).some(
        ([key, value]) => {
          const stringValue = String(value).toLowerCase();
          return stringValue.includes(query) || key.toLowerCase().includes(query);
        }
      );

      // Search in other item fields
      const itemIdMatch = String(item.id).includes(query);
      const statusMatch = item.status.toLowerCase().includes(query);
      const customerMatch = item.customer_name?.toLowerCase().includes(query) ||
        String(item.customer_id)?.includes(query);

      return attributesMatch || itemIdMatch || statusMatch || customerMatch;
    });
  };

  // Effect to automatically open warehouses with matching items when searching
  useEffect(() => {
    if (!searchQuery || !inventoryDetails) return;

    const warehousesWithMatches = new Set();

    inventoryDetails.locations.forEach(loc => {
      const hasMatchingItems = inventoryDetails.items.some(item => {
        if (item.warehouse !== loc.warehouse) return false;

        const itemMatches = filterItems([item], searchQuery).length > 0;
        if (itemMatches) {
          warehousesWithMatches.add(loc.warehouse);
          return true;
        }
        return false;
      });
    });

    setActiveWarehouseIds(warehousesWithMatches);
  }, [searchQuery, inventoryDetails]);

  const handlePrint = () => {
    if (!inventoryDetails?.qr_code) {
      toast.error("No QR code available for printing");
      return;
    }

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Write the print content to the iframe
    iframe.contentDocument.write(`
      <html>
        <head>
          <title>Print QR Codes - ${inventoryDetails.name}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 10px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 5px;
              justify-content: center;
            }
            .qr-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              border: 1px dashed #ccc;
              padding: 5px;
              margin: 2px;
              width: 83mm;
              height: 41mm;
            }
            .qr-code {
              width: 32mm;
              height: 32mm;
              object-fit: contain;
            }
            .item-details {
              text-align: center;
              margin-top: 2px;
              font-family: Arial, sans-serif;
              font-size: 10px;
              line-height: 1.2;
            }
            @media print {
              .qr-container {
                page-break-inside: avoid;
              }
              @page {
                size: A4;
                margin: 10mm;
              }
            }
          </style>
        </head>
        <body>
          ${Array(15).fill().map(() => `
            <div class="qr-container">
              <img src="${inventoryDetails.qr_code}" class="qr-code" alt="QR Code" />
              <div class="item-details">
                <strong>${inventoryDetails.name}</strong><br/>
                UPC: ${inventoryDetails.upc}
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `);
    iframe.contentDocument.close();

    // Print the iframe content
    iframe.onload = () => {
      iframe.contentWindow.print();
      // Remove the iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    };
  };

  // New function for label printer printing
  const handleLabelPrint = () => {
    if (!inventoryDetails?.qr_code) {
      toast.error("No QR code available for printing");
      return;
    }

    // Create a hidden iframe for label printing
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Write the label-specific print content to the iframe
    iframe.contentDocument.write(`
      <html>
        <head>
          <title>Print Labels - ${inventoryDetails.name}</title>
          <style>
            @page {
              size: 50mm 25mm; /* Standard label size - adjust based on your label printer */
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              font-size: 8px;
              line-height: 1.2;
            }
            .label {
              width: 50mm;
              height: 25mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 1mm;
              box-sizing: border-box;
            }
            .qr-code {
              width: 15mm;
              height: 15mm;
              object-fit: contain;
              margin-bottom: 1mm;
            }
            .item-name {
              font-weight: bold;
              text-align: center;
              margin-bottom: 0.5mm;
              font-size: 7px;
              max-width: 45mm;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .item-upc {
              text-align: center;
              font-size: 6px;
              color: #666;
            }
            @media print {
              .label {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              @page {
                size: 50mm 25mm;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${Array(20).fill().map(() => `
            <div class="label">
              <img src="${inventoryDetails.qr_code}" class="qr-code" alt="QR Code" />
              <div class="item-name">${inventoryDetails.name}</div>
              <div class="item-upc">UPC: ${inventoryDetails.upc}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `);
    iframe.contentDocument.close();

    // Print the iframe content
    iframe.onload = () => {
      iframe.contentWindow.print();
      // Remove the iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    };
  };

  if (loading) {
    return (
      <div className="h-[80svh]">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      {/* Header Start */}
      <div className="flex flex-row justify-between items-center mb-2 space-y-2 md:space-y-0">
        <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-1">
          <BackButton />
          Inventory Item Details
        </h1>
        <div className="flex gap-2">
          <PrimaryBtn
            onClick={handlePrint}
          >
            <IoPrint size={20} />
            Print QR Code
          </PrimaryBtn>
          <PrimaryBtn
            onClick={() => setShowLabelModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <IoPrint size={20} />
            Print Labels
          </PrimaryBtn>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between flex-wrap">
        {/* Status */}
        <div className="flex flex-wrap mb-2 w-full lg:w-[70%] border border-gray-200 bg-white rounded-xl py-10 px-2 md:px-4 items-center gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm mt-4">
            {[
              ["Name", inventoryDetails?.name],
              ["UPC", inventoryDetails?.upc],
              ["Unit Price", inventoryDetails?.unit_price],
              ["Price", inventoryDetails?.price],
              ["Low Stock Threshold", inventoryDetails?.low_stock_threshold],
              ["Serial Number Required", inventoryDetails?.serial_number_required ? "Yes" : "No"],
              ["Created At", new Date(inventoryDetails?.created_at).toLocaleString()],
              ["Updated At", new Date(inventoryDetails?.updated_at).toLocaleString()],
              ["Description", inventoryDetails?.description],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <span className="font-semibold text-[#212529] opacity-50">{label}</span>
                <span className="font-semibold text-primary break-all">{value || "N/A"}</span>
              </div>
            ))}
            {/* Price Matrix Info */}
            {inventoryDetails?.unit_price && inventoryDetails?.price && (
              <div className="col-span-2 flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <span className="font-semibold text-[#212529] opacity-50">Price Calculation</span>
                <span className="font-semibold text-green-600">
                  Auto-calculated via Price Matrix
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap mb-2 w-full lg:w-[29%] bg-white rounded-xl p-2 md:px-4 items-center justify-center gap-4">
          {/* QR Code */}
          {inventoryDetails?.qr_code && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
              <img
                src={inventoryDetails.qr_code}
                alt="QR Code"
                className="max-w-[230px] border border-gray-300 rounded"
              />
            </div>
          )}
        </div>

        <div className="w-full border border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 mb-2">
          <div className="flex gap-4 w-full">
            <div className="flex-1 lg:basis-1/2 lg:pr-2">
              {inventoryDetails?.locations?.length > 0 && (
                <div className="text-sm w-full">
                  <p className="font-semibold text-[#212529] opacity-70 text-xs sm:text-lg mb-2">
                    Location Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                    {inventoryDetails.locations.map((loc, index) => (
                      <div key={index} className="border border-gray-200 rounded p-3 bg-gray-50">
                        <p>
                          <span className="font-semibold text-[#212529] opacity-50">Warehouse:</span>{" "}
                          <span className="font-semibold text-primary">{loc.warehouse_name}</span>
                        </p>
                        <p>
                          <span className="font-semibold text-[#212529] opacity-50">Aisle:</span>{" "}
                          <span className="font-semibold text-primary">{loc.aisle || "N/A"}</span>
                        </p>
                        <p>
                          <span className="font-semibold text-[#212529] opacity-50">Shelf:</span>{" "}
                          <span className="font-semibold text-primary">{loc.shelf || "N/A"}</span>
                        </p>
                        <p>
                          <span className="font-semibold text-[#212529] opacity-50">Bay:</span>{" "}
                          <span className="font-semibold text-primary">{loc.bay || "N/A"}</span>
                        </p>
                        <div className="mt-2 border-t pt-2">
                          <p>
                            <span className="font-semibold text-[#212529] opacity-50">Available Items:</span>{" "}
                            <span className="font-semibold text-green-600">{loc.available_quantity}</span>
                          </p>
                          <p>
                            <span className="font-semibold text-[#212529] opacity-50">In Use Items:</span>{" "}
                            <span className="font-semibold text-blue-600">{loc.in_use_quantity}</span>
                          </p>
                          <p>
                            <span className="font-semibold text-[#212529] opacity-50">In Repair Items:</span>{" "}
                            <span className="font-semibold text-yellow-600">
                              {inventoryDetails.items.filter(item => 
                                item.warehouse === loc.warehouse && 
                                item.status === "in_repair"
                              ).length}
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold text-[#212529] opacity-50">Consumed Items:</span>{" "}
                            <span className="font-semibold text-gray-600">{loc.consumed_quantity}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Search Input */}
        <div className="w-full border border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 mb-2">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search all items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="in_repair">In Repair</option>
              <option value="consumed">Consumed</option>
            </select>
          </div>

          {/* Warehouse Items Section */}
          {inventoryDetails?.locations?.length > 0 && (
            <div className="w-full py-4 px-2 mb-2">
              <p className="font-semibold text-[#212529] opacity-70 text-xs sm:text-lg mb-2">
                Warehouse Items (Available, In Use & In Repair)
              </p>
              <div className="text-sm w-full">
                {inventoryDetails.locations.map((loc) => {
                  // Filter items for this warehouse
                  const warehouseItems = filterItems(
                    inventoryDetails.items.filter(
                      (item) => item.warehouse === loc.warehouse &&
                        (item.status === "available" || item.status === "in_use" || item.status === "in_repair")
                    ),
                    searchQuery
                  );

                  // Only show warehouses that have matching items
                  if (warehouseItems.length === 0) return null;

                  return (
                    <div key={loc.warehouse} className="mb-2">
                      <button
                        type="button"
                        onClick={() => toggleWarehouse(loc.warehouse)}
                        className="w-full flex justify-between items-center p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left"
                      >
                        <span className="font-semibold text-primary">{loc.warehouse_name}</span>
                        <span>{activeWarehouseIds.has(loc.warehouse) ? "−" : "+"}</span>
                      </button>
                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${activeWarehouseIds.has(loc.warehouse)
                          ? "max-h-[1000px] opacity-100"
                          : "max-h-0 opacity-0"
                          }`}
                      >
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                          {warehouseItems.map((item) => (
                            <div
                              key={item.id}
                              className="border border-gray-200 rounded p-3 bg-gray-50"
                            >
                                                            <div className="flex justify-between items-start mb-2">
                                <p>
                                  <span className="font-semibold text-[#212529] opacity-50">Item ID:</span>{" "}
                                  <span className="font-semibold text-primary">#{item.id}</span>
                                </p>
                                <div className="flex gap-2">
                                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                                    <button
                                      onClick={() => handleEditItem(item)}
                                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm cursor-pointer"
                                      title="Edit Attributes"
                                    >
                                      <IoPencil size={16} />
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => navigate(`${item.id}/history`)}
                                    className="text-primary hover:text-primary-dark flex items-center gap-1 text-sm cursor-pointer"
                                  >
                                    <IoTime size={16} />
                                    History
                                  </button>
                                </div>
                              </div>
                              <p>
                                <span className="font-semibold text-[#212529] opacity-50">Status:</span>{" "}
                                <span className={`font-semibold ${
                                  item.status === "available" ? "text-green-600" :
                                  item.status === "in_use" ? "text-blue-600" :
                                  item.status === "in_repair" ? "text-yellow-600" :
                                  "text-gray-600"
                                }`}>
                                  {item.status.replace("_", " ").toUpperCase()}
                                </span>
                              </p>
                              {Object.entries(item.attributes).map(([key, value]) => (
                                <p key={key}>
                                  <span className="font-semibold text-[#212529] opacity-50">
                                    {formatAttributeKey(key)}:
                                  </span>{" "}
                                  <span className="font-semibold text-primary">
                                    {value || "N/A"}
                                  </span>
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!inventoryDetails.locations.some(loc =>
                  filterItems(
                    inventoryDetails.items.filter(
                      (item) => item.warehouse === loc.warehouse &&
                        (item.status === "available" || item.status === "in_use" || item.status === "in_repair")
                    ),
                    searchQuery
                  ).length > 0
                ) && (
                    <p className="text-gray-500">No matching items found in any warehouse.</p>
                  )}
              </div>
            </div>
          )}

          {/* Consumed Items Section */}
          <div className="w-full py-4 px-2 mb-2 border-t border-gray-200">
            <p className="font-semibold text-[#212529] opacity-70 text-xs sm:text-lg mb-2">
              Consumed Items
            </p>
            <div className="text-sm w-full">
              {inventoryDetails.locations.map((loc) => {
                // Filter consumed items for this warehouse
                const consumedItems = filterItems(
                  inventoryDetails.items.filter(
                    (item) => item.warehouse === loc.warehouse && item.status === "consumed"
                  ),
                  searchQuery
                );

                // Only show warehouses that have matching consumed items
                if (consumedItems.length === 0) return null;

                return (
                  <div key={`consumed-${loc.warehouse}`} className="mb-2">
                    <button
                      type="button"
                      onClick={() => toggleWarehouse(loc.warehouse)}
                      className="w-full flex justify-between items-center p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left"
                    >
                      <span className="font-semibold text-primary">{loc.warehouse_name}</span>
                      <span>{activeWarehouseIds.has(loc.warehouse) ? "−" : "+"}</span>
                    </button>
                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden ${activeWarehouseIds.has(loc.warehouse)
                        ? "max-h-[1000px] opacity-100"
                        : "max-h-0 opacity-0"
                        }`}
                    >
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                        {consumedItems.map((item) => (
                          <div
                            key={item.id}
                            className="border border-gray-200 rounded p-3 bg-gray-50"
                          >
                            <div className="flex justify-between items-start">
                              <p className="border-b border-gray-200 pb-2">
                                <span className="font-semibold text-[#212529] opacity-50">Store:</span>{" "}
                                <span className="font-semibold text-primary">{item?.store_name || item?.customer_name || 'N/A'}</span>
                              </p>
                              <div className="flex gap-2">
                                {item.attributes && Object.keys(item.attributes).length > 0 && (
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm cursor-pointer"
                                    title="Edit Attributes"
                                  >
                                    <IoPencil size={16} />
                                    Edit
                                    </button>
                                  )}
                                <button
                                  onClick={() => navigate(`${item.id}/history`)}
                                  className="text-primary hover:text-primary-dark flex items-center gap-1 text-sm cursor-pointer"
                                >
                                  <IoTime size={16} />
                                  History
                                </button>
                              </div>
                            </div>
                            <p>
                              <span className="font-semibold text-[#212529] opacity-50">Item ID:</span>{" "}
                              <span className="font-semibold text-primary">#{item.id}</span>
                            </p>

                            {Object.entries(item.attributes).map(([key, value]) => (
                              <p key={key}>
                                <span className="font-semibold text-[#212529] opacity-50">
                                  {formatAttributeKey(key)}:
                                </span>{" "}
                                <span className="font-semibold text-primary">
                                  {value || "N/A"}
                                </span>
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!inventoryDetails.locations.some(loc =>
                filterItems(
                  inventoryDetails.items.filter(
                    (item) => item.warehouse === loc.warehouse && item.status === "consumed"
                  ),
                  searchQuery
                ).length > 0
              ) && (
                  <p className="text-gray-500">No matching consumed items found in any warehouse.</p>
                )}
            </div>
          </div>

        </div>

        {/* Images section */}
        <div className="w-full border border-gray-200 rounded-xl py-4 px-2 md:px-4">
          <div className="flex gap-4 w-full">
            <div className="flex-1 lg:basis-1/2 lg:pr-2">
              <p className="font-semibold text-[#212529] opacity-70 text-xs sm:text-lg mb-2">
                Images
              </p>
              <ImageUploaderComponent images={images} showDeleteButton={true} setImages={setImages} />
            </div>
          </div>
        </div>
      </div>

      {/* Label Print Modal */}
      <LabelPrintModal
        isOpen={showLabelModal}
        onClose={() => setShowLabelModal(false)}
        inventoryData={inventoryDetails}
      />

      {/* Inventory Item Edit Modal */}
      <InventoryItemEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSave={handleSaveItem}
      />
    </>
  );
}

export default InventoryDetailsPage;