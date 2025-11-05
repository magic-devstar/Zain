import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../../utils/api";
import Spinner from "../../../Components/Common/Spinner";
import AttachmentViewer from "../../../Components/Common/AttachmentViewer";
import BackButton from "../../../Components/Common/BackButton";

const SupportTicketDetailsPage = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicketData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/common/api/support-tickets/${ticketId}/`);
        setTicket(response.data);
      } catch (error) {
        console.error("Failed to fetch support ticket data", error);
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      fetchTicketData();
    }
  }, [ticketId]);

  if (loading) {
    return <Spinner />;
  }

  if (!ticket) {
    return <div>Ticket not found</div>;
  }

  return (
    <div className="">
      <div className="flex gap-2 items-center mb-6">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold break-all">{ticket.title}</h1>
          <p className="text-gray-600">
            Created by {ticket.created_by?.username || "Unknown"} on {new Date(ticket.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Ticket ID</p>
            <p>{ticket.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Ticket Type</p>
            <p>{ticket.type}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500">Description</p>
          <p className="whitespace-pre-wrap">{ticket.description}</p>
        </div>
        <AttachmentViewer attachments={ticket.attachments} />
      </div>
    </div>
  );
};

export default SupportTicketDetailsPage; 