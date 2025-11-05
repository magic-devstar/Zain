import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../../../utils/api";
import toast from "react-hot-toast";
import Select from "react-select";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";
import Spinner from "../../../Components/Common/Spinner";
import BarcodeScannerComponent from "react-qr-barcode-scanner";

const ReconciliationForm = () => {
  const user = useSelector((state) => state.user.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [items, setItems] = useState([]);
  const [warehouseItems, setWarehouseItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualUPC, setManualUPC] = useState("");
  const [extraItemsAttributes, setExtraItemsAttributes] = useState({});
  const [missingItems, setMissingItems] = useState({});

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse && reconciliation) {
      fetchWarehouseItems();
    }
  }, [selectedWarehouse, reconciliation]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await api.get("/common/api/warehouses/?all=true");
      setWarehouseOptions(
        response.data.map((warehouse) => ({
          value: warehouse.id,
          label: warehouse.name,
        }))
      );
    } catch (error) {
      toast.error("Failed to load warehouses.");
      console.error("Fetch warehouses error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseItems = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/common/api/InventorySimple/?warehouse_id=${selectedWarehouse.value}&all=true`
      );
      const itemsWithStatus = response.data.map((inventory) => ({
        id: inventory.id,
        upc: inventory.upc,
        name: inventory.name,
        serial_number_required: inventory.serial_number_required,
        expected_quantity: inventory.items.filter(
          (item) => item.status === "available" && item.warehouse === selectedWarehouse.value
        ).length,
        scanned: false,
        actual_quantity: 0,
        quantity_entered: false,
        attributes: inventory.items
          .filter((item) => item.warehouse === selectedWarehouse.value)
          .map((item) => ({
            id: item.id,
            attributes: item.attributes || {},
            status: item.status,
            serial_number: item.attributes?.serial_number || "",
            mac_address: item.attributes?.mac_address || "",
            ip_address: item.attributes?.ip_address || "",
            service_tag: item.attributes?.service_tag || "",
            service_number: item.attributes?.service_number || "",
          })),
      }));
      setWarehouseItems(itemsWithStatus);
      setItems([]);
    } catch (error) {
      toast.error("Failed to load warehouse items.");
      console.error("Fetch warehouse items error:", error);
    } finally {
      setLoading(false);
    }
  };

  const startReconciliation = async () => {
    if (!selectedWarehouse) {
      toast.error("Please select a warehouse first.");
      return;
    }
    try {
      setLoading(true);
      const response = await api.post("/common/api/reconciliations/", {
        warehouse: selectedWarehouse.value,
      });
      setReconciliation(response.data);
      toast.success("Reconciliation started successfully.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start reconciliation.");
      console.error("Start reconciliation error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (err, result) => {
    if (result) {
      const upc = result.text.trim();
      // Don't close the scanner - keep it open for continuous scanning
      await processUPC(upc);
    }
    if (err && scanning) {
      console.error("QR scan error:", err);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualUPC.trim()) {
      toast.error("Please enter a UPC code.");
      return;
    }
    await processUPC(manualUPC.trim());
    setManualUPC("");
  };

  const handleQuantityChange = useCallback((upc, value) => {
    const numValue = value === "" ? "" : Math.max(0, parseInt(value, 10) || 0);

    console.log("Changing quantity", { upc, value, numValue });

    setItems((prev) =>
      prev.map((item) => {
        if (item.upc === upc) {
          const updatedItem = {
            ...item,
            actual_quantity: numValue,
            quantity_entered: numValue !== "" || item.actual_quantity === 0,
          };
          console.log("Updated item:", updatedItem);

          if (numValue === item.expected_quantity) {
            setExtraItemsAttributes((prev) => {
              const { [upc]: _, ...rest } = prev;
              return rest;
            });
            setMissingItems((prev) => {
              const { [upc]: _, ...rest } = prev;
              return rest;
            });
          }
          return updatedItem;
        }
        return item;
      })
    );
  }, []);

  const handleExtraItemAttribute = (upc, index, attributes) => {
    setExtraItemsAttributes((prev) => ({
      ...prev,
      [upc]: {
        ...prev[upc],
        attributes: {
          ...(prev[upc]?.attributes || {}),
          [index]: {
            serial_number: attributes.serial_number || "",
            mac_address: attributes.mac_address || "",
            ip_address: attributes.ip_address || "",
            service_tag: attributes.service_tag || "",
            service_number: attributes.service_number || "",
          },
        },
      },
    }));
  };

  const handleMissingItemSelect = (upc, itemId, selected) => {
    setMissingItems((prev) => ({
      ...prev,
      [upc]: selected
        ? [...(prev[upc] || []), itemId]
        : (prev[upc] || []).filter((id) => id !== itemId),
    }));
  };

  const processUPC = useCallback(
    async (upc) => {
      if (!upc) {
        toast.error("Invalid UPC code.");
        return;
      }
      if (!selectedWarehouse) {
        toast.error("Please select a warehouse before scanning.");
        return;
      }

      try {
        const existingItem = warehouseItems.find((item) => item.upc === upc);
        if (!existingItem) {
          toast.error(`Inventory with UPC ${upc} not found in this warehouse.`);
          return;
        }

        if (existingItem.scanned) {
          toast.error("This item has already been scanned.");
          return;
        }

        console.log("Processing UPC:", upc, "Item:", existingItem);

        setWarehouseItems((prev) =>
          prev.map((item) =>
            item.upc === upc ? { ...item, scanned: true } : item
          )
        );

        setItems((prev) => {
          if (prev.some((item) => item.upc === upc)) {
            console.log("Item already exists in scanned items");
            return prev;
          }

          const newItem = {
            ...existingItem,
            actual_quantity: 0,
            quantity_entered: true,
            manually_marked: false,
            scanned: true,
          };
          console.log("Adding new scanned item:", newItem);
          return [...prev, newItem];
        });

        toast.success(`Scanned item: ${existingItem.name}`);
      } catch (error) {
        console.error("Error processing UPC:", error);
        toast.error("Failed to process item.");
      }
    },
    [warehouseItems, selectedWarehouse]
  );

  const handleMarkAsZero = useCallback(
    (item) => {
      try {
        if (item.expected_quantity > 0) {
          toast.error("Cannot manually mark items that have available quantity.");
          return;
        }

        console.log("Marking as zero:", item);

        setWarehouseItems((prev) =>
          prev.map((wi) =>
            wi.upc === item.upc ? { ...wi, scanned: true } : wi
          )
        );

        setItems((prev) => {
          const exists = prev.some((existingItem) => existingItem.upc === item.upc);

          if (exists) {
            return prev.map((existingItem) =>
              existingItem.upc === item.upc
                ? {
                    ...existingItem,
                    actual_quantity: 0,
                    quantity_entered: true,
                    manually_marked: true,
                    scanned: true,
                  }
                : existingItem
            );
          }

          const newItem = {
            ...item,
            actual_quantity: 0,
            quantity_entered: true,
            manually_marked: true,
            scanned: true,
          };
          console.log("Added new zero item:", newItem);
          return [...prev, newItem];
        });
      } catch (error) {
        console.error("Error marking as zero:", error);
        toast.error("Failed to mark item as zero.");
      }
    },
    []
  );

  const handleSubmit = async () => {
    if (!reconciliation) {
      toast.error("No reconciliation started.");
      return;
    }

    try {
      console.log("Starting submission...", {
        items,
        warehouseItems,
        extraItemsAttributes,
        missingItems,
      });

      const unscannedItems = warehouseItems.filter(
        (item) => !item.scanned && item.expected_quantity > 0
      );
      if (unscannedItems.length > 0) {
        console.log("Unscanned items:", unscannedItems);
        const unscannedNames = unscannedItems.map((item) => item.name).join(", ");
        toast.error(`Please scan these items first: ${unscannedNames}`);
        return;
      }

      const unfilledItems = items.filter((item) => {
        if (!item.manually_marked && !item.quantity_entered && item.actual_quantity !== 0) {
          console.log("Found unfilled item:", item);
          return true;
        }

        if (item.actual_quantity > item.expected_quantity && item.serial_number_required) {
          const extraCount = item.actual_quantity - item.expected_quantity;
          const hasAllExtraAttributes =
            extraItemsAttributes[item.upc]?.attributes &&
            Object.keys(extraItemsAttributes[item.upc].attributes).length === extraCount;
          if (!hasAllExtraAttributes) {
            console.log("Missing extra item attributes:", item);
            return true;
          }
        }

        if (item.expected_quantity > item.actual_quantity && item.serial_number_required) {
          const missingCount = item.expected_quantity - item.actual_quantity;
          const hasAllMissingItems = missingItems[item.upc]?.length === missingCount;
          if (!hasAllMissingItems) {
            console.log("Missing items not specified:", item);
            return true;
          }
        }

        return false;
      });

      if (unfilledItems.length > 0) {
        console.log("Unfilled items:", unfilledItems);
        const itemNames = unfilledItems.map((item) => item.name).join(", ");
        toast.error(`Please complete all required information for: ${itemNames}`);
        return;
      }

      setLoading(true);

      for (const item of items) {
        console.log("Submitting item:", item);

        const extraAttrs =
          item.actual_quantity > item.expected_quantity
            ? Object.values(extraItemsAttributes[item.upc]?.attributes || {})
            : [];

        const missingIds =
          item.expected_quantity > item.actual_quantity
            ? missingItems[item.upc] || []
            : [];

        await api.post(`/common/api/reconciliations/${reconciliation.id}/scan/`, {
          upc: item.upc,
          actual_quantity: item.actual_quantity || 0,
          extra_items_attributes: extraAttrs,
          missing_items: missingIds,
        });
      }

      await api.post(`/common/api/reconciliations/${reconciliation.id}/submit/`);
      toast.success("Reconciliation submitted successfully.");
      navigate(-1);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error.response?.data?.detail || "Failed to submit reconciliation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredWarehouseItems = useMemo(
    () =>
      warehouseItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.upc.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [warehouseItems, searchQuery]
  );

  const handleDirectAdd = (item) => {
    if (!selectedWarehouse) {
      toast.error("Please select a warehouse before adding items.");
      return;
    }

    if (item.scanned) {
      toast.error("This item has already been added.");
      return;
    }

    console.log("Directly adding item:", item);
    processUPC(item.upc);
  };

  const renderAttributes = (attributes) => {
    if (!attributes || !Array.isArray(attributes)) return null;

    const availableItems = attributes.filter((attr) => attr.status === "available");

    return (
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {availableItems.map((attr, idx) => (
          <div key={attr.id || idx} className="border border-gray-200 rounded p-2 bg-green-50">
            <div className="font-medium text-sm mb-1">Item ID: {attr.id || "New"}</div>
            {attr.serial_number && (
              <ul className="list-disc pl-4 text-sm">
                <li>Serial Number: {attr.serial_number}</li>
                <li>MAC Address: {attr.mac_address}</li>
                <li>IP Address: {attr.ip_address}</li>
                <li>Service Tag: {attr.service_tag}</li>
                <li>Service Number: {attr.service_number}</li>
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleScanButtonClick = () => {
    const isHttp = window.location.protocol === "http:";
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (isHttp && !isLocalhost) {
      toast.error("Scanner requires HTTPS or localhost. Please access the site via HTTPS to use this feature on a non-local server.");
      setScanning(false); // Ensure scanner is not activated
      return;
    }
    setScanning(!scanning);
  };

  if (loading) return <Spinner />;

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Warehouse Reconciliation</h2>
      {!reconciliation ? (
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Select Warehouse</label>
            <Select
              options={warehouseOptions}
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              placeholder="Select Warehouse"
              className="mt-1"
            />
          </div>
          <PrimaryBtn onClick={startReconciliation} disabled={loading}>
            Start Reconciliation
          </PrimaryBtn>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <PrimaryBtn onClick={handleScanButtonClick} disabled={loading}>
                {scanning ? "Stop Scanning" : "Scan Barcode"}
              </PrimaryBtn>
              {scanning && (
                <div className="mt-2">
                  <BarcodeScannerComponent
                    width={300}
                    height={300}
                    onUpdate={handleScan}
                    facingMode="environment"
                    torch={false}
                  />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-2">
                <label className="font-medium">Manual UPC Entry</label>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualUPC}
                    onChange={(e) => setManualUPC(e.target.value)}
                    placeholder="Enter UPC code"
                    className="flex-1 border border-gray-200 rounded p-2"
                  />
                  <PrimaryBtn type="submit" disabled={loading}>
                    Add
                  </PrimaryBtn>
                </form>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Warehouse Items</h3>
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={handleSearch}
                className="border border-gray-200 rounded p-2"
              />
            </div>
            <div className="overflow-auto max-h-100">
              <table className="w-full border border-gray-200 text-left">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2">Status</th>
                    <th className="p-2">UPC</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Expected Quantity</th>
                    {/* <th className="p-2">Action</th> */}
                  </tr>
                </thead>
                <tbody>
                  {filteredWarehouseItems.map((item) => (
                    <tr
                      key={item.upc}
                      className={`border border-gray-200 ${item.scanned ? "bg-green-50" : ""}`}
                    >
                      <td className="p-2">
                        {item.scanned ? (
                          <span className="text-green-600">✓ Added</span>
                        ) : (
                          <span className="text-red-600">Pending</span>
                        )}
                      </td>
                      <td className="p-2">{item.upc}</td>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.expected_quantity}</td>
                      {/* <td className="p-2">
                        <div className="flex gap-2 items-center">
                          {!item.scanned && (
                            <>
                              <button
                                onClick={() => handleDirectAdd(item)}
                                className="bg-primary hover:bg-primary_light text-white px-3 py-1 rounded text-sm cursor-pointer"
                                disabled={loading}
                              >
                                Add
                              </button>
                            </>
                          )}
                        </div>
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Scanned Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 text-left">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2">UPC</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Expected Quantity</th>
                      <th className="p-2">Actual Quantity</th>
                      <th className="p-2">Difference</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Actions/Attributes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const difference = (item.actual_quantity || 0) - item.expected_quantity;
                      const status =
                        difference === 0 ? "MATCH" : difference > 0 ? "EXTRA" : "MISSING";

                      const availableAttributes = item.attributes.filter(
                        (attr) => attr.status === "available"
                      );

                      return (
                        <tr key={item.upc} className="border border-gray-200">
                          <td className="p-2">{item.upc}</td>
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">{item.expected_quantity}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.actual_quantity === "" ? "" : item.actual_quantity}
                              onChange={(e) => handleQuantityChange(item.upc, e.target.value)}
                              className={`w-20 border border-gray-200 p-1 rounded ${
                                !item.quantity_entered && item.actual_quantity === "" ? "border border-red-500" : ""
                              }`}
                              placeholder="Enter qty"
                            />
                          </td>
                          <td
                            className={`p-2 ${difference !== 0 ? "font-bold" : ""} ${
                              difference > 0 ? "text-green-600" : difference < 0 ? "text-red-600" : ""
                            }`}
                          >
                            {difference > 0 ? `+${difference}` : difference}
                          </td>
                          <td
                            className={`p-2 font-medium ${
                              status === "MATCH"
                                ? "text-green-600"
                                : status === "EXTRA"
                                ? "text-blue-600"
                                : "text-red-600"
                            }`}
                          >
                            {status}
                          </td>
                          <td className="p-2">
                            {item.actual_quantity > item.expected_quantity && (
                              <div className="mt-4">
                                <h4 className="font-medium text-blue-600 mb-2">
                                  Extra Items ({item.actual_quantity - item.expected_quantity})
                                </h4>
                                <div className="space-y-4">
                                  {Array.from(
                                    { length: item.actual_quantity - item.expected_quantity },
                                    (_, index) => (
                                      <div key={index} className="border rounded p-4 bg-blue-50">
                                        <h5 className="font-medium mb-2">Extra Item #{index + 1}</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {/* Serial Number */}
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              Serial Number
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="Enter Serial Number"
                                              className="w-full border rounded p-2"
                                              value={extraItemsAttributes[item.upc]?.attributes?.[index]?.serial_number || ""}
                                              onChange={(e) =>
                                                handleExtraItemAttribute(item.upc, index, {
                                                  ...extraItemsAttributes[item.upc]?.attributes?.[index],
                                                  serial_number: e.target.value,
                                                })
                                              }
                                            />
                                          </div>
                                          
                                          {/* MAC Address */}
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              MAC Address
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="Enter MAC Address"
                                              className="w-full border rounded p-2"
                                              value={extraItemsAttributes[item.upc]?.attributes?.[index]?.mac_address || ""}
                                              onChange={(e) =>
                                                handleExtraItemAttribute(item.upc, index, {
                                                  ...extraItemsAttributes[item.upc]?.attributes?.[index],
                                                  mac_address: e.target.value,
                                                })
                                              }
                                            />
                                          </div>
                                          
                                          {/* IP Address */}
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              IP Address
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="Enter IP Address"
                                              className="w-full border rounded p-2"
                                              value={extraItemsAttributes[item.upc]?.attributes?.[index]?.ip_address || ""}
                                              onChange={(e) =>
                                                handleExtraItemAttribute(item.upc, index, {
                                                  ...extraItemsAttributes[item.upc]?.attributes?.[index],
                                                  ip_address: e.target.value,
                                                })
                                              }
                                            />
                                          </div>
                                          
                                          {/* Service Tag */}
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              Service Tag
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="Enter Service Tag"
                                              className="w-full border rounded p-2"
                                              value={extraItemsAttributes[item.upc]?.attributes?.[index]?.service_tag || ""}
                                              onChange={(e) =>
                                                handleExtraItemAttribute(item.upc, index, {
                                                  ...extraItemsAttributes[item.upc]?.attributes?.[index],
                                                  service_tag: e.target.value,
                                                })
                                              }
                                            />
                                          </div>
                                          
                                          {/* Service Number */}
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                              Service Number
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="Enter Service Number"
                                              className="w-full border rounded p-2"
                                              value={extraItemsAttributes[item.upc]?.attributes?.[index]?.service_number || ""}
                                              onChange={(e) =>
                                                handleExtraItemAttribute(item.upc, index, {
                                                  ...extraItemsAttributes[item.upc]?.attributes?.[index],
                                                  service_number: e.target.value,
                                                })
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                            {difference < 0 && item.serial_number_required && (
                              <div className="space-y-2">
                                <p className="font-medium text-sm">Select Missing Items:</p>
                                <div className="max-h-40 overflow-y-auto">
                                  {availableAttributes.map((attr) => (
                                    <div
                                      key={attr.id}
                                      className="flex gap-2 p-2 hover:bg-gray-50 border border-gray-200"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={missingItems[item.upc]?.includes(attr.id)}
                                        onChange={(e) =>
                                          handleMissingItemSelect(item.upc, attr.id, e.target.checked)
                                        }
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">ID: {attr.id}</div>
                                        <ul className="list-disc pl-4 text-sm">
                                          <li>Serial Number: {attr.serial_number}</li>
                                          <li>MAC Address: {attr.mac_address}</li>
                                          <li>IP Address: {attr.ip_address}</li>
                                          <li>Service Tag: {attr.service_tag}</li>
                                          <li>Service Number: {attr.service_number}</li>
                                        </ul>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-2">
                              <p className="font-medium text-sm">Current Available Items:</p>
                              {renderAttributes(item.attributes)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <SecondaryBtn onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </SecondaryBtn>
            <PrimaryBtn onClick={handleSubmit} disabled={loading}>
              Submit Reconciliation
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationForm;