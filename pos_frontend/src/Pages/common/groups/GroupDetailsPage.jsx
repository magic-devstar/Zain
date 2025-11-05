import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import api from "../../../utils/api";
import BackButton from "../../../Components/Common/BackButton";
import EditButton from "../../../Components/Common/EditButton";
import DeleteButton from "../../../Components/Common/DeleteButton";
import PopupComponent from "../../../Components/popups/PopupComponent";
import GroupFormPopup from "../../../Components/popups/GroupFormPopup";
import DeleteConfirmPopup from "../../../Components/popups/DeleteConfirmPopup";
import { deleteGroup, getGroup, updateGroup } from "../../../utils/apis/groupUtils";
import { useNavigate } from "react-router-dom";
import Avatar from "../../../Components/Common/Avatar";
import Spinner from "../../../Components/Common/Spinner";
import toast from "react-hot-toast";
import TableComponent from "../../../Components/Common/TableComponent";

function GroupDetailsPage() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [shiftsLoading, setShiftsLoading] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    // Date filter states
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [printing, setPrinting] = useState(false);

    const fetchGroupDetails = async () => {
        try {
            const data = await getGroup(groupId);
            setGroup(data);
        } catch (error) {
            toast.error(error.message || "Failed to fetch group details");
            navigate("/groups");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroupDetails();
    }, [groupId]);

    const handleEditGroup = () => {
        setPopupName("Edit Group");
        setPopup(true);
    };

    const handleDeleteClick = () => {
        setPopupName("Delete Group");
        setPopup(true);
    };

    const handleDeleteGroup = async () => {
        try {
            await deleteGroup(groupId);
            navigate(-1);
        } catch (error) {
            console.error("Error deleting group:", error);
        }
    };

    const handleGroupSubmit = async (updatedData) => {
        try {
            setLoading(true);
            await updateGroup(groupId, updatedData);
            toast.success("Group updated successfully!");
            setPopup(false);
            fetchGroupDetails(); // Refresh the group details
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

    const handleUserClick = (user) => {
        setSelectedUser(user.id === selectedUser ? null : user);
        setRefreshToggle(!refreshToggle);
    };

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

    // Helper to parse Django duration string to seconds
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

    const handlePrintReport = async () => {
        if (!startDate || !endDate) {
            toast.error("Please select both start and end dates");
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            toast.error("Start date cannot be after end date");
            return;
        }

        // Check if any users have pay rates set
        const usersWithPayRate = group?.users?.filter(u => u.pay_rate && u.pay_rate.toString().trim() !== '') || [];
        if (usersWithPayRate.length === 0) {
            toast.error("No users in this group have pay rates set. Please set pay rates before generating a report.");
            return;
        }

        try {
            setPrinting(true);
            // Fetch shifts for each user in the group in parallel
            const userShiftPromises = group.users.map((user) =>
                api.get("/common/api/shifts/", {
                    params: {
                        user_id: user.id,
                        all: true,
                        start_date: startDate,
                        end_date: endDate,
                    },
                }).then((res) => ({ user, shifts: res.data }))
            );

            const userShifts = await Promise.all(userShiftPromises);

            const reportRows = [];
            let totalSecondsAll = 0;
            let totalAmountAll = 0;

            userShifts.forEach(({ user, shifts }) => {
                const userSeconds = shifts.reduce((acc, shift) => acc + durationToSeconds(shift.duration), 0);

                // Only add to total seconds if user actually worked
                if (userSeconds > 0) {
                    totalSecondsAll += userSeconds;
                }

                // Parse pay_rate safely - handle null, empty string, and invalid values
                let payRate = 0;

                if (user.pay_rate !== null && user.pay_rate !== undefined && user.pay_rate !== "") {
                    const trimmedRate = user.pay_rate.toString().trim();
                    if (trimmedRate !== "") {
                        const parsedRate = parseFloat(trimmedRate);
                        if (!isNaN(parsedRate) && parsedRate > 0) {
                            payRate = parsedRate;
                        } else {
                            console.warn(`❌ Invalid pay rate for user ${user.username}: "${user.pay_rate}" (parsed as ${parsedRate})`);
                        }
                    } else {
                        console.warn(`❌ Empty/whitespace pay rate for user ${user.username}: "${user.pay_rate}"`);
                    }
                } else {
                    console.warn(`❌ No pay rate set for user ${user.username} (value: "${user.pay_rate}")`);
                }

                // Calculate amount earned (convert seconds to hours, then multiply by hourly rate)
                const hoursWorked = userSeconds / 3600;
                const amountEarned = hoursWorked * payRate;
                totalAmountAll += amountEarned;

                // Add all users to report rows, even those with no shifts
                reportRows.push({
                    username: user.username,
                    hoursStr: userSeconds > 0 ? secondsToReadable(userSeconds) : '0h 0m',
                    payRate: payRate > 0 ? `$${payRate.toFixed(2)}` : 'Not Set',
                    amountStr: payRate > 0 && userSeconds > 0 ? `$${amountEarned.toFixed(2)}` : 'N/A',
                });
            });

            // Count users with and without pay rates
            const usersWithPayRate = userShifts.filter(({ user }) => {
                if (user.pay_rate === null || user.pay_rate === undefined || user.pay_rate === "") {
                    return false;
                }
                const trimmedRate = user.pay_rate.toString().trim();
                if (trimmedRate === "") {
                    return false;
                }
                const parsedRate = parseFloat(trimmedRate);
                return !isNaN(parsedRate) && parsedRate > 0;
            }).length;

            const usersWithoutPayRate = userShifts.length - usersWithPayRate;
            const usersWithShifts = userShifts.filter(({ shifts }) => shifts.length > 0).length;
            const usersWithoutShifts = userShifts.length - usersWithShifts;

            // Generate printable content
            const htmlRows = reportRows
                .map((row) => `<tr><td>${row.username}</td><td>${row.hoursStr}</td><td>${row.payRate}</td><td>${row.amountStr}</td></tr>`)
                .join("\n");

            const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shift Report (${startDate} to ${endDate})</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 20px;
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
        padding: 20px;
        border: 1px solid #e5e7eb;
      }
      .header {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        border-bottom: 2px solid #0060AC;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .header img {
        max-width: 130px;
        height: auto;
        margin-bottom: 15px;
      }
      .company-info h2 {
        font-size: 24px;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 10px 0;
      }
      .company-info p {
        font-size: 14px;
        color: #6b7280;
        margin: 5px 0;
      }
      .report-title {
        font-size: 28px;
        font-weight: 800;
        color: #0060AC;
        margin: 0 0 10px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
        text-align: center;
      }
      .date-range {
        font-size: 14px;
        color: #374151;
        margin-bottom: 30px;
        text-align: center;
      }
      .report-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        font-size: 12px;
      }
      .report-table th, .report-table td {
        padding: 8px 10px;
        text-align: left;
        word-wrap: break-word;
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
      .notes {
        font-size: 12px;
        color: #6b7280;
        margin-top: 20px;
        padding: 15px;
        background: #f3f4f6;
        border-radius: 8px;
      }
      .notes p {
        margin: 5px 0;
      }
      @media print {
        body { 
          padding: 0; 
          background: white; 
          font-size: 12px;
        }
        .container { 
          box-shadow: none; 
          border: none; 
          padding: 15px;
        }
        .header { border-bottom-color: #0060AC; }
        .report-table th { background: #0060AC; }
        .report-table { font-size: 10px; }
        .report-table th, .report-table td { padding: 6px 8px; }
      }
      @media screen and (max-width: 768px) {
        .container { padding: 15px; }
        .report-table { font-size: 10px; }
        .report-table th, .report-table td { padding: 6px 8px; }
        .report-title { font-size: 24px; }
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
          <tr><th>User</th><th>Total Hours</th><th>Pay Rate ($/hr)</th><th>Amount ($)</th></tr>
        </thead>
        <tbody>
          ${htmlRows}
          <tr class="totals-row"><td>Group Total</td><td>${secondsToReadable(totalSecondsAll)}</td><td></td><td>$${totalAmountAll.toFixed(2)}</td></tr>
        </tbody>
      </table>
      <div class="notes">
        ${usersWithoutPayRate > 0 ? `<p><strong>Note:</strong> ${usersWithoutPayRate} user(s) do not have pay rates set, so their earnings are not included in the total.</p>` : ''}
        ${usersWithoutShifts > 0 ? `<p><strong>Note:</strong> ${usersWithoutShifts} user(s) have no shifts in the selected date range.</p>` : ''}
      </div>
    </div>
  </body>
</html>`;

            // Mobile-friendly printing approach
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile) {
                // For mobile devices, open in new window and trigger print
                const printWindow = window.open('', '_blank');
                printWindow.document.write(htmlContent);
                printWindow.document.close();

                // Wait for content to load then print
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                        // Close the window after printing (optional)
                        setTimeout(() => {
                            printWindow.close();
                        }, 1000);
                    }, 500);
                };
            } else {
                // For desktop, use the iframe approach
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
                doc.write(htmlContent);
                doc.close();

                printIframe.onload = () => {
                    setTimeout(() => {
                        printIframe.contentWindow.focus();
                        printIframe.contentWindow.print();
                        document.body.removeChild(printIframe);
                    }, 300);
                };
            }
        } catch (error) {
            console.error("Error generating report:", error);
            toast.error(error.message || "Failed to generate report");
        } finally {
            setPrinting(false);
        }
    };

    const columns = useMemo(() => [
        { name: "Start Time", key: "start_time" },
        { name: "End Time", key: "end_time" },
        { name: "Duration", key: "duration" },
    ], []);

    const cells = useMemo(() => [
        ({ row }) => <div className="text-sm">{new Date(row.start_time).toLocaleString()}</div>,
        ({ row }) => <div className="text-sm">{row.end_time ? new Date(row.end_time).toLocaleString() : 'Active'}</div>,
        ({ row }) => <div className="text-sm">{formatDuration(row.duration)}</div>,
    ], []);

    if (loading) {
        return (
            <div className="h-[80svh]">
                <Spinner />
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
                <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-1">
                    <BackButton />
                    Group Details
                </h1>
                <div className="flex gap-2 mr-8">
                    <EditButton onClick={handleEditGroup} />
                    <DeleteButton onClick={handleDeleteClick} />
                </div>
            </div>

            {/* Pay Rate Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">Pay Rate Status</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-700">
                            {group?.users?.filter(u => u.pay_rate && u.pay_rate.toString().trim() !== '').length || 0} users with pay rates
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-red-700">
                            {group?.users?.filter(u => !u.pay_rate || u.pay_rate.toString().trim() === '').length || 0} users without pay rates
                        </span>
                    </div>
                </div>
                <p className="text-blue-600 text-xs mt-2">
                    Only users with pay rates will have their earnings calculated in the report.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full">
                {/* Group Info */}
                <div className="min-w-90 max-w-120">
                    <div className="bg-white rounded-xl px-5 py-[21px] border border-gray-200">
                        <h2 className="font-semibold text-[#495057] mb-4">Group Information</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-500">Name</p>
                                <p className="font-semibol break-words">{group?.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Description</p>
                                <p className="font-semibold break-words">{group?.description || "No description"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Created At</p>
                                <p className="font-semibold">
                                    {group?.created_at
                                        ? new Intl.DateTimeFormat('en-US', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        }).format(new Date(group.created_at))
                                        : "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users List */}
                <div className="w-full md:w-2/3">
                    <div className="bg-white rounded-xl px-5 py-[21px] border border-gray-200">
                        <h2 className="font-semibold text-[#495057] mb-2">Group Members</h2>
                        <p className="text-sm text-gray-500 mb-4">Click on a user to view their shift history.</p>
                        <div className="space-y-4">
                            {group?.users?.length > 0 ? (
                                group.users.map((user) => (
                                    <div
                                        key={user.id}
                                        className={`flex items-center gap-4 p-2 rounded-md cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-primary/10' : 'hover:bg-gray-50'
                                            }`}
                                        onClick={() => handleUserClick(user)}
                                    >
                                        <Avatar user={user} color="bg-primary" />
                                        <div>
                                            <p className="font-semibold">{user.username}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500">No users in this group</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Shifts Table */}
            {selectedUser && (
                <div className="mt-6">
                    <TableComponent
                        dataloading={shiftsLoading}
                        columns={columns}
                        data={shifts}
                        cells={cells}
                        heading={`${selectedUser.username}'s Shifts`}
                        description={`A list of shifts for ${selectedUser.username}.`}
                        apiEndpoint="/common/api/shifts/"
                        extraParams={{ user_id: selectedUser.id }}
                        itemsPerPage={10}
                        renderData={setShifts}
                        onLoadingChange={setShiftsLoading}
                        refresh={refreshToggle}
                    />
                </div>
            )}

            {popupName === "Edit Group" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <GroupFormPopup
                        initialData={group}
                        onSubmit={handleGroupSubmit}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}

            {popupName === "Delete Group" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <DeleteConfirmPopup
                        loading={loading}
                        itemName="Group"
                        onSubmit={handleDeleteGroup}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}
        </>
    );
}

export default GroupDetailsPage; 