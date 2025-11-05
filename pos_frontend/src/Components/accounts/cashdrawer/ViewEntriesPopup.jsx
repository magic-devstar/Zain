import React from 'react';
import PopupComponent from '../../popups/PopupComponent';
import { formatDate } from '../../../utils/formatDate';

const ViewEntriesPopup = ({ popup, setPopup, selectedCashDrawer }) => {
  return (
    <PopupComponent popup={popup} setPopup={setPopup} loading={false}>
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
        {selectedCashDrawer && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`font-semibold ${
                  selectedCashDrawer.status === "open" ? "text-green-600" : "text-red-600"
                }`}>
                  {selectedCashDrawer.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Opening Amount</p>
                <p className="font-semibold">${parseFloat(selectedCashDrawer.opening_amount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Amount</p>
                <p className="font-semibold">${parseFloat(selectedCashDrawer.current_amount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Opened At</p>
                <p className="font-semibold">{formatDate(selectedCashDrawer.opened_at)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Created By</th>
                <th className="px-4 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {selectedCashDrawer?.entries?.map((entry, index) => (
                <tr key={entry.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      entry.entry_type === "opening" ? "bg-blue-100 text-blue-800" :
                      entry.entry_type === "sale" ? "bg-green-100 text-green-800" :
                      entry.entry_type === "refund" ? "bg-red-100 text-red-800" :
                      entry.entry_type === "adjustment" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-semibold">
                    ${parseFloat(entry.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">{entry.description}</td>
                  <td className="px-4 py-2">{entry.created_by?.username || "N/A"}</td>
                  <td className="px-4 py-2">{formatDate(entry.created_at)}</td>
                </tr>
              ))}
              {(!selectedCashDrawer?.entries || selectedCashDrawer.entries.length === 0) && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No entries found for this cash drawer
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PopupComponent>
  );
};

export default ViewEntriesPopup; 