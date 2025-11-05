import { useEffect, useState } from "react";
import ImageUploaderComponent from "../Common/ImageUploaderComponent";
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";

function ReadingFormpopup({ onClose, onSubmit, initialData = null, loading }) {
    const [formData, setFormData] = useState({
        profit_amount: '',
        reading_date: '',
        notes: '',
        images: [],
    });

    useEffect(() => {
        if (initialData) {
            // Handle initialData.attachments
            const formattedImages = initialData.attachments?.map((attachment, index) => ({
                id: `existing-${index}-${Date.now()}`,
                file: null, // No File object for existing attachments
                url: attachment.url || attachment, // Assuming attachment is a URL or has a url property
                name: attachment.name || `Image-${index}`,
            })) || [];

            setFormData({
                profit_amount: initialData.profit_amount || '',
                reading_date: initialData.reading_date || '',
                notes: initialData.notes || '',
                images: formattedImages,
            });
        } else {
            setFormData({
                profit_amount: '',
                reading_date: '',
                notes: '',
                images: [],
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Extract File objects from images array
        const validImages = formData.images
            .filter(image => image.file instanceof File) // Only include images with valid File objects
            .map(image => image.file); // Extract the File object
        // Submit formData with File objects
        onSubmit({ ...formData, images: validImages });
        // Don't call onClose() here - let the parent component handle it after successful submission
    };

    return (
        <>
            <h2 className="text-xl font-semibold mb-4">{initialData ? 'Edit Reading' : 'Create Reading'}</h2>
            <form onSubmit={handleSubmit} >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">Profit Amount ($)</label>
                            <input
                                type="number"
                                name="profit_amount"
                                value={formData.profit_amount}
                                onChange={handleChange}
                                placeholder="Enter profit amount"
                                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">Reading Date</label>
                            <input
                                type="datetime-local"
                                name="reading_date"
                                value={formData.reading_date}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Enter reading notes..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                required
                                rows={6}
                            />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Attachments</label>
                        <ImageUploaderComponent
                            showDeleteButton={true}
                            images={formData.images} // Pass array of { id, file, url, name } objects
                            setImages={(newImages) => {
                                console.log("Updated Images in ReadingFormpopup:", newImages);
                                setFormData((prev) => ({
                                    ...prev,
                                    images: newImages || [], // Ensure newImages is an array
                                }));
                            }}
                            disableUpload={false}
                        />
                    </div>
                </div>


                <div className="flex justify-end gap-2 mt-6">
                    <SecondaryBtn
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </SecondaryBtn>
                    <PrimaryBtn
                        disabled={loading}
                        type="submit"
                    >
                        {loading ? (
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
                            initialData ? 'Update Reading' : 'Create Reading'
                        )}
                    </PrimaryBtn>
                </div>

            </form>
        </>
    );
}

export default ReadingFormpopup;