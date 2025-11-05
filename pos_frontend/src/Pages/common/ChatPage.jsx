import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send,
    Search,
    MessageSquare,
    Smile,
    Menu,
    X,
    Mic,
    UserPlus
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatDistanceToNow } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { useLocation } from 'react-router-dom';
import SkeletonLine from '../../Components/LoadeingSkeletons/SkeletonLine';
import NewUserChatModal from '../../Components/NewUserChatModal';
import MessageContextMenu from '../../Components/MessageContextMenu';
import ConversationOptionsMenu from '../../Components/ConversationOptionsMenu';
import MessageOptionsMenu from '../../Components/MessageOptionsMenu';
import DeleteConfirmPopup from '../../Components/popups/DeleteConfirmPopup';

// TODO: Move these to a .env file
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL;


export default function ChatPage() {
    const dispatch = useDispatch();
    const location = useLocation();
    const [users, setUsers] = useState([]);
    const [activeUser, setActiveUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messageEndRef = useRef(null);
    const messageInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const user = useSelector((state) => state.user.user);
    const [socket, setSocket] = useState(null);
    const [presenceSocket, setPresenceSocket] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [lastReceivedMessage, setLastReceivedMessage] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, message: null });
    const [archivedUsers, setArchivedUsers] = useState([]);
    const [showArchivedChats, setShowArchivedChats] = useState(false);
    const [isLoadingArchived, setIsLoadingArchived] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, messageId: null, loading: false });
    const [deleteConversationConfirm, setDeleteConversationConfirm] = useState({ isOpen: false, userId: null, loading: false });

    const moveUserToTop = useCallback((userId, message, timestamp) => {
        setUsers(prevUsers => {
            const userToMove = prevUsers.find(u => u.id === userId);
            if (!userToMove) {
                return prevUsers;
            }

            const updatedUser = {
                ...userToMove,
                last_message: message,
                last_message_timestamp: timestamp,
            };

            const otherUsers = prevUsers.filter(u => u.id !== userId);
            return [updatedUser, ...otherUsers];
        });
    }, []);

    // Add new sorting function
    const sortUsersByLastMessage = useCallback((users) => {
        return [...users].sort((a, b) => {
            const timestampA = a.last_message_timestamp ? new Date(a.last_message_timestamp) : new Date(0);
            const timestampB = b.last_message_timestamp ? new Date(b.last_message_timestamp) : new Date(0);
            return timestampB - timestampA;
        });
    }, []);

    // Fetch chatted users function
    const fetchUsers = useCallback(async () => {
        try {
            setIsLoadingUsers(true);
            const response = await api.get(`/chat/api/chatted-users/?all=true`);
            const sortedUsers = sortUsersByLastMessage(response.data);
            setUsers(sortedUsers);
        } catch (error) {
            toast.error("Failed to fetch users.");
        } finally {
            setIsLoadingUsers(false);
        }
    }, [sortUsersByLastMessage]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Set initial active user when users are loaded
    useEffect(() => {
        if (users.length > 0 && !activeUser) {
            setActiveUser(users[0]);
        }
    }, [users, activeUser]);

    useEffect(() => {
        const token = localStorage.getItem("access");
        if (!token) return;

        const ws = new WebSocket(`${WEBSOCKET_URL}/ws/presence/?access=${token}`);
        setPresenceSocket(ws);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'presence_initial') {
                setUsers(prevUsers =>
                    prevUsers.map(u => ({
                        ...u,
                        status: data.user_ids.includes(u.id) ? 'online' : 'offline'
                    }))
                );
            }

            if (data.type === 'presence_update') {
                setUsers(prevUsers =>
                    prevUsers.map(u =>
                        u.id === data.user_id ? { ...u, status: data.event } : u
                    )
                );
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    useEffect(() => {
        if (activeUser) {
            const fetchMessages = async () => {
                try {
                    setIsLoadingMessages(true);
                    const response = await api.get(`/chat/api/messages/${activeUser.id}/?all=true`);
                    setMessages(response.data);
                } catch (error) {
                    toast.error("Failed to fetch messages.");
                } finally {
                    setIsLoadingMessages(false);
                }
            };
            fetchMessages();

            const roomName = [user.id, activeUser.id].sort().join('_');
            const ws = new WebSocket(`${WEBSOCKET_URL}/ws/chat/${roomName}/?access=${localStorage.getItem("access")}`);
            setSocket(ws);

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'chat_message') {
                    const message = data.message;
                    setMessages((prevMessages) => [...prevMessages, message]);
                    setLastReceivedMessage(message);
                }
                else if (data.type === 'user_list_update') {
                    const updatedUsers = data.updated_users;
                    setUsers(prevUsers => {
                        const newUsers = [...prevUsers];
                        updatedUsers.forEach(updatedUser => {
                            const index = newUsers.findIndex(u => u.id === updatedUser.id);
                            if (index !== -1) {
                                newUsers[index] = updatedUser;
                            }
                        });
                        return sortUsersByLastMessage(newUsers);
                    });
                }
            };

            return () => {
                ws.close();
            };
        }
    }, [activeUser, user.id, moveUserToTop, sortUsersByLastMessage]);

    // Handle presence updates
    useEffect(() => {
        const token = localStorage.getItem("access");
        if (!token) return;

        const ws = new WebSocket(`${WEBSOCKET_URL}/ws/presence/?access=${token}`);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'presence_initial') {
                // Set initial online users
                setOnlineUsers(new Set(data.user_ids));
                // Update user data if provided
                if (data.current_user) {
                    setUsers(prevUsers => {
                        const newUsers = [...prevUsers];
                        const index = newUsers.findIndex(u => u.id === data.current_user.id);
                        if (index !== -1) {
                            newUsers[index] = {
                                ...newUsers[index],
                                ...data.current_user,
                                status: 'online'  // Ensure status is set
                            };
                        }
                        return sortUsersByLastMessage(newUsers);
                    });
                }
            }
            else if (data.type === 'presence_update') {
                const { user_id, event: presenceEvent, user_data } = data;

                // Update online users set
                setOnlineUsers(prevOnline => {
                    const newOnline = new Set(prevOnline);
                    if (presenceEvent === 'online') {
                        newOnline.add(user_id);
                    } else if (presenceEvent === 'offline') {
                        newOnline.delete(user_id);
                    }
                    return newOnline;
                });

                // Update user data if provided
                if (user_data) {
                    setUsers(prevUsers => {
                        const newUsers = prevUsers.map(u =>
                            u.id === user_id ? {
                                ...u,
                                ...user_data,
                                status: presenceEvent  // Ensure status matches the event
                            } : u
                        );
                        return sortUsersByLastMessage(newUsers);
                    });
                }
            }
        };

        ws.onclose = () => {
            // Clear online users when connection is lost
            setOnlineUsers(new Set());
        };

        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [sortUsersByLastMessage]);

    // Update WebSocket message handling
    useEffect(() => {
        if (!socket) return;

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'chat_message') {
                // Handle new message
                const message = data.message;
                
                // If it's a voice message and it's a file path, prepend the backend URL
                if (message.message_type === 'voice' && message.voice_message?.startsWith('/')) {
                    message.voice_message = `${import.meta.env.VITE_BACKEND_URL}${message.voice_message}`;
                }
                
                setMessages(prev => [...prev, message]);

                // For received messages (from other users), move the sender to top
                if (message.sender.id !== user.id) {
                    const timestamp = new Date(message.timestamp).toISOString();
                    const displayMessage = message.message_type === 'voice' ? 'Voice Message' : message.message;
                    moveUserToTop(message.sender.id, displayMessage, timestamp);
                }
                // For sent messages, move the recipient to top
                else {
                    const timestamp = new Date(message.timestamp).toISOString();
                    const displayMessage = message.message_type === 'voice' ? 'Voice Message' : message.message;
                    moveUserToTop(message.recipient_id, displayMessage, timestamp);
                }

                // Always sort users after moving
                setUsers(prevUsers => sortUsersByLastMessage(prevUsers));

                // Handle user list updates while preserving online status
                const updatedUsers = data.updated_users;
                if (Array.isArray(updatedUsers)) {
                    setUsers(prev => {
                        const newUsers = [...prev];
                        updatedUsers.forEach(updatedUser => {
                            const index = newUsers.findIndex(u => u.id === updatedUser.id);
                            if (index !== -1) {
                                // Preserve the online status while updating other user data
                                const isOnline = onlineUsers.has(updatedUser.id);
                                newUsers[index] = {
                                    ...newUsers[index],
                                    ...updatedUser,
                                    status: isOnline ? 'online' : 'offline'
                                };
                            }
                        });
                        return sortUsersByLastMessage(newUsers);
                    });
                }
            }
        };

        return () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.onmessage = null;
            }
        };
    }, [socket, user, moveUserToTop, sortUsersByLastMessage, onlineUsers]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const adjustTextareaHeight = () => {
        if (messageInputRef.current) {
            messageInputRef.current.style.height = 'auto';
            const scrollHeight = messageInputRef.current.scrollHeight;
            messageInputRef.current.style.height = `${Math.min(scrollHeight, 100)}px`; // Max height of 100px
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [newMessage]);

    // Focus the message input when activeUser changes
    useEffect(() => {
        if (messageInputRef.current) {
            messageInputRef.current.focus();
        }
    }, [activeUser]);

    const handleSendMessage = () => {
        if (newMessage.trim() !== "" && socket) {
            const messageData = {
                message_type: 'text',
                message: newMessage,
                recipient_id: activeUser.id,
            };
            socket.send(JSON.stringify(messageData));

            // Move the recipient to the top of the user list immediately
            const timestamp = new Date().toISOString();
            moveUserToTop(activeUser.id, newMessage, timestamp);

            // Sort users after moving the recipient
            setUsers(prevUsers => sortUsersByLastMessage(prevUsers));

            setNewMessage("");
            // Reset textarea height after sending message
            if (messageInputRef.current) {
                messageInputRef.current.style.height = 'auto';
            }
        }
    };

    const handleVoiceMessageSent = () => {
        // When a voice message is sent
        const timestamp = new Date().toISOString();
        moveUserToTop(activeUser.id, "Voice Message", timestamp);
        // Sort users after moving the recipient
        setUsers(prevUsers => sortUsersByLastMessage(prevUsers));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const handleUserClick = (user) => {
        setActiveUser(user);
        if (isMobileMenuOpen) {
            toggleMobileMenu();
        }
    };

    const handleNewUserSelect = (selectedUser) => {
        // Check if user already exists in the list
        const existingUser = users.find(u => u.id === selectedUser.id);
        if (existingUser) {
            // User already exists, just select them
            setActiveUser(existingUser);
        } else {
            // Add new user to the list and select them
            const newUser = {
                ...selectedUser,
                last_message: null,
                last_message_timestamp: null
            };
            setUsers(prevUsers => [newUser, ...prevUsers]);
            setActiveUser(newUser);
        }
    };

    // Message context menu handlers
    const handleMessageRightClick = (e, message) => {
        e.preventDefault();
        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            message: message
        });
    };

    const closeContextMenu = () => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, message: null });
    };

    const handleDeleteMessage = (messageId) => {
        setDeleteConfirm({ isOpen: true, messageId, loading: false });
    };

    const confirmDeleteMessage = async () => {
        try {
            setDeleteConfirm(prev => ({ ...prev, loading: true }));
            await api.delete(`/chat/api/delete-message/${deleteConfirm.messageId}/`);
            setMessages(prevMessages => prevMessages.filter(msg => msg.id !== deleteConfirm.messageId));
            toast.success('Message deleted successfully');
            setDeleteConfirm({ isOpen: false, messageId: null, loading: false });
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('Failed to delete message');
            setDeleteConfirm(prev => ({ ...prev, loading: false }));
        }
    };

    const cancelDeleteMessage = () => {
        setDeleteConfirm({ isOpen: false, messageId: null, loading: false });
    };

    // Conversation management handlers
    const handleDeleteConversation = (userId) => {
        setDeleteConversationConfirm({ isOpen: true, userId, loading: false });
    };

    const confirmDeleteConversation = async () => {
        try {
            setDeleteConversationConfirm(prev => ({ ...prev, loading: true }));
            await api.delete(`/chat/api/delete-conversation/${deleteConversationConfirm.userId}/`);
            
            // Clear active user if it was the deleted one
            if (activeUser?.id === deleteConversationConfirm.userId) {
                setActiveUser(null);
                setMessages([]);
            }
            
            // Refresh both user lists
            await fetchUsers();
            await fetchArchivedUsers();
            
            toast.success('Conversation deleted successfully');
            setDeleteConversationConfirm({ isOpen: false, userId: null, loading: false });
        } catch (error) {
            console.error('Error deleting conversation:', error);
            toast.error('Failed to delete conversation');
            setDeleteConversationConfirm(prev => ({ ...prev, loading: false }));
        }
    };

    const cancelDeleteConversation = () => {
        setDeleteConversationConfirm({ isOpen: false, userId: null, loading: false });
    };

    const handleArchiveConversation = async (userId) => {
        try {
            await api.post(`/chat/api/archive-conversation/${userId}/`, { action: 'archive' });
            
            // Clear active user if it was the archived one
            if (activeUser?.id === userId) {
                setActiveUser(null);
                setMessages([]);
            }
            
            // Refresh both user lists
            await fetchUsers();
            await fetchArchivedUsers();
            
            toast.success('Conversation archived successfully');
        } catch (error) {
            console.error('Error archiving conversation:', error);
            toast.error('Failed to archive conversation');
        }
    };

    const handleUnarchiveConversation = async (userId) => {
        try {
            await api.post(`/chat/api/archive-conversation/${userId}/`, { action: 'unarchive' });
            
            // Refresh both user lists
            await fetchUsers();
            await fetchArchivedUsers();
            
            toast.success('Conversation unarchived successfully');
        } catch (error) {
            console.error('Error unarchiving conversation:', error);
            toast.error('Failed to unarchive conversation');
        }
    };

    // Fetch archived users
    const fetchArchivedUsers = useCallback(async () => {
        try {
            setIsLoadingArchived(true);
            const response = await api.get('/chat/api/archived-users/?all=true');
            setArchivedUsers(response.data);
        } catch (error) {
            console.error('Error fetching archived users:', error);
            toast.error('Failed to fetch archived chats');
        } finally {
            setIsLoadingArchived(false);
        }
    }, []);

    // Load archived users when component mounts
    useEffect(() => {
        fetchArchivedUsers();
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    if (socket) {
                        try {
                            const base64Audio = reader.result;
                            console.log('Sending audio data:', base64Audio.substring(0, 100) + '...'); // Debug log

                            // Ensure we're sending a properly formatted audio message
                            let formattedAudio = base64Audio;
                            if (!formattedAudio.startsWith('data:audio')) {
                                // If it's just the base64 part, add the audio MIME type prefix
                                formattedAudio = `data:audio/wav;base64,${base64Audio.split(',')[1] || base64Audio}`;
                            }

                            const messageData = {
                                message_type: 'voice',
                                voice_message: formattedAudio,
                                recipient_id: activeUser.id,
                            };
                            socket.send(JSON.stringify(messageData));
                            handleVoiceMessageSent();
                        } catch (error) {
                            console.error('Error sending voice message:', error);
                            toast.error('Failed to send voice message');
                        }
                    }
                };

                reader.onerror = (error) => {
                    console.error('Error reading audio file:', error);
                    toast.error('Failed to process voice message');
                };
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            toast.error("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const filteredUsers = users.filter(
        (user) =>
            user && user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Theme classes
    const themeClasses = {
        app: 'bg-gray-100 text-gray-800',
        sidebar: 'bg-white border-gray-200',
        header: 'bg-white border-gray-200',
        chatArea: 'bg-gray-50',
        input: 'bg-white border-gray-200',
        inputField: 'bg-gray-100 text-gray-800',
        userItem: 'border-gray-100 hover:bg-gray-50',
        activeUserItem: 'bg-indigo-50',
        myMessage: 'bg-primary text-white',
        theirMessage: 'bg-white text-gray-800',
        button: 'bg-primary hover:bg-primary'
    };

    const getProfileImageUrl = (user) => {
        if (!user) return '';
        if (user.profile_image) {
            // Handle both full URLs and relative paths
            return user.profile_image.startsWith('http')
                ? user.profile_image
                : `${import.meta.env.VITE_BACKEND_URL}${user.profile_image}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || '')}`;
    };

    // Add new handler for emoji click
    const onEmojiClick = (emojiObject) => {
        const cursor = messageInputRef.current.selectionStart;
        const text = newMessage.slice(0, cursor) + emojiObject.emoji + newMessage.slice(cursor);
        setNewMessage(text);
        setShowEmojiPicker(false);
        // Focus back on input after selecting emoji
        setTimeout(() => {
            messageInputRef.current.focus();
            messageInputRef.current.selectionStart = cursor + emojiObject.emoji.length;
            messageInputRef.current.selectionEnd = cursor + emojiObject.emoji.length;
        }, 10);
    };

    // Add click outside handler to close emoji picker
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const renderLoadingSkeletons = () => {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                    <div
                        key={index}
                        className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
                    >
                        <div
                            className={`max-w-xs md:max-w-md rounded-2xl p-3 ${index % 2 === 0 ? "bg-white" : "bg-gray-100"}`}
                        >
                            <SkeletonLine width={Math.random() * (250 - 100) + 100} height={20} />
                            <div className="mt-2">
                                <SkeletonLine width={40} height={12} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderUserSkeletons = () => {
        return (
            <>
                {[...Array(6)].map((_, index) => (
                    <div
                        key={index}
                        className={`p-3 border-b ${themeClasses.userItem} transition-all duration-200`}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full overflow-hidden">
                                    <SkeletonLine height={48} width={48} />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <div className="w-24">
                                        <SkeletonLine height={16} />
                                    </div>
                                    <div className="w-16">
                                        <SkeletonLine height={12} />
                                    </div>
                                </div>
                                <div className="mt-1 w-36">
                                    <SkeletonLine height={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </>
        );
    };

    return (
        <div className={`flex h-[100%] overflow-hidden transition-colors duration-300 ${themeClasses.app}`}>
            {/* Left sidebar - User list */}
            <div
                className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                    } w-80 ${themeClasses.sidebar} border-r flex flex-col transition-transform duration-300 ease-in-out md:relative fixed inset-y-0 left-0 z-40 sm:z-0`}
            >
                {/* Header */}
                <div className={`p-3 border-b ${themeClasses.header} flex justify-between items-center w-full`}>
                    {/* Search bar */}
                    <div className={`flex-1 mr-3 ${themeClasses.header}`}>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className={`py-2 pl-10 pr-4 w-full ${themeClasses.inputField} rounded-full focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                        </div>
                    </div>
                    {/* New Chat Button */}
                    <button
                        onClick={() => setIsNewUserModalOpen(true)}
                        className={`${themeClasses.button} text-white p-2 rounded-full transition-all duration-200 flex items-center justify-center transform hover:scale-110 shadow-md`}
                        title="Start new chat"
                    >
                        <UserPlus size={18} />
                    </button>
                </div>


                {/* User list */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {!isLoadingUsers && filteredUsers.length === 0 && archivedUsers.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full px-4">
                            <MessageSquare size={48} className="mb-3 text-primary opacity-50" />
                            <p className="text-lg font-medium text-gray-500 text-center">
                                {searchTerm ? 'No chats found' : 'No conversations yet'}
                            </p>
                            <p className="text-sm text-gray-400 text-center mt-1">
                                {searchTerm ? 'Try a different search term' : 'Start a new conversation to begin chatting'}
                            </p>
                            {!searchTerm && (
                                <button
                                    onClick={() => setIsNewUserModalOpen(true)}
                                    className="mt-4 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary-dark transition-colors duration-200 flex items-center space-x-2"
                                >
                                    <UserPlus size={16} />
                                    <span>Start New Chat</span>
                                </button>
                            )}
                        </div>
                    )}
                    {isLoadingUsers ? (
                        renderUserSkeletons()
                    ) : (
                        filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className={`p-3 border-b ${themeClasses.userItem} cursor-pointer transition-all duration-200 ${activeUser?.id === user.id ? themeClasses.activeUserItem : ""} hover:translate-x-0.5`}
                                onClick={() => handleUserClick(user)}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <img
                                            src={getProfileImageUrl(user)}
                                            alt={user.username}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shadow-sm transition-transform duration-300 hover:scale-110"
                                        />
                                        <div
                                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${onlineUsers.has(user.id) ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
                                        ></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-sm font-medium text-gray-900 truncate">
                                                {user.username}
                                            </h2>
                                            <span className="text-xs text-gray-500">
                                                {user.last_message_timestamp && formatDistanceToNow(new Date(user.last_message_timestamp), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-1">
                                            {user.last_message || 'No messages yet'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Archived Chats Section */}
                    {archivedUsers.length > 0 && (
                        <div className="mt-4">
                            <button
                                onClick={() => setShowArchivedChats(!showArchivedChats)}
                                className="w-full p-3 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-between"
                            >
                                <span>Archived Chats ({archivedUsers.length})</span>
                                <div className={`transform transition-transform duration-200 ${showArchivedChats ? 'rotate-180' : ''}`}>
                                    ▼
                                </div>
                            </button>

                            {showArchivedChats && (
                                <div className="border-t border-gray-100">
                                    {archivedUsers.map((user) => (
                                        <div
                                            key={`archived-${user.id}`}
                                            className={`p-3 border-b ${themeClasses.userItem} cursor-pointer transition-all duration-200 ${activeUser?.id === user.id ? themeClasses.activeUserItem : ""} hover:translate-x-0.5 opacity-75`}
                                            onClick={() => handleUserClick(user)}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="relative">
                                                    <img
                                                        src={getProfileImageUrl(user)}
                                                        alt={user.username}
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shadow-sm transition-transform duration-300 hover:scale-110 grayscale"
                                                    />
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-gray-400"></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center">
                                                        <h2 className="text-sm font-medium text-gray-700 truncate">
                                                            {user.username}
                                                        </h2>
                                                        <span className="text-xs text-gray-400">
                                                            Archived
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 truncate mt-1">
                                                        {user.last_message || 'No messages yet'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom user profile */}
                <div className={`p-3 ${themeClasses.header} flex items-center space-x-3`}>
                    <div className="relative">
                        <img
                            src={getProfileImageUrl(user)}
                            alt={user?.username}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-sm font-medium">{user?.username}</h2>
                    </div>
                </div>
            </div>

            {/* Right side - Chat area */}
            <div className="flex-1 flex flex-col">
                {/* Chat header */}
                <div className={`px-6 py-3 border-b ${themeClasses.header} flex items-center justify-between shadow-sm`}>
                    <div className="flex items-center space-x-3">
                        <div className="relative block">
                            <img
                                src={getProfileImageUrl(activeUser)}
                                alt={activeUser?.username}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 transition-transform duration-300 hover:scale-110"
                            />
                            <div
                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${onlineUsers.has(activeUser?.id) ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
                            ></div>
                        </div>
                        <div>
                            <h2 className="font-medium">{activeUser?.username}</h2>
                            <p className="text-xs text-gray-500">
                                {onlineUsers.has(activeUser?.id) ? "Online" : "Offline"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Conversation Options Menu */}
                        <div className="hidden md:block">
                            <ConversationOptionsMenu
                                activeUser={activeUser}
                                onDeleteConversation={handleDeleteConversation}
                                onArchiveConversation={handleArchiveConversation}
                                onUnarchiveConversation={handleUnarchiveConversation}
                                isArchived={archivedUsers.some(u => u.id === activeUser?.id)}
                            />
                        </div>
                        
                        {/* Mobile menu button */}
                        <div className="flex md:hidden items-center">
                            <button
                                onClick={toggleMobileMenu}
                                className={`bg-white p-2 rounded-full hover:bg-indigo-100 transition-all duration-200 transform hover:scale-110`}
                            >
                                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chat messages */}
                <div
                    className={`flex-1 overflow-y-auto p-4 ${themeClasses.chatArea} space-y-4 custom-scrollbar`}
                >
                    {isLoadingMessages ? (
                        renderLoadingSkeletons()
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <MessageSquare size={48} className="mb-3 text-primary opacity-50" />
                            <p className="text-lg font-medium">Start a conversation</p>
                            <p className="text-sm">Send a message to begin chatting</p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender.id === user.id ? "justify-end" : "justify-start"} ${index === messages.length - 1 && message.sender.id === user.id ? "animate-slide-up" : ""}`}
                            >
                                <div className={`max-w-xs md:max-w-md rounded-2xl p-3 ${message.sender.id === user.id
                                        ? `${themeClasses.myMessage} rounded-br-none`
                                        : `${themeClasses.theirMessage} rounded-bl-none shadow-sm`
                                        } transform transition-all duration-300 hover:scale-[1.02] group relative overflow-visible`}
                                    onContextMenu={(e) => handleMessageRightClick(e, message)}
                                >
                                    {/* Message Options Menu for own messages */}
                                    {message.sender.id === user.id && (
                                        <div className="absolute -top-2 -right-2 z-10">
                                            <MessageOptionsMenu
                                                message={message}
                                                onDelete={handleDeleteMessage}
                                                isOwnMessage={true}
                                            />
                                        </div>
                                    )}
                                    {message.message_type === 'text' ? (
                                        <p className="break-words">{message.message}</p>
                                    ) : message.message_type === 'voice' ? (
                                        <div className="voice-message-container">
                                            {(() => {
                                                try {
                                                    // Check if the voice message is a valid string
                                                    if (!message.voice_message) {
                                                        console.error('Voice message is empty or undefined');
                                                        return <p className="text-red-500">Invalid voice message</p>;
                                                    }

                                                    // Try to format the audio source properly
                                                    let audioSrc = message.voice_message;
                                                    
                                                    // If it's a file path (starts with /media or similar)
                                                    if (audioSrc.startsWith('/')) {
                                                        audioSrc = `${import.meta.env.VITE_BACKEND_URL}${audioSrc}`;
                                                    }
                                                    // If it's a base64 string without the data URL prefix
                                                    else if (!audioSrc.startsWith('data:audio') && audioSrc.match(/^[A-Za-z0-9+/=]+$/)) {
                                                        audioSrc = `data:audio/wav;base64,${audioSrc}`;
                                                    }

                                                    console.log('Audio source:', audioSrc.substring(0, 100) + '...'); // Debug log

                                                    return (
                                                        <audio 
                                                            controls 
                                                            src={audioSrc}
                                                            onError={(e) => {
                                                                console.error('Audio playback error details:', {
                                                                    error: e,
                                                                    audioSrc: audioSrc.substring(0, 100) + '...',
                                                                    messageType: message.message_type,
                                                                    messageId: message.id
                                                                });
                                                                toast.error('Failed to play voice message');
                                                            }}
                                                            className="max-w-full"
                                                            preload="metadata"
                                                        >
                                                            Your browser does not support the audio element.
                                                        </audio>
                                                    );
                                                } catch (error) {
                                                    console.error('Error rendering voice message:', error);
                                                    return <p className="text-red-500">Error playing voice message</p>;
                                                }
                                            })()}
                                        </div>
                                    ) : (
                                        <p className="text-red-500">Unsupported message type</p>
                                    )}
                                    <p className={`text-xs mt-1 ${message.sender.id === user.id ? "text-white" : "text-gray-500"} transition-opacity duration-200`}>
                                        {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messageEndRef} />
                </div>

                {/* Message input */}
                <div className={`p-3 border-t ${themeClasses.input}`}>
                    <div className="flex items-center space-x-2">
                        <div className="flex space-x-2">
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`p-2 rounded-full transition-colors duration-200 ${isRecording ? 'text-red-500 hover:text-red-700' : 'text-gray-500 hover:text-primary'}`}
                                >
                                    <Mic size={18} />
                                </button>
                                {isRecording && (
                                    <div className="flex items-center space-x-0.5">
                                        <span className="recording-dot animate-pulse"></span>
                                        <span className="recording-wave-1"></span>
                                        <span className="recording-wave-2"></span>
                                        <span className="recording-wave-3"></span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            <textarea
                                ref={messageInputRef}
                                placeholder="Type a message..."
                                className={`w-full p-3 pr-10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all duration-200 shadow-sm min-h-[44px] max-h-[100px] overflow-y-auto`}
                                value={newMessage}
                                rows={1}
                                onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    adjustTextareaHeight();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                            ></textarea>
                            <div className="absolute right-3 top-3" ref={emojiPickerRef}>
                                <button
                                    className="text-gray-500 hover:text-primary transition-colors duration-200 cursor-pointer"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    <Smile size={18} />
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-full right-0 mb-2">
                                        <EmojiPicker
                                            onEmojiClick={onEmojiClick}
                                            width={300}
                                            height={400}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleSendMessage}
                            className={`p-3 rounded-full ${newMessage.trim() !== ""
                                ? `${themeClasses.button} text-white`
                                : `bg-gray-200 text-gray-400 cursor-not-allowed`
                                } transition-all duration-300 transform hover:rotate-12 hover:scale-110 active:scale-95 shadow-md`}
                            disabled={newMessage.trim() === ""}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* CSS for custom animations */}
            <style jsx global>{`
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease forwards;
        }
        
        .recording-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            background-color: #ef4444;
            border-radius: 50%;
        }

        .recording-wave-1, .recording-wave-2, .recording-wave-3 {
            display: inline-block;
            width: 2px;
            height: 10px;
            margin-left: 2px;
            background-color: #60a5fa;
            animation: sound-wave 1.2s infinite ease-in-out;
        }

        .recording-wave-2 {
            animation-delay: -1.0s;
            height: 15px;
        }

        .recording-wave-3 {
            animation-delay: -0.8s;
            height: 12px;
        }

        @keyframes sound-wave {
            0%, 40%, 100% {
                transform: scaleY(0.4);
            }
            20% {
                transform: scaleY(1.0);
            }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F3F4F6;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>

            {/* New User Chat Modal */}
            <NewUserChatModal
                isOpen={isNewUserModalOpen}
                onClose={() => setIsNewUserModalOpen(false)}
                onUserSelect={handleNewUserSelect}
            />

            {/* Message Context Menu */}
            <MessageContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                message={contextMenu.message}
                onClose={closeContextMenu}
                onDelete={handleDeleteMessage}
                isOwnMessage={contextMenu.message?.sender?.id === user?.id}
            />

            {/* Delete Message Confirmation Popup */}
            {deleteConfirm.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <DeleteConfirmPopup
                            loading={deleteConfirm.loading}
                            onClose={cancelDeleteMessage}
                            itemName="message"
                            onSubmit={confirmDeleteMessage}
                        />
                    </div>
                </div>
            )}

            {/* Delete Conversation Confirmation Popup */}
            {deleteConversationConfirm.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <DeleteConfirmPopup
                            loading={deleteConversationConfirm.loading}
                            onClose={cancelDeleteConversation}
                            itemName="conversation"
                            onSubmit={confirmDeleteConversation}
                        />
                    </div>
                </div>
            )}
        </div>
    )
};