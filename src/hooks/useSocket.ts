import { useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socketService';
import type { SocketEventType } from '../services/socketService';
import { ReadyState } from 'react-use-websocket';
import type { StreamStatus } from '../types/stream';

interface UseSocketProps {
  rtspUrl?: string;
  autoConnect?: boolean;
}

interface UseSocketReturn {
  streamStatus: StreamStatus;
  frameData: string | null;
  error: string | null;
  readyState: ReadyState;
  startStream: (url?: string) => void;
  stopStream: () => void;
  reconnect: () => void;
  isConnected: boolean;
}

export const useSocket = ({ rtspUrl, autoConnect = true }: UseSocketProps = {}): UseSocketReturn => {
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [frameData, setFrameData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentRtspUrl, setCurrentRtspUrl] = useState<string | undefined>(rtspUrl);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const connectionAttempts = useRef(0);
  const maxConnectionAttempts = 3;

  // Connect to WebSocket when the hook is first used
  useEffect(() => {
    if (autoConnect) {
      // Try to connect with a small delay to allow the app to initialize fully
      const timer = setTimeout(() => {
        console.log('Auto-connecting to WebSocket from useSocket hook');
        socketService.connect();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [autoConnect]);

  // Setup event listeners for WebSocket events
  useEffect(() => {
    const handleOpen = () => {
      console.log('WebSocket connected successfully');
      setError(null);
      setIsConnected(true);
      connectionAttempts.current = 0;
    };

    const handleClose = (event: any) => {
      console.log(`WebSocket closed with code: ${event?.code}, reason: ${event?.reason || 'unknown'}`);
      setIsConnected(false);
      
      if (streamStatus !== 'idle' && streamStatus !== 'stopped') {
        setStreamStatus('error');
        // Only set error if we don't already have one
        if (!error) {
          setError('Connection to server closed unexpectedly');
        }
      }
    };

    const handleError = (event: any) => {
      console.error('WebSocket error:', event);
      const errorMessage = event?.message || 'WebSocket connection error';
      setError(errorMessage);
      setStreamStatus('error');
      setIsConnected(false);
    };

    const handleFrame = (data: any) => {
      setFrameData(data.frame);
      setStreamStatus('playing');
    };

    const handleStreamError = (data: any) => {
      const errorMsg = data.message || 'Stream error';
      console.error('Stream error:', errorMsg);
      setError(errorMsg);
      setStreamStatus('error');
    };

    const handleStreamStopped = () => {
      setStreamStatus('stopped');
    };

    const handleStreamStarted = (data: any) => {
      console.log('Stream started event received:', data);
      setStreamStatus('playing');
      setError(null);
      
      // If dimensions are available, we could store them for UI use
      if (data.width && data.height) {
        console.log(`Stream dimensions: ${data.width}x${data.height}, FPS: ${data.fps || 'unknown'}`);
      }
    };

    const handleStreamWarning = (data: any) => {
      console.warn('Stream warning:', data.message);
    };

    const handleStreamStarting = () => {
      setStreamStatus('loading');
      setError(null);
    };

    const handleAvailableStreams = (data: any) => {
      console.log('Available streams:', data.streams);
      // You can store available streams in state if needed
    };

    // Register event listeners
    socketService.addEventListener('open', handleOpen);
    socketService.addEventListener('close', handleClose);
    socketService.addEventListener('error', handleError);
    socketService.addEventListener('stream.frame', handleFrame);
    socketService.addEventListener('stream.error', handleStreamError);
    socketService.addEventListener('stream.stopped', handleStreamStopped);
    socketService.addEventListener('stream.started', handleStreamStarted);
    socketService.addEventListener('stream.starting', handleStreamStarting);
    socketService.addEventListener('stream.warning', handleStreamWarning);
    socketService.addEventListener('available_streams', handleAvailableStreams);

    // Check if already connected
    if (socketService.getReadyState() === ReadyState.OPEN) {
      setIsConnected(true);
    }

    // Cleanup event listeners
    return () => {
      socketService.removeEventListener('open', handleOpen);
      socketService.removeEventListener('close', handleClose);
      socketService.removeEventListener('error', handleError);
      socketService.removeEventListener('stream.frame', handleFrame);
      socketService.removeEventListener('stream.error', handleStreamError);
      socketService.removeEventListener('stream.stopped', handleStreamStopped);
      socketService.removeEventListener('stream.started', handleStreamStarted);
      socketService.removeEventListener('stream.starting', handleStreamStarting);
      socketService.removeEventListener('stream.warning', handleStreamWarning);
      socketService.removeEventListener('available_streams', handleAvailableStreams);
    };
  }, [streamStatus, error]);

  // Start streaming function
  const startStream = useCallback((url?: string) => {
    const streamUrl = url || currentRtspUrl;
    
    if (!streamUrl) {
      setError('No RTSP URL provided');
      return;
    }

    setCurrentRtspUrl(streamUrl);
    connectionAttempts.current += 1;
    
    if (socketService.getReadyState() !== ReadyState.OPEN) {
      console.log('Socket not connected, attempting to connect before starting stream');
      socketService.connect();
      
      // Wait for connection to establish before starting stream with exponential backoff
      const checkAndStartStream = (attempt = 0) => {
        if (socketService.getReadyState() === ReadyState.OPEN) {
          console.log('Socket connected, starting stream');
          socketService.startStream(streamUrl);
          setStreamStatus('loading');
          setError(null);
        } else if (attempt < maxConnectionAttempts) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(1.5, attempt), 8000);
          console.log(`Connection attempt ${attempt + 1}/${maxConnectionAttempts}, retrying in ${delay/1000}s...`);
          setTimeout(() => checkAndStartStream(attempt + 1), delay);
          connectionAttempts.current += 1;
        } else {
          console.error('Failed to connect after multiple attempts');
          setError('Failed to connect to server after multiple attempts. Please check your network connection and try again.');
          setStreamStatus('error');
        }
      };
      
      setTimeout(() => checkAndStartStream(), 100);
    } else {
      console.log('Socket already connected, starting stream directly');
      socketService.startStream(streamUrl);
      setStreamStatus('loading');
      setError(null);
    }
  }, [currentRtspUrl, maxConnectionAttempts]);

  // Stop streaming function
  const stopStream = useCallback(() => {
    if (socketService.getReadyState() === ReadyState.OPEN) {
      socketService.stopStream();
    }
    
    setFrameData(null);
    setStreamStatus('stopped');
  }, []);

  // Reconnect function with progressive backoff
  const reconnect = useCallback(() => {
    console.log('Attempting to reconnect socket and stream');
    
    // Stop any current stream
    if (streamStatus === 'playing' || streamStatus === 'loading') {
      stopStream();
    }
    
    // Clear errors
    setError(null);
    
    // Reset connection attempts
    connectionAttempts.current = 0;
    
    // Force socket reconnection
    socketService.reconnect();
    
    // Reset state
    setFrameData(null);
    setStreamStatus('idle');
    
    // If we have a URL, try to start the stream again after a delay
    if (currentRtspUrl) {
      const reconnectDelay = 2000;
      console.log(`Will attempt to restart stream in ${reconnectDelay/1000}s`);
      
      setTimeout(() => {
        console.log('Restarting stream after reconnect');
        startStream(currentRtspUrl);
      }, reconnectDelay);
    }
  }, [currentRtspUrl, startStream, stopStream, streamStatus]);

  return {
    streamStatus,
    frameData,
    error,
    readyState: socketService.getReadyState(),
    startStream,
    stopStream,
    reconnect,
    isConnected
  };
}; 