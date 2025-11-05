import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import PrimaryBtn from '../../../Components/Common/PrimaryBtn';

const InvoiceModal = ({ isOpen, onClose, ticketData }) => {
  const [invoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen || !ticketData) return null;

  const calculateSubtotal = () => {
    return (ticketData.items || []).reduce((total, item) => {
      const unitPrice = parseFloat(item.inventory_unit_price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return total + unitPrice * quantity;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const taxRate = 0.07;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-print-content').innerHTML;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoiceNumber}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .no-print { display: none; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #f2f2f2; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-semibold { font-weight: bold; }
              .text-lg { font-size: 1.125rem; }
              .text-xl { font-size: 1.25rem; }
              .text-2xl { font-size: 1.5rem; }
              .text-blue-600 { color: #2563eb; }
              .text-green-600 { color: #16a34a; }
              .text-red-600 { color: #dc2626; }
              .border-b { border-bottom: 1px solid #ddd; }
              .mb-8 { margin-bottom: 2rem; }
              .mt-16 { margin-top: 4rem; }
              .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
              .px-4 { padding-left: 1rem; padding-right: 1rem; }
              .bg-gray-50 { background-color: #fafafa; }
              .bg-gray-100 { background-color: #f7f7f7; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    setTimeout(onClose, 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center no-print">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b no-print">
          <h2 className="text-xl font-bold">Invoice</h2>
          <div className="flex gap-2">
            <PrimaryBtn onClick={handlePrint} className="flex items-center gap-1">
              <Printer size={16} />
              Print
            </PrimaryBtn>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Close
            </button>
          </div>
        </div>

        <div id="invoice-print-content" className="p-6">
          <div className="flex justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">INVOICE</h1>
              <p className="text-gray-600">T Technologies INC</p>
              <p className="text-gray-600">123 Business Street</p>
              <p className="text-gray-600">City, State ZIP</p>
              <p className="text-gray-600">Phone: (123) 456-7890</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600"><span className="font-semibold">Invoice #:</span> {invoiceNumber}</p>
              <p className="text-gray-600"><span className="font-semibold">Date:</span> {invoiceDate}</p>
              <p className="text-gray-600"><span className="font-semibold">Ticket ID:</span> {ticketData.id}</p>
              <p className="text-gray-600">
                <span className="font-semibold">Status:</span>{' '}
                {ticketData.paid ? (
                  <span className="text-green-600 font-semibold">PAID</span>
                ) : (
                  <span className="text-red-600 font-semibold">UNPAID</span>
                )}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold border-b pb-2 mb-2">Customer Information</h2>
            <p className="text-gray-600"><span className="font-semibold">Customer ID:</span> {ticketData.customer}</p>
            <p className="text-gray-600"><span className="font-semibold">Title:</span> {ticketData.title}</p>
            {ticketData.representativeName && (
              <p className="text-gray-600"><span className="font-semibold">Representative:</span> {ticketData.representativeName}</p>
            )}
            {ticketData.representativePhone && (
              <p className="text-gray-600"><span className="font-semibold">Phone:</span> {ticketData.representativePhone}</p>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold border-b pb-2 mb-2">Items</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left border">Item</th>
                  <th className="py-2 px-4 text-left border">UPC</th>
                  <th className="py-2 px-4 text-right border">Unit Price</th>
                  <th className="py-2 px-4 text-right border">Quantity</th>
                  <th className="py-2 px-4 text-right border">Total</th>
                </tr>
              </thead>
              <tbody>
                {(ticketData.items || []).map((item, index) => {
                  const unitPrice = parseFloat(item.inventory_unit_price) || 0;
                  const quantity = parseInt(item.quantity) || 0;
                  const itemTotal = unitPrice * quantity;

                  return (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-4 border">{item.inventory_name || 'N/A'}</td>
                      <td className="py-2 px-4 border">{item.inventory_upc || 'N/A'}</td>
                      <td className="py-2 px-4 text-right border">${unitPrice.toFixed(2)}</td>
                      <td className="py-2 px-4 text-right border">{quantity}</td>
                      <td className="py-2 px-4 text-right border">${itemTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="font-semibold">Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Tax (7%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-lg">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold border-b pb-2 mb-2">Notes</h2>
            <p className="text-gray-600">
              {ticketData.ticketNotes || ticketData.customer_notes || 'No additional notes.'}
            </p>
          </div>

          <div className="text-center text-gray-600 mt-16">
            <p className="font-semibold">Thank you for your business!</p>
            <p>Payment is due within 30 days. Please make checks payable to Your Company Name.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvoiceButton = ({ ticketData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <PrimaryBtn onClick={() => setIsModalOpen(true)} className="flex items-center gap-1">
        <Printer size={16} />
        View Invoice
      </PrimaryBtn>
      <InvoiceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} ticketData={ticketData} />
    </>
  );
};

export default InvoiceButton;