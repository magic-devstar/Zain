import React from "react";
import PopupComponent from "../../popups/PopupComponent";
import PrimaryBtn from "../../Common/PrimaryBtn";
import SecondaryBtn from "../../Common/SecondaryBtn";

function WithdrawalPopup({ popup, setPopup, loading, onSubmit, withdrawalForm, setWithdrawalForm, vaultData }) {
  return (
    <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
      <div className="max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Withdraw from Vault</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={vaultData?.total_amount || 0}
              value={withdrawalForm.amount}
              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: ${parseFloat(vaultData?.total_amount || 0).toFixed(2)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={withdrawalForm.description}
              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, description: e.target.value })}
              placeholder="Enter reason for withdrawal..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          <div className="flex space-x-3 pt-4 justify-end">
            <SecondaryBtn
              onClick={() => {
                setPopup(false);
                setWithdrawalForm({ amount: "", description: "" });
              }}
              disabled={loading}
            >
              Cancel
            </SecondaryBtn>
            <PrimaryBtn
              onClick={onSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Withdraw"}
            </PrimaryBtn>
          </div>
        </div>
      </div>
    </PopupComponent>
  );
}

export default WithdrawalPopup; 