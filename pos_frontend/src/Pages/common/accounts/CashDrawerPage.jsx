import React, { useState, useEffect, useMemo } from "react";
import { FiDollarSign, FiInbox } from "react-icons/fi";
import api from "../../../utils/api";
import toast from "react-hot-toast";
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import CashDrawerTable from "../../../Components/accounts/cashdrawer/CashDrawerTable";
import CashDrawerFilter from "../../../Components/accounts/cashdrawer/CashDrawerFilter";
import OpenCashDrawerPopup from "../../../Components/accounts/cashdrawer/OpenCashDrawerPopup";
import AddEntryPopup from "../../../Components/accounts/cashdrawer/AddEntryPopup";
import ConfirmationPopup from "../../../Components/Common/ConfirmationPopup";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import Spinner from "../../../Components/Common/Spinner";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";

function CashDrawerPage() {
  const user = useSelector((state) => state.user.user);
  const navigate = useNavigate();
  const [cashDrawers, setCashDrawers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [popup, setPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(null);
  const [checkingOpenDrawer, setCheckingOpenDrawer] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [cashDrawerToClose, setCashDrawerToClose] = useState(null);
  const [filters, setFilters] = useState({});
  const [printing, setPrinting] = useState(false);

  const canAccess = useMemo(() => {
    if (!user) return false;
    if (user.is_superuser || user.role === "Admin") return true;
    return Array.isArray(user.permissions) && user.permissions.includes(2);
  }, [user]);

  // Check for open cash drawer on component mount
  useEffect(() => {
    if (!canAccess) {
      toast.error("You are not authorized to view Cash Drawer");
      navigate(-1);
      return;
    }
    checkOpenDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  const checkOpenDrawer = async () => {
    try {
      setCheckingOpenDrawer(true);
      const response = await api.get("/common/api/cash-drawers/check-open/");
      setOpenDrawer(response.data.has_open_drawer ? response.data.cash_drawer : null);
    } catch (error) {
      console.error("Error checking open drawer:", error);
    } finally {
      setCheckingOpenDrawer(false);
    }
  };

  const renderCashDrawers = (cashDrawerData) => {
    setCashDrawers(cashDrawerData);
  };

  const handleFilterChange = (newFilters) => {
    // Only update filters state, don't trigger refresh automatically
    setFilters(newFilters);
  };

  const handleSearch = () => {
    // Trigger refresh only when search button is pressed
    setRefreshToggle(prev => !prev);
  };

  const handleReset = () => {
    // Clear filters and refresh data
    setFilters({});
    setRefreshToggle(prev => !prev);
  };

  const handlePrintReport = async (currentFilters = filters) => {
    try {
      setPrinting(true);

      // Prepare params with all=true to get all cash drawers
      const params = { ...currentFilters, all: true };
      
      // Remove empty string values to avoid unnecessary query params
      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] === null) {
          delete params[key];
        }
      });

      const { data: allCashDrawers } = await api.get("/common/api/cash-drawers/", { params });

      if (!allCashDrawers || allCashDrawers.length === 0) {
        toast.error("No cash drawers found for the selected filters");
        return;
      }

      // Calculate totals
      let totalOpeningAmount = 0;
      let totalCurrentAmount = 0;
      let totalEntries = 0;

      // Generate detailed entries for each cash drawer
      let entriesSection = '';
      allCashDrawers.forEach((drawer) => {
        if (drawer.entries && drawer.entries.length > 0) {
          const openingAmount = parseFloat(drawer.opening_amount || 0);
          const currentAmount = parseFloat(drawer.current_amount || 0);
          const entriesCount = drawer.entries.length;
          
          totalOpeningAmount += openingAmount;
          totalCurrentAmount += currentAmount;
          totalEntries += entriesCount;

          entriesSection += `
            <div class="drawer-entries" style="margin-top: 30px; page-break-inside: avoid;">
              <h3 style="color: #333; border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 15px;">
                Cash Drawer #${drawer.id} - ${drawer.user?.username || 'N/A'} (${drawer.status})
              </h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold;">Entry ID</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold;">Type</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold;">Amount</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold;">Description</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold;">Created By</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2; font-weight: bold;">Date</th>
                  </tr>
                </thead>
                <tbody>`;

          // Sort entries by created_at in descending order (newest first)
          const sortedEntries = drawer.entries.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );

          sortedEntries.forEach((entry) => {
            const amount = parseFloat(entry.amount || 0);
            const createdBy = entry.created_by?.username || 'System';
            const entryDate = new Date(entry.created_at).toLocaleString();
            
            // Color code different entry types
            let rowStyle = '';
            if (entry.entry_type === 'sale') {
              rowStyle = 'background-color: #e8f5e8;'; // Light green for sales
            } else if (entry.entry_type === 'refund') {
              rowStyle = 'background-color: #ffe8e8;'; // Light red for refunds
            } else if (entry.entry_type === 'opening') {
              rowStyle = 'background-color: #e8f0ff;'; // Light blue for opening
            } else if (entry.entry_type === 'closing') {
              rowStyle = 'background-color: #fff8e8;'; // Light yellow for closing
            }

            entriesSection += `
              <tr style="${rowStyle}">
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">#${entry.id}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; text-transform: capitalize;">${entry.entry_type}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">$${amount.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${entry.description}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${createdBy}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${entryDate}</td>
              </tr>`;
          });

          entriesSection += `
                </tbody>
              </table>
            </div>`;
        }
      });

      // Generate printable content in hidden iframe
      const printIframe = document.createElement("iframe");
      printIframe.style.position = "fixed";
      printIframe.style.right = "0";
      printIframe.style.bottom = "0";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "0";
      document.body.appendChild(printIframe);

      const doc = printIframe.contentDocument || printIframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cash Drawer Entries Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
            .summary h3 { margin-top: 0; color: #333; }
            .summary p { margin: 5px 0; }
            .drawer-entries { margin-top: 30px; page-break-inside: avoid; }
            .drawer-entries h3 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .drawer-entries { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Cash Drawer Entries Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Cash Drawers: ${allCashDrawers.length}</p>
          </div>
          
          <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total Opening Amount:</strong> $${totalOpeningAmount.toFixed(2)}</p>
            <p><strong>Total Current Amount:</strong> $${totalCurrentAmount.toFixed(2)}</p>
            <p><strong>Total Entries:</strong> ${totalEntries}</p>
          </div>

          <h2 style="color: #333; margin-top: 30px; border-bottom: 2px solid #ddd; padding-bottom: 5px;">Cash Drawer Entries</h2>
          ${entriesSection}
        </body>
        </html>
      `);
      doc.close();

      printIframe.onload = () => {
        setTimeout(() => {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
          document.body.removeChild(printIframe);
        }, 300);
      };
    } catch (error) {
      console.error("Error generating cash drawer report:", error);
      toast.error(error.response?.data?.detail || "Failed to generate cash drawer report");
    } finally {
      setPrinting(false);
    }
  };

  const handleOpenCashDrawer = () => {
    setPopup(true);
  };

  const handleOpenCashDrawerSubmit = async (notes, openingAmount) => {
    try {
      setLoading(true);
      const response = await api.post("/common/api/cash-drawers/", {
        opening_amount: openingAmount,
        notes: notes || "Cash drawer opened"
      });
      toast.success("Cash drawer opened successfully!");
      setRefreshToggle(true);
      setPopup(false);
      // Update open drawer state
      await checkOpenDrawer();
      return response;
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;
        if (typeof data === 'object') {
          Object.entries(data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`));
            } else {
              toast.error(`${field}: ${messages}`);
            }
          });
        } else {
          toast.error(data);
        }
      } else {
        toast.error(error.message || "Failed to open cash drawer");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDrawer = async (cashDrawer) => {
    setCashDrawerToClose(cashDrawer);
    setShowCloseConfirmation(true);
  };

  const confirmCloseDrawer = async () => {
    try {
      setLoading(true);
      await api.post(`/common/api/cash-drawers/${cashDrawerToClose.id}/close/`);
      toast.success("Cash drawer closed successfully!");
      setRefreshToggle(true);
      // Update open drawer state
      await checkOpenDrawer();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to close cash drawer");
    } finally {
      setLoading(false);
      setShowCloseConfirmation(false);
      setCashDrawerToClose(null);
    }
  };

  const handleAddEntry = () => {
    setShowAddEntry(true);
  };

  const handleAddEntrySubmit = async (entryForm) => {
    if (!entryForm.get('amount') || !entryForm.get('description')) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      await api.post(`/common/api/cash-drawers/${openDrawer.id}/add-entry/`, entryForm, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success("Entry added successfully!");
      setShowAddEntry(false);
      // Refresh open drawer data
      await checkOpenDrawer();
      setRefreshToggle(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add entry");
    } finally {
      setLoading(false);
    }
  };

  if (checkingOpenDrawer) {
    return (
      <Spinner />
    );
  }

  return (
    <div>
      {/* Open Cash Drawer Status */}
      {openDrawer && (
        <div className="mb-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start lg:items-center justify-between flex-col lg:flex-row gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cash Drawer is Open</h3>
                <p className="text-gray-500">
                  Current Amount: ${parseFloat(openDrawer.current_amount).toFixed(2)} |
                  Opened: {new Date(openDrawer.opened_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex space-x-2 flex-wrap items-start lg:items-center justify-start lg:justify-end">
              <PrimaryBtn onClick={handleAddEntry}>Add Entry</PrimaryBtn>
              <SecondaryBtn onClick={() => handleCloseDrawer(openDrawer)} disabled={loading}>
                Close Drawer
              </SecondaryBtn>
            </div>
          </div>
        </div>
      )}

      {/* No Open Cash Drawer */}
      {!openDrawer && (
        <div className="mb-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start lg:items-center justify-between flex-col lg:flex-row gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <FiInbox className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No Cash Drawer Open</h3>
                <p className="text-gray-500">Create a new cash drawer to start tracking transactions</p>
              </div>
            </div>
            <PrimaryBtn onClick={handleOpenCashDrawer}>Open Cash Drawer</PrimaryBtn>
          </div>
        </div>
      )}

      {/* Cash Drawer Filter */}
      <CashDrawerFilter
        filters={filters}
        setFilters={setFilters}
        onFilterChange={handleSearch}
        onReset={handleReset}
        onPrintClick={handlePrintReport}
        printing={printing}
      />

      {/* Cash Drawer History Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Cash Drawer History</h2>
              <p className="text-sm text-gray-500">View all cash drawer operations and entries</p>
            </div>
          </div>
        </div>

        <CashDrawerTable
          dataloading={dataLoading}
          data={cashDrawers}
          apiEndpoint="/common/api/cash-drawers/"
          extraParams={filters}
          itemsPerPage={10}
          renderData={renderCashDrawers}
          onLoadingChange={setDataLoading}
          refresh={refreshToggle}
          onCloseDrawer={handleCloseDrawer}
        />
      </div>

      {/* Open Cash Drawer Popup */}
      <OpenCashDrawerPopup
        popup={popup}
        setPopup={setPopup}
        loading={loading}
        onSubmit={handleOpenCashDrawerSubmit}
      />

      {/* Add Entry Popup */}
      <AddEntryPopup
        popup={showAddEntry}
        setPopup={setShowAddEntry}
        loading={loading}
        onSubmit={handleAddEntrySubmit}
      />

      {/* Close Cash Drawer Confirmation */}
      {showCloseConfirmation && (
        <ConfirmationPopup
          message={`Are you sure you want to close this cash drawer? Current amount: $${parseFloat(cashDrawerToClose?.current_amount || 0).toFixed(2)}`}
          onConfirm={confirmCloseDrawer}
          onCancel={() => {
            setShowCloseConfirmation(false);
            setCashDrawerToClose(null);
          }}
        />
      )}
    </div>
  );
}

export default CashDrawerPage;
