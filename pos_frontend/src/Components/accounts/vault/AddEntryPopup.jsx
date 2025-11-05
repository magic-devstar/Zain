import React from "react";
import PopupComponent from "../../popups/PopupComponent";
import PrimaryBtn from "../../Common/PrimaryBtn";
import SecondaryBtn from "../../Common/SecondaryBtn";

function AddEntryPopup({ popup, setPopup, loading, onSubmit, entryForm, setEntryForm }) {
  return (
    <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
      <div className="max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Deposit</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={entryForm.amount}
              onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={entryForm.description}
              onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
              placeholder="Enter description for this deposit..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          <div className="flex space-x-3 pt-4 justify-end">
            <SecondaryBtn
              onClick={() => {
                setPopup(false);
                setEntryForm({ entry_type: "deposit", amount: "", description: "" });
              }}
              disabled={loading}
            >
              Cancel
            </SecondaryBtn>
            <PrimaryBtn
              onClick={onSubmit}
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Deposit"}
            </PrimaryBtn>
          </div>
        </div>
      </div>
    </PopupComponent>
  );
}

export default AddEntryPopup; 