import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Register required Chart.js elements and the datalabels plugin
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

function DoughnutChart({ data, labels, backgroundColors }) {
    const chartData = {
        labels: labels,
        datasets: [
            {
                data: data,
                backgroundColor: backgroundColors,
                hoverOffset: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        layout: {
            padding: {
                bottom: 0, // Increase bottom padding to push the legend away from the center
            },
        },
        plugins: {
            legend: {
                display: true, // Enable the legend
                position: "bottom", // Set the legend position
                bottom: 0,
                labels: {
                    usePointStyle: true, // Use circles instead of squares
                    padding: 8,
                    boxWidth: 10,
                    font: {
                        size: 10,
                    },
                },
            },
            tooltip: {
                enabled: true,
                callbacks: {
                    label: (tooltipItem) => {
                        const label = tooltipItem.label || "";
                        const value = tooltipItem.raw || 0;
                        const total = tooltipItem.dataset.data.reduce(
                            (acc, curr) => acc + curr,
                            0
                        );
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    },
                },
            },
            // Show percentage always on the chart
            datalabels: {
                display: true,
                color: "white",
                font: {
                    weight: "bold",
                    size: 12,
                },
                anchor: "end", // Position the label farther from the center
                align: "start", // Align the label towards the border
                offset: 5, // Increase the distance of the label from the segment
                formatter: (value, context) => {
                    const total = context.dataset.data.reduce(
                        (acc, curr) => acc + curr,
                        0
                    );
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${percentage}%`;
                },
            },
        },
        cutout: "0%", // Set to 0 to remove the cutout (make it a pie chart)
    };

    return (
        <>
            <Doughnut data={chartData} options={options} />
        </>
    );
}

export default DoughnutChart;
