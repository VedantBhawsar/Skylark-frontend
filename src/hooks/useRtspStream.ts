import { useState, useEffect, useCallback, useRef } from 'react';
import useWebSocket from 'react-use-websocket';
import { useStreamStore } from '../store/streamStore';
import type { StreamStatus } from '../types/stream';

interface RTSPStreamOptions {
  autoConnect?: boolean;
}

export const useRtspStream = (streamId: string | number, options: RTSPStreamOptions = {}) => {
  const { autoConnect = true } = options;
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const streamUrlRef = useRef<string | null>(null);
  
  const socketUrl = `ws://localhost:8000/ws/streams/`;
  const { setStreamState } = useStreamStore();
  
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    onOpen: () => console.log('WebSocket connection established'),
    onError: (event) => {
      console.error('WebSocket error:', event);
      setError('Failed to connect to WebSocket server');
      setStatus('error');
      setStreamState(streamId, { status: 'error', error: 'Failed to connect to WebSocket server' });
    },
    onClose: () => {
      console.log('WebSocket connection closed');
      if (status === 'playing') {
        setStatus('stopped');
        setStreamState(streamId, { status: 'stopped' });
      }
    },
    share: true,
    shouldReconnect: () => true,
  });
  
  const startStream = useCallback((rtspUrl: string) => {
    if (readyState === WebSocket.OPEN) {
      streamUrlRef.current = rtspUrl;
      setStatus('loading');
      setStreamState(streamId, { status: 'loading' });
      
      sendMessage(JSON.stringify({
        action: 'start_stream',
        rtsp_url: rtspUrl,
      }));
    } else {
      setError('WebSocket is not connected');
      setStatus('error');
      setStreamState(streamId, { status: 'error', error: 'WebSocket is not connected' });
    }
  }, [readyState, sendMessage, streamId, setStreamState]);
  
  const stopStream = useCallback(() => {
    if (readyState === WebSocket.OPEN && status === 'playing') {
      sendMessage(JSON.stringify({
        action: 'stop_stream'
      }));
      
      setStatus('stopped');
      setStreamState(streamId, { status: 'stopped' });
    }
  }, [readyState, sendMessage, status, streamId, setStreamState]);
  
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        switch (data.type) {
          case 'stream.started':
            setWsUrl(data.stream_url);
            setStatus('playing');
            setStreamState(streamId, {
              status: 'playing',
              wsUrl: data.stream_url,
              rtspUrl: streamUrlRef.current || undefined
            });
            break;
            
          case 'stream.stopped':
            setStatus('stopped');
            setStreamState(streamId, { status: 'stopped' });
            break;
            
          case 'stream.error':
            setError(data.message);
            setStatus('error');
            setStreamState(streamId, { status: 'error', error: data.message });
            break;
            
          case 'stream.frame':
            setStatus('playing');
            setStreamState(streamId, { 
              status: 'playing',
              rtspUrl: streamUrlRef.current || undefined
            });
            break;
            
          default:
            console.log('Received WebSocket message:', data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage, streamId, setStreamState]);
  
  return {
    status,
    error,
    wsUrl,
    startStream,
    stopStream,
    isConnected: readyState === WebSocket.OPEN,
  };
}; 