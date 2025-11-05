import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TableComponent from "../../Components/Common/TableComponent";
import PopupComponent from "../../Components/popups/PopupComponent";
import UserFormPopup from "../../Components/popups/UserFormPopup";
import { createUser, deleteUser, updateUser } from "../../utils/apis/userUtils";
import { toast } from "react-hot-toast";
import CustomersFilters from "../../Components/filters/CustomersFilters";
import { useSelector } from 'react-redux';
import Avatar from "../../Components/Common/Avatar";
import { PAGE_IDS } from "../../utils/sortingUtils";
import useReportsToggle from "../../utils/useReportsToggle";

function DeactivatedCustomersList() {
  const [employees, setEmployees] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);

  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.user);
  const isManager = user?.role === "Manager";
  const { reportsEnabled } = useReportsToggle();
  const renderEmployees = (employees) => {
    setEmployees(employees);
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
      console.log(formData)
      if (!formData.phone_number || formData.phone_number.replace(/\D/g, "").length < 10) {
        toast.error("Please enter a valid number.");
        return;
      }
      setLoading(true);
      setRefreshToggle(false);
      let response;
      if (popupName === "Edit User" && currentUser) {
        // If it's an Edit action, call the updateUser function
        response = await updateUser(currentUser.id, formData);
        toast.success("User updated!");
        setPopup(false);
      } else {
        // Otherwise, call the createUser function
        response = await createUser(formData);
        toast.success("Service Customer created!");
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
      toast.success("User Deleted!");
      setRefreshToggle(true);
      return response;
    } catch (error) {
      toast.error(error.message || "Failed to create user");
    }
  };

  const handleSortChange = (newSortConfig) => {
    console.log('Approval customer sorting changed:', newSortConfig);
    setSortConfig(newSortConfig);
    setRefreshToggle(prev => !prev);
  };


  const columns = useMemo(() => [
    { name: "User", key: "username", sortable: true },
    { name: "Phone", key: "phone_number", sortable: true },
    { name: "Status", key: "is_active", sortable: true },
    { name: "Actions", key: "actions", sortable: false },
  ], []);

  const cells = [
    ({ row }) => (
      <div className="flex items-center" onClick={() => navigate(`${row.id}/details`)}>
        <Avatar
          user={row}
          color="bg-primary"
        />
        <div className="ml-2">
          <div className="text-sm font-medium">{row.username}</div>
          <div className="text-xs text-gray-500">{row.email}</div>
        </div>
      </div>
    ),
    ({ row }) => (
      <div className="text-sm">{row.phone_number || "—"}</div>
    ),
    ({ row }) => (
      <span
        className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold ${row.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
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
        dataloading={dataLoading}
        columns={columns}
        data={employees}
        cells={cells}
        heading="Approval Required Customers"
        description="Create and Activate Customers here"
        createBtn={true}
        onCreateClick={handleCreateUser}
        actionIcons={true}
        apiEndpoint="/auth/get-users/"
        extraParams={{
          role: "Deactivated",
          ...filters,
          ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
        }}
        itemsPerPage={10}
        hideDeleteBtn={isManager ? true : false}
        EditClick={(user) => handleEditUser(user)}
        DeleteClick={(userId) => handleDeleteuser(userId)}
        renderData={renderEmployees}
        onLoadingChange={setDataLoading}
        refresh={refreshToggle}
        onSortChange={handleSortChange}
        pageId={PAGE_IDS.APPROVAL_CUSTOMER_LIST}
      />

      {(popupName === "Create User" || popupName === "Edit User") && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <UserFormPopup
            loading={loading}
            initialData={currentUser}
            roleFixed={{ roles: ["Service Customer", "Vending Customer"] }}
            onSubmit={handleSubmit}
          />
        </PopupComponent>
      )}

    </>
  );
}

export default DeactivatedCustomersList;
