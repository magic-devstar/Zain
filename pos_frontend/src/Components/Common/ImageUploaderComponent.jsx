import { useRef, useState, useEffect } from 'react';
import {
    Trash as TrashIcon,
    Image as ImageIcon,
    X as XIcon,
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const ImageUploaderComponent = ({ images, setImages, disableUpload, showDeleteButton }) => {
    const user = useSelector((state) => state.user.user);
    const isTechnician = user?.role === "Technician";
    const isWarehouseTechnician = user?.role === "Warehouse Technician";
    const fileInputRef = useRef(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const modalRef = useRef(null);

    // Handle file upload
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const newImages = files.map(file => ({
            id: Date.now() + Math.random().toString(36).substring(2),
            file,
            url: URL.createObjectURL(file),
            name: file.name,
            isNew: true // Flag to indicate image is not yet saved in backend
        }));

        setImages([...images, ...newImages]);
    };

    // Remove image locally
    const removeImage = (id) => {
        const newImages = images.filter(image => image.id !== id);
        setImages(newImages);
    };

    // Handle image deletion
    const handleDeleteImage = async (event, id) => {
        event.stopPropagation(); // Prevent event from bubbling to parent popup
        event.preventDefault(); // Prevent default browser behavior

        const image = images.find(img => img.id === id);
        if (!image) return;

        // If image is new, remove locally without API call
        if (image.isNew) {
            removeImage(id);
            setSelectedImage(null); // Close modal
            toast.success('Image removed successfully!');
            return;
        }

        // For saved images, attempt API deletion but remove locally regardless
        try {
            await api.delete(`/common/api/attachments/${id}/delete/`);
            toast.success('Image deleted successfully!');
        } catch (error) {
            console.error('Failed to delete image:', error);
            // Ignore error and proceed with local removal
        }
        removeImage(id);
        setSelectedImage(null); // Close modal
    };

    // Open large image view
    const openImageModal = (image) => {
        setSelectedImage(image);
    };

    // Close large image view
    const closeImageModal = () => {
        setSelectedImage(null);
    };


    // Close modal if clicked outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                closeImageModal();
            }
        };

        // Attach event listener
        document.addEventListener('mousedown', handleClickOutside);

        // Cleanup the event listener on component unmount
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="w-full h-full max-h-100 overflow-auto border border-gray-200 rounded-xl py-1">
            <div className="flex flex-wrap gap-3 h-full justify-center">
                {images.map(image => (
                    <div
                        key={image.id}
                        className="relative group w-auto h-45 rounded-lg overflow-hidden border border-gray-200 cursor-pointer"
                        onClick={() => openImageModal(image)}
                    >
                        <img
                            src={image.url}
                            alt={image.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}

                {!disableUpload && (
                    <button
                        type='button'
                        onClick={() => fileInputRef.current.click()}
                        className="w-100 h-50 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-colors"
                    >
                        <ImageIcon size={20} />
                        <span className="text-xs mt-1">Add Images</span>
                        <span className="text-xs mt-1">(max 300)</span>
                    </button>
                )}
                {disableUpload && images.length === 0 && (
                    <button
                        type='button'
                        className="w-100 h-50 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-colors"
                    >
                        <ImageIcon size={20} />
                        <span className="text-xs mt-1">No Images Available</span>
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
                multiple
            />

            {/* Modal for large image view */}
            {selectedImage && (
                <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
                    <div
                        ref={modalRef}
                        className="relative w-full sm:max-w-[90vw] sm:h-[95vh] bg-black rounded-lg overflow-hidden border border-gray-400">
                        <img
                            src={selectedImage.url}
                            alt={selectedImage.name}
                            className="w-full h-full object-contain"
                        />
                        {/* Close button */}
                        <button
                            onClick={closeImageModal}
                            className="absolute top-4 left-4 p-2 bg-gray-800 bg-opacity-75 rounded-full text-white hover:bg-gray-900 cursor-pointer"
                        >
                            <XIcon size={20} />
                        </button>
                        {showDeleteButton &&
                            !(
                                selectedImage.url.includes("signature_") &&
                                (isTechnician || isWarehouseTechnician) &&
                                selectedImage.url.includes("technician-signature")
                            ) && (
                                <button
                                    onClick={(e) => handleDeleteImage(e, selectedImage.id)}
                                    className="absolute top-4 right-4 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 cursor-pointer"
                                >
                                    <TrashIcon size={20} />
                                </button>
                            )}

                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageUploaderComponent;