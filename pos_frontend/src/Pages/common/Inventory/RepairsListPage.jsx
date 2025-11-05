import React, { useState, useMemo } from "react";
import TableComponent from "../../../Components/Common/TableComponent";
import api from "../../../utils/api";
import toast from "react-hot-toast";
import RepairsFilter from "../../../Components/filters/RepairsFilter";
import { useSelector } from 'react-redux';
import PopupComponent from "../../../Components/popups/PopupComponent";
import RepairFormPopup from "../../../Components/popups/RepairFormPopup";
import { EyeIcon } from "@heroicons/react/24/outline";
import useReportsToggle from "../../../utils/useReportsToggle";
function RepairsListPage() {
  const user = useSelector((state) => state.user.user);
  const isManager = user?.role === "Manager";
  const isWarehouseManager = user?.role === "Warehouse Manager";
  const [repairItems, setRepairItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [filters, setFilters] = useState({});
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [repairDetails, setRepairDetails] = useState(null);
  const [vendorDetails, setVendorDetails] = useState(null);
  const { reportsEnabled } = useReportsToggle();

  const renderRepairItems = (itemsData) => {
    setRepairItems(itemsData); // Update repair items data with the fetched data
  };

  const handleDeleteRepair = async (repair) => {
    try {
      setRefreshToggle(false);
      await api.delete(`/common/api/repairs/${repair}/`);
      toast.success('Repair item deleted!');
      setRefreshToggle(true);
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(error.response?.data?.detail || "Failed to delete repair item");
    }
  };

  const handleCreatePepair = () => {
    setPopupName("Create Repair");
    setPopup(true);
  };

  const handleCreateRepairs = async (repairData) => {
    try {
      setLoading(true);
      setRefreshToggle(false);
      const response = await api.post("/common/api/repairs/", repairData)
      toast.success("Repair Ticket created successfully!")
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
        toast.error(error.message || "Failed to create Repair Ticket");
      }
    } finally {
      setLoading(false);
    }
  };


  const handleEditSubmit = async (repairData) => {
    try {
      setRefreshToggle(false);
      setLoading(true);
      const response = await api.put(`/common/api/repairs/${repairData.id}/`, repairData)
      toast.success("Repair Ticket updated successfully!")
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
        toast.error(error.message || "Failed to create  Repair Ticket");
      }
    } finally {
      setLoading(false);
    }
  };


  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleEditRepairs = (Inventory) => {
    setRepairDetails(Inventory);
    setPopupName("Edit Repair");
    setPopup(true);
  };

  const handleViewVendorDetails = async (vendorId) => {
    try {
      setLoading(true);
      const response = await api.get(`/common/api/vendors/${vendorId}/`);
      setVendorDetails(response.data);
      setPopupName("View Vendor");
      setPopup(true);
    } catch (error) {
      console.error("Error fetching vendor details:", error);
      toast.error("Failed to fetch vendor details");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = async (currentFilters = filters) => {
    try {
      setPrinting(true);

      // Prepare params with all=true
      const params = { ...currentFilters, all: true };
      Object.keys(params).forEach((k) => {
        if (params[k] === "" || params[k] === null) delete params[k];
      });

      const allRepairs = await api.get("/common/api/repairs/", { params }).then(res => res.data);

      if (!allRepairs || allRepairs.length === 0) {
        toast.error("No repairs found for the selected filters");
        return;
      }

      const repairSections = allRepairs.map((rep) => {
        const itemsCount = rep.inventory_items_details?.length || 0;

        // Generate items table if there are items
        let itemsTable = '';
        if (rep.inventory_items_details && rep.inventory_items_details.length > 0) {
          const itemRows = rep.inventory_items_details.map((item) => {
            const attributes = item.attributes || {};
            const serialNumber = attributes.serial_number || 'N/A';
            const macAddress = attributes.mac_address || 'N/A';
            const ipAddress = attributes.ip_address || 'N/A';
            const serviceTag = attributes.service_tag || 'N/A';
            const serviceNumber = attributes.service_number || 'N/A';

            return `<tr>
              <td>${item.inventory_name}</td>
              <td>${item.inventory_upc}</td>
              <td>$${item.inventory_unit_price}</td>
              <td>${item.warehouse_name}</td>
              <td>${serialNumber}</td>
              <td>${macAddress}</td>
              <td>${ipAddress}</td>
              <td>${serviceTag}</td>
              <td>${serviceNumber}</td>
            </tr>`;
          }).join('\n');

          itemsTable = `
            <div class="items-section">
              <h3 class="items-title">Items in Repair (${itemsCount})</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>UPC</th>
                    <th>Unit Price</th>
                    <th>Warehouse</th>
                    <th>Serial Number</th>
                    <th>MAC Address</th>
                    <th>IP Address</th>
                    <th>Service Tag</th>
                    <th>Service Number</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </div>
          `;
        } else {
          itemsTable = `
            <div class="items-section">
              <h3 class="items-title">Items in Repair (0)</h3>
              <p class="no-items">No items assigned to this repair ticket.</p>
            </div>
          `;
        }

        return `
          <div class="repair-section">
            <div class="repair-header">
              <h2 class="repair-id">Repair Ticket #${rep.id}</h2>
              <div class="repair-meta">
                <span class="status-badge ${rep.status.toLowerCase()}">${rep.status}</span>
                <span class="created-date">Created: ${formatDateTime(rep.created_at)}</span>
              </div>
            </div>
            <div class="repair-details">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Vendor:</span>
                  <span class="detail-value">${rep.vendor_details?.name || "N/A"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Tracking Number:</span>
                  <span class="detail-value">${rep.information?.tracking_number || "N/A"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Reference Number:</span>
                  <span class="detail-value">${rep.information?.reference_number || "N/A"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Created By:</span>
                  <span class="detail-value">${rep.created_by?.username || "N/A"}</span>
                </div>
                <div class="detail-item full-width">
                  <span class="detail-label">Notes:</span>
                  <span class="detail-value">${rep.information?.notes || "No notes"}</span>
                </div>
              </div>
            </div>
            ${itemsTable}
          </div>
        `;
      }).join('\n');

      // Generate printable HTML
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;

      doc.open();
      const htmlContent = `<!DOCTYPE html>
<html><head><meta charset='utf-8'><title>Repairs Report</title>
<style>
body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:20px;background:#f9fafb;color:#1f2937;line-height:1.6;}
.container{max-width:1200px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1);padding:30px;border:1px solid #e5e7eb;}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0060AC;padding-bottom:20px;margin-bottom:30px;}
.header img{max-width:130px;height:auto;}
.company-info{text-align:right;}
.company-info h2{font-size:24px;font-weight:700;margin:0;color:#1f2937;}
.company-info p{font-size:14px;color:#6b7280;margin:5px 0;}
.report-title{font-size:32px;font-weight:800;color:#0060AC;margin:0 0 20px 0;text-transform:uppercase;text-align:center;}
.repair-section{margin-bottom:40px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;}
.repair-header{background:#f8fafc;padding:20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;}
.repair-id{font-size:20px;font-weight:700;color:#1f2937;margin:0;}
.repair-meta{display:flex;gap:15px;align-items:center;}
.status-badge{padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;}
.status-badge.pending{background:#fef3c7;color:#92400e;}
.status-badge.completed{background:#d1fae5;color:#065f46;}
.created-date{font-size:14px;color:#6b7280;}
.repair-details{padding:20px;}
.detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:15px;}
.detail-item{display:flex;flex-direction:column;gap:5px;}
.detail-item.full-width{grid-column:1/-1;}
.detail-label{font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;}
.detail-value{font-size:14px;color:#1f2937;font-weight:500;}
.items-section{padding:20px;background:#f9fafb;}
.items-title{font-size:16px;font-weight:600;color:#1f2937;margin:0 0 15px 0;}
.items-table{width:100%;border-collapse:collapse;font-size:12px;}
.items-table th,.items-table td{padding:8px 10px;text-align:left;border-bottom:1px solid #e5e7eb;}
.items-table th{background:#0060AC;color:#fff;font-weight:600;font-size:11px;}
.items-table td{background:#fff;}
.no-items{color:#6b7280;font-style:italic;text-align:center;padding:20px;}
@media print{
  body{padding:0;background:#fff;}
  .container{box-shadow:none;border:none;max-width:none;}
  .repair-section{page-break-inside:avoid;margin-bottom:30px;}
  .items-table{font-size:10px;}
  .items-table th,.items-table td{padding:6px 8px;}
}
</style></head><body><div class='container'>
<div class='header'><img src='/assets/images/logo.png' alt='Logo'/><div class='company-info'><h2>T Technologies INC</h2><p>720 Cotton Farm Rd, Pinetops, NC 27864</p><p>Phone: 252-827-1002</p></div></div>
<h1 class='report-title'>Detailed Repairs Report</h1>
${repairSections}
</div></body></html>`;
      doc.write(htmlContent);
      doc.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          document.body.removeChild(iframe);
        }, 300);
      };
    } catch (error) {
      console.error("Print repairs error:", error);
      toast.error(error.message || "Failed to generate repairs report");
    } finally {
      setPrinting(false);
    }
  };

  const columns = useMemo(() => [
    { name: "Repair ID", key: "id" },
    { name: "Vendor", key: "vendor_details.name" },
    { name: "Status", key: "status" },
    { name: "Tracking Number", key: "information.tracking_number" },
    { name: "Items", key: "inventory_items_details" },
    { name: "Created By", key: "created_by" },
    { name: "Created At", key: "created_at" },
    { name: "Actions", key: "actions" },
  ], []);



  const cells = useMemo(() => [
    ({ row }) => <div className="text-sm font-semibold">#{row.id}</div>,
    ({ row }) => (
      <div className="text-sm flex items-center gap-2">
        <span>{row.vendor_details?.name || "N/A"}</span>
        {row.vendor_details?.id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewVendorDetails(row.vendor_details.id);
            }}
            className="text-gray-600 hover:text-primary"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm">
        <span className={`px-2 py-1 rounded-full text-xs ${row.status === "PENDING" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
          }`}>
          {row.status}
        </span>
      </div>
    ),
    ({ row }) => <div className="text-sm">{row.information?.tracking_number || "N/A"}</div>,
    ({ row }) => (
      <div className="text-sm">
        {row.inventory_items_details?.length ? (
          <div>
            <span>{row.inventory_items_details.length} item(s)</span>
          </div>
        ) : (
          "No items"
        )}
      </div>
    ),
    ({ row }) => <div className="text-sm">{row.created_by?.username}</div>,
    ({ row }) => <div className="text-sm">{formatDateTime(row.created_at)}</div>,
  ], []);

  return (
    <>
      {reportsEnabled && (
        <RepairsFilter
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setRefreshToggle(prev => !prev);
          }}
          onPrint={handlePrintReport}
          printing={printing}
        />
      )}
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={repairItems}
        cells={cells}
        createBtn={true}
        heading="Repairs List"
        description="View and manage inventory items in repair."
        actionIcons={true}
        apiEndpoint="/common/api/repairs/"
        extraParams={filters}
        itemsPerPage={10}
        renderData={renderRepairItems}
        hideDeleteBtn={isManager || isWarehouseManager}
        onLoadingChange={setDataLoading}
        onCreateClick={handleCreatePepair}
        EditClick={(repair) => handleEditRepairs(repair)}
        DeleteClick={(repair) => handleDeleteRepair(repair)}
        refresh={refreshToggle}
      />
      {popupName === "Create Repair" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <RepairFormPopup
            onClose={() => setPopup(false)}
            onSubmit={handleCreateRepairs}
            repair={null}
            submitting={loading}
          />
        </PopupComponent>
      )}
      {popupName === "Edit Repair" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <RepairFormPopup
            onClose={() => setPopup(false)}
            onSubmit={handleEditSubmit}
            repair={repairDetails}
            submitting={loading}
          />
        </PopupComponent>
      )}
      {popupName === "View Vendor" && vendorDetails && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-semibold">Vendor Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ["Name", vendorDetails.name],
                ["Email", vendorDetails.email],
                ["Phone", vendorDetails.phone],
                ["Address", vendorDetails.address],
                ["City", vendorDetails.city],
                ["Zip Code", vendorDetails.zip_code],
                ["Description", vendorDetails.description],
              ].map(([label, value]) => (
                <div key={label} className="space-y-1">
                  <span className="text-gray-600 font-medium">{label}</span>
                  <p className="text-gray-900">{value || "N/A"}</p>
                </div>
              ))}
            </div>
          </div>
        </PopupComponent>
      )}
    </>
  );
}

export default RepairsListPage;