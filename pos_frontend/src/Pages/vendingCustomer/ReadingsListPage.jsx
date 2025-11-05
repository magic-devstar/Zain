import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from 'react-hot-toast';
import TableComponent from "../../Components/Common/TableComponent";
import PopupComponent from "../../Components/popups/PopupComponent";
import ReadingFormpopup from "../../Components/popups/ReadingFormpopup";
import { createReading } from "../../utils/apis/readingsUtils";
import { useSelector } from 'react-redux';
import SimpleFilter from "../../Components/filters/SimpleFilter";
import Avatar from "../../Components/Common/Avatar";
import api from "../../utils/api";

function ReadingsListPage() {
    const navigate = useNavigate();
    const [dataLoading, setDataLoading] = useState(true);
    const [Readings, setReadings] = useState([]);
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState(""); 
    const [loading, setLoading] = useState(false);
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [printing, setPrinting] = useState(false);
    const { locationId } = useParams();
    const user = useSelector((state) => state.user.user);
    const isAdmin = user?.role === "Admin";
    const isManager = user?.role === "Manager";
    const isReporter = user?.role === "Reporter";
    const [filters, setFilters] = useState({});

    const renderReadings = (ReadingsData) => {
        setReadings(ReadingsData);
    };

    const handleCreateReading = () => {
        setPopupName("Create Reading");
        setPopup(true);
    };

    const handleReadingsubmit = async (ReadingData) => {
        try {
            setLoading(true);
            setRefreshToggle(false);

            // Ensure the vending_location_id is added to the ReadingData
            if (locationId) {
                ReadingData.vending_location = locationId;
            } else {
                throw new Error("Vending Location ID is required.");
            }

            // Proceed with creating the reading
            const response = await createReading(ReadingData);

            setRefreshToggle(true);
            setPopup(false);
            return response;
        } catch (error) {
            toast.error(error.message || "Failed to create Reading");
        } finally {
            setLoading(false);
        }
    };

    const handlePrintReport = async (currentFilters = filters) => {
        try {
            setPrinting(true);

            const params = { 
                ...currentFilters, 
                all: true,
                ...(locationId ? { vending_location_id: locationId } : {})
            };
            
            // Remove empty values
            Object.keys(params).forEach((k) => { 
                if (params[k] === "" || params[k] === null) delete params[k]; 
            });

            const response = await api.get("/common/api/readings-basic/", { params });
            
            // Handle different possible response structures
            let allReadings = [];
            if (response.data && Array.isArray(response.data)) {
                allReadings = response.data;
            } else if (response.data && Array.isArray(response.data.results)) {
                allReadings = response.data.results;
            } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                allReadings = response.data.data;
            } else {
                console.log('Unexpected response structure:', response);
                toast.error("Unexpected data format received from server");
                return;
            }

            if (!allReadings || allReadings.length === 0) { 
                toast.error("No readings found for selected filters"); 
                return; 
            }

            // Calculate total profit with proper error handling
            const totalProfit = allReadings.reduce((sum, reading) => {
                const profit = parseFloat(reading.profit_amount || 0);
                return sum + (isNaN(profit) ? 0 : profit);
            }, 0);

            // Build HTML rows for the report
            const htmlRows = allReadings.map(reading => `
                <tr>
                    <td>${new Date(reading.reading_date).toLocaleString()}</td>
                    <td>$${parseFloat(reading.profit_amount || 0).toFixed(2)}</td>
                    <td>${reading.created_by ? reading.created_by.username : 'N/A'}</td>
                    <td>${reading.notes ? (reading.notes.length > 20 ? `${reading.notes.substring(0, 20)}...` : reading.notes) : 'No notes'}</td>
                </tr>
            `).join('');

            // Create iframe for printing
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <html>
                    <head>
                        <title>Readings Report</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; font-weight: bold; }
                            .header { text-align: center; margin-bottom: 20px; }
                            .header h1 { margin: 0; color: #333; }
                            .header p { margin: 5px 0; color: #666; }
                            .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                            .summary h3 { margin: 0 0 10px 0; color: #333; }
                            .summary p { margin: 5px 0; color: #666; }
                            @media print {
                                body { margin: 0; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Readings Report</h1>
                            <p>Generated on: ${new Date().toLocaleString()}</p>
                            <p>Total Readings: ${allReadings.length}</p>
                        </div>
                        <div class="summary">
                            <h3>Summary</h3>
                            <p><strong>Total Profit:</strong> $${totalProfit.toFixed(2)}</p>
                            <p><strong>Average Profit per Reading:</strong> $${(totalProfit / allReadings.length).toFixed(2)}</p>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Reading Date</th>
                                    <th>Profit</th>
                                    <th>Taken By</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${htmlRows}
                            </tbody>
                        </table>
                    </body>
                </html>
            `);
            doc.close();

            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    document.body.removeChild(iframe);
                }, 300);
            };
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to generate readings report');
        } finally {
            setPrinting(false);
        }
    };

    const columns = [
        { name: "Reading Date", key: "reading_date" },
        { name: "Profit", key: "profit" },
        { name: "Taken by", key: "taken_by" },
        { name: "Notes", key: "notes" },
    ];

    const cells = [
        ({ row }) => (
            <div className="text-sm font-medium text-gray-700 cursor-pointer"
                onClick={() => navigate(`${row.id}`)}
            >
                {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                }).format(new Date(row.reading_date))}
            </div>
        ),

        ({ row }) => (
            <div className="text-sm font-medium text-gray-700">
                ${parseFloat(row.profit_amount).toFixed(2)}
            </div>
        ),

        ({ row }) => (
            <div className="text-sm font-medium text-gray-700">
                {row?.created_by ? (
                    <div className="flex flex-col gap-4 w-full">
                        <div className="flex items-center gap-4 w-full justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar
                                    user={row.created_by}
                                    color="bg-primary"
                                />
                                {/* Info */}
                                <div className="flex flex-col">
                                    <span className="font-semibold text-gray-800">{row.created_by.username}</span>
                                    <span className="text-sm text-gray-500">{row.created_by.email || "No email"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">N/A.</p>
                )}
            </div>
        ),

        ({ row }) => (
            <div className="text-sm font-medium text-gray-700" title={row.notes}>
                {row.notes ? (row.notes.length > 20 ? `${row.notes.substring(0, 20)}...` : row.notes) : "No notes"}
            </div>
        ),
    ];

    return (
        <>
            <SimpleFilter 
                onFilterChange={(newFilters) => {
                    setFilters(newFilters);
                    setRefreshToggle(prev => !prev);
                }}
                showPrintOption={true}
                onPrintClick={handlePrintReport}
            />

            <TableComponent
                dataloading={dataLoading}
                columns={columns}
                data={Readings}
                cells={cells}
                heading="Readings"
                description="Manage readings for here."
                createBtn={isAdmin || isManager || isReporter}
                onCreateClick={handleCreateReading}
                apiEndpoint="/common/api/readings-basic/"
                extraParams={{
                    ...(locationId ? { vending_location_id: locationId } : {}),
                    ...filters,
                }}
                itemsPerPage={10}
                renderData={renderReadings}
                onLoadingChange={setDataLoading}
                refresh={refreshToggle}
            />

            {popupName === "Create Reading" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <ReadingFormpopup
                        loading={loading}
                        onSubmit={handleReadingsubmit}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}
        </>
    );
}

export default ReadingsListPage;