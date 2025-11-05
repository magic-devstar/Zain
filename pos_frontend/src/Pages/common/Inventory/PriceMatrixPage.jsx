import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { IoAdd, IoTrash, IoPencil, IoCalculator, IoClose } from 'react-icons/io5';
import PrimaryBtn from '../../../Components/Common/PrimaryBtn';
import SecondaryBtn from '../../../Components/Common/SecondaryBtn';
import Spinner from '../../../Components/Common/Spinner';
import TableComponent from '../../../Components/Common/TableComponent';
import PopupComponent from '../../../Components/popups/PopupComponent';
import priceMatrixAPI from '../../../api/priceMatrix';
import { useSelector } from 'react-redux';

const PriceMatrixPage = () => {
  const user = useSelector((state) => state.user.user);
  const [priceMatrixRules, setPriceMatrixRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    min_amount: '',
    max_amount: '',
    tax_percentage: '',
    is_active: true,
    description: ''
  });

  // Check if user has permission to access price matrix
  const hasPermission = user?.role === "Admin" || user?.role === "Manager" || user?.role === "Warehouse Manager";

  useEffect(() => {
    if (hasPermission) {
      fetchPriceMatrixRules();
    } else {
      setLoading(false);
      setDataLoading(false);
    }
  }, [hasPermission]);

  const renderPriceMatrixRules = (rulesData) => {
    setPriceMatrixRules(rulesData);
  };

  const fetchPriceMatrixRules = async () => {
    try {
      setLoading(true);
      const response = await priceMatrixAPI.getAll();
      
      console.log('Price Matrix API Response:', response);
      console.log('Response type:', typeof response);
      console.log('Is Array:', Array.isArray(response));
      
      // Ensure we have an array, handle different response formats
      let data = response;
      if (response && response.results) {
        // If it's a paginated response
        data = response.results;
      } else if (Array.isArray(response)) {
        // If it's already an array
        data = response;
      } else {
        // If it's not an array, set to empty array
        console.warn('Unexpected response format from price matrix API:', response);
        data = [];
      }
      
      console.log('Final data to set:', data);
      setPriceMatrixRules(data);
    } catch (error) {
      console.error('Error fetching price matrix rules:', error);
      toast.error('Failed to fetch price matrix rules');
      setPriceMatrixRules([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePriceMatrix = () => {
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setRefreshToggle(false);
      if (editingRule) {
        await priceMatrixAPI.update(editingRule.id, formData);
        toast.success('Price matrix rule updated successfully');
      } else {
        await priceMatrixAPI.create(formData);
        toast.success('Price matrix rule created successfully');
      }
      setShowForm(false);
      setEditingRule(null);
      resetForm();
      setRefreshToggle(true);
    } catch (error) {
      if (error.response && error.response.data) {
        // Show all backend validation errors as toast
        const errors = error.response.data;
        const errorMessages = Object.entries(errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        toast.error(errorMessages);
      } else {
        toast.error('Failed to save price matrix rule');
      }
      console.error('Error saving price matrix rule:', error);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      min_amount: rule.min_amount,
      max_amount: rule.max_amount || '',
      tax_percentage: rule.tax_percentage,
      is_active: rule.is_active,
      description: rule.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      setRefreshToggle(false);
      await priceMatrixAPI.delete(id);
      toast.success('Price matrix rule deleted successfully');
      setRefreshToggle(true);
    } catch (error) {
      console.error('Error deleting price matrix rule:', error);
      toast.error('Failed to delete price matrix rule');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      min_amount: '',
      max_amount: '',
      tax_percentage: '',
      is_active: true,
      description: ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRule(null);
    resetForm();
  };

  // Define columns for the table
  const columns = useMemo(() => [
    { name: "Name", key: "name" },
    { name: "Amount Range", key: "amount_range" },
    { name: "Tax Percentage", key: "tax_percentage" },
    { name: "Status", key: "status" },
    { name: "Actions", key: "actions" }
  ], []);

  // Define cells for the table
  const cells = useMemo(() => [
    ({ row }) => (
      <div>
        <div className="text-sm font-medium text-gray-900">{row.name}</div>
        {row.description && (
          <div className="text-sm text-gray-500">{row.description}</div>
        )}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm text-gray-900">
        ${row.min_amount} - {row.max_amount ? `$${row.max_amount}` : '∞'}
      </div>
    ),
    ({ row }) => (
      <div className="text-sm text-gray-900">
        {row.tax_percentage}%
      </div>
    ),
    ({ row }) => (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        row.is_active 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {row.is_active ? 'Active' : 'Inactive'}
      </span>
    )
  ], []);

  // Show access denied message for users without permission
  if (!hasPermission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <IoCalculator className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">
            You don't have permission to access the Price Matrix. 
            This feature is only available for Admin, Manager, and Warehouse Manager roles.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={priceMatrixRules}
        cells={cells}
        heading="Price Matrix Management"
        description="Configure tax percentages based on amount ranges"
        createBtn={true}
        onCreateClick={handleCreatePriceMatrix}
        actionIcons={true}
        apiEndpoint="/common/api/price-matrix/"
        extraParams={{}}
        itemsPerPage={10}
        renderData={renderPriceMatrixRules}
        hideDeleteBtn={false}
        onLoadingChange={setDataLoading}
        EditClick={(rule) => handleEdit(rule)}
        DeleteClick={(id) => handleDelete(id)}
        refresh={refreshToggle}
      />

      {/* Form Modal */}
      {showForm && (
        <PopupComponent popup={showForm} setPopup={setShowForm} loading={loading}>
          <div className="relative mx-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingRule ? 'Edit Price Matrix Rule' : 'Add Price Matrix Rule'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.min_amount}
                      onChange={(e) => {
                        setFormData({...formData, min_amount: e.target.value});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.max_amount}
                      onChange={(e) => {
                        setFormData({...formData, max_amount: e.target.value});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Percentage <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tax_percentage}
                    onChange={(e) => {
                      setFormData({...formData, tax_percentage: e.target.value});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 10.00 for 10%"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({...formData, description: e.target.value});
                    }}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional description"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <SecondaryBtn onClick={handleCancel}>
                    Cancel
                  </SecondaryBtn>
                  <PrimaryBtn type="submit">
                    {editingRule ? 'Update' : 'Create'}
                  </PrimaryBtn>
                </div>
              </form>
            </div>
          </div>
        </PopupComponent>
      )}
    </>
  );
};

export default PriceMatrixPage; 