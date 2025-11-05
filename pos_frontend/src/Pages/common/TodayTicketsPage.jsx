import { useState, useEffect } from 'react';
import { format, isToday } from 'date-fns';

import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, MapPin, Tag, FileText, ArrowLeft } from 'lucide-react';
import Avatar from '../../Components/Common/Avatar';
import { useNavigate } from 'react-router-dom';
import PrimaryBtn from '../../Components/Common/PrimaryBtn';

export default function TodayTicketsPage() {
    const navigate = useNavigate();
    
    // Use network time consistently - no timezone conversion
    const getNetworkTime = () => {
        // Always use the current date as-is, no timezone conversion
        return new Date();
    };
    
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getNetworkTime());

    // Fetch tickets for the selected date
    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setIsLoading(true);
                // Fetch all tickets for the month and filter by deadline/created_at
                const startDate = format(selectedDate, 'yyyy-MM-dd');
                const endDate = format(selectedDate, 'yyyy-MM-dd');
                
                const response = await api.get("/common/api/tickets/", {
                    params: {
                        all: true,
                        'calendar_status[]': ['OPEN', 'IN PROGRESS']
                    },
                    paramsSerializer: params => {
                        const searchParams = new URLSearchParams();
                        Object.entries(params).forEach(([key, value]) => {
                            if (Array.isArray(value)) {
                                value.forEach(v => searchParams.append(key, v));
                            } else {
                                searchParams.append(key, value);
                            }
                        });
                        return searchParams.toString();
                    }
                });
                
                // Filter tickets by deadline (fallback to created_at) for the selected date - NETWORK TIME
                const filteredTickets = response.data.filter(ticket => {
                    const dateString = ticket.deadline ?? ticket.created_at;
                    
                    let ticketDate;
                    
                    if (ticket.deadline) {
                        // For deadline, use the date as-is (network time)
                        ticketDate = ticket.deadline; // Use the deadline string directly
                    } else {
                        // For created_at, format the date consistently
                        const ticketDateObj = new Date(dateString);
                        ticketDate = format(ticketDateObj, 'yyyy-MM-dd');
                    }
                    
                    return ticketDate === startDate;
                });
                
                setTickets(filteredTickets);
            } catch (error) {
                console.error('Error fetching tickets:', error);
                toast.error('Failed to fetch tickets');
            } finally {
                setIsLoading(false);
            }
        }; 

        fetchTickets();
    }, [selectedDate]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'OPEN':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'IN PROGRESS':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'PENDING APPROVAL':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'PARTIALLY CLOSED':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'CLOSED':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high':
                return 'bg-red-100 text-red-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            case 'low':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        // Use network time consistently - no timezone conversion
        const ticketDate = new Date(dateString);
        return format(ticketDate, 'MMM dd, yyyy HH:mm');
    };

    const handleDateChange = (date) => {
        setSelectedDate(new Date(date));
    };

    return (
        <div className='p-4'>
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <Calendar className="h-6 w-6 md:h-8 md:w-8" />
                            Today's Tickets
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="date"
                            value={format(selectedDate, 'yyyy-MM-dd')}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {isToday(selectedDate) && (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                Today
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                            </h2>
                            <p className="text-gray-600">
                                {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} for this date
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Total Tickets</p>
                            <p className="text-2xl font-bold text-primary">{tickets.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading tickets...</p>
                    </div>
                </div>
            ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No tickets for this date</h3>
                    <p className="text-gray-500">There are no tickets scheduled for {format(selectedDate, 'MMMM dd, yyyy')}</p>
                </div>
            ) : (
                /* Tickets Grid */
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {tickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                        >
                            {/* Ticket Header */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                            #{ticket.id} - {ticket.title}
                                        </h3>
                                        {ticket.description && (
                                            <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                                                {ticket.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                        {ticket.priority && (
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Store Information */}
                                {ticket.store_details && (
                                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-800">Store Information</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">
                                                    {ticket.store_details.store_name}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    {ticket.store_details.store_address}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    {ticket.store_details.store_city}, {ticket.store_details.store_zip_code}
                                                </p>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <p className="font-medium text-gray-700">Phone:</p>
                                                    {ticket.store_details.store_phone ? (
                                                        <a 
                                                            href={`tel:${ticket.store_details.store_phone.replace(/[\s\+]/g, '')}`}
                                                            className="text-gray-600 hover:text-primary hover:underline cursor-pointer"
                                                            title={`Click to call ${ticket.store_details.store_phone}`}
                                                        >
                                                            {ticket.store_details.store_phone}
                                                        </a>
                                                    ) : (
                                                        <p className="text-gray-600">N/A</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-700">Email:</p>
                                                    {ticket.store_details.store_billing_email ? (
                                                        <a 
                                                            href={`mailto:${ticket.store_details.store_billing_email}`}
                                                            className="text-gray-600 hover:text-primary hover:underline cursor-pointer"
                                                            title={`Click to send email to ${ticket.store_details.store_billing_email}`}
                                                        >
                                                            {ticket.store_details.store_billing_email}
                                                        </a>
                                                    ) : (
                                                        <p className="text-gray-600">N/A</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="border-t pt-2">
                                                <p className="text-xs font-medium text-gray-700 mb-1">Contact Information:</p>
                                                <div className="grid grid-cols-1 gap-1 text-xs">
                                                    <div>
                                                        <span className="font-medium text-gray-600">Owner:</span> {ticket.store_details.owner_name} 
                                                        {ticket.store_details.owner_phone && (
                                                            <>
                                                                <span> (</span>
                                                                <a 
                                                                    href={`tel:${ticket.store_details.owner_phone.replace(/[\s\+]/g, '')}`}
                                                                    className="hover:text-primary hover:underline cursor-pointer"
                                                                    title={`Click to call ${ticket.store_details.owner_phone}`}
                                                                >
                                                                    {ticket.store_details.owner_phone}
                                                                </a>
                                                                <span>)</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-600">Manager:</span> {ticket.store_details.manager_name} 
                                                        {ticket.store_details.manager_phone && (
                                                            <>
                                                                <span> (</span>
                                                                <a 
                                                                    href={`tel:${ticket.store_details.manager_phone.replace(/[\s\+]/g, '')}`}
                                                                    className="hover:text-primary hover:underline cursor-pointer"
                                                                    title={`Click to call ${ticket.store_details.manager_phone}`}
                                                                >
                                                                    {ticket.store_details.manager_phone}
                                                                </a>
                                                                <span>)</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-600">Distributor:</span> {ticket.store_details.distributor_name} 
                                                        {ticket.store_details.distributor_phone && (
                                                            <>
                                                                <span> (</span>
                                                                <a 
                                                                    href={`tel:${ticket.store_details.distributor_phone.replace(/[\s\+]/g, '')}`}
                                                                    className="hover:text-primary hover:underline cursor-pointer"
                                                                    title={`Click to call ${ticket.store_details.distributor_phone}`}
                                                                >
                                                                    {ticket.store_details.distributor_phone}
                                                                </a>
                                                                <span>)</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t pt-2">
                                                <div className="flex justify-between text-xs">
                                                    <div>
                                                        <span className="font-medium text-gray-600">Hours:</span> {ticket.store_details.open} - {ticket.store_details.close}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-600">Customer:</span> {ticket.store_details.customer.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}



                                {/* Assigned Technicians */}
                                {ticket.assigned_to_users && ticket.assigned_to_users.length > 0 && (
                                    <div className="mb-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">Assigned Technicians</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {ticket.assigned_to_users.map((user) => (
                                                <div key={user.id} className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-full">
                                                    <Avatar user={user} size="sm" />
                                                    <span className="text-xs text-gray-700">{user.username}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Category */}
                                {ticket.category && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tag className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-600">{ticket.category.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Ticket Details */}
                            <div className="p-4">
                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="h-4 w-4 text-gray-500" />
                                            <span className="text-xs font-medium text-gray-600">Created</span>
                                        </div>
                                        <p className="text-sm text-gray-800">
                                            {formatDate(ticket.created_at)}
                                        </p>
                                    </div>
                                    {ticket.deadline && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calendar className="h-4 w-4 text-gray-500" />
                                                <span className="text-xs font-medium text-gray-600">Deadline</span>
                                            </div>
                                            <p className="text-sm text-gray-800">
                                                {formatDate(ticket.deadline)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Info */}
                                <div className="flex items-center justify-between text-sm text-gray-600">
                                    <div className="flex items-center gap-4">
                                        {ticket.attachment_count > 0 && (
                                            <div className="flex items-center gap-1">
                                                <FileText className="h-4 w-4" />
                                                <span>{ticket.attachment_count} attachment{ticket.attachment_count !== 1 ? 's' : ''}</span>
                                            </div>
                                        )}
                                        {ticket.charges && ticket.charges.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium">${ticket.charges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 