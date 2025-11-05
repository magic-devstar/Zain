import React, { useState, useMemo } from "react";
import TableComponent from "../../../Components/Common/TableComponent";
import { useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import SimpleFilter from "../../../Components/filters/SimpleFilter";
import { deleteTutorial } from "../../../utils/apis/tutorialUtils";
import useReportsToggle from "../../../utils/useReportsToggle";

function TutorialsList() {
    const user = useSelector((state) => state.user.user);
    const isAdmin = user?.role === "Admin";
    const navigate = useNavigate();
    const [tutorials, setTutorials] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [filters, setFilters] = useState({});
    const [refreshToggle, setRefreshToggle] = useState(false);
    const { reportsEnabled } = useReportsToggle();
    const renderTutorials = (tutorialsData) => {
        setTutorials(tutorialsData);
    };

    const handleCreateTutorial = () => {
        navigate('create');
    };

    const handleEditTutorial = (tutorial) => {
        navigate(`${tutorial.id}/edit`);
    };

    const handleDeleteTutorial = async (tutorialId) => {
        try {
            setRefreshToggle(false);
            await deleteTutorial(tutorialId);
            setRefreshToggle(true);
        } catch (error) {
            console.error("Error deleting Tutorial", error);
        }
    };

    const columns = useMemo(() => [
        { name: "Title", key: "title" },
        { name: "Created By", key: "created_by_details.full_name" },
        { name: "Created At", key: "created_at" },
        { name: "Actions", key: "actions" },
    ], []);

    const cells = useMemo(() => [
        ({ row }) => (
            <div
                className="text-sm font-semibold cursor-pointer"
                onClick={() => navigate(`${row.id}`)}
                title={row.title}
            >
                {row.title.length > 20 ? `${row.title.substring(0, 20)}...` : row.title}
            </div>
        ),
        ({ row }) => <div className="text-sm">{row.created_by_details?.username || "N/A"}</div>,
        ({ row }) => (
            <div className="text-sm">
                {new Date(row.created_at).toLocaleDateString()}
            </div>
        ),
    ], [navigate]);

    return (
        <>
            {reportsEnabled && (
                <SimpleFilter
                    onFilterChange={(newFilters) => {
                        setFilters(newFilters);
                        setRefreshToggle(prev => !prev);
                    }}
                />
            )}
            <TableComponent
                dataloading={dataLoading}
                columns={columns}
                data={tutorials}
                cells={cells}
                heading="Tutorials"
                description="Create and manage your tutorials here."
                createBtn={isAdmin}
                onCreateClick={handleCreateTutorial}
                actionIcons={true}
                apiEndpoint="/common/api/tutorials/"
                itemsPerPage={10}
                extraParams={filters}
                renderData={renderTutorials}
                hideDeleteBtn={(row) => !isAdmin && !row.owner}
                hideEditBtn={(row) => !isAdmin && !row.owner}
                onLoadingChange={setDataLoading}
                EditClick={handleEditTutorial}
                DeleteClick={handleDeleteTutorial}
                refresh={refreshToggle}
            />
        </>
    );
}

export default TutorialsList; 