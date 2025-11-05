import React, { useState, useMemo } from "react";
import TableComponent from "../../../Components/Common/TableComponent";
import api from "../../../utils/api";
import PopupComponent from "../../../Components/popups/PopupComponent";
import toast from "react-hot-toast";
import { useSelector } from 'react-redux';
import {  PAGE_IDS } from "../../../utils/sortingUtils";
import PrimaryBtn from "../../../Components/Common/PrimaryBtn";
import SecondaryBtn from "../../../Components/Common/SecondaryBtn";

function CategoryManagementPage() {
  const user = useSelector((state) => state.user.user);
  const [categories, setCategories] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [popup, setPopup] = useState(false);
  const [popupName, setPopupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [categoryDetails, setCategoryDetails] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const renderCategories = (categoryData) => {
    setCategories(categoryData);
  };

  const handleCreateCategory = () => {
    setCategoryDetails(null);
    setPopupName("Create Category");
    setPopup(true);
  };

  const handleEditCategory = async (categoryRow) => {
    try {
      setLoading(true);
      setCategoryDetails(categoryRow);
      setPopupName("Edit Category");
      setPopup(true);
    } catch (error) {
      toast.error("Failed to load category details for editing");
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (categoryData) => {
    try {
      setLoading(true);
      setRefreshToggle(false);
      
      if (categoryDetails) {
        // Edit existing category
        const response = await api.put(`/common/api/inventory-categories/${categoryDetails.id}/`, categoryData);
        toast.success("Category updated successfully!");
      } else {
        // Create new category
        const response = await api.post("/common/api/inventory-categories/", categoryData);
        toast.success("Category created successfully!");
      }
      
      setRefreshToggle(true);
      setPopup(false);
      setCategoryDetails(null);
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;
        
        // Show all field-level errors from DRF
        Object.entries(data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg) => toast.error(`${field}: ${msg}`));
          } else {
            toast.error(`${field}: ${messages}`);
          }
        });
      } else {
        toast.error(error.message || "Failed to save category");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSortConfig) => {
    console.log('Sorting changed:', newSortConfig);
    setSortConfig(newSortConfig);
    setRefreshToggle(prev => !prev);
  };

  const columns = useMemo(() => [
    { name: "Name", key: "name", sortable: true },
    { name: "Actions", key: "actions", sortable: false },
  ], []);

  const cells = useMemo(() => [
    ({ row }) => <div className="text-sm">{row.name}</div>,
  ], []);

  return (
    <>
      <TableComponent
        dataloading={dataLoading}
        columns={columns}
        data={categories}
        hideDeleteBtn={true}
        cells={cells}
        heading="Category Management"
        description="Create and manage inventory categories here."
        createBtn={true}
        onCreateClick={handleCreateCategory}
        actionIcons={true}
        apiEndpoint="/common/api/inventory-categories/"
        extraParams={{
          ...(sortConfig.key && { ordering: `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}` })
        }}
        itemsPerPage={10}
        renderData={renderCategories}
        onLoadingChange={setDataLoading}
        EditClick={(category) => handleEditCategory(category)}
        refresh={refreshToggle}
        onSortChange={handleSortChange}
        pageId={PAGE_IDS.CATEGORY_MANAGEMENT}
      />
      
      {/* Create/Edit Category Popup */}
      {popupName === "Create Category" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <CategoryFormPopup
            onClose={() => setPopup(false)}
            onSubmit={handleCategorySubmit}
            isSubmitting={loading}
          />
        </PopupComponent>
      )}
      
      {popupName === "Edit Category" && (
        <PopupComponent popup={popup} setPopup={setPopup} loading={loading}>
          <CategoryFormPopup
            categoryDetails={categoryDetails}
            onSubmit={handleCategorySubmit}
            onClose={() => setPopup(false)}
            isSubmitting={loading}
          />
        </PopupComponent>
      )}
    </>
  );
}

// Category Form Popup Component
function CategoryFormPopup({ categoryDetails, onSubmit, onClose, isSubmitting }) {
  const [formData, setFormData] = useState({
    name: categoryDetails?.name || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="bg-white rounded-lg p-2 w-full max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        {categoryDetails ? "Edit Category" : "Create New Category"}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Category Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter category name"
            required
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <SecondaryBtn
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </SecondaryBtn>
          <PrimaryBtn   
            type="submit"
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? "Saving..." : categoryDetails ? "Update" : "Create"}
          </PrimaryBtn>
        </div>
      </form>
    </div>
  );
}

export default CategoryManagementPage;
