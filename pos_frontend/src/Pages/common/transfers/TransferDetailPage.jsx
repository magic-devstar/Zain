import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../../utils/api";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";
import Spinner from "../../../Components/Common/Spinner";

const TransferDetailPage = () => {
  const { transferId } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransfer = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/common/api/transfer/${transferId}/`);
        setTransfer(response.data);
      } catch (err) {
        console.error("Error fetching transfer:", err);
        toast.error("Failed to load transfer details. Please try again.");
        setError("Failed to load transfer details.");
      } finally {
        setLoading(false);
      }
    };
    fetchTransfer();
  }, [transferId]);

  const handleBack = () => {
    navigate("/transfers");
  };

  // Infer source and destination types from transfer_type
  const getSourceDestinationTypes = (transferType) => {
    switch (transferType) {
      case "VENDOR_TO_WAREHOUSE":
        return { source: "Vendor", destination: "Warehouse" };
      case "WAREHOUSE_TO_WAREHOUSE":
        return { source: "Warehouse", destination: "Warehouse" };
      case "WAREHOUSE_TO_CUSTOMER":
        return { source: "Warehouse", destination: "Customer" };
      case "CUSTOMER_TO_WAREHOUSE":
        return { source: "Customer", destination: "Warehouse" };
      default:
        return { source: "Unknown", destination: "Unknown" };
    }
  };

  if (loading) {
    return (
      <Spinner />
    )
  };

  if (error || !transfer) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <h1 className="text-2xl font-bold mb-6">Transfer Details</h1>
        <div className="text-red-500 mb-4">{error || "No transfer data available."}</div>
        <SecondaryBtn onClick={handleBack}>Back to Transfers</SecondaryBtn>
      </div>
    );
  }

  const { source: sourceType, destination: destinationType } = getSourceDestinationTypes(transfer.transfer_type);

  return (
    <div className="mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">Transfer Details</h1>
      <div className="space-y-6">
        {/* Transfer Information */}
        <div className="border border-x-[3px] border-x-primary border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 ">
          <h2 className="text-xl font-semibold mb-4">Transfer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600"><strong>ID:</strong> #{transfer.id}</p>
              <p className="text-gray-600">
                <strong>Type:</strong>{" "}
                {transfer.transfer_type
                  ? transfer.transfer_type
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-600">
                <strong>Created By:</strong> {transfer.created_by || "Unknown"}
              </p>
              <p className="text-gray-600">
                <strong>Created At:</strong>{" "}
                {transfer.created_at ? new Date(transfer.created_at).toLocaleString() : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-600">
                <strong>Source Type:</strong> {sourceType}
              </p>
              <p className="text-gray-600">
                <strong>Source:</strong> {transfer.source_name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-gray-600">
                <strong>Destination Type:</strong> {destinationType}
              </p>
              <p className="text-gray-600">
                <strong>Destination:</strong> {transfer.destination_name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-gray-600">
                <strong>Reference Number:</strong> {transfer.reference_number || "Unknown"}
              </p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Items</h2>
          {transfer.items && transfer.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inventory Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attributes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transfer.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.inventory__name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.status
                          ? item.status
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (c) => c.toUpperCase())
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.attributes && Object.keys(item.attributes).length > 0 ? (
                          <ul className="list-disc list-inside">
                            {Object.entries(item.attributes).map(([key, value]) => (
                              <li key={key}>
                                {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}: {value}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "N/A"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No items associated with this transfer.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferDetailPage;