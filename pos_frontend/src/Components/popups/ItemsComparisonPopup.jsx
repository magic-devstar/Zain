import React from 'react';
import { X, CheckCircle, Package } from 'lucide-react';

function ItemsComparisonPopup({ isOpen, onClose, ticketData, usedItems, availableItems }) {
    // Get assigned items directly from ticketData
    const assignedItems = ticketData?.items || [];

    const getItemStatus = (item) => {
        const isUsed = usedItems.includes(item.id);
        const isAssigned = assignedItems.some(assigned => assigned.id === item.id);
        
        if (isUsed && isAssigned) {
            return 'used-assigned';
        } else if (!isUsed && isAssigned) {
            return 'assigned-not-used';
        } else {
            return 'neither';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'used-assigned':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'assigned-not-used':
                return <Package className="h-4 w-4 text-blue-500" />;
            default:
                return null;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'used-assigned':
                return 'Used & Assigned';
            case 'assigned-not-used':
                return 'Assigned (Not Used)';
            default:
                return '';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'used-assigned':
                return 'bg-green-50 border-green-200';
            case 'assigned-not-used':
                return 'bg-blue-50 border-blue-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const usedAndAssignedItems = assignedItems.filter(item => usedItems.includes(item.id));
    const assignedButNotUsedItems = assignedItems.filter(item => !usedItems.includes(item.id));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg w-[95vw] h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Items Comparison</h2>
                        <p className="text-sm text-gray-600">Compare assigned items with actually used items</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span className="font-semibold text-green-800">Used & Assigned</span>
                                    </div>
                                    <p className="text-2xl font-bold text-green-900 mt-1">{usedAndAssignedItems.length}</p>
                                    <p className="text-sm text-green-700">Items properly used</p>
                                </div>
                                
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-blue-500" />
                                        <span className="font-semibold text-blue-800">Assigned (Not Used)</span>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{assignedButNotUsedItems.length}</p>
                                    <p className="text-sm text-blue-700">Items assigned but not used</p>
                                </div>
                            </div>

                            {/* Items Lists */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                                {/* Left Side - Used Items */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        Used Items ({usedAndAssignedItems.length})
                                    </h3>
                                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                                        {/* Used and Assigned Items */}
                                        {usedAndAssignedItems.map((item, index) => (
                                            <div key={`used-assigned-${item.id}`} className={`p-3 rounded-lg border ${getStatusColor('used-assigned')}`}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {getStatusIcon('used-assigned')}
                                                            <span className="font-medium text-sm">{getStatusText('used-assigned')}</span>
                                                        </div>
                                                        <p className="font-semibold text-gray-900">{item.inventory_name}</p>
                                                        <p className="text-sm text-gray-600">Warehouse: {item.warehouse_name}</p>
                                                        {item.attributes && Object.keys(item.attributes).length > 0 && (
                                                            <div className="mt-2">
                                                                <p className="text-xs font-medium text-gray-700 mb-1">Attributes:</p>
                                                                <div className="grid grid-cols-2 gap-1">
                                                                    {Object.entries(item.attributes).map(([key, value]) => (
                                                                        <div key={key} className="text-xs text-gray-600">
                                                                            <span className="font-medium">{key}:</span> {value}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {usedAndAssignedItems.length === 0 && (
                                            <div className="text-center py-8 text-gray-500">
                                                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                                <p>No items have been marked as used</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side - Assigned Items */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Package className="h-5 w-5 text-blue-500" />
                                        Assigned Items ({assignedItems.length})
                                    </h3>
                                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                                        {assignedItems.map((item, index) => {
                                            const status = getItemStatus(item);
                                            return (
                                                <div key={`assigned-${item.id}`} className={`p-3 rounded-lg border ${getStatusColor(status)}`}>
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {getStatusIcon(status)}
                                                                <span className="font-medium text-sm">{getStatusText(status)}</span>
                                                            </div>
                                                            <p className="font-semibold text-gray-900">{item.inventory_name}</p>
                                                            <p className="text-sm text-gray-600">Warehouse: {item.warehouse_name}</p>
                                                            {item.attributes && Object.keys(item.attributes).length > 0 && (
                                                                <div className="mt-2">
                                                                    <p className="text-xs font-medium text-gray-700 mb-1">Attributes:</p>
                                                                    <div className="grid grid-cols-2 gap-1">
                                                                        {Object.entries(item.attributes).map(([key, value]) => (
                                                                            <div key={key} className="text-xs text-gray-600">
                                                                                <span className="font-medium">{key}:</span> {value}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {assignedItems.length === 0 && (
                                            <div className="text-center py-8 text-gray-500">
                                                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                                <p>No items have been assigned to this ticket</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ItemsComparisonPopup;
