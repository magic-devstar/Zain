import statusColors from '../../utils/statusColors';
import dayjs from "dayjs"; // for formatting dates

const PrintableTicketContent = ({ tickets }) => {
    return (
        <div className="print-container">
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-container, .print-container * {
                        visibility: visible;
                    }
                    .print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .page-break {
                        page-break-after: always;
                    }
                    .ticket-item {
                        break-inside: avoid;
                    }
                }
                `}
            </style>
            <h1 className="text-2xl font-bold mb-6 text-center">Tickets Report</h1>
            <p className="text-gray-500 text-center mb-8">Generated on {new Date().toLocaleDateString()}</p>

            {tickets.map((ticket, index) => (
                <div key={ticket.id} className="ticket-item mb-6 pb-4 border-b border-gray-300">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="text-lg font-semibold">#{ticket.id}: {ticket.title}</h2>
                        <span className={`px-2 py-1 rounded-full text-xs ${statusColors[ticket.status]} bg-opacity-20`}>
                            {ticket.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                            <p className="text-gray-600 text-sm">Created by: {ticket.created_by || 'N/A'}</p>
                            <p className="text-gray-600 text-sm">Created on: {dayjs(ticket.created_at).format("MMM D, YYYY")}</p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">
                                Deadline: {ticket.deadline ? dayjs(ticket.deadline).format("MMM D, YYYY") : 'N/A'}
                            </p>
                            <p className="text-gray-600 text-sm">
                                Assigned to: {ticket.assigned_to_users && ticket.assigned_to_users.length > 0
                                    ? ticket.assigned_to_users.map(user => user.username).join(', ')
                                    : 'Unassigned'}
                            </p>
                        </div>
                    </div>

                    {/* Add page break every 4 tickets */}
                </div>
            ))}
        </div>
    );
};

export default PrintableTicketContent;