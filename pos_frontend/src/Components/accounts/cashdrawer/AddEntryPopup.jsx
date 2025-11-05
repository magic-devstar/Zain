import React, { useState, useEffect } from 'react';
import PopupComponent from '../../popups/PopupComponent';
import PrimaryBtn from '../../Common/PrimaryBtn';
import SecondaryBtn from '../../Common/SecondaryBtn';
import { toast } from 'react-hot-toast';
import api from '../../../utils/api';
import Select from 'react-select';
import ImageUploaderComponent from '../../Common/ImageUploaderComponent';

const AddEntryPopup = ({ popup, setPopup, loading, onSubmit }) => {
  const [entryForm, setEntryForm] = useState({
    entry_type: "sale",
    amount: "",
    description: "",
    customer_id: null,
    invoice_id: null
  });
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [images, setImages] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Fetch customers and invoices on component mount
  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
  }, []);

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      const storesRes = await api.get("/auth/stores/?all=true");

      const allStores = storesRes.data.map(store => ({
        value: store.id,
        label: `${store.store_name} (${store.customer_name})`,
        customer_name: store.customer_name
      }));

      setCustomers(allStores);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const invoicesRes = await api.get("/common/api/invoices/?all=true");

      const allInvoices = invoicesRes.data.map(invoice => ({
        value: invoice.id,
        label: `${invoice.invoice_number} - $${invoice.total_amount} (${invoice.customer_name || 'No Customer'})`,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        customer_name: invoice.customer_name
      }));

      setInvoices(allInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleSubmit = () => {
    const amountEmpty = !entryForm.amount || entryForm.amount.trim() === '';
    const descriptionEmpty = !entryForm.description || entryForm.description.trim() === '';
    if (amountEmpty && descriptionEmpty) {
      toast.error('Please fill up all fields');
      return;
    }
    if (amountEmpty) {
      toast.error('Please fill up the amount');
      return;
    }
    if (descriptionEmpty) {
      toast.error('Please fill up the description');
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('entry_type', entryForm.entry_type);
    formData.append('amount', entryForm.amount);
    formData.append('description', entryForm.description);
    
    if (entryForm.customer_id) {
      formData.append('store_id', entryForm.customer_id);
    }
    
    if (entryForm.invoice_id) {
      formData.append('invoice_id', entryForm.invoice_id);
    }

    // Add images if any (only new images that have file objects)
    images.forEach(image => {
      if (image.file && image.isNew) {
        formData.append('images', image.file);
      }
    });

    onSubmit(formData);
  };

  const handleCancel = () => {
    setPopup(false);
    setEntryForm({ entry_type: "sale", amount: "", description: "", customer_id: null, invoice_id: null });
    setImages([]);
  };

  const customStyles = {
    control: (provided) => ({
      ...provided,
      borderColor: "#D1D5DB",
      "&:hover": {
        borderColor: "#9CA3AF",
      },
    }),
  };

  return (
    <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
      <div className="max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Add Cash Entry</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entry Type
            </label>
            <select
              value={entryForm.entry_type}
              onChange={(e) => setEntryForm({...entryForm, entry_type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sale">Sale (Add to drawer)</option>
              <option value="fill">Fill (Add to drawer)</option>
              <option value="refund">Refund (Subtract from drawer)</option>
              <option value="adjustment">Adjustment (Subtract from drawer)</option>
              <option value="bleed">Bleed (Subtract from drawer)</option>
              <option value="withdrawal">Withdrawal (Subtract from drawer)</option>
              <option value="closing">Closing (Subtract from drawer)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store (Optional)
            </label>
            <Select
              options={customers}
              value={customers.find(c => c.value === entryForm.customer_id)}
              onChange={(option) => setEntryForm({...entryForm, customer_id: option?.value || null})}
              styles={customStyles}
              placeholder={customersLoading ? "Loading stores..." : "Select a store..."}
              isClearable
              isDisabled={customersLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice (Optional)
            </label>
            <Select
              options={invoices}
              value={invoices.find(i => i.value === entryForm.invoice_id)}
              onChange={(option) => setEntryForm({...entryForm, invoice_id: option?.value || null})}
              styles={customStyles}
              placeholder={invoicesLoading ? "Loading invoices..." : "Select an invoice..."}
              isClearable
              isDisabled={invoicesLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={entryForm.amount}
              onChange={(e) => setEntryForm({...entryForm, amount: e.target.value})}
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
              onChange={(e) => setEntryForm({...entryForm, description: e.target.value})}
              placeholder="Enter description for this entry..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            <ImageUploaderComponent
              images={images}
              setImages={setImages}
              showDeleteButton={true}
              disableUpload={false}
            />
          </div>

          <div className="flex space-x-3 pt-4 justify-end">
            <SecondaryBtn
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </SecondaryBtn>
            <PrimaryBtn
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Entry"}
            </PrimaryBtn>
          </div>
        </div>
      </div>
    </PopupComponent>
  );
};

export default AddEntryPopup; 