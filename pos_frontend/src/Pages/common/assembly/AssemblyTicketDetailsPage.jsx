import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../utils/api";
import { toast } from "react-hot-toast";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";
import Spinner from "../../../Components/Common/Spinner";
import { formatDate } from "../../../utils/formatDate";
import {
    EyeIcon,
    PencilIcon,
    CheckIcon,
    XMarkIcon,
    ClockIcon,
    UserIcon,
    CalendarIcon,
    TagIcon,
    CubeIcon,
    DocumentTextIcon,
    PlayIcon,
    PauseIcon,
    StopIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    PrinterIcon
} from "@heroicons/react/24/outline";
import AssemblyTicketFormPopup from "../../../Components/popups/AssemblyTicketFormPopup";
import PopupComponent from "../../../Components/popups/PopupComponent";
import BackButton from "../../../Components/Common/BackButton";

const AssemblyTicketDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Enhanced state management
    const [expandedItems, setExpandedItems] = useState({});
    const [expandedSections, setExpandedSections] = useState({
        basicInfo: true,
        assembledItem: true,
        itemsUsed: true,
        notes: true,
        timeline: true
    });

    useEffect(() => {
        fetchTicketDetails();
    }, [id]);

    const fetchTicketDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/assembly/api/assembly-tickets/${id}/`);
            console.log('Fetched ticket details:', response.data);
            setTicket(response.data);
        } catch (error) {
            console.error("Error fetching ticket details:", error);
            toast.error("Failed to load ticket details");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            console.log('Attempting to change status from:', ticket.status, 'to:', newStatus);
            setUpdating(true);
            const response = await api.post(`/assembly/api/assembly-tickets/${id}/change_status/`, {
                status: newStatus,
            });
            console.log('Status change response:', response);
            toast.success(`Ticket status changed to ${newStatus.replace('_', ' ')}`);
            await fetchTicketDetails();
        } catch (error) {
            console.error("Error changing status:", error);
            console.error("Error response:", error.response?.data);
            toast.error("Failed to change ticket status");
        } finally {
            setUpdating(false);
        }
    };

    const handleEdit = () => {
        setShowEditPopup(true);
    };

    const handleEditSubmit = async (formData) => {
        try {
            setIsSubmitting(true);
            await api.put(`/assembly/api/assembly-tickets/${id}/`, formData);
            toast.success("Assembly ticket updated successfully");
            setShowEditPopup(false);
            fetchTicketDetails();
        } catch (error) {
            console.error("Error updating ticket:", error);
            toast.error("Failed to update assembly ticket");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --------- Print (native) ----------
    const handlePrint = () => {
        const printArea = document.getElementById("assembly-print-area");
        if (!printArea) {
            toast.error("Nothing to print");
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("Pop-up blocked. Please allow pop-ups to print.");
            return;
        }

        // clone styles
        const cssLinks = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
            .map((node) => node.outerHTML)
            .join("\n");

        printWindow.document.write(`<!DOCTYPE html><html><head><title>Assembly Ticket #${ticket?.id}</title>${cssLinks}<style>@media print{@page{size:A4;margin:16mm}}</style></head><body>${printArea.innerHTML}</body></html>`);
        printWindow.document.close();

        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'OPEN':
                return {
                    color: 'text-blue-700 bg-blue-50 border-blue-200',
                    icon: <EyeIcon className="w-4 h-4" />,
                    bgColor: 'bg-blue-50',
                    badgeColor: 'bg-blue-500'
                };
            case 'IN PROGRESS':
                return {
                    color: 'text-amber-700 bg-amber-50 border-amber-200',
                    icon: <PlayIcon className="w-4 h-4" />,
                    bgColor: 'bg-amber-50',
                    badgeColor: 'bg-amber-500'
                };
            case 'PARTIALLY CLOSED':
                return {
                    color: 'text-orange-700 bg-orange-50 border-orange-200',
                    icon: <PauseIcon className="w-4 h-4" />,
                    bgColor: 'bg-orange-50',
                    badgeColor: 'bg-orange-500'
                };
            case 'PENDING APPROVAL':
                return {
                    color: 'text-purple-700 bg-purple-50 border-purple-200',
                    icon: <ClockIcon className="w-4 h-4" />,
                    bgColor: 'bg-purple-50',
                    badgeColor: 'bg-purple-500'
                };
            case 'CLOSED':
                return {
                    color: 'text-green-700 bg-green-50 border-green-200',
                    icon: <CheckIcon className="w-4 h-4" />,
                    bgColor: 'bg-green-50',
                    badgeColor: 'bg-green-500'
                };
            default:
                return {
                    color: 'text-gray-700 bg-gray-50 border-gray-200',
                    icon: <InformationCircleIcon className="w-4 h-4" />,
                    bgColor: 'bg-gray-50',
                    badgeColor: 'bg-gray-500'
                };
        }
    };

    // Reset expanded items when items change
    useEffect(() => {
        setExpandedItems({});
    }, [ticket?.items]);

    const toggleItemExpansion = useCallback((itemId) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    }, []);

    const toggleSection = useCallback((section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    }, []);

    const getStatusActions = () => {
        const actions = [];

        if (ticket.status === 'OPEN') {
            actions.push({
                label: 'Start Assembly',
                action: () => handleStatusChange('IN PROGRESS'),
                type: 'primary',
                icon: <PlayIcon className="w-4 h-4" />
            });
        }

        if (ticket.status === 'IN PROGRESS') {
            actions.push({
                label: 'Partially Close',
                action: () => handleStatusChange('PARTIALLY CLOSED'),
                type: 'warning',
                icon: <PauseIcon className="w-4 h-4" />
            });
        }

        if (ticket.status === 'PARTIALLY CLOSED' || ticket.status === 'IN PROGRESS') {
            actions.push({
                label: 'Mark Complete',
                action: () => handleStatusChange('CLOSED'),
                type: 'success',
                icon: <CheckIcon className="w-4 h-4" />
            });
        }

        return actions;
    };

    const InfoCard = ({ icon, label, value, className = "", highlight = false }) => (
        <div className={`flex items-start space-x-3 p-4 rounded-lg transition-all duration-200 ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
            } ${className}`}>
            <div className="flex-shrink-0 mt-0.5 text-gray-500">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p className="text-sm text-gray-900 break-words font-medium">{value}</p>
            </div>
        </div>
    );

    const SectionHeader = ({ title, isExpanded, onToggle, icon, badge = null, actions = null }) => (
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors -m-2"
                onClick={onToggle}
            >
                <div className="flex items-center space-x-2">
                    {icon}
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    {badge && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {badge}
                        </span>
                    )}
                </div>
                {isExpanded ?
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" /> :
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                }
            </div>
            {actions && (
                <div className="flex items-center space-x-2">
                    {actions}
                </div>
            )}
        </div>
    );

    const ItemCard = ({ item, isExpanded, onToggle }) => (
        <div className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
            <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onToggle(item.id)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            <CubeIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                                {item.inventory_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                                UPC: {item.inventory_upc} • {item.warehouse_name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${item.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                item.status === 'RESERVED' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                            }`}>
                            {item.status}
                        </span>
                        {item.serial_number_required && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                Serialized
                            </span>
                        )}
                        {isExpanded ?
                            <ChevronDownIcon className="w-4 h-4 text-gray-400" /> :
                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                        }
                    </div>
                </div>
            </div>

            {isExpanded && item.attributes && Object.keys(item.attributes).length > 0 && (
                <div className="px-4 pb-4 border-t border-gray-100">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Item Attributes</h5>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(item.attributes).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-600">{key.replace('_', ' ').toUpperCase()}:</span>
                                    <span className="text-gray-900 font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="text-center">
                    <Spinner />
                    <p className="mt-4 text-gray-500">Loading ticket details...</p>
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="text-center py-12">
                <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-lg text-gray-600">Ticket not found</p>
                <p className="text-sm text-gray-500 mt-2">The requested assembly ticket could not be found.</p>
            </div>
        );
    }

    const statusConfig = getStatusConfig(ticket.status);

    return (
        <div id="assembly-print-area" className="mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                    <BackButton />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Assembly Ticket Details</h1>
                        <p className="text-sm text-gray-600">#{ticket.id} • {ticket.title}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {ticket.status !== 'CLOSED' && (
                        <PrimaryBtn onClick={handleEdit} className="flex items-center space-x-2">
                            <PencilIcon className="w-4 h-4" />
                            <span>Edit Ticket</span>
                        </PrimaryBtn>
                    )}
                    <PrimaryBtn onClick={handlePrint} className="flex items-center space-x-2">
                        <PrinterIcon className="w-4 h-4" />
                        <span>Print</span>
                    </PrimaryBtn>
                    <div className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 border ${statusConfig.color}`}>
                        {statusConfig.icon}
                        <span>{ticket.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                </div>
            </div>

            {/* Status Actions */}
            {getStatusActions().length > 0 && (
                <div className={`rounded-lg border p-4 mb-6 ${statusConfig.bgColor} border-gray-200`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-gray-900">Quick Actions</h3>
                            <p className="text-sm text-gray-600">Update the ticket status</p>
                        </div>
                        <div className="flex space-x-2">
                            {getStatusActions().map((action, index) => (
                                <button
                                    key={index}
                                    onClick={action.action}
                                    disabled={updating}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${action.type === 'primary' ? 'bg-primary hover:bg-primary_light text-white' :
                                            action.type === 'warning' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                                                action.type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                                                    'bg-gray-600 hover:bg-gray-700 text-white'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {action.icon}
                                    <span>{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 print-section">
                        <SectionHeader
                            title="Basic Information"
                            isExpanded={expandedSections.basicInfo}
                            onToggle={() => toggleSection('basicInfo')}
                            icon={<InformationCircleIcon className="w-5 h-5 text-gray-500" />}
                        />
                        {expandedSections.basicInfo && (
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoCard
                                        icon={<DocumentTextIcon className="w-5 h-5" />}
                                        label="Title"
                                        value={ticket.title}
                                        highlight={true}
                                    />
                                    <InfoCard
                                        icon={<CalendarIcon className="w-5 h-5" />}
                                        label="Deadline"
                                        value={ticket.deadline ? formatDate(ticket.deadline) : "No deadline set"}
                                        highlight={ticket.deadline}
                                    />
                                    <InfoCard
                                        icon={<UserIcon className="w-5 h-5" />}
                                        label="Created By"
                                        value={ticket.created_by || "N/A"}
                                    />
                                    <InfoCard
                                        icon={<UserIcon className="w-5 h-5" />}
                                        label="Assigned To"
                                        value={ticket.assigned_to_users && ticket.assigned_to_users.length > 0
                                            ? ticket.assigned_to_users.map(user => user.username).join(', ')
                                            : "Unassigned"
                                        }
                                        highlight={ticket.assigned_to_users && ticket.assigned_to_users.length > 0}
                                    />
                                </div>
                                <div className="pt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Description</label>
                                    <div className="bg-gray-50 rounded-lg p-4 border">
                                        <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Assembled Item Information */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 print-section">
                        <SectionHeader
                            title="Assembled Item Information"
                            isExpanded={expandedSections.assembledItem}
                            onToggle={() => toggleSection('assembledItem')}
                            icon={<CubeIcon className="w-5 h-5 text-gray-500" />}
                            badge={ticket.assembled_items?.length || 0}
                        />
                        {expandedSections.assembledItem && (
                            <div className="p-6 space-y-4">
                                {Array.isArray(ticket.assembled_items) && ticket.assembled_items.length > 0 ? (
                                    ticket.assembled_items.map((item, idx) => (
                                        <div key={idx} className="p-4 rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                                <InfoCard
                                                    icon={<TagIcon className="w-5 h-5" />}
                                                    label="Item Name"
                                                    value={item.name || "Not specified"}
                                                />
                                                <InfoCard
                                                    icon={<TagIcon className="w-5 h-5" />}
                                                    label="UPC"
                                                    value={item.upc || "Not specified"}
                                                />
                                                <InfoCard
                                                    icon={<TagIcon className="w-5 h-5" />}
                                                    label="Category"
                                                    value={item.category || "Not specified"}
                                                />
                                                <InfoCard
                                                    icon={<TagIcon className="w-5 h-5" />}
                                                    label="Unit Price"
                                                    value={item.unit_price ? `${parseFloat(item.unit_price).toFixed(2)}` : "Not specified"}
                                                />
                                                <InfoCard
                                                    icon={<TagIcon className="w-5 h-5" />}
                                                    label="Quantity"
                                                    value={item.quantity || 1}
                                                />
                                                <InfoCard
                                                    icon={<TagIcon className="w-5 h-5" />}
                                                    label="Serial Number Required"
                                                    value={item.serial_number_required ? "Yes" : "No"}
                                                    highlight={item.serial_number_required}
                                                />
                                            </div>
                                            {item.serial_number_required && Array.isArray(item.attributes_list) && item.attributes_list.length > 0 && (
                                                <div className="mt-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-3">Serial Attributes</label>
                                                    <div className="bg-white rounded-lg p-4 border shadow-sm">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {item.attributes_list.map((attr, i) => (
                                                                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                                                                    <div className="font-semibold text-gray-800 mb-2 text-center">Serial #{i + 1}</div>
                                                                    <div className="space-y-1">
                                                                        {Object.entries(attr).map(([k, v]) => (
                                                                            <div key={k} className="flex justify-between text-sm">
                                                                                <span className="font-medium text-gray-600">{k.replace('_', ' ').toUpperCase()}:</span>
                                                                                <span className="text-gray-900 font-medium">{v}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <CubeIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <p className="text-gray-500">No assembled items specified</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Items Used in Assembly */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 print-section">
                        <SectionHeader
                            title="Items Used in Assembly"
                            isExpanded={expandedSections.itemsUsed}
                            onToggle={() => toggleSection('itemsUsed')}
                            icon={<CubeIcon className="w-5 h-5 text-gray-500" />}
                            badge={ticket.items?.length || 0}
                        />
                        {expandedSections.itemsUsed && (
                            <div className="p-6">
                                {ticket.items && ticket.items.length > 0 ? (
                                    <div className="space-y-4">
                                        {ticket.items.map((item) => (
                                            <ItemCard
                                                key={item.id}
                                                item={item}
                                                isExpanded={expandedItems[item.id]}
                                                onToggle={toggleItemExpansion}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <CubeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                        <p className="text-lg text-gray-500">No items specified for this assembly</p>
                                        <p className="text-sm text-gray-400 mt-2">Items will appear here once they are added to the ticket</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Timeline/Status History */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 print-section">
                        <div className="p-4 border-b border-gray-200">
                            <SectionHeader
                                title="Timeline"
                                isExpanded={expandedSections.timeline}
                                onToggle={() => toggleSection('timeline')}
                                icon={<ClockIcon className="w-5 h-5 text-gray-500" />}
                            />
                        </div>
                        {expandedSections.timeline && (
                            <div className="p-4 space-y-4">
                                <div className="relative">
                                    <div className="absolute left-4 top-6 bottom-0 w-0.5 bg-gray-200"></div>
                                    <div className="space-y-4">
                                        <div className="flex items-start space-x-3">
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${statusConfig.bgColor}`}>
                                                {statusConfig.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">Current Status</p>
                                                <p className="text-sm text-gray-600">{ticket.status.replace('_', ' ')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                <CalendarIcon className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">Created</p>
                                                <p className="text-sm text-gray-600">Ticket created</p>
                                                <p className="text-xs text-gray-500">{formatDate(ticket.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 print-section">
                        <h3 className="font-medium text-gray-900 mb-4">Quick Stats</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Total Items</span>
                                <span className="text-sm font-medium text-gray-900">{ticket.items?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Assembled Items</span>
                                <span className="text-sm font-medium text-gray-900">{ticket.assembled_items?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Days Since Created</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {Math.floor((new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24))}
                                </span>
                            </div>
                            {ticket.deadline && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Days Until Deadline</span>
                                    <span className={`text-sm font-medium ${Math.floor((new Date(ticket.deadline) - new Date()) / (1000 * 60 * 60 * 24)) < 0
                                            ? 'text-red-600'
                                            : Math.floor((new Date(ticket.deadline) - new Date()) / (1000 * 60 * 60 * 24)) <= 7
                                                ? 'text-orange-600'
                                                : 'text-gray-900'
                                        }`}>
                                        {Math.floor((new Date(ticket.deadline) - new Date()) / (1000 * 60 * 60 * 24))}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assembly Notes */}
                    {ticket.assembly_notes && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 print-section">
                            <h3 className="font-medium text-gray-900 mb-3">Assembly Notes</h3>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border">
                                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{ticket.assembly_notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Notes History */}
                    {ticket.notes && ticket.notes.length > 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 print-section">
                            <h3 className="font-medium text-gray-900 mb-4 flex items-center justify-between">
                                Notes History
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                    {ticket.notes.length}
                                </span>
                            </h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {ticket.notes.map((note, index) => (
                                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                                        <p className="text-sm text-gray-900 mb-2 leading-relaxed">{note.content}</p>
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs text-gray-500">
                                                By: {note.created_by ? `${note.created_by.first_name} ${note.created_by.last_name}` : "Unknown"}
                                            </p>
                                            <span className="text-xs text-gray-500">
                                                {formatDate(note.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Popup */}
            {showEditPopup && (
                <PopupComponent popup={showEditPopup} setPopup={setShowEditPopup} loading={loading}>
                    <AssemblyTicketFormPopup
                        ticketDetails={ticket}
                        onclose={() => setShowEditPopup(false)}
                        onSubmit={handleEditSubmit}
                        isSubmitting={isSubmitting}
                    />
                </PopupComponent>
            )}
        </div>
    );
};

export default AssemblyTicketDetailsPage;