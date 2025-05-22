import React, { useEffect, useState } from 'react';
import type { SocketConnectionState } from '../services/socketService';
import socketService from '../services/socketService';

const WebSocketTest: React.FC = () => {
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('uninstantiated');
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Add event listeners
    const handleOpen = () => {
      setConnectionState('open');
      setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] Connection opened`]);
      setError(null);
    };

    const handleClose = () => {
      setConnectionState('closed');
      setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] Connection closed`]);
    };

    const handleError = (data: any) => {
      setError(data?.message || 'Unknown error');
      setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${data?.message || 'Unknown error'}`]);
    };

    const handleMessage = (data: any) => {
      setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] Message: ${JSON.stringify(data)}`]);
    };

    // Register event listeners
    socketService.addEventListener('open', handleOpen);
    socketService.addEventListener('close', handleClose);
    socketService.addEventListener('error', handleError);
    socketService.addEventListener('message', handleMessage);

    // Connect to the WebSocket server
    socketService.connect();

    // Update connection state
    const intervalId = setInterval(() => {
      setConnectionState(socketService.getState());
    }, 1000);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      socketService.removeEventListener('open', handleOpen);
      socketService.removeEventListener('close', handleClose);
      socketService.removeEventListener('error', handleError);
      socketService.removeEventListener('message', handleMessage);
      socketService.disconnect();
    };
  }, []);

  // Function to send a ping message
  const sendPing = () => {
    const success = socketService.sendMessage({ action: 'ping' });
    if (success) {
      setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] Sent ping message`]);
    } else {
      setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] Failed to send ping message`]);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>WebSocket Connection Test</h1>
      
      <div style={{ 
        padding: '10px',
        marginBottom: '20px',
        borderRadius: '4px',
        backgroundColor: connectionState === 'open' ? '#d4edda' : 
                         connectionState === 'connecting' ? '#fff3cd' : 
                         connectionState === 'closed' ? '#f8d7da' : '#e2e3e5',
        color: connectionState === 'open' ? '#155724' : 
               connectionState === 'connecting' ? '#856404' : 
               connectionState === 'closed' ? '#721c24' : '#383d41',
      }}>
        <h3>Connection Status: {connectionState}</h3>
        {error && <p style={{ color: '#721c24' }}>Error: {error}</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={sendPing}
          style={{
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Send Ping
        </button>
      </div>

      <div style={{ 
        border: '1px solid #ddd',
        borderRadius: '4px',
        height: '300px',
        overflowY: 'auto',
        padding: '10px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3>WebSocket Events:</h3>
        {messages.length === 0 ? (
          <p>No events yet...</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {messages.map((msg, index) => (
              <li key={index} style={{ 
                padding: '5px',
                borderBottom: '1px solid #eee',
                fontFamily: 'monospace'
              }}>
                {msg}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default WebSocketTest; 