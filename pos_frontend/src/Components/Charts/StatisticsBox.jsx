import React from "react";


function StatisticsBox({ item }) {
    return (
        <div className="bg-white rounded-lg border-gray-300 shadow border py-2 px-4 space-y-1">
            <h4 className="font-medium relative text-sm md:text-sm flex items-center gap-1">
                {item.typeIcon && (
                    <span className="text-lg text-[#004052]">{item.typeIcon}</span>
                )}
                <span
                    className={`h-4/5 w-[5px] rounded-e-[5px] ${item.color} absolute top-[2px] ${item.typeIcon ? "left-5" : "left-0"
                        }`}
                ></span>
                <span className="type ml-3 truncate sm:text-base text-xs">
                    {item.type}
                </span>
            </h4>
            <p className="type-c text-l md:text-2xl lg:text-3xl font-bold md:break-words">
                {item.value}
            </p>
            <p className="type opacity-60 text-xs md:text-sm font-medium">
                {item.description}
            </p>
        </div>
    );
}

export default StatisticsBox;
