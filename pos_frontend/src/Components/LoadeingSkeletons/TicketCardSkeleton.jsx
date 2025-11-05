import SkeletonLine from "./SkeletonLine";

const TicketCardSkeleton = () => {
    return (
        <div className="bg-white p-3 rounded mb-2 border border-gray-100 animate-pulse">
            <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                    <SkeletonLine height={15} width={170} />
                    <SkeletonLine height={15} width={120} />
                </div>
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
            </div>

            <div className="flex items-center mt-3 gap-3">
                <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                <SkeletonLine height={15} width={60} />
                <SkeletonLine height={15} width={60} />
            </div>
        </div>
    );
};

export default TicketCardSkeleton;