import React, { useState, useEffect } from 'react';
import { PlayCircle, PauseCircle, Clock3 } from 'lucide-react'; // Lucide icons
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import ConfirmationPopup from './ConfirmationPopup';

const StartWorkCard = ({ hideHeading = false }) => {
    const [isWorking, setIsWorking] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [activeShift, setActiveShift] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationProps, setConfirmationProps] = useState({
        message: '',
        onConfirm: () => { },
    });

    const fetchActiveShift = async () => {
        try {
            const response = await api.get('/common/api/shifts/active-shift/', {
                // Suppress 404 errors in console for this endpoint as it's expected when no active shift exists
                validateStatus: (status) => status === 200 || status === 404
            });
            
            if (response.status === 404) {
                // Expected: no active shift exists
                setActiveShift(null);
                setIsWorking(false);
                setElapsedTime(0);
                return;
            }
            
            const data = response.data;
            setActiveShift(data);
            setIsWorking(true);
            const startTime = new Date(data.start_time);
            const now = new Date();
            const elapsed = Math.floor((now - startTime) / 1000);
            setElapsedTime(elapsed);
        } catch (error) {
            // Only log unexpected errors (not 404s)
            if (!error.response || error.response.status !== 404) {
                console.error("Failed to fetch active shift", error);
            }
            setActiveShift(null);
            setIsWorking(false);
            setElapsedTime(0);
        }
    };

    useEffect(() => {
        fetchActiveShift();
    }, []);

    useEffect(() => {
        let timer;
        if (isWorking) {
            timer = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isWorking]);

    const startWork = async () => {
        try {
            await api.post('/common/api/shifts/start/');
            toast.success('Shift started successfully.');
            fetchActiveShift();
        } catch (error) {
            toast.error('Failed to start shift.');
            console.error('Error starting shift:', error.response?.data || error.message);
        }
    };

    const endWork = async () => {
        try {
            await api.post('/common/api/shifts/end/');
            toast.success('Shift ended successfully.');
            fetchActiveShift();
        } catch (error) {
            toast.error('Failed to end shift.');
            console.error('Error ending shift:', error.response?.data || error.message);
        }
    };

    const handleToggleWork = () => {
        const action = isWorking ? endWork : startWork;
        const message = isWorking
            ? 'Are you sure you want to clock out?'
            : 'Are you sure you want to clock in?';

        setConfirmationProps({
            message,
            onConfirm: () => {
                action();
                setShowConfirmation(false);
            },
        });
        setShowConfirmation(true);
    };

    const formatTime = (seconds) => {
        const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    };

    return (
        <div className="w-full bg-white rounded-2xl border-2 border-black-400 shadow p-4">
            {!hideHeading && (
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <Clock3 className="w-5 h-5 text-primary" />
                    Start Working
                </h2>
            )}

            <div
                onClick={handleToggleWork}
                className="cursor-pointer flex items-center justify-between gap-4 p-6 rounded-xl border border-l-[4px] border-l-primary border-black-400 group hover:shadow transition-all"
            >
                <div className="flex flex-col">
                    <p className="text-sm font-medium text-gray-700">
                        {isWorking ? 'You are currently clocked in' : 'Start your work session'}
                    </p>

                    {isWorking && (
                        <div className="mt-1 flex items-center gap-2 text-primary text-sm font-semibold">
                            <Clock3 className="w-4 h-4" />
                            <span>{formatTime(elapsedTime)}</span>
                        </div>
                    )}
                </div>

                <div className="text-primary transition-transform duration-300 group-hover:scale-110">
                    {isWorking ? (
                        <PauseCircle className="w-8 h-8" />
                    ) : (
                        <PlayCircle className="w-8 h-8" />
                    )}
                </div>
            </div>

            {showConfirmation && (
                <ConfirmationPopup
                    message={confirmationProps.message}
                    onConfirm={confirmationProps.onConfirm}
                    onCancel={() => setShowConfirmation(false)}
                />
            )}
        </div>
    );
};

export default StartWorkCard;
