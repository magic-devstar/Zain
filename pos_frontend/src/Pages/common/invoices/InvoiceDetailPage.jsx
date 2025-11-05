import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GoArrowLeft, GoDownload, GoCheck, GoX } from "react-icons/go";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";
import Spinner from "../../../Components/Common/Spinner";
import { invoiceAPI, invoiceChargeTypeAPI, invoiceChargeAPI } from "../../../api/invoices";
import { toast } from "react-hot-toast";
import { LuPrinter } from "react-icons/lu";
import BackButton from "../../../Components/Common/BackButton";

const INVOICE_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chargeTypes, setChargeTypes] = useState([]);
  const [selectedChargeType, setSelectedChargeType] = useState("");
  const [addingCharge, setAddingCharge] = useState(false);
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => {
    fetchInvoice();
    fetchChargeTypes();
  }, [id]);

  useEffect(() => {
    if (invoice) setEditStatus(invoice.status);
  }, [invoice]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const data = await invoiceAPI.getInvoice(id);
      setInvoice(data);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      setError(error.message);
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const fetchChargeTypes = async () => {
    try {
      const data = await invoiceChargeTypeAPI.getChargeTypes({ is_active: true, exclude: "MANUAL" });
      setChargeTypes(data.results || data); // handle paginated or non-paginated
    } catch (error) {
      toast.error("Failed to load charge types");
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await invoiceAPI.changeStatus(id, newStatus);
      toast.success(`Invoice status changed to ${newStatus}`);
      fetchInvoice();
    } catch (error) {
      console.error("Error changing status:", error);
      toast.error("Failed to change invoice status");
    }
  };

  const handlePrintInvoice = async () => {
    try {
      const invoiceData = await invoiceAPI.getInvoiceForPrint(id);

      // Create an iframe element dynamically
      let iframe = document.createElement('iframe');
      iframe.style.display = 'none'; // Keep it hidden
      document.body.appendChild(iframe);

      // Get the iframe's document
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <title>Invoice ${invoiceData.invoice_number}</title>
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
                max-width: 900px;
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
              .header img {
                max-width: 130px;
                height: auto;
              }
              .company-info {
                text-align: right;
              }
              .company-info h2 {
                font-size: 24px;
                font-weight: 700;
                color: #1f2937;
                margin: 0;
              }
              .company-info p {
                font-size: 14px;
                color: #6b7280;
                margin: 5px 0;
              }
              .invoice-title {
                font-size: 36px;
                font-weight: 800;
                color: #0060AC;
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .invoice-meta {
                font-size: 14px;
                color: #6b7280;
                margin: 5px 0;
              }
              .invoice-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                gap: 20px;
              }
              .customer-info, .invoice-details {
                flex: 1;
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              .customer-info h3, .invoice-details h3 {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin: 0 0 15px 0;
              }
              .customer-info p, .invoice-details p {
                font-size: 14px;
                color: #374151;
                margin: 8px 0;
              }
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
              }
              .items-table th, .items-table td {
                padding: 12px 15px;
                text-align: left;
                font-size: 14px;
              }
              .items-table th {
                background: #0060AC;
                color: white;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .items-table td {
                border-bottom: 1px solid #e5e7eb;
                color: #374151;
              }
              .items-table tr:last-child td {
                border-bottom: none;
              }
              .totals {
                text-align: right;
                margin-top: 30px;
              }
              .totals table {
                margin-left: auto;
                border-collapse: collapse;
              }
              .totals td {
                padding: 10px 15px;
                font-size: 14px;
                color: #374151;
              }
              .totals tr:last-child td {
                font-weight: 700;
                font-size: 16px;
                color: #0060AC;
                border-top: 2px solid #3b82f6;
              }
              .status {
                display: inline-block;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
              }
              .status-draft { background-color: #e5e7eb; color: #6b7280; }
              .status-pending { background-color: #fef3c7; color: #d97706; }
              .status-paid { background-color: #d1fae5; color: #059669; }
              .status-overdue { background-color: #fee2e2; color: #dc2626; }
              .status-cancelled { background-color: #e5e7eb; color: #6b7280; }
              .notes {
                margin-top: 30px;
                padding: 20px;
                background: #f8fafc;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              .notes h4 {
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
                margin: 0 0 10px 0;
              }
              .notes p {
                font-size: 14px;
                color: #374151;
                margin: 0;
              }
              @media print {
                body { padding: 0; background: white; }
                .container { box-shadow: none; border: none; }
                .header { border-bottom-color: #0060AC; }
                .items-table th { background: #0060AC; }
                .totals tr:last-child td { border-top-color: #0060AC; }
              }
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
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-meta">Invoice #: ${invoiceData.invoice_number}</div>
              <div class="invoice-meta">Date: ${new Date(invoiceData.issue_date).toLocaleDateString()}</div>
              
              <div class="invoice-info">
                <div class="customer-info">
                  <h3>Bill To:</h3>
                  <p><strong>${invoiceData.customer_name}</strong></p>
                  <p>${invoiceData.customer_email}</p>
                </div>
                <div class="invoice-details">
                  <h3>Invoice Details:</h3>
                  <p><strong>Status:</strong> 
                    <span class="status status-${invoiceData.status.toLowerCase()}">${invoiceData.status}</span>
                  </p>
                  <p><strong>Due Date:</strong> 
                    ${invoiceData.due_date ? new Date(invoiceData.due_date).toLocaleDateString() : 'Not specified'}
                  </p>
                  ${invoiceData.transfer_reference ? `<p><strong>Transfer Reference:</strong> ${invoiceData.transfer_reference}</p>` : ''}
                </div>
              </div>
              
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceData.items.map(item => `
                    <tr>
                      <td>${item.inventory_name}</td>
                      <td>${item.description || '-'}</td>
                      <td>${item.quantity}</td>
                      <td>$${parseFloat(item.unit_price).toFixed(2)}</td>
                      <td>$${parseFloat(item.total_price).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="totals">
                <table>
                  <tr><td><strong>Subtotal:</strong></td><td>$${parseFloat(invoiceData.subtotal).toFixed(2)}</td></tr>
                  ${invoiceData.charges.length > 0 ? invoiceData.charges.map(charge => `
                    <tr><td>${charge.charge_type_name}:</td><td>$${parseFloat(charge.amount).toFixed(2)}</td></tr>
                  `).join('') : ''}
                  <tr><td><strong>Total Amount:</strong></td><td><strong>$${parseFloat(invoiceData.total_amount).toFixed(2)}</strong></td></tr>
                </table>
              </div>
              
              ${invoiceData.notes ? `
                <div class="notes">
                  <h4>Notes:</h4>
                  <p>${invoiceData.notes}</p>
                </div>
              ` : ''}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      // Wait for the iframe content to load, then trigger print
      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.error("Error triggering print:", e);
          toast.error("Failed to open print dialog");
        }
      };

      // Clean up: Remove iframe after printing or cancellation
      const cleanup = () => {
        document.body.removeChild(iframe);
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);

    } catch (error) {
      console.error("Error printing invoice:", error);
      toast.error("Failed to print invoice");
    }
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

  const renderStatus = (status) => {
    const statusConfig = {
      DRAFT: { color: "text-gray-500", bg: "bg-gray-100" },
      PENDING: { color: "text-yellow-600", bg: "bg-yellow-100" },
      PAID: { color: "text-green-600", bg: "bg-green-100" },
      OVERDUE: { color: "text-red-600", bg: "bg-red-100" },
      CANCELLED: { color: "text-gray-600", bg: "bg-gray-100" },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
        {status}
      </span>
    );
  };

  const handleAddCharge = async () => {
    if (!selectedChargeType) {
      toast.error("Please select a charge type");
      return;
    }
    setAddingCharge(true);
    try {
      const chargeType = chargeTypes.find((ct) => ct.id === parseInt(selectedChargeType));
      let amount = chargeType.value;
      if (chargeType.charge_type === "PERCENTAGE") {
        // Calculate percentage based on current total amount (subtotal + existing charges)
        const currentTotal = parseFloat(invoice.subtotal) + parseFloat(invoice.total_charges);
        amount = (currentTotal * parseFloat(chargeType.value)) / 100;
      }
      await invoiceChargeAPI.createInvoiceCharge({
        invoice: invoice.id,
        charge_type: chargeType.id,
        amount,
      });
      toast.success("Charge added");
      setSelectedChargeType("");
      fetchInvoice();
    } catch (error) {
      toast.error("Failed to add charge");
    } finally {
      setAddingCharge(false);
    }
  };

  const handleRemoveCharge = async (chargeId) => {
    if (!window.confirm("Remove this charge?")) return;
    try {
      await invoiceChargeAPI.deleteInvoiceCharge(chargeId);
      toast.success("Charge removed");
      fetchInvoice();
    } catch (error) {
      toast.error("Failed to remove charge");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <SecondaryBtn onClick={() => navigate('/invoices')}>
            Back to Invoices
          </SecondaryBtn>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Invoice not found</p>
          <SecondaryBtn onClick={() => navigate('/invoices')}>
            Back to Invoices
          </SecondaryBtn>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold text-gray-800">Invoice Details</h1>
            <p className="text-gray-600">Invoice #{invoice.invoice_number}</p>
          </div>
        </div>
        <div className="flex space-x-3 flex-wrap justify-end gap-1">
          <PrimaryBtn onClick={handlePrintInvoice}>
            <LuPrinter className="mr-2" />
            Print
          </PrimaryBtn>
          {invoice.status === 'PENDING' && (
            <PrimaryBtn onClick={() => handleStatusChange('PAID')}>
              <GoCheck className="mr-2" />
              Mark as Paid
            </PrimaryBtn>
          )}
        </div>
      </div>

      {/* Invoice Information */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Invoice Details - Scrollable */}
        <div className="lg:flex-1 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
          {/* Customer and Invoice Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Store Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Store Name:</span> {invoice.store_name || invoice.customer_name}</p>
                  <p><span className="font-medium">Customer:</span> {invoice.customer_name}</p>
                  <p><span className="font-medium">Email:</span> {invoice.customer_email}</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Status:</span> {renderStatus(invoice.status)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      className="border rounded px-2 py-1"
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                    >
                      {INVOICE_STATUSES.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <PrimaryBtn
                      onClick={() => handleStatusChange(editStatus)}
                    >
                      Save
                    </PrimaryBtn>
                  </div>
                  <p><span className="font-medium">Issue Date:</span> {formatDate(invoice.issue_date)}</p>
                  <p><span className="font-medium">Due Date:</span> {invoice.due_date ? formatDate(invoice.due_date) : 'Not specified'}</p>
                  {invoice.transfer_reference && (
                    <p><span className="font-medium">Transfer Reference:</span> {invoice.transfer_reference}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.inventory_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Notes</h3>
              <p className="text-gray-700">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Summary - Sticky */}
        <div className="w-full sm:w-100 space-y-6 sticky top-6 self-start">
          {/* Totals */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.charges.length > 0 && (
                <>
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Additional Charges:</p>
                    {invoice.charges.map((charge, index) => (
                      <div key={index} className="flex justify-between items-center text-sm mb-1">
                        <div className="flex gap-4 items-center justify-between w-[70%]">
                          <span className="text-gray-600">{charge.charge_type_name}:</span>
                          <span>{formatCurrency(charge.amount)}</span>
                        </div>
                        <button
                          className="ml-2 text-xs text-red-500 hover:underline cursor-pointer"
                          onClick={() => handleRemoveCharge(charge.id)}
                          title="Remove charge"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Charges:</span>
                      <span className="font-medium">{formatCurrency(invoice.total_charges)}</span>
                    </div>
                  </div>
                </>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
            </div>
            {/* Add Charge UI */}
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Add Charge</h4>
              <div className="flex flex-col md:flex-row md:items-center gap-2 flex-wrap justify-between">
                <select
                  className="border rounded px-2 py-1"
                  value={selectedChargeType}
                  onChange={e => setSelectedChargeType(e.target.value)}
                >
                  <option value="">Select Charge Type</option>
                  {chargeTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name} ({ct.charge_type === "PERCENTAGE" ? `${ct.value}%` : formatCurrency(ct.value)})
                    </option>
                  ))}
                </select>
                <PrimaryBtn
                  className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
                  onClick={handleAddCharge}
                  disabled={addingCharge || !selectedChargeType}
                >
                  {addingCharge ? "Adding..." : "Add"}
                </PrimaryBtn>
              </div>
              {/* Show charge type details and calculated amount */}
              {selectedChargeType && (() => {
                const ct = chargeTypes.find(c => c.id === parseInt(selectedChargeType));
                if (!ct) return null;
                let calcAmount = ct.value;
                let typeLabel = ct.charge_type === "PERCENTAGE" ? "Percentage" : "Fixed Amount";
                if (ct.charge_type === "PERCENTAGE") {
                  // Calculate percentage based on current total amount (subtotal + existing charges)
                  const currentTotal = parseFloat(invoice.subtotal) + parseFloat(invoice.total_charges);
                  calcAmount = (currentTotal * parseFloat(ct.value)) / 100;
                }
                return (
                  <div className="mt-2 text-sm bg-gray-50 p-2 rounded border border-gray-200">
                    <div><span className="font-medium">Type:</span> {typeLabel}</div>
                    <div><span className="font-medium">Value:</span> {ct.charge_type === "PERCENTAGE" ? `${ct.value}%` : formatCurrency(ct.value)}</div>
                    <div><span className="font-medium">Amount to be added:</span> {formatCurrency(calcAmount)}</div>
                    {ct.charge_type === "PERCENTAGE" && (
                      <div><span className="font-medium">Based on:</span> {formatCurrency(parseFloat(invoice.subtotal) + parseFloat(invoice.total_charges))} (Subtotal + Existing Charges)</div>
                    )}
                    {ct.description && <div className="text-gray-500 mt-1">{ct.description}</div>}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={handlePrintInvoice}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <GoDownload className="mr-2" />
                Print Invoice
              </button>
              {invoice.status === 'PENDING' && (
                <button
                  onClick={() => handleStatusChange('PAID')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <GoCheck className="mr-2" />
                  Mark as Paid
                </button>
              )}
              {invoice.status === 'PENDING' && (
                <button
                  onClick={() => handleStatusChange('CANCELLED')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  <GoX className="mr-2" />
                  Cancel Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;