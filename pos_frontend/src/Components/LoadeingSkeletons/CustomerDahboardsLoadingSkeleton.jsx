import SkeletonLine from "./SkeletonLine";

const CustomerDahboardsLoadingSkeleton = () => {
    return (
        <div className="mb-4 mx-0 md:mx-20 animate-pulse">
            <div className="text-2xl font-bold my-6 opacity-90">
                <SkeletonLine height={30} width="200px" />
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                {/* Create Ticket Box */}
                <div className="w-full md:w-1/2 lg:w-1/3 bg-white rounded-2xl border-2 border-black-400 shadow p-4">
                    <div className="mb-4">
                        <SkeletonLine height={20} width="150px" />
                    </div>
                    <div className="rounded-xl border border-l-[3px] p-6 border-l-gray-300 border-black-400 flex items-center justify-between mb-2">
                        <div>
                            <SkeletonLine height={18} width="120px" />
                        </div>
                        <div className="h-6 w-6 rounded-full bg-gray-300"></div>
                    </div>
                </div>

                {/* Tickets Status Box */}
                <div className="w-full md:w-1/2 lg:w-2/3 bg-white rounded-2xl border-2 border-black-400 shadow p-4">
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                        <SkeletonLine height={20} width="80px" />
                    </div>
                    <div className="flex flex-wrap gap-4 justify-evenly items-center py-3.5">
                        {/* Open Tickets */}
                        <div>
                            <div className="mb-2">
                                <SkeletonLine height={16} width="60px" />
                            </div>
                            <div className="flex items-center gap-3 justify-center">
                                <SkeletonLine height={25} width={25} />
                                <SkeletonLine height={45} width={45} />
                            </div>
                        </div>

                        {/* In Progress Tickets */}
                        <div>
                            <div className="mb-2">
                                <SkeletonLine height={16} width="100px" />
                            </div>
                            <div className="flex items-center gap-3 justify-center">
                                <SkeletonLine height={25} width={25} />
                                <SkeletonLine height={45} width={45} />
                            </div>
                        </div>

                        {/* Closed Tickets */}
                        <div>
                            <div className="mb-2">
                                <SkeletonLine height={16} width="70px" />
                            </div>
                            <div className="flex items-center gap-3 justify-center">
                                <SkeletonLine height={25} width={25} />
                                <SkeletonLine height={45} width={45} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Lists */}
            <div className="flex flex-col lg:flex-row gap-5 justify-between">
                <div className="w-full lg:w-1/2">
                    <div className="bg-white rounded-2xl border-2 border-black-400 shadow p-4 mb-4">
                        <div className="mb-4 flex flex-col gap-2">
                            <div className="flex justify-between">
                                <SkeletonLine height={30} width="180px" />
                                <SkeletonLine height={30} width="80px" />
                            </div>
                            <SkeletonLine height={40} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                        </div>
                    </div>
                </div>
                <div className="w-full lg:w-1/2">
                    <div className="bg-white rounded-2xl border-2 border-black-400 shadow p-4 mb-4">
                        <div className="mb-4 flex flex-col gap-2">
                            <div className="flex justify-between">
                                <SkeletonLine height={30} width="180px" />
                                <SkeletonLine height={30} width="80px" />
                            </div>
                            <SkeletonLine height={40} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                            <SkeletonLine height={50} width="100%" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDahboardsLoadingSkeleton;
