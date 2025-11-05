import React, { useState, useEffect } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';

const DateRangePicker = ({ 
    startDate, 
    endDate, 
    onDateChange, 
    placeholder = "Select date range",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStartDate, setTempStartDate] = useState(startDate || '');
    const [tempEndDate, setTempEndDate] = useState(endDate || '');
    const [leftMonth, setLeftMonth] = useState(new Date());
    const [rightMonth, setRightMonth] = useState(new Date(new Date().setMonth(new Date().getMonth() + 1)));
    const [showLeftMonthPicker, setShowLeftMonthPicker] = useState(false);
    const [showLeftYearPicker, setShowLeftYearPicker] = useState(false);
    const [showRightMonthPicker, setShowRightMonthPicker] = useState(false);
    const [showRightYearPicker, setShowRightYearPicker] = useState(false);
    const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
    const [calendarRef, setCalendarRef] = useState(null);

    // Update temp dates when props change
    useEffect(() => {
        setTempStartDate(startDate || '');
        setTempEndDate(endDate || '');
    }, [startDate, endDate]);

    // Close month/year pickers when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target;
            if (!target.closest('.month-picker') && !target.closest('.year-picker')) {
                setShowLeftMonthPicker(false);
                setShowLeftYearPicker(false);
                setShowRightMonthPicker(false);
                setShowRightYearPicker(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, showLeftMonthPicker, showLeftYearPicker, showRightMonthPicker, showRightYearPicker]);

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }
        
        return days;
    };

    const isDateInRange = (date) => {
        if (!tempStartDate || !tempEndDate) return false;
        const checkDate = new Date(date);
        const start = new Date(tempStartDate);
        const end = new Date(tempEndDate);
        return checkDate >= start && checkDate <= end;
    };

    const isDateSelected = (date) => {
        if (!date) return false;
        const dateStr = date.toISOString().split('T')[0];
        return dateStr === tempStartDate || dateStr === tempEndDate;
    };

    const isDateDisabled = (date) => {
        // Allow all dates for date range selection
        // Users should be able to select past dates for reports, etc.
        return false;
    };

    const handleDateClick = (date) => {
        if (!date) return;

        const dateStr = date.toISOString().split('T')[0];

        if (!tempStartDate || (tempStartDate && tempEndDate)) {
            // Start new selection
            setTempStartDate(dateStr);
            setTempEndDate('');
        } else if (tempStartDate && !tempEndDate) {
            // Complete the selection
            if (new Date(dateStr) < new Date(tempStartDate)) {
                // Selected date is before start date, swap them
                setTempEndDate(tempStartDate);
                setTempStartDate(dateStr);
            } else {
                setTempEndDate(dateStr);
            }
        }
    };

    const handleApply = () => {
        if (tempStartDate && tempEndDate) {
            onDateChange(tempStartDate, tempEndDate);
            setIsOpen(false);
        }
    };

    const handleClear = () => {
        setTempStartDate('');
        setTempEndDate('');
        onDateChange('', '');
        setIsOpen(false);
    };

    const goToToday = () => {
        const today = new Date();
        setLeftMonth(today);
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setRightMonth(nextMonth);
    };

    const calculateCalendarPosition = (buttonRef) => {
        if (!buttonRef) return { top: 0, left: 0 };
        
        const rect = buttonRef.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const calendarWidth = 300; // Calendar width
        const calendarHeight = 500; // Calendar height (taller for vertical layout)
        
        let left = rect.left;
        let top = rect.bottom + 8; // 8px gap below button
        
        // Adjust horizontal position if calendar would overflow
        if (left + calendarWidth > viewportWidth) {
            left = viewportWidth - calendarWidth - 16; // 16px margin from edge
        }
        
        // Adjust vertical position if calendar would overflow
        if (top + calendarHeight > viewportHeight) {
            top = rect.top - calendarHeight - 8; // Show above button instead
        }
        
        // Ensure calendar doesn't go off-screen
        left = Math.max(16, Math.min(left, viewportWidth - calendarWidth - 16));
        top = Math.max(16, Math.min(top, viewportHeight - calendarHeight - 16));
        
        return { top, left };
    };

    const getMonthName = (monthIndex) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[monthIndex];
    };

    const generateYearRange = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear - 10; year <= currentYear + 10; year++) {
            years.push(year);
        }
        return years;
    };


    const renderCalendar = (monthDate, isRightCalendar = false) => {
        const days = getDaysInMonth(monthDate);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const navigateThisMonth = (direction) => {
            const newMonth = new Date(monthDate);
            newMonth.setMonth(newMonth.getMonth() + direction);
            if (isRightCalendar) {
                setRightMonth(newMonth);
            } else {
                setLeftMonth(newMonth);
            }
        };

        const navigateThisYear = (direction) => {
            const newMonth = new Date(monthDate);
            newMonth.setFullYear(newMonth.getFullYear() + direction);
            if (isRightCalendar) {
                setRightMonth(newMonth);
            } else {
                setLeftMonth(newMonth);
            }
        };

        const handleThisMonthSelect = (monthIndex) => {
            const newMonth = new Date(monthDate);
            newMonth.setMonth(monthIndex);
            if (isRightCalendar) {
                setRightMonth(newMonth);
                setShowRightMonthPicker(false);
            } else {
                setLeftMonth(newMonth);
                setShowLeftMonthPicker(false);
            }
        };

        const handleThisYearSelect = (year) => {
            const newMonth = new Date(monthDate);
            newMonth.setFullYear(year);
            if (isRightCalendar) {
                setRightMonth(newMonth);
                setShowRightYearPicker(false);
            } else {
                setLeftMonth(newMonth);
                setShowLeftYearPicker(false);
            }
        };

        const showMonthPicker = isRightCalendar ? showRightMonthPicker : showLeftMonthPicker;
        const showYearPicker = isRightCalendar ? showRightYearPicker : showLeftYearPicker;
        const setShowMonthPicker = isRightCalendar ? setShowRightMonthPicker : setShowLeftMonthPicker;
        const setShowYearPicker = isRightCalendar ? setShowRightYearPicker : setShowLeftYearPicker;

        return (
            <div className="p-3 relative">
                {/* Calendar Label */}
                <div className="text-xs font-medium text-gray-600 mb-2 text-center">
                    {isRightCalendar ? 'End Date' : 'Start Date'}
                </div>
                
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigateThisYear(-1)}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowYearPicker(!showYearPicker)}
                            className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-medium"
                        >
                            {monthDate.getFullYear()}
                        </button>
                        <button
                            onClick={() => navigateThisYear(1)}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowMonthPicker(!showMonthPicker)}
                            className="px-2 py-1 hover:bg-gray-100 rounded text-sm font-medium"
                        >
                            {getMonthName(monthDate.getMonth())}
                        </button>
                        <div className="flex gap-1">
                            <button
                                onClick={() => navigateThisMonth(-1)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigateThisMonth(1)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        {!isRightCalendar && (
                            <button
                                onClick={goToToday}
                                className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 ml-2"
                            >
                                Today
                            </button>
                        )}
                    </div>
                </div>

                {/* Month Picker */}
                {showMonthPicker && (
                    <div className="month-picker absolute top-12 left-3 right-3 bg-white border border-gray-200 rounded-lg shadow-lg z-30 p-2">
                        <div className="grid grid-cols-3 gap-0.5">
                            {Array.from({ length: 12 }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleThisMonthSelect(i)}
                                    className={`px-2 py-1.5 text-xs rounded hover:bg-gray-100 ${
                                        monthDate.getMonth() === i ? 'bg-primary text-white' : ''
                                    }`}
                                >
                                    {getMonthName(i).substring(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Year Picker */}
                {showYearPicker && (
                    <div className="year-picker absolute top-12 left-3 right-3 bg-white border border-gray-200 rounded-lg shadow-lg z-30 p-2 max-h-32 overflow-y-auto">
                        <div className="grid grid-cols-4 gap-0.5">
                            {generateYearRange().map(year => (
                                <button
                                    key={year}
                                    onClick={() => handleThisYearSelect(year)}
                                    className={`px-2 py-1.5 text-xs rounded hover:bg-gray-100 ${
                                        monthDate.getFullYear() === year ? 'bg-primary text-white' : ''
                                    }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {days.map((date, index) => {
                        if (!date) {
                            return <div key={index} className="h-8" />;
                        }

                        const dateStr = date.toISOString().split('T')[0];
                        const isSelected = isDateSelected(date);
                        const isInRange = isDateInRange(date);

                        return (
                            <button
                                key={index}
                                onClick={() => handleDateClick(date)}
                                className={`
                                    h-8 w-8 text-xs rounded-full flex items-center justify-center font-medium
                                    ${isSelected 
                                        ? 'bg-primary text-white font-semibold' 
                                        : isInRange 
                                            ? 'bg-primary/20 text-primary' 
                                            : 'hover:bg-gray-100 text-gray-700'
                                    }
                                `}
                            >
                                {date.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const handleButtonClick = (e) => {
        if (!isOpen) {
            const position = calculateCalendarPosition(e.currentTarget);
            setCalendarPosition(position);
        }
        setIsOpen(!isOpen);
    };

    return (
        <>
            <div className={`relative ${className}`}>
                <button
                    ref={setCalendarRef}
                    onClick={handleButtonClick}
                    className="w-full border rounded-md px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between"
                >
                    <span className={startDate && endDate ? 'text-gray-900' : 'text-gray-500'}>
                        {startDate && endDate 
                            ? `${formatDate(startDate)} - ${formatDate(endDate)}`
                            : placeholder
                        }
                    </span>
                    <Calendar className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Calendar Popup - Fixed positioning */}
                    <div 
                        className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-[370px]"
                        style={{
                            top: `${calendarPosition.top}px`,
                            left: `${calendarPosition.left}px`
                        }}
                    >
                        <div className="flex flex-col">
                            {renderCalendar(leftMonth, false)}
                            <div className="border-t border-gray-200" />
                            {renderCalendar(rightMonth, true)}
                        </div>
                        
                        <div className="border-t border-gray-200 p-3 flex justify-between">
                            <button
                                onClick={handleClear}
                                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
                            >
                                <X className="w-3 h-3" />
                                Clear
                            </button>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApply}
                                    disabled={!tempStartDate || !tempEndDate}
                                    className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default DateRangePicker;
