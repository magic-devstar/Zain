import { useState, useRef, useEffect } from 'react';
import {
    Plus,
    MoreHorizontal,
    Flag,
    Calendar,
    Paperclip,
    CircleDashed,
    Clock,
    AlertCircle,
    CheckCircle,
} from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import PopupComponent from '../../../Components/popups/PopupComponent';
import TicketFormPopup from '../../../Components/popups/TicketFormPopup';
import { createTicket, updateTicketStatus } from "../../../utils/apis/ticketUtils";
import { toast } from 'react-hot-toast';
import dayjs from "dayjs";
import { Link } from 'react-router-dom';
import TicketCardSkeleton from '../../../Components/LoadeingSkeletons/TicketCardSkeleton';
import statusColors from '../../../utils/statusColors';
import AdminTicketsPagination from '../../../Components/Common/AdminTicketsPagination';
import api from '../../../utils/api';
import PrintableTicketContent from '../../../Components/Printers/PrintableTicketContent';
import PrintTicektPopup from '../../../Components/popups/PrintTicektPopup';
import Avatar from '../../../Components/Common/Avatar';
import Spinner from '../../../Components/Common/Spinner';
import AdminTicketsFilter from '../../../Components/filters/AdminTicketsFilter';
import useReportsToggle from '../../../utils/useReportsToggle';
import SimpleFilter from '../../../Components/filters/SimpleFilter';

// Define the drag item type
const ItemTypes = {
    TICKET: 'ticket'
};

const DraggableTicketCard = ({ ticket, onStatusChange, targetColumn }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const dueDateFormatted = ticket.deadline ? dayjs(ticket.deadline).format("MMM D, YYYY") : null;

    // Generate a consistent random light color for this ticket based on its ID
    const getRandomLightColor = (ticketId) => {
        // Use ticket ID as seed for consistent colors
        const seed = ticketId.toString().split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);

        // Generate more varied random hue (0-360) with better distribution
        const hue = Math.abs(seed * 137.508) % 360; // Golden angle for better distribution

        // Vary saturation more for different color intensities
        const saturation = 15 + (Math.abs(seed * 13) % 40); // 15-55% saturation

        // Keep high lightness for light colors
        const lightness = 88 + (Math.abs(seed * 7) % 8); // 88-96% lightness

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    const cardColor = getRandomLightColor(ticket.id);

    // Set up drag functionality
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.TICKET,
        item: {
            id: ticket.id,
            currentStatus: ticket.status
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        })
    });

    const toggleDropdown = (e) => {
        e.preventDefault(); // Prevent navigation from Link
        e.stopPropagation(); // Prevent event bubbling
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleStatusChange = (newStatus, e) => {
        e.preventDefault(); // Prevent navigation from Link
        e.stopPropagation(); // Prevent event bubbling

        if (onStatusChange) {
            onStatusChange(ticket.id, newStatus);
        }

        setIsDropdownOpen(false);
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
            setIsDropdownOpen(false);
        }
    };

    // Add/remove event listener when dropdown opens/closes
    useEffect(() => {
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const statusOptions = [
        {
            label: 'OPEN',
            value: 'OPEN',
            icon: <CircleDashed size={16} className={`mr-2 rounded-full ${statusColors['OPEN']}`} />
        },
        {
            label: 'IN PROGRESS',
            value: 'IN PROGRESS',
            icon: <Clock size={16} className={`mr-2 rounded-full ${statusColors['IN PROGRESS']}`} />
        },
        {
            label: 'PARTIALLY CLOSED',
            value: 'PARTIALLY CLOSED',
            icon: <AlertCircle size={16} strokeWidth={1.5} className={`mr-2 rounded-full ${statusColors['PARTIALLY CLOSED']}`} />
        },
        {
            label: 'PENDING APPROVAL',
            value: 'PENDING APPROVAL',
            icon: <CheckCircle size={16} className={`mr-2 rounded-full ${statusColors['PENDING APPROVAL']}`} />
        },
        {
            label: 'CLOSED',
            value: 'CLOSED',
            icon: <CheckCircle size={16} className={`mr-2 rounded-full ${statusColors['CLOSED']}`} fill="currentColor" fillOpacity={0.2} />
        }
    ];

    // Apply opacity when dragging
    const cardStyle = {
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? 'grabbing' : 'pointer'
    };

    return (
        <div ref={drag} style={cardStyle} className='cursor-move'>
            <Link to={`${ticket.id}`} className="block cursor-move">
                <div
                    className="p-3 rounded mb-2 border border-gray-100 hover:opacity-80 transition-all relative"
                    style={{ backgroundColor: cardColor }}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-800 break-all cursor-pointer">{ticket.title} ( #{ticket.id} )</h3>
                        </div>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                className="text-gray-400 hover:text-gray-600 ml-2 p-1 cursor-pointer"
                                onClick={toggleDropdown}
                            >
                                <MoreHorizontal size={20} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-0 right-6 w-52 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                    <div className="px-4 py-2 text-sm text-gray-700 font-medium border-b border-gray-100">
                                        Change Status
                                    </div>
                                    {statusOptions.map((option, index) => (
                                        <div key={option.value}>
                                            <button
                                                disabled={option.value === ticket.status}
                                                className={`w-full text-left px-4 py-2 text-sm flex items-center ${option.value === ticket.status ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                                                    }`}
                                                onClick={(e) => handleStatusChange(option.value, e)}
                                            >
                                                {option.icon}
                                                {option.label}
                                            </button>
                                            {index !== statusOptions.length - 1 && (
                                                <hr className="m-auto w-[90%] text-gray-400" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col justify-center mt-1 gap-3 text-xs text-gray-500">
                        <div className='flex items-center flex-wrap gap-3 text-xs text-gray-500 ml-4'>
                            {ticket.assigned_to_users && ticket.assigned_to_users.length > 0 && (
                                <div className="flex -space-x-2">
                                    {ticket.assigned_to_users.map((user, idx) => (
                                        <Avatar
                                            key={idx}
                                            user={user}
                                            color={idx % 2 === 0 ? "bg-primary" : "bg-primary_light"}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className='flex items-center flex-wrap gap-3 text-xs text-gray-500'>
                            {dueDateFormatted && (
                                <div className="flex items-center cursor-pointer">
                                    <Calendar size={14} className="mr-1 text-red-400" />
                                    <span className='text-red-400'>{dueDateFormatted}</span>
                                </div>
                            )}
                            <div className="flex items-center cursor-pointer">
                                <Paperclip size={14} className="mr-1" />
                                {ticket.attachment_count && (
                                    <span>{ticket.attachment_count}</span>
                                )}
                            </div>
                            <div className="ml-auto cursor-pointer">
                                {ticket.flagged ? (
                                    <Flag size={15} className="text-primary fill-primary" />
                                ) : (
                                    <Flag size={15} className="text-gray-400" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};

// Droppable Column component
const DroppableColumn = ({ title, onCreateTicket, skeletonCount = 2, refreshToggle, filters, onStatusChange }) => {
    const [dataLoading, setDataLoading] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [columnRefresh, setColumnRefresh] = useState(false);

    // Create a unique ID for each column to prevent pagination interference
    const paginationId = `pagination-${title.replace(/\s+/g, '-').toLowerCase()}`;

    // Set up drop functionality
    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.TICKET,
        drop: (item) => {
            if (item.currentStatus !== title) {
                onStatusChange(item.id, title, item.currentStatus, () => setColumnRefresh(prev => !prev));
            }
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    });

    const renderTickets = (tickets) => {
        setTickets(tickets);  // Update tickets data with the fetched data
    };

    // Combine the parent refresh toggle with column-specific refresh
    const combinedRefreshToggle = `${refreshToggle}-${columnRefresh}`;

    // Apply styles when dragging over this column
    const columnStyle = {
        borderRadius: '10px',
        border: '1px solid rgb(229, 230, 232)',
        transition: 'background-color 0.2s ease',
    };

    return (
        <div
            className="flex flex-col rounded-lg snap-start flex-1"
            style={{ ...columnStyle, minWidth: '280px', width: 'auto' }}
            ref={drop}
        >
            <AdminTicketsPagination
                key={`${paginationId}-${combinedRefreshToggle}`}
                id={paginationId}
                transparent={true}
                apiEndpoint="/common/api/tickets"
                itemsPerPage={10}
                renderData={renderTickets}
                onLoadingChange={setDataLoading}
                onCountChange={setTotalCount}
                refresh={combinedRefreshToggle}
                extraParams={{
                    ...({ status: title }),
                    ...filters,
                }}
            />

            <div className="flex items-center justify-between p-2 mb-1">
                <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full ${statusColors[title]} mr-2`}></div>
                    <h2 className="text-sm font-medium uppercase text-gray-600">{title}</h2>
                    <span className="ml-2 text-sm text-gray-500">{totalCount}</span>
                </div>
                {title === 'OPEN' && (
                    <button className="text-primary hover:text-gray-600 mx-1 cursor-pointer" onClick={onCreateTicket}>
                        <Plus size={20} />
                    </button>
                )}
            </div>

            <div className="overflow-y-auto px-2 pb-2 flex-1 min-h-0">
                {dataLoading
                    ? [...Array(skeletonCount)].map((_, idx) => <TicketCardSkeleton key={idx} />)
                    : tickets.map((ticket) => (
                        <DraggableTicketCard
                            key={ticket.id}
                            ticket={ticket}
                            onStatusChange={(ticketId, newStatus) => onStatusChange(ticketId, newStatus, title, () => setColumnRefresh(prev => !prev))}
                            targetColumn={title}
                        />
                    ))
                }

                {!dataLoading && title === 'OPEN' && (
                    <button className="flex items-center justify-center py-2 mt-1 text-gray-500 hover:bg-gray-200 rounded cursor-pointer w-full" onClick={onCreateTicket}>
                        <Plus size={14} className="mr-1" />
                        <span className="text-sm">Add Ticket</span>
                    </button>
                )}
            </div>
        </div>
    );
};

function TicketsListPage() {
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [filters, setFilters] = useState({});
    const [printTickets, setPrintTickets] = useState([]);
    const { reportsEnabled } = useReportsToggle();

    // Track which columns need refreshing
    const [columnsToRefresh, setColumnsToRefresh] = useState({
        'OPEN': false,
        'IN PROGRESS': false,
        'PARTIALLY CLOSED': false,
        'PENDING APPROVAL': false,
        'CLOSED': false
    });

    const handleCreateTicket = () => {
        setPopupName("Create Ticket");
        setPopup(true);
    };

    const handleOpenPrintPopup = () => {
        setPopupName("Print Tickets");
        setPopup(true);
    };

    const handleTicketSubmit = async (ticketData) => {
        try {
            setLoading(true);
            const response = await createTicket(ticketData);
            toast.success("Ticket created!");
            const statusKey = ticketData.status?.toUpperCase(); // ensure it's uppercase if your keys are like 'OPEN'

            if (statusKey) {
                setColumnsToRefresh(prev => ({
                    ...prev,
                    [statusKey]: !prev[statusKey]
                }));
            }
            return response;
        } catch (error) {
            toast.error(error.message || "Failed to create ticket");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (ticketId, newStatus, currentStatus, refreshCallback) => {
        try {
            setStatusUpdating(true);
            await updateTicketStatus(ticketId, newStatus);

            // Refresh both the current status column and the new status column
            if (refreshCallback) refreshCallback(); // Refresh current column

            // Refresh the column for the new status
            setColumnsToRefresh(prev => ({
                ...prev,
                [newStatus]: !prev[newStatus]
            }));

            // Also refresh the source column if it's different
            if (currentStatus && currentStatus !== newStatus) {
                setColumnsToRefresh(prev => ({
                    ...prev,
                    [currentStatus]: !prev[currentStatus]
                }));
            }

        } catch (error) {
            toast.error(error.message || "Failed to update ticket status");
        } finally {
            setStatusUpdating(false);
        }
    };

    const handlePrint = async (status) => {
        try {
            setLoading(true);
            const response = await api.get('/common/api/tickets', {
                params: {
                    all: true,
                    status: status
                }
            });

            const data = response.data;
            setPrintTickets(data || []);
            setPopup(false);

            setTimeout(() => {
                window.print();
            }, 500);

        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Failed to print tickets");
        } finally {
            setLoading(false);
        }
    };

    const getRandomSkeletonCount = () => Math.floor(Math.random() * (15 - 4 + 1)) + 4;

    return (
        <div className="w-full h-full flex flex-col overflow-x-hidden">

            {reportsEnabled ? (
                <SimpleFilter
                    showPrintOption={true}
                    onFilterChange={(newFilters) => {
                        setFilters(newFilters);
                    }}
                    onPrintClick={handleOpenPrintPopup}
                />

            ) : (
                <AdminTicketsFilter
                    showPrintOption={true}
                    onFilterChange={(newFilters) => {
                        setFilters(newFilters);
                    }}
                    onPrintClick={handleOpenPrintPopup}
                />
            )}

            <div className="flex-1 overflow-x-hidden rounded-sm w-full">
                {statusUpdating ? (
                    <Spinner />
                ) : (
                    <div className="flex overflow-x-auto gap-2 overflow-y-auto mb-2 flex-1 snap-x snap-mandatory px-2 h-full w-full">
                        <DroppableColumn
                            title="OPEN"
                            onCreateTicket={handleCreateTicket}
                            skeletonCount={getRandomSkeletonCount()}
                            refreshToggle={columnsToRefresh['OPEN'] ? refreshToggle + '-refresh' : refreshToggle}
                            filters={filters}
                            onStatusChange={handleStatusChange}
                        />
                        <DroppableColumn
                            title="IN PROGRESS"
                            skeletonCount={getRandomSkeletonCount()}
                            refreshToggle={columnsToRefresh['IN PROGRESS'] ? refreshToggle + '-refresh' : refreshToggle}
                            filters={filters}
                            onStatusChange={handleStatusChange}
                        />
                        <DroppableColumn
                            title="PARTIALLY CLOSED"
                            skeletonCount={getRandomSkeletonCount()}
                            refreshToggle={columnsToRefresh['PARTIALLY CLOSED'] ? refreshToggle + '-refresh' : refreshToggle}
                            filters={filters}
                            onStatusChange={handleStatusChange}
                        />
                        <DroppableColumn
                            title="PENDING APPROVAL"
                            skeletonCount={getRandomSkeletonCount()}
                            refreshToggle={columnsToRefresh['PENDING APPROVAL'] ? refreshToggle + '-refresh' : refreshToggle}
                            filters={filters}
                            onStatusChange={handleStatusChange}
                        />
                        <DroppableColumn
                            title="CLOSED"
                            skeletonCount={getRandomSkeletonCount()}
                            refreshToggle={columnsToRefresh['CLOSED'] ? refreshToggle + '-refresh' : refreshToggle}
                            filters={filters}
                            onStatusChange={handleStatusChange}
                        />
                        {/* Spacer to ensure last column is fully visible */}
                    </div>
                )}

            </div>

            {popupName === "Create Ticket" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <TicketFormPopup
                        loading={loading}
                        onSubmit={handleTicketSubmit}
                        onClose={() => (setPopup(false))}
                    />
                </PopupComponent>
            )}

            {popupName === "Print Tickets" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <PrintTicektPopup
                        loading={loading}
                        onSubmit={handlePrint}
                    />
                </PopupComponent>
            )}

            <div className='h-0 overflow-auto'>
                <PrintableTicketContent tickets={printTickets} />
            </div>
        </div>
    );
}

export default TicketsListPage;