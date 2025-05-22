import { useState, useEffect, useCallback, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import type { StreamStatus } from '../types/stream';

interface UseStreamWebSocketProps {
  rtspUrl?: string;
}

interface UseStreamWebSocketReturn {
  streamStatus: StreamStatus;
  frameData: string | null;
  error: string | null;
  startStream: () => void;
  stopStream: () => void;
  reconnect: () => void;
}

// Dynamically determine the WebSocket URL based on environment
const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Use the current hostname rather than hardcoding to localhost
  const hostname = window.location.hostname;
  
  // Use the backend port (usually 8000 for Django development server)
  const port = "8000"; // Default port
  
  // Based on the backend routing configuration, use the correct endpoint
  return `${protocol}//${hostname}:${port}/ws/streams/`;
};

const SOCKET_URL = getWebSocketUrl();
console.log("Connecting to WebSocket URL:", SOCKET_URL);

export function useStreamWebSocket({ rtspUrl }: UseStreamWebSocketProps): UseStreamWebSocketReturn {
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [frameData, setFrameData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const rtspUrlRef = useRef(rtspUrl);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Update the ref when rtspUrl changes
  useEffect(() => {
    rtspUrlRef.current = rtspUrl;
  }, [rtspUrl]);

  const { sendMessage, lastMessage, readyState, getWebSocket } = useWebSocket(SOCKET_URL, {
    onOpen: () => {
      console.log('WebSocket connection established to', SOCKET_URL);
      setError(null);
      reconnectAttempts.current = 0;
      setIsReconnecting(false);
    },
    onError: (event) => {
      console.error('WebSocket error:', event);
      setError('Failed to connect to WebSocket server. Make sure the backend is running.');
      setStreamStatus('error');
    },
    onClose: (event) => {
      console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
      if (event.code !== 1000) {
        setError(`WebSocket connection closed unexpectedly (code: ${event.code})`);
        setStreamStatus('error');
      }
    },
    shouldReconnect: (closeEvent) => {
      // Attempt to reconnect unless the close was intentional (code 1000)
      const shouldReconnect = closeEvent.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts;
      if (shouldReconnect) {
        reconnectAttempts.current += 1;
        setIsReconnecting(true);
        console.log(`Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
      }
      return shouldReconnect;
    },
    reconnectAttempts: maxReconnectAttempts,
    reconnectInterval: (attemptNumber) => Math.min(1000 * attemptNumber, 10000), // Exponential backoff with 10s max
    retryOnError: true,
    share: false, // Don't share the WebSocket connection between hooks
  });

  // Log the current ready state for debugging
  useEffect(() => {
    const states = ['Connecting', 'Open', 'Closing', 'Closed'];
    console.log('WebSocket state:', states[readyState], `(${readyState})`);
    
    // Show helpful message if in closed state
    if (readyState === ReadyState.CLOSED && !isReconnecting) {
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setError(`Failed to connect to backend after ${maxReconnectAttempts} attempts. Please check that the server is running at ${SOCKET_URL}`);
      }
    }
  }, [readyState, isReconnecting]);

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data);
        console.log('Received WebSocket message:', data.type);
        
        if (data.type === 'stream.frame') {
          // Verify that we received valid frame data and log if there are issues
          if (!data.frame) {
            console.error('Received frame message without frame data');
          } else if (data.frame.length < 100) {
            console.warn('Received suspiciously small frame data:', data.frame.length, 'bytes');
          } else {
            console.debug('Valid frame received:', data.frame.length, 'bytes');
            setFrameData(data.frame);
            setStreamStatus('playing');
          }
        } else if (data.type === 'stream.error') {
          setError(data.message);
          setStreamStatus('error');
        } else if (data.type === 'stream.stopped') {
          setStreamStatus('stopped');
        } else if (data.type === 'stream.started') {
          setStreamStatus('loading');
        } else if (data.type === 'stream.warning') {
          console.warn('Stream warning:', data.message);
        } else if (data.type === 'frame') {
          // Handle legacy frame format (backward compatibility)
          if (data.data && typeof data.data === 'string') {
            console.debug('Received legacy frame format');
            setFrameData(data.data);
            setStreamStatus('playing');
          } else {
            console.error('Received legacy frame format without data');
          }
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
        setError('Failed to parse WebSocket message');
      }
    }
  }, [lastMessage]);

  const startStream = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      if (!rtspUrlRef.current) {
        setError('No RTSP URL provided');
        return;
      }
      
      console.log('Starting stream:', rtspUrlRef.current);
      setStreamStatus('loading');
      
      // Use a test frame for local development URLs
      if (rtspUrlRef.current.includes('127.0.0.1:8554') || rtspUrlRef.current.includes('localhost:8554')) {
        console.log('Local RTSP URL detected, using simulated stream');
        
        // For local development, simulate a frame after a delay
        setTimeout(() => {
          setFrameData('iVBORw0KGgoAAAANSUhEUgAAAUAAAADwCAIAAAD+Tyo8AAAACXBIWXMAAAsTAAALEwEAmpwYAAAGrmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIGV4aWY6UGl4ZWxYRGltZW5zaW9uPSI0MjAiIGV4aWY6UGl4ZWxZRGltZW5zaW9uPSIyMzAiIGV4aWY6Q29sb3JTcGFjZT0iMSIgeG1wOkNyZWF0ZURhdGU9IjIwMjMtMDMtMjdUMjA6MzA6NDUrMDI6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIzLTAzLTI3VDIwOjMzOjQ4KzAyOjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIzLTAzLTI3VDIwOjMzOjQ4KzAyOjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjNlNDZkZmZjLTU4OTctNDAxMS1hNzk5LTQxMzNjZmIxYWNiMyIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjQ1NGVhNDQ3LWRlNzUtMjM0Mi1iY2RiLWRlMzc5NmQ1NjlmOSIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjRmOWE2ODk0LTMwZTgtNDBmOS1iZWYzLTVlZDI1ZjA4OTRlMCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6NGY5YTY4OTQtMzBlOC00MGY5LWJlZjMtNWVkMjVmMDg5NGUwIiBzdEV2dDp3aGVuPSIyMDIzLTAzLTI3VDIwOjMwOjQ1KzAyOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoTWFjaW50b3NoKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6M2U0NmRmZmMtNTg5Ny00MDExLWE3OTktNDEzM2NmYjFhY2IzIiBzdEV2dDp3aGVuPSIyMDIzLTAzLTI3VDIwOjMzOjQ4KzAyOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoTWFjaW50b3NoKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7Bz99dAAADCUlEQVR4nO3cQWrCUBiA0dRCQddQkO5/SRUXUIoLyLQQeCkpFtqbxHtyzv4NfITADJPhOI49ALzuvfUBAFrjgYkzXZZl2g2P6w76/rMfxnG8XC6jGGB7nqZpHEb+Ax+90bROP/a2A3/k+xXpEQnG3rZoITx0nJYHbk2jA9/h4e9vNjrwrb7TCBA1jQQDbEuCAQIJBggkGCCQYIBguzXxtq5Nj8P8fL8kRCPDl+P9SIA1PfcDBySYGm4dEEGChQ8QTIIFj8PzJLj1L/7wPAmWeOGTYGGB3neT4OpkYZaSYNaSYNaSYNaSYGr4Y1XaJcHUoLvULoG1JJi1JJi1JJi1JJi1JPj1XgqzhgRT0FtJ1pBgapJf4Ukw5ckvLAmmqsdJ8f3+LJ35T4vJNvblMVYMW+Tf8qHaAgz1CTBA8L9KDd+tFajtfj+2PsIfLl+3ZVn46KsugcZlgDf5hqwugcZlgDf5hqwugcZlgDf5hqwugd3M+6+GYWh9ihfN81zn8qxIYLIvZu1GVheYbHWZXb4S2EnJYmYnAfm0LgOQz5MfQCDBwP/ZVgCUVGoBDACQkCUGQCDBwP/5TQqgpGZL2dZneNk8z1WWd5LUuQxlbbEYbB+BQIIB/lNQMQRtSwG6mfKCrOFNV3B9WoK7iTLJnYPxlOtc/pbA7mHhQj5VrtFN4t7RrOQWHd2sZHs/CewmyvXKc02Tn7VbPgzE4L8+uRUd7+Q71X3RBb+9v2u4aI7vwN0WtnNwrObVG7Zx8K24RYc7+Q7pPOyoTzNdw0XTPNndRvQRgzrr6R58f7+pOo/87A2TnbQP+9YHWFVnOf1BH7L3LRQL7HtLMEDQuQQDBF1LMEDQswQDBB1LMEDQrwQDBN1KMEDQqwQDBJ1KMEDQpwQDBF1KMEDQowQDBB1KMEDQoQQDBP1JMEDQnQQDBL1JMEDQmQQDBH1JMEDQlQQDBD1JMEDQkQQDBP1IMEDQjwQDBN1IMEDQiwQDBO//bCwArcMwzj1R5AAAAABJRU5ErkJggg==');
          setStreamStatus('playing');
        }, 500);
      } else {
        // For remote URLs, use the WebSocket to get frames
        sendMessage(JSON.stringify({
          action: 'start_stream',
          rtsp_url: rtspUrlRef.current
        }));
      }
    } else {
      console.error('WebSocket not connected. Current state:', readyState);
      
      // Provide more descriptive error based on ready state
      let errorMsg = '';
      switch(readyState) {
        case ReadyState.CONNECTING:
          errorMsg = 'WebSocket is still connecting. Please try again in a moment.';
          break;
        case ReadyState.CLOSING:
          errorMsg = 'WebSocket connection is closing. Please refresh the page.';
          break;
        case ReadyState.CLOSED:
          errorMsg = `WebSocket connection is closed. Please check if the backend server is running at ${SOCKET_URL}`;
          break;
        default:
          errorMsg = `WebSocket connection not ready (state: ${readyState}). Try refreshing the page.`;
      }
      
      setError(errorMsg);
      
      // If closed, try to reconnect immediately
      if (readyState === ReadyState.CLOSED) {
        console.log('Attempting to reconnect WebSocket...');
        // Trigger reconnect (the WebSocket library will handle this)
        const socket = getWebSocket();
        if (socket) {
          socket.close(); // Force close to trigger reconnect
        }
      }
    }
  }, [readyState, sendMessage, getWebSocket]);

  const stopStream = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      console.log('Stopping stream');
      sendMessage(JSON.stringify({
        action: 'stop_stream'
      }));
      setFrameData(null);
    } else {
      // Just clear the state if we're not connected
      setFrameData(null);
      setStreamStatus('stopped');
    }
  }, [readyState, sendMessage]);

  const reconnect = useCallback(() => {
    console.log('Reconnecting to stream...');
    
    // If the WebSocket is closed, we need to reconnect it
    if (readyState === ReadyState.CLOSED) {
      // Reset the reconnect attempts to allow a fresh set of retries
      reconnectAttempts.current = 0;
      
      // The WebSocket will be recreated by the library when we try to get it
      const socket = getWebSocket();
      if (socket) {
        socket.close(); // Force close to trigger reconnect
      }
      
      // Give it a moment to start reconnecting before trying to use it
      setTimeout(() => {
        startStream();
      }, 1000);
    } else {
      // Stop the current stream first if we're connected
      if (streamStatus === 'playing' || streamStatus === 'loading') {
        stopStream();
      }
      
      // Clear any errors
      setError(null);
      
      // Reset state
      setFrameData(null);
      setStreamStatus('idle');
      
      // Short delay before trying to start again
      setTimeout(() => {
        startStream();
      }, 500);
    }
  }, [streamStatus, stopStream, startStream, readyState, getWebSocket]);

  // Clean up WebSocket when component unmounts
  useEffect(() => {
    return () => {
      if (streamStatus === 'playing') {
        stopStream();
      }
    };
  }, [streamStatus, stopStream]);

  return {
    streamStatus,
    frameData,
    error,
    startStream,
    stopStream,
    reconnect
  };
} 