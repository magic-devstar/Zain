import api from '../utils/api';

// Invoice API utilities
export const invoiceAPI = {
  // Get all invoices with optional filters
  getInvoices: async (params = {}) => {
    const response = await api.get('/common/api/invoices/', { params });
    return response.data;
  },

  // Get a single invoice by ID
  getInvoice: async (id) => {
    const response = await api.get(`/common/api/invoices/${id}/`);
    return response.data;
  },

  // Create a new invoice
  createInvoice: async (invoiceData) => {
    const response = await api.post('/common/api/invoices/', invoiceData);
    return response.data;
  },

  // Update an invoice
  updateInvoice: async (id, invoiceData) => {
    const response = await api.patch(`/common/api/invoices/${id}/`, invoiceData);
    return response.data;
  },

  // Delete an invoice
  deleteInvoice: async (id) => {
    const response = await api.delete(`/common/api/invoices/${id}/`);
    return response.data;
  },

  // Change invoice status
  changeStatus: async (id, status) => {
    const response = await api.post(`/common/api/invoices/${id}/change-status/`, { status });
    return response.data;
  },

  // Get invoice for printing
  getInvoiceForPrint: async (id) => {
    const response = await api.get(`/common/api/invoices/${id}/print/`);
    return response.data;
  },

  // Apply compulsory charges to an invoice
  applyCompulsoryCharges: async (id) => {
    const response = await api.post(`/common/api/invoices/${id}/apply-compulsory-charges/`);
    return response.data;
  },

  // Create invoice from transfer
  createFromTransfer: async (transferId, additionalData = {}) => {
    const response = await api.post('/common/api/invoice-from-transfer/create-from-transfer/', {
      transfer_id: transferId,
      ...additionalData
    });
    return response.data;
  }
};

// Invoice Charge Type API utilities
export const invoiceChargeTypeAPI = {
  // Get all charge types
  getChargeTypes: async (params = {}) => {
    const response = await api.get('/common/api/invoice-charge-types/', { params });
    return response.data;
  },

  // Get a single charge type by ID
  getChargeType: async (id) => {
    const response = await api.get(`/common/api/invoice-charge-types/${id}/`);
    return response.data;
  },

  // Create a new charge type
  createChargeType: async (chargeTypeData) => {
    const response = await api.post('/common/api/invoice-charge-types/', chargeTypeData);
    return response.data;
  },

  // Update a charge type
  updateChargeType: async (id, chargeTypeData) => {
    const response = await api.patch(`/common/api/invoice-charge-types/${id}/`, chargeTypeData);
    return response.data;
  },

  // Delete a charge type
  deleteChargeType: async (id) => {
    const response = await api.delete(`/common/api/invoice-charge-types/${id}/`);
    return response.data;
  }
};

// Invoice Item API utilities
export const invoiceItemAPI = {
  // Get invoice items
  getInvoiceItems: async (params = {}) => {
    const response = await api.get('/common/api/invoice-items/', { params });
    return response.data;
  },

  // Get a single invoice item by ID
  getInvoiceItem: async (id) => {
    const response = await api.get(`/common/api/invoice-items/${id}/`);
    return response.data;
  },

  // Create a new invoice item
  createInvoiceItem: async (itemData) => {
    const response = await api.post('/common/api/invoice-items/', itemData);
    return response.data;
  },

  // Update an invoice item
  updateInvoiceItem: async (id, itemData) => {
    const response = await api.patch(`/common/api/invoice-items/${id}/`, itemData);
    return response.data;
  },

  // Delete an invoice item
  deleteInvoiceItem: async (id) => {
    const response = await api.delete(`/common/api/invoice-items/${id}/`);
    return response.data;
  }
};

// Invoice Charge API utilities
export const invoiceChargeAPI = {
  // Get invoice charges
  getInvoiceCharges: async (params = {}) => {
    const response = await api.get('/common/api/invoice-charges/', { params });
    return response.data;
  },

  // Get a single invoice charge by ID
  getInvoiceCharge: async (id) => {
    const response = await api.get(`/common/api/invoice-charges/${id}/`);
    return response.data;
  },

  // Create a new invoice charge
  createInvoiceCharge: async (chargeData) => {
    const response = await api.post('/common/api/invoice-charges/', chargeData);
    return response.data;
  },

  // Update an invoice charge
  updateInvoiceCharge: async (id, chargeData) => {
    const response = await api.patch(`/common/api/invoice-charges/${id}/`, chargeData);
    return response.data;
  },

  // Delete an invoice charge
  deleteInvoiceCharge: async (id) => {
    const response = await api.delete(`/common/api/invoice-charges/${id}/`);
    return response.data;
  }
}; 