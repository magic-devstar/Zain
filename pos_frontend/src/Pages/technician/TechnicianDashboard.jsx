import React, { useEffect, useState } from "react";
import OrderList from "../../Components/Common/OrderList";
import StartWorkCard from "../../Components/Common/StartWorkCard";
import api from "../../utils/api";
import Spinner from "../../Components/Common/Spinner";
import CustomerDahboardsLoadingSkeleton from "../../Components/LoadeingSkeletons/CustomerDahboardsLoadingSkeleton";

const TechnicianDashboard = () => {
    const [loading, setLoading] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [ticketCounts, setTicketCounts] = useState({
        open: 0,
        in_progress: 0,
        closed: 0,
    });
    const [recentTickets, setRecentTickets] = useState([]);
    const [recentInProgressTickets, setRecentInProgressTickets] = useState([]);


    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/common/api/technician-dashboard/');
            const data = response.data;
            setTicketCounts(data.counts);
            setRecentTickets(data.recent_tickets);
            setRecentInProgressTickets(data.recent_in_progress_tickets);
        } catch (error) {
            throw error.response?.data || { message: "Failed to fetch dashboard data" };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [refreshToggle]);

    if (loading) {
        return (
            <CustomerDahboardsLoadingSkeleton />
        );
    }

    return (
        <>
            <div className="mb-4 mx-0 md:mx-20">
                <h1 className="text-2xl font-bold my-6 opacity-90">Dashboard</h1>

                {/* Header */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">

                    <div className="w-full md:w-1/2 lg:w-1/3">
                        <StartWorkCard />
                    </div>

                    {/* Order Status */}
                    <div className="w-full md:w-1/2 lg:w-2/3 bg-white rounded-2xl border-2 border-black-400 shadow p-4">
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                            <h2 className="text-base font-semibold">Tickets</h2>
                        </div>
                        <div className="flex flex-wrap gap-4 justify-evenly items-center py-3.5">
                            <div>
                                <h4 className="mb-2 font-semibold opacity-80">In Progress</h4>
                                <div className="flex items-center gap-3 justify-center">
                                    <img src='/assets/svgs/Vector (4).svg' alt="svg" />
                                    <h2 className="text-3xl font-bold opacity-80">{ticketCounts?.in_progress}</h2>
                                </div>
                            </div>
                            <div>
                                <h4 className="mb-2 font-semibold opacity-80">Partialy Closed</h4>
                                <div className="flex items-center gap-3 justify-center">
                                    <img src='/assets/svgs/Vector (6).svg' alt="svg" />
                                    <h2 className="text-3xl font-bold opacity-80">{ticketCounts?.partially_closed}</h2>
                                </div>
                            </div>
                            <div>
                                <h4 className="mb-2 font-semibold opacity-80">Pending Approval</h4>
                                <div className="flex items-center gap-3 justify-center">
                                    <img src='/assets/svgs/Vector (5).svg' alt="svg" />
                                    <h2 className="text-3xl font-bold opacity-80">{ticketCounts?.pending_approval}</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Lists */}
                <div className="flex flex-col lg:flex-row gap-5 justify-between">
                    <div className="w-full lg:w-1/2">
                        <OrderList heading="Recent Tickets" orders={recentTickets} />
                    </div>
                    <div className="w-full lg:w-1/2">
                        <OrderList heading="In Progress Tickets " orders={recentInProgressTickets} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default TechnicianDashboard;

