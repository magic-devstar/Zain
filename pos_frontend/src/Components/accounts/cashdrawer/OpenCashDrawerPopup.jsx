import React, { useState } from 'react';
import PopupComponent from '../../popups/PopupComponent';
import SecondaryBtn from '../../Common/SecondaryBtn';
import PrimaryBtn from '../../Common/PrimaryBtn';

const OpenCashDrawerPopup = ({ popup, setPopup, loading, onSubmit }) => {
  const [notes, setNotes] = useState("");
  const [openingAmount, setOpeningAmount] = useState(0.00);

  const handleSubmit = () => {
    onSubmit(notes, openingAmount);
    setNotes("");
    setOpeningAmount(0.00);
  };

  const handleCancel = () => {
    setPopup(false);
    setNotes("");
    setOpeningAmount(0.00);
  };

  return (
    <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
      <div className="max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Open Cash Drawer</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opening Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={openingAmount}
              onChange={e => setOpeningAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter initial cash amount"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Set the initial cash amount for this drawer
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about opening the cash drawer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          <div className="flex space-x-3 pt-4 justify-end">
            <SecondaryBtn
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </SecondaryBtn>
            <PrimaryBtn
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Opening..." : "Open Cash Drawer"}
            </PrimaryBtn>
          </div>
        </div>
      </div>
    </PopupComponent>
  );
};

export default OpenCashDrawerPopup; 