export interface Stream {
  id?: string | number;
  name: string;
  url: string;
  description: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  isLocal?: boolean;
}

export interface StreamResponse {
  success: boolean;
  data: Stream[];
}

export interface SingleStreamResponse {
  success: boolean;
  data: Stream;
}

export type StreamStatus = 'idle' | 'loading' | 'playing' | 'error' | 'stopped';

export interface StreamState {
  status: StreamStatus;
  error?: string;
  wsUrl?: string;
  rtspUrl?: string;
} 