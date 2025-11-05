import React, { useState, useEffect, useRef } from "react";
import PrimaryBtn from "../Common/PrimaryBtn";
import SecondaryBtn from "../Common/SecondaryBtn";
import Spinner from "../Common/Spinner";

// Helper to format a Date object as "YYYY-MM-DDTHH:MM" in local time (for datetime-local inputs)
const formatDateTimeLocal = (date) => {
  const pad = (num) => num.toString().padStart(2, "0");
  // Adjust to local time by accounting for timezone offset
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;
};

// Helper to parse datetime-local input value to UTC Date
const parseDateTimeLocalToUTC = (localDateTimeStr) => {
  if (!localDateTimeStr) return null;
  const localDate = new Date(localDateTimeStr);
  // Convert local time to UTC by adding the timezone offset
  return new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60 * 1000);
};

function ShiftEditPopup({ shift, popup, setPopup, loading, onSubmit }) {
  const [formData, setFormData] = useState({
    start_time: "",
    end_time: "",
  });
  const [selectedDuration, setSelectedDuration] = useState("");
  // Store the original end (or start) time only once per popup open
  const baseEndUTCRef = useRef(null);

  useEffect(() => {
    if (shift) {
      setFormData({
        start_time: shift.start_time ? formatDateTimeLocal(new Date(shift.start_time)) : "",
        end_time: shift.end_time ? formatDateTimeLocal(new Date(shift.end_time)) : "",
      });
      // Capture the base date for duration calculations
      baseEndUTCRef.current = shift.end_time ? new Date(shift.end_time) : new Date(shift.start_time);

      // Reset any previously selected duration when opening the popup
      setSelectedDuration("");
    }
  }, [shift]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate that end_time is after start_time if both are provided
    if (formData.start_time && formData.end_time) {
      const startTime = parseDateTimeLocalToUTC(formData.start_time);
      const endTime = parseDateTimeLocalToUTC(formData.end_time);

      if (endTime <= startTime) {
        alert("End time must be after start time.");
        return;
      }
    }

    // Prepare data for submission - convert to UTC ISO string
    const submitData = {
      start_time: formData.start_time ? parseDateTimeLocalToUTC(formData.start_time).toISOString() : null,
      end_time: formData.end_time ? parseDateTimeLocalToUTC(formData.end_time).toISOString() : null,
    };

    // Debug: log submission data
    console.log("[ShiftEditPopup] handleSubmit → submitData", submitData);

    onSubmit(submitData);
  };

  const handleDurationSelect = (minutes) => {
    setSelectedDuration(minutes);

    if (!formData.start_time) {
      alert("Please select a start time first.");
      return;
    }

    // Always start from the original base date captured when popup opened
    const baseDateUTC = baseEndUTCRef.current;

    // Add duration in milliseconds
    const newEnd = new Date(baseDateUTC.getTime() + minutes * 60 * 1000);

    // Debug: log calculation detail
    console.log("[ShiftEditPopup] handleDurationSelect", {
      selectedMinutes: minutes,
      baseDateString: baseDateUTC.toISOString(),
      baseDateUTC,
      newEndUTC: newEnd,
      formattedEnd: formatDateTimeLocal(newEnd),
    });

    // Format newEnd back to local time for the input
    setFormData({ ...formData, end_time: formatDateTimeLocal(newEnd) });
  };

  const handleCancel = () => {
    setPopup(false);
    setFormData({
      start_time: "",
      end_time: "",
    });
    setSelectedDuration("");
  };

  if (!popup) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">Edit Shift</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
            <input
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty if shift is still active</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Duration (adds to End Time)</label>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }, (_, i) => (i + 1) * 30).map((mins) => {
                const hours = Math.floor(mins / 60);
                const minutes = mins % 60;
                const label = `${hours > 0 ? `${hours}h` : ""}${hours > 0 && minutes > 0 ? " " : ""}${minutes > 0 ? `${minutes}m` : ""}`;

                const isActive = selectedDuration === mins;

                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleDurationSelect(mins)}
                    className={`px-2 py-1 rounded-md border text-sm ${isActive ? "bg-blue-500 text-white" : "bg-white text-gray-700"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <SecondaryBtn type="button" onClick={handleCancel} disabled={loading}>
              Cancel
            </SecondaryBtn>
            <PrimaryBtn type="submit" disabled={loading}>
              {loading ? <Spinner /> : "Update Shift"}
            </PrimaryBtn>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShiftEditPopup;