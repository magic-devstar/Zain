import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TableComponent from "../../Components/Common/TableComponent";
import PopupComponent from "../../Components/popups/PopupComponent";
import UserFormPopup from "../../Components/popups/UserFormPopup";
import PermissionsFormPopup from "../../Components/popups/PermissionsFormPopup";
import { createStatusFilter } from "../../utils/dynamicFilterUtils";
import { createUser, deleteUser, updateUser, getUserPermissions, updateUserPermissions } from "../../utils/apis/userUtils";
import { toast } from "react-hot-toast";
import UsersFilter from "../../Components/filters/UsersFilter";
import { useSelector } from 'react-redux';
import { PAGE_IDS } from "../../utils/sortingUtils";
import useReportsToggle from "../../utils/useReportsToggle";

function UsersList() {
  const [employees, setEmployees] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [permissionsPopup, setPermissionsPopup] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const user = useSelector((state) => state.user.user);
  const isManager = user?.role === "Manager";
  const navigate = useNavigate();
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

  const handlePermissionsClick = async (user) => {
    try {
      setCurrentUser(user);
      setPermissionsLoading(true);
      setPermissionsPopup(true);
      const res = await getUserPermissions(user.id);
      setCurrentPermissions(res?.permissions || []);
    } catch (e) {
      toast.error("Failed to fetch permissions");
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handlePermissionsSubmit = async (permissionsList) => {
    try {
      setPermissionsLoading(true);
      await updateUserPermissions(currentUser.id, permissionsList);
      toast.success("Permissions updated");
      setPermissionsPopup(false);
    } catch (e) {
      toast.error("Failed to update permissions");
    } finally {
      setPermissionsLoading(false);
    }
  };


  const handleSubmit = async (formData) => {
    try {
      console.log(formData)
      if (!formData.phone_number || formData.phone_number.replace(/\D/g, "").length < 8) {
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
      } else {
        // Otherwise, call the createUser function
        response = await createUser(formData);
        toast.success("User created!");
      }
      setRefreshToggle(true);
      setPopup(false);
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
      toast.error(error.message || "Failed to delete user");
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



  const columns = useMemo(() => ([
    { name: "User", key: "username", sortable: true },
    { name: "Phone", key: "phone_number", sortable: true },
    { name: "Role", key: "role", sortable: true },
    { name: "Status", key: "is_active", sortable: true },
    user?.is_superuser ? { name: "Permissions", key: "permissions", sortable: false } : null,
    { name: "Actions", key: "actions", sortable: false },
  ].filter(Boolean)), [user?.is_superuser]);

  const cells = [
    ({ row }) => (
      <div className="flex items-center cursor-pointer" onClick={() => navigate(`${row.id}`)}>
        <img
          src={row.profile_image || "https://ui-avatars.com/api/?name=" + row.username}
          alt={row.username}
          className="w-9 h-9 rounded-full mr-3 object-cover"
        />
        <div>
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
      <span className="text-sm font-medium">{row.role}</span>
    ),
    ({ row }) => (
      <span
        className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold ${row.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
      >
        {row.is_active ? "Active" : "Inactive"}
      </span>
    ),
    ...(user?.is_superuser ? [({ row }) => (
      <div className="flex items-center gap-2">
        {(row.role === "Manager" || row.role === "Admin" || row.role === "Technician" || row.role === "Warehouse Manager") && !row.is_superuser && (
          <button
            type="button"
            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
            onClick={(e) => { e.stopPropagation(); handlePermissionsClick(row); }}
          >
            Permissions
          </button>
        )}
      </div>
    )] : []),
  ];


  return (
    <>
      {/* Only show UsersFilter when reports are enabled */}
      {reportsEnabled && (
        <UsersFilter onFilterChange={(newFilters) => {
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
        heading="Users"
        description="Create and manage Users here"
        createBtn={true}
        onCreateClick={handleCreateUser}
        actionIcons={true}
        apiEndpoint="/auth/get-users/"
        extraParams={{
          exclude_list: "Service Customer,Vending Customer,Partner,Deactivated,External User",  // New: exclude multiple roles
          ...filters,                 // Dynamic filter values from state
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
        pageId={PAGE_IDS.USER_LIST}
        dynamicFilters={dynamicFilters}
        onDynamicFilterChange={handleDynamicFilterChange}
      /> 

      {(popupName === "Create User" || popupName === "Edit User") && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <UserFormPopup
            loading={loading}
            initialData={currentUser}
            onSubmit={handleSubmit}
            roleFixed={isManager ? {
              roles: [
                "Manager",
                "Technician",
                "Warehouse Manager",
                "Vending Customer",
                "Service Customer",
                "Reporter",
                "External User"
              ]
            } : {
              roles: [
                "Admin",
                "Manager",
                "Technician",
                "Warehouse Manager",
                "Vending Customer",
                "Service Customer",
                "Reporter",
                "External User"
              ]
            }}
          />
        </PopupComponent>
      )}

      {permissionsPopup && (
        <PopupComponent popup={permissionsPopup} setPopup={setPermissionsPopup} loading={permissionsLoading}>
          <PermissionsFormPopup
            role={currentUser.role}
            loading={permissionsLoading}
            initialPermissions={currentPermissions}
            onSubmit={handlePermissionsSubmit}
          />
        </PopupComponent>
      )}
    </>
  );
}

export default UsersList;
