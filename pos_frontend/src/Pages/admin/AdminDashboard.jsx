import React, { useEffect, useState } from "react";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import { FaPlus, FaUserAlt, FaWarehouse, FaCar, FaTools, FaUserTie, FaUsersCog, FaUserFriends, FaUserCog } from "react-icons/fa";
import StatisticsBox from "../../Components/Charts/StatisticsBox";
import IncomeChart from "../../Components/Charts/IncomeChart";
import ProgressChart from "../../Components/Charts/ProgressChart";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import Spinner from "../../Components/Common/Spinner";
import StartWorkCard from "../../Components/Common/StartWorkCard";

function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [isInitialMount, setIsInitialMount] = useState(true);

    const fetchDashboardStats = async (isInitialFetch = false) => {
        try {
            // Only show loading on initial fetch
            if (isInitialFetch) {
                setLoading(true);
            }
            const response = await api.get('/common/api/tickets/admin_dashboard_stats/');
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            toast.error('Failed to load dashboard statistics');
        } finally {
            if (isInitialFetch) {
                setLoading(false);
                setIsInitialMount(false);
            }
        }
    };

    useEffect(() => {
        // Initial fetch with loading state
        fetchDashboardStats(true);

        // Set up auto-refresh interval
        const intervalId = setInterval(() => {
            fetchDashboardStats(false);
        }, 10000); // 10 seconds

        // Cleanup interval on component unmount
        return () => clearInterval(intervalId);
    }, []); // Empty dependency array means this runs once on mount

    const getStatisticsBoxes = () => {
        if (!dashboardData) return [];

        return [
            {
                type: "Vending Customers",
                value: dashboardData.user_stats.vending_customers,
                description: "Active vending customers",
                color: "bg-blue-500",
                typeIcon: <FaUserFriends />,
            },
            {
                type: "Service Customers",
                value: dashboardData.user_stats.service_customers,
                description: "Active service customers",
                color: "bg-green-500",
                typeIcon: <FaUserTie />,
            },
            {
                type: "Technicians",
                value: dashboardData.user_stats.technicians,
                description: "Field technicians",
                color: "bg-yellow-500",
                typeIcon: <FaTools />,
            },
            {
                type: "Reporters",
                value: dashboardData.user_stats.reporters,
                description: "Active reporters",
                color: "bg-purple-500",
                typeIcon: <FaUserCog />,
            },
            {
                type: "Warehouses",
                value: dashboardData.warehouse_count,
                description: "Active warehouse locations",
                color: "bg-red-500",
                typeIcon: <FaWarehouse />,
            },
            {
                type: "Vehicles",
                value: dashboardData.vehicle_count,
                description: "Active fleet vehicles",
                color: "bg-orange-500",
                typeIcon: <FaCar />,
            },
        ];
    };

    const getIncomeData = () => {
        if (!dashboardData) return {};

        // The backend now sends the data in exactly the format we need
        return dashboardData.income_stats;
    };

    const getProgressData = () => {
        if (!dashboardData) return {};

        return {
            open: dashboardData.ticket_stats.OPEN || 0,
            in_progress: dashboardData.ticket_stats['IN PROGRESS'] || 0,
            partially_closed: dashboardData.ticket_stats['PARTIALLY CLOSED'] || 0,
            pending_approval: dashboardData.ticket_stats['PENDING APPROVAL'] || 0,
            closed: dashboardData.ticket_stats.CLOSED || 0,
        };
    };

    if (loading) {
        return <Spinner />;
    }

    return (
        <div className="clientDashboard">
            {/* Header Section */}
            <div className="flex md:flex-row justify-between items-center md:items-center mb-4">
                <div className="mb-4 md:mb-0">
                    <h1 className="text-xl md:text-2xl font-semibold">Overview</h1>
                    <p className="text-sm md:text-gray-500">
                        Dashboard statistics are updated in real-time.
                    </p>
                </div>
                {/* <PrimaryBtn>Create Job <FaPlus /> </PrimaryBtn> */}
            </div>
            <div className="mb-6"></div>
            {/* Statistics Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                {getStatisticsBoxes().map((item, index) => (
                    <StatisticsBox key={index} item={item} />
                ))}
                <StartWorkCard hideHeading={true} />
            </div>
            {/* Charts */}
            <div className="flex flex-wrap gap-4 w-full">
                {/* Income Chart in one column on small screens, in full width on larger screens */}
                <div className="w-full md:w-[64%] flex-1">
                    <div className="bg-white shadow rounded-lg p-4">
                        <IncomeChart incomeData={getIncomeData()} />
                    </div>
                </div>
                {/* Progress Chart in one column on small screens, in 1/3 width on larger screens */}
                <div className="w-full md:w-1/3 flex-1 lg:flex-none">
                    <div className="bg-white shadow rounded-lg p-4 h-full flex flex-col  items-center">
                        <ProgressChart progressData={getProgressData()} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
