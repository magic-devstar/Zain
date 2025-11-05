import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from 'react-hot-toast';
import TableComponent from "../../Components/Common/TableComponent";
import { Flag } from "lucide-react";
import PopupComponent from "../../Components/popups/PopupComponent";
import TicketFormPopup from "../../Components/popups/TicketFormPopup";
import { createTicket, deleteTicket, updateTicket } from "../../utils/apis/ticketUtils";
import TicketsFilter from "../../Components/filters/TicketsFilter";
import statusColors from '../../utils//statusColors';
import { useSelector } from 'react-redux';

function TicketsPage() {
    const navigate = useNavigate();
    const [dataLoading, setDataLoading] = useState(true);
    const [tickets, setTickets] = useState([]);
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [TicketDetails, setTicketDetails] = useState(null);
    const [filters, setFilters] = useState({});
    const { serviceCustomerId } = useParams();
    const user = useSelector((state) => state.user.user);
    const isManager = user?.role === "Manager";

    const renderTickets = (ticketsData) => {
        setTickets(ticketsData);
    };

    const handleCreateTicket = () => {
        setPopupName("Create Ticket");
        setPopup(true);
    };


    const handleTicketSubmit = async (ticketData) => {
        try {
            setLoading(true);
            setRefreshToggle(false);
            const response = await createTicket(ticketData);
            toast.success("Ticket created!");
            setRefreshToggle(true);
            return response;
        } catch (error) {
            toast.error(error.message || "Failed to create ticket");
        } finally {
            setLoading(false);
        }
    };

    const handleEditticket = (ticket) => {
        setTicketDetails(ticket);
        setPopupName("Edit Ticket");
        setPopup(true);
    };

    const handleEditTicketSubmit = async (updatedData) => {
        try {
            setRefreshToggle(false);
            const response = await updateTicket(updatedData, TicketDetails.id); // Call the updateTicket function
            console.log("Ticket updated successfully", response);
            setRefreshToggle(true);
            // Optionally, handle successful update (e.g., redirect or show success message)
        } catch (error) {
            console.error("Error updating ticket", error);
            // Optionally, show error message to the user
        }
    };

    const handleDeleteTicket = async (ticketId) => {
        try {
            setRefreshToggle(false);
            let response;
            response = await deleteTicket(ticketId);
            setRefreshToggle(true);
            return response;
        } catch (error) {
            toast.error(error.message || "Failed to delete ticket");
        }
    };
    const columns = [
        { name: "#ID", key: "id" },
        { name: "Title", key: "title" },
        { name: "Created at", key: "created_at" },
        { name: "Status", key: "status" },
        { name: "Flagged", key: "flagged" },
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
        ({ row }) => (
            <div className="text-sm font-medium text-gray-700">
                {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }).format(new Date(row.created_at))}
            </div>
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
        )
    ];


    return (
        <>
            {user?.role !== "Employee" && (
                <TicketsFilter onFilterChange={(newFilters) => {
                    setFilters(newFilters);
                    setRefreshToggle(prev => !prev);
                }} />
            )}
            <TableComponent
                dataloading={dataLoading}
                columns={columns}
                data={tickets}
                cells={cells}
                heading="All tickets"
                description="Create and manage your tickets here."
                createBtn={true}
                onCreateClick={handleCreateTicket}
                apiEndpoint="/common/api/tickets/"
                extraParams={{
                    ...(serviceCustomerId ? { user_id: serviceCustomerId } : {}),
                    ...filters,
                }}
                itemsPerPage={10}
                renderData={renderTickets}
                EditClick={(ticket) => handleEditticket(ticket)}
                DeleteClick={(ticketId) => handleDeleteTicket(ticketId)}
                onLoadingChange={setDataLoading}
                refresh={refreshToggle}
            />

            {popupName === "Create Ticket" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <TicketFormPopup
                        loading={loading}
                        onSubmit={handleTicketSubmit}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}
            {popupName === "Edit Ticket" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <TicketFormPopup
                        loading={loading}
                        initialData={TicketDetails}
                        onSubmit={handleEditTicketSubmit}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}
        </>
    );
}

export default TicketsPage;