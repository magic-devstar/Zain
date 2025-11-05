import React, { useState, useEffect } from "react";
import { formatDate } from "../../../utils/formatDate";
import Pagination from "../../Common/Pagination";
import TableSkeleton from "../../LoadeingSkeletons/TableSkeleton";
import toast from "react-hot-toast";
import api from "../../../utils/api";
import Spinner from "../../Common/Spinner";
import AttachmentViewer from "../../Common/AttachmentViewer";

const CashDrawerTable = ({
    dataloading,
    data,
    apiEndpoint,
    itemsPerPage,
    renderData,
    onLoadingChange,
    refresh,
    extraParams = {},
    onCloseDrawer = null
}) => {
    const [expandedDrawers, setExpandedDrawers] = useState(new Set());
    const [entriesData, setEntriesData] = useState({});
    const [entriesLoading, setEntriesLoading] = useState({});

    const toggleExpanded = async (drawerId) => {
        const newExpanded = new Set(expandedDrawers);
        if (newExpanded.has(drawerId)) {
            newExpanded.delete(drawerId);
        } else {
            newExpanded.add(drawerId);
            // Load entries if not already loaded
            if (!entriesData[drawerId]) {
                await loadEntries(drawerId);
            }
        }
        setExpandedDrawers(newExpanded);
    };

    const loadEntries = async (drawerId) => {
        try {
            setEntriesLoading(prev => ({ ...prev, [drawerId]: true }));
            const response = await api.get(`/common/api/cash-drawers/${drawerId}/entries/`);
            setEntriesData(prev => ({ ...prev, [drawerId]: response.data }));
        } catch (error) {
            toast.error("Failed to load entries");
            console.error("Error loading entries:", error);
        } finally {
            setEntriesLoading(prev => ({ ...prev, [drawerId]: false }));
        }
    };

    const getEntryTypeColor = (entryType) => {
        switch (entryType) {
            case "opening": return "bg-blue-100 text-blue-800";
            case "sale": return "bg-green-100 text-green-800";
            case "fill": return "bg-green-100 text-green-800";
            case "bleed": return "bg-red-100 text-red-800";
            case "withdrawal": return "bg-red-100 text-red-800";
            case "refund": return "bg-red-100 text-red-800";
            case "adjustment": return "bg-yellow-100 text-yellow-800";
            case "closing": return "bg-gray-100 text-gray-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <>
            <div className="overflow-auto rounded-md mt-4">
                {dataloading ? (
                    <TableSkeleton columns={[
                        { name: "User", key: "user" },
                        { name: "Status", key: "status" },
                        { name: "Opening Amount", key: "opening_amount" },
                        { name: "Current Amount", key: "current_amount" },
                        { name: "Opened At", key: "opened_at" },
                        { name: "Closed At", key: "closed_at" },
                        { name: "Actions", key: "actions" }
                    ]} rows={15} />
                ) : (
                    <div className="max-h-[60svh] overflow-auto">
                        <table className="min-w-full table-fixed">
                            <thead className="bg-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="py-3 px-6 text-left w-[50px]"></th>
                                    <th className="py-3 px-6 text-left w-[150px]">User</th>
                                    <th className="py-3 px-6 text-left w-[100px]">Status</th>
                                    <th className="py-3 px-6 text-left w-[150px]">Opening Amount</th>
                                    <th className="py-3 px-6 text-left w-[150px]">Current Amount</th>
                                    <th className="py-3 px-6 text-left w-[150px]">Opened At</th>
                                    <th className="py-3 px-6 text-left w-[150px]">Closed At</th>
                                    <th className="py-3 px-6 text-left w-[200px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((drawer, rowIndex) => (
                                    <React.Fragment key={drawer.id}>
                                        <tr className={`border-b border-black-400 transition duration-150 ease-in-out
                                            ${rowIndex % 2 === 0 ? "bg-gray-50" : "bg-white"}
                                            hover:bg-[#438e8f34]
                                            `}>
                                            <td className="py-3 px-6 text-left">
                                                <button
                                                    onClick={() => toggleExpanded(drawer.id)}
                                                    className="text-primary hover:text-blue-700 cursor-pointer"
                                                >
                                                    {expandedDrawers.has(drawer.id) ? "▼" : "▶"}
                                                </button>
                                            </td>
                                            <td className="py-3 px-6 text-left">
                                                <div className="text-sm font-semibold">{drawer.user?.username || "N/A"}</div>
                                            </td>
                                            <td className="py-3 px-6 text-left">
                                                <div className={`text-sm px-2 py-1 rounded-full w-fit ${drawer.status === "open"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                                    }`}>
                                                    {drawer.status.charAt(0).toUpperCase() + drawer.status.slice(1)}
                                                </div>
                                            </td>

                                            <td className="py-3 px-6 text-left">
                                                <div className="text-sm">${parseFloat(drawer.opening_amount).toFixed(2)}</div>
                                            </td>
                                            <td className="py-3 px-6 text-left">
                                                <div className="text-sm font-semibold">${parseFloat(drawer.current_amount).toFixed(2)}</div>
                                            </td>
                                            <td className="py-3 px-6 text-left">
                                                <div className="text-sm">{formatDate(drawer.opened_at)}</div>
                                            </td>
                                            <td className="py-3 px-6 text-left">
                                                <div className="text-sm">{drawer.closed_at ? formatDate(drawer.closed_at) : "N/A"}</div>
                                            </td>
                                            <td className="py-3 px-6 text-left">
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => toggleExpanded(drawer.id)}
                                                        className="px-3 py-1 bg-primary text-white rounded cursor-pointer text-sm"
                                                    >
                                                        {expandedDrawers.has(drawer.id) ? "Hide Entries" : "View Entries"}
                                                    </button>
                                                    {drawer.status === "open" && onCloseDrawer && (
                                                        <button
                                                            onClick={() => onCloseDrawer(drawer)}
                                                            className="px-3 py-1 bg-red-600 text-white rounded cursor-pointer text-sm hover:bg-red-700"
                                                        >
                                                            Close Drawer
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Entries Row */}
                                        {expandedDrawers.has(drawer.id) && (
                                            <tr>
                                                <td colSpan="8" className="p-0">
                                                    <div className="bg-gray-100 p-4">
                                                        <div className="mb-4 p-4 bg-white rounded-lg">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div>
                                                                    <p className="text-sm text-gray-600">Status</p>
                                                                    <p className={`font-semibold ${drawer.status === "open" ? "text-green-600" : "text-red-600"
                                                                        }`}>
                                                                        {drawer.status}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-gray-600">Opening Amount</p>
                                                                    <p className="font-semibold">${parseFloat(drawer.opening_amount).toFixed(2)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-gray-600">
                                                                        {drawer.status === "closed" ? "Closing Amount" : "Current Amount"}
                                                                    </p>
                                                                    <p className="font-semibold">
                                                                        ${parseFloat(drawer.status === "closed" ? drawer.current_amount : drawer.current_amount)}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-gray-600">Opened At</p>
                                                                    <p className="font-semibold">{formatDate(drawer.opened_at)}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {entriesLoading[drawer.id] ? (
                                                           <Spinner />
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full table-auto">
                                                                    <thead className="bg-gray-200">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left">Type</th>
                                                                            <th className="px-4 py-2 text-left">Amount</th>
                                                                            <th className="px-4 py-2 text-left">Description</th>
                                                                            <th className="px-4 py-2 text-left">Store</th>
                                                                            <th className="px-4 py-2 text-left">Invoice</th>
                                                                            <th className="px-4 py-2 text-left">Created By</th>
                                                                            <th className="px-4 py-2 text-left">Date</th>
                                                                            <th className="px-4 py-2 text-left">Attachments</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {entriesData[drawer.id]?.map((entry, index) => (
                                                                            <tr key={entry.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                                                                <td className="px-4 py-2">
                                                                                    <span className={`px-2 py-1 rounded-full text-xs ${getEntryTypeColor(entry.entry_type)}`}>
                                                                                        {entry.entry_type.charAt(0).toUpperCase() + entry.entry_type.slice(1)}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-2 font-semibold">
                                                                                    ${parseFloat(entry.amount).toFixed(2)}
                                                                                </td>
                                                                                <td className="px-4 py-2">{entry.description}</td>
                                                                                <td className="px-4 py-2">
                                                                                    {entry.store ? (
                                                                                        <div className="text-sm">
                                                                                            <div className="font-medium">{entry.store.store_name}</div>
                                                                                            <div className="text-xs text-gray-500">{entry.store.customer_name}</div>
                                                                                        </div>
                                                                                    ) : entry.customer ? (
                                                                                        <div className="text-sm">
                                                                                            <div className="font-medium">{entry.customer.username}</div>
                                                                                            <div className="text-xs text-gray-500">{entry.customer.role}</div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-gray-400 text-sm">—</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-4 py-2">
                                                                                    {entry.invoice_number ? (
                                                                                        <div className="text-sm">
                                                                                            <div className="font-medium text-blue-600">{entry.invoice_number}</div>
                                                                                            <div className="text-xs text-gray-500">${parseFloat(entry.invoice_total || 0).toFixed(2)}</div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-gray-400 text-sm">—</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-4 py-2">{entry.created_by?.username || "N/A"}</td>
                                                                                <td className="px-4 py-2">{formatDate(entry.created_at)}</td>
                                                                                <td className="px-4 py-2">
                                                                                    {entry.attachments && entry.attachments.length > 0 ? (
                                                                                        <AttachmentViewer attachments={entry.attachments} />
                                                                                    ) : (
                                                                                        <span className="text-gray-400 text-sm">—</span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                        {(!entriesData[drawer.id] || entriesData[drawer.id].length === 0) && (
                                                                            <tr>
                                                                                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                                                                                    No entries found for this cash drawer
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}

                                {data.length < 9 &&
                                    Array.from({ length: 9 - data.length }).map((_, index) => (
                                        <tr
                                            key={`empty-${index}`}
                                            className={`border-b border-black-400 transition duration-150 ease-in-out
                      ${(data.length + index) % 2 === 0 ? "bg-gray-50" : "bg-white"}
                      hover:bg-[#438e8f34]
                    `}
                                        >
                                            {Array.from({ length: 8 }).map((_, colIndex) => (
                                                <td
                                                    className="py-3 px-6 text-left h-13"
                                                    key={colIndex}
                                                ></td>
                                            ))}
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination
                    apiEndpoint={apiEndpoint}
                    itemsPerPage={itemsPerPage}
                    renderData={renderData}
                    onLoadingChange={onLoadingChange}
                    refresh={refresh}
                    extraParams={extraParams}
                />
            </div>
        </>
    );
};

export default CashDrawerTable; 