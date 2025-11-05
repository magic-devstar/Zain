import React, { useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import { Chart } from "chart.js/auto";

const IncomeChart = ({ incomeData }) => {
    const chartRef = useRef(null);
    const currentYear = new Date().getFullYear();
    const [activeItem, setActiveItem] = useState("12");

    const handleItemClick = (item) => {
        setActiveItem(item);
    };

    // Static data for the whole year
    const fullYearData = [
        { month: "Jan", income: incomeData?.jan },
        { month: "Feb", income: incomeData?.feb },
        { month: "Mar", income: incomeData?.mar },
        { month: "Apr", income: incomeData?.apr },
        { month: "May", income: incomeData?.may },
        { month: "Jun", income: incomeData?.jun },
        { month: "Jul", income: incomeData?.jul },
        { month: "Aug", income: incomeData?.aug },
        { month: "Sep", income: incomeData?.sep },
        { month: "Oct", income: incomeData?.oct },
        { month: "Nov", income: incomeData?.nov },
        { month: "Dec", income: incomeData?.dec },
    ];

    // State to handle selected time range (default: last 3 months)
    const [timeRange, setTimeRange] = useState(12);

    // Filter data based on time range
    const getFilteredData = () => {
        switch (timeRange) {
            case 12:
                return fullYearData;
            case 6:
                return fullYearData.slice(-6);
            case 3:
            default:
                return fullYearData.slice(-3);
        }
    };

    const createGradient = (ctx, chartArea) => {
        const gradient = ctx.createLinearGradient(
            0,
            chartArea.bottom,
            0,
            chartArea.top
        );
        gradient.addColorStop(0, "#6941C6"); // Bottom color
        gradient.addColorStop(0.5, "#9E77ED"); // Center color
        gradient.addColorStop(1, "#4F66FC"); // Top color
        return gradient;
    };

    const chartData = {
        labels: getFilteredData().map((item) => item.month),
        datasets: [
            {
                label: "Income",
                data: getFilteredData().map((item) => item.income),
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;

                    if (!chartArea) {
                        // Return default color if chartArea is not yet defined
                        return "#4F66FC";
                    }
                    return createGradient(ctx, chartArea);
                },
                borderColor: "rgba(63, 81, 181, 1)",
                borderWidth: 1,
                borderRadius: 5, // Rounded bars
                barPercentage: 0.7, // Bar width
                // Ensure very small values remain visible on screen
                minBarLength: 5,
            },
        ],
    };

    // Calculate dynamic max value for Y-axis
    const incomeValues = fullYearData.map((item) => item.income || 0);
    const maxIncomeValue = Math.max(...incomeValues);
    // Add a 10% headroom so bars don't touch the top edge
    const dynamicMax = maxIncomeValue > 0 ? maxIncomeValue * 1.1 : 1000;
    // Determine an appropriate tick step size (divide the axis into ~5 steps)
    const stepSize = dynamicMax / 5;

    useEffect(() => {
        if (chartRef.current) {
            chartRef?.current?.chartInstance?.update();
        }
    }, [timeRange]);

    return (
        <div className="w-full max-w-full h-72">
            <div className="flex flex-col md:flex-row justify-between w-full mb-4 border-b">
                <h2 className="text-lg font-semibold self-start">Income</h2>
                <div className="flex justify-center sm:justify-end mb-6">
                    <button
                        onClick={() => {
                            setTimeRange(12);
                            handleItemClick("12");
                        }}
                        className={`px-4 py-2 text-sm ${activeItem == "12" ? "bg-slate-100" : "bg-white"
                            } border rounded-l-lg`}
                    >
                        1 Year
                    </button>
                    <button
                        onClick={() => {
                            setTimeRange(6);
                            handleItemClick("6");
                        }}
                        className={`px-4 text-sm ${activeItem == "6" ? "bg-slate-100" : "bg-white"
                            } py-2  border-y`}
                    >
                        6 Months
                    </button>
                    <button
                        onClick={() => {
                            setTimeRange(3);
                            handleItemClick("3");
                        }}
                        className={`px-4 py-2 text-sm  ${activeItem == "3" ? "bg-slate-100" : "bg-white"
                            } border rounded-r-lg`}
                    >
                        3 Months
                    </button>
                </div>
            </div>
            <p className="relative text-sm text-end">
                <span className="bg-primary absolute h-2 w-2 rounded-full right-10 top-1.5"></span>
                {currentYear}
            </p>
            <div className="relative w-full">
                <Bar
                    ref={chartRef}
                    data={chartData}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: dynamicMax,
                                ticks: {
                                    stepSize: stepSize,
                                    padding: 0,
                                },
                            },
                        },
                        plugins: {
                            tooltip: {
                                enabled: true, // Tooltips appear on hover only
                            },
                            datalabels: {
                                display: false, // Disable always-on data labels
                            },
                        },
                    }}
                />
            </div>
        </div>
    );
};

export default IncomeChart;
