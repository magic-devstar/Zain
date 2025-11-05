import React, { useEffect, useState } from "react";
import StartWorkCard from "../../Components/Common/StartWorkCard";
const ExternalUserDashboard = () => {
    return (
        <>
            <div className="mb-4 mx-0 md:mx-20">
                <h1 className="text-2xl font-bold my-6 opacity-90">Dashboard</h1>

                {/* Header */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">

                    <div className="w-full md:w-1/2 lg:w-1/3">
                        <StartWorkCard />
                    </div>
                </div>

            </div>
        </>
    );
}
export default ExternalUserDashboard;

