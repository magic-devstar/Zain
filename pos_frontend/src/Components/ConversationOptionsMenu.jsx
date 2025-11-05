import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Archive, Trash2, ArchiveRestore } from 'lucide-react';
import toast from 'react-hot-toast';

const ConversationOptionsMenu = ({ 
    activeUser, 
    onDeleteConversation, 
    onArchiveConversation,
    onUnarchiveConversation,
    isArchived = false 
}) => {
    const [isOpen, setIsOpen] = useState(false);
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

    const handleArchive = () => {
        if (isArchived) {
            onUnarchiveConversation(activeUser.id);
        } else {
            onArchiveConversation(activeUser.id);
        }
        setIsOpen(false);
    };

    const handleDelete = () => {
        onDeleteConversation(activeUser.id);
        setIsOpen(false);
    };

    if (!activeUser) return null;

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                title="Conversation options"
            >
                <MoreHorizontal size={20} className="text-gray-500" />
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[180px]"
                >
                    {/* Archive/Unarchive */}
                    <button
                        onClick={handleArchive}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors duration-200"
                    >
                        {isArchived ? (
                            <>
                                <ArchiveRestore size={16} />
                                <span>Unarchive chat</span>
                            </>
                        ) : (
                            <>
                                <Archive size={16} />
                                <span>Archive chat</span>
                            </>
                        )}
                    </button>

                    {/* Delete Conversation */}
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                        onClick={handleDelete}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors duration-200"
                    >
                        <Trash2 size={16} />
                        <span>Delete</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConversationOptionsMenu;
