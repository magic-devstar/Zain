import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../utils/api";
import BackButton from "../../Components/Common/BackButton";
import Spinner from "../../Components/Common/Spinner";
import SecondaryBtn from "../../Components/Common/SecondaryBtn";
import ImageUploaderComponent from "../../Components/Common/ImageUploaderComponent";
import DeleteButton from "../../Components/Common/DeleteButton";
import PopupComponent from "../../Components/popups/PopupComponent";
import DeleteConfirmPopup from "../../Components/popups/DeleteConfirmPopup";
import { deleteReading } from "../../utils/apis/readingsUtils";
import { useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import Avatar from "../../Components/Common/Avatar";


function ReadingDetailsPage() {
    const { readingId } = useParams();
    const [ReadingDetails, setReadingDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reading, setReading] = useState(null);
    const [popup, setPopup] = useState(false);
    const [popupName, setPopupName] = useState("");
    const navigate = useNavigate();
    const user = useSelector((state) => state.user.user);
    const isAdmin = user?.role === "Admin";

    const fetchReadingDetails = async () => {
        try {
            const response = await api.get(`/common/api/readings-attachments/${readingId}/`);
            setReadingDetails(response.data);
            console.log(response.data);

        } catch (error) {
            console.error("Error fetching Reading details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReadingDetails();
    }, [readingId]);

    const [images, setImages] = useState([]);

    useEffect(() => {
        if (ReadingDetails && ReadingDetails.attachments) {
            const mappedImages = ReadingDetails.attachments.map(att => ({
                url: `${att.file}`,
            }));
            setImages(mappedImages);
        }
    }, [ReadingDetails]);



    const handleDeletePopup = async (readingId) => {
        setReading(readingId);
        setPopupName("Delete Reading");
        setPopup(true);
    };

    const handleDeleteReading = async () => {
        try {
            const response = await deleteReading(reading);
            navigate(-1); // Go back one page
        } catch (error) {
            console.log("Error deleting Reading")
        }
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
                    Reading Details
                </h1>
                <div className="flex flex-col md:flex-row gap-2">
                    {isAdmin && (
                        <DeleteButton onClick={() => handleDeletePopup(ReadingDetails.id)} />
                    )}
                    <SecondaryBtn
                    >
                        Reading #{ReadingDetails?.id}
                    </SecondaryBtn>

                </div>
            </div>

            <div className="flex flex-col lg:flex-row justify-between flex-wrap">
                <div className="flex flex-wrap mb-4 lg:mb-0 lg:w-[33%] border border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 items-center justify-center gap-4">
                    <div className="flex gap-4 w-full">
                        <div className="flex-1 lg:basis-1/2 lg:pr-2">
                            <div className="flex justify-between mb-4">
                                <p className="font-semibold text-primary text-xs sm:text-sm">
                                    Reading Information
                                </p>
                            </div>
                            <div className="text-sm">
                                {/* Reading Name */}
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6">
                                    <span className="font-semibold text-[#212529] opacity-50">Reading Date</span>
                                    <span className="font-semibold text-primary">
                                        {new Intl.DateTimeFormat('en-US', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        }).format(new Date(ReadingDetails?.reading_date))}
                                    </span>
                                </p>
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">
                                        Updated at
                                    </span>
                                    <span className="font-semibold text-primary">
                                        {new Intl.DateTimeFormat('en-US', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        }).format(new Date(ReadingDetails?.updated_at))}
                                    </span>
                                </p>
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                    <span className="font-semibold text-[#212529] opacity-50">
                                        Total Profit
                                    </span>
                                    <span className="font-semibold text-primary">
                                        ${parseFloat(ReadingDetails?.profit_amount).toFixed(2)}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap mb-4 lg:mb-0 lg:w-[33%] border border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4  justify-center gap-4">
                    <div className="flex gap-4 w-full">
                        <div className="flex-1 lg:basis-1/2 lg:pr-2">
                            <div className="flex justify-between mb-4">
                                <p className="font-semibold text-primary text-xs sm:text-sm">
                                    Reading Taken by
                                </p>
                            </div>
                            <div className="text-sm">
                                {ReadingDetails?.created_by ? (
                                    <div className="flex flex-col gap-4 w-full">
                                        <div className="flex items-center gap-4 w-full justify-between">
                                            <div className="flex items-center gap-4">
                                                <Avatar
                                                    user={ReadingDetails.created_by}
                                                    color="bg-primary"
                                                />

                                                {/* Info */}
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-800">{ReadingDetails.created_by.username}</span>
                                                    <span className="text-sm text-gray-500">{ReadingDetails.created_by.email || "No email"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">N/A.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-[33%] border border-gray-200 bg-white rounded-xl py-4 px-2 md:px-4 ">
                    <div className="flex gap-4 w-full">
                        <div className="flex-1 lg:basis-1/2 lg:pr-2">
                            <div className="flex justify-between">
                                <p className="font-semibold text-primary text-xs sm:text-sm mb-2">
                                    Notes
                                </p>
                            </div>
                            <div className="text-sm max-h-30 px-1 overflow-auto">
                                {/* Ticket Name */}
                                <p className="flex flex-col md:flex-row md:items-center md:gap-6">
                                    <span className="font-semibold break-all">
                                        {ReadingDetails?.notes || "N/A"}
                                    </span>
                                </p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
            {/* Header End */}

            {/* Main Content */}
            <div className="flex flex-col-reverse md:flex-row gap-3 mt-2">
                {/* Left Side */}
                <div className="w-full">
                    <ImageUploaderComponent images={images} setImages={setImages} disableUpload={true} />
                </div>
            </div>

            {popupName === "Delete Reading" && (
                <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
                    <DeleteConfirmPopup
                        loading={loading}
                        itemName="Reading"
                        onSubmit={handleDeleteReading}
                        onClose={() => setPopup(false)}
                    />
                </PopupComponent>
            )}
        </>
    );
}

export default ReadingDetailsPage;
