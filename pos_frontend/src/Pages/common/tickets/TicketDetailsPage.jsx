import React, { useEffect, useState, useMemo } from "react";
import EditButton from "../../../Components/Common/EditButton";
import { useParams } from "react-router-dom";
import api from "../../../utils/api";
import { useNavigate } from 'react-router-dom';
import BackButton from "../../../Components/Common/BackButton";
import { Flag, MapPin, Printer } from "lucide-react";
import ImageUploaderComponent from "../../../Components/Common/ImageUploaderComponent";
import Spinner from "../../../Components/Common/Spinner";
import PopupComponent from "../../../Components/popups/PopupComponent";
import TicketFormPopup from "../../../Components/popups/TicketFormPopup";
import ItemsComparisonPopup from "../../../Components/popups/ItemsComparisonPopup";
const origin = import.meta.env.VITE_BACKEND_URL;
import { deleteTicket, updateTicket } from '../../../utils/apis/ticketUtils';
import statusColors from '../../../utils/statusColors';
import DeleteButton from "../../../Components/Common/DeleteButton";
import DeleteConfirmPopup from "../../../Components/popups/DeleteConfirmPopup";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import { useSelector } from 'react-redux';
import Avatar from "../../../Components/Common/Avatar";
import { usePageTitle } from "../../../utils/usePageTitle";
import toast from "react-hot-toast";

function TicketDetailsPage() {
    const navigate = useNavigate();
    const { ticketId } = useParams();
    const [TicketDetails, setTicketDetails] = useState(null);
    const [CustomerDetails, setCustomerDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const [isItemsComparisonOpen, setIsItemsComparisonOpen] = useState(false);
    const user = useSelector((state) => state.user.user);
    const isTechnician = user?.role === "Technician";
    const isManager = user?.role === "Manager";
    const isAdmin = user?.role === "Admin";
    const isVendingCustomer = user?.role === "Vending Customer";
    const isServiceCustomer = user?.role === "Service Customer";

    // Set page title automatically based on route
    usePageTitle();

    const shouldShowEditButton = () => {
        // If user is Vending Customer or Service Customer
        if (isVendingCustomer || isServiceCustomer) {
            // Hide button if status is Pending Approval or Closed
            if (TicketDetails?.status === "PENDING APPROVAL" || TicketDetails?.status === "CLOSED") {
                return false;
            }
        }
        // Show button for all other cases
        return true;
    };

    const fetchTicketDetails = async () => {
        try {
            const response = await api.get(`/common/api/tickets/${ticketId}/`);
            setTicketDetails(response.data);
            console.log("Ticket details:", response.data);

            // Set customer details from store_details in the ticket response
            if (response.data.store_details) {
                setCustomerDetails(response.data.store_details);
                console.log("Store/Customer details:", response.data.store_details);
            }

            setLoading(false);
        } catch (error) {
            console.error("Error fetching Ticket details:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicketDetails();
    }, [ticketId]);

    const handleTicketSubmit = async (updatedData) => {
        console.log("Updated data:", updatedData);
        try {
            const response = await updateTicket(updatedData, ticketId);
            toast.success("Ticket updated successfully");
            fetchTicketDetails();
        } catch (error) {
            console.error("Error updating ticket", error);
        }
    };

    const [images, setImages] = useState([]);

    useEffect(() => {
        if (TicketDetails && TicketDetails.attachments) {
            const mappedImages = TicketDetails.attachments.map(att => ({
                url: `${origin}${att.file}`,
            }));
            setImages(mappedImages);
        }
    }, [TicketDetails]);

    // Transform item_usages into an array of used items
    const usedItems = useMemo(() => {
        if (!TicketDetails?.item_usages || !TicketDetails?.items) return [];

        const technicianName = TicketDetails.assigned_to_users?.[0]?.username || "Unknown Technician";

        return Object.keys(TicketDetails.item_usages)
            .filter(id => TicketDetails.item_usages[id]) // Only include items where value is true
            .map(id => {
                const item = TicketDetails.items.find(item => item.id === parseInt(id));
                if (!item) return null;
                return {
                    inventory_name: item.inventory_name,
                    inventory_upc: item.inventory_upc,
                    quantity_used: 1, // Default quantity since not provided
                    technician_name: technicianName,
                    warehouse_name: item.warehouse_name,
                };
            })
            .filter(item => item !== null); // Remove any null entries
    }, [TicketDetails]);

    // Create array of used item IDs for the comparison popup
    const usedItemIds = useMemo(() => {
        if (!TicketDetails?.item_usages) return [];
        return Object.keys(TicketDetails.item_usages)
            .filter(id => TicketDetails.item_usages[id])
            .map(id => parseInt(id));
    }, [TicketDetails]);

    const handleEditticket = () => {
        setPopupName("Edit Ticket");
        setPopup(true);
    };

    const handleDeleteClick = () => {
        setPopupName("Delete Ticket");
        setPopup(true);
    };

    const handleDeleteTicket = async () => {
        try {
            await deleteTicket(ticketId);
            navigate(-1);
        } catch (error) {
            console.error("Error deleting ticket", error);
        }
    };

    // Print functionality (updated to include usedItems)
    const handlePrint = () => {
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket #${TicketDetails?.id || "N/A"} Details</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.2; margin: 10px; color: #333; }
                .header { text-align: center; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #003366; }
                .header h1 { font-size: 14pt; margin: 5px 0; }
                .ticket-info { margin-bottom: 10px; }
                .section { margin-bottom: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 3px; font-size: 8pt; }
                .section-title { font-weight: bold; margin-bottom: 5px; color: #003366; font-size: 9pt; }
                .row { display: flex; margin-bottom: 4px; font-size: 8pt; }
                .label { font-weight: bold; width: 120px; min-width: 120px; }
                .value { flex: 1; }
                .status {
                    display: inline-block; padding: 3px 6px; border-radius: 2px; font-weight: bold; font-size: 8pt;
                    background-color: ${statusColors[TicketDetails?.status]?.split(' ')[0] || "#f8d7da"};
                    color: ${statusColors[TicketDetails?.status]?.split(' ').find(p => p.includes('text-')) || "#721c24"};
                }
                .preserve-linebreaks {
                    white-space: pre-line;
                    word-break: break-word;
                    font-size: 8pt;
                }
                .technician-item, .inventory-item { margin-bottom: 8px; padding: 6px; background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 3px; font-size: 8pt; }
                .notes { white-space: pre-line; font-size: 8pt; }
                @media print { 
                    body { font-size: 9pt; margin: 5px; }
                    .section { margin-bottom: 8px; padding: 6px; }
                    .row { margin-bottom: 3px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Ticket #${TicketDetails?.id || "N/A"}</h1>
                <div class="status">${TicketDetails?.status || "Unknown"}</div>
            </div>
            <div class="section ticket-info">
                <div class="section-title">Ticket Information</div>
                <div class="row"><div class="label">Title:</div><div class="value">${TicketDetails?.title || "N/A"}</div></div>
                <div class="row"><div class="label">Assigned By:</div><div class="value">${TicketDetails?.assigned_by || "N/A"}</div></div>
                <div class="row"><div class="label">Flagged:</div><div class="value">${TicketDetails?.flagged ? "Yes" : "No"}</div></div>
            </div>
            ${CustomerDetails
                ? `
            <div class="section">
                <div class="section-title">Customer Information</div>
                <div class="row"><div class="label">Customer:</div><div class="value">${CustomerDetails.customer?.username || "N/A"}</div></div>
                <div class="row"><div class="label">Email:</div><div class="value">${CustomerDetails.customer?.email || "N/A"}</div></div>
            </div>
            <div class="section">
                <div class="section-title">Store Information</div>
                <div class="row"><div class="label">Store:</div><div class="value">${CustomerDetails.store_name || "N/A"}</div></div>
                <div class="row"><div class="label">Address:</div><div class="value">${CustomerDetails.store_address || "N/A"}</div></div>
                <div class="row"><div class="label">Phone:</div><div class="value">${CustomerDetails.store_phone || "N/A"}</div></div>
            </div>
            `
                : ''
            }
            <div class="section">
                <div class="section-title">Description</div>
                <div class="preserve-linebreaks">${TicketDetails?.description || "N/A"}</div>
            </div>
        </body>
        </html>
        `;

        document.body.appendChild(printFrame);

        printFrame.onload = function () {
            try {
                const doc = printFrame.contentDocument || printFrame.contentWindow.document;
                doc.open();
                doc.write(printContent);
                doc.close();

                setTimeout(() => {
                    printFrame.contentWindow.focus();
                    printFrame.contentWindow.print();
                    setTimeout(() => {
                        document.body.removeChild(printFrame);
                    }, 1000);
                }, 500);
            } catch (error) {
                console.error("Error printing:", error);
                document.body.removeChild(printFrame);
            }
        };

        printFrame.src = 'about:blank';
    };

    if (loading) {
        return (
            <div className="h-[80svh] ">
                <Spinner />
            </div>
        );
    }

    return (
        <>
            {/* Header Start */}
            <div className="flex flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
                <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-1">
                    <BackButton />
                    Ticket Details
                </h1>
                <div className="flex flex-col md:flex-row gap-2">
                    <button
                        className={`border rounded-lg px-3 py-2 font-medium text-sm ${statusColors[TicketDetails?.status] || "bg-red-100 text-red-700 border-red-300"}`}
                    >
                        {TicketDetails?.status || "Unknown"}
                    </button>
                    <PrimaryBtn onClick={handlePrint}>
                        <Printer size={16} />
                        Print
                    </PrimaryBtn>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between flex-wrap mb-2">
                <div className="flex flex-wrap lg:mb-0 md:w-[49.8%] border border-x-[3px] border-x-primary border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 items-center justify-center gap-4">
                    <div className="flex gap-4 w-full">
                        <div className="flex-1 lg:basis-1/2 lg:pr-2">
                            <div className="flex justify-between">
                                <p className="font-semibold text-primary text-xs sm:text-sm">
                                    Ticket Information ( #{TicketDetails?.id || "N/A"} )
                                </p>
                                <div className="flex items-center gap-1">
                                    <div className="ml-auto">
                                        {TicketDetails?.flagged ? (
                                            <Flag size={25} className="text-primary fill-primary" />
                                        ) : (
                                            <Flag size={25} className="text-gray-400" />
                                        )}
                                    </div>
                                    {shouldShowEditButton() && (
                                        <EditButton onClick={handleEditticket} />
                                    )}
                                    {isAdmin && (
                                        <DeleteButton onClick={handleDeleteClick} />
                                    )}
                                </div>
                            </div>
                            <div className="text-sm">
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6">
                                    <span className="font-semibold text-[#212529] opacity-50">Title</span>
                                    <span className="font-semibold text-primary break-all">
                                        {TicketDetails?.title || "N/A"}
                                    </span>
                                </p>
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">Deadline</span>
                                    <span className="font-semibold text-primary">
                                        {TicketDetails?.deadline
                                            ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(TicketDetails.deadline))
                                            : "N/A"}
                                    </span>
                                </p>
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">Created By</span>
                                    <span className="font-semibold text-primary">
                                        {TicketDetails?.created_by || "N/A"}
                                    </span>
                                </p>
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">Assigned By</span>
                                    <span className="font-semibold text-primary">
                                        {TicketDetails?.assigned_by || "N/A"}
                                    </span>
                                </p>
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">Customer</span>
                                    <span className="font-semibold text-primary">
                                        {CustomerDetails?.customer?.username || "N/A"}
                                    </span>
                                </p>
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">Created at</span>
                                    <span className="font-semibold text-primary">
                                        {TicketDetails?.created_at
                                            ? new Intl.DateTimeFormat('en-US', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            }).format(new Date(TicketDetails.created_at))
                                            : "N/A"}
                                    </span>
                                </p>
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">Assigned at</span>
                                    <span className="font-semibold text-primary">
                                        {TicketDetails?.assigned_at
                                            ? new Intl.DateTimeFormat('en-US', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            }).format(new Date(TicketDetails.assigned_at))
                                            : "N/A"}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-[49.8%] border border-x-[3px] border-x-primary border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4">
                    <div className="flex gap-4 w-full">
                        <div className="flex-1 lg:pr-2">
                            <div className="flex justify-between">
                                <p className="font-semibold text-primary text-xs sm:text-sm mb-2">Ticket Description</p>
                            </div>
                            <div className="text-sm max-h-70 px-1 overflow-auto">
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6">
                                    <span className="font-semibold whitespace-pre-line break-words">
                                        {TicketDetails?.description || "N/A"}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer and Store Information Section - Side by Side */}
            {CustomerDetails && (
                <div className="flex flex-col md:flex-row justify-between flex-wrap mb-2">
                    {/* Customer Information - Left Side */}
                    <div className="flex flex-wrap lg:mb-0 md:w-[49.8%] border border-x-[3px] border-x-primary border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 items-center justify-center gap-4">
                        <div className="flex gap-4 w-full">
                            <div className="flex-1 lg:basis-1/2 lg:pr-2">
                                <div className="flex justify-between mb-4">
                                    <p className="font-semibold text-primary text-xs sm:text-sm">Customer Information</p>
                                </div>
                                <div className="text-sm">
                                    <p className="flex flex-col md:flex-row md:items-center md:gap-6">
                                        <span className="font-semibold text-[#212529] opacity-50">Customer Name</span>
                                        <span className="font-semibold text-primary">{CustomerDetails.customer?.username || "N/A"}</span>
                                    </p>
                                    <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                        <span className="font-semibold text-[#212529] opacity-50">Email</span>
                                        {CustomerDetails.customer?.email && CustomerDetails.customer.email !== "N/A" ? (
                                            <a 
                                                href={`mailto:${CustomerDetails.customer.email}`}
                                                className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                title={`Click to send email to ${CustomerDetails.customer.email}`}
                                            >
                                                {CustomerDetails.customer.email}
                                            </a>
                                        ) : (
                                            <span className="font-semibold text-primary">N/A</span>
                                        )}
                                    </p>
                                    <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                        <span className="font-semibold text-[#212529] opacity-50">Store Name</span>
                                        <span className="font-semibold text-primary">{CustomerDetails.store_name || "N/A"}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Store Information - Right Side */}
                    <div className="border border-x-[3px] border-x-primary flex flex-wrap lg:mb-0 md:w-[49.8%] border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 items-center justify-center gap-4">
                        <div className="flex gap-4 w-full">
                            <div className="flex-1 lg:pr-2">
                                <div className="flex justify-between mb-4">
                                    <p className="font-semibold text-primary text-xs sm:text-sm">Store Information</p>
                                </div>
                                <div className="text-sm">
                                    <p className="flex flex-col md:flex-row md:items-center md:gap-6">
                                        <span className="font-semibold text-[#212529] opacity-50">Store Name</span>
                                        <span className="font-semibold text-primary">{CustomerDetails.store_name || "N/A"}</span>
                                    </p>
                                    <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                        <span className="font-semibold text-[#212529] opacity-50">Store Address</span>
                                        <span className="font-semibold text-primary">{CustomerDetails.store_address || "N/A"}</span>
                                    </p>
                                    <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                        <span className="font-semibold text-[#212529] opacity-50">Store City</span>
                                        <span className="font-semibold text-primary">{CustomerDetails.store_city || "N/A"}</span>
                                    </p>
                                    <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                        <span className="font-semibold text-[#212529] opacity-50">Store Zip Code</span>
                                        <span className="font-semibold text-primary">{CustomerDetails.store_zip_code || "N/A"}</span>
                                    </p>
                                    <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                        <span className="font-semibold text-[#212529] opacity-50">Store Billing Email</span>
                                        {CustomerDetails.store_billing_email && CustomerDetails.store_billing_email !== "N/A" ? (
                                            <a 
                                                href={`mailto:${CustomerDetails.store_billing_email}`}
                                                className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                title={`Click to send email to ${CustomerDetails.store_billing_email}`}
                                            >
                                                {CustomerDetails.store_billing_email}
                                            </a>
                                        ) : (
                                            <span className="font-semibold text-primary">N/A</span>
                                        )}
                                    </p>
                                    <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                        <span className="font-semibold text-[#212529] opacity-50">Store Phone</span>
                                        {CustomerDetails.store_phone && CustomerDetails.store_phone !== "N/A" ? (
                                            <a 
                                                href={`tel:${CustomerDetails.store_phone.replace(/[\s\+]/g, '')}`}
                                                className="font-semibold text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                                title={`Click to call ${CustomerDetails.store_phone}`}
                                            >
                                                {CustomerDetails.store_phone}
                                            </a>
                                        ) : (
                                            <span className="font-semibold text-primary">N/A</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Show Store Hours only for Admin and Manager */}
            {CustomerDetails && (isAdmin || isManager) && (
                <div className="flex flex-col lg:flex-row justify-between flex-wrap mb-2">
                    <div className="flex flex-wrap lg:mb-0 w-full border border-x-[3px] border-x-primary border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 items-center justify-center gap-4">
                        <div className="flex gap-4 w-full">
                            <div className="flex items-center justify-between w-full">
                                <p className="font-semibold text-primary text-xs sm:text-sm mb-2">Store Open Hours</p>
                                <div className="flex items-center gap-4">
                                    <p className="flex md:items-center md:gap-6 border border-primary p-1 rounded-lg">
                                        <span className="font-semibold text-[#212529] opacity-50">Open</span>
                                        <span className="font-semibold text-primary">{CustomerDetails.open || "N/A"}</span>
                                    </p>
                                    <p className="flex md:items-center md:gap-6 border border-primary p-1 rounded-lg">
                                        <span className="font-semibold text-[#212529] opacity-50">Close</span>
                                        <span className="font-semibold text-primary">{CustomerDetails.close || "N/A"}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-col-reverse md:flex-row gap-3 mt-2">
                {/* Left Side */}
                <div className="w-full md:w-3/5 lg:w-2/3">
                    <ImageUploaderComponent images={images} setImages={setImages} disableUpload={true} />
                </div>

                {/* Right Side */}
                <div className="w-full md:w-2/5 lg:w-1/3 overflow-y-auto md:max-h-100 scrollbar-custom-style">
                    <div className="bg-white rounded-xl px-5 py-[21px] border border-gray-200 mb-2 overflow-auto">
                        <div className="flex items-center justify-between mb-4 gap-2 w-full">
                            <h2 className="font-semibold text-[#495057]">Technicians</h2>
                        </div>
                        {TicketDetails?.assigned_to_users?.length > 0 ? (
                            <div className="flex flex-col gap-4 w-full">
                                {TicketDetails?.assigned_to_users.map((user, index) => (
                                    <div key={index} className="flex items-center gap-4 w-full justify-between">
                                        <div className="flex items-center gap-4">
                                            <Avatar
                                                user={user}
                                                color="bg-primary"
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-800">{user?.username}</span>
                                                {user?.email && user.email !== "No email" ? (
                                                    <a 
                                                        href={`mailto:${user.email}`}
                                                        className="text-sm text-gray-500 hover:text-primary hover:underline cursor-pointer"
                                                        title={`Click to send email to ${user.email}`}
                                                    >
                                                        {user.email}
                                                    </a>
                                                ) : (
                                                    <span className="text-sm text-gray-500">No email</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">No Technicians.</p>
                        )}
                    </div>

                    <div className="bg-white rounded-xl px-5 py-[21px] border border-gray-200 mb-2 overflow-auto">
                        <div className="flex items-center justify-between mb-4 gap-2 w-full">
                            <h2 className="font-semibold text-[#495057]">Items Required</h2>
                            {TicketDetails?.items?.length > 0 && (
                                <PrimaryBtn
                                    onClick={() => setIsItemsComparisonOpen(true)}
                                    className="text-xs px-3 py-1.5"
                                >
                                    Compare Items
                                </PrimaryBtn>
                            )}
                        </div>
                        {TicketDetails?.items?.length > 0 ? (
                            <div className="flex flex-col gap-4 w-full">
                                {TicketDetails.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                                        <div className="text-sm text-gray-700 space-y-2">
                                            <div><strong>Name:</strong> {item.inventory_name}</div>
                                            <div><strong>UPC:</strong> {item.inventory_upc}</div>
                                            <div><strong>Quantity:</strong> {item.quantity || 1}</div>
                                            <div><strong>Warehouse:</strong> {item.warehouse_name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">No Items Required.</p>
                        )}
                        {usedItems.length > 0 && (
                            <>
                                <div className="flex items-center justify-between mb-4 gap-2 w-full border-t my-2">
                                    <h2 className="font-semibold text-[#495057]">Items Used</h2>
                                </div>
                                <div className="flex flex-col gap-4 w-full">
                                    {usedItems.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                                            <div className="text-sm text-gray-700 space-y-2">
                                                <div><strong>Name:</strong> {item.inventory_name}</div>
                                                <div><strong>UPC:</strong> {item.inventory_upc}</div>
                                                <div><strong>Quantity:</strong> {item.quantity_used}</div>
                                                <div><strong>Used by:</strong> {item.technician_name}</div>
                                                <div><strong>Warehouse:</strong> {item.warehouse_name}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Ticket Charges Section */}
                    {TicketDetails?.charges && Array.isArray(TicketDetails.charges) && TicketDetails.charges.length > 0 && (
                        <div className="bg-white rounded-xl px-5 py-[21px] border border-gray-200 mb-2 overflow-auto">
                            <div className="flex items-center justify-between mb-4 gap-2 w-full">
                                <h2 className="font-semibold text-[#495057]">Ticket Charges</h2>
                                <div className="text-sm font-semibold text-primary">
                                    Total: ${TicketDetails.charges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0).toFixed(2)}
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 w-full">
                                {TicketDetails.charges.map((charge, index) => (
                                    <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                                        <div className="text-sm text-gray-700 space-y-2">
                                            <div><strong>Description:</strong> {charge.description}</div>
                                            <div><strong>Amount:</strong> ${parseFloat(charge.amount).toFixed(2)}</div>
                                            {charge.invoice_created && (
                                                <div className="text-green-600 text-xs">
                                                    <strong>Invoice Created:</strong> #{charge.invoice_number}
                                                    {charge.invoice_created_at && (
                                                        <span className="text-gray-500 ml-2">
                                                            ({new Date(charge.invoice_created_at).toLocaleDateString()})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {TicketDetails.charges.some(charge => charge.invoice_created) && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm text-green-700">
                                        <strong>✓ Invoice Generated:</strong> An invoice has been created from these charges.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {TicketDetails?.technician_notes && (
                        <div className="bg-white rounded-xl px-5 py-[21px] border border-gray-200">
                            <div className="flex items-center justify-between mb-4 gap-2 w-full">
                                <h2 className="font-semibold text-[#495057]">Technician Notes</h2>
                            </div>
                            <div className="break-all max-h-60 overflow-auto">
                                {TicketDetails?.technician_notes || "N/A"}
                            </div>
                        </div>
                    )}
                    {TicketDetails?.customer_notes && (
                        <div className="bg-white rounded-xl px-5 py-[21px] border border-gray-200 my-4">
                            <div className="flex items-center justify-between mb-4 gap-2 w-full">
                                <h2 className="font-semibold text-[#495057]">Customer Review</h2>
                            </div>
                            <div className="break-all max-h-60 overflow-auto">
                                {TicketDetails?.customer_notes || "N/A"}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {popupName === "Edit Ticket" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <TicketFormPopup
                        loading={loading}
                        initialData={TicketDetails}
                        onSubmit={handleTicketSubmit}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}
            {popupName === "Delete Ticket" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <DeleteConfirmPopup
                        loading={loading}
                        itemName="Ticket"
                        onSubmit={handleDeleteTicket}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}

            {/* Items Comparison Popup */}
            <ItemsComparisonPopup
                isOpen={isItemsComparisonOpen}
                onClose={() => setIsItemsComparisonOpen(false)}
                ticketData={TicketDetails}
                usedItems={usedItemIds}
                availableItems={[]} // We don't need availableItems for this comparison
            />
        </>
    );
}

export default TicketDetailsPage;