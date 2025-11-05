import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TableComponent from "../../Components/Common/TableComponent";
import PopupComponent from "../../Components/popups/PopupComponent";
import UserFormPopup from "../../Components/popups/UserFormPopup";
import { createUser, deleteUser, updateUser } from "../../utils/apis/userUtils";
import { toast } from "react-hot-toast";
import { useSelector } from 'react-redux';
import { PAGE_IDS } from "../../utils/sortingUtils";

function PartnersListPage() {
  const [employees, setEmployees] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const user = useSelector((state) => state.user.user);
  const isManager = user?.role === "Manager";
  const navigate = useNavigate();

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
    console.log('Partners sorting changed:', newSortConfig);
    setSortConfig(newSortConfig);
    setRefreshToggle(prev => !prev);
  };


  const columns = [
    { name: "User", key: "username", sortable: true },
    { name: "Phone", key: "phone_number", sortable: true },
    { name: "Role", key: "role", sortable: true },
    { name: "Status", key: "is_active", sortable: true },
    { name: "Actions", key: "actions", sortable: false },
  ];

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
          <div className="text-xs text-gray-500">{row.email}</div>
        </div>
      </div>
    ),
    ({ row }) => (
      <div className="text-sm">{row.phone_number || "—"}</div>
    ),
    ({ row }) => (
      <span className="text-sm font-medium">{row.role}</span>
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
        pageId={PAGE_IDS.PARTNER_LIST}
      />

      {(popupName === "Create User" || popupName === "Edit User") && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <UserFormPopup
            loading={loading}
            initialData={currentUser}
            roleFixed={{ roles: ["Partner", "Employee"] }}
            onSubmit={handleSubmit}
          />
        </PopupComponent>
      )}
    </>
  );
}

export default PartnersListPage;
