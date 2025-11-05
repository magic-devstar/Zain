import { useState } from 'react';
import {
    Printer
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import statusColors from '../../utils/statusColors';
import SecondaryBtn from '../Common/SecondaryBtn';
import PrimaryBtn from '../Common/PrimaryBtn';


const PrintTicektPopup = ({ onSubmit, loading }) => {
    const statusList = [
        { value: 'OPEN', label: 'OPEN' },
        { value: 'IN PROGRESS', label: 'IN PROGRESS' },
        { value: 'PARTIALLY CLOSED', label: 'Partially CLOSED' },
        { value: 'PENDING APPROVAL', label: 'PENDING APPROVAL' },
        { value: 'CLOSED', label: 'CLOSED' }
    ];

    const [selectedStatus, setSelectedStatus] = useState("");  // Single value

    const handleStatusChange = (status) => {
        setSelectedStatus(status);
    };

    const handleSubmit = () => {
        if (!selectedStatus) {
            toast.error('Please select a status');
            return;
        }
        onSubmit(selectedStatus); // Pass only one status
    };

    return (
        <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h2 className="text-xl font-semibold mb-4">Print Tickets</h2>
            <p className="text-gray-600 mb-4">Select ticket status to print:</p>

            <div className="mb-4">
                <hr className="mb-2" />

                {statusList.map(status => (
                    <div key={status.value} className="flex items-center mb-2">
                        <input
                            type="radio" // <-- changed to radio
                            id={`status-${status.value}`}
                            name="status" // <-- important: group radios
                            className="mr-2 cursor-pointer"
                            checked={selectedStatus === status.value}
                            onChange={() => handleStatusChange(status.value)}
                        />
                        <label htmlFor={`status-${status.value}`}>
                            <div className="flex items-center cursor-pointer">
                                {/* Assuming you have statusColors[status.value] */}
                                <div className={`w-3 h-3 rounded-full ${statusColors[status.value]} mr-2`}></div>
                                {status.label}
                            </div>
                        </label>
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-6 gap-2">
                <SecondaryBtn
                    onClick={() => setSelectedStatus("")}
                >
                    Clear
                </SecondaryBtn>
                <PrimaryBtn
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? 'Processing...' : (
                        <>
                            <Printer size={20} className="mr-2" />
                            Print
                        </>
                    )}
                </PrimaryBtn>
            </div>
        </div>
    );
};

export default PrintTicektPopup;