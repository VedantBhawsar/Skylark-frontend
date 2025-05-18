import { create } from 'zustand';
import type { Stream, StreamState } from '../types/stream';
import * as api from '../services/api';

interface StreamStore {
  streams: Stream[];
  activeStream: Stream | null;
  streamStates: Record<string, StreamState>;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchStreams: () => Promise<void>;
  fetchDefaultStreams: () => Promise<void>;
  setActiveStream: (stream: Stream | null) => void;
  createStream: (stream: Omit<Stream, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateStream: (id: string | number, stream: Partial<Stream>) => Promise<void>;
  deleteStream: (id: string | number) => Promise<void>;
  setStreamState: (streamId: string | number, state: Partial<StreamState>) => void;
}

export const useStreamStore = create<StreamStore>((set, get) => ({
  streams: [],
  activeStream: null,
  streamStates: {},
  loading: false,
  error: null,
  
  fetchStreams: async () => {
    set({ loading: true, error: null });
    try {
      const streams = await api.fetchStreams();
      set({ streams, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch streams', loading: false });
    }
  },
  
  fetchDefaultStreams: async () => {
    set({ loading: true, error: null });
    try {
      const streams = await api.fetchDefaultStreams();
      set({ streams, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch default streams', loading: false });
    }
  },
  
  setActiveStream: (stream) => {
    set({ activeStream: stream });
  },
  
  createStream: async (stream) => {
    set({ loading: true, error: null });
    try {
      const newStream = await api.createStream(stream);
      set((state) => ({ 
        streams: [...state.streams, newStream],
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to create stream', loading: false });
    }
  },
  
  updateStream: async (id, stream) => {
    set({ loading: true, error: null });
    try {
      const updatedStream = await api.updateStream(id, stream);
      set((state) => ({
        streams: state.streams.map((s) => (s.id === id ? updatedStream : s)),
        activeStream: state.activeStream?.id === id ? updatedStream : state.activeStream,
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to update stream', loading: false });
    }
  },
  
  deleteStream: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.deleteStream(id);
      set((state) => ({
        streams: state.streams.filter((s) => s.id !== id),
        activeStream: state.activeStream?.id === id ? null : state.activeStream,
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete stream', loading: false });
    }
  },
  
  setStreamState: (streamId, state) => {
    set((currentState) => ({
      streamStates: {
        ...currentState.streamStates,
        [streamId]: {
          ...currentState.streamStates[streamId] || { status: 'idle' },
          ...state,
        },
      },
    }));
  },
})); 