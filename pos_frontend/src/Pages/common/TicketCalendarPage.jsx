import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';

import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, ChevronLeft, ChevronRight, Loader, Clock } from 'lucide-react';
import Avatar from '../../Components/Common/Avatar';
import { useNavigate } from 'react-router-dom';
import PrimaryBtn from '../../Components/Common/PrimaryBtn';

export default function TicketCalendarPage() {
    const navigate = useNavigate();
    
    // Use network time consistently - no timezone conversion
    const getNetworkTime = () => {
        // Always use the current date as-is, no timezone conversion
        return new Date();
    };
    
    // Custom isToday function that uses network time
    const isTodayNetwork = (date) => {
        const today = new Date();
        const dateToCheck = new Date(date);
        return format(dateToCheck, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    };
    
    const [currentDate, setCurrentDate] = useState(getNetworkTime());
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch tickets for the current month
    useEffect(() => {
        const fetchTickets = async () => {
            try {
                setIsLoading(true);
                const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
                const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
                
                const response = await api.get("/common/api/tickets/", {
                    params: {
                        all: true,
                        start_date: startDate,
                        end_date: endDate,
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
                setTickets(response.data);
            } catch (error) {
                console.error('Error fetching tickets:', error);
                toast.error('Failed to fetch tickets');
            } finally {
                setIsLoading(false);
            }
        }; 

        fetchTickets();
    }, [currentDate]);

    // Get all days in current month
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
    });

    // Get the first day of the month to determine padding
    const firstDayOfMonth = startOfMonth(currentDate);
    const firstDayWeekday = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Create padding days for the first week if needed
    const paddingDays = [];
    for (let i = 0; i < firstDayWeekday; i++) {
        paddingDays.push(null);
    }
    
    // Combine padding days with actual month days
    const allDays = [...paddingDays, ...daysInMonth];

    // Group tickets by date using deadline (fallback to created_at) - NETWORK TIME
    const ticketsByDate = tickets.reduce((acc, ticket) => {
        const dateString = ticket.deadline ?? ticket.created_at; // prefer deadline
        
        let date;
        
        if (ticket.deadline) {
            // For deadline, use the date as-is (network time)
            // The deadline is already in the correct date format from the server
            date = ticket.deadline; // Use the deadline string directly
        } else {
            // For created_at, format the date consistently
            const ticketDate = new Date(dateString);
            date = format(ticketDate, 'yyyy-MM-dd');
        }
        
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(ticket);
        return acc;
    }, {});

    const nextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const prevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    return (
        <div>
            {/* Calendar Header */}
            <div className="mb-4 md:mb-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <h1 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="h-5 w-5 md:h-6 md:w-6" />
                        Technician Schedule
                    </h1>
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={prevMonth}
                            className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        <h2 className="text-base md:text-xl font-semibold text-gray-700 min-w-[140px] text-center">
                            {format(currentDate, 'MMMM yyyy')}
                        </h2>
                        <button
                            onClick={nextMonth}
                            className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        <PrimaryBtn
                            onClick={() => navigate('/today-tickets')}
                            className="flex items-center gap-2 text-sm"
                        >
                            <Clock className="h-4 w-4" />
                            Today's Tickets
                        </PrimaryBtn>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-96">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto pb-4">
                    <div className="min-w-[768px]">
                        <div className="grid grid-cols-7 gap-2 md:gap-4 p-2">
                            {/* Day headers */}
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div
                                    key={day}
                                    className="text-center font-semibold text-gray-600 pb-2 text-sm md:text-base"
                                >
                                    {day}
                                </div>
                            ))}

                            {/* Calendar days */}
                            {allDays.map((date, index) => {
                                // Handle padding days (null values)
                                if (date === null) {
                                    return (
                                        <div
                                            key={`padding-${index}`}
                                            className="relative flex flex-col p-1.5 md:p-2 rounded-lg border min-h-[100px] md:min-h-[120px] bg-gray-50 border-gray-100"
                                        >
                                            <div className="flex items-center justify-between mb-1 md:mb-2 bg-inherit border-b pb-1 md:pb-2">
                                                <span className="text-xs md:text-sm font-medium text-gray-300 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                                                    &nbsp;
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }

                                const dateStr = format(date, 'yyyy-MM-dd');
                                const dayTickets = ticketsByDate[dateStr] || [];
                                const isCurrentMonth = isSameMonth(date, currentDate);
                                const isCurrentDay = isTodayNetwork(date);

                                return (
                                    <div
                                        key={dateStr}
                                        className={`relative flex flex-col p-1.5 md:p-2 rounded-lg border min-h-[100px] md:min-h-[120px] ${
                                            isCurrentMonth
                                                ? 'bg-white border-gray-200'
                                                : 'bg-gray-50 border-gray-100'
                                        } ${
                                            isCurrentDay
                                                ? 'ring-2 ring-primary ring-offset-2'
                                                : ''
                                        } ${dayTickets.length > 0 ? 'shadow-sm' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-1 md:mb-2 bg-inherit border-b pb-1 md:pb-2">
                                            <span
                                                className={`text-xs md:text-sm font-medium px-2 md:px-3 py-0.5 md:py-1 rounded-full ${
                                                    isCurrentMonth
                                                        ? 'bg-primary_light text-white'
                                                        : 'bg-gray-200 text-gray-400'
                                                }`}
                                            >
                                                {format(date, 'd')}
                                            </span>
                                            {dayTickets.length > 0 && (
                                                <span className="text-[10px] md:text-xs">
                                                    {dayTickets.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Tickets container */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                                            <div className="space-y-1 md:space-y-2">
                                                {dayTickets.map((ticket) => (
                                                    <div
                                                        key={ticket.id}
                                                        onClick={() => {
                                                            navigate(`tickets/${ticket.id}`);
                                                        }}
                                                        className={`p-1.5 md:p-2 rounded text-[10px] md:text-xs ${
                                                            ticket.status === 'OPEN'
                                                                ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
                                                                : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
                                                        } transition-colors duration-200`}
                                                    >
                                                        <div className="font-medium text-gray-800">
                                                            #{ticket.id} - {ticket.title.length > 15 ? `${ticket.title.substring(0, 15)}...` : ticket.title}
                                                        </div>
                                                        <div className="text-gray-600">
                                                            {ticket.assigned_to_users.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {ticket.assigned_to_users.map((user, index) => (
                                                                        <div key={user.id} className="flex items-center gap-1">
                                                                            <Avatar user={user} size="xs" />
                                                                            <span className="truncate max-w-[60px] md:max-w-[80px]">{user.username}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 italic text-[10px] md:text-xs">Unassigned</span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 flex items-center justify-between">
                                                            <span
                                                                className={`px-1 md:px-1.5 py-0.5 rounded-full text-[8px] md:text-[10px] ${
                                                                    ticket.status === 'OPEN'
                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                        : 'bg-blue-100 text-blue-800'
                                                                }`}
                                                            >
                                                                {ticket.status}
                                                            </span>
                                                            {ticket.attachment_count > 0 && (
                                                                <span className="text-[8px] md:text-[10px] text-gray-500">
                                                                    📎 {ticket.attachment_count}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Add custom scrollbar styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 2px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94A3B8;
                }

                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #CBD5E1 transparent;
                }
            `}</style>
        </div>
    );
} 