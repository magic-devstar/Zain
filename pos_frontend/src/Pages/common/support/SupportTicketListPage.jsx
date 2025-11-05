import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TableComponent from "../../../Components/Common/TableComponent";
import SimpleFilter from "../../../Components/filters/SimpleFilter";
import useReportsToggle from "../../../utils/useReportsToggle";
function SupportTicketListPage() {
  const [tickets, setTickets] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [refreshToggle, setRefreshToggle] = useState(false);
  const navigate = useNavigate();
  const { reportsEnabled } = useReportsToggle();
  const renderTickets = (ticketData) => {
    setTickets(ticketData);
  };

  const columns = useMemo(() => {
    return [
      { name: "ID", key: "id" },
      { name: "Title", key: "title" },
      { name: "Type", key: "type" },
      { name: "Created By", key: "created_by" },
      { name: "Created At", key: "created_at" },
    ];
  }, []);

  const cells = useMemo(() => {
    return [
      ({ row }) => <div className="text-sm font-semibold cursor-pointer" onClick={() => navigate(`${row.id}`)}>#{row.id}</div>,
      ({ row }) => <div className="text-sm">{row.title}</div>,
      ({ row }) => <div className="text-sm">{row.type}</div>,
      ({ row }) => <div className="text-sm">{row.created_by?.username || 'N/A'}</div>,
      ({ row }) => <div className="text-sm">{new Date(row.created_at).toLocaleString()}</div>,
    ];
  }, [navigate]);

  return (
    <>
      {reportsEnabled && (
        <SimpleFilter
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setRefreshToggle(prev => !prev);
          }}
        />
      )}
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={tickets}
        cells={cells}
        heading="Support Tickets"
        description="Here are all the support tickets."
        apiEndpoint="/common/api/support-tickets/"
        extraParams={filters}
        itemsPerPage={10}
        renderData={renderTickets}
        onLoadingChange={setDataLoading}
        refresh={refreshToggle}
      />
    </>
  );
}

export default SupportTicketListPage; 