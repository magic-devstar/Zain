import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IoArrowForward } from "react-icons/io5";
import api from "../../../utils/api";
import BackButton from "../../../Components/Common/BackButton";
import Spinner from "../../../Components/Common/Spinner";
import { toast } from "react-hot-toast";

function ItemTransferHistory() {
    const { itemId } = useParams();
    const [loading, setLoading] = useState(true);
    const [itemDetails, setItemDetails] = useState(null);
    const [transferHistory, setTransferHistory] = useState([]);

    // Fetch item details and transfer history
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch item details
                const itemResponse = await api.get(`/common/api/inventory-items/${itemId}/`);
                setItemDetails(itemResponse.data);

                // Fetch transfer history
                const historyResponse = await api.get(`/common/api/transfer/item-history/`, {
                    params: { item_id: itemId }
                });
                setTransferHistory(historyResponse.data.transfers);
                setItemDetails(prevDetails => ({
                    ...prevDetails,
                    ...historyResponse.data.item_details
                }));
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to fetch item history.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [itemId]);

    if (loading) {
        return (
            <div className="h-[80svh]">
                <Spinner />
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="flex flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
                <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-1">
                    <BackButton />
                    Item Transfer History
                </h1>
            </div>

            {/* Item Details */}
            <div className="w-full border border-gray-200 bg-white rounded-xl py-4 px-4 mb-4">
                <h2 className="text-lg font-semibold mb-3">Item Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <p className="text-gray-600">Item ID</p>
                        <p className="font-semibold">#{itemDetails?.id}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Inventory Name</p>
                        <p className="font-semibold">{itemDetails?.inventory_name}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Inventory UPC</p>
                        <p className="font-semibold">{itemDetails?.inventory_upc}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Current Status</p>
                        <p className="font-semibold capitalize">{itemDetails?.status}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Warehouse Name</p>
                        <p className="font-semibold">{itemDetails?.warehouse_name || 'N/A'}</p>
                    </div>
                    {(itemDetails?.store_name || itemDetails?.customer_name) && (
                        <div>
                            <p className="text-gray-600">Store</p>
                            <p className="font-semibold">{itemDetails?.store_name || itemDetails?.customer_name || 'N/A'}</p>
                        </div>
                    )}

                    {Object.entries(itemDetails?.attributes || {}).map(([key, value]) => (
                        <div key={key}>
                            <p className="text-gray-600">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                            <p className="font-semibold">{value || 'N/A'}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transfer History */}
            <div className="w-full border border-gray-200 bg-white rounded-xl py-4 px-4">
                <h2 className="text-lg font-semibold mb-3">Transfer History</h2>
                {transferHistory.length > 0 ? (
                    <div className="space-y-4">
                        {transferHistory.map((transfer) => (
                            <div key={transfer.id} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between">
                                <div className="flex mb-2 flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-gray-600">{transfer.source_name}</span>
                                        <IoArrowForward className="text-gray-400" />
                                        <span className="font-semibold text-gray-600">{transfer.destination_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Transfer Type:</span>{" "}
                                        <span className="font-semibold">{transfer.transfer_type.replace(/_/g, ' ')}</span>
                                    </div>
                                    {transfer.reference_number && (
                                        <div>
                                            <span className="text-gray-500">Reference Number:</span>{" "}
                                            <span className="font-semibold">{transfer.reference_number}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 text-sm">

                                    <div className="flex flex-col gap-1">
                                        <div>
                                            <span className="text-gray-500">Created By:</span>{" "}
                                            <span className="font-semibold">{transfer.created_by}</span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(transfer.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No transfer history found for this item.</p>
                )}
            </div>
        </>
    );
}

export default ItemTransferHistory; 