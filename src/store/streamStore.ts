import { create } from 'zustand';
import type { Stream } from '../types/stream';
import { fetchStreams, fetchDefaultStreams, createStream, updateStream, deleteStream } from '../services/api';

interface StreamState {
  streams: Stream[];
  isLoading: boolean;
  error: string | null;
  selectedStreamId: string | number | null;
  fetchStreams: () => Promise<void>;
  fetchDefaultStreams: () => Promise<void>;
  addStream: (stream: Omit<Stream, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateStream: (id: string | number, stream: Partial<Stream>) => Promise<void>;
  removeStream: (id: string | number) => Promise<void>;
  selectStream: (id: string | number | null) => void;
  getSelectedStream: () => Stream | undefined;
  setStreamState: (id: string | number, state: { status?: string; error?: string; wsUrl?: string; rtspUrl?: string }) => void;
}

export const useStreamStore = create<StreamState>((set, get) => ({
  streams: [],
  isLoading: false,
  error: null,
  selectedStreamId: null,

  fetchStreams: async () => {
    set({ isLoading: true, error: null });
    try {
      const streams = await fetchStreams();
      set({ streams, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch streams', 
        isLoading: false 
      });
    }
  },

  fetchDefaultStreams: async () => {
    set({ isLoading: true, error: null });
    try {
      const streams = await fetchDefaultStreams();
      set({ streams, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch default streams', 
        isLoading: false 
      });
    }
  },

  addStream: async (streamData) => {
    set({ isLoading: true, error: null });
    try {
      const newStream = await createStream(streamData);
      set(state => ({ 
        streams: [...state.streams, newStream],
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add stream', 
        isLoading: false 
      });
    }
  },

  updateStream: async (id, streamData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedStream = await updateStream(id, streamData);
      set(state => ({ 
        streams: state.streams.map(stream => 
          stream.id === id ? { ...stream, ...updatedStream } : stream
        ),
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : `Failed to update stream ${id}`, 
        isLoading: false 
      });
    }
  },

  removeStream: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteStream(id);
      set(state => ({ 
        streams: state.streams.filter(stream => stream.id !== id),
        selectedStreamId: state.selectedStreamId === id ? null : state.selectedStreamId,
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : `Failed to delete stream ${id}`, 
        isLoading: false 
      });
    }
  },

  selectStream: (id) => {
    set({ selectedStreamId: id });
  },

  getSelectedStream: () => {
    const { streams, selectedStreamId } = get();
    return streams.find(stream => stream.id === selectedStreamId);
  },
  
  setStreamState: (id, state) => {
    set(store => ({
      streams: store.streams.map(stream => 
        stream.id === id ? { ...stream, ...state } : stream
      )
    }));
  }
})); 