/**
 * Utility functions for creating dynamic filters
 */

/**
 * Creates a status filter configuration
 * @param {string} fieldName - The field name for the API
 * @param {string} defaultValue - Default value ('true' for active, 'false' for inactive, '' for all)
 * @param {string} label - Display label (default: 'Status')
 * @returns {Object} Filter configuration object
 */
export const createStatusFilter = (fieldName = 'is_active', defaultValue = 'true', label = 'Status') => ({
  fieldName,
  label,
  defaultValue,
  options: [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ],
  placeholder: 'All Status'
});

/**
 * Creates a select filter configuration
 * @param {string} fieldName - The field name for the API
 * @param {string} label - Display label
 * @param {Array} options - Array of {value, label} objects
 * @param {string} defaultValue - Default value
 * @param {string} placeholder - Placeholder text
 * @returns {Object} Filter configuration object
 */
export const createSelectFilter = (fieldName, label, options, defaultValue = '', placeholder = 'All') => ({
  fieldName,
  label,
  defaultValue,
  options,
  placeholder
});

/**
 * Creates a text filter configuration
 * @param {string} fieldName - The field name for the API
 * @param {string} label - Display label
 * @param {string} placeholder - Placeholder text
 * @param {string} defaultValue - Default value
 * @returns {Object} Filter configuration object
 */
export const createTextFilter = (fieldName, label, placeholder = 'Enter text...', defaultValue = '') => ({
  fieldName,
  label,
  defaultValue,
  placeholder,
  type: 'text'
});

/**
 * Creates a date filter configuration
 * @param {string} fieldName - The field name for the API
 * @param {string} label - Display label
 * @param {string} defaultValue - Default value (YYYY-MM-DD format)
 * @returns {Object} Filter configuration object
 */
export const createDateFilter = (fieldName, label, defaultValue = '') => ({
  fieldName,
  label,
  defaultValue,
  type: 'date'
});

/**
 * Creates a number filter configuration
 * @param {string} fieldName - The field name for the API
 * @param {string} label - Display label
 * @param {string} placeholder - Placeholder text
 * @param {number} defaultValue - Default value
 * @returns {Object} Filter configuration object
 */
export const createNumberFilter = (fieldName, label, placeholder = 'Enter number...', defaultValue = '') => ({
  fieldName,
  label,
  defaultValue,
  placeholder,
  type: 'number'
});

/**
 * Common filter configurations for different use cases
 */
export const commonFilters = {
  // Status filters
  activeStatus: () => createStatusFilter('is_active', 'true', 'Status'),
  allStatus: () => createStatusFilter('is_active', '', 'Status'),
  
  // Role filters
  userRole: (roles = []) => createSelectFilter(
    'role', 
    'Role', 
    roles.map(role => ({ value: role, label: role })),
    '',
    'All Roles'
  ),
  
  // Date filters
  createdDate: () => createDateFilter('created_date', 'Created Date'),
  updatedDate: () => createDateFilter('updated_date', 'Updated Date'),
  
  // Text filters
  search: () => createTextFilter('search', 'Search', 'Search...'),
  name: () => createTextFilter('name', 'Name', 'Enter name...'),
  email: () => createTextFilter('email', 'Email', 'Enter email...'),
  
  // Number filters
  id: () => createNumberFilter('id', 'ID', 'Enter ID...'),
  age: () => createNumberFilter('age', 'Age', 'Enter age...')
};

/**
 * Creates a complete filter set for common use cases
 * @param {Array} filterTypes - Array of filter type strings
 * @returns {Array} Array of filter configurations
 */
export const createFilterSet = (filterTypes) => {
  return filterTypes.map(type => {
    if (typeof type === 'string' && commonFilters[type]) {
      return commonFilters[type]();
    }
    return type; // Assume it's already a filter configuration
  });
};
