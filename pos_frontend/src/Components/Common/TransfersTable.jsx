// Add this component at the top of your VendingCustomerDetails.js file, after imports
import { ChevronDown, ChevronRight, Package, Calendar, ArrowRight, User } from 'lucide-react';
import React, { useState } from "react";
import Spinner from "../../Components/Common/Spinner";


// Add this component before your main VendingCustomerDetails function
export const TransfersTable = ({ transfers, transfersLoading }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (transferId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(transferId)) {
      newExpanded.delete(transferId);
    } else {
      newExpanded.add(transferId);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransferTypeColor = (type) => {
    switch (type) {
      case 'CUSTOMER_TO_WAREHOUSE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'WAREHOUSE_TO_CUSTOMER':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTransferType = (type) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (transfersLoading) {
    return (
      <div className="flex justify-center items-center py-8 w-full">
        <Spinner />
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 w-full">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-600 text-sm">No transfers found for this customer.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden w-full">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Related Transfers
          <span className="text-sm font-normal text-gray-500">({transfers.length})</span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Route
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transfers.map((transfer) => (
              <React.Fragment key={transfer.id}>
                <tr className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">#{transfer.id}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {transfer.created_by}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTransferTypeColor(transfer.transfer_type)}`}>
                      {formatTransferType(transfer.transfer_type)}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">{transfer.source_name || 'N/A'}</span>
                      <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />
                      <span className="font-medium">{transfer.destination_name || 'N/A'}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600">
                        {transfer.items?.length > 0 
                          ? `${transfer.items.length} item${transfer.items.length > 1 ? 's' : ''}` 
                          : 'No items'
                        }
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(transfer.created_at)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    {transfer.items?.length > 0 && (
                      <button
                        onClick={() => toggleRow(transfer.id)}
                        className="inline-flex items-center cursor-pointer px-3 py-1 text-xs font-medium text-primary bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-150"
                      >
                        {expandedRows.has(transfer.id) ? (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3 w-3 mr-1" />
                            Expand
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded Row for Items */}
                {expandedRows.has(transfer.id) && transfer.items?.length > 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 bg-gray-50">
                      <div className="border border-gray-200 rounded-lg bg-white">
                        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            Transfered Items ({transfer.items.length})
                          </h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Item ID
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Name
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Status
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Attributes
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {transfer.items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                      #{item.id}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 font-medium text-gray-900">
                                    {item.inventory__name || 'N/A'}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      item.status === 'available' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    {Object.keys(item.attributes || {}).length > 0 ? (
                                      <div className="space-y-1">
                                        {Object.entries(item.attributes).map(([key, value]) => (
                                          <div key={key} className="text-xs">
                                            <span className="text-gray-500 capitalize">
                                              {key.replace(/_/g, ' ')}:
                                            </span>
                                            <span className="ml-1 text-gray-900 font-medium">
                                              {value || 'N/A'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">No attributes</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};