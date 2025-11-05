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
import AssemblyTicketFormPopup from '../../../Components/popups/AssemblyTicketFormPopup';
import { toast } from 'react-hot-toast';
import dayjs from "dayjs";
import { Link } from 'react-router-dom';
import TicketCardSkeleton from '../../../Components/LoadeingSkeletons/TicketCardSkeleton';
import statusColors from '../../../utils/assemblyStatusColors';
import SimpleFilter from '../../../Components/filters/SimpleFilter';
import AdminTicketsPagination from '../../../Components/Common/AdminTicketsPagination';
import api from '../../../utils/api';
import Avatar from '../../../Components/Common/Avatar';
import Spinner from '../../../Components/Common/Spinner';
import useReportsToggle from '../../../utils/useReportsToggle';
import AdminTicketsFilter from '../../../Components/filters/AdminTicketsFilter';

// Define the drag item type
const ItemTypes = {
    ASSEMBLY_TICKET: 'assembly_ticket'
};

const DraggableAssemblyTicketCard = ({ ticket, onStatusChange, targetColumn }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const dueDateFormatted = ticket.deadline ? dayjs(ticket.deadline).format("MMM D, YYYY") : null;

    // Disable drag and drop for closed tickets
    const isClosed = targetColumn === 'CLOSED';

    // Set up drag functionality
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.ASSEMBLY_TICKET,
        item: {
            id: ticket.id,
            currentStatus: ticket.status
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging()
        }),
        canDrag: !isClosed // Disable drag for closed tickets
    });

    const toggleDropdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleStatusChange = (newStatus, e) => {
        e.preventDefault();
        e.stopPropagation();

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

    const cardStyle = {
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? 'grabbing' : (isClosed ? 'default' : 'pointer')
    };

    return (
        <div ref={drag} style={cardStyle} className={isClosed ? '' : 'cursor-move'}>
            <Link to={`${ticket.id}`} className={`block ${isClosed ? 'cursor-pointer' : 'cursor-move'}`}>
                <div className="bg-slate-800 p-3 rounded mb-2 border border-slate-700 hover:bg-slate-700 transition-colors relative text-slate-100">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-slate-100 break-all cursor-pointer">{ticket.title} ( #{ticket.id} )</h3>
                        </div>
                        {!isClosed && (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    className="text-gray-400 hover:text-gray-600 ml-2 p-1 cursor-pointer"
                                    onClick={toggleDropdown}
                                >
                                    <MoreHorizontal size={20} />
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute top-0 right-6 w-52 bg-slate-800 rounded-md shadow-lg z-10 border border-slate-600">
                                        <div className="px-4 py-2 text-sm text-slate-100 font-medium border-b border-slate-600">
                                            Change Status
                                        </div>
                                        {statusOptions.map((option, index) => (
                                            <div key={option.value}>
                                                <button
                                                    disabled={option.value === ticket.status}
                                                    className={`w-full text-left px-4 py-2 text-sm flex items-center ${option.value === ticket.status ? 'text-slate-400 cursor-not-allowed' : 'text-slate-100 hover:bg-slate-700'
                                                        }`}
                                                    onClick={(e) => handleStatusChange(option.value, e)}
                                                >
                                                    {option.icon}
                                                    {option.label}
                                                </button>
                                                {index !== statusOptions.length - 1 && (
                                                    <hr className="m-auto w-[90%] text-slate-600" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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

const DroppableColumn = ({ title, onCreateTicket, skeletonCount = 2, refreshToggle, filters, onStatusChange }) => {
    const [dataLoading, setDataLoading] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [columnRefresh, setColumnRefresh] = useState(false);

    const paginationId = `assembly-pagination-${title.replace(/\s+/g, '-').toLowerCase()}`;

    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.ASSEMBLY_TICKET,
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
        setTickets(tickets);
    };

    const combinedRefreshToggle = `${refreshToggle}-${columnRefresh}`;

    const columnStyle = {
        transition: 'background-color 0.2s ease',
    };

    return (
        <div
            className="flex flex-col min-w-[280px] w-full rounded-lg bg-transparent"
            style={columnStyle}
            ref={drop}
        >
            <AdminTicketsPagination
                key={`${paginationId}-${combinedRefreshToggle}`}
                id={paginationId}
                apiEndpoint="/assembly/api/assembly-tickets"
                itemsPerPage={10}
                renderData={renderTickets}
                onLoadingChange={setDataLoading}
                onCountChange={setTotalCount}
                refresh={combinedRefreshToggle}
                extraParams={{
                    ...({ status: title }),
                    ...filters,
                }}
                transparent={true}
            />

            <div className="flex items-center justify-between p-2 mb-1 bg-transparent rounded-t">
                <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full ${statusColors[title]} mr-2`}></div>
                    <h2 className="text-sm font-medium uppercase text-slate-200">{title}</h2>
                    <span className="ml-2 text-sm text-slate-400">{totalCount}</span>
                </div>
                {title === 'OPEN' && (
                    <button className="text-cyan-300 hover:text-cyan-100 mx-1 cursor-pointer" onClick={onCreateTicket}>
                        <Plus size={20} />
                    </button>
                )}
            </div>

            <div className="overflow-y-auto px-2 pb-2 h-full max-h-[calc(100vh-155px)] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                {dataLoading
                    ? [...Array(skeletonCount)].map((_, idx) => <TicketCardSkeleton key={idx} />)
                    : tickets.map((ticket) => (
                        <DraggableAssemblyTicketCard
                            key={ticket.id}
                            ticket={ticket}
                            onStatusChange={(ticketId, newStatus) => onStatusChange(ticketId, newStatus, title, () => setColumnRefresh(prev => !prev))}
                            targetColumn={title}
                        />
                    ))
                }

                {!dataLoading && title === 'OPEN' && (
                    <button className="flex items-center justify-center py-2 mt-1 text-slate-200 hover:bg-slate-700 rounded cursor-pointer w-full" onClick={onCreateTicket}>
                        <Plus size={14} className="mr-1" />
                        <span className="text-sm">Add Assembly Ticket</span>
                    </button>
                )}
            </div>
        </div>
    );
};

function AssemblyTicketListPage() {
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [filters, setFilters] = useState({});

    const { reportsEnabled } = useReportsToggle();

    const [columnsToRefresh, setColumnsToRefresh] = useState({
        'OPEN': false,
        'IN PROGRESS': false,
        'PARTIALLY CLOSED': false,
        'PENDING APPROVAL': false,
        'CLOSED': false
    });

    const handleCreateTicket = () => {
        setPopupName("Create Assembly Ticket");
        setPopup(true);
    };

    const handleTicketSubmit = async (ticketData) => {
        try {
            setLoading(true);
            const response = await api.post("/assembly/api/assembly-tickets/", ticketData);
            toast.success("Assembly ticket created!");
            setPopup(false);

            // Always refresh the OPEN column after creating a new ticket
            setColumnsToRefresh(prev => ({
                ...prev,
                'OPEN': !prev['OPEN']
            }));

            // Also refresh the specific status column if the ticket was created with a different status
            const statusKey = ticketData.status?.toUpperCase();
            if (statusKey && statusKey !== 'OPEN') {
                setColumnsToRefresh(prev => ({
                    ...prev,
                    [statusKey]: !prev[statusKey]
                }));
            }

            return response;
        } catch (error) {
            if (error.response && error.response.data) {
                const data = error.response.data;
                Object.entries(data).forEach(([field, messages]) => {
                    if (Array.isArray(messages)) {
                        messages.forEach((msg) => toast.error(`${field}: ${msg}`));
                    } else {
                        toast.error(`${field}: ${messages}`);
                    }
                });
            } else {
                toast.error(error.message || "Failed to create assembly ticket");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (ticketId, newStatus, currentStatus, refreshCallback) => {
        // Confirmation when moving to CLOSED
        if (newStatus === 'CLOSED') {
            const confirmed = window.confirm('Are you sure you want to close this assembly ticket? You will not be able to move it back without manager intervention.');
            if (!confirmed) {
                return;
            }
        }

        try {
            setStatusUpdating(true);
            await api.post(`/assembly/api/assembly-tickets/${ticketId}/change_status/`, {
                status: newStatus
            });

            if (refreshCallback) refreshCallback();

            setColumnsToRefresh(prev => ({
                ...prev,
                [newStatus]: !prev[newStatus]
            }));

            if (currentStatus && currentStatus !== newStatus) {
                setColumnsToRefresh(prev => ({
                    ...prev,
                    [currentStatus]: !prev[currentStatus]
                }));
            }

        } catch (error) {
            toast.error(error.message || "Failed to update assembly ticket status");
        } finally {
            setStatusUpdating(false);
        }
    };

    const getRandomSkeletonCount = () => Math.floor(Math.random() * (15 - 4 + 1)) + 4;

    return (
        <>


            {reportsEnabled ? (
                <SimpleFilter
                    showPrintOption={true}
                    onFilterChange={(newFilters) => {
                        setFilters(newFilters);
                    }}
                />

            ) : (
                <AdminTicketsFilter
                    showPrintOption={true}
                    onFilterChange={(newFilters) => {
                        setFilters(newFilters);
                    }}
                />
            )}

            <div className="h-[90%] overflow-hidden rounded-lg relative shadow-lg border border-gray-200">
                {/* Animated colorful background with custom animations */}
                <div 
                    className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 opacity-30"
                    style={{
                        animation: 'colorShift1 8s ease-in-out infinite'
                    }}
                ></div>
                <div 
                    className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 opacity-25"
                    style={{
                        animation: 'colorShift2 6s ease-in-out infinite',
                        animationDelay: '2s'
                    }}
                ></div>
                <div 
                    className="absolute inset-0 bg-gradient-to-bl from-yellow-400 via-pink-500 to-red-500 opacity-35"
                    style={{
                        animation: 'colorShift3 10s ease-in-out infinite',
                        animationDelay: '4s'
                    }}
                ></div>
                <div 
                    className="absolute inset-0 bg-gradient-to-tl from-green-400 via-teal-500 to-blue-600 opacity-20"
                    style={{
                        animation: 'colorShift4 7s ease-in-out infinite',
                        animationDelay: '1s'
                    }}
                ></div>
                
                {/* Add custom CSS animations */}
                <style jsx>{`
                    @keyframes colorShift1 {
                        0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
                        25% { opacity: 0.5; transform: scale(1.05) rotate(1deg); }
                        50% { opacity: 0.2; transform: scale(0.95) rotate(-1deg); }
                        75% { opacity: 0.4; transform: scale(1.02) rotate(0.5deg); }
                    }
                    @keyframes colorShift2 {
                        0%, 100% { opacity: 0.25; transform: scale(1) rotate(0deg); }
                        33% { opacity: 0.4; transform: scale(1.03) rotate(-1deg); }
                        66% { opacity: 0.15; transform: scale(0.98) rotate(1deg); }
                    }
                    @keyframes colorShift3 {
                        0%, 100% { opacity: 0.35; transform: scale(1) rotate(0deg); }
                        20% { opacity: 0.2; transform: scale(0.97) rotate(2deg); }
                        40% { opacity: 0.5; transform: scale(1.08) rotate(-1deg); }
                        60% { opacity: 0.25; transform: scale(1.02) rotate(1deg); }
                        80% { opacity: 0.4; transform: scale(0.95) rotate(-0.5deg); }
                    }
                    @keyframes colorShift4 {
                        0%, 100% { opacity: 0.2; transform: scale(1) rotate(0deg); }
                        50% { opacity: 0.45; transform: scale(1.06) rotate(-2deg); }
                    }
                `}</style>
                
                {/* Content layer */}
                <div className="relative z-10 h-full">
                {statusUpdating ? (
                    <Spinner />
                ) : (
                    <div className="flex overflow-x-auto gap-2 overflow-y-hidden flex-1 mb-2 h-full">
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
                    </div>
                )}
                </div>
            </div>

            {popupName === "Create Assembly Ticket" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <AssemblyTicketFormPopup
                        onclose={() => setPopup(false)}
                        onSubmit={handleTicketSubmit}
                        isSubmitting={loading}
                    />
                </PopupComponent>
            )}
        </>
    );
}

export default AssemblyTicketListPage; 