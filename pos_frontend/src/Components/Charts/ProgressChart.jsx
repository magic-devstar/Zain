import React from "react";
import DoughnutChart from "./DoughnutChart";

const ProgressChart = ({ progressData }) => {
    const data = [
        progressData.open || 0,
        progressData.in_progress || 0,
        progressData.partially_closed || 0,
        progressData.pending_approval || 0,
        progressData.closed || 0,
    ];
    
    const labels = [
        "Open",
        "In Progress",
        "Partially Closed",
        "Pending Approval",
        "Closed"
    ];
    
    const backgroundColors = [
        "#FB942B",  // Orange for Open
        "#DD3912",  // Red for In Progress
        "#3266CD",  // Blue for Partially Closed
        "#FFC107",  // Yellow for Pending Approval
        "#109718"   // Green for Closed
    ];

    return (
        <>
            <div className="flex justify-between items-center w-full border-b mb-4 pb-4">
                <h2 className="text-lg font-semibold self-start">Ticket Status Distribution</h2>
            </div>
            <div className="relative h-56 w-full flex justify-center items-center">
                <DoughnutChart
                    data={data}
                    labels={labels}
                    backgroundColors={backgroundColors}
                />
            </div>
        </>
    );
};

export default ProgressChart;
