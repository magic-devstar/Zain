import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import useBasePath from '../../utils/useBasePath ';

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL;

const GlobalChatListener = () => {
    const user = useSelector((state) => state.user.user);
    const navigate = useNavigate();
    const location = useLocation();
    const wsRef = useRef(null);
    const activeToasts = useRef(new Set());
    const basePath = useBasePath();

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

    useEffect(() => {
        let ws = null;
        let reconnectTimeout = null;

        const connectWebSocket = () => {
            if (!user) return;

            const token = localStorage.getItem("access");
            if (!token) return;

            // Check if WebSocket URL is configured
            if (!WEBSOCKET_URL) {
                console.debug('WebSocket URL not configured, skipping connection');
                return;
            }

            // Close existing connection if any
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            try {
                ws = new WebSocket(`${WEBSOCKET_URL}/ws/notifications/?access=${token}`);
                wsRef.current = ws;

                ws.onerror = (error) => {
                    // Suppress WebSocket connection errors from console
                    // These are expected when the server is not available or connection fails
                    // The onclose handler will handle reconnection
                };

                ws.onopen = () => {
                    // Connection established successfully
                    console.debug('WebSocket connection established for notifications');
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === 'new_message' &&
                            data.message?.sender?.id !== user.id &&
                            !location.pathname.includes('/chat')) {

                            const toastId = `message-${data.message.id}`;

                            // Check if toast is already active
                            if (activeToasts.current.has(toastId)) {
                                return;
                            }

                            // Add to active toasts
                            activeToasts.current.add(toastId);

                            toast.custom((t) => (
                                <div
                                    className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
                                    max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer`}
                                    onClick={() => {
                                        navigate(`${basePath}/chat`);
                                        toast.dismiss(toastId);
                                    }}
                                >
                                    <div className="flex-1 w-0 p-4">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0 pt-0.5">

                                                <img
                                                    src={getProfileImageUrl(data.message.sender)}
                                                    alt={data.message.sender.username}
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shadow-sm transition-transform duration-300 hover:scale-110"
                                                />
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {data.message.sender.username || data.message.sender.full_name}
                                                </p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {data.message.message_type === 'voice' ? 'Sent a voice message' : data.message.message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex border-l border-gray-200">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toast.dismiss(toastId);
                                            }}
                                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            ), {
                                id: toastId,
                                duration: 3000,
                                position: 'bottom-right',
                                onClose: () => {
                                    // Remove from active toasts when closed
                                    activeToasts.current.delete(toastId);
                                }
                            });
                        }
                    } catch (error) {
                        console.error('Error processing WebSocket message:', error);
                    }
                };

                ws.onclose = (event) => {
                    wsRef.current = null;
                    // Only try to reconnect if component is still mounted and not a normal closure
                    // Code 1000 = normal closure, 1001 = going away
                    if (event.code !== 1000 && event.code !== 1001) {
                        // Only reconnect for abnormal closures
                        reconnectTimeout = setTimeout(connectWebSocket, 5000);
                    }
                };

            } catch (error) {
                // Suppress WebSocket setup errors from console
                // These are expected when the server is not available
                wsRef.current = null;
                // Only try to reconnect if component is still mounted
                reconnectTimeout = setTimeout(connectWebSocket, 5000);
            }
        };

        connectWebSocket();

        // Cleanup function
        return () => {
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            // Clear all active toasts on unmount
            activeToasts.current.clear();
        };
    }, [user, navigate, location.pathname, basePath]);

    return null;
};

export default GlobalChatListener; 