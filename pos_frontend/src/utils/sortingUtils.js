/**
 * Utility functions for managing page-specific sorting configurations
 */

/**
 * Get a unique page identifier based on the current route and context
 * @param {string} basePageName - Base name for the page (e.g., 'inventory', 'warehouse')
 * @param {Object} params - URL parameters or context that makes this page unique
 * @returns {string} Unique page identifier
 */
export const getPageId = (basePageName, params = {}) => {
  const paramString = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}_${value}`)
    .join('_');
  
  return paramString ? `${basePageName}-${paramString}` : basePageName;
};

/**
 * Get common page identifiers for different sections
 */
export const PAGE_IDS = {
  INVENTORY_LIST: 'inventory-list',
  INVENTORY_WAREHOUSE: (warehouseId) => `inventory-warehouse_${warehouseId}`,
  WAREHOUSE_LIST: 'warehouse-list',
  TICKET_LIST: 'ticket-list',
  TICKET_TYPE: (type) => `ticket-${type}`,
  CUSTOMER_LIST: 'customer-list',
  VENDOR_LIST: 'vendor-list',
  TRANSFER_LIST: 'transfer-list',
  ASSEMBLY_LIST: 'assembly-list',
  VEHICLE_LIST: 'vehicle-list',
  USER_LIST: 'user-list',
  GROUP_LIST: 'group-list',
  INVOICE_LIST: 'invoice-list',
  RECONCILIATION_LIST: 'reconciliation-list',
  CASH_DRAWER_LIST: 'cash-drawer-list',
  VAULT_LIST: 'vault-list',
  CHAT_LIST: 'chat-list',
  TUTORIAL_LIST: 'tutorial-list',
  READING_LIST: 'reading-list',
  LOCATION_LIST: 'location-list',
  PARTNER_LIST: 'partner-list',
  EXTERNAL_USER_LIST: 'external-user-list',
  MANAGER_LIST: 'manager-list',
  REPORTER_LIST: 'reporter-list',
  SERVICE_CUSTOMER_LIST: 'service-customer-list',
  TECHNICIAN_LIST: 'technician-list',
  VENDING_CUSTOMER_LIST: 'vending-customer-list',
  WAREHOUSE_MANAGER_LIST: 'warehouse-manager-list',
  WAREHOUSE_TECHNICIAN_LIST: 'warehouse-technician-list',
  APPROVAL_CUSTOMER_LIST: 'approval-customer-list',
  SHIFT_LIST: 'shift-list',
};

/**
 * Clear all sorting configurations from localStorage
 */
export const clearAllSortingConfigs = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('tableSortConfig_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear sorting configs:', error);
  }
};

/**
 * Get all current sorting configurations
 */
export const getAllSortingConfigs = () => {
  try {
    const configs = {};
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('tableSortConfig_')) {
        const pageId = key.replace('tableSortConfig_', '');
        try {
          configs[pageId] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          console.warn(`Failed to parse sorting config for ${pageId}:`, e);
        }
      }
    });
    return configs;
  } catch (error) {
    console.warn('Failed to get all sorting configs:', error);
    return {};
  }
};
