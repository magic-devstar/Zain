import React, { useState, useMemo } from "react";
import TableComponent from "../../../Components/Common/TableComponent";
import api from "../../../utils/api";
import { useNavigate } from "react-router-dom";
import PopupComponent from "../../../Components/popups/PopupComponent";
import WarehouseFormPopup from "../../../Components/popups/WarehouseFormPopup";
import toast from "react-hot-toast";
import LocationsFilter from "../../../Components/filters/LocationsFilter";
import { useSelector } from 'react-redux';
import DeleteConfirmationModal from "../../../Components/popups/DeleteConfirmationModal";
import { PAGE_IDS } from "../../../utils/sortingUtils";
import useReportsToggle from "../../../utils/useReportsToggle";

function WarehouseListpage() {
  const user = useSelector((state) => state.user.user);
  const isAdmin = user?.role === "Admin";
  const isWarehouseManager = user?.role === "Warehouse Manager";
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [popup, setPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [warehouseDetails, setWarehouseDetails] = useState(null);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState(null);
  const { reportsEnabled } = useReportsToggle();
  const renderWarehouses = (warehouseData) => {
    setWarehouses(warehouseData);
  };

  const handleCreateWarehouse = () => {
    setPopupName("Create Warehouse");
    setPopup(true);
  };

  const handleWarehousesubmit = async (warehouseData) => {
    try {
      setLoading(true);
      setRefreshToggle(false);
      const response = await api.post("/common/api/warehouses/", warehouseData);
      setRefreshToggle(true);
      toast.success("Warehouse created!");
      return response;
    } catch (error) {
      toast.error(error.message || "Failed to create Warehouse");
    } finally {
      setLoading(false);
    }
  };

  const handleEditWarehouse = (warehouse) => {
    setWarehouseDetails(warehouse);
    setPopupName("Edit Warehouse");
    setPopup(true);
  };

  const handleEditWarehouseSubmit = async (updatedData) => {
    try {
      setRefreshToggle(false);
      const response = await api.patch(`/common/api/warehouses/${warehouseDetails.id}/`, updatedData);
      toast.success("Warehouse updated successfully", response);
      setRefreshToggle(true);
    } catch (error) {
      console.error("Error updating Warehouse", error);
    }
  };

  const handleDeleteClick = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    setWarehouseToDelete(warehouseId);
    setDeleteModalOpen(true);
  };

  const handleSortChange = (newSortConfig) => {
    console.log('Warehouse sorting changed:', newSortConfig);
    setSortConfig(newSortConfig);
    setRefreshToggle(prev => !prev);
  };

  const handleDeletewarehouse = async () => {
    try {
      setRefreshToggle(false);
      const response = await api.delete(`/common/api/warehouses/${warehouseToDelete}/`);
      toast.success('Warehouse deleted successfully!');
      setRefreshToggle(true);
      setDeleteModalOpen(false);
      setWarehouseToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting warehouse");
    }
  };

  const baseColumns = [
    { name: "Name", key: "name", sortable: true },
    { name: "Status", key: "status", sortable: true },
    { name: "Managers", key: "managers", sortable: false },
  ];

  const columns = isAdmin ? [...baseColumns, { name: "Actions", key: "actions" }] : baseColumns;

  const cells = [
    ({ row }) => (
      <div className="text-sm font-semibold cursor-pointer"
        onClick={() => navigate(`${row.id}`)}
      >{row.name}</div>
    ),
    ({ row }) => (
      <div
        className={`px-3 py-1 text-xs font-medium rounded-full w-fit
    ${row.status === "active"
            ? "bg-green-100 text-green-700 border border-green-300"
            : "bg-red-100 text-red-700 border border-red-300"
          }`}
      >
        {row.status === "active" ? "Active" : "Inactive"}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm font-medium text-gray-700">
        {row.warehouse_managers?.length > 0 ? `${row.warehouse_managers.length} manager(s)` : "No managers"}
      </div>
    )

  ];

  return (
    <>
      {reportsEnabled && (
        <LocationsFilter
          title="Location"
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            // Clear sorting when filters change to avoid confusion
            setSortConfig({ key: null, direction: 'asc' });
            setRefreshToggle(prev => !prev);
          }} />
      )}
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={warehouses}
        cells={cells}
        heading="Warehouse List"
        description="Create and manage your warehouses here."
        onCreateClick={handleCreateWarehouse}
        createBtn={!isWarehouseManager}
        actionIcons={isAdmin}
        apiEndpoint="/common/api/warehouses/"
        itemsPerPage={10}
        EditClick={isAdmin ? handleEditWarehouse : undefined}
        DeleteClick={isAdmin ? handleDeleteClick : undefined}
        extraParams={{
          ...filters,
          ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
        }}
        hideCreateBtn={!isAdmin}
        hideEditBtn={!isAdmin}
        hideDeleteBtn={!isAdmin}
        renderData={renderWarehouses}
        onLoadingChange={setDataLoading}
        refresh={refreshToggle}
        onSortChange={handleSortChange}
        pageId={PAGE_IDS.WAREHOUSE_LIST}
      />
      {popupName === "Create Warehouse" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <WarehouseFormPopup
            loading={loading}
            onSubmit={handleWarehousesubmit}
            onClose={() => setPopup(false)}
          />
        </PopupComponent>
      )}
      {popupName === "Edit Warehouse" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <WarehouseFormPopup
            loading={loading}
            warehouse={warehouseDetails}
            onSubmit={handleEditWarehouseSubmit}
            onClose={() => setPopup(false)}
          />
        </PopupComponent>
      )}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setWarehouseToDelete(null);
        }}
        onConfirm={handleDeletewarehouse}
        itemName={warehouses.find(w => w.id === warehouseToDelete)?.name || ''}
        itemType="Warehouse"
      />
    </>
  );
}

export default WarehouseListpage;
