import React, { useState, useMemo } from "react";
import { GoX, GoCheck, GoPlus, GoEye, GoDownload } from "react-icons/go";
import { Link, useNavigate } from "react-router-dom";
import TableComponent from "../../Components/Common/TableComponent";
import InvoicesFilter from "../../Components/filters/InvoicesFilter";
import { invoiceAPI } from "../../api/invoices";
import { toast } from "react-hot-toast";
import useReportsToggle from "../../utils/useReportsToggle";

function InvoicesTab() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [filters, setFilters] = useState({});
  const [printing, setPrinting] = useState(false);
  const { reportsEnabled } = useReportsToggle();
  const INVOICE_STATUSES = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];
  const [editStatuses, setEditStatuses] = useState({});

  const renderInvoices = (invoicesData) => {
    setInvoices(invoicesData);
  };

  const handleCreateInvoice = () => {
    // Navigate to create invoice page
    navigate('create');
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      await invoiceAPI.changeStatus(invoiceId, newStatus);
      toast.success(`Invoice status changed to ${newStatus}`);
      setRefreshToggle(prev => !prev);
    } catch (error) {
      console.error("Error changing status:", error);
      toast.error("Failed to change invoice status");
    }
  };

  const renderStatus = (status) => {
    const statusConfig = {
      DRAFT: { color: "text-gray-500", bg: "bg-gray-100", icon: null },
      PENDING: { color: "text-yellow-600", bg: "bg-yellow-100", icon: <GoX className="text-yellow-500" /> },
      PAID: { color: "text-green-600", bg: "bg-green-100", icon: <GoCheck className="text-green-500" /> },
      OVERDUE: { color: "text-red-600", bg: "bg-red-100", icon: <GoX className="text-red-500" /> },
      CANCELLED: { color: "text-gray-600", bg: "bg-gray-100", icon: <GoX className="text-gray-500" /> },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;

    return (
      <div className={`flex items-center space-x-2 px-2 py-1 rounded-full ${config.bg}`}>
        {config.icon}
        <span className={`text-xs font-semibold ${config.color}`}>{status}</span>
      </div>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const columns = useMemo(() => [
    { name: "Invoice Number", key: "invoice_number" },
    { name: "Customer", key: "customer" },
    { name: "Status", key: "status" },
    { name: "Subtotal", key: "subtotal" },
    { name: "Charges", key: "charges" },
    { name: "Total Amount", key: "total_amount" },
    { name: "Issue Date", key: "issue_date" },
    { name: "Due Date", key: "due_date" },
    { name: "Actions", key: "actions" },
  ], []);

  const handleEditStatusChange = (invoiceId, newStatus) => {
    setEditStatuses(prev => ({ ...prev, [invoiceId]: newStatus }));
  };

  const cells = useMemo(() => [
    ({ row }) => (
      <Link
        to={`${row.id}`}
        className="text-blue-600 hover:text-blue-900 cursor-pointer"
        title="View Details"
      >
        <div className="text-sm font-medium text-gray-900">
          {row.invoice_number}
        </div>
      </Link>
    ),
    ({ row }) => (
      <div className="text-sm text-gray-900">
        {row.store_name || row.customer_name}
      </div>
    ),
    ({ row }) => (
      <div className="flex flex-col gap-1">
        <div>{renderStatus(row.status)}</div>
        {row.status !== "PAID" && (

          <div className="flex items-center gap-2 mt-1">
            <select
              className="border rounded px-2 py-1 text-xs"
              value={editStatuses[row.id] !== undefined ? editStatuses[row.id] : row.status}
              onChange={e => handleEditStatusChange(row.id, e.target.value)}
            >
              {INVOICE_STATUSES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              className="text-xs bg-primary text-white px-2 py-1 rounded disabled:opacity-50 cursor-pointer"
              onClick={() => handleStatusChange(row.id, editStatuses[row.id])}
              disabled={editStatuses[row.id] === row.status || !editStatuses[row.id]}
            >
              Save
            </button>
          </div>
        )}

      </div>
    ),
    ({ row }) => (
      <div className="text-sm text-gray-900">
        {formatCurrency(row.subtotal)}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm text-gray-900">
        {formatCurrency(row.total_charges)}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm text-gray-900">
        {formatCurrency(row.total_amount)}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm text-gray-900">
        {formatDate(row.issue_date)}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm text-gray-900">
        {row.due_date ? formatDate(row.due_date) : '-'}
      </div>
    ),
    ({ row }) => (
      <div className="flex space-x-2">
        <Link
          to={`${row.id}`}
          className="text-primary hover:text-primary_light cursor-pointer"
          title="View Details"
        >
          <GoEye className="text-lg" />
        </Link>
      </div>
    ),
  ], [editStatuses, handleStatusChange]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setRefreshToggle(prev => !prev);
  };

  // Helper formatters already declared: formatCurrency, formatDate outside handlePrint; we will reuse

  const handlePrintReport = async (currentFilters = filters) => {
    try {
      setPrinting(true);

      // Prepare params with all=true
      const params = { ...currentFilters, all: true };

      // Remove empty string values to avoid unnecessary query params
      Object.keys(params).forEach((key) => {
        if (params[key] === "" || params[key] === null) {
          delete params[key];
        }
      });

      const allInvoices = await invoiceAPI.getInvoices(params);

      if (!allInvoices || allInvoices.length === 0) {
        toast.error("No invoices found for the selected filters");
        return;
      }

      let totalAmountAll = 0;

      const htmlRows = allInvoices
        .map((inv) => {
          totalAmountAll += parseFloat(inv.total_amount || 0);
          return `<tr>
            <td>${inv.invoice_number}</td>
            <td>${inv.store_name || inv.customer_name}</td>
            <td>${inv.status}</td>
            <td>${formatCurrency(inv.total_amount)}</td>
            <td>${formatDate(inv.issue_date)}</td>
            <td>${inv.due_date ? formatDate(inv.due_date) : "-"}</td>
          </tr>`;
        })
        .join("\n");

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
      const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice Report</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 40px;
        background-color: #f9fafb;
        color: #1f2937;
        line-height: 1.6;
      }
      .container {
        max-width: 1000px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        padding: 30px;
        border: 1px solid #e5e7eb;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0060AC;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .header img { max-width: 130px; height: auto; }
      .company-info { text-align: right; }
      .company-info h2 { font-size: 24px; font-weight: 700; margin: 0; color: #1f2937; }
      .company-info p { font-size: 14px; color: #6b7280; margin: 5px 0; }
      .report-title { font-size: 32px; font-weight: 800; color: #0060AC; margin: 0 0 10px 0; text-transform: uppercase; }
      .report-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      .report-table th, .report-table td { padding: 12px 15px; text-align: left; font-size: 14px; }
      .report-table th { background: #0060AC; color: #fff; font-weight: 600; }
      .report-table td { border-bottom: 1px solid #e5e7eb; }
      .report-table tr:last-child td { border-bottom: none; }
      .totals-row td { font-weight: 700; color: #0060AC; }
      @media print { body { padding: 0; background: white; } .container { box-shadow: none; border: none; } }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="/assets/images/logo.png" alt="T Technologies INC Logo" />
        <div class="company-info">
          <h2>T Technologies INC</h2>
          <p>720 Cotton Farm Rd, Pinetops, NC 27864</p>
          <p>Phone: 252-827-1002</p>
        </div>
      </div>
      <h1 class="report-title">Invoice Report</h1>
      <table class="report-table">
        <thead>
          <tr><th>Invoice #</th><th>Store</th><th>Status</th><th>Total Amount ($)</th><th>Issue Date</th><th>Due Date</th></tr>
        </thead>
        <tbody>
          ${htmlRows}
          <tr class="totals-row"><td>Total</td><td></td><td></td><td>${formatCurrency(totalAmountAll)}</td><td></td><td></td></tr>
        </tbody>
      </table>
    </div>
  </body>
</html>`;

      doc.write(htmlContent);
      doc.close();

      printIframe.onload = () => {
        setTimeout(() => {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
          document.body.removeChild(printIframe);
        }, 300);
      };

    } catch (error) {
      console.error("Print report error:", error);
      toast.error(error.message || "Failed to generate invoice report");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <>
      {/* Filters */}
      {reportsEnabled && (
        <InvoicesFilter onFilterChange={handleFilterChange} onPrint={handlePrintReport} printing={printing} />
      )}

      {/* Table Component */}
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={invoices}
        cells={cells}
        heading="Invoices"
        description="Create and manage your invoices here"
        createBtn={true}
        createBtnText="+ Create Invoice"
        onCreateClick={handleCreateInvoice}
        actionIcons={false} // We're using custom actions in the cells
        apiEndpoint="/common/api/invoices/"
        extraParams={filters}
        itemsPerPage={10}
        renderData={renderInvoices}
        onLoadingChange={setDataLoading}
        refresh={refreshToggle}
      />
    </>
  );
}

export default InvoicesTab;
