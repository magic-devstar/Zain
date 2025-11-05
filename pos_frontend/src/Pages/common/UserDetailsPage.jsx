import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/api";
import Spinner from "../../Components/Common/Spinner";
import toast from "react-hot-toast";
import TableComponent from "../../Components/Common/TableComponent";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import DateRangePicker from "../../Components/Common/DateRangePicker";

const UserDetailsPage = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [refreshToggle, setRefreshToggle] = useState(false);
  // Date filter and printing states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/auth/get-users/${userId}/`);
        setUser(response.data);
      } catch (error) {
        console.error("Failed to fetch user data", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const formatDuration = (durationStr) => {
    if (!durationStr) {
      return '';
    }

    let days = 0;
    let timePart = durationStr;

    if (durationStr.includes('day')) {
      const parts = durationStr.split(', ');
      const dayPart = parts[0];
      days = parseInt(dayPart.split(' ')[0], 10);
      timePart = parts.length > 1 ? parts[1] : '0:0:0';
    }

    const timeSegments = timePart.split(':');
    const hours = parseInt(timeSegments[0], 10);
    const minutes = parseInt(timeSegments[1], 10);

    const resultParts = [];
    if (days > 0) {
      resultParts.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    if (hours > 0) {
      resultParts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
      resultParts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }

    if (resultParts.length === 0) {
      const seconds = timeSegments[2] ? parseFloat(timeSegments[2]) : 0;
      if (seconds > 0) {
        return '< 1 minute';
      }
      return '0 minutes';
    }

    if (resultParts.length === 1) {
      return resultParts[0];
    }

    const lastPart = resultParts.pop();
    return `${resultParts.join(', ')} and ${lastPart}`;
  };

  // Helper to convert Django duration string to seconds
  const durationToSeconds = (durationStr) => {
    if (!durationStr) return 0;

    let days = 0;
    let timePart = durationStr;

    if (durationStr.includes("day")) {
      const parts = durationStr.split(", ");
      const dayPart = parts[0];
      days = parseInt(dayPart.split(" ")[0], 10);
      timePart = parts.length > 1 ? parts[1] : "0:0:0";
    }

    const [hours = "0", minutes = "0", seconds = "0"] = timePart.split(":");
    return (
      days * 24 * 3600 +
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(parseFloat(seconds), 10)
    );
  };

  const secondsToReadable = (secondsTotal) => {
    const hours = Math.floor(secondsTotal / 3600);
    const minutes = Math.floor((secondsTotal % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleDateRangeChange = (newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handlePrintReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    try {
      setPrinting(true);

      // Fetch all shifts for this user in selected date range
      const res = await api.get("/common/api/shifts/", {
        params: {
          user_id: userId,
          all: true,
          start_date: startDate,
          end_date: endDate,
        },
      });

      const userShifts = res.data;

      const payRate = parseFloat(user?.pay_rate || 0);

      let totalSeconds = 0;

      const htmlRows = userShifts
        .map((shift) => {
          const secs = durationToSeconds(shift.duration);
          totalSeconds += secs;
          const amount = ((secs / 3600) * payRate).toFixed(2);
          return `<tr><td>${new Date(shift.start_time).toLocaleString()}</td><td>${shift.end_time ? new Date(shift.end_time).toLocaleString() : "Active"
            }</td><td>${formatDuration(shift.duration)}</td><td>$${amount}</td></tr>`;
        })
        .join("\n");

      const totalAmount = (totalSeconds / 3600) * payRate;

      // Generate printable report inside hidden iframe
      const printIframe = document.createElement("iframe");
      printIframe.style.position = "fixed";
      printIframe.style.right = "0";
      printIframe.style.bottom = "0";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "0";
      document.body.appendChild(printIframe);

      const doc = printIframe.contentDocument || printIframe.contentWindow.document;

      doc.open();
      const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Shift Report (${startDate} to ${endDate})</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 40px;
        background-color: #f9fafb;
        color: #1f2937;
        line-height: 1.6;
      }
      .container {
        max-width: 900px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        padding: 30px;
        border: 1px solid #e5e7eb;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0060AC;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .header img {
        max-width: 130px;
        height: auto;
      }
      .company-info {
        text-align: right;
      }
      .company-info h2 {
        font-size: 24px;
        font-weight: 700;
        color: #1f2937;
        margin: 0;
      }
      .company-info p {
        font-size: 14px;
        color: #6b7280;
        margin: 5px 0;
      }
      .report-title {
        font-size: 32px;
        font-weight: 800;
        color: #0060AC;
        margin: 0 0 10px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .date-range {
        font-size: 14px;
        color: #374151;
        margin-bottom: 30px;
      }
      .report-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
      }
      .report-table th, .report-table td {
        padding: 12px 15px;
        text-align: left;
        font-size: 14px;
      }
      .report-table th {
        background: #0060AC;
        color: white;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .report-table td {
        border-bottom: 1px solid #e5e7eb;
        color: #374151;
      }
      .report-table tr:last-child td { border-bottom: none; }
      .totals-row td {
        font-weight: 700;
        color: #0060AC;
      }
      @media print {
        body { padding: 0; background: white; }
        .container { box-shadow: none; border: none; }
        .header { border-bottom-color: #0060AC; }
        .report-table th { background: #0060AC; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="/assets/images/logo.png" alt="T Technologies INC Logo" />
        <div class="company-info">
          <h2>T Technologies INC</h2>
          <p>720 Cotton Farm Rd, Pinetops, NC 27864</p>
          <p>Phone: 252-827-1002</p>
        </div>
      </div>
      <h1 class="report-title">Shift Report</h1>
      <p class="date-range">${startDate} to ${endDate}</p>
      <table class="report-table">
        <thead>
          <tr><th>Start Time</th><th>End Time</th><th>Duration</th><th>Amount ($)</th></tr>
        </thead>
        <tbody>
          ${htmlRows}
          <tr class="totals-row"><td>Total</td><td></td><td>${secondsToReadable(totalSeconds)}</td><td>$${totalAmount.toFixed(2)}</td></tr>
        </tbody>
      </table>
    </div>
  </body>
</html>`;
      doc.write(htmlContent);
      doc.close();

      printIframe.onload = () => {
        setTimeout(() => {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
          document.body.removeChild(printIframe);
        }, 300);
      };
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error(error.message || "Failed to generate report");
    } finally {
      setPrinting(false);
    }
  };

  const columns = useMemo(() => {
    return [
      { name: "Start Time", key: "start_time" },
      { name: "End Time", key: "end_time" },
      { name: "Duration", key: "duration" },
    ];
  }, []);

  const cells = useMemo(() => {
    return [
      ({ row }) => <div className="text-sm">{new Date(row.start_time).toLocaleString()}</div>,
      ({ row }) => <div className="text-sm">{row.end_time ? new Date(row.end_time).toLocaleString() : 'Active'}</div>,
      ({ row }) => <div className="text-sm">{formatDuration(row.duration)}</div>,
    ];
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center mb-4">
          <img
            src={user.profile_image || `https://ui-avatars.com/api/?name=${user.username}`}
            alt={user.username}
            className="w-24 h-24 rounded-full mr-6 object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">{user.username}</h1>
            {user.email ? (
              <a
                href={`mailto:${user.email}`}
                className="text-gray-600 hover:text-primary hover:underline cursor-pointer"
                title={`Click to send email to ${user.email}`}
              >
                {user.email}
              </a>
            ) : (
              <p className="text-gray-600">No email</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            {user.phone_number ? (
              <a
                href={`tel:${user.phone_number.replace(/[\s\+]/g, '')}`}
                className="hover:text-primary hover:underline cursor-pointer"
                title={`Click to call ${user.phone_number}`}
              >
                {user.phone_number}
              </a>
            ) : (
              <p>—</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p>{user.role}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold ${user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
            >
              {user.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pay Rate</p>
            <p>${user.pay_rate || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Check-in Required</p>
            <p>{user.check_in_required ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Is Broker</p>
            <p>{user.is_broker ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      {user.customer_profile && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold mb-4">Customer Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Store Name</p>
              <p>{user.customer_profile.store_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Store Address</p>
              <p>{user.customer_profile.store_address || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Store City</p>
              <p>{user.customer_profile.store_city || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Store Zip Code</p>
              <p>{user.customer_profile.store_zip_code || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Store Billing Email</p>
              {user.customer_profile.store_billing_email && user.customer_profile.store_billing_email !== "N/A" ? (
                <a
                  href={`mailto:${user.customer_profile.store_billing_email}`}
                  className="hover:text-primary hover:underline cursor-pointer"
                  title={`Click to send email to ${user.customer_profile.store_billing_email}`}
                >
                  {user.customer_profile.store_billing_email}
                </a>
              ) : (
                <p>N/A</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Store Phone</p>
              {user.customer_profile.store_phone && user.customer_profile.store_phone !== "N/A" ? (
                <a
                  href={`tel:${user.customer_profile.store_phone.replace(/[\s\+]/g, '')}`}
                  className="hover:text-primary hover:underline cursor-pointer"
                  title={`Click to call ${user.customer_profile.store_phone}`}
                >
                  {user.customer_profile.store_phone}
                </a>
              ) : (
                <p>N/A</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Owner Name</p>
              <p>{user.customer_profile.owner_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Owner Email</p>
              {user.customer_profile.owner_email && user.customer_profile.owner_email !== "N/A" ? (
                <a
                  href={`mailto:${user.customer_profile.owner_email}`}
                  className="hover:text-primary hover:underline cursor-pointer"
                  title={`Click to send email to ${user.customer_profile.owner_email}`}
                >
                  {user.customer_profile.owner_email}
                </a>
              ) : (
                <p>N/A</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Owner Phone</p>
              {user.customer_profile.owner_phone && user.customer_profile.owner_phone !== "N/A" ? (
                <a
                  href={`tel:${user.customer_profile.owner_phone.replace(/[\s\+]/g, '')}`}
                  className="hover:text-primary hover:underline cursor-pointer"
                  title={`Click to call ${user.customer_profile.owner_phone}`}
                >
                  {user.customer_profile.owner_phone}
                </a>
              ) : (
                <p>N/A</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Distributor Name</p>
              <p>{user.customer_profile.distributor_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Distributor Email</p>
              {user.customer_profile.distributor_email && user.customer_profile.distributor_email !== "N/A" ? (
                <a
                  href={`mailto:${user.customer_profile.distributor_email}`}
                  className="hover:text-primary hover:underline cursor-pointer"
                  title={`Click to send email to ${user.customer_profile.distributor_email}`}
                >
                  {user.customer_profile.distributor_email}
                </a>
              ) : (
                <p>N/A</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Distributor Phone</p>
              {user.customer_profile.distributor_phone && user.customer_profile.distributor_phone !== "N/A" ? (
                <a
                  href={`tel:${user.customer_profile.distributor_phone.replace(/[\s\+]/g, '')}`}
                  className="hover:text-primary hover:underline cursor-pointer"
                  title={`Click to call ${user.customer_profile.distributor_phone}`}
                >
                  {user.customer_profile.distributor_phone}
                </a>
              ) : (
                <p>N/A</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Manager Name</p>
              <p>{user.customer_profile.manager_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Manager Email</p>
              {user.customer_profile.manager_email && user.customer_profile.manager_email !== "N/A" ? (
                <a
                  href={`mailto:${user.customer_profile.manager_email}`}
                  className="hover:text-primary hover:underline cursor-pointer"
                  title={`Click to send email to ${user.customer_profile.manager_email}`}
                >
                  {user.customer_profile.manager_email}
                </a>
              ) : (
                <p>N/A</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Manager Phone</p>
              {user.customer_profile.manager_phone && user.customer_profile.manager_phone !== "N/A" ? (
                <a
                  href={`tel:${user.customer_profile.manager_phone.replace(/[\s\+]/g, '')}`}
                  className="hover:text-primary hover:underline cursor-pointer"
                  title={`Click to call ${user.customer_profile.manager_phone}`}
                >
                  {user.customer_profile.manager_phone}
                </a>
              ) : (
                <p>N/A</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Opening Time</p>
              <p>{user.customer_profile.open || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Closing Time</p>
              <p>{user.customer_profile.close || "N/A"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Only show shifts for users who are not customers or partners */}
      {user.role !== "Vending Customer" && user.role !== "Service Customer" && user.role !== "Partner" && (
        <div>
          <div className="flex flex-col mb-4 gap-2">
            <h2 className="text-lg sm:text-xl font-semibold">User Shifts</h2>
            {/* Date Filters */}
            <div className="flex justify-between flex-wrap gap-4 mb-4">
              <div className="flex flex-wrap gap-4 items-end justify-between w-full">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1">Select Date Range</label>
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onDateChange={handleDateRangeChange}
                    placeholder="Choose date"
                    className="w-40"
                  />
                </div>
                <PrimaryBtn
                  onClick={handlePrintReport}
                  disabled={printing}
                >
                  {printing ? "Generating..." : "Print Report"}
                </PrimaryBtn>
              </div>
            </div>
          </div>


          <TableComponent
            dataloading={shiftsLoading}
            columns={columns}
            data={shifts}
            cells={cells}
            heading=""
            description="A list of shifts for this user."
            apiEndpoint="/common/api/shifts/"
            extraParams={{ user_id: userId }}
            itemsPerPage={10}
            renderData={setShifts}
            onLoadingChange={setShiftsLoading}
            refresh={refreshToggle}
          />
        </div>
      )}
    </div>
  );
};

export default UserDetailsPage; 