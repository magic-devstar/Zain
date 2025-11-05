import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Ticket, Package, User, Store, FileText, Calendar, Clock, MapPin, Tag } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Avatar from '../../Components/Common/Avatar';
import PrimaryBtn from '../../Components/Common/PrimaryBtn';

export default function SearchResultsPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get('q');
    
    const [results, setResults] = useState({
        tickets: [],
        inventory: [],
        users: [],
        stores: [],
        invoices: [],
        cashDrawers: [],
        assemblyTickets: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        if (query) {
            performSearch(query);
        }
    }, [query]);

    const performSearch = async (searchQuery) => {
        if (!searchQuery.trim()) return;
        
        setIsLoading(true);
        try {
            // Use the new global search endpoint
            const response = await api.get('/common/api/global-search/search/', {
                params: { q: searchQuery }
            });

            console.log('Search response:', response.data); // Debug log
            
            // The backend now returns data directly, not wrapped in 'results'
            const data = response.data;
            
            setResults({
                tickets: data.tickets || [],
                inventory: data.inventory || [],
                users: data.users || [],
                stores: data.stores || [],
                invoices: data.invoices || [],
                cashDrawers: data.cash_drawers || [],
                assemblyTickets: data.assembly_tickets || [],
            });
            
            console.log('Search results set:', data); // Debug log

        } catch (error) {
            console.error('Search error:', error);
            toast.error('Failed to perform search');
        } finally {
            setIsLoading(false);
        }
    };

    const getTotalResults = () => {
        return Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'OPEN':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'IN PROGRESS':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'CLOSED':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Utility function to calculate base path for different user roles
    const getBasePath = () => {
        // Get the current pathname to determine the base path
        const pathname = window.location.pathname;
        
        // Check if we're in admin, manager, or other sections
        if (pathname.includes('/admin')) {
            return '/admin';
        } else if (pathname.includes('/manager')) {
            return '/manager';
        } else if (pathname.includes('/technician')) {
            return '/technician';
        } else if (pathname.includes('/warehouse')) {
            return '/warehouse';
        } else if (pathname.includes('/partner')) {
            return '/partner';
        } else if (pathname.includes('/reporter')) {
            return '/reporter';
        } else if (pathname.includes('/servicecustomer')) {
            return '/servicecustomer';
        } else if (pathname.includes('/vendingcustomer')) {
            return '/vendingcustomer';
        } else if (pathname.includes('/externaluser')) {
            return '/externaluser';
        }
        
        // Default to common routes
        return '';
    };

    const tabs = [
        { id: 'all', label: 'All Results', count: getTotalResults() },
        { id: 'tickets', label: 'Tickets', count: results.tickets.length },
        { id: 'inventory', label: 'Inventory', count: results.inventory.length },
        { id: 'users', label: 'Users', count: results.users.length },
        { id: 'stores', label: 'Stores', count: results.stores.length },
        { id: 'invoices', label: 'Invoices', count: results.invoices.length },
        { id: 'cashDrawers', label: 'Cash Drawers', count: results.cashDrawers.length },
        { id: 'assemblyTickets', label: 'Assembly Tickets', count: results.assemblyTickets.length },
    ];

    const renderTickets = () => (
        <div className="space-y-4">
            {results.tickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                #{ticket.id} - {ticket.title}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Created: {formatDate(ticket.created_at)}</span>
                        </div>
                        {ticket.deadline && (
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Deadline: {formatDate(ticket.deadline)}</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-3 flex justify-end">
                        <PrimaryBtn
                            onClick={() => navigate(`${getBasePath()}/tickets/${ticket.id}`)}
                            className="text-sm"
                        >
                            View Ticket
                        </PrimaryBtn>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderInventory = () => (
        <div className="space-y-4">
            {results.inventory.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                {item.inventory__name || item.title}
                            </h3>
                            <p className="text-sm text-gray-600">{item.inventory__description}</p>
                            
                            {/* Enhanced Inventory Details */}
                            <div className="mt-2 space-y-1">
                                {item.serial_number && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">Serial:</span> {item.serial_number}
                                    </p>
                                )}
                                {item.mac_address && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">MAC:</span> {item.mac_address}
                                    </p>
                                )}
                                {item.ip_address && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">IP:</span> {item.ip_address}
                                    </p>
                                )}
                                {item.service_tag && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">Service Tag:</span> {item.service_tag}
                                    </p>
                                )}
                                {item.service_number && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">Service #:</span> {item.service_number}
                                    </p>
                                )}
                                {item.model && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">Model:</span> {item.model}
                                    </p>
                                )}
                                {item.brand && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">Brand:</span> {item.brand}
                                    </p>
                                )}
                                {item.inventory__upc && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">UPC:</span> {item.inventory__upc}
                                    </p>
                                )}
                                {item.inventory__unit_price && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">Unit Price:</span> ${item.inventory__unit_price}
                                    </p>
                                )}
                                {item.inventory__price && (
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">Price:</span> ${item.inventory__price}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.status === 'available' ? 'bg-green-100 text-green-800' :
                                item.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
                                item.status === 'consumed' ? 'bg-red-100 text-red-800' :
                                item.status === 'in_repair' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {item.status?.replace('_', ' ').toUpperCase() || 'Active'}
                            </span>
                            {item.inventory__serial_number_required && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Serial Required
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        {item.warehouse__name && (
                            <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{item.warehouse__name}</span>
                            </div>
                        )}
                        {item.inventory__category__name && (
                            <div className="flex items-center gap-1">
                                <Tag className="h-4 w-4" />
                                <span>{item.inventory__category__name}</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-3 flex justify-end">
                        <PrimaryBtn
                            onClick={() => navigate(`${getBasePath()}/inventory/${item.inventory__name || 'item'}/${item.inventory__id}/transfer`)}
                            className="text-sm"
                        >
                            View Inventory
                        </PrimaryBtn>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderUsers = () => (
        <div className="space-y-4">
            {results.users.map((user) => (
                <div key={user.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <Avatar user={user} size="lg" />
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                {user.username}
                            </h3>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <p className="text-sm text-gray-500">{user.role}</p>
                            {user.phone_number && (
                                <p className="text-sm text-gray-500">Phone: {user.phone_number}</p>
                            )}
                            <p className="text-xs text-gray-400">
                                Joined: {formatDate(user.date_joined)}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                                user.role === 'Technician' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {user.role}
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <PrimaryBtn
                            onClick={() => navigate(`${getBasePath()}/users/${user.id}`)}
                            className="text-sm"
                        >
                            View Profile
                        </PrimaryBtn>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStores = () => (
        <div className="space-y-4">
            {results.stores.map((store) => (
                <div key={store.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                {store.store_name}
                            </h3>
                            <p className="text-sm text-gray-600">{store.store_address}</p>
                            <p className="text-sm text-gray-500">{store.store_city}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {store.customer__username || 'Unknown Customer'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        {store.store_phone && (
                            <span>Phone: {store.store_phone}</span>
                        )}
                        {store.store_billing_email && (
                            <span>Email: {store.store_billing_email}</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderInvoices = () => (
        <div className="space-y-4">
            {results.invoices.map((invoice) => (
                <div key={invoice.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                Invoice #{invoice.invoice_number}
                            </h3>
                            <p className="text-sm text-gray-600">
                                Customer: {invoice.store__customer__username || 'Unknown'}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ${parseFloat(invoice.total_amount || 0).toFixed(2)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                                invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                                {invoice.status}
                            </span>
                        </div>
                    </div>
                    
                    {/* Store Information */}
                    {invoice.store__store_name && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-2">Store Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Store:</span> {invoice.store__store_name}
                                    </p>
                                    {invoice.store__store_address && (
                                        <p className="text-gray-600">
                                            <span className="font-medium">Address:</span> {invoice.store__store_address}
                                        </p>
                                    )}
                                    {invoice.store__store_city && (
                                        <p className="text-gray-600">
                                            <span className="font-medium">City:</span> {invoice.store__store_city}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Created By:</span> {invoice.created_by__username}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Financial Information */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                            <p className="text-gray-600">
                                <span className="font-medium">Subtotal:</span> ${parseFloat(invoice.subtotal || 0).toFixed(2)}
                            </p>
                            <p className="text-gray-600">
                                <span className="font-medium">Charges:</span> ${parseFloat(invoice.total_charges || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">
                                <span className="font-medium">Total:</span> ${parseFloat(invoice.total_amount || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">
                                <span className="font-medium">Issue Date:</span> {formatDate(invoice.issue_date)}
                            </p>
                            {invoice.due_date && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Due Date:</span> {formatDate(invoice.due_date)}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="text-gray-600">
                                <span className="font-medium">Created:</span> {formatDate(invoice.created_at)}
                            </p>
                        </div>
                    </div>
                    
                    {/* Notes */}
                    {invoice.notes && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">Notes:</span> {invoice.notes}
                            </p>
                        </div>
                    )}
                    
                    <div className="mt-3 flex justify-end">
                        <PrimaryBtn
                            onClick={() => navigate(`${getBasePath()}/invoices/${invoice.id}`)}
                            className="text-sm"
                        >
                            View Invoice
                        </PrimaryBtn>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderCashDrawers = () => (
        <div className="space-y-4">
            {results.cashDrawers.map((drawer) => (
                <div key={drawer.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                Cash Drawer #{drawer.id}
                            </h3>
                            <div className="space-y-1">
                                <p className="text-sm text-gray-600">
                                    User: {drawer.user__username || 'Unknown'}
                                </p>
                                {drawer.user__email && (
                                    <p className="text-sm text-gray-500">
                                        Email: {drawer.user__email}
                                    </p>
                                )}
                                {drawer.user__role && (
                                    <p className="text-sm text-gray-500">
                                        Role: {drawer.user__role}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                drawer.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                                {drawer.status?.toUpperCase()}
                            </span>
                            <span className="font-medium text-green-600">
                                ${parseFloat(drawer.current_amount || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    
                    {/* Store Information */}
                    {drawer.store__store_name && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-2">Store Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Store:</span> {drawer.store__store_name}
                                    </p>
                                    {drawer.store__store_address && (
                                        <p className="text-gray-600">
                                            <span className="font-medium">Address:</span> {drawer.store__store_address}
                                        </p>
                                    )}
                                    {drawer.store__store_city && (
                                        <p className="text-gray-600">
                                            <span className="font-medium">City:</span> {drawer.store__store_city}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-gray-600">
                                        <span className="font-medium">Customer:</span> {drawer.store__customer__username}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Financial Information */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                            <p className="text-gray-600">
                                <span className="font-medium">Opening Amount:</span> ${parseFloat(drawer.opening_amount || 0).toFixed(2)}
                            </p>
                            <p className="text-gray-600">
                                <span className="font-medium">Current Amount:</span> ${parseFloat(drawer.current_amount || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600">
                                <span className="font-medium">Opened:</span> {formatDate(drawer.opened_at)}
                            </p>
                            {drawer.closed_at && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Closed:</span> {formatDate(drawer.closed_at)}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="text-gray-600">
                                <span className="font-medium">Status:</span> {drawer.status}
                            </p>
                        </div>
                    </div>
                    
                    {/* Notes */}
                    {drawer.notes && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">Notes:</span> {drawer.notes}
                            </p>
                        </div>
                    )}
                    
                    <div className="mt-3 flex justify-end">
                        <PrimaryBtn
                            onClick={() => navigate(`${getBasePath()}/cash-drawer`)}
                            className="text-sm"
                        >
                            View Cash Drawers
                        </PrimaryBtn>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderAssemblyTickets = () => (
        <div className="space-y-4">
            {results.assemblyTickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                #{ticket.id} - {ticket.title}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                            </span>
                            {ticket.priority && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                                    ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {ticket.priority}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* User Information */}
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-800 mb-2">User Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                                <p className="text-gray-600">
                                    <span className="font-medium">Created By:</span> {ticket.created_by__username}
                                </p>
                                {ticket.assigned_by__username && (
                                    <p className="text-gray-600">
                                        <span className="font-medium">Assigned By:</span> {ticket.assigned_by__username}
                                    </p>
                                )}
                            </div>
                            <div>
                                {ticket.assembled_item_name && (
                                    <p className="text-gray-600">
                                        <span className="font-medium">Item:</span> {ticket.assembled_item_name}
                                    </p>
                                )}
                                {ticket.assembled_item_upc && (
                                    <p className="text-gray-600">
                                        <span className="font-medium">UPC:</span> {ticket.assembled_item_upc}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Time Information */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                            <p className="text-gray-600">
                                <span className="font-medium">Created:</span> {formatDate(ticket.created_at)}
                            </p>
                            {ticket.deadline && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Deadline:</span> {formatDate(ticket.deadline)}
                                </p>
                            )}
                        </div>
                        <div>
                            {ticket.assigned_at && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Assigned:</span> {formatDate(ticket.assigned_at)}
                                </p>
                            )}
                            {ticket.completed_at && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Completed:</span> {formatDate(ticket.completed_at)}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="text-gray-600">
                                <span className="font-medium">Status:</span> {ticket.status}
                            </p>
                            {ticket.flagged && (
                                <p className="text-gray-600">
                                    <span className="font-medium">Flagged:</span> Yes
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {/* Assembly Notes */}
                    {ticket.assembly_notes && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">Assembly Notes:</span> {ticket.assembly_notes}
                            </p>
                        </div>
                    )}
                    
                    <div className="mt-3 flex justify-end">
                        <PrimaryBtn
                            onClick={() => navigate(`${getBasePath()}/assembly-tickets/${ticket.id}`)}
                            className="text-sm"
                        >
                            View Assembly Ticket
                        </PrimaryBtn>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderContent = () => {
        if (activeTab === 'all') {
            return (
                <div className="space-y-8">
                    {results.tickets.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Ticket className="h-5 w-5 text-primary" />
                                Tickets ({results.tickets.length})
                            </h2>
                            {renderTickets()}
                        </div>
                    )}
                    
                    {results.inventory.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                Inventory ({results.inventory.length})
                            </h2>
                            {renderInventory()}
                        </div>
                    )}
                    
                    {results.users.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Users ({results.users.length})
                            </h2>
                            {renderUsers()}
                        </div>
                    )}
                    
                    {results.stores.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Store className="h-5 w-5 text-primary" />
                                Stores ({results.stores.length})
                            </h2>
                            {renderStores()}
                        </div>
                    )}
                    
                    {results.invoices.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Invoices ({results.invoices.length})
                            </h2>
                            {renderInvoices()}
                        </div>
                    )}
                    
                    {results.cashDrawers.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                Cash Drawers ({results.cashDrawers.length})
                            </h2>
                            {renderCashDrawers()}
                        </div>
                    )}
                    
                    {results.assemblyTickets.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Ticket className="h-5 w-5 text-primary" />
                                Assembly Tickets ({results.assemblyTickets.length})
                            </h2>
                            {renderAssemblyTickets()}
                        </div>
                    )}
                    
                </div>
            );
        }

        switch (activeTab) {
            case 'tickets':
                return renderTickets();
            case 'inventory':
                return renderInventory();
            case 'users':
                return renderUsers();
            case 'stores':
                return renderStores();
            case 'invoices':
                return renderInvoices();
            case 'cashDrawers':
                return renderCashDrawers();
            case 'assemblyTickets':
                return renderAssemblyTickets();
            default:
                return null;
        }
    };

    if (!query) {
        return (
            <div className="text-center">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Search</h1>
                <p className="text-gray-600">Enter a search query to find tickets, inventory, users, and more.</p>
            </div>
        );
    }

    return (
        <div className="">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Search className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                        Search Results
                    </h1>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                "{query}"
                            </h2>
                            <p className="text-gray-600">
                                {getTotalResults()} result{getTotalResults() !== 1 ? 's' : ''} found
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Search Query</p>
                            <p className="text-lg font-semibold text-primary">{query}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Results */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">Searching...</p>
                    </div>
                </div>
            ) : getTotalResults() === 0 ? (
                <div className="text-center py-12">
                    <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No results found</h3>
                    <p className="text-gray-500">Try adjusting your search terms or browse different categories.</p>
                </div>
            ) : (
                renderContent()
            )}
        </div>
    );
}
