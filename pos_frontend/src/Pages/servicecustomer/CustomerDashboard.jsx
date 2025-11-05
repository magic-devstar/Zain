import React, { useEffect, useState } from "react";
import OrderList from "../../Components/Common/OrderList";
import { Link } from "react-router-dom";
import { toast } from 'react-hot-toast';
import TicketFormPopup from "../../Components/popups/TicketFormPopup";
import PopupComponent from "../../Components/popups/PopupComponent";
import { createTicket } from "../../utils/apis/ticketUtils";
import api from "../../utils/api";
import Spinner from "../../Components/Common/Spinner";
import SkeletonLine from "../../Components/LoadeingSkeletons/SkeletonLine";
import CustomerDahboardsLoadingSkeleton from "../../Components/LoadeingSkeletons/CustomerDahboardsLoadingSkeleton";

const CustomerDashboard = () => {
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [ticketCounts, setTicketCounts] = useState({
    open: 0,
    in_progress: 0,
    closed: 0,
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [recentInProgressTickets, setRecentInProgressTickets] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);
      const response = await api.get('/common/api/customer-dashboard/');
      const data = response.data;
      setTicketCounts(data.counts);
      setRecentTickets(data.recent_tickets);
      setRecentInProgressTickets(data.recent_in_progress_tickets);
    } catch (error) {
      throw error.response?.data || { message: "Failed to fetch dashboard data" };
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshToggle]); // ⬅️ refresh when ticket created

  const handleCreateTicket = () => {
    setPopupName("Create Ticket");
    setPopup(true);
  };


  const handleTicketSubmit = async (ticketData) => {
    try {
      setLoading(true);
      setRefreshToggle(false);
      const response = await createTicket(ticketData);
      toast.success("Ticket created!");
      setRefreshToggle(true);
      return response;
    } catch (error) {
      toast.error(error.message || "Failed to create ticket");
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
          {/* Place Order */}
          <div className="w-full md:w-1/2 lg:w-1/3 cursor-pointer bg-white rounded-2xl border-2 border-black-400 shadow p-4">
            <h2 className="text-base font-semibold mb-4">Create a Ticket</h2>
            <Link onClick={handleCreateTicket}>
              <div className="flex duration-500 rounded-xl border border-l-[3px] p-6 border-l-primary  border-black-400 items-center justify-between mb-2 group relative">
                <div>
                  {/* <img src='assets/svgs/Vector (3).svg' className="mb-3" alt="court" /> */}
                  <p className="opacity-90">Create new Ticket</p>
                </div>
                <img
                  src='/assets/images/arrow-up-circle-line.png'
                  className="duration-500 transition-all ease-in-out absolute right-6 group-hover:right-4"
                  alt=""
                />
              </div>
            </Link>
          </div>

          {/* Order Status */}
          <div className="w-full md:w-1/2 lg:w-2/3 bg-white rounded-2xl border-2 border-black-400 shadow p-4">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <h2 className="text-base font-semibold">Tickets</h2>
            </div>
            <div className="flex flex-wrap gap-4 justify-evenly items-center py-3.5">
              <div>
                <h4 className="mb-2 font-semibold opacity-80">Open</h4>
                <div className="flex items-center gap-3 justify-center">
                  <img src='/assets/svgs/Vector (3).svg' alt="svg" />
                  <h2 className="text-3xl font-bold opacity-80">{ticketCounts?.open}</h2>
                </div>
              </div>
              <div>
                <h4 className="mb-2 font-semibold opacity-80">In Progress</h4>
                <div className="flex items-center gap-3 justify-center">
                  <img src='/assets/svgs/Vector (4).svg' alt="svg" />
                  <h2 className="text-3xl font-bold opacity-80">{ticketCounts?.in_progress}</h2>
                </div>
              </div>
              <div>
                <h4 className="mb-2 font-semibold opacity-80">Closed</h4>
                <div className="flex items-center gap-3 justify-center">
                  <img src='/assets/svgs/Vector (5).svg' alt="svg" />
                  <h2 className="text-3xl font-bold opacity-80">{ticketCounts?.closed}</h2>
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
      </div >
      {popupName === "Create Ticket" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <TicketFormPopup
            loading={loading}
            onSubmit={handleTicketSubmit}
            onClose={() => setPopup(false)}
          />
        </PopupComponent>
      )
      }
    </>
  );
};

export default CustomerDashboard;
