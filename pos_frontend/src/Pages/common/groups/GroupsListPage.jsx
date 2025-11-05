import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TableComponent from "../../../Components/Common/TableComponent";
import PopupComponent from "../../../Components/popups/PopupComponent";
import GroupFormPopup from "../../../Components/popups/GroupFormPopup";
import { deleteGroup, createGroup, updateGroup } from "../../../utils/apis/groupUtils";
import toast from "react-hot-toast";
import { useSelector } from 'react-redux';
import SimpleFilter from "../../../Components/filters/SimpleFilter";
import { PAGE_IDS } from "../../../utils/sortingUtils";
import useReportsToggle from "../../../utils/useReportsToggle";

function GroupsListPage() {
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [filters, setFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const user = useSelector((state) => state.user.user);
    const isAdmin = user?.role === "Admin";
    const { reportsEnabled } = useReportsToggle();
    const renderGroups = (groupsData) => {
        setGroups(groupsData);
    };

    const handleCreateGroup = () => {
        setSelectedGroup(null);
        setPopupName("Create Group");
        setPopup(true);
    };

    const handleGroupSubmit = async (groupData) => {
        try {
            setLoading(true);
            setRefreshToggle(false);
            await createGroup(groupData);
            toast.success("Group created successfully!");
            setRefreshToggle(true);
            setPopup(false);
        } catch (error) {
            if (error.response && error.response.data) {
                const data = error.response.data;
                Object.entries(data).forEach(([field, messages]) => {
                    if (Array.isArray(messages)) {
                        messages.forEach((msg) => toast.error(`${field}: ${msg}`));
                    } else {
                        toast.error(`${field}: ${messages}`);
                    }
                });
            } else {
                toast.error(error.message || "Failed to create group");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEditGroup = (group) => {
        setSelectedGroup(group);
        setPopupName("Edit Group");
        setPopup(true);
    };

    const handleEditGroupSubmit = async (updatedData) => {
        try {
            setRefreshToggle(false);
            setLoading(true);
            await updateGroup(updatedData.id, updatedData);
            toast.success("Group updated successfully!");
            setPopup(false);
            setRefreshToggle(true);
        } catch (error) {
            if (error.response && error.response.data) {
                const data = error.response.data;
                Object.entries(data).forEach(([field, messages]) => {
                    if (Array.isArray(messages)) {
                        messages.forEach((msg) => toast.error(`${field}: ${msg}`));
                    } else {
                        toast.error(`${field}: ${messages}`);
                    }
                });
            } else {
                toast.error(error.message || "Failed to update group");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGroup = async (group) => {
        try {
            setRefreshToggle(false);
            await deleteGroup(group);
            toast.success('Group deleted successfully!');
            setRefreshToggle(true);
        } catch (error) {
            toast.error(error.message || "Failed to delete group");
        }
    };

    const handleViewDetails = (group) => {
        navigate(`${group.id}`);
    };

    const handleSortChange = (newSortConfig) => {
        console.log('Groups sorting changed:', newSortConfig);
        setSortConfig(newSortConfig);
        setRefreshToggle(prev => !prev);
    };

    const columns = useMemo(() => [
        { name: "Name", key: "name", sortable: true },
        { name: "Members", key: "users", sortable: true },
        { name: "Actions", key: "actions", sortable: false },
    ], []);

    const cells = useMemo(() => [
        ({ row }) => (
            <div
                className="text-sm font-semibold cursor-pointer hover:text-primary"
                onClick={() => handleViewDetails(row)}
            >
                {row.name}
            </div>
        ),
        ({ row }) => <div className="text-sm">{row.users?.length || 0} members</div>,
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
                data={groups}
                cells={cells}
                heading="Groups"
                description="Create and manage your groups here."
                createBtn={true}
                onCreateClick={handleCreateGroup}
                actionIcons={true}
                apiEndpoint="/common/api/groups/"
                extraParams={{
                    ...filters,
                    ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
                }}
                itemsPerPage={10}
                renderData={renderGroups}
                hideDeleteBtn={!isAdmin}
                onLoadingChange={setDataLoading}
                EditClick={(group) => handleEditGroup(group)}
                DeleteClick={(group) => handleDeleteGroup(group)}
                refresh={refreshToggle}
                onSortChange={handleSortChange}
                pageId={PAGE_IDS.GROUP_LIST}
            />

            {popupName === "Create Group" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <GroupFormPopup
                        onClose={() => setPopup(false)}
                        onSubmit={handleGroupSubmit}
                        isSubmitting={loading}
                    />
                </PopupComponent>
            )}

            {popupName === "Edit Group" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <GroupFormPopup
                        initialData={selectedGroup}
                        onSubmit={handleEditGroupSubmit}
                        onClose={() => setPopup(false)}
                        isSubmitting={loading}
                    />
                </PopupComponent>
            )}
        </>
    );
}

export default GroupsListPage; 