import api from '../utils/api';

const priceMatrixAPI = {
  // Get all price matrix rules
  getAll: async () => {
    const response = await api.get('/common/api/price-matrix/');
    return response.data;
  },

  // Get a single price matrix rule
  getById: async (id) => {
    const response = await api.get(`/common/api/price-matrix/${id}/`);
    return response.data;
  },

  // Create a new price matrix rule
  create: async (data) => {
    const response = await api.post('/common/api/price-matrix/', data);
    return response.data;
  },

  // Update a price matrix rule
  update: async (id, data) => {
    const response = await api.put(`/common/api/price-matrix/${id}/`, data);
    return response.data;
  },

  // Delete a price matrix rule
  delete: async (id) => {
    const response = await api.delete(`/common/api/price-matrix/${id}/`);
    return response.data;
  },

  // Calculate sale price based on unit price
  calculateSalePrice: async (unitPrice) => {
    const response = await api.post('/common/api/price-matrix/calculate-sale-price/', {
      unit_price: unitPrice
    });
    return response.data;
  },

  // Get tax percentage for a given amount
  getTaxPercentage: async (amount) => {
    const response = await api.get(`/common/api/price-matrix/get-tax-percentage/?amount=${amount}`);
    return response.data;
  }
};

export default priceMatrixAPI; 