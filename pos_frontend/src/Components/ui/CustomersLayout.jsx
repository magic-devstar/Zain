import React, { useState } from "react";
import { useLocation } from 'react-router-dom';
import CustomersNav from "./CustomersNav";

function CustomersLayout({ children }) {
    const location = useLocation();
    const isChatPage = location.pathname.includes('/chat');


    return (
        <div>
            <CustomersNav />
            <div className="w-full flex items-start justify-center h-[92vh]">
                <div className={`${!isChatPage ? 'w-[95%] sm:w-[90%] md:w-[85%] py-4 h-full' : 'w-full h-full'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}

export default CustomersLayout;
