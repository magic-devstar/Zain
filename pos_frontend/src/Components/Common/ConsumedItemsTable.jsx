import React, { useState } from "react";
import PrimaryBtn from "./PrimaryBtn";
import { Package, Printer, Search } from "lucide-react";
import Spinner from "./Spinner";

const ConsumedItemsTable = ({ consumedItems, loading }) => {
    const [searchTerm, setSearchTerm] = useState("");

    const handlePrint = () => {
        // JavaScript to dynamically add/remove classes for hiding elements is removed.
        // CSS with @media print will handle visibility.
        window.print();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8 w-full">
                <Spinner />
            </div>
        );
    }

    if (!consumedItems || consumedItems.length === 0) {
        return (
            <div className="my-2 p-4 border border-gray-200 rounded-lg shadow text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-600 text-sm">No items found for this customer.</p>
            </div>
        );
    }

    // Filtered items for search
    const filteredConsumedItems = consumedItems.filter(item => {
        const searchString = searchTerm.toLowerCase();
        return (
            (item.inventory_name && item.inventory_name.toLowerCase().includes(searchString)) ||
            (item.inventory_upc && item.inventory_upc.toLowerCase().includes(searchString)) ||
            (item.attributes?.serial_number && item.attributes.serial_number.toLowerCase().includes(searchString)) ||
            (item.attributes?.mac_address && item.attributes.mac_address.toLowerCase().includes(searchString)) ||
            (item.attributes?.ip_address && item.attributes.ip_address.toLowerCase().includes(searchString)) ||
            (item.attributes?.service_tag && item.attributes.service_tag.toLowerCase().includes(searchString)) ||
            (item.attributes?.service_number && item.attributes.service_number.toLowerCase().includes(searchString)) ||
            (item.warehouse_name && item.warehouse_name.toLowerCase().includes(searchString)) ||
            (item.store_name && item.store_name.toLowerCase().includes(searchString)) ||
            (item.transfer_id && String(item.transfer_id).toLowerCase().includes(searchString))
        );
    });

    return (
        <div className="consumed-items-print-area my-2 p-4 border border-gray-200 rounded-lg shadow">
            <style>
                {`
          @media print {
            body * {
              visibility: hidden;
            }
            .consumed-items-print-area,
            .consumed-items-print-area * {
              visibility: visible;
            }
            .consumed-items-print-area .no-print {
              display: none !important; /* Still use display:none for specific no-print items inside */
            }
            .consumed-items-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important; /* Allow height to adjust to content */
              margin: 0 !important;
              padding: 20px !important; 
              border: none !important;
              box-shadow: none !important;
              overflow: visible !important;
            }
            .consumed-items-print-area .table-container-for-print {
                overflow: visible !important; /* Ensure table content is not clipped */
                width: 100% !important;
                max-height: none !important;
                height: auto !important; 
            }
            .consumed-items-print-area table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            .consumed-items-print-area th, .consumed-items-print-area td {
              border: 1px solid #ddd !important;
              padding: 8px !important;
              text-align: left !important;
            }
            .consumed-items-print-area th {
              background-color: #f2f2f2 !important;
            }
          }
        `}
            </style>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-3 no-print">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Consumed Items
                    <span className="text-sm font-normal text-gray-500">({filteredConsumedItems.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <PrimaryBtn onClick={handlePrint} className="h-full">
                        <Printer className="h-4 w-4" />
                    </PrimaryBtn>
                </div>
            </div>
            <div className="table-container-for-print overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UPC</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC Address</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Tag</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service No.</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transfer Ref.</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredConsumedItems.length > 0 ? (
                            filteredConsumedItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.inventory_name || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item?.inventory_upc || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.attributes?.serial_number || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.attributes?.mac_address || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.attributes?.ip_address || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.attributes?.service_tag || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.attributes?.service_number || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.store_name || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ID: {item.transfer_id} <br /> ({new Date(item.transfer_date).toLocaleDateString()})
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9" className="text-center py-10 text-gray-500">
                                    No items match your search criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ConsumedItemsTable; 