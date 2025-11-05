import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../utils/api";
import { getGroups } from "../../../utils/apis/groupUtils";
import toast from "react-hot-toast";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import BackButton from "../../../Components/Common/BackButton";
import Spinner from "../../../Components/Common/Spinner";
import DateRangePicker from "../../../Components/Common/DateRangePicker";
import usePermissions from "../../../hooks/usePermissions";
import AccessDenied from "../../../Components/Common/AccessDenied";

const GroupReportsPage = () => {
    const navigate = useNavigate();
    const permissions = usePermissions();
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [groupsLoading, setGroupsLoading] = useState(true);

    // Fetch groups on component mount
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                setGroupsLoading(true);
                const response = await getGroups();
                
                // Handle paginated response - getGroups might return {results: [...]} or just the array
                const groupsData = response.results || response;
                
                // Ensure groupsData is an array
                if (Array.isArray(groupsData)) {
                    setGroups(groupsData);
                } else {
                    console.error("Groups data is not an array:", groupsData);
                    setGroups([]);
                }
            } catch (error) {
                toast.error("Failed to fetch groups");
                console.error("Error fetching groups:", error);
            } finally {
                setGroupsLoading(false);
            }
        };

        fetchGroups();
    }, []);

    // Fetch users when group is selected or when no group is selected
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                
                if (selectedGroup) {
                    // Fetch users from the selected group
                    const groupResponse = await api.get(`/common/api/groups/${selectedGroup.id}/`, {
                        params: {
                            all: true,
                        }
                    });
                    const groupData = groupResponse.data;
                    
                    // Show all users in the group (including those without pay rates)
                    const allGroupUsers = groupData.users || [];
                    setUsers(allGroupUsers);
                } else {
                    // Fetch all users when no group is selected, excluding unwanted roles
                    const rolesToExclude = ['Service Customer', 'Vending Customer', 'Partner'];
                    const response = await api.get('/auth/get-users/', {
                        params: {
                            all: true,
                            exclude_list: rolesToExclude.join(',')
                        }
                    });
                    const allUsers = response.data;
                    
                    // Show all users (including those without pay rates)
                    setUsers(allUsers);
                }
                
                setSelectedUser(null); // Reset selected user when group changes
            } catch (error) {
                console.error("Error fetching users:", error);
                toast.error("Failed to fetch users");
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [selectedGroup]);

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

    const handleDateRangeChange = (newStartDate, newEndDate) => {
        setStartDate(newStartDate);
        setEndDate(newEndDate);
    };

    const handleGenerateReport = async () => {
        if (!selectedGroup && !selectedUser) {
            toast.error("Please select either a group or a specific user");
            return;
        }

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

            if (selectedUser) {
                // Generate report for specific user
                await generateUserReport(selectedUser, startDate, endDate);
            } else if (selectedGroup) {
                // Generate report for entire group
                await generateGroupReport(selectedGroup, startDate, endDate);
            } else {
                // Generate report for all users (when no group selected but users are available)
                await generateAllUsersReport(startDate, endDate);
            }
        } catch (error) {
            console.error("Error generating report:", error);
            toast.error(error.message || "Failed to generate report");
        } finally {
            setPrinting(false);
        }
    };

    const generateUserReport = async (user, startDate, endDate) => {
        // Fetch all shifts for this user in selected date range
        const res = await api.get("/common/api/shifts/", {
            params: {
                user_id: user.id,
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

        // Generate printable report
        const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shift Report - ${user.username} (${startDate} to ${endDate})</title>
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
      <h1 class="report-title">Shift Report - ${user.username}</h1>
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

        printReport(htmlContent);
    };

    const generateAllUsersReport = async (startDate, endDate) => {
        // Filter out inactive users (only include active users for bulk reports)
        const activeUsers = users.filter(u => u.is_active !== false);
        
        // Check if any active users have pay rates set
        const usersWithPayRate = activeUsers.filter(u => u.pay_rate && u.pay_rate.toString().trim() !== '');
        if (usersWithPayRate.length === 0) {
            toast.error("No active users have pay rates set. Please set pay rates before generating a report.");
            return;
        }
        
        // Show warning if some users don't have pay rates
        const excludedUsers = activeUsers.filter(u => !u.pay_rate || u.pay_rate.toString().trim() === '');
        if (excludedUsers.length > 0) {
            toast.error(`${excludedUsers.length} active user(s) without pay rates will be excluded from the report.`);
        }
        
        // Show info about inactive users being excluded
        const inactiveUsers = users.filter(u => u.is_active === false);
        if (inactiveUsers.length > 0) {
            toast(`Note: ${inactiveUsers.length} inactive user(s) have been excluded from this report.`, { icon: 'ℹ️' });
        }

        // Fetch shifts for each active user in parallel
        const userShiftPromises = activeUsers.map((user) =>
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
                    }
                }
            }

            // Calculate amount earned (convert seconds to hours, then multiply by hourly rate)
            const hoursWorked = userSeconds / 3600;
            const amountEarned = hoursWorked * payRate;
            totalAmountAll += amountEarned;

            // Add all users to report rows, even those with no shifts
            reportRows.push({
                username: user.username,
                role: user.role,
                hoursStr: userSeconds > 0 ? secondsToReadable(userSeconds) : '0h 0m',
                payRate: payRate > 0 ? `$${payRate.toFixed(2)}` : 'Not Set',
                amountStr: payRate > 0 && userSeconds > 0 ? `$${amountEarned.toFixed(2)}` : 'N/A',
            });
        });

        // Count users with and without pay rates
        const usersWithPayRateCount = userShifts.filter(({ user }) => {
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

        const excludedUsersCount = userShifts.length - usersWithPayRateCount;
        const usersWithShifts = userShifts.filter(({ shifts }) => shifts.length > 0).length;
        const usersWithoutShifts = userShifts.length - usersWithShifts;

        // Generate printable content
        const htmlRows = reportRows
            .map((row) => `<tr><td>${row.username}</td><td>${row.role}</td><td>${row.hoursStr}</td><td>${row.payRate}</td><td>${row.amountStr}</td></tr>`)
            .join("\n");

        const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Users Shift Report (${startDate} to ${endDate})</title>
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
      <h1 class="report-title">All Users Shift Report</h1>
      <p class="date-range">${startDate} to ${endDate}</p>
      <table class="report-table">
        <thead>
          <tr><th>User</th><th>Role</th><th>Total Hours</th><th>Pay Rate ($/hr)</th><th>Amount ($)</th></tr>
        </thead>
        <tbody>
          ${htmlRows}
          <tr class="totals-row"><td>Total</td><td></td><td>${secondsToReadable(totalSecondsAll)}</td><td></td><td>$${totalAmountAll.toFixed(2)}</td></tr>
        </tbody>
      </table>
      <div class="notes">
        ${excludedUsersCount > 0 ? `<p><strong>Note:</strong> ${excludedUsersCount} active user(s) do not have pay rates set, so their earnings are not included in the total.</p>` : ''}
        ${usersWithoutShifts > 0 ? `<p><strong>Note:</strong> ${usersWithoutShifts} active user(s) have no shifts in the selected date range.</p>` : ''}
        <p><strong>Note:</strong> Only active users are included in this report. Inactive users are excluded.</p>
      </div>
    </div>
  </body>
</html>`;

        printReport(htmlContent);
    };

    const generateGroupReport = async (group, startDate, endDate) => {
        // Filter out inactive users (only include active users for group reports)
        const activeGroupUsers = (group?.users || []).filter(u => u.is_active !== false);
        
        // Check if any active users have pay rates set
        const usersWithPayRate = activeGroupUsers.filter(u => u.pay_rate && u.pay_rate.toString().trim() !== '');
        if (usersWithPayRate.length === 0) {
            toast.error("No active users in this group have pay rates set. Please set pay rates before generating a report.");
            return;
        }
        
        // Show warning if some users don't have pay rates
        const excludedGroupUsers = activeGroupUsers.filter(u => !u.pay_rate || u.pay_rate.toString().trim() === '');
        if (excludedGroupUsers.length > 0) {
            toast.error(`${excludedGroupUsers.length} active user(s) in this group without pay rates will be excluded from the report.`);
        }
        
        // Show info about inactive users being excluded
        const inactiveGroupUsers = (group?.users || []).filter(u => u.is_active === false);
        if (inactiveGroupUsers.length > 0) {
            toast(`Note: ${inactiveGroupUsers.length} inactive user(s) in this group have been excluded from this report.`, { icon: 'ℹ️' });
        }

        // Fetch shifts for each active user in the group in parallel
        const userShiftPromises = activeGroupUsers.map((user) =>
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
                    }
                }
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
        const usersWithPayRateCount = userShifts.filter(({ user }) => {
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

        const excludedUsersCount = userShifts.length - usersWithPayRateCount;
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
    <title>Group Shift Report - ${group.name} (${startDate} to ${endDate})</title>
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
      <h1 class="report-title">Group Shift Report - ${group.name}</h1>
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
        ${excludedUsersCount > 0 ? `<p><strong>Note:</strong> ${excludedUsersCount} active user(s) do not have pay rates set, so their earnings are not included in the total.</p>` : ''}
        ${usersWithoutShifts > 0 ? `<p><strong>Note:</strong> ${usersWithoutShifts} active user(s) have no shifts in the selected date range.</p>` : ''}
        <p><strong>Note:</strong> Only active users are included in this report. Inactive users are excluded.</p>
      </div>
    </div>
  </body>
</html>`;

        printReport(htmlContent);
    };

    const printReport = (htmlContent) => {
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
    };

    // Show error if user doesn't have permission
    if (!permissions.canAccessPayRates()) {
        return (
            <AccessDenied
                title="Generate Report for Groups"
                message="You are not allowed to access this feature."
                featureName="Group Reports"
                requiredPermissions={[
                    "Superuser access, OR",
                    "Admin role, OR", 
                    "Permission 3 (Pay Rate Access)"
                ]}
            />
        );
    }

    if (groupsLoading) {
        return (
            <div className="h-[80svh] flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col overflow-x-hidden">
            <div className="flex flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
                <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-1">
                    <BackButton />
                    Generate Report for Groups
                </h1>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* Group Selection */}
                    <div className="flex flex-col">
                        <label className="text-sm text-gray-600 mb-2 font-medium">Select Group</label>
                        <select
                            value={selectedGroup?.id || ""}
                            onChange={(e) => {
                                const groupId = e.target.value;
                                const group = groups.find(g => g.id === parseInt(groupId));
                                setSelectedGroup(group);
                            }}
                            className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Choose a group...</option>
                            {Array.isArray(groups) && groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* User Selection */}
                    <div className="flex flex-col">
                        <label className="text-sm text-gray-600 mb-2 font-medium">
                            Select User (Optional)
                        </label>
                        <select
                            value={selectedUser?.id || ""}
                            onChange={(e) => {
                                const userId = e.target.value;
                                const user = users.find(u => u.id === parseInt(userId));
                                setSelectedUser(user);
                            }}
                            className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={loading}
                        >
                            <option value="">
                                {selectedGroup ? "All users in group" : "All users (Admin, Manager, Technician, etc.)"}
                            </option>
                            {users.map((user) => {
                                const hasPayRate = user.pay_rate && user.pay_rate.toString().trim() !== '';
                                return (
                                    <option 
                                        key={user.id} 
                                        value={user.id}
                                        style={{
                                            backgroundColor: hasPayRate ? 'white' : '#fef2f2',
                                            color: hasPayRate ? 'black' : '#dc2626'
                                        }}
                                    >
                                        {user.username} ({user.role}) {!hasPayRate ? '⚠️ No Pay Rate' : ''}
                                    </option>
                                );
                            })}
                        </select>
                        {loading && (
                            <div className="text-xs text-gray-500 mt-1">Loading users...</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                            <span className="text-red-600">⚠️ Red text</span> indicates users without pay rates (excluded from reports)
                        </div>
                    </div>

                    {/* Date Range Picker */}
                    <div className="flex flex-col">
                        <label className="text-sm text-gray-600 mb-2 font-medium">Select Date Range</label>
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onDateChange={handleDateRangeChange}
                            placeholder="Choose date range..."
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Generate Report Button */}
                <div className="flex justify-center">
                    <PrimaryBtn
                        onClick={handleGenerateReport}
                        disabled={printing || (!selectedGroup && !selectedUser) || !startDate || !endDate}
                        className="px-8 py-3"
                    >
                        {printing ? "Generating Report..." : "Generate Report"}
                    </PrimaryBtn>
                </div>

                {/* Users Information Table - Only show when group is selected */}
                {selectedGroup && users.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Users in {selectedGroup.name}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-50 border-l-4 border-red-300 mr-2"></div>
                                    <span>No pay rate set (excluded from reports)</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-500 mr-2"></div>
                                    <span>Selected user</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                User
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Role
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Pay Rate
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Phone
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map((user) => {
                                            const hasPayRate = user.pay_rate && user.pay_rate.toString().trim() !== '';
                                            return (
                                                <tr 
                                                    key={user.id}
                                                    className={`hover:bg-gray-50 cursor-pointer ${
                                                        selectedUser?.id === user.id 
                                                            ? 'bg-blue-50 border-l-4 border-blue-500' 
                                                            : !hasPayRate 
                                                                ? 'bg-red-50 border-l-4 border-red-300' 
                                                                : ''
                                                    }`}
                                                    onClick={() => {
                                                        if (selectedUser?.id === user.id) {
                                                            setSelectedUser(null);
                                                        } else {
                                                            setSelectedUser(user);
                                                        }
                                                    }}
                                                >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                                                                {user.username?.charAt(0)?.toUpperCase() || 'U'}
                                                            </div>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {user.username}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                ID: {user.id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {hasPayRate ? (
                                                        <span className="text-gray-900">
                                                            ${parseFloat(user.pay_rate).toFixed(2)}/hr
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                            Not Set
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {user.email || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {user.phone || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {selectedUser && (
                            <div className={`mt-4 p-4 border rounded-lg ${
                                selectedUser.pay_rate && selectedUser.pay_rate.toString().trim() !== ''
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-red-50 border-red-200'
                            }`}>
                                <h4 className={`font-semibold mb-2 ${
                                    selectedUser.pay_rate && selectedUser.pay_rate.toString().trim() !== ''
                                        ? 'text-blue-800'
                                        : 'text-red-800'
                                }`}>
                                    Selected User Details
                                    {(!selectedUser.pay_rate || selectedUser.pay_rate.toString().trim() === '') && (
                                        <span className="ml-2 text-xs font-normal bg-red-200 text-red-800 px-2 py-1 rounded-full">
                                            ⚠️ No Pay Rate Set
                                        </span>
                                    )}
                                </h4>
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm ${
                                    selectedUser.pay_rate && selectedUser.pay_rate.toString().trim() !== ''
                                        ? 'text-blue-700'
                                        : 'text-red-700'
                                }`}>
                                    <div>
                                        <p><strong>Username:</strong> {selectedUser.username}</p>
                                        <p><strong>Role:</strong> {selectedUser.role}</p>
                                        <p><strong>Email:</strong> {selectedUser.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p><strong>Pay Rate:</strong> {selectedUser.pay_rate ? `$${parseFloat(selectedUser.pay_rate).toFixed(2)}/hr` : 'Not Set'}</p>
                                        <p><strong>Phone:</strong> {selectedUser.phone || 'N/A'}</p>
                                        <p><strong>Status:</strong> {selectedUser.is_active ? 'Active' : 'Inactive'}</p>
                                    </div>
                                </div>
                                {(!selectedUser.pay_rate || selectedUser.pay_rate.toString().trim() === '') && (
                                    <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
                                        ⚠️ This user will be excluded from payroll reports due to missing pay rate.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Report Information - Only show when group or user is selected */}
                {(selectedGroup || selectedUser) && (
                    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-2">Report Information</h3>
                        <div className="text-sm text-gray-700">
                            {selectedGroup ? (
                                <>
                                    <p><strong>Group:</strong> {selectedGroup.name}</p>
                                    <p><strong>Report Type:</strong> {selectedUser ? `Individual report for ${selectedUser.username}` : "Group report for all users"}</p>
                                    {selectedGroup.users && (
                                        <p><strong>Total Users in Group:</strong> {selectedGroup.users.length}</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p><strong>Report Type:</strong> Individual report for {selectedUser.username}</p>
                                    <p><strong>User Role:</strong> {selectedUser.role}</p>
                                    <p><strong>User Pay Rate:</strong> {selectedUser.pay_rate ? `$${parseFloat(selectedUser.pay_rate).toFixed(2)}/hr` : 'Not Set'}</p>
                                </>
                            )}
                            <p><strong>Date Range:</strong> {startDate && endDate ? `${startDate} to ${endDate}` : "Please select dates"}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupReportsPage;
