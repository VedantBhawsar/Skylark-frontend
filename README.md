# RTSP Stream Viewer - Frontend

The frontend component for the RTSP Stream Viewer application, built with React, TypeScript, and Tailwind CSS. This client application provides a modern, responsive interface for viewing and managing RTSP streams.

## Features

- **Multiple Stream Support**: View multiple RTSP streams simultaneously in a responsive grid layout
- **Stream Management**: Add, edit, and delete stream configurations
- **Playback Controls**: Play, pause, and fullscreen controls for each stream
- **Adaptive Interface**: Responsive design that works on desktop and mobile devices
- **Stream Health Monitoring**: FPS counter and connection status indicators
- **Dark/Light Mode**: Theme support with system preference detection
- **Auto-reconnect**: Automatically reconnect to streams on errors
- **Stream Information**: Detailed stream info and settings panels

## Requirements

- Node.js 16.x or higher
- npm 8.x or higher
- Backend server running (see backend README)

## Installation

1. Install dependencies:

```bash
npm install
```

2. Configure the backend URL:

By default, the frontend connects to the backend at `http://localhost:8000`. If your backend is running on a different URL, update the `VITE_API_URL` and `VITE_WS_URL` variables in the `.env` file:

```
VITE_API_URL=http://your-backend-url:8000
VITE_WS_URL=ws://your-backend-url:8000
```

## Running the Development Server

```bash
npm run dev
```

This will start the development server on `http://localhost:5173`.

## Building for Production

```bash
npm run build
```

This will create a production-ready build in the `dist` directory.

## Project Structure

- `src/`: Main source directory
  - `components/`: Reusable UI components
    - `StreamPlayer.tsx`: Video player component for RTSP streams
    - `StreamForm.tsx`: Form for adding/editing streams
    - `StreamCard.tsx`: Card component for displaying stream info
    - `Navbar.tsx`: Navigation component
  - `hooks/`: Custom React hooks
    - `useStreamWebSocket.ts`: WebSocket hook for stream handling
  - `pages/`: Application pages
    - `HomePage.tsx`: Main page with stream grid
  - `store/`: State management
    - `streamStore.ts`: Stream state management
  - `types/`: TypeScript type definitions
  - `utils/`: Utility functions
  - `services/`: API service functions

## Connecting to RTSP Streams

This application can connect to any valid RTSP stream by entering the URL in the add stream form. For testing, you can use:

1. Open-source test streams available online
2. Local RTSP simulators like rtsp-simple-server
3. IP cameras that provide RTSP streams
4. Media servers like VLC that can re-stream content via RTSP

## For Developers

### Adding New Features

1. **New Components**: Add new components in the `components` directory
2. **State Management**: Extend the stream store for additional state needs
3. **API Integration**: Add new API service functions in the `services` directory

### WebSocket Communication

The application uses WebSockets to receive video frames from the backend. The implementation is in the `useStreamWebSocket` hook.

### TypeScript Types

All types are defined in the `types` directory. Update these when adding new features or models.

## Troubleshooting

### Stream Not Loading

1. Verify that the RTSP URL is correct and accessible from the backend server
2. Check the browser console for WebSocket connection errors
3. Ensure the backend server is running and accessible

### Performance Issues

1. Limit the number of simultaneous streams to avoid overloading the browser
2. Check network bandwidth, as multiple RTSP streams require significant bandwidth
3. Close other browser tabs or applications that might be using system resources

## License

This project is licensed under the MIT License.
