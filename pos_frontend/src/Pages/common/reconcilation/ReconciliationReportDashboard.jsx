import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../../../utils/api";
import toast from "react-hot-toast";
import Select from "react-select";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";
import Spinner from "../../../Components/Common/Spinner";
import Pagination from "../../../Components/Common/Pagination";

const ReconciliationReportDashboard = () => {
  const user = useSelector((state) => state.user.user);
  const navigate = useNavigate();
  const [selectedReconciliation, setSelectedReconciliation] = useState(null);
  const [actions, setActions] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");
  const [refreshPagination, setRefreshPagination] = useState(0);
  const detailsRef = useRef(null);

  // Ensures react-select menus render above modals/tables and are not clipped
  const selectStyles = {
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };


  const handleActionChange = (upc, action) => {
    setActions((prev) => ({ ...prev, [upc]: action }));
  };

  const handleApprove = async () => {
    if (!selectedReconciliation) {
      toast.error("No reconciliation selected.");
      return;
    }

    const unhandledDiscrepancies = selectedReconciliation.report.items.filter(item => {
      if (item.discrepancy_type === "MATCH") return false;
      return !actions[item.upc] || actions[item.upc] === "NONE";
    });

    if (unhandledDiscrepancies.length > 0) {
      toast.error("Please select actions for all discrepancies before approving.");
      return;
    }

    try {
      setLoading(true);
      await api.post(`/common/api/reconciliations/${selectedReconciliation.id}/approve/`, {
        actions: actions,
      });
      toast.success("Reconciliation approved successfully.");
      setRefreshPagination(prev => prev + 1);
      setSelectedReconciliation(null);
      setActions({});
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve reconciliation.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReconciliation) {
      toast.error("No reconciliation selected.");
      return;
    }

    try {
      setLoading(true);
      await api.patch(`/common/api/reconciliations/${selectedReconciliation.id}/`, {
        status: "REJECTED"
      });
      toast.success("Reconciliation rejected successfully.");
      setRefreshPagination(prev => prev + 1);
      setSelectedReconciliation(null);
      setActions({});
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reject reconciliation.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate("create");
  };

  const handlePrint = () => {
    if (!selectedReconciliation) {
      toast.error("No reconciliation selected.");
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const stats = getReconciliationStats(selectedReconciliation.report?.items);

    // Add print-specific styles
    const printStyles = `
      <style>
        @media print {
          body { font-family: Arial, sans-serif; }
          .print-header { margin-bottom: 20px; }
          .print-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .print-info { margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f8f9fa; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
          .stats-item { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
          .page-break { page-break-before: always; }
          .no-print { display: none; }
          .status-badge { 
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
          }
          .status-approved { background-color: #d1fae5; color: #065f46; }
          .status-submitted { background-color: #dbeafe; color: #1e40af; }
          .status-rejected { background-color: #fee2e2; color: #991b1b; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
        }
      </style>
    `;

    // Create the print content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reconciliation Report #${selectedReconciliation.id}</title>
          ${printStyles}
        </head>
        <body>
          <div class="print-header">
            <div class="print-title">Reconciliation Report #${selectedReconciliation.id}</div>
            <div class="print-info">Warehouse: ${selectedReconciliation.warehouse_name || 'Unknown Warehouse'}</div>
            <div class="print-info">Status: <span class="status-badge status-${selectedReconciliation.status.toLowerCase()}">${selectedReconciliation.status}</span></div>
            <div class="print-info">Created by: ${selectedReconciliation.created_by_name || 'Unknown'}</div>
            <div class="print-info">Created at: ${formatDate(selectedReconciliation.created_at)}</div>
            ${selectedReconciliation.submitted_at ? `<div class="print-info">Submitted at: ${formatDate(selectedReconciliation.submitted_at)}</div>` : ''}
            ${selectedReconciliation.approved_at ? `<div class="print-info">Approved at: ${formatDate(selectedReconciliation.approved_at)}</div>` : ''}
          </div>

          <div class="stats-grid">
            <div class="stats-item">
              <strong>Total Items:</strong> ${stats.total}
            </div>
            <div class="stats-item">
              <strong>Matched Items:</strong> ${stats.matched}
            </div>
            <div class="stats-item">
              <strong>Extra Items:</strong> ${stats.extra}
            </div>
            <div class="stats-item">
              <strong>Missing Items:</strong> ${stats.missing}
            </div>
          </div>

          <h3>Available Items in Database</h3>
          <table>
            <thead>
              <tr>
                <th>UPC</th>
                <th>Name</th>
                <th>Quantity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${selectedReconciliation.report.items
                .filter(item => {
                  const availableAttributes = item.attributes.filter(attr =>
                    attr.status === "available" && !attr.is_missing && !attr.is_extra
                  );
                  return availableAttributes.length > 0;
                })
                .map(item => {
                  const availableAttributes = item.attributes.filter(attr =>
                    attr.status === "available" && !attr.is_missing && !attr.is_extra
                  );
                  return `
                    <tr>
                      <td>${item.upc}</td>
                      <td>${item.name}</td>
                      <td>${availableAttributes.length}</td>
                      <td>${availableAttributes.map(attr => `
                        Item ID: ${attr.id || "New"}
                        ${attr.attributes ? Object.entries(attr.attributes).map(([key, value]) => `
                          <br/>${key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}: ${value}
                        `).join('') : 'No attributes'}
                      `).join('<br/><br/>')}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
          </table>

          ${selectedReconciliation.report.items.some(item => item.discrepancy_type === "EXTRA") ? `
            <div class="page-break"></div>
            <h3>Extra Items</h3>
            <table>
              <thead>
                <tr>
                  <th>UPC</th>
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${selectedReconciliation.report.items
                  .filter(item => item.discrepancy_type === "EXTRA")
                  .map(item => {
                    const extraCount = item.actual_quantity - item.expected_quantity;
                    const extraAttributes = item.attributes.filter(attr => attr.is_extra);
                    return `
                      <tr>
                        <td>${item.upc}</td>
                        <td>${item.name}</td>
                        <td>+${extraCount}</td>
                        <td>${extraAttributes.map(attr => `
                          Item ID: ${attr.id || "New"}
                          ${attr.attributes ? Object.entries(attr.attributes).map(([key, value]) => `
                            <br/>${key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}: ${value}
                          `).join('') : 'No attributes'}
                        `).join('<br/><br/>')}</td>
                      </tr>
                    `;
                  }).join('')}
              </tbody>
            </table>
          ` : ''}

          ${selectedReconciliation.report.items.some(item => item.discrepancy_type === "MISSING") ? `
            <div class="page-break"></div>
            <h3>Missing Items</h3>
            <table>
              <thead>
                <tr>
                  <th>UPC</th>
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${selectedReconciliation.report.items
                  .filter(item => item.discrepancy_type === "MISSING")
                  .map(item => {
                    const missingCount = item.expected_quantity - item.actual_quantity;
                    const missingAttributes = item.attributes.filter(attr => attr.is_missing);
                    return `
                      <tr>
                        <td>${item.upc}</td>
                        <td>${item.name}</td>
                        <td>-${missingCount}</td>
                        <td>${missingAttributes.map(attr => `
                          Item ID: ${attr.id || "New"}
                          ${attr.attributes ? Object.entries(attr.attributes).map(([key, value]) => `
                            <br/>${key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}: ${value}
                          `).join('') : 'No attributes'}
                        `).join('<br/><br/>')}</td>
                      </tr>
                    `;
                  }).join('')}
              </tbody>
            </table>
          ` : ''}
        </body>
      </html>
    `;

    // Write the content to the new window and print
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = function() {
      printWindow.print();
      printWindow.onafterprint = function() {
        printWindow.close();
      };
    };
  };

  const handleSearch = () => {
    setRefreshPagination(prev => prev + 1);
  };

  const handleStatusFilterChange = (option) => {
    setStatusFilter(option.value);
    setRefreshPagination(prev => prev + 1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "text-yellow-600";
      case "SUBMITTED":
        return "text-primary";
      case "APPROVED":
        return "text-green-600";
      case "REJECTED":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : 'N/A';
  };

  const getReconciliationStats = (items) => {
    if (!items || !Array.isArray(items)) return { total: 0, matched: 0, extra: 0, missing: 0 };

    return items.reduce((stats, item) => {
      stats.total++;
      switch (item.discrepancy_type) {
        case "MATCH":
          stats.matched++;
          break;
        case "EXTRA":
          stats.extra++;
          break;
        case "MISSING":
          stats.missing++;
          break;
      }
      return stats;
    }, { total: 0, matched: 0, extra: 0, missing: 0 });
  };

  const renderAttributes = (attributes) => {
    if (!attributes || !Array.isArray(attributes)) return null;

    return (
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {attributes.map((attr, idx) => (
          <div key={attr.id || idx} className="border border-gray-200 rounded p-2 bg-gray-50">
            <div className="font-medium text-sm mb-1">
              Item ID: {attr.id || "New"}
              {attr.status && (
                <span className={`ml-2 ${attr.status === "available" ? "text-green-600" : "text-gray-500"}`}>
                  ({attr.status})
                </span>
              )}
            </div>
            {attr.attributes && Object.keys(attr.attributes).length > 0 ? (
              <ul className="list-disc pl-4 text-sm">
                {Object.entries(attr.attributes).map(([key, value]) => (
                  <div key={key} className="text-sm text-gray-600">
                    <span className="font-medium">
                      {key
                        .replace(/_/g, ' ')
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}:
                    </span>{' '}
                    {value}
                  </div>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">No attributes</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderReconciliationList = (reconciliations) => {
    if (loading && reconciliations.length === 0) return <Spinner />;
    if (!reconciliations || reconciliations.length === 0) {
      return <p>No reconciliations found.</p>;
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reconciliations.map((reconciliation) => {
            const stats = getReconciliationStats(reconciliation.report?.items);
            return (
              <div
                key={reconciliation.id}
                className={`border border-gray-200 rounded-lg p-4 cursor-pointer transition-all ${selectedReconciliation?.id === reconciliation.id
                  ? "border border-blue-500 bg-blue-50"
                  : "hover:border border-gray-200"
                  }`}
                onClick={() => {
                  setSelectedReconciliation(reconciliation);
                  setActions({});
                  setTimeout(() => {
                    detailsRef.current?.scrollIntoView({ behavior: "smooth" });
                  }, 0);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">#{reconciliation.id} - {reconciliation.warehouse_name || 'Unknown Warehouse'}</h3>
                  <span className={`font-medium ${getStatusColor(reconciliation.status)}`}>
                    {reconciliation.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Created by: {reconciliation.created_by_name || 'Unknown'}</p>
                <p className="text-sm text-gray-600">Created: {formatDate(reconciliation.created_at)}</p>
                {reconciliation.submitted_at && (
                  <p className="text-sm text-gray-600">Submitted: {formatDate(reconciliation.submitted_at)}</p>
                )}
                {reconciliation.report && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-100 p-2 rounded">
                      <span className="font-medium">Total Items:</span>
                      <br />
                      {stats.total}
                    </div>
                    <div className="bg-green-100 p-2 rounded">
                      <span className="font-medium text-green-700">Matched:</span>
                      <br />
                      {stats.matched}
                    </div>
                    <div className="bg-blue-100 p-2 rounded">
                      <span className="font-medium text-blue-700">Extra:</span>
                      <br />
                      {stats.extra}
                    </div>
                    <div className="bg-red-100 p-2 rounded">
                      <span className="font-medium text-red-700">Missing:</span>
                      <br />
                      {stats.missing}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold">Warehouse Reconciliation Reports</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <div className="flex md:flex-1 flex-wrap gap-1 items-center">
            <Select
              menuPortalTarget={document.body}
              styles={selectStyles}
              options={[
                { value: "SUBMITTED", label: "Submitted" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
                { value: "ALL", label: "All" },
              ]}
              value={{ value: statusFilter, label: statusFilter }}
              onChange={handleStatusFilterChange}
              className="w-40"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by warehouse"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 md:w-64 border border-gray-200 rounded p-2"
              />
              <SecondaryBtn onClick={handleSearch} disabled={loading}>
                Search
              </SecondaryBtn>
            </div>
            <PrimaryBtn
              onClick={handleCreateNew}
            >
              Create Reconciliation
            </PrimaryBtn>
          </div>
        </div>
      </div>

      <Pagination
        apiEndpoint="/common/api/reconciliations/"
        itemsPerPage={10}
        renderData={renderReconciliationList}
        onLoadingChange={setLoading}
        extraParams={{
          status: statusFilter,
          warehouse: searchQuery,
          all: true,
        }}
        refresh={refreshPagination}
      />

      {selectedReconciliation && selectedReconciliation.report && (
        <div ref={detailsRef} className="mt-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-lg">
              Reconciliation Report for {selectedReconciliation.warehouse_name || 'Unknown Warehouse'}
            </h3>
            <SecondaryBtn onClick={handlePrint}>
              Print Report
            </SecondaryBtn>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-4">Available Items in Database</h4>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2">UPC</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Quantity</th>
                      <th className="p-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReconciliation.report.items.map((item) => {
                      const availableAttributes = item.attributes.filter(attr =>
                        attr.status === "available" && !attr.is_missing && !attr.is_extra
                      );

                      if (availableAttributes.length === 0) return null;

                      return (
                        <tr key={item.upc} className="border border-gray-200">
                          <td className="p-2">{item.upc}</td>
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">{availableAttributes.length}</td>
                          <td className="p-2">
                            {renderAttributes(availableAttributes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 h-[90%]">
              <h4 className="font-medium text-gray-800 mb-4">Discrepancies</h4>
              <div className="space-y-6 h-full">
                {selectedReconciliation.report.items.some(item => item.discrepancy_type === "EXTRA") && (
                  <div className="h-[50%]">
                    <h5 className="font-medium text-blue-600 mb-2">Extra Items</h5>
                    <div className="overflow-x-auto h-full">
                      <table className="w-full border border-gray-200">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="p-2">UPC</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Quantity</th>
                            <th className="p-2">Details</th>
                            <th className="p-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReconciliation.report.items
                            .filter(item => item.discrepancy_type === "EXTRA")
                            .map((item) => {
                              const extraCount = item.actual_quantity - item.expected_quantity;
                              const extraAttributes = item.attributes.filter(attr => attr.is_extra);

                              return (
                                <tr key={item.upc} className="border border-gray-200">
                                  <td className="p-2">{item.upc}</td>
                                  <td className="p-2">{item.name}</td>
                                  <td className="p-2 font-medium text-blue-600">+{extraCount}</td>
                                  <td className="p-2">
                                    {renderAttributes(extraAttributes)}
                                  </td>
                                  <td className="p-2">
                                    <Select
                                      menuPortalTarget={document.body}
                                      styles={selectStyles}
                                      options={[
                                        { value: "NONE", label: "Select Action" },
                                        { value: "ADD_TO_DB", label: "Add to Database" },
                                        { value: "MANUAL_ADJUST", label: "Manually Adjust" }
                                      ]}
                                      value={
                                        actions[item.upc]
                                          ? {
                                            value: actions[item.upc],
                                            label: actions[item.upc].replace(/_/g, " "),
                                          }
                                          : { value: "NONE", label: "Select Action" }
                                      }
                                      onChange={(option) => handleActionChange(item.upc, option.value)}
                                      isDisabled={selectedReconciliation.status !== "SUBMITTED"}
                                      className="min-w-[200px]"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedReconciliation.report.items.some(item => item.discrepancy_type === "MISSING") && (
                  <div className="h-[50%]">
                    <h5 className="font-medium text-red-600 mb-2">Missing Items</h5>
                    <div className="overflow-x-auto h-full">
                      <table className="w-full border border-gray-200">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="p-2">UPC</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Quantity</th>
                            <th className="p-2">Details</th>
                            <th className="p-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReconciliation.report.items
                            .filter(item => item.discrepancy_type === "MISSING")
                            .map((item) => {
                              const missingCount = item.expected_quantity - item.actual_quantity;
                              const missingAttributes = item.attributes.filter(attr => attr.is_missing);

                              return (
                                <tr key={item.upc} className="border border-gray-200">
                                  <td className="p-2">{item.upc}</td>
                                  <td className="p-2">{item.name}</td>
                                  <td className="p-2 font-medium text-red-600">-{missingCount}</td>
                                  <td className="p-2">
                                    {renderAttributes(missingAttributes)}
                                  </td>
                                  <td className="p-2">
                                    <Select
                                      menuPortalTarget={document.body}
                                      styles={selectStyles}
                                      options={[
                                        { value: "NONE", label: "Select Action" },
                                        { value: "REMOVE_FROM_DB", label: "Remove from Database" },
                                        { value: "MANUAL_ADJUST", label: "Manually Adjust" }
                                      ]}
                                      value={
                                        actions[item.upc]
                                          ? {
                                            value: actions[item.upc],
                                            label: actions[item.upc].replace(/_/g, " "),
                                          }
                                          : { value: "NONE", label: "Select Action" }
                                      }
                                      onChange={(option) => handleActionChange(item.upc, option.value)}
                                      isDisabled={!(user.role === "Admin" || user.role === "Manager") || selectedReconciliation.status !== "SUBMITTED"}
                                      className="min-w-[200px]"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(selectedReconciliation.status === "SUBMITTED" && (user.role === "Admin" || user.role === "Manager")) && (
            <div className="flex justify-end space-x-3 mt-4">
              <SecondaryBtn onClick={handleReject} disabled={loading}>
                Reject
              </SecondaryBtn>
              <PrimaryBtn onClick={handleApprove} disabled={loading}>
                Approve & Adjust Inventory
              </PrimaryBtn>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReconciliationReportDashboard;