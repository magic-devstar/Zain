import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../utils/api";
import toast from "react-hot-toast";
import { formatDate } from "../../../utils/formatDate";
import ConfirmationPopup from "../../../Components/Common/ConfirmationPopup";
import TableComponent from "../../../Components/Common/TableComponent";
import VaultSummary from "../../../Components/accounts/vault/VaultSummary";
import VaultFilter from "../../../Components/accounts/vault/VaultFilter";
import AddEntryPopup from "../../../Components/accounts/vault/AddEntryPopup";
import WithdrawalPopup from "../../../Components/accounts/vault/WithdrawalPopup";
import Spinner from "../../../Components/Common/Spinner";
import SecondaryButton from "../../../Components/Common/SecondaryBtn";
import PrimaryButton from "../../../Components/Common/PrimaryBtn";
import { FiPlus, FiMinus } from "react-icons/fi";
import PopupComponent from "../../../Components/popups/PopupComponent";
import { useSelector } from 'react-redux';
import axios from 'axios';
const origin = import.meta.env.VITE_BACKEND_URL;

function VaultPage() {
    const user = useSelector((state) => state.user.user);
    const navigate = useNavigate();
    const [vaultData, setVaultData] = useState(null);
    // Separate state for deposit and withdrawal entries so they can be rendered in
    // two independent, paginated tables.
    const [depositEntries, setDepositEntries] = useState([]);
    const [withdrawalEntries, setWithdrawalEntries] = useState([]);

    const [loading, setLoading] = useState(true);                // overall page ops
    const [depositLoading, setDepositLoading] = useState(true);  // deposits table
    const [withdrawalLoading, setWithdrawalLoading] = useState(true); // withdrawals table
    const [showAddEntry, setShowAddEntry] = useState(false);
    const [showWithdrawal, setShowWithdrawal] = useState(false);
    const [showClearVaultConfirmation, setShowClearVaultConfirmation] = useState(false);
    const [showReauth, setShowReauth] = useState(false);
    const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());
    const [refreshToggle, setRefreshToggle] = useState(false);
    const [filters, setFilters] = useState({});
    const [printing, setPrinting] = useState(false);
    const [reauthPassword, setReauthPassword] = useState("");
    const [reauthLoading, setReauthLoading] = useState(false);
    const [pendingClearAmount, setPendingClearAmount] = useState(0);
    const [entryForm, setEntryForm] = useState({
        entry_type: "deposit",
        amount: "",
        description: ""
    });
    const [withdrawalForm, setWithdrawalForm] = useState({
        amount: "",
        description: ""
    });

    const canAccess = useMemo(() => {
        if (!user) return false;
        const hasPerm1AndRole = Array.isArray(user.permissions) && user.permissions.includes(1) && (user.role === "Admin" || user.role === "Manager");
        const isSuperAdmin = user.is_superuser && user.role === "Admin";
        return hasPerm1AndRole || isSuperAdmin;
    }, [user]);

    useEffect(() => {
        if (user && !canAccess) {
            toast.error("You are not authorized to view Vault");
            navigate(-1);
            return;
        }
        if (canAccess) {
            loadVaultData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canAccess, user]);

    // Reset refreshToggle after at least one of the tables has data.
    useEffect(() => {
        if (refreshToggle && (depositEntries.length > 0 || withdrawalEntries.length > 0)) {
            const timer = setTimeout(() => setRefreshToggle(false), 100);
            return () => clearTimeout(timer);
        }
    }, [refreshToggle, depositEntries.length, withdrawalEntries.length]);

    const loadVaultData = async () => {
        try {
            setLoading(true);
            const response = await api.get("/common/api/vault/");
            setVaultData(response.data);
        } catch (error) {
            toast.error("Failed to load vault data");
            console.error("Error loading vault data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Callbacks for TableComponent -> Pagination to push paginated data into state
    const renderDepositEntries = (entriesData) => setDepositEntries(entriesData);
    const renderWithdrawalEntries = (entriesData) => setWithdrawalEntries(entriesData);

    const refreshData = () => {
        setRefreshToggle(prev => !prev);
        loadVaultData();
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setRefreshToggle(prev => !prev);
    };

    const handlePrintReport = async (currentFilters = filters) => {
        try {
            setPrinting(true);

            // Prepare params with all=true to get all vault entries
            const params = { all: true };
            
            // Only add filter parameters if they have valid values
            if (currentFilters.start_date) {
                params.start_date = currentFilters.start_date;
            }
            if (currentFilters.end_date) {
                params.end_date = currentFilters.end_date;
            }
            if (currentFilters.entry_type) {
                params.entry_type = currentFilters.entry_type;
            }
            if (currentFilters.description) {
                params.description = currentFilters.description;
            }
            if (currentFilters.amount) {
                params.amount = currentFilters.amount;
            }
            if (currentFilters.amount_min) {
                params.amount_min = currentFilters.amount_min;
            }
            if (currentFilters.amount_max) {
                params.amount_max = currentFilters.amount_max;
            }
            if (vaultData?.id) {
                params.vault = vaultData.id;
            }

            const { data: allVaultEntries } = await api.get("/common/api/vault-entries/", { params });

            if (!allVaultEntries || allVaultEntries.length === 0) {
                toast.error("No vault entries found for the selected filters");
                return;
            }

            // Calculate totals
            let totalDeposits = 0;
            let totalWithdrawals = 0;
            let totalTransfers = 0;

            // Generate detailed entries rows
            const entriesRows = allVaultEntries.map((entry) => {
                const amount = parseFloat(entry.amount || 0);
                const createdBy = entry.created_by?.username || 'System';
                const entryDate = new Date(entry.created_at).toLocaleString();
                
                // Calculate totals by type
                if (entry.entry_type === 'deposit') {
                    totalDeposits += amount;
                } else if (entry.entry_type === 'withdrawal') {
                    totalWithdrawals += amount;
                } else if (entry.entry_type === 'transfer') {
                    totalTransfers += amount;
                }

                // Color code different entry types
                let rowStyle = '';
                if (entry.entry_type === 'deposit') {
                    rowStyle = 'background-color: #e8f5e8;'; // Light green for deposits
                } else if (entry.entry_type === 'withdrawal') {
                    rowStyle = 'background-color: #ffe8e8;'; // Light red for withdrawals
                } else if (entry.entry_type === 'transfer') {
                    rowStyle = 'background-color: #e8f0ff;'; // Light blue for transfers
                }

                return `<tr style="${rowStyle}">
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">#${entry.id}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; text-transform: capitalize;">${entry.entry_type}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold;">$${amount.toFixed(2)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${entry.description}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${createdBy}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${entryDate}</td>
                </tr>`;
            }).join("\n");

            // Generate printable content in hidden iframe
            const printIframe = document.createElement("iframe");
            printIframe.style.position = "fixed";
            printIframe.style.right = "0";
            printIframe.style.bottom = "0";
            printIframe.style.width = "0";
            printIframe.style.height = "0";
            printIframe.style.border = "0";
            document.body.appendChild(printIframe);

            const doc = printIframe.contentDocument || printIframe.contentWindow.document;
            doc.open();
            doc.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Vault Entries Report</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                  .header h1 { margin: 0; color: #333; }
                  .header p { margin: 5px 0; color: #666; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f2f2f2; font-weight: bold; }
                  .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
                  .summary h3 { margin-top: 0; color: #333; }
                  .summary p { margin: 5px 0; }
                  @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>Vault Entries Report</h1>
                  <p>Generated on: ${new Date().toLocaleString()}</p>
                  <p>Total Entries: ${allVaultEntries.length}</p>
                </div>
                
                <div class="summary">
                  <h3>Summary</h3>
                  <p><strong>Total Deposits:</strong> $${totalDeposits.toFixed(2)}</p>
                  <p><strong>Total Withdrawals:</strong> $${totalWithdrawals.toFixed(2)}</p>
                  <p><strong>Total Transfers:</strong> $${totalTransfers.toFixed(2)}</p>
                  <p><strong>Net Amount:</strong> $${(totalDeposits - totalWithdrawals).toFixed(2)}</p>
                </div>

                <h2 style="color: #333; margin-top: 30px; border-bottom: 2px solid #ddd; padding-bottom: 5px;">Vault Entries</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Entry ID</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Created By</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${entriesRows}
                  </tbody>
                </table>
              </body>
              </html>
            `);
            doc.close();

            printIframe.onload = () => {
              setTimeout(() => {
                printIframe.contentWindow.focus();
                printIframe.contentWindow.print();
                document.body.removeChild(printIframe);
              }, 300);
            };
        } catch (error) {
            console.error("Error generating vault report:", error);
            toast.error(error.response?.data?.detail || "Failed to generate vault report");
        } finally {
            setPrinting(false);
        }
    };

    const handleAddEntry = async () => {
        if (!entryForm.amount || !entryForm.description) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            setLoading(true);
            await api.post("/common/api/vault-entries/", {
                ...entryForm,
                vault: vaultData.id
            });
            toast.success("Entry added successfully!");
            setShowAddEntry(false);
            setEntryForm({ entry_type: "deposit", amount: "", description: "" });
            await loadVaultData();
            setRefreshToggle(prev => !prev);
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to add entry");
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawal = async () => {
        if (!withdrawalForm.amount || !withdrawalForm.description) {
            toast.error("Please fill in all fields");
            return;
        }

        const withdrawalAmount = parseFloat(withdrawalForm.amount);
        const vaultAmount = parseFloat(vaultData?.total_amount || 0);

        if (withdrawalAmount > vaultAmount) {
            toast.error(`Insufficient funds. Available amount: $${vaultAmount.toFixed(2)}`);
            return;
        }

        try {
            setLoading(true);
            await api.post("/common/api/vault-entries/", {
                entry_type: "withdrawal",
                amount: withdrawalForm.amount,
                description: withdrawalForm.description,
                vault: vaultData.id
            });
            toast.success("Withdrawal processed successfully!");
            setShowWithdrawal(false);
            setWithdrawalForm({ amount: "", description: "" });
            await loadVaultData();
            setRefreshToggle(prev => !prev);
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to process withdrawal");
        } finally {
            setLoading(false);
        }
    };

    const handleClearVault = () => {
        const amount = parseFloat(vaultData?.total_amount || 0);
        setPendingClearAmount(amount);
        setShowClearVaultConfirmation(true);
    };

    const confirmClearVault = async () => {
        const amount = pendingClearAmount;
        if (amount <= 0) {
            toast.error("Vault is already empty");
            setShowClearVaultConfirmation(false);
            return;
        }
        // Close confirmation and open re-auth popup
        setShowClearVaultConfirmation(false);
        setShowReauth(true);
    };

    const handleReauthAndClear = async () => {
        if (!reauthPassword) {
            toast.error("Please enter your password");
            return;
        }
        try {
            setReauthLoading(true);
            // Re-authenticate using hidden email from redux
            const email = user?.email;
            if (!email) {
                toast.error("Your email is unavailable. Please re-login and try again.");
                setReauthLoading(false);
                return;
            }
            const resp = await axios.post(`${origin}/auth/login/`, { email, password: reauthPassword });
            if (resp.status === 200) {
                // Proceed to clear the vault
                await api.post("/common/api/vault-entries/", {
                    entry_type: "withdrawal",
                    amount: pendingClearAmount,
                    description: "Vault cleared - Complete withdrawal",
                    vault: vaultData.id
                });
                toast.success("Vault cleared successfully!");
                setShowReauth(false);
                setReauthPassword("");
                await loadVaultData();
                setRefreshToggle(prev => !prev);
            }
        } catch (error) {
            const msg = error.response?.data?.detail || "Authentication failed";
            toast.error(msg);
        } finally {
            setReauthLoading(false);
        }
    };

    const getEntryTypeColor = (entryType) => {
        switch (entryType) {
            case "deposit": return "bg-green-100 text-green-800";
            case "withdrawal": return "bg-red-100 text-red-800";
            case "transfer": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const toggleDescription = (entryId) => {
        setExpandedDescriptions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(entryId)) {
                newSet.delete(entryId);
            } else {
                newSet.add(entryId);
            }
            return newSet;
        });
    };

    const renderDescription = (entry) => {
        const isExpanded = expandedDescriptions.has(entry.id);
        const isLongDescription = entry.description && entry.description.length > 50;
        
        if (!isLongDescription) {
            return (
                <div className="max-w-64 break-words">
                    {entry.description}
                </div>
            );
        }
        
        return (
            <div className="max-w-64">
                <div className="text-sm text-gray-900 break-words">
                    {isExpanded ? entry.description : `${entry.description.slice(0, 50)}...`}
                </div>
                <button
                    onClick={() => toggleDescription(entry.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 cursor-pointer"
                >
                    {isExpanded ? "Show less" : "Show more"}
                </button>
            </div>
        );
    };

    const columns = useMemo(() => [
        { name: "Type", key: "entry_type" },
        { name: "Amount", key: "amount" },
        { name: "Vault Amount at Time", key: "vault_amount_at_time" },
        { name: "Description", key: "description" },
        { name: "Created By", key: "created_by" },
        { name: "Date", key: "created_at" },
    ], []);

    const cells = useMemo(() => [
        ({ row }) => (
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getEntryTypeColor(row.entry_type)}`}>
                {row.entry_type === "deposit" && <FiPlus />}
                {row.entry_type === "withdrawal" && <FiMinus />}
                <span>{row.entry_type.charAt(0).toUpperCase() + row.entry_type.slice(1)}</span>
            </span>
        ),
        ({ row }) => (
            <div className="text-sm font-semibold">
                ${parseFloat(row.amount).toFixed(2)}
            </div>
        ),
        ({ row }) => (
            <div className="text-sm font-semibold">
                ${parseFloat(row.vault_amount_at_time).toFixed(2)}
            </div>
        ),
        ({ row }) => renderDescription(row),
        ({ row }) => (
            <div className="text-sm text-gray-500">
                {row.created_by?.username || "N/A"}
            </div>
        ),
        ({ row }) => (
            <div className="text-sm text-gray-500">
                {formatDate(row.created_at)}
            </div>
        ),
    ], [expandedDescriptions]);

    if (loading && !vaultData) {
        return (
            <Spinner />
        );
    }

    return (
        <>
            <div className="mx-auto space-y-6">
                {/* Vault Summary */}
                <VaultSummary 
                    vaultData={vaultData}
                    onDepositClick={() => setShowAddEntry(true)}
                    onWithdrawClick={() => setShowWithdrawal(true)}
                    onClearVaultClick={handleClearVault}
                />

                {/* Date Filter */}
                <VaultFilter 
                    filters={filters} 
                    setFilters={setFilters}
                    onFilterChange={handleFilterChange}
                    onPrintClick={handlePrintReport}
                    printing={printing}
                />

                {/* Deposit & Withdrawal Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Deposits */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                                    <FiPlus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">Deposits</h2>
                                    <p className="text-sm text-gray-500">All deposit transactions</p>
                                </div>
                            </div>
                        </div>

                        <TableComponent
                            dataloading={depositLoading}
                            columns={columns}
                            data={depositEntries}
                            cells={cells}
                            createBtn={false}
                            actionIcons={false}
                            apiEndpoint="/common/api/vault-entries/"
                            extraParams={{ ...filters, entry_type: "deposit", vault: vaultData?.id }}
                            itemsPerPage={10}
                            renderData={renderDepositEntries}
                            onLoadingChange={setDepositLoading}
                            refresh={refreshToggle}
                            pageParamKey="deposit_page"
                        />
                    </div>

                    {/* Withdrawals */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                                    <FiMinus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">Withdrawals</h2>
                                    <p className="text-sm text-gray-500">All withdrawal transactions</p>
                                </div>
                            </div>
                        </div>

                        <TableComponent
                            dataloading={withdrawalLoading}
                            columns={columns}
                            data={withdrawalEntries}
                            cells={cells}
                            createBtn={false}
                            actionIcons={false}
                            apiEndpoint="/common/api/vault-entries/"
                            extraParams={{ ...filters, entry_type: "withdrawal", vault: vaultData?.id }}
                            itemsPerPage={10}
                            renderData={renderWithdrawalEntries}
                            onLoadingChange={setWithdrawalLoading}
                            refresh={refreshToggle}
                            pageParamKey="withdrawal_page"
                        />
                    </div>
                </div>
            </div>

            {/* Add Entry Popup */}
            <AddEntryPopup
                popup={showAddEntry}
                setPopup={setShowAddEntry}
                loading={loading}
                entryForm={entryForm}
                setEntryForm={setEntryForm}
                onSubmit={handleAddEntry}
            />

            {/* Withdrawal Popup */}
            <WithdrawalPopup
                popup={showWithdrawal}
                setPopup={setShowWithdrawal}
                loading={loading}
                withdrawalForm={withdrawalForm}
                setWithdrawalForm={setWithdrawalForm}
                onSubmit={handleWithdrawal}
                vaultData={vaultData}
            />

            {/* Clear Vault Confirmation */}
            {showClearVaultConfirmation && (
                <ConfirmationPopup
                    message={`Are you sure you want to clear the vault? This will withdraw the entire amount of $${parseFloat(vaultData?.total_amount || 0).toFixed(2)} and create a withdrawal entry.`}
                    onConfirm={confirmClearVault}
                    onCancel={() => setShowClearVaultConfirmation(false)}
                />
            )}

            {/* Re-authentication Popup */}
            <PopupComponent popup={showReauth} setPopup={setShowReauth} loading={reauthLoading}>
                <div className="space-y-4 ">
                    <h3 className="text-lg font-semibold">Confirm Vault Clearing</h3>
                    <p className="text-sm text-gray-600">For security, please enter your password to confirm clearing the vault.</p>
                    <div className="space-y-1">
                        <label className="block text-gray-700">Password</label>
                        <input
                            type="password"
                            value={reauthPassword}
                            onChange={(e) => setReauthPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            placeholder="Enter your password"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <SecondaryButton
                            type="button"
                            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700"
                            onClick={() => { setShowReauth(false); setReauthPassword(""); }}
                            disabled={reauthLoading}
                        >
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton
                            type="button"
                            className={`px-4 py-2 rounded-md bg-primary text-white ${reauthLoading ? 'opacity-60' : ''}`}
                            onClick={handleReauthAndClear}
                            disabled={reauthLoading}
                        >
                            {reauthLoading ? 'Verifying…' : 'Confirm'}
                        </PrimaryButton>
                    </div>
                </div>
            </PopupComponent>
        </>
    );
}

export default VaultPage; 