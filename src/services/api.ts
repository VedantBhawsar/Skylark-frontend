import axios from 'axios';
import type { Stream, StreamResponse, SingleStreamResponse } from '../types/stream';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchStreams = async (): Promise<Stream[]> => {
  try {
    const response = await api.get<StreamResponse>('/streams/');
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching streams:', error);
    throw error;
  }
};

export const fetchDefaultStreams = async (): Promise<Stream[]> => {
  try {
    const response = await api.get<Stream[]>('/streams/default/');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching default streams:', error);
    throw error;
  }
};

export const fetchStreamById = async (id: string | number): Promise<Stream> => {
  try {
    const response = await api.get<SingleStreamResponse>(`/streams/${id}/`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching stream with id ${id}:`, error);
    throw error;
  }
};

export const createStream = async (stream: Omit<Stream, 'id' | 'created_at' | 'updated_at'>): Promise<Stream> => {
  try {
    const response = await api.post<SingleStreamResponse>('/streams/', stream);
    return response.data.data;
  } catch (error) {
    console.error('Error creating stream:', error);
    throw error;
  }
};

export const updateStream = async (id: string | number, stream: Partial<Stream>): Promise<Stream> => {
  try {
    const response = await api.put<SingleStreamResponse>(`/streams/${id}/`, stream);
    return response.data.data;
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