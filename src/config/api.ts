const API_BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
}; 