import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TableComponent from "../../Components/Common/TableComponent";
import { Flag, Paperclip } from "lucide-react";
import statusColors from '../../utils/statusColors';
import TicketsFilter from "../../Components/filters/TicketsFilter";


function TicketsPage() {
    const navigate = useNavigate();
    const [dataLoading, setDataLoading] = useState(true);
    const [tickets, setTickets] = useState([]);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [filters, setFilters] = useState({});

    const renderTickets = (ticketsData) => {
        setTickets(ticketsData);
    };

    const columns = [
        { name: "#ID", key: "id" },
        { name: "Title", key: "title" },
        { name: "Status", key: "status" },
        { name: "Flagged", key: "flagged" },
        { name: "Attachments", key: "attachments" },
        { name: "Created at", key: "created_at" },
        { name: "Assigned at", key: "assigned_at" },
        { name: "Actions", key: "actions" },
    ];

    const cells = [
        ({ row }) => (
            <div className="text-sm font-semibold cursor-pointer"
                onClick={() => navigate(`${row.id}`)}
            >#{row.id}</div>
        ),
        ({ row }) => (
            <div className="text-sm font-semibold cursor-pointer"
                onClick={() => navigate(`${row.id}`)}
            >{row.title}</div>
        ),
        ({ row }) => {
            return (
                <div
                    className={`px-3 py-1 text-xs font-medium rounded-full w-fit ${statusColors[row.status] || "bg-red-100 text-red-700 border border-red-300"
                        }`}
                >
                    {row.status}
                </div>
            );
        },
        ({ row }) => (
            <div className="ml-auto">
                {row?.flagged ? (
                    <Flag size={25} className="text-primary fill-primary" />
                ) : (
                    <Flag size={25} className="text-gray-400" />
                )}
            </div>
        ),
        ({ row }) => (
            <>
                <div className="flex items-center" data-btnbelowtooltip="Attachments">
                    <Paperclip size={14} className="mr-1" />
                    {row.attachment_count && (
                        <span>{row.attachment_count}</span>
                    )}
                </div>
            </>
        ),
        ({ row }) => (
            <div className="text-sm font-medium text-gray-700">
                {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }).format(new Date(row.created_at))}
            </div>
        ),
        ({ row }) => (
            <div className="text-sm font-medium text-gray-700">
                {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }).format(new Date(row.assigned_at))}
            </div>
        ),
    ];


    return (
        <>
            <TicketsFilter
                hideTechnicianStatuses={true}
                onFilterChange={(newFilters) => {
                    setFilters(newFilters);
                    setRefreshToggle(prev => !prev);
                }} />

            <TableComponent
                dataloading={dataLoading}
                columns={columns}
                data={tickets}
                cells={cells}
                heading="All Assigned tickets"
                description="Manage your assigned tickets here."
                actionIcons={true}
                hideDeleteBtn={true}
                EditClick={(ticket) => navigate(`edit/${ticket.id}`)}
                apiEndpoint="/common/api/tickets/"
                extraParams={filters}
                itemsPerPage={10}
                renderData={renderTickets}
                onLoadingChange={setDataLoading}
                refresh={refreshToggle}
            />
        </>
    );
}

export default TicketsPage;