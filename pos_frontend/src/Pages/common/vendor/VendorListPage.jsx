import { useState, useMemo } from "react";
import TableComponent from "../../../Components/Common/TableComponent";
import api from "../../../utils/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import SimpleFilter from "../../../Components/filters/SimpleFilter";
import VendorFormPopup from "../../../Components/popups/VendorformPopup";
import PopupComponent from "../../../Components/popups/PopupComponent";
import { useSelector } from 'react-redux';
import { PAGE_IDS } from "../../../utils/sortingUtils";
import useReportsToggle from "../../../utils/useReportsToggle";

function VendorListPage() {
  const navigate = useNavigate();
  const [Vendor, setVendor] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [VendorDetails, setVendorDetails] = useState(null);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const user = useSelector((state) => state.user.user);
  const isManager = user?.role === "Manager";
  const { reportsEnabled } = useReportsToggle();
  const renderVendor = (VendortData) => {
    setVendor(VendortData);  // Update tickets data with the fetched data
  };

  const handleCreateVendor = () => {
    setPopupName("Create Vendor");
    setPopup(true);
  };

  const handleVendorSubmit = async (VendorData) => {
    try {
      setLoading(true);
      setRefreshToggle(false);
      const response = await api.post("/common/api/vendors/", VendorData);
      setRefreshToggle(true);
      setPopup(false);
      toast.success("Vendor Created!");
      return response;
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;

        // Show all field-level errors from DRF
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => toast.error(`${field}: ${msg}`));
          } else {
            toast.error(`${field}: ${messages}`);
          }
        });
      } else {
        toast.error(error.message || "Failed to create Vendor Item");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditVendor = (Vendor) => {
    setVendorDetails(Vendor);
    setPopupName("Edit Vendor");
    setPopup(true);
  };

  const handleEditVendorSubmit = async (updatedData) => {
    try {
      setRefreshToggle(false);
      setLoading(true);
      const response = await api.patch(`/common/api/vendors/${VendorDetails.id}/`, updatedData);
      toast.success("Vendor Updated Successfully", response);
      setPopup(false);
      setRefreshToggle(true);
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;

        // Show all field-level errors from DRF
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => toast.error(`${field}: ${msg}`));
          } else {
            toast.error(`${field}: ${messages}`);
          }
        });
      } else {
        toast.error(error.message || "Failed to create Vendor Item");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = async (Vendor) => {
    try {
      setRefreshToggle(false);
      const response = await api.delete(`/common/api/vendors/${Vendor}/`);
      toast.success('Vendor Deleted !')
      setRefreshToggle(true);
    } catch (error) {
      console.error("Error updating Warehouse", error);
    }
  };

  const handleSortChange = (newSortConfig) => {
    console.log('Vendor sorting changed:', newSortConfig);
    setSortConfig(newSortConfig);
    setRefreshToggle(prev => !prev);
  };


  const columns = useMemo(() => [
    { name: "Name", key: "name", sortable: true },
    { name: "Email", key: "email", sortable: true },
    { name: "Phone", key: "phone", sortable: true },
    { name: "City", key: "city", sortable: true },
    { name: "Actions", key: "actions", sortable: false },
  ], []);


  const cells = useMemo(() => [
    ({ row }) => <div className="text-sm font-semibold"
      onClick={() => navigate(`${row.id}`)}
    >{row.name}</div>,
    ({ row }) => <div className="text-sm">{row.email}</div>,
    ({ row }) => <div className="text-sm">{row.phone}</div>,
    ({ row }) => <div className="text-sm">{row.city}</div>,
  ], []);


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
        data={Vendor}
        cells={cells}
        heading="Vendor List"
        description="Create and manage Vendors here."
        createBtn={true}
        onCreateClick={handleCreateVendor}
        actionIcons={true}
        apiEndpoint="/common/api/vendors/"
        extraParams={{
          ...filters,
          ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
        }}
        itemsPerPage={10}
        renderData={renderVendor}
        hideDeleteBtn={isManager}
        onLoadingChange={setDataLoading}
        EditClick={(Vendor) => handleEditVendor(Vendor)}
        DeleteClick={(Vendor) => handleDeleteVendor(Vendor)}
        refresh={refreshToggle}
        onSortChange={handleSortChange}
        pageId={PAGE_IDS.VENDOR_LIST}
      />
      {popupName === "Create Vendor" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <VendorFormPopup
            loading={loading}
            onSubmit={handleVendorSubmit}
          />
        </PopupComponent>
      )}
      {popupName === "Edit Vendor" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <VendorFormPopup
            loading={loading}
            initialData={VendorDetails}
            onSubmit={handleEditVendorSubmit}
          />
        </PopupComponent>
      )}
    </>
  );
}

export default VendorListPage;
