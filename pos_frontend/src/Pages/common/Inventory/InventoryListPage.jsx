import React, { useState, useMemo } from "react";
import TableComponent from "../../../Components/Common/TableComponent";
import api from "../../../utils/api";
import PopupComponent from "../../../Components/popups/PopupComponent";
import { useParams, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import InventoryFormPopup from "../../../Components/popups/InventoryFormPopup";
import toast from "react-hot-toast";
import InventoryFilter from "../../../Components/filters/InventoryFilter";
import { useSelector } from 'react-redux';
import { EyeIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import ImageCarousel from "../../../Components/Common/ImageCarousel";
import DeleteConfirmationModal from "../../../Components/popups/DeleteConfirmationModal";
import { getPageId, PAGE_IDS } from "../../../utils/sortingUtils";
import useReportsToggle from "../../../utils/useReportsToggle";

function InventoryListPage() {
  const user = useSelector((state) => state.user.user);
  const isManager = user?.role === "Manager";
  const navigate = useNavigate();
  const location = useLocation();
  const [Inventory, setInventory] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [inventoryDetails, setInventoryDetails] = useState(null);
  const [printing, setPrinting] = useState(false);
  const { warehouseId } = useParams();
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState(null);
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselAttachments, setCarouselAttachments] = useState([]);
  const imageAPIBaseURL = api.defaults.baseURL.replace("/api/v1", "").trim();
  const { reportsEnabled } = useReportsToggle();

  const renderInventory = (inventorytData) => {
    setInventory(inventorytData);  // Update tickets data with the fetched data
  };

  const handleCreateInventory = () => {
    setPopupName("Create Inventory");
    setPopup(true);
  };

  const handleInventorySubmit = async (inventoryData) => {
    try {
      setLoading(true);
      setRefreshToggle(false);
      const response = await api.post("/common/api/InventorySimple/", inventoryData)
      toast.success("Inventory item created successfully!")
      setRefreshToggle(true);
      setPopup(false);
      return response;
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;

        // Show all field-level errors from DRF
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => toast.error(`${field}: ${msg}`));
          } else {
            toast.error(`${field}: ${messages}`);
          }
        });
      } else {
        toast.error(error.message || "Failed to create Inventory Item");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditInventory = async (inventoryRow) => {
    try {
      setLoading(true);
      // Fetch full details to include locations and items needed by the form
      const response = await api.get(`/common/api/InventorySimple/${inventoryRow.id}/`);
      setInventoryDetails(response.data);
      setPopupName("Edit Inventory");
      setPopup(true);
    } catch (error) {
      toast.error("Failed to load inventory details for editing");
    } finally {
      setLoading(false);
    }
  };

  const handleEditInventorySubmit = async (updatedData) => {
    try {
      setRefreshToggle(false);
      setLoading(true);
      const response = await api.put(`/common/api/InventorySimple/${updatedData.id}/`, updatedData)
      toast.success("Inventory item updated successfully!")
      setPopup(false);
      setRefreshToggle(true);
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;

        // Show all field-level errors from DRF
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => toast.error(`${field}: ${msg}`));
          } else {
            toast.error(`${field}: ${messages}`);
          }
        });
      } else {
        toast.error(error.message || "Failed to create Inventory Item");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInventory = async (Inventory) => {
    try {
      setRefreshToggle(false);
      await api.delete(`/common/api/InventorySimple/${Inventory}/`);
      toast.success('Inventory item deleted!');
      setRefreshToggle(true);
      setDeleteModalOpen(false);
      setInventoryToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting inventory item");
    }
  };

  const handleDeleteClick = (inventoryId) => {
    setInventoryToDelete(inventoryId);
    setDeleteModalOpen(true);
  };

  const handleSortChange = (newSortConfig) => {
    console.log('Sorting changed:', newSortConfig);
    setSortConfig(newSortConfig);
    setRefreshToggle(prev => !prev);
  };

  const handleImageClick = (attachments) => {
    const transformedAttachments = attachments.map(att => {
      let relativePath = att.file;
      let baseURL = `${import.meta.env.VITE_BACKEND_URL}`.trim();
        relativePath = `${baseURL}${relativePath}`;
      return {
        ...att,
        file: relativePath,
      };
    });
    setCarouselAttachments(transformedAttachments);
    setShowCarousel(true);
  };

  const handleTransferClick = () => {
    const currentPath = location.pathname;
    let newPath;

    // Check if we're in a warehouse view
    if (currentPath.includes('/warehouses/')) {
      // For warehouse view, maintain the warehouse context
      newPath = currentPath.replace(/\/warehouses\/(\d+).*$/, '/transfers/create');
    } else {
      // For general inventory view
      newPath = currentPath.replace(/\/inventory$/, '/transfers/create');
    }

    navigate(newPath);
  };

  const handlePrintReport = async (currentFilters = filters) => {
    try {
      setPrinting(true);

      const params = {
        ...currentFilters,
        all: true,
        list: true,
        ...(warehouseId ? { warehouse_id: warehouseId } : {})
      };

      // Remove empty values
      Object.keys(params).forEach((k) => {
        if (params[k] === "" || params[k] === null) delete params[k];
      });

      const response = await api.get("/common/api/InventorySimple/", { params });

      // Handle different possible response structures
      let allInventory = [];
      if (response.data && Array.isArray(response.data)) {
        allInventory = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        allInventory = response.data.results;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        allInventory = response.data.data;
      } else {
        console.log('Unexpected response structure:', response);
        toast.error("Unexpected data format received from server");
        return;
      }

      if (!allInventory || allInventory.length === 0) {
        toast.error("No inventory items found for selected filters");
        return;
      }

      // Calculate summary statistics
      const totalItems = allInventory.length;
      const totalQuantity = allInventory.reduce((sum, item) => sum + (parseInt(item.total_quantity) || 0), 0);
      const totalAvailable = allInventory.reduce((sum, item) => sum + (parseInt(item.available_quantity) || 0), 0);
      const lowStockItems = allInventory.filter(item => (parseInt(item.available_quantity) || 0) <= 10).length;

      // Build HTML rows for the report
      const htmlRows = allInventory.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.upc}</td>
          <td>${item.category_name || 'N/A'}</td>
          <td>${item.total_quantity || 0}</td>
          <td>${item.available_quantity || 0}</td>
          <td>${warehouseId ? 'N/A' : (item.warehouse_names && item.warehouse_names.length > 0 ? item.warehouse_names.join(", ") : "N/A")}</td>
        </tr>
      `).join('');

      // Create iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Inventory Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #003366; }
              .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
              .summary h3 { margin: 0 0 10px 0; color: #333; }
              .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
              .summary-item { background: white; padding: 10px; border-radius: 3px; border-left: 4px solid #003366; }
              .summary-item h4 { margin: 0 0 5px 0; color: #003366; font-size: 14px; }
              .summary-item p { margin: 0; font-size: 18px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .low-stock { color: #d32f2f; font-weight: bold; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Inventory Report</h1>
              <p>Generated on: ${new Date().toLocaleString()}</p>
              ${warehouseId ? `<p>Warehouse ID: ${warehouseId}</p>` : ''}
            </div>
            
            <div class="summary">
              <h3>Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <h4>Total Items</h4>
                  <p>${totalItems}</p>
                </div>
                <div class="summary-item">
                  <h4>Total Quantity</h4>
                  <p>${totalQuantity}</p>
                </div>
                <div class="summary-item">
                  <h4>Available Quantity</h4>
                  <p>${totalAvailable}</p>
                </div>
                <div class="summary-item">
                  <h4>Low Stock Items (≤10)</h4>
                  <p class="low-stock">${lowStockItems}</p>
                </div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>UPC</th>
                  <th>Category</th>
                  <th>Total Qty</th>
                  <th>Available Qty</th>
                  ${!warehouseId ? '<th>Warehouse</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${htmlRows}
              </tbody>
            </table>
          </body>
        </html>
      `);
      doc.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          document.body.removeChild(iframe);
        }, 300);
      };
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to generate inventory report');
    } finally {
      setPrinting(false);
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
      { name: "Image", key: "attachments", sortable: false },
      { name: "Name", key: "name", sortable: true },
      { name: "UPC", key: "upc", sortable: true },
      { name: "Category", key: "category", sortable: true },
      { name: "Total Qty", key: "total_quantity", sortable: true },
      { name: "Available Qty", key: "available_quantity", sortable: true },
      { name: "Transfer", key: "transfer", sortable: false },
    ];

    if (!warehouseId) {
      baseColumns.push({ name: "Warehouse IDs", key: "warehouse_ids", sortable: false });
      baseColumns.push({ name: "Warehouse Names", key: "warehouse_names", sortable: false });
    }

    baseColumns.push({ name: "Actions", key: "actions", sortable: false });

    return baseColumns;
  }, [warehouseId]);

  const cells = useMemo(() => {
    const baseCells = [
      ({ row }) => (
        <div className="relative group w-12 h-12">
          {row.attachments && row.attachments.length > 0 ? (
            <>
              <img
                src={`${imageAPIBaseURL}${row.attachments[0].file}`}
                alt={row.name}
                className="w-full h-full object-cover rounded"
              />
              <div
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer rounded"
                onClick={() => handleImageClick(row.attachments)}
              >
                <EyeIcon className="w-6 h-6 text-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
              No Image
            </div>
          )}
        </div>
      ),
      ({ row }) => <div className="text-sm font-semibold"
        onClick={() => navigate(`${row.name}/${row.id}/transfer`)}
      >{row.name}</div>,
      ({ row }) => <div className="text-sm">{row.upc}</div>,
      ({ row }) => <div className="text-sm">{row?.category_name || "N/A"}</div>,
      ({ row }) => <div className="text-sm">{row.total_quantity}</div>,
      ({ row }) => <div className="text-sm">{row.available_quantity}</div>,
      ({ row }) => (
        <div className="flex items-center space-x-2">
          <button
            data-btnbelowtooltip="Go to Transfers"
            onClick={handleTransferClick}
            className="p-2 text-primary hover:text-primary_light transition-colors duration-200 cursor-pointer"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    ];

    if (!warehouseId) {
      baseCells.push(({ row }) => (
        <div className="text-sm">
          {row.warehouse_ids && row.warehouse_ids.length > 0
            ? row.warehouse_ids.join(", ")
            : "N/A"}
        </div>
      ));
      baseCells.push(({ row }) => (
        <div className="text-sm">
          {row.warehouse_names && row.warehouse_names.length > 0
            ? row.warehouse_names.join(", ")
            : "N/A"}
        </div>
      ));
    }

    return baseCells;
  }, [warehouseId, imageAPIBaseURL, navigate, handleImageClick, handleTransferClick]);

  return (
    <>
      {reportsEnabled && (
        <InventoryFilter
          title="Inventory"
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            // Clear sorting when filters change to avoid confusion
            setSortConfig({ key: null, direction: 'asc' });
            setRefreshToggle(prev => !prev);
          }}
          showPrintOption={true}
          onPrintClick={handlePrintReport}
          printing={printing}
        />
      )}
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={Inventory}
        cells={cells}
        heading="Inventory List"
        description="Create and manage your Inventory here."
        createBtn={true}
        onCreateClick={handleCreateInventory}
        actionIcons={true}
        apiEndpoint="/common/api/InventorySimple/"
        extraParams={{
          ...(warehouseId ? { warehouse_id: warehouseId } : {}),
          list: true,
          ...filters,
          ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
        }}
        itemsPerPage={10}
        renderData={renderInventory}
        hideDeleteBtn={isManager}
        onLoadingChange={setDataLoading}
        EditClick={(Inventory) => handleEditInventory(Inventory)}
        DeleteClick={handleDeleteClick}
        refresh={refreshToggle}
        onSortChange={handleSortChange}
        pageId={warehouseId ? getPageId('inventory', { warehouse: warehouseId }) : PAGE_IDS.INVENTORY_LIST}
      />
      {popupName === "Create Inventory" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <InventoryFormPopup
            onClose={() => setPopup(false)}
            onSubmit={handleInventorySubmit}
            isSubmitting={loading}
          />
        </PopupComponent>
      )}
      {popupName === "Edit Inventory" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <InventoryFormPopup
            inventoryDetails={inventoryDetails}
            onSubmit={handleEditInventorySubmit}
            onClose={() => setPopup(false)}
            isSubmitting={loading}
          />
        </PopupComponent>
      )}
      {showCarousel && (
        <PopupComponent popup={showCarousel} setPopup={setShowCarousel} loading={false}>
          <ImageCarousel attachments={carouselAttachments}/>
        </PopupComponent>
      )}
      {/* Delete confirmation */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setInventoryToDelete(null);
        }}
        onConfirm={() => handleDeleteInventory(inventoryToDelete)}
        itemName={Inventory.find((i) => i.id === inventoryToDelete)?.name || ""}
        itemType="Inventory Item"
      />
    </>
  );
}

export default InventoryListPage;
