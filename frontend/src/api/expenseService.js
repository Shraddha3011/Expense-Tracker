import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Retry logic for network failures
const retryRequest = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
    }
  }
};

// Create expense with idempotency
export const createExpense = async (expense) => {
  const idempotencyKey = uuidv4();
  
  return retryRequest(async () => {
    const response = await api.post('/expenses', expense, {
      headers: {
        'idempotency-key': idempotencyKey,
      },
    });
    return response.data;
  });
};

// Fetch expenses with optional filters
export const fetchExpenses = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.category) {
    params.append('category', filters.category);
  }
  
  if (filters.sortDate) {
    params.append('sortDate', filters.sortDate);
  }

  return retryRequest(async () => {
    const response = await api.get(`/expenses?${params}`);
    return response.data;
  });
};

// Fetch categories
export const fetchCategories = async () => {
  return retryRequest(async () => {
    const response = await api.get('/categories/list');
    return response.data;
  });
};

export default api;