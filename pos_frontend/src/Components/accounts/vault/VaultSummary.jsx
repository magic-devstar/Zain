import React from "react";
import PrimaryBtn from "../../Common/PrimaryBtn";
import SecondaryBtn from "../../Common/SecondaryBtn";
import { formatDate } from "../../../utils/formatDate";

function VaultSummary({ vaultData, onDepositClick, onWithdrawClick, onClearVaultClick }) {
  const totalAmount = parseFloat(vaultData?.total_amount || 0);
  
  return (
    <div className="mb-6">
      {/* Main Account Card */}
      <div className=" bg-[#273746] rounded-2xl shadow-2xl p-2 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-400/20 to-blue-400/20 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Vault Account</h1>
                <p className="text-slate-300 text-sm">Secure Financial Management</p>
              </div>
            </div>
            
            {/* Account Status */}
            <div className="text-right">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-sm font-medium">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Active
              </div>
            </div>
          </div>

          {/* Balance Section */}
          <div className="mb-8">
            <p className="text-slate-300 text-sm font-medium mb-2">Available Balance</p>
            <div className="flex items-baseline space-x-2">
              <span className="text-5xl font-bold text-white">${totalAmount.toFixed(2)}</span>
              <span className="text-slate-400 text-lg">USD</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1 justify-center">
            <button
              onClick={onDepositClick}
              className="cursor-pointer flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-101 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Deposit</span>
            </button>
            
            <button
              onClick={onWithdrawClick}
              className="cursor-pointer flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-101 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              <span>Withdraw</span>
            </button>
            
            <button
              onClick={onClearVaultClick}
              className="cursor-pointer bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-101 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Details Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Last Updated</p>
              <p className="text-sm font-semibold text-gray-900">
                {vaultData?.updated_at ? formatDate(vaultData.updated_at) : "N/A"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Account Status</p>
              <p className="text-sm font-semibold text-green-600">Secure & Active</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Account Type</p>
              <p className="text-sm font-semibold text-gray-900">Business Vault</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VaultSummary; 