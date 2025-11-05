import React from "react";
import PrimaryBtn from "../../Components/Common/PrimaryBtn";
import { FaPlus, } from "react-icons/fa";
import StatisticsBox from "../../Components/Charts/StatisticsBox";
import { FaUserAlt, FaWarehouse, FaTruck, FaTools } from "react-icons/fa";
import IncomeChart from "../../Components/Charts/IncomeChart";
import ProgressChart from "../../Components/Charts/ProgressChart";
import StartWorkCard from "../../Components/Common/StartWorkCard";
import { useSelector } from "react-redux";

function WarehouseManagerDahboard() {
    const user = useSelector((state) => state.user.user);

    const dummyStatistics = [
        {
            type: "Total Users",
            value: 1500,
            description: "Registered across all departments",
            color: "bg-blue-500",
            typeIcon: <FaUserAlt />,
        },
        {
            type: "Warehouses",
            value: 12,
            description: "Active warehouse locations",
            color: "bg-green-500",
            typeIcon: <FaWarehouse />,
        },
        {
            type: "Deliveries",
            value: 350,
            description: "Completed in the last 24 hours",
            color: "bg-yellow-500",
            typeIcon: <FaTruck />,
        },
        {
            type: "Open Tickets",
            value: 27,
            description: "Pending maintenance tasks",
            color: "bg-red-500",
            typeIcon: <FaTools />,
        },
        {
            type: "Total Users",
            value: 1500,
            description: "Registered across all departments",
            color: "bg-blue-500",
            typeIcon: <FaUserAlt />,
        },
        {
            type: "Warehouses",
            value: 12,
            description: "Active warehouse locations",
            color: "bg-green-500",
            typeIcon: <FaWarehouse />,
        },
        {
            type: "Deliveries",
            value: 350,
            description: "Completed in the last 24 hours",
            color: "bg-yellow-500",
            typeIcon: <FaTruck />,
        },
        {
            type: "Open Tickets",
            value: 27,
            description: "Pending maintenance tasks",
            color: "bg-red-500",
            typeIcon: <FaTools />,
        },
    ];

    const dummyIncomeData = {
        jan: 420,
        feb: 510,
        mar: 610,
        apr: 300,
        may: 450,
        jun: 670,
        jul: 720,
        aug: 610,
        sep: 530,
        oct: 490,
        nov: 580,
        dec: 640,
    };

    const sampleProgressData = {
        attempted_service: 12,
        document_review: 8,
        filing: 15,
        proof: 5,
    };

    return (
        <div className="clientDashboard">
            {/* Header Section */}
            <div className="flex md:flex-row justify-between items-center md:items-center mb-4">
                <div className="mb-4 md:mb-0">
                    <h1 className="text-xl md:text-2xl font-semibold">Overview</h1>
                    <p className="text-sm md:text-gray-500">
                        New data is available every 10 minutes.
                    </p>
                </div>
                {/* <PrimaryBtn>Create Job <FaPlus /> </PrimaryBtn> */}
            </div>
            <div className="mb-6"></div>
            {/* Statistics Boxes */}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                {user?.check_in_required && (
                    <StartWorkCard />
                )}
                {dummyStatistics.map((item, index) => (
                    <StatisticsBox key={index} item={item} />
                ))}

            </div>
            {/* Charts */}
            <div className="flex flex-wrap gap-4 w-full">
                {/* Income Chart in one column on small screens, in full width on larger screens */}
                <div className="w-full md:w-[64%] flex-1">
                    <div className="bg-white shadow rounded-lg p-4">
                        <IncomeChart incomeData={dummyIncomeData} />
                    </div>
                </div>
                {/* Progress Chart in one column on small screens, in 1/3 width on larger screens */}
                <div className="w-full md:w-1/3 flex-1 lg:flex-none">
                    <div className="bg-white shadow rounded-lg p-4 h-full flex flex-col  items-center">
                        <ProgressChart progressData={sampleProgressData} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WarehouseManagerDahboard;
