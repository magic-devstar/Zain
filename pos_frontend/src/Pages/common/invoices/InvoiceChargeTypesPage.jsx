import React, { useState, useEffect } from "react";
import { GoPlus, GoPencil, GoTrash, GoEye } from "react-icons/go";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";
import Spinner from "../../../Components/Common/Spinner";
import { invoiceChargeTypeAPI } from "../../../api/invoices";
import { toast } from "react-hot-toast";
import InvoiceChargeTypePopup from '../../../Components/popups/InvoiceChargeTypePopup';
import TableComponent from '../../../Components/Common/TableComponent';
import InvoiceChargeTypeFilter from '../../../Components/filters/InvoiceChargeTypeFilter';
import { PAGE_IDS } from "../../../utils/sortingUtils";

const InvoiceChargeTypesPage = () => {
  const [chargeTypes, setChargeTypes] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChargeType, setEditingChargeType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [filters, setFilters] = useState({ name: '', charge_type: '' });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Table columns
  const columns = [
    { name: 'Name', key: 'name', sortable: true },
    { name: 'Type', key: 'charge_type', sortable: true },
    { name: 'Value', key: 'value', sortable: true },
    { name: 'Status', key: 'status', sortable: true },
    { name: 'Actions', key: 'actions', sortable: false },
  ];

  // Table cells
  const cells = [
    ({ row }) => (
      <div>
        <div className="text-sm font-medium text-gray-900">{row.name}</div>
        {row.description && (
          <div className="text-sm text-gray-500">{row.description}</div>
        )}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm text-gray-900">
        {row.charge_type === 'FIXED' ? 'Fixed Amount' : 'Percentage'}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm text-gray-900">
        {row.charge_type === 'FIXED' ? `$${parseFloat(row.value).toFixed(2)}` : `${row.value}%`}
      </div>
    ),
    ({ row }) => (
      <div className="flex space-x-2">
        {row.is_compulsory && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Compulsory
          </span>
        )}
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{row.is_active ? 'Active' : 'Inactive'}</span>
      </div>
    ),
    ({ row }) => (
      <div className="flex space-x-2">
        <button
          onClick={() => handleEdit(row)}
          className="text-blue-600 hover:text-blue-900"
          title="Edit"
        >
          <GoPencil />
        </button>
        <button
          onClick={() => handleDelete(row.id)}
          className="text-red-600 hover:text-red-900"
          title="Delete"
        >
          <GoTrash />
        </button>
      </div>
    ),
  ];

  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingChargeType) {
        await invoiceChargeTypeAPI.updateChargeType(editingChargeType.id, formData);
        toast.success("Charge type updated successfully");
      } else {
        await invoiceChargeTypeAPI.createChargeType(formData);
        toast.success("Charge type created successfully");
      }
      setShowForm(false);
      setEditingChargeType(null);
      setRefreshToggle((prev) => !prev);
    } catch (error) {
      console.error("Error saving charge type:", error);
      toast.error("Failed to save charge type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (chargeType) => {
    setEditingChargeType(chargeType);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingChargeType(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this charge type?")) {
      return;
    }
    try {
      await invoiceChargeTypeAPI.deleteChargeType(id);
      toast.success("Charge type deleted successfully");
      setRefreshToggle((prev) => !prev);
    } catch (error) {
      console.error("Error deleting charge type:", error);
      toast.error("Failed to delete charge type");
    }
  };

  const handleSortChange = (newSortConfig) => {
    console.log('Invoice Charge Types sorting changed:', newSortConfig);
    setSortConfig(newSortConfig);
    setRefreshToggle((prev) => !prev);
  };

  // Filter UI
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Clear sorting when filters change to avoid confusion
    setSortConfig({ key: null, direction: 'asc' });
    setRefreshToggle((prev) => !prev);
  };

  return (
    <>

      {/* Filter */}
      <InvoiceChargeTypeFilter
        onFilterChange={handleFilterChange}
        initialFilters={filters}
      />

      {/* Charge Types List */}
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={chargeTypes}
        cells={cells}
        heading={"Charge Types"}
        description={"Manage charge types that can be applied to invoices"}
        createBtn={true}
        onCreateClick={handleAdd}
        EditClick={handleEdit}
        DeleteClick={handleDelete}
        actionIcons={false}
        apiEndpoint="/common/api/invoice-charge-types/"
        extraParams={{
          exclude: "MANUAL",
          ...filters,
          ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
        }}
        itemsPerPage={10}
        renderData={setChargeTypes}
        onLoadingChange={setDataLoading}
        refresh={refreshToggle}
        onSortChange={handleSortChange}
        pageId={PAGE_IDS.INVOICE_LIST}
      />

      {/* Form Modal */}
      <InvoiceChargeTypePopup
        popup={showForm}
        setPopup={setShowForm}
        initialData={editingChargeType}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />
    </>
  );
};

export default InvoiceChargeTypesPage; 