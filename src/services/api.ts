import axios from 'axios';
import type { Stream } from '../types/stream';

// Dynamically determine the API URL based on the current hostname
const getApiUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:8000/api`;
};

const API_URL = getApiUrl();
console.log("Using API URL:", API_URL);

// Function to get the CSRF token from cookies
function getCsrfToken(): string | null {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue || null;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor to include CSRF token in headers
api.interceptors.request.use(config => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Get CSRF token when module loads
export const initializeCSRF = async (): Promise<void> => {
  try {
    // Make a GET request to get the CSRF cookie
    await axios.get(`${API_URL}/streams/`, { withCredentials: true });
    console.log('CSRF token initialized');
  } catch (error) {
    console.error('Failed to initialize CSRF token:', error);
  }
};

// Initialize CSRF token
initializeCSRF();

export const fetchStreams = async (): Promise<Stream[]> => {
  try {
    const response = await api.get<Stream[]>('/streams/');
    const data = response.data as Stream[];
    return data.concat([{
      id: 'local',
      name: 'Local Stream',
      url: 'rtsp://127.0.0.1:8554/file',
      description: 'Local test stream',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
  } catch (error) {
    console.error('Error fetching streams:', error);
    throw error;
  }
};

export const fetchDefaultStreams = async (): Promise<Stream[]> => {
  try {
    const response = await api.get<Stream[]>('/streams/default/');
    return response.data;
  } catch (error) {
    console.error('Error fetching default streams:', error);
    throw error;
  }
};

export const fetchStreamById = async (id: string | number): Promise<Stream> => {
  try {
    const response = await api.get<Stream>(`/streams/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching stream with id ${id}:`, error);
    throw error;
  }
};

export const createStream = async (stream: Omit<Stream, 'id' | 'created_at' | 'updated_at'>): Promise<Stream> => {
  try {
    const response = await api.post<Stream>('/streams/', stream);
    return response.data;
  } catch (error) {
    console.error('Error creating stream:', error);
    throw error;
  }
};

export const updateStream = async (id: string | number, stream: Partial<Stream>): Promise<Stream> => {
  try {
    const response = await api.put<Stream>(`/streams/${id}/`, stream);
    return response.data;
  } catch (error) {
    console.error(`Error updating stream with id ${id}:`, error);
    throw error;
  }
};

export const deleteStream = async (id: string | number): Promise<void> => {
  try {
    await api.delete(`/streams/${id}/`);
  } catch (error) {
    console.error(`Error deleting stream with id ${id}:`, error);
    throw error;
  }
}; 