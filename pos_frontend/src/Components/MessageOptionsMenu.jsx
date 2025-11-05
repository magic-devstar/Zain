import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Trash2, Copy } from 'lucide-react';

const MessageOptionsMenu = ({ 
    message, 
    onDelete,
    isOwnMessage 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                menuRef.current && 
                !menuRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen]);

    const handleCopyMessage = () => {
        if (message.message_type === 'text' && message.message) {
            navigator.clipboard.writeText(message.message);
            setIsOpen(false);
        }
    };

    const handleDeleteMessage = () => {
        onDelete(message.id);
        setIsOpen(false);
    };

    const handleButtonClick = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                x: rect.right - 160, // Menu width is 160px, align to right
                y: rect.bottom + 5
            });
        }
        setIsOpen(!isOpen);
    };

    // Only show for own messages
    if (!isOwnMessage) return null;

    return (
        <>
            <div className="relative">
                <button
                    ref={buttonRef}
                    onClick={handleButtonClick}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-gray-200 hover:bg-opacity-50"
                    title="Message options"
                >
                    <MoreHorizontal size={16} className="text-gray-500" />
                </button>
            </div>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[160px]"
                    style={{ 
                        left: `${menuPosition.x}px`, 
                        top: `${menuPosition.y}px`,
                        zIndex: 9999
                    }}
                >
                    {/* Copy Message (only for text messages) */}
                    {message.message_type === 'text' && message.message && (
                        <button
                            onClick={handleCopyMessage}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors duration-200"
                        >
                            <Copy size={16} />
                            <span>Copy</span>
                        </button>
                    )}

                    {/* Delete Message */}
                    <button
                        onClick={handleDeleteMessage}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors duration-200"
                    >
                        <Trash2 size={16} />
                        <span>Delete</span>
                    </button>
                </div>,
                document.body
            )}
        </>
    );
};

export default MessageOptionsMenu;
