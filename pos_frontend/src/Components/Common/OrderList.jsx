import React from "react";
import { Link, Navigate } from "react-router-dom";
import useBasePath from '../../utils/useBasePath ';
import { useNavigate } from 'react-router-dom';
import statusColors from '../../utils/statusColors';
import EditButton from "./EditButton";

const getStatusBadge = (status) => {
  return (
    <div
      className={`px-3 py-1 text-xs font-medium rounded-full w-fit ${statusColors[status] || "bg-red-100 text-red-700 border border-red-300"
        }`}
    >
      {status}
    </div>
  );
};



const OrderList = ({ heading, orders }) => {
  const navigate = useNavigate();
  const basePath = useBasePath();
  return (
    <>
      <div className="p-4 w-full bg-white rounded-2xl  border-2 border-black-400 shadow">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-semibold mb-4">
            {heading} <span className="text-primary">({orders.length})</span>
          </h2>
          <Link to={`${basePath}/tickets`} className="text-primary underline font-medium">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <div className="flex sm:gap-28 gap-10 w-full bg-[#F3F6F9] text-sm opacity-90 p-3 min-w-[450px]">
            <div className="w-1/3 items-center flex">Title</div>
            <div className="w-1/3 items-center justify-center flex">Status</div>
            <div className="w-1/3 items-center justify-center flex">Action</div>
          </div>
        </div>

        <div className="px-3 overflow-x-auto">
          <div className="min-w-[450px]">
            {orders.length > 0 ? (
              orders.map((order, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b last:border-b-0"

                >
                  <div className="w-1/3 cursor-pointer" onClick={() => navigate(`${basePath}/tickets/${order.id}`)} >
                    #{order.id}
                    <span className="text-xs sm:text-sm text-gray-500 items-center flex">
                      {order.title}
                    </span>
                  </div>

                  <div className="text-xs sm:text-base py-2 w-1/3">
                    <div className="flex gap-2 mt-1 items-center justify-center">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  <div className="flex justify-center py-2 w-1/4">
                    <EditButton onClick={() => navigate(`edit/${order.id}`)} />
                  </div>
                </div>
              ))
            ) : (
              <>
                {/* 1st empty row */}
                <div className="flex justify-between items-center py-2 border-b border-gray-400">
                  <div className="w-1/3">&nbsp;</div>
                  <div className="w-1/3">&nbsp;</div>
                  <div className="w-1/3">&nbsp;</div>
                </div>

                {/* 2nd row with 'No Data Available' */}
                <div className="flex justify-center items-center py-4 border-b border-gray-400">
                  <span className="text-gray-400 text-sm">No Data Available</span>
                </div>

                {/* 3rd empty row */}
                <div className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div className="w-1/3">&nbsp;</div>
                  <div className="w-1/3">&nbsp;</div>
                  <div className="w-1/3">&nbsp;</div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </>
  );
};

export default OrderList;
