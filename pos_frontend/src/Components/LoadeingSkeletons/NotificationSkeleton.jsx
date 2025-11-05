import React from "react";
import SkeletonLine from "./SkeletonLine";

const NotificationSkeleton = ({ count = 5 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <li
          key={`notification-skeleton-${index}`}
          className="bg-white rounded-lg border border-gray-400 shadow-sm overflow-hidden transition-all duration-300 border-l-4 animate-pulse"
          style={{
            borderLeftColor: "var(--color-primary)",
            borderLeftWidth: "5px",
          }}
        >
          <div className="flex items-start p-4">
            <div className="flex-shrink-0 mr-4 mt-1">
              {/* Icon placeholder */}
              <div className="w-5 h-5 rounded-full bg-gray-300"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                {/* Title placeholder */}
                <div className="w-1/2">
                  <SkeletonLine height={16} width="90%" />
                </div>
                <div className="flex items-center ml-4">
                  {/* Time placeholder */}
                  <span className="text-xs flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-300 mr-1"></div>
                    <SkeletonLine height={12} width="60px" />
                  </span>
                </div>
              </div>
              {/* Message placeholder */}
              <div className="mt-1">
                <SkeletonLine height={20} width="100%" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </>
  );
};

export default NotificationSkeleton;