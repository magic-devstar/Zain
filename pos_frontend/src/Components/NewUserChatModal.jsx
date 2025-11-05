import { useState, useEffect } from 'react';
import { X, Search, MessageSquare, Users } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import SkeletonLine from './LoadeingSkeletons/SkeletonLine';

const NewUserChatModal = ({ isOpen, onClose, onUserSelect }) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch all users when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchAllUsers();
            setSearchTerm('');
        }
    }, [isOpen]);

    // Filter users based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user =>
                user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    const fetchAllUsers = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/chat/api/users/?all=true');
            setUsers(response.data);
            setFilteredUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    };

    const getProfileImageUrl = (user) => {
        if (!user) return '';
        if (user.profile_image) {
            return user.profile_image.startsWith('http')
                ? user.profile_image
                : `${import.meta.env.VITE_BACKEND_URL}${user.profile_image}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || '')}`;
    };

    const handleUserSelect = (user) => {
        onUserSelect(user);
        onClose();
    };

    const renderUserSkeletons = () => {
        return (
            <>
                {[...Array(8)].map((_, index) => (
                    <div key={index} className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200">
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full overflow-hidden">
                                    <SkeletonLine height={48} width={48} />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="w-32 mb-1">
                                    <SkeletonLine height={16} />
                                </div>
                                <div className="w-24">
                                    <SkeletonLine height={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                        <Users className="text-primary" size={24} />
                        <h2 className="text-xl font-semibold text-gray-800">Start New Chat</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    </div>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        renderUserSkeletons()
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <MessageSquare size={48} className="mb-3 opacity-50" />
                            <p className="text-lg font-medium">
                                {searchTerm ? 'No users found' : 'No users available'}
                            </p>
                            <p className="text-sm">
                                {searchTerm ? 'Try a different search term' : 'All users are already in your chat list'}
                            </p>
                        </div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => handleUserSelect(user)}
                                className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <img
                                            src={getProfileImageUrl(user)}
                                            alt={user.username}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                        />
                                        {/* Online status indicator (if available) */}
                                        {user.status === 'online' && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-gray-900 truncate">
                                            {user.username}
                                        </h3>
                                        {(user.first_name || user.last_name) && (
                                            <p className="text-xs text-gray-500 truncate">
                                                {`${user.first_name || ''} ${user.last_name || ''}`.trim()}
                                            </p>
                                        )}
                                        {user.role && (
                                            <p className="text-xs text-gray-400 truncate">
                                                {user.role}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        <MessageSquare size={16} className="text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <p className="text-xs text-gray-500 text-center">
                        Select a user to start a new conversation
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NewUserChatModal;

