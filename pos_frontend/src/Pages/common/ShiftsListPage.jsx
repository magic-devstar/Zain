import React, { useState, useMemo } from "react";
import TableComponent from "../../Components/Common/TableComponent";
import SimpleFilter from "../../Components/filters/SimpleFilter";
import ShiftEditPopup from "../../Components/popups/ShiftEditPopup";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { PAGE_IDS } from "../../utils/sortingUtils";
import useReportsToggle from "../../utils/useReportsToggle";

function ShiftsListPage() {
  const [shifts, setShifts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [loading, setLoading] = useState(false);
  const { reportsEnabled } = useReportsToggle();
  const renderShifts = (shiftData) => {
    setShifts(shiftData);
  };

  const handleEditClick = (shift) => {
    setSelectedShift(shift);
    setShowEditPopup(true);
  };

  const hideEditBtn = (shift) => {
    // Hide edit button for active shifts (when end_time is null)
    return !shift.end_time;
  };

  const handleEditSubmit = async (formData) => {
    try {
      setLoading(true);
      await api.patch(`/common/api/shifts/${selectedShift.id}/`, formData);
      toast.success("Shift updated successfully!");
      setShowEditPopup(false);
      setSelectedShift(null);
      setRefreshToggle(prev => !prev);
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;
        if (typeof data === 'object') {
          Object.entries(data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(`${field}: ${msg}`));
            } else {
              toast.error(`${field}: ${messages}`);
            }
          });
        } else {
          toast.error(data);
        }
      } else {
        toast.error(error.message || "Failed to update shift");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (durationStr) => {
    if (!durationStr) {
      return '';
    }

    // Handle Django duration format: "2 09:00:00" (days HH:MM:SS)
    const parts = durationStr.split(' ');
    let days = 0;
    let timePart = '0:0:0';

    if (parts.length === 2) {
      // Format: "2 09:00:00" (days HH:MM:SS)
      days = parseInt(parts[0], 10);
      timePart = parts[1];
    } else if (parts.length === 1) {
      // Format: "09:00:00" (HH:MM:SS) - no days
      timePart = parts[0];
    }

    const timeSegments = timePart.split(':');
    const hours = parseInt(timeSegments[0], 10);
    const minutes = parseInt(timeSegments[1], 10);
    const seconds = parseInt(timeSegments[2], 10);

    const resultParts = [];
    if (days > 0) {
      resultParts.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    if (hours > 0) {
      resultParts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
      resultParts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }
    if (seconds > 0 && days === 0 && hours === 0 && minutes === 0) {
      resultParts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
    }

    if (resultParts.length === 0) {
      return '0 minutes';
    }

    if (resultParts.length === 1) {
      return resultParts[0];
    }

    const lastPart = resultParts.pop();
    return `${resultParts.join(', ')} and ${lastPart}`;
  };

  const handleSortChange = (newSortConfig) => {
    console.log('Shifts sorting changed:', newSortConfig);
    setSortConfig(newSortConfig);
    setRefreshToggle(prev => !prev);
  };

  const columns = useMemo(() => {
    return [
      { name: "User", key: "user", sortable: true },
      { name: "Start Time", key: "start_time", sortable: true },
      { name: "End Time", key: "end_time", sortable: true },
      { name: "Duration", key: "duration", sortable: true },
      { name: "Actions", key: "actions", sortable: false },
    ];
  }, []);

  const cells = useMemo(() => {
    return [
      ({ row }) => <div className="text-sm font-semibold">{row.user}</div>,
      ({ row }) => <div className="text-sm">{new Date(row.start_time).toLocaleString()}</div>,
      ({ row }) => <div className="text-sm">{row.end_time ? new Date(row.end_time).toLocaleString() : 'Active'}</div>,
      ({ row }) => <div className="text-sm">{formatDuration(row.duration)}</div>,
    ];
  }, []);

  return (
    <>
      {reportsEnabled && (
        <SimpleFilter
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            // Clear sorting when filters change to avoid confusion
            setSortConfig({ key: null, direction: 'asc' });
            setRefreshToggle(prev => !prev);
          }}
        />
      )}
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={shifts}
        cells={cells}
        heading="Shifts List"
        description="Here are all the shifts."
        apiEndpoint="/common/api/shifts/"
        extraParams={{
          ...filters,
          ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
        }}
        itemsPerPage={10}
        renderData={renderShifts}
        onLoadingChange={setDataLoading}
        refresh={refreshToggle}
        actionIcons={true}
        hideDeleteBtn={true}
        hideEditBtn={hideEditBtn}
        EditClick={handleEditClick}
        onSortChange={handleSortChange}
        pageId={PAGE_IDS.SHIFT_LIST}
      />

      {/* Edit Shift Popup */}
      <ShiftEditPopup
        shift={selectedShift}
        popup={showEditPopup}
        setPopup={setShowEditPopup}
        loading={loading}
        onSubmit={handleEditSubmit}
      />
    </>
  );
}

export default ShiftsListPage; 