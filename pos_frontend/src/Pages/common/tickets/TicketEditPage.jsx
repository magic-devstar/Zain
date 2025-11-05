import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Calendar, MapPin, PlusCircle, Trash2 } from 'lucide-react';
import Select from 'react-select';
import { toast } from 'react-hot-toast';
import ImageUploaderComponent from '../../../Components/Common/ImageUploaderComponent';
import PrimaryBtn from '../../../Components/Common/PrimaryBtn';
import SecondaryBtn from '../../../Components/Common/SecondaryBtn';
import api from '../../../utils/api';
import { useSelector } from 'react-redux';
import SignatureCanvas from 'react-signature-canvas';
import PhoneNumberInput from '../../../Components/Common/PhoneNumberInput';
import { UsedItemsInvoiceButton } from './UsedItemsInvoiceButton ';
import { useNavigate, useParams } from "react-router-dom";
import { updateTicket } from '../../../utils/apis/ticketUtils';
import BackButton from '../../../Components/Common/BackButton';

function InventorySelectionPopup({ isOpen, onClose, availableItems, selectedItems, setSelectedItems, usedItems, setUsedItems, defectiveItems, setDefectiveItems, isTechnician, isWarehouseTechnician, initialData }) {
    const [tempSelectedItems, setTempSelectedItems] = useState(selectedItems);
    const [tempUsedItems, setTempUsedItems] = useState(usedItems);
    const [tempDefectiveItems, setTempDefectiveItems] = useState([]);
    const user = useSelector((state) => state.user.user);

    useEffect(() => {
        setTempSelectedItems(selectedItems);
        setTempUsedItems(usedItems);
        if (Array.isArray(defectiveItems)) {
            setTempDefectiveItems(defectiveItems);
        } else if (initialData?.defective_items && typeof initialData.defective_items === 'object') {
            const defectiveItemsArray = Object.keys(initialData.defective_items)
                .filter(id => initialData.defective_items[id])
                .map(Number);
            setTempDefectiveItems(defectiveItemsArray);
        } else {
            setTempDefectiveItems([]);
        }
    }, [selectedItems, usedItems, defectiveItems, initialData]);

    const addItem = useCallback(() => {
        setTempSelectedItems(prev => [...prev, {
            item_id: null,
            inventory_id: null,
            inventory_name: '',
            warehouse_id: null,
            warehouse_name: '',
            status: 'available',
            attributes: {}
        }]);
    }, []);

    const removeItem = useCallback((index) => {
        setTempSelectedItems(prev => {
            const itemToRemove = prev[index];
            if (initialData?.status === "CLOSED" && itemToRemove.item_id && (
                tempUsedItems.includes(itemToRemove.item_id) ||
                tempDefectiveItems.includes(itemToRemove.item_id)
            )) {
                toast.error("Cannot remove used or defective items from a closed ticket.");
                return prev;
            }
            const itemIdToRemove = itemToRemove.item_id;
            setTempUsedItems(prevUsed => prevUsed.filter(id => id !== itemIdToRemove));
            setTempDefectiveItems(prevDefective => prevDefective.filter(id => id !== itemIdToRemove));
            return prev.filter((_, i) => i !== index);
        });
    }, [initialData?.status, tempUsedItems, tempDefectiveItems]);

    const updateItem = useCallback((index, field, value) => {
        setTempSelectedItems(prev => {
            const updatedItems = [...prev];
            if (field === 'item') {
                const selectedItem = availableItems.find(item => item.id === value);
                if (selectedItem) {
                    const prevItemId = updatedItems[index].item_id;
                    updatedItems[index] = {
                        item_id: selectedItem.id,
                        inventory_id: selectedItem.inventory_id,
                        inventory_name: selectedItem.inventory_name,
                        warehouse_id: selectedItem.warehouse,
                        warehouse_name: selectedItem.warehouse_name,
                        status: selectedItem.status,
                        attributes: selectedItem.attributes || {}
                    };
                    if (prevItemId) {
                        if (tempUsedItems.includes(prevItemId)) {
                            setTempUsedItems(prevUsed => prevUsed.filter(id => id !== prevItemId));
                        }
                        if (tempDefectiveItems.includes(prevItemId)) {
                            setTempDefectiveItems(prevDefective => prevDefective.filter(id => id !== prevItemId));
                        }
                    }
                }
            }
            return updatedItems;
        });
    }, [availableItems, tempUsedItems, tempDefectiveItems]);

    const handleUsedItemChange = useCallback((itemId, isChecked) => {
        setTempUsedItems(prev => {
            if (isChecked) {
                // If marking as used, remove from defective items
                setTempDefectiveItems(prevDefective => prevDefective.filter(id => id !== itemId));
                return [...prev, itemId];
            } else {
                return prev.filter(id => id !== itemId);
            }
        });
    }, []);

    const handleDefectiveItemChange = useCallback((itemId, isChecked) => {
        setDefectiveItems(prev => {
            if (isChecked) {
                // If marking as defective, remove from used items
                setUsedItems(prevUsed => prevUsed.filter(id => id !== itemId));
                return [...prev, itemId];
            } else {
                return prev.filter(id => id !== itemId);
            }
        });
    }, []);





    const handleSave = () => {
        setSelectedItems(tempSelectedItems);
        setUsedItems(tempUsedItems);
        setDefectiveItems(tempDefectiveItems);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg w-[95vw] h-[95vh] overflow-auto">
                <h2 className="text-xl font-semibold mb-4">Select Inventory Items</h2>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-gray-700">Select items used in this ticket</span>
                    {tempUsedItems.length > 0 && (
                        <UsedItemsInvoiceButton
                            ticketData={initialData}
                            usedItems={tempUsedItems}
                            availableItems={availableItems}
                        />
                    )}
                </div>
                <div className="space-y-3">
                    {tempSelectedItems.map((item, idx) => {
                        const isUsed = item.item_id && tempUsedItems.includes(item.item_id);
                        const isDefective = item.item_id && tempDefectiveItems.includes(item.item_id);
                        const isDisabled =
                            (
                                ["CLOSED", "PARTIALLY CLOSED", "PENDING APPROVAL"].includes(initialData?.status) &&
                                ["Technician", "Warehouse Technician"].includes(user?.role)
                            ) ||
                            ["Service Customer", "Vending Customer"].includes(user?.role);

                        return (
                            <div key={idx} className="space-y-2 border-b pb-2">
                                {!isTechnician && !isWarehouseTechnician && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                                            <Select
                                                options={getFilteredItemOptions(idx)}
                                                value={getFilteredItemOptions(idx).find(opt => opt.value === item.item_id) || null}
                                                onChange={selectedOption => updateItem(idx, 'item', selectedOption?.value)}
                                                className="w-full"
                                                classNamePrefix="react-select"
                                                placeholder="Select item..."
                                                isClearable
                                                isDisabled={isTechnician || isWarehouseTechnician}
                                            />
                                        </div>
                                        {(initialData || tempSelectedItems.length > 1) && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="text-red-500 hover:text-red-700 cursor-pointer p-1 mt-6"
                                                title="Remove Item"
                                                disabled={isTechnician || isWarehouseTechnician}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                )}
                                {item.item_id && (
                                    <div className="text-sm text-gray-600">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isUsed}
                                                    onChange={e => handleUsedItemChange(item.item_id, e.target.checked)}
                                                    className="form-checkbox h-5 w-5 text-primary"
                                                    disabled={isDisabled || isDefective}
                                                />
                                                <span>Used</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isDefective}
                                                    onChange={e => handleDefectiveItemChange(item.item_id, e.target.checked)}
                                                    className="form-checkbox h-5 w-5 text-red-500"
                                                    disabled={isDisabled || isUsed}
                                                />
                                                <span>Defective</span>
                                            </div>
                                        </div>
                                        <p>Item Name: {item.inventory_name}</p>
                                        <p>Warehouse: {item.warehouse_name}</p>
                                        {Object.keys(item.attributes || {}).length > 0 && (
                                            <div className="grid grid-cols-2 gap-1 mt-1">
                                                {Object.entries(item.attributes).map(([key, value]) => (
                                                    <div key={key} className="text-sm text-gray-600">
                                                        <span className="font-medium">
                                                            {key
                                                                .replace(/_/g, ' ')
                                                                .split(' ')
                                                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                                .join(' ')}:
                                                        </span>{' '}
                                                        {value}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {initialData?.status !== "CLOSED" && (
                    <>
                        {!isTechnician && !isWarehouseTechnician && (
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center text-primary cursor-pointer my-4"
                            >
                                <PlusCircle size={18} className="mr-1" />
                                Add Item
                            </button>
                        )}</>)}
                <div className="mt-6 flex justify-end gap-4">
                    <SecondaryBtn type="button" onClick={onClose}>
                        Cancel
                    </SecondaryBtn>
                    {initialData?.status !== "CLOSED" && (
                        <PrimaryBtn type="button" onClick={handleSave}>
                            Save Selection
                        </PrimaryBtn>
                    )}
                </div>
            </div>
        </div>
    );
}


function TicketEditPage({ onClose, onSubmit, }) {
    const origin = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [representativeName, setRepresentativeName] = useState('');
    const [representativePhone, setRepresentativePhone] = useState('');
    const [flagged, setFlagged] = useState(false);
    const [paid, setPaid] = useState(false);
    const [payable, setPayable] = useState(false);
    const [hasPaidSignature, setHasPaidSignature] = useState(false);
    const [hasCustomerSignature, setHasCustomerSignature] = useState(false);
    const [description, setDescription] = useState('');
    const [ticketNotes, setTicketNotes] = useState('');
    const [deadline, setDeadline] = useState('');
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [availableItems, setAvailableItems] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [assignTo, setAssignTo] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [initialData, setInitialData] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [usedItems, setUsedItems] = useState(() => {
        if (initialData?.item_usages && typeof initialData.item_usages === 'object') {
            return Object.keys(initialData.item_usages)
                .filter(id => initialData.item_usages[id])
                .map(Number);
        }
        return [];
    });
    const [defectiveItems, setDefectiveItems] = useState(() => {
        if (initialData?.defective_items && typeof initialData.defective_items === 'object') {
            return Object.keys(initialData.defective_items)
                .filter(id => initialData.defective_items[id])
                .map(Number);
        }
        return [];
    });
    const [charges, setCharges] = useState(() => {
        if (Array.isArray(initialData?.charges) && initialData.charges.length > 0) {
            return initialData.charges.map(charge => ({
                id: charge.id || Math.random().toString(36).substring(2),
                amount: charge.amount,
                description: charge.description,
                invoice_created: charge.invoice_created || false,
                invoice_id: charge.invoice_id,
                invoice_number: charge.invoice_number,
                invoice_created_at: charge.invoice_created_at
            }));
        }
        return [];
    });
    const [signatureBtnIsOpen, setSignatureBtnIsOpen] = useState(false);
    const [signatureModalIsOpen, setSignatureModalIsOpen] = useState(false);
    const [signatureType, setSignatureType] = useState('');
    const [signatureDataUrl, setSignatureDataUrl] = useState(null);
    const user = useSelector((state) => state.user.user);
    const isTechnician = user?.role === "Technician";
    const isWarehouseTechnician = user?.role === "Warehouse Technician";
    const isServiceCustomer = user?.role === "Service Customer";
    const isVendingCustomer = user?.role === "Vending Customer";
    const isAdmin = user?.role === "Admin";
    const isManager = user?.role === "Manager";
    const [status, setStatus] = useState(initialData?.status || "OPEN");
    const signatureCanvasRef = useRef(null);
    const [availableCustomers, setAvailableCustomers] = useState([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [isInventoryPopupOpen, setIsInventoryPopupOpen] = useState(false);
    const [showInvoiceConfirmation, setShowInvoiceConfirmation] = useState(false);
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

    const { ticketId } = useParams();

    const fetchTicketDetails = async () => {
        try {
            const response = await api.get(`/common/api/tickets/${ticketId}/`);
            setInitialData(response.data);
        } catch (error) {
            console.error("Error fetching Ticket details:", error);
        }
    };

    useEffect(() => {
        fetchTicketDetails();
    }, [ticketId]);


    useEffect(() => {
        if (status === 'PENDING APPROVAL' && !signatureDataUrl) {
            setSignatureBtnIsOpen(true);
        }
    }, [status, signatureDataUrl]);

    useEffect(() => {
        if ((isServiceCustomer || isVendingCustomer) && !initialData) {
            setSelectedCustomer(user?.id || '');
        }
    }, [user, initialData, isServiceCustomer, isVendingCustomer]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingItems(true);
            setIsLoadingCustomers(true);
            try {
                const [techniciansRes, itemsRes, storesRes] = await Promise.all([
                    api.get(`/auth/technician-users/`, { params: { all: true } }),
                    api.get(`/common/api/inventory-items/`, { params: { all: true } }),
                    api.get("/auth/stores/?all=true")
                ]);

                setAvailableItems(itemsRes.data || []);
                setAvailableUsers(techniciansRes.data || []);
                setAvailableCustomers(storesRes.data || []);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load data.');
                setAvailableItems([]);
                setAvailableUsers([]);
                setAvailableCustomers([]);
            } finally {
                setIsLoadingItems(false);
                setIsLoadingCustomers(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            console.log('Updating states with initialData:', initialData); // Debug log
            setTitle(initialData.title || '');
            setRepresentativeName(initialData.representativeName || '');
            setRepresentativePhone(initialData.representativePhone || '');
            setFlagged(initialData.flagged || false);
            setPayable(initialData.payable || false);
            setPaid(initialData.paid || false);
            setDescription(initialData.description || '');
            setTicketNotes(initialData.technician_notes || '');
            setStatus(initialData.status || 'OPEN');
            setDeadline(initialData.deadline ? initialData.deadline.split('T')[0] : '');
            if (initialData.store) {
                const matchingCustomer = availableCustomers.find(
                    customer => customer.id === initialData.store
                );
                if (matchingCustomer) {
                    setSelectedCustomer(matchingCustomer.id);
                }
            }
            setImages(
                initialData.attachments?.map(att => ({
                    id: att.id,
                    file: `${origin}${att.file}`,
                    url: `${origin}${att.file}`,
                    name: att.file.split('/').pop(),
                })) || []
            );
            setAssignTo(
                initialData.assigned_to_users?.map(user => user.id) || []
            );

            const initialItems = Array.isArray(initialData.items) && initialData.items.length > 0
                ? initialData.items.map(item => ({
                    item_id: item.id,
                    inventory_id: item.inventory_id,
                    inventory_name: item.inventory_name,
                    warehouse_id: item.warehouse,
                    warehouse_name: item.warehouse_name,
                    status: item.status,
                    attributes: item.attributes || {}
                }))
                : [];
            setSelectedItems(initialItems);

            const initialUsedItems = initialData.item_usages && typeof initialData.item_usages === 'object'
                ? Object.keys(initialData.item_usages)
                    .filter(id => initialData.item_usages[id])
                    .map(Number)
                : [];
            setUsedItems(initialUsedItems);

            const initialDefectiveItems = initialData.defective_items && typeof initialData.defective_items === 'object'
                ? Object.keys(initialData.defective_items)
                    .filter(id => initialData.defective_items[id])
                    .map(Number)
                : [];
            setDefectiveItems(initialDefectiveItems);

            const initialCharges = Array.isArray(initialData.charges) && initialData.charges.length > 0
                ? initialData.charges.map(charge => ({
                    id: charge.id || Math.random().toString(36).substring(2),
                    amount: charge.amount,
                    description: charge.description,
                    invoice_created: charge.invoice_created || false,
                    invoice_id: charge.invoice_id,
                    invoice_number: charge.invoice_number,
                    invoice_created_at: charge.invoice_created_at
                }))
                : [];
            setCharges(initialCharges);

            const hasExistingCustomerSignature = initialData?.attachments?.some(
                att => att.file.includes('signature.png')
            );
            setHasCustomerSignature(hasExistingCustomerSignature);
        }
    }, [initialData, availableCustomers, origin]);

    const handlePaidChange = useCallback((e) => {
        if (!(isTechnician || isWarehouseTechnician)) {
            setPaid(!paid);
            return;
        }
        if (!hasPaidSignature) {
            setSignatureType('paid');
            setSignatureModalIsOpen(true);
        }
    }, [isTechnician, isWarehouseTechnician, paid, hasPaidSignature]);

    const handleSignatureSubmit = useCallback(async () => {
        const canvas = signatureCanvasRef.current?.getCanvas();
        if (!canvas || signatureCanvasRef.current?.isEmpty()) {
            toast.error("Please provide a signature.");
            return;
        }

        const ctx = canvas.getContext('2d');
        const label = `${user?.username || 'Technician'} (${new Date().toLocaleString()})`;
        ctx.font = '16px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText(label, 10, canvas.height - 10);

        const signatureData = canvas.toDataURL();
        const dataUrlToBlob = (dataUrl) => {
            const [, base64Data] = dataUrl.split(',');
            const mime = dataUrl.match(/:(.*?);/)[1];
            const binary = atob(base64Data);
            const array = [];
            for (let i = 0; i < binary.length; i++) {
                array.push(binary.charCodeAt(i));
            }
            return new Blob([new Uint8Array(array)], { type: mime });
        };

        const signatureBlob = dataUrlToBlob(signatureData);
        const fileName = signatureType === 'paid' ? 'technician-signature.png' : 'signature.png';
        const signatureFile = new File([signatureBlob], fileName, { type: signatureBlob.type });

        const signatureImage = {
            id: Date.now() + Math.random().toString(36).substring(2),
            file: signatureFile,
            url: signatureData,
            name: fileName,
        };

        setImages(prevImages => [...prevImages, signatureImage]);
        setSignatureModalIsOpen(false);

        if (signatureType === 'paid') {
            setPaid(true);
            setHasPaidSignature(true);
        } else if (signatureType === 'status') {
            setHasCustomerSignature(true);
        }
        setSignatureDataUrl(signatureData);
    }, [signatureType, user?.username]);

    const handleSignatureClear = useCallback(() => {
        signatureCanvasRef.current?.clear();
        setSignatureDataUrl(null);
    }, []);

    const handleInternalSubmit = useCallback(async (e) => {
        e.preventDefault();
        if ((isTechnician || isWarehouseTechnician) &&
            ["PENDING APPROVAL", "PARTIALLY CLOSED"].includes(status) &&
            representativePhone.replace(/\D/g, "").length < 10) {
            toast.error("Please enter a valid Representative Phone Number.");
            return;
        }
        if (status === "PENDING APPROVAL" && !hasCustomerSignature) {
            setSignatureType('status');
            setSignatureModalIsOpen(true);
            toast.error("Customer signature is required for PENDING APPROVAL.");
            return;
        }

        if (status === "PENDING APPROVAL" && payable && !paid) {
            if ((isTechnician || isWarehouseTechnician) && !hasPaidSignature) {
                setSignatureType('paid');
                setSignatureModalIsOpen(true);
                toast.error("Payment signature is required for PENDING APPROVAL when payable.");
                return;
            } else {
                toast.error("The Paid checkbox must be checked for PENDING APPROVAL when payable.");
                return;
            }
        }

        if (!selectedCustomer && !isServiceCustomer && !isVendingCustomer) {
            toast.error("Store Selection required");
            return;
        }

        setIsLoading(true);
        // Get all selected item IDs
        const allItemIds = selectedItems.map(item => item.item_id).filter(Boolean);

        // Create dictionaries for used and defective items
        const itemUsagesDict = {};
        const defectiveItemsDict = {};

        // Initialize all selected items as false
        allItemIds.forEach(itemId => {
            itemUsagesDict[itemId] = false;
            defectiveItemsDict[itemId] = false;
        });

        // Set true only for items that are marked as used
        usedItems.forEach(itemId => {
            if (allItemIds.includes(itemId)) {
                itemUsagesDict[itemId] = true;
            }
        });

        // Set true only for items that are marked as defective
        defectiveItems.forEach(itemId => {
            if (allItemIds.includes(itemId)) {
                defectiveItemsDict[itemId] = true;
            }
        });

        const ticketData = {
            title,
            representativeName,
            representativePhone,
            flagged,
            paid,
            payable,
            description,
            ticketNotes,
            store: selectedCustomer,
            status,
            deadline,
            assigned_to: assignTo,
            ticket_items: allItemIds,
            item_usages: itemUsagesDict,
            defective_items: defectiveItemsDict,
            charges: charges.filter(charge => charge.amount && charge.description),
            images: images.map(img => img.file).filter(Boolean),
        };

        try {
            await updateTicket(ticketData, ticketId);
            navigate(-1);
        } catch (err) {
            console.error('Submission failed:', err);
            const errorMessage = err.response?.data?.ticket_items?.ticket_items ||
                err.response?.data?.detail ||
                'Failed to submit ticket. Please try again.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [
        isTechnician, isWarehouseTechnician, status, representativePhone, payable, paid, hasPaidSignature,
        selectedCustomer, isServiceCustomer, isVendingCustomer, title, representativeName, flagged,
        description, ticketNotes, deadline, assignTo, selectedItems, usedItems, defectiveItems, charges, images, onSubmit, onClose
    ]);

    const addItem = useCallback(() => {
        setSelectedItems(prev => [...prev, {
            item_id: null,
            inventory_id: null,
            inventory_name: '',
            warehouse_id: null,
            warehouse_name: '',
            status: 'available',
            attributes: {}
        }]);
    }, []);

    const removeItem = useCallback((index) => {
        setSelectedItems(prev => {
            const itemToRemove = prev[index];
            if (initialData?.status === "CLOSED" && itemToRemove.item_id && (
                usedItems.includes(itemToRemove.item_id) ||
                defectiveItems.includes(itemToRemove.item_id)
            )) {
                toast.error("Cannot remove used or defective items from a closed ticket.");
                return prev;
            }
            const itemIdToRemove = itemToRemove.item_id;
            setUsedItems(prevUsed => prevUsed.filter(id => id !== itemIdToRemove));
            setDefectiveItems(prevDefective => prevDefective.filter(id => id !== itemIdToRemove));
            return prev.filter((_, i) => i !== index);
        });
    }, [initialData?.status, usedItems, defectiveItems]);

    const updateItem = useCallback((index, field, value) => {
        setSelectedItems(prev => {
            const updatedItems = [...prev];
            if (field === 'item') {
                const selectedItem = availableItems.find(item => item.id === value);
                if (selectedItem) {
                    const prevItemId = updatedItems[index].item_id;
                    updatedItems[index] = {
                        item_id: selectedItem.id,
                        inventory_id: selectedItem.inventory_id,
                        inventory_name: selectedItem.inventory_name,
                        warehouse_id: selectedItem.warehouse,
                        warehouse_name: selectedItem.warehouse_name,
                        status: selectedItem.status,
                        attributes: selectedItem.attributes || {}
                    };
                    if (prevItemId) {
                        if (usedItems.includes(prevItemId)) {
                            setUsedItems(prevUsed => prevUsed.filter(id => id !== prevItemId));
                        }
                        if (defectiveItems.includes(prevItemId)) {
                            setDefectiveItems(prevDefective => prevDefective.filter(id => id !== prevItemId));
                        }
                    }
                }
            }
            return updatedItems;
        });
    }, [availableItems, usedItems, defectiveItems]);

    const handleUsedItemChange = useCallback((itemId, isChecked) => {
        setUsedItems(prev => {
            if (isChecked) {
                // If marking as used, remove from defective items
                setDefectiveItems(prevDefective => prevDefective.filter(id => id !== itemId));
                return [...prev, itemId];
            } else {
                return prev.filter(id => id !== itemId);
            }
        });
    }, []);

    const handleDefectiveItemChange = useCallback((itemId, isChecked) => {
        setDefectiveItems(prev => {
            if (isChecked) {
                // If marking as defective, remove from used items
                setUsedItems(prevUsed => prevUsed.filter(id => id !== itemId));
                return [...prev, itemId];
            } else {
                return prev.filter(id => id !== itemId);
            }
        });
    }, []);

    const addCharge = useCallback(() => {
        setCharges(prev => [...prev, {
            id: Math.random().toString(36).substring(2),
            amount: '',
            description: ''
        }]);
    }, []);

    const removeCharge = useCallback((index) => {
        setCharges(prev => prev.filter((_, i) => i !== index));
    }, []);

    const updateCharge = useCallback((index, field, value) => {
        setCharges(prev => {
            const updatedCharges = [...prev];
            updatedCharges[index] = {
                ...updatedCharges[index],
                [field]: value
            };
            return updatedCharges;
        });
    }, []);

    const handleCreateInvoice = useCallback(() => {
        if (charges.length === 0) {
            toast.error("No charges to create invoice from");
            return;
        }
        
        // Check if any charge already has an invoice created
        const hasInvoiceCreated = charges.some(charge => charge.invoice_created);
        if (hasInvoiceCreated) {
            toast.error("An invoice has already been created from this ticket's charges");
            return;
        }
        
        setShowInvoiceConfirmation(true);
    }, [charges]);

    const confirmCreateInvoice = useCallback(async () => {
        try {
            setIsCreatingInvoice(true);
            const response = await api.post(`/common/api/tickets/${ticketId}/create-invoice/`);
            
            toast.success(`Invoice created successfully! Invoice #${response.data.invoice_number}`);
            setShowInvoiceConfirmation(false);
            
            // Refresh the ticket data to get updated charges with invoice_created flags
            await fetchTicketDetails();
            
        } catch (error) {
            console.error('Error creating invoice:', error);
            toast.error(error.response?.data?.detail || 'Failed to create invoice');
        } finally {
            setIsCreatingInvoice(false);
        }
    }, [ticketId]);

    const userOptions = useMemo(() => (Array.isArray(availableUsers) ? availableUsers : []).map(user => ({
        value: user.id,
        label: user.username || user.email || `User ${user.id}`,
    })), [availableUsers]);

    // Modified itemOptions to include all available items, including selected ones
    const itemOptions = useMemo(() => {
        return (Array.isArray(availableItems) ? availableItems : []).map(item => ({
            value: item.id,
            label: `${item.inventory_name} (${item.warehouse_name}) - ${Object.entries(item.attributes || {})
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ') || 'No attributes'}`
        }));
    }, [availableItems]);

    const customerOptions = useMemo(() => (Array.isArray(availableCustomers) ? availableCustomers : []).map(store => ({
        value: store.id,
        label: `${store.store_name} (${store.customer_name})`,
    })), [availableCustomers]);

    const allStatusOptions = useMemo(() => [
        { value: "OPEN", label: "OPEN" },
        { value: "IN PROGRESS", label: "IN PROGRESS" },
        { value: "PARTIALLY CLOSED", label: "PARTIALLY CLOSED" },
        { value: "PENDING APPROVAL", label: "PENDING APPROVAL" },
        { value: "CLOSED", label: "CLOSED" },
    ], []);

    const statusOptions = useMemo(() =>
        ["Technician", "Warehouse Technician"].includes(user?.role)
            ? allStatusOptions.filter(option => option.value !== "CLOSED")
            : allStatusOptions
        , [user?.role, allStatusOptions]);

    const handleStatusSignature = useCallback(() => {
        setSignatureType('status');
        setSignatureModalIsOpen(true);
    }, []);

    useEffect(() => {
        if (signatureModalIsOpen && signatureCanvasRef.current) {
            signatureCanvasRef.current.clear();
        }
    }, [signatureModalIsOpen]);


    // Function to get filtered item options for a specific dropdown
    const getFilteredItemOptions = useCallback((currentIndex) => {
        const selectedItemIds = tempSelectedItems
            .filter((_, index) => index !== currentIndex)
            .map(item => item.item_id)
            .filter(Boolean);

        // Get IDs of items associated with the current ticket
        const ticketItemIds = (initialData?.items || []).map(item => item.id);

        return (Array.isArray(availableItems) ? availableItems : [])
            .filter(item =>
                !selectedItemIds.includes(item.id) && // Exclude already selected items
                (
                    item.status === 'available' || // Include all available items
                    ((item.status === 'in_use' || item.status === 'consumed') && ticketItemIds.includes(item.id)) // Include in_use or consumed items only if they are in the current ticket
                )
            )
            .map(item => ({
                value: item.id,
                label: `${item.inventory_name} (${item.warehouse_name}) - ${Object.entries(item.attributes || {})
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ') || 'No attributes'}`
            }));
    }, [availableItems, selectedItems]);

    return (
        <>
            <div className="flex flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
                <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-1">
                    <BackButton />
                    Update Ticket Details
                </h1>
            </div>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${signatureModalIsOpen ? 'block' : 'hidden'}`}
                onClick={() => setSignatureModalIsOpen(false)}
            >
                <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-lg shadow-lg h-screen w-screen"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-xl font-semibold mb-4">
                        {signatureType === 'paid'
                            ? "Please provide your signature to confirm payment"
                            : "Please sign the document"}
                    </h2>
                    <SignatureCanvas
                        penColor="red"
                        ref={signatureCanvasRef}
                        canvasProps={{
                            width: window.innerWidth,
                            height: window.innerHeight * (window.innerWidth >= 1024 ? 0.8 : 0.7),
                            className: 'signature-canvas'
                        }}
                    />
                    <div className="mt-4 flex justify-between">
                        <PrimaryBtn
                            type="button"
                            className="px-4 py-2 bg-blue-500 text-white rounded"
                            onClick={handleSignatureSubmit}
                        >
                            Submit Signature
                        </PrimaryBtn>
                        <PrimaryBtn onClick={() => setSignatureModalIsOpen(false)}>
                            Close
                        </PrimaryBtn>
                        <SecondaryBtn
                            type="button"
                            className="px-4 py-2 bg-gray-300 text-black rounded"
                            onClick={handleSignatureClear}
                        >
                            Clear
                        </SecondaryBtn>
                    </div>
                </div>
            </div>

            <InventorySelectionPopup
                isOpen={isInventoryPopupOpen}
                onClose={() => setIsInventoryPopupOpen(false)}
                availableItems={availableItems}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                usedItems={usedItems}
                setUsedItems={setUsedItems}
                defectiveItems={defectiveItems}
                setDefectiveItems={setDefectiveItems}
                isTechnician={isTechnician}
                isWarehouseTechnician={isWarehouseTechnician}
                initialData={initialData}
            />

            {/* Invoice Creation Confirmation Popup */}
            {showInvoiceConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Create Invoice</h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to create an invoice from the ticket charges?
                        </p>
                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700">Charges to be included:</p>
                            <div className="mt-2 space-y-1">
                                {charges.map((charge, index) => (
                                    <div key={index} className="text-sm text-gray-600">
                                        • {charge.description}: ${parseFloat(charge.amount || 0).toFixed(2)}
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm font-semibold text-gray-800 mt-2">
                                Total: ${charges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <SecondaryBtn
                                type="button"
                                onClick={() => setShowInvoiceConfirmation(false)}
                                disabled={isCreatingInvoice}
                            >
                                Cancel
                            </SecondaryBtn>
                            <PrimaryBtn
                                type="button"
                                onClick={confirmCreateInvoice}
                                disabled={isCreatingInvoice}
                            >
                                {isCreatingInvoice ? (
                                    <>
                                        <svg
                                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Creating...
                                    </>
                                ) : (
                                    'Create Invoice'
                                )}
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}


            <form onSubmit={handleInternalSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            placeholder="Enter ticket title"
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                            disabled={isTechnician || isWarehouseTechnician}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Calendar size={16} className="text-gray-500" /> Deadline
                        </label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            disabled={isTechnician || isWarehouseTechnician}
                        />
                    </div>

                    {(!isVendingCustomer && !isServiceCustomer) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                            <Select
                                isMulti
                                options={userOptions}
                                value={userOptions.filter(opt => assignTo.includes(opt.value))}
                                onChange={selectedOptions => {
                                    const selectedIds = selectedOptions ? selectedOptions.map(s => s.value) : [];
                                    if (initialData && selectedIds.length === 0) {
                                        toast.error('At least one technician must be assigned.');
                                        return;
                                    }
                                    if (selectedIds.length <= 3) {
                                        setAssignTo(selectedIds);
                                    } else {
                                        toast.error('You can assign a maximum of 3 users.');
                                        setAssignTo(selectedIds.slice(0, 3));
                                    }
                                }}
                                className="react-select-container"
                                classNamePrefix="react-select"
                                placeholder="Search and select users..."
                                isLoading={!availableUsers.length && !isLoading}
                                isDisabled={isTechnician || isWarehouseTechnician}
                            />
                            <p className="text-sm text-gray-500 mt-1">Max 3 Technicians can be assigned.</p>
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Enter ticket description here"
                            rows={10}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            required
                            disabled={isTechnician || isWarehouseTechnician}
                        />
                        {(!isVendingCustomer && !isServiceCustomer) && (
                            <div className='flex w-full items-center justify-between'>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <Select
                                        options={statusOptions}
                                        value={statusOptions.find(opt => opt.value === status)}
                                        onChange={selected => setStatus(selected?.value)}
                                        classNamePrefix="react-select"
                                        isDisabled={
                                            ["PARTIALLY CLOSED", "PENDING APPROVAL", "CLOSED"].includes(initialData?.status) &&
                                            ["Technician", "Service Customer", "Vending Customer"].includes(user?.role)
                                        }
                                    />
                                </div>
                                {(status === "PENDING APPROVAL" || status === "PARTIALLY CLOSED") && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Signature</label>
                                        <PrimaryBtn onClick={handleStatusSignature}>
                                            Take Signature
                                        </PrimaryBtn>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 md:col-span-1">
                        {(!isServiceCustomer && !isVendingCustomer) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
                                <Select
                                    options={customerOptions}
                                    value={customerOptions.find(opt => opt.value === selectedCustomer)}
                                    onChange={selected => setSelectedCustomer(selected?.value)}
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                    placeholder="Search for store..."
                                    isLoading={isLoadingCustomers}
                                    isDisabled={isTechnician || isWarehouseTechnician}
                                    isClearable
                                />
                            </div>
                        )}
                        {(isTechnician || isWarehouseTechnician) && (
                            <>
                                {(status === "PENDING APPROVAL" || status === "PARTIALLY CLOSED" || status === "CLOSED") && (
                                    <>
                                        <span>Representative Information</span>
                                        <div className='flex gap-1 flex-col sm:flex-row justify-between'>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    value={representativeName}
                                                    placeholder="Enter Representative Name"
                                                    onChange={e => setRepresentativeName(e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                                    required
                                                    disabled={
                                                        ["PARTIALLY CLOSED", "PENDING APPROVAL", "CLOSED"].includes(initialData?.status)
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                                <PhoneNumberInput
                                                    value={representativePhone}
                                                    onPhoneChange={(phone) => setRepresentativePhone(phone)}
                                                    disabled={
                                                        ["PARTIALLY CLOSED", "PENDING APPROVAL", "CLOSED"].includes(initialData?.status)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        <div className='flex justify-between px-2'>
                            {(!isVendingCustomer && !isServiceCustomer) && (
                                <>
                                    <label className="flex items-center gap-2 justify-end text-sm font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={payable}
                                            onChange={e => setPayable(e.target.checked)}
                                            className="form-checkbox"
                                            disabled={isTechnician || isWarehouseTechnician}
                                        />
                                        <span>Payable</span>
                                    </label>
                                    {payable && (status === "PENDING APPROVAL" || status === "PARTIALLY CLOSED" || status === "CLOSED") && (
                                        <label className="flex items-center gap-2 justify-end text-sm font-medium text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={paid}
                                                onChange={handlePaidChange}
                                                className="form-checkbox"
                                                disabled={
                                                    hasPaidSignature ||
                                                    ((initialData?.status === "CLOSED") && (isTechnician || isWarehouseTechnician))
                                                }
                                            />
                                            <span>Paid</span>
                                        </label>
                                    )}
                                </>
                            )}
                        </div>

                        {(status === "PENDING APPROVAL" || status === "PARTIALLY CLOSED") && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Approval Notes</label>
                                <textarea
                                    value={ticketNotes}
                                    onChange={e => setTicketNotes(e.target.value)}
                                    placeholder="Enter your notes for approval"
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                    required
                                />
                            </div>
                        )}
                    </div>
                    {(!isVendingCustomer && !isServiceCustomer) && (
                        <div className="md:col-span-2 border-t">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Items Required</label>
                            <div className="grid grid-cols-2 p-2">
                                <div className='flex items-center gap-2'>
                                    <PrimaryBtn
                                        type="button"
                                        onClick={() => setIsInventoryPopupOpen(true)}
                                        disabled={isLoadingItems}
                                    >
                                        {isLoadingItems ? (
                                            <>
                                                <svg
                                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                    />
                                                </svg>
                                                Loading Items...
                                            </>
                                        ) : (
                                            'Manage Items'
                                        )}
                                    </PrimaryBtn>
                                    {selectedItems.length > 0 && (
                                        <div className="text-sm text-gray-600">
                                            <p>Selected Items: {selectedItems.length}</p>
                                            <p>Used Items: {usedItems.length}</p>
                                            {defectiveItems.length > 0 && (
                                                <p>Defective Items: {defectiveItems.length}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {!isTechnician && !isWarehouseTechnician && (
                                    <label className="flex items-center gap-2 justify-end text-sm font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={flagged}
                                            onChange={e => setFlagged(e.target.checked)}
                                            className="form-checkbox"
                                            disabled={isTechnician || isWarehouseTechnician}
                                        />
                                        <span>Flagged</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Ticket Charges Section */}
                    {(isAdmin || isManager || isTechnician) && (
                        <div className="md:col-span-2 border-t">
                            {charges.some(c => c.invoice_created) && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-sm text-blue-700">
                                        <strong>🔒 Charges Locked:</strong> Charges cannot be modified because an invoice has been created from them.
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">Ticket Charges</label>
                                {initialData?.status !== "CLOSED" && !charges.some(c => c.invoice_created) && (
                                    <button
                                        type="button"
                                        onClick={addCharge}
                                        className="flex items-center text-primary cursor-pointer"
                                    >
                                        <PlusCircle size={18} className="mr-1" />
                                        Add Charge
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {charges.map((charge, index) => (
                                    <div key={charge.id} className="flex items-center gap-2 p-3 border border-gray-200 rounded-md">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={charge.amount}
                                                onChange={e => updateCharge(index, 'amount', e.target.value)}
                                                placeholder="Amount"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                                disabled={initialData?.status === "CLOSED" || charges.some(c => c.invoice_created)}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={charge.description}
                                                onChange={e => updateCharge(index, 'description', e.target.value)}
                                                placeholder="Description"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                                disabled={initialData?.status === "CLOSED" || charges.some(c => c.invoice_created)}
                                            />
                                        </div>
                                        {initialData?.status !== "CLOSED" && !charges.some(c => c.invoice_created) && (
                                            <button
                                                type="button"
                                                onClick={() => removeCharge(index)}
                                                className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                                                title="Remove Charge"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {charges.length === 0 && (
                                    <div className="text-sm text-gray-500 text-center py-4">
                                        No charges added yet
                                    </div>
                                )}
                                {charges.length > 0 && (
                                    <div className="text-sm text-gray-600 mt-2">
                                        <p>Total Charges: ${charges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0).toFixed(2)}</p>
                                        {charges.some(charge => charge.invoice_created) ? (
                                            <div className="mt-2 px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed">
                                                Invoice Already Created
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleCreateInvoice}
                                                className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                            >
                                                Create Invoice
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div
                        className="overflow-auto max-h-100 md:col-span-3"
                    >
                        <ImageUploaderComponent
                            images={images}
                            showDeleteButton={true}
                            setImages={setImages}
                            disableUpload={
                                initialData?.status === "CLOSED" &&
                                (isTechnician || isVendingCustomer || isServiceCustomer || isWarehouseTechnician)
                            }
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-4">
                    <SecondaryBtn type="button" disabled={isLoading} onClick={onClose}>
                        Close
                    </SecondaryBtn>
                    <PrimaryBtn type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <svg
                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                {initialData ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            initialData ? 'Update Ticket' : 'Create Ticket'
                        )}
                    </PrimaryBtn>
                </div>
            </form>
        </>
    );
}

export default TicketEditPage;