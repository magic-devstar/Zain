import React, { useState, useMemo } from "react";
import TableComponent from "../../../Components/Common/TableComponent";
import api from "../../../utils/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import TransfersFilter from "../../../Components/filters/TransfersFilter";
import { useSelector } from 'react-redux';
import { PAGE_IDS } from "../../../utils/sortingUtils";
import useReportsToggle from "../../../utils/useReportsToggle";
function Transferspage() {
  const user = useSelector((state) => state.user.user);
  const isManager = user?.role === "Manager";
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [printing, setPrinting] = useState(false);
  const { reportsEnabled } = useReportsToggle();
  const renderTransfers = (transferData) => {
    setTransfers(transferData);
  };

  const handleCreateTransfer = () => {
    console.log("Creating new transfer");
    navigate("create");
  }

  const handleDeleteTransfer = async (transferId) => {
    try {
      setRefreshToggle(false);
      await api.delete(`/common/api/transfers/${transferId}/`);
      toast.success("Transfer deleted!");
      setRefreshToggle(true);
    } catch (error) {
      toast.error(error.message || "Failed to delete transfer");
    }
  };

  const handleSortChange = (newSortConfig) => {
    console.log('Transfers sorting changed:', newSortConfig);
    setSortConfig(newSortConfig);
    setRefreshToggle(prev => !prev);
  };

  const handlePrintReport = async (currentFilters = filters) => {
    try {
      setPrinting(true);

      const params = { ...currentFilters, all: true };
      Object.keys(params).forEach((k) => { if (params[k] === "" || params[k] === null) delete params[k]; });

      const { data: allTransfers } = await api.get("/common/api/transfer/", { params });

      if (!allTransfers || allTransfers.length === 0) { toast.error("No transfers found for selected filters"); return; }

      // Build rows with a separate items section
      const htmlRows = allTransfers.map(t => {
        const mainRow = `<tr class="transfer-row">
            <td>#${t.id}</td>
            <td>${t.transfer_type.replace(/_/g, ' ')}</td>
            <td>${t.source_name}</td>
            <td>${t.destination_name}</td>
            <td>${new Date(t.created_at).toLocaleString()}</td>
            <td>${t.items.length}</td>
        </tr>`;

        const itemsRows = t.items && t.items.length ? t.items.map(it => `<tr><td>${it.id}</td><td>${it.inventory__name}</td><td>${it.inventory__upc}</td><td>${it.status}</td></tr>`).join('') : `<tr><td colspan="4">No items</td></tr>`;

        const itemsSection = `<tr class="items-section"><td colspan="6"><div class="items-wrapper"><strong>Transferred Items:</strong><table class="items-table"><thead><tr><th>ID</th><th>Name</th><th>UPC</th><th>Status</th></tr></thead><tbody>${itemsRows}</tbody></table></div></td></tr>`;

        return mainRow + itemsSection;
      }).join("\n");

      const iframe = document.createElement('iframe'); iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      const htmlContent = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Transfers Report</title><style>
        body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:40px;background:#f9fafb;color:#1f2937;line-height:1.6;}
        .container{max-width:1000px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1);padding:30px;border:1px solid #e5e7eb;}
        .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0060AC;padding-bottom:20px;margin-bottom:30px;}
        .header img{max-width:130px;height:auto;}
        .company-info{text-align:right;}
        .report-title{font-size:32px;font-weight:800;color:#0060AC;margin:0 0 10px 0;text-transform:uppercase;}
        table{width:100%;border-collapse:collapse;margin-bottom:30px;}
        th,td{padding:10px 12px;text-align:left;font-size:14px;}
        th{background:#0060AC;color:#fff;}
        td{border-bottom:1px solid #e5e7eb;}
        .items-wrapper{border:1px solid #e5e7eb;border-radius:6px;padding:10px;background:#f9fafb;margin-top:6px;}
        .items-table{width:100%;border-collapse:collapse;margin-top:6px;}
        .items-table th,.items-table td{padding:6px 8px;font-size:13px;}
        .items-table th{background:#e5e7eb;}
        .transfer-row td{background:#fff;}
        .items-section td{background:#fcfcfc;}
        @media print{body{padding:0;background:#fff;}.container{box-shadow:none;border:none;}}
      </style></head><body><div class='container'><div class='header'><img src='/assets/images/logo.png'/><div class='company-info'><h2>T Technologies INC</h2><p>720 Cotton Farm Rd, Pinetops, NC 27864</p></div></div><h1 class='report-title'>Transfers Report</h1><table><thead><tr><th>ID</th><th>Type</th><th>Source</th><th>Destination</th><th>Created At</th><th>Item Count</th></tr></thead><tbody>${htmlRows}</tbody></table></div></body></html>`;
      doc.write(htmlContent); doc.close();
      iframe.onload = () => { setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 300); };
    } catch (err) { console.error(err); toast.error(err.message || 'Failed to generate transfers report'); } finally { setPrinting(false); }
  }

  const columns = useMemo(() => [
    { name: "Transfer ID", key: "id", sortable: true },
    { name: "Type", key: "transfer_type", sortable: true },
    { name: "Source", key: "source_name", sortable: true },
    { name: "Destination", key: "destination_name", sortable: true },
    { name: "Created At", key: "created_at", sortable: true },
    { name: "Item Count", key: "item_count", sortable: true },
  ], []);

  const cells = useMemo(() => [
    ({ row }) => (
      <div
        className="text-sm"
        onClick={() => navigate(`${row.id}`)}
      >
        #{row.id}
      </div>
    ),
    ({ row }) => <div className="text-sm" onClick={() => navigate(`${row.id}`)} >{row.transfer_type.replace(/_/g, " ")}</div>,
    ({ row }) => <div className="text-sm" onClick={() => navigate(`${row.id}`)} >{row.source_name}</div>,
    ({ row }) => <div className="text-sm" onClick={() => navigate(`${row.id}`)} >{row.destination_name}</div>,
    ({ row }) => <div className="text-sm">{new Date(row.created_at).toLocaleString()}</div>,
    ({ row }) => <div className="text-sm">{row.items.length}</div>,
  ], [navigate]);

  return (
    <>
      {reportsEnabled && (
        <TransfersFilter
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            // Clear sorting when filters change to avoid confusion
            setSortConfig({ key: null, direction: 'asc' });
            setRefreshToggle(prev => !prev);
          }}
          onPrintClick={handlePrintReport}
          showPrintOption={true}
          printing={printing}
        />
      )}
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={transfers}
        cells={cells}
        heading="Transfers List"
        description="View and manage all transfers here."
        createBtn={true}
        onCreateClick={handleCreateTransfer}
        apiEndpoint="/common/api/transfer/"
        extraParams={{
          ...filters,
          ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
        }}
        itemsPerPage={10}
        hideDeleteBtn={isManager}
        renderData={renderTransfers}
        onLoadingChange={setDataLoading}
        DeleteClick={handleDeleteTransfer}
        EditClick={(transfer) => navigate(`edit/${transfer.id}`)}
        refresh={refreshToggle}
        onSortChange={handleSortChange}
        pageId={PAGE_IDS.TRANSFER_LIST}
      />
    </>
  );
}

export default Transferspage;