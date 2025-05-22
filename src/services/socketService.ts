// WebSocketService.ts

export type SocketConnectionState = 'connecting' | 'open' | 'closing' | 'closed' | 'uninstantiated';
export type SocketEventType =
  | 'open'
  | 'close'
  | 'error'
  | 'message'
  | 'stream.frame'
  | 'stream.error'
  | 'stream.stopped'
  | 'stream.started'
  | 'stream.starting'
  | 'stream.warning'
  | 'available_streams';

type EventListener = (data?: any) => void;

const getWebSocketUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname || 'localhost';
  const port = '8000';
  return `${protocol}//${hostname}:${port}/ws/streams/`;
};

class WebSocketService {
  private socket: WebSocket | null = null;
  private readonly url: string = getWebSocketUrl();
  private readonly listeners: Map<SocketEventType, Set<EventListener>> = new Map();
  private reconnectAttempts = 0;
  private readonly maxReconnects = 10;
  private reconnectTimeout: number | null = null;
  private state: SocketConnectionState = 'uninstantiated';
  private isManualClose = false;
  private pingInterval: number | null = null;
  private lastMessageTime: number = 0;
  private healthCheckInterval: number | null = null;

  constructor() {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    window.addEventListener('beforeunload', this.cleanup);
    console.log('WebSocketService initialized with URL:', this.url);
    this.startHealthCheck();
  }

  private onOnline = () => {
    console.log('Back online, reconnecting...');
    this.reconnectAttempts = 0;
    this.connect();
  };

  private onOffline = () => {
    console.warn('Offline detected. WebSocket may not work.');
    this.dispatch('error', { message: 'Network offline' });
  };

  private startHealthCheck() {
    this.healthCheckInterval = window.setInterval(() => {
      // If no message received for more than 1 minute, consider connection stale
      const now = Date.now();
      const socketIsOpen = this.socket && this.socket.readyState === WebSocket.OPEN;
      
      if (socketIsOpen && (now - this.lastMessageTime > 60000)) {
        console.warn('No WebSocket messages received for 60 seconds, reconnecting...');
        this.reconnect();
      }
    }, 30000);
  }

  private cleanup = () => {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    window.removeEventListener('beforeunload', this.cleanup);
    
    this.disconnect();
  };

  connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected, skipping connection');
      return;
    }
    
    if (!navigator.onLine) {
      console.error('Offline, cannot connect to WebSocket');
      this.dispatch('error', { message: 'Offline, cannot connect' });
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      console.log(`Connecting to WebSocket at ${this.url}`);
      this.state = 'connecting';
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log('WebSocket connection established successfully');
        this.state = 'open';
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        this.dispatch('open');
        this.startPing();
      };

      this.socket.onclose = (event) => {
        this.state = 'closed';
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason || 'unknown'}`);
        this.dispatch('close', event);
        this.stopPing();
        
        if (!this.isManualClose) {
          console.log(`WebSocket closed unexpectedly, scheduling reconnect...`);
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        this.dispatch('error', { message: 'WebSocket connection error' });
      };

      this.socket.onmessage = (event) => {
        this.lastMessageTime = Date.now();
        try {
          const data = JSON.parse(event.data);
          
          // Check for ping/pong messages
          if (data.type === 'pong') {
            console.debug('Received pong from server');
            return;  // Don't propagate pings/pongs to listeners
          }
          
          this.dispatch('message', data);
          if (data.type) this.dispatch(data.type as SocketEventType, data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err, event.data);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.state = 'closed';
      this.dispatch('error', { message: 'Failed to connect' });
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.stopPing();
    
    if (this.socket) {
      this.isManualClose = true;
      this.state = 'closing';
      this.socket.close();
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    }
  }

  reconnect(): void {
    console.log('Forcing WebSocket reconnection');
    
    // Clean up existing socket
    if (this.socket) {
      const currentState = this.socket.readyState;
      
      if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      
      this.socket = null;
    }
    
    this.stopPing();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    
    // Reset reconnect attempts to ensure we retry with minimum delay
    this.reconnectAttempts = 0;
    this.isManualClose = false;
    
    // Connect after a small delay
    setTimeout(() => this.connect(), 100);
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.send({ action: 'ping' });
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    
    // Exponential backoff with max of 30 seconds
    const delay = Math.min(3000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnects} in ${delay}ms`);
    
    if (this.reconnectAttempts <= this.maxReconnects) {
      this.reconnectTimeout = window.setTimeout(() => this.connect(), delay);
    } else {
      console.error(`Maximum reconnection attempts (${this.maxReconnects}) reached.`);
      this.dispatch('error', { message: 'Failed to reconnect after multiple attempts' });
    }
  }

  send(msg: string | object): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    try {
      this.socket.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
      return true;
    } catch (e) {
      console.error('Send failed:', e);
      return false;
    }
  }

  startStream(rtspUrl: string): boolean {
    console.log('Requesting to start stream:', rtspUrl);
    return this.send({ 
      action: 'start_stream', 
      rtsp_url: rtspUrl 
    });
  }

  stopStream(): boolean {
    return this.send({ action: 'stop_stream' });
  }

  on(type: SocketEventType, cb: EventListener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }

  off(type: SocketEventType, cb: EventListener): void {
    this.listeners.get(type)?.delete(cb);
  }

  private dispatch(type: SocketEventType, payload?: any): void {
    this.listeners.get(type)?.forEach((cb) => cb(payload));
  }

  getState(): SocketConnectionState {
    return this.state;
  }

  // Add these methods to fix linter errors in WebSocketTest.tsx
  addEventListener(type: SocketEventType, cb: EventListener): void {
    this.on(type, cb);
  }

  removeEventListener(type: SocketEventType, cb: EventListener): void {
    this.off(type, cb);
  }

  sendMessage(msg: string | object): boolean {
    return this.send(msg);
  }

  getReadyState(): number {
    if (!this.socket) return WebSocket.CLOSED;
    return this.socket.readyState;
  }

  // Add method to get available streams from backend
  getAvailableStreams(): boolean {
    return this.send({
      action: 'get_available_streams'
    });
  }
}

const socketService = new WebSocketService();

export default socketService;