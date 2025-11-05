import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from 'react-hot-toast';
import PopupComponent from "../../Components/popups/PopupComponent";
import api from "../../utils/api";
import LocationsList from "../../Components/Common/LocationsList";
import { createLocation } from "../../utils/apis/locationUtils";
import LocationFomrPopup from "../../Components/popups/LocationFomrPopup";
import StartWorkCard from "../../Components/Common/StartWorkCard";
import CustomerDahboardsLoadingSkeleton from "../../Components/LoadeingSkeletons/CustomerDahboardsLoadingSkeleton";

const ReporterDashboard = () => {
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [locationCounts, setLocationCounts] = useState({
        active: 0,
        inactive: 0,
    });
    const [recentActiveLocations, setRecentActiveLocations] = useState([]);
    const [recentInactiveLocations, setRecentInactiveLocations] = useState([]);

    const fetchDashboardData = async () => {
        try {
            setDataLoading(true);
            const response = await api.get('/common/api/reporter-dashboard/');
            const data = response.data;

            setLocationCounts({
                active: data.total_active_locations || 0,
                inactive: data.total_inactive_locations || 0,
            });

            setRecentActiveLocations(data.recent_active_locations || []);
            setRecentInactiveLocations(data.recent_inactive_locations || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch dashboard data");
        } finally {
            setDataLoading(false);
        }
    };


    useEffect(() => {
        fetchDashboardData();
    }, [refreshToggle]); // ⬅️ refresh when Location created


    const handleLocationSubmit = async (LocationData) => {
        try {
            setLoading(true);
            setRefreshToggle(false);
            const response = await createLocation(LocationData);
            setRefreshToggle(true);
            return response;
        } catch (error) {
            toast.error(error.message || "Failed to create Location");
        } finally {
            setLoading(false);
        }
    };


    if (dataLoading) {
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
                            <h2 className="text-base font-semibold">Locations</h2>
                        </div>
                        <div className="flex flex-wrap gap-4 justify-evenly items-center py-3.5">
                            <div>
                                <h4 className="mb-2 font-semibold opacity-80">Active</h4>
                                <div className="flex items-center gap-3 justify-center">
                                    <img src='/assets/svgs/Vector (5).svg' alt="svg" />
                                    <h2 className="text-3xl font-bold opacity-80">{locationCounts.active}</h2>
                                </div>
                            </div>
                            <div>
                                <h4 className="mb-2 font-semibold opacity-80">In Active</h4>
                                <div className="flex items-center gap-3 justify-center">
                                    <img src='/assets/svgs/Vector (4).svg' alt="svg" />
                                    <h2 className="text-3xl font-bold opacity-80">{locationCounts.inactive}</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Lists */}
                <div className="flex flex-col lg:flex-row gap-5 justify-between">
                    <div className="w-full lg:w-1/2">
                        <LocationsList heading="Assigned Active Locations" orders={recentActiveLocations} />
                    </div>
                    <div className="w-full lg:w-1/2">
                        <LocationsList heading="Assigned In Active Locations " orders={recentInactiveLocations} />
                    </div>
                </div>
            </div>
            {popupName === "Create Location" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <LocationFomrPopup
                        loading={loading}
                        onSubmit={handleLocationSubmit}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}
        </>
    );
};

export default ReporterDashboard;
