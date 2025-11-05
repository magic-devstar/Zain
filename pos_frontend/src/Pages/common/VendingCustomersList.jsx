import React, { useState, useMemo } from "react";
import TableComponent from "../../Components/Common/TableComponent";
import PopupComponent from "../../Components/popups/PopupComponent";
import UserFormPopup from "../../Components/popups/UserFormPopup";
import { createUser, deleteUser, updateUser } from "../../utils/apis/userUtils";
import { toast } from "react-hot-toast";
import CustomersFilters from "../../Components/filters/CustomersFilters";
import { createStatusFilter } from "../../utils/dynamicFilterUtils";
import { useSelector } from 'react-redux';
import Avatar from "../../Components/Common/Avatar";
import { useNavigate } from "react-router-dom";
import { PAGE_IDS } from "../../utils/sortingUtils";
import useReportsToggle from "../../utils/useReportsToggle";

function VendingCustomersList() {
  const navigate = useNavigate();
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [customers, setCustomers] = useState([]);

  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const user = useSelector((state) => state.user.user);
  const isManager = user?.role === "Manager";
  const { reportsEnabled } = useReportsToggle();
  const renderCustomers = (customers) => {
    setCustomers(customers);
  };

  const handleCreateUser = () => {
    setCurrentUser(null);
    setPopupName("Create User");
    setPopup(true);
  };
  const handleEditUser = (user) => {
    setCurrentUser(user);
    setPopupName("Edit User");
    setPopup(true);
  };

  const handleSubmit = async (formData) => {
    try {
      if (!formData.phone_number || formData.phone_number.replace(/\D/g, "").length < 10) {
        toast.error("Please enter a valid number.");
        return;
      }
      setLoading(true);
      setRefreshToggle(false);
      let response;
      if (popupName === "Edit User" && currentUser) {
        response = await updateUser(currentUser.id, formData);
        toast.success("User updated!");
        setPopup(false);
      } else {
        response = await createUser({ ...formData, role: "Vending Customer" });
        toast.success("Vending Customer created!");
        setPopup(false);
      }
      setRefreshToggle(true);
      return response;
    } catch (error) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteuser = async (userId) => {
    try {
      setRefreshToggle(false);
      let response;
      response = await deleteUser(userId);
      setRefreshToggle(true);
      return response;
    } catch (error) {
      toast.error(error.message || "Failed to create user");
    }
  };

  const handleSortChange = (newSortConfig) => {
    setSortConfig(newSortConfig);
    setRefreshToggle(prev => !prev);
  };

  const handleDynamicFilterChange = (fieldName, value) => {
    // Clear sorting when filters change to avoid confusion
    setSortConfig({ key: null, direction: 'asc' });
  };

  // Dynamic filter configurations - memoized to prevent unnecessary re-renders
  const dynamicFilters = useMemo(() => [
    createStatusFilter('is_active', 'true', 'Status'), // Default to Active
    // Add more filters here as needed
    // createSelectFilter('role', 'Role', [
    //   { value: 'Vending Customer', label: 'Vending Customer' },
    //   { value: 'Service Customer', label: 'Service Customer' }
    // ], '', 'All Roles')
  ], []);

  const columns = useMemo(() => [
    { name: "User", key: "username", sortable: true },
    { name: "Stores", key: "store_names", sortable: true },
    { name: "Phone", key: "phone_number", sortable: true },
    { name: "Role", key: "role", sortable: true },
    { name: "Status", key: "is_active", sortable: true },
    { name: "Actions", key: "actions", sortable: false },
  ], []);

  const cells = [
    ({ row }) => (
      <div className="flex items-center cursor-pointer" onClick={() => navigate(`vending-customer/${row.id}`)}>
        <Avatar user={row} color="bg-primary" />
        <div className="ml-2">
          <div className="text-sm font-medium">{row.username}</div>
          {row.email ? (
            <a
              href={`mailto:${row.email}`}
              className="text-xs text-gray-500 hover:text-primary hover:underline cursor-pointer"
              title={`Click to send email to ${row.email}`}
              onClick={(e) => e.stopPropagation()}
            >
              {row.email}
            </a>
          ) : (
            <div className="text-xs text-gray-500">No email</div>
          )}
        </div>
      </div>
    ),
    ({ row }) => (
      <div className="text-sm">
        {Array.isArray(row.store_profiles) && row.store_profiles.length > 0
          ? row.store_profiles.map((sp) => sp?.store_name).filter(Boolean).join(", ")
          : "—"}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm">
        {row.phone_number ? (
          <a
            href={`tel:${row.phone_number.replace(/[\s\+]/g, '')}`}
            className="hover:text-primary hover:underline cursor-pointer"
            title={`Click to call ${row.phone_number}`}
          >
            {row.phone_number}
          </a>
        ) : (
          "—"
        )}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm">{row.role || "—"}</div>
    ),
    ({ row }) => (
      <span
        className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold ${row.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
      >
        {row.is_active ? "Active" : "Inactive"}
      </span>
    ),
  ];

  return (
    <>
      {reportsEnabled && (
        <CustomersFilters onFilterChange={(newFilters) => {
          setFilters(newFilters);
          // Clear sorting when filters change to avoid confusion
          setSortConfig({ key: null, direction: 'asc' });
          setRefreshToggle(prev => !prev);
        }} />
      )}

      <TableComponent
        columns={columns}
        dataloading={loading}
        cells={cells}
        data={customers}
        heading="Vending Customers"
        description="Create and manage Vending Customers here"
        createBtn={true}
        onCreateClick={handleCreateUser}
        actionIcons={true}
        apiEndpoint="/auth/active-customers/"
        extraParams={{
          ...filters,
          role: "Vending Customer",
          ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
        }}
        itemsPerPage={10}
        hideDeleteBtn={isManager ? true : false}
        EditClick={handleEditUser}
        DeleteClick={handleDeleteuser}
        onLoadingChange={setLoading}
        renderData={renderCustomers}
        refresh={refreshToggle}
        onSortChange={handleSortChange}
        pageId={PAGE_IDS.VENDING_CUSTOMER_LIST}
        dynamicFilters={dynamicFilters}
        onDynamicFilterChange={handleDynamicFilterChange}
      />

      {(popupName === "Create User" || popupName === "Edit User") && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <UserFormPopup
            loading={loading}
            initialData={currentUser}
            roleFixed={popupName === "Create User" ? { roles: ["Vending Customer"] } : { roles: ["Service Customer", "Vending Customer"] }}
            onSubmit={handleSubmit}
          />
        </PopupComponent>
      )}

    </>
  );
}

export default VendingCustomersList; 