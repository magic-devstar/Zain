import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCircle, AlertTriangle, Clock, X, Info, User, Settings, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../Common/Spinner';
import api from '../../utils/api';
import { formatDistanceToNow } from "date-fns";
import { FaTrash } from 'react-icons/fa';
import NotificationSkeleton from '../LoadeingSkeletons/NotificationSkeleton';
import { toast } from 'react-hot-toast';
import useBasePath from '../../utils/useBasePath ';

const NotificationsPage = () => {
    const navigate = useNavigate();
    const basePath = useBasePath();
    const [notifications, setNotifications] = useState([]);
    const [unreadNotificationsIds, setUnreadNotificationsIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginationLoading, setPaginationLoading] = useState(false);
    const [nextStart, setNextStart] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [preferences, setPreferences] = useState({ receive_email_notifications: true, receive_whatsapp_notifications: false });
    const [prefLoading, setPrefLoading] = useState(false);

    const handleNotificationClick = (notification) => {
        if (notification.link) {
            // Combine the base path with the notification link
            const fullPath = basePath + notification.link;
            navigate(fullPath);
        }
    };

    const notificationClear = async () => {
        try {
            const response = await api.post("/auth/clear-notifications/");
            if (response.status === 200) {
                setNotifications([]);
                setUnreadNotificationsIds([]);
            } else {
                console.error("Failed to clear notifications");
            }
        } catch (error) {
            console.error("Error clearing notifications:", error);
        }
    };

    const fetchNotifications = async (start = 0) => {
        if (start === 0) {
            setLoading(true); // Show full skeleton for first API call
        } else {
            setPaginationLoading(true); // Show small loader when paginating
        }

        try {
            const response = await api.get(`/auth/get-notifications/`, {
                params: { start },
            });

            // Ensure unique documents by filtering out duplicates
            setNotifications((prevDocs) => {
                const mergedNotifications = [
                    ...prevDocs,
                    ...response.data.notifications,
                ];

                // Use a Set to filter unique documents by id
                const uniqueNotifications = Array.from(
                    new Map(mergedNotifications.map((not) => [not.id, not])).values()
                );
                return uniqueNotifications;
            });
            setUnreadNotificationsIds((prevUnreadIds) => [
                ...new Set([
                    ...prevUnreadIds,
                    ...response.data.unread_notifications_ids,
                ]),
            ]);
            setNextStart(response.data.next_start); // Update next offset
        } catch (err) {
            console.error("Error fetching documents:", err);
        } finally {
            setLoading(false);
            setPaginationLoading(false);
        }
    };

    const getUserPreferences = async () => {
        return api.get('/auth/user-preferences/');
    };

    const updateUserPreferences = async (data) => {
        return api.patch('/auth/user-preferences/', data);
    };

    useEffect(() => {
        setNotifications([]);
        setNextStart(0);
        fetchNotifications(0);
        // Fetch user preferences
        const fetchPreferences = async () => {
            setPrefLoading(true);
            try {
                const res = await getUserPreferences();
                setPreferences(res.data);
            } catch (e) {
                // fallback: keep defaults
            } finally {
                setPrefLoading(false);
            }
        };
        fetchPreferences();
    }, []);

    // Callback for child to trigger next API call
    const handleLoadMore = () => {
        if (!loading && !paginationLoading && nextStart) {
            fetchNotifications(nextStart);
        }
    };

    const observerRef = useRef(null);

    const lastNotificationRef = useCallback(
        (node) => {
            if (!node) return;

            if (observerRef.current) observerRef.current.disconnect(); // Disconnect previous observer

            observerRef.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    handleLoadMore(); // Call parent function to fetch more data
                }
            });

            observerRef.current.observe(node);
        },
        [handleLoadMore]
    );

    const handlePreferenceChange = async (e) => {
        const { name, checked } = e.target;
        setPreferences((prev) => ({ ...prev, [name]: checked }));
        setPrefLoading(true);
        try {
            await updateUserPreferences({ [name]: checked });
            toast.success('Notification preferences updated!');
        } catch (e) {
            toast.error('Failed to update preferences.');
        } finally {
            setPrefLoading(false);
        }
    };

    const settingsBtnRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!showSettings) return;
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                settingsBtnRef.current &&
                !settingsBtnRef.current.contains(event.target)
            ) {
                setShowSettings(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSettings]);

    return (
        <div className="">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="mx-auto pb-2">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl md:text-2xl font-semibold">Notifications</h1>
                        <div className="flex items-center space-x-4">
                            {notifications.length > 0 && (
                                <button
                                    onClick={notificationClear}
                                    className="flex items-center text-sm font-medium hover:text-opacity-80 transition-colors text-primary cursor-pointer"
                                >
                                    <FaTrash size={16} className="mr-1" />
                                    Clear All
                                </button>
                            )}

                            <button ref={settingsBtnRef} className="p-2 rounded-full hover:bg-gray-100 transition-colors relative" onClick={() => setShowSettings((s) => !s)}>
                                <Settings size={20} className="text-gray-500 cursor-pointer" />
                                {showSettings && (
                                    <div ref={dropdownRef} className="absolute right-0 mt-2 w-84 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4" onClick={e => e.stopPropagation()}>
                                        <h3 className="font-semibold mb-2">Notification Preferences</h3>
                                        <hr className="my-2" />
                                        {prefLoading ? (
                                            <div className="text-sm text-gray-500">Loading...</div>
                                        ) : (
                                            <form>
                                                <label className="flex items-center mb-2">
                                                    <input
                                                        type="checkbox"
                                                        name="receive_email_notifications"
                                                        checked={preferences.receive_email_notifications}
                                                        onChange={handlePreferenceChange}
                                                        className="mr-2"
                                                    />
                                                    Receive Email Notifications
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        name="receive_whatsapp_notifications"
                                                        checked={preferences.receive_whatsapp_notifications}
                                                        onChange={handlePreferenceChange}
                                                        className="mr-2"
                                                    />
                                                    Receive WhatsApp Notifications
                                                </label>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="mx-auto py-6 overflow-auto h-[80vh] px-2">
                {loading ? (
                    <ul className="space-y-2">
                        <NotificationSkeleton count="20" />
                    </ul>
                ) : notifications.length === 0 ? (
                    <div className="h-[70vh] flex flex-col items-center justify-center py-12 text-gray-500">
                        <Bell size={48} className="mb-4 opacity-30" />
                        <p className="text-lg">No notifications found</p>
                        <p className="text-sm">You're all caught up!</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {notifications.map((notification, index) => (
                            <li
                                ref={
                                    index === notifications.length - 1 ? lastNotificationRef : null
                                }
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`bg-white rounded-lg border border-gray-400 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg ${!notification.read ? 'border-l-4' : 'border'} ${notification.link ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                style={{
                                    cursor: notification.link ? "pointer" : "default",
                                    borderLeftColor: !unreadNotificationsIds.includes(notification.id)
                                        ? "var(--color-primary)"
                                        : "none",
                                    borderLeftWidth: !unreadNotificationsIds.includes(notification.id) ? "5px" : "1px",
                                }}
                            >
                                <div className="flex items-start p-4">
                                    <div className="flex-shrink-0 mr-4 mt-1">
                                        <Bell className="text-primary" size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className={`text-sm font-medium`}>
                                                {notification.title}
                                            </p>
                                            <div className="flex items-center ml-4">
                                                <span className="text-xs text-gray-500 flex items-center">
                                                    <Clock size={12} className="mr-1" />
                                                    {notification.created_at
                                                        ? formatDistanceToNow(
                                                            new Date(notification.created_at),
                                                            { addSuffix: true }
                                                        )
                                                        : "N/A"}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                        {notification.link && (
                                            <div className="flex items-center mt-2 text-xs text-primary">
                                                <ChevronRight size={14} className="mr-1" />
                                                <span>Click to view details</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                        {paginationLoading && <NotificationSkeleton count="20" />}
                    </ul>
                )}
            </main>
        </div>
    );
};

export default NotificationsPage;