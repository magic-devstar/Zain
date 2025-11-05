import { useState, useEffect } from 'react';
import { Search, Plus, Package, DollarSign, Tag, BarChart3, AlertCircle, Check } from 'lucide-react';

const InventoryDetailsForm = ({ data, handleChange, nextStep }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [errors, setErrors] = useState({});
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const res = await fetch('/api/inventory/categories/');
        const data = await res.json();
        setCategories(data);
        setFilteredCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setErrors(prev => ({ ...prev, categories: 'Failed to load categories' }));
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categorySearch) {
      const filtered = categories.filter(cat => 
        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
  }, [categorySearch, categories]);

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Product name is required';
        } else if (value.length < 2) {
          newErrors.name = 'Product name must be at least 2 characters';
        } else {
          delete newErrors.name;
        }
        break;
      case 'upc':
        if (value && (value.length < 8 || value.length > 14)) {
          newErrors.upc = 'UPC must be between 8-14 digits';
        } else {
          delete newErrors.upc;
        }
        break;
      case 'unit_price':
        if (!value) {
          newErrors.unit_price = 'Unit price is required';
        } else if (isNaN(Number.parseFloat(value)) || Number.parseFloat(value) <= 0) {
          newErrors.unit_price = 'Unit price must be a positive number';
        } else {
          delete newErrors.unit_price;
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowCategoryInput(false);
    setCategorySearch("");
    handleChange({
      target: {
        name: 'category',
        value: category.id
      }
    });
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      setIsCreatingCategory(true);
      const response = await fetch('/api/inventory/categories/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      
      if (!response.ok) throw new Error('Failed to create category');
      
      const createdCategory = await response.json();
      setCategories(prev => [...prev, createdCategory]);
      setSelectedCategory(createdCategory);
      setNewCategory("");
      setShowCategoryInput(false);
      handleChange({
        target: {
          name: 'category',
          value: createdCategory.id
        }
      });
    } catch (error) {
      console.error('Error creating category:', error);
      setErrors(prev => ({ ...prev, category: 'Failed to create category' }));
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleUnitPriceChange = async (e) => {
    const { name, value } = e.target;
    handleChange(e);
    validateField(name, value);
    
    if (name === "unit_price" && value && !isNaN(Number.parseFloat(value))) {
      try {
        setIsCalculatingPrice(true);
        
        // Simulate API call with priceMatrixAPI
        const response = await new Promise((resolve) => {
          setTimeout(() => {
            const unitPrice = Number.parseFloat(value);
            const markupPercentage = 25; // 25% markup
            const calculatedPrice = unitPrice + (unitPrice * markupPercentage / 100);
            resolve({ sale_price: calculatedPrice });
          }, 500);
        });
        
        handleChange({
          target: {
            name: 'price',
            value: response.sale_price.toFixed(2)
          }
        });
      } catch (error) {
        console.error('Error calculating sale price:', error);
        const unitPrice = Number.parseFloat(value);
        const markupPercentage = 20;
        const calculatedPrice = unitPrice + (unitPrice * markupPercentage / 100);
        handleChange({
          target: {
            name: 'price',
            value: calculatedPrice.toFixed(2)
          }
        });
      } finally {
        setIsCalculatingPrice(false);
      }
    } else if (name === "unit_price") {
      handleChange({
        target: {
          name: 'price',
          value: ''
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    handleChange(e);
    validateField(name, value);
  };

  const isFormValid = () => {
    return data.name && 
           data.unit_price && 
           selectedCategory && 
           Object.keys(errors).length === 0;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-8">
        <Package className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Inventory Details</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Name */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Tag className="w-4 h-4" />
            Product Name *
          </label>
          <input
            type="text"
            name="name"
            value={data.name}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter product name"
          />
          {errors.name && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errors.name}
            </p>
          )}
        </div>

        {/* UPC */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <BarChart3 className="w-4 h-4" />
            UPC Code
          </label>
          <input
            type="text"
            name="upc"
            value={data.upc}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.upc ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter UPC code"
          />
          {errors.upc && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errors.upc}
            </p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Tag className="w-4 h-4" />
            Category *
          </label>
          
          {!showCategoryInput ? (
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryInput(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              </div>
              
              {(categorySearch || !selectedCategory) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {isLoadingCategories ? (
                    <div className="p-4 text-center text-gray-500">Loading categories...</div>
                  ) : filteredCategories.length > 0 ? (
                    filteredCategories.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategorySelect(category)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        {category.name}
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">No categories found</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter new category name"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={!newCategory.trim() || isCreatingCategory}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isCreatingCategory ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryInput(false);
                  setNewCategory("");
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          
          {selectedCategory && (
            <div className="flex items-center gap-2 mt-2">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {selectedCategory.name}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  handleChange({ target: { name: 'category', value: '' } });
                }}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
          )}
          
          {errors.category && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errors.category}
            </p>
          )}
        </div>

        {/* Unit Price */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <DollarSign className="w-4 h-4" />
            Unit Price *
          </label>
          <input
            type="number"
            name="unit_price"
            value={data.unit_price}
            onChange={handleUnitPriceChange}
            step="0.01"
            min="0"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.unit_price ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0.00"
          />
          {errors.unit_price && (
            <p className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {errors.unit_price}
            </p>
          )}
        </div>

        {/* Sale Price */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <DollarSign className="w-4 h-4" />
            Sale Price
          </label>
          <div className="relative">
            <input
              type="text"
              name="price"
              value={data.price}
              onChange={handleChange}
              readOnly
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
              placeholder="Auto-calculated"
            />
            {isCalculatingPrice && (
              <div className="absolute right-3 top-3.5">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {data.unit_price && !isNaN(Number.parseFloat(data.unit_price)) && (
            <p className="flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" />
              Auto-calculated via Price Matrix (25% markup)
            </p>
          )}
        </div>
      </div>

      {/* Form Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Product:</span>
            <span className="ml-2 font-medium">{data.name || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-gray-600">Category:</span>
            <span className="ml-2 font-medium">{selectedCategory?.name || 'Not selected'}</span>
          </div>
          <div>
            <span className="text-gray-600">Sale Price:</span>
            <span className="ml-2 font-medium">${data.price || '0.00'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-8">
        <button
          type="button"
          onClick={nextStep}
          disabled={!isFormValid()}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isFormValid()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Next Step
        </button>
      </div>
    </div>
  );
};

export default InventoryDetailsForm;