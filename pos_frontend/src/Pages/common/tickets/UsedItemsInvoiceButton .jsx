import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import PrimaryBtn from '../../../Components/Common/PrimaryBtn';
import SecondaryBtn from '../../../Components/Common/SecondaryBtn';

const UsedItemsInvoiceModal = ({ isOpen, onClose, ticketData, usedItems, availableItems }) => {
    const [invoiceNumber] = useState(`INV-USED-${Date.now().toString().slice(-6)}`);
    const [invoiceDate] = useState(new Date().toISOString().split('T')[0]);

    if (!isOpen || !ticketData) return null;

    // Get used items from ticket data
    const getUsedItemsFromTicket = () => {
        if (!ticketData.item_usages || !ticketData.items) return [];
        
        const usedItemsList = [];
        
        // Loop through item_usages to find which items are used
        Object.keys(ticketData.item_usages).forEach(itemId => {
            if (ticketData.item_usages[itemId]) {
                // Find the corresponding item in the items array
                const item = ticketData.items.find(item => item.id.toString() === itemId);
                if (item) {
                    usedItemsList.push({
                        ...item,
                        quantity_used: 1 // Default quantity to 1, you can modify this if you have quantity data
                    });
                }
            }
        });
        
        return usedItemsList;
    };

    const finalUsedItems = getUsedItemsFromTicket();

    const calculateSubtotal = () => {
        return finalUsedItems.reduce((total, item) => {
            const unitPrice = parseFloat(item.inventory_unit_price) || 0;
            const quantity = parseInt(item.quantity_used) || 0;
            return total + (unitPrice * quantity);
        }, 0);
    };

    const subtotal = calculateSubtotal();
    const serviceCharges = 200; // You can make this dynamic if needed
    const total = subtotal + serviceCharges;

    const handlePrint = () => {
        const printContent = document.getElementById('used-items-invoice-print-content').innerHTML;
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
              .px-2 { padding-left: 1rem; padding-right: 1rem; }
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

    // Don't show modal if no items are used
    if (finalUsedItems.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center no-print">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b no-print">
                    <h2 className="text-xl font-bold">Invoice - Used Items</h2>
                    <div className="flex gap-2">
                        <PrimaryBtn onClick={handlePrint} className="flex items-center gap-1">
                            <Printer size={16} />
                            Print
                        </PrimaryBtn>
                        <SecondaryBtn onClick={onClose}>Close</SecondaryBtn>
                    </div>
                </div>

                <div id="used-items-invoice-print-content" className="p-6">
                    {/* Company Header */}
                    <div className="flex justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-blue-600">T Technologies INC</h1>
                            <p className="text-gray-600">720 Cotton Farm Rd Pinetops NC, 27864</p>
                            <p className="text-gray-600">Phone: 252-827-1002</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold">INVOICE</h2>
                            <p className="text-gray-600">Invoice #: {invoiceNumber}</p>
                            <p className="text-gray-600">Date: {invoiceDate}</p>
                            <p className="text-gray-600">Ticket #: {ticketData.id}</p>
                        </div>
                    </div>

                    {/* Customer Information */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-2">Service Details:</h3>
                        <p><strong>Ticket Title:</strong> {ticketData.title}</p>
                        <p><strong>Description:</strong> {ticketData.description}</p>
                        {ticketData.representativeName && (
                            <p><strong>Representative:</strong> {ticketData.representativeName}</p>
                        )}
                        {ticketData.representativePhone && (
                            <p><strong>Phone:</strong> {ticketData.representativePhone}</p>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold border-b pb-2 mb-2">Used Items</h2>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="py-2 px-2 text-left border">Item Name</th>
                                    <th className="py-2 px-2 text-left border">UPC</th>
                                    <th className="py-2 px-2 text-left border">Warehouse</th>
                                    <th className="py-2 px-2 text-right border">Unit Price</th>
                                    <th className="py-2 px-2 text-right border">Quantity</th>
                                    <th className="py-2 px-2 text-right border">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {finalUsedItems.map((item, index) => {
                                    const unitPrice = parseFloat(item.inventory_unit_price) || 0;
                                    const quantity = parseInt(item.quantity_used) || 0;
                                    const itemTotal = unitPrice * quantity;

                                    return (
                                        <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                            <td className="py-2 px-2 border">{item.inventory_name || 'N/A'}</td>
                                            <td className="py-2 px-2 border">{item.inventory_upc || 'N/A'}</td>
                                            <td className="py-2 px-2 border">{item.warehouse_name || 'N/A'}</td>
                                            <td className="py-2 px-2 text-right border">${unitPrice.toFixed(2)}</td>
                                            <td className="py-2 px-2 text-right border">{quantity}</td>
                                            <td className="py-2 px-2 text-right border">${itemTotal.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-8">
                        <div className="w-64">
                            <div className="flex justify-between py-2">
                                <span className="font-semibold">Subtotal:</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                                <span className="font-semibold">Service Charges:</span>
                                <span>${serviceCharges.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-2 font-bold text-lg">
                                <span>Total:</span>
                                <span className="text-green-600">${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-gray-600 mt-16 border-t pt-4">
                        <p className="font-semibold">Thank you for your business!</p>
                        <p>Payment is due within 30 days. Please make checks payable to T Technologies INC.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const UsedItemsInvoiceButton = ({ ticketData, usedItems, availableItems }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Check if there are any used items
    const hasUsedItems = ticketData?.item_usages && 
        Object.values(ticketData.item_usages).some(usage => usage === true);

    if (!hasUsedItems) return null;

    return (
        <>
            <PrimaryBtn onClick={() => setIsModalOpen(true)} className="flex items-center gap-1">
                <Printer size={16} />
                Invoice
            </PrimaryBtn>
            <UsedItemsInvoiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                ticketData={ticketData}
                usedItems={usedItems}
                availableItems={availableItems}
            />
        </>
    );
};

export default UsedItemsInvoiceModal;