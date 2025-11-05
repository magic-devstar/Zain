import { useState, useEffect, useRef } from 'react';
import { Trash2, Copy, Reply } from 'lucide-react';

const MessageContextMenu = ({ 
    isOpen, 
    position, 
    onClose, 
    onDelete, 
    message, 
    isOwnMessage 
}) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                onClose();
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
    }, [isOpen, onClose]);

    const handleCopyMessage = () => {
        if (message.message_type === 'text' && message.message) {
            navigator.clipboard.writeText(message.message);
            onClose();
        }
    };

    const handleDeleteMessage = () => {
        onDelete(message.id);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[160px]"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            {/* Copy Message (only for text messages) */}
            {message.message_type === 'text' && message.message && (
                <button
                    onClick={handleCopyMessage}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors duration-200"
                >
                    <Copy size={16} />
                    <span>Copy message</span>
                </button>
            )}

            {/* Reply to Message */}
            <button
                onClick={onClose}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors duration-200"
            >
                <Reply size={16} />
                <span>Reply</span>
            </button>

            {/* Delete Message (only for own messages) */}
            {isOwnMessage && (
                <>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                        onClick={handleDeleteMessage}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors duration-200"
                    >
                        <Trash2 size={16} />
                        <span>Delete message</span>
                    </button>
                </>
            )}
        </div>
    );
};

export default MessageContextMenu;
