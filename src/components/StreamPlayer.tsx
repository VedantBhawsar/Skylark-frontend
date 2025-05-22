import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import type { Stream } from '../types/stream';
import { VideoPlayer } from './VideoPlayer';
// Lucide React Icons
import { 
  Play, 
  Pause, 
  Maximize, 
  Minimize, 
  X, 
  RotateCcw,
  Settings,
  Info
} from 'lucide-react';

interface StreamPlayerProps {
  stream: Stream;
  onPlayStatusChange?: (isPlaying: boolean) => void;
}

export function StreamPlayer({ stream, onPlayStatusChange }: StreamPlayerProps) {
  const { 
    streamStatus, 
    frameData, 
    error, 
    startStream, 
    stopStream, 
    reconnect 
  } = useSocket({
    rtspUrl: stream.url,
    autoConnect: true
  });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [timeVisible, setTimeVisible] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [lastErrorTime, setLastErrorTime] = useState<number | null>(null);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  
  const playerRef = useRef<HTMLDivElement>(null);
  const frameCountRef = useRef(0);
  const framesReceivedRef = useRef(0);
  const fpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [fps, setFps] = useState(0);
  
  // Auto-start stream when component mounts or stream URL changes
  useEffect(() => {
    if (stream && stream.url) {
      console.log('Auto-starting stream:', stream.url);
      startStream();
    }
    
    return () => {
      stopStream();
    };
  }, [stream.url, startStream, stopStream]);
  
  // Start FPS counter
  useEffect(() => {
    // Set up FPS counter
    fpsTimerRef.current = setInterval(() => {
      setFps(framesReceivedRef.current);
      framesReceivedRef.current = 0;
    }, 1000);
    
    return () => {
      if (fpsTimerRef.current) {
        clearInterval(fpsTimerRef.current);
      }
    };
  }, []);
  
  // Count frames as they arrive and debug info
  useEffect(() => {
    if (frameData) {
      frameCountRef.current += 1;
      framesReceivedRef.current += 1;
      
      // Log every 10th frame for debugging
      if (frameCountRef.current % 10 === 0) {
        console.debug(`Received frame #${frameCountRef.current}`, {
          dataLength: frameData.length,
          fps: fps,
          validBase64: frameData ? /^[A-Za-z0-9+/=]+$/.test(frameData) : false
        });
      }

      // Verify frame data quality - log warnings for potential issues
      if (frameData.length < 1000 && frameCountRef.current < 5) {
        console.warn('Received small frame data:', frameData.length, 'bytes. This might indicate problems with the stream.');
      }
    }
  }, [frameData, fps]);
  
  // Track error state
  useEffect(() => {
    if (error) {
      setLastErrorTime(Date.now());
      console.error('Stream error:', error);
    }
  }, [error]);
  
  // Auto-reconnect on error
  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    
    if (streamStatus === 'error' && autoReconnect) {
      console.log('Auto-reconnecting in 5 seconds...');
      reconnectTimer = setTimeout(() => {
        console.log('Auto-reconnecting now');
        reconnect();
      }, 5000);
    }
    
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [streamStatus, autoReconnect, reconnect]);
  
  // Track connection status and attempt progressive reconnects
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    
    const attemptReconnect = () => {
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        // Exponential backoff for reconnect timing
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
        console.log(`Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay/1000} seconds`);
        
        reconnectTimer = setTimeout(() => {
          reconnect();
        }, delay);
      } else {
        console.log(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
      }
    };
    
    if (streamStatus === 'error' && autoReconnect) {
      attemptReconnect();
    } else if (streamStatus === 'playing') {
      // Reset reconnect attempts when successfully connected
      reconnectAttempts = 0;
      console.log('Stream connected successfully');
    }
    
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [streamStatus, autoReconnect, reconnect, stream.id]);
  
  // Notify parent component of play status changes
  useEffect(() => {
    if (onPlayStatusChange) {
      onPlayStatusChange(streamStatus === 'playing');
    }
  }, [streamStatus, onPlayStatusChange]);
  
  // Hide controls after delay when playing and mouse isn't moving
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    if (streamStatus === 'playing' && showControls && timeVisible > 3 && !showSettings && !showInfo) {
      timeout = setTimeout(() => {
        setShowControls(false);
        setTimeVisible(0);
      }, 3000);
    }
    
    return () => clearTimeout(timeout);
  }, [streamStatus, showControls, timeVisible, showSettings, showInfo]);

  // Handle user mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      setTimeVisible(0);
    };
    
    const interval = setInterval(() => {
      if (showControls && streamStatus === 'playing' && !showSettings && !showInfo) {
        setTimeVisible(prev => prev + 1);
      }
    }, 1000);
    
    const playerElement = playerRef.current;
    playerElement?.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      playerElement?.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, [showControls, streamStatus, showSettings, showInfo]);

  // Handle fullscreen changes from browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (fpsTimerRef.current) {
        clearInterval(fpsTimerRef.current);
      }
      
      // Exit fullscreen if active when component unmounts
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error('Error exiting fullscreen:', err));
      }
    };
  }, [stopStream]);

  const handlePlay = () => {
    console.log('Starting stream');
    startStream();
  };

  const handleStop = () => {
    stopStream();
  };
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (playerRef.current?.requestFullscreen) {
        playerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error(`Error attempting to exit fullscreen: ${err.message}`);
        });
      }
    }
  };
  

  const toggleSettings = () => {
    setShowSettings(!showSettings);
    // If we're showing settings, ensure controls stay visible
    if (!showSettings) {
      setTimeVisible(0);
    }
  };
  
  const toggleInfo = () => {
    setShowInfo(!showInfo);
    // If we're showing info, ensure controls stay visible
    if (!showInfo) {
      setTimeVisible(0);
    }
  };

  // Helper function to safely format dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Helper function to safely format times
  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString();
    } catch (error) {
      return '';
    }
  };

  return (
    <div 
      ref={playerRef}
      className={`relative overflow-hidden transition-all duration-300 bg-black ${
        isFullscreen 
          ? 'fixed inset-0 z-50 w-screen h-screen' 
          : 'w-full h-full rounded-2xl min-h-[400px]'
      }`}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Stream frame display */}
      <VideoPlayer
        streamUrl={stream.url}
        isPlaying={streamStatus === 'playing'}
        isLoading={streamStatus === 'loading'}
        error={error || undefined}
        frameData={frameData}
      />
      
      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Top controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center pointer-events-auto">
              <div className="flex items-center">
                <h3 className="text-white font-medium text-lg truncate">
                  {stream.name}
                </h3>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleInfo}
                  className="text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                  title="Stream Information"
                >
                  <Info className="w-5 h-5" />
                </button>
                
                <button
                  onClick={toggleSettings}
                  className="text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                  title="Stream Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {isFullscreen ? (
                  <button
                    onClick={toggleFullscreen}
                    className="text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                    title="Exit Fullscreen"
                  >
                    <Minimize className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={toggleFullscreen}
                    className="text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                    title="Enter Fullscreen"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                )}
                
                {isFullscreen && (
                  <button
                    onClick={() => document.exitFullscreen()}
                    className="text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-center pointer-events-auto">
              <div className="flex items-center space-x-3">
                {streamStatus === 'playing' ? (
                  <button
                    onClick={handleStop}
                    className="bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors"
                    title="Stop Stream"
                  >
                    <Pause className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handlePlay}
                    className="bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors"
                    title="Start Stream"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {streamStatus === 'playing' && (
                  <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                    {fps} FPS
                  </span>
                )}
                
                {error && (
                  <button
                    onClick={reconnect}
                    className="flex items-center space-x-1 text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm"
                    title="Reconnect"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reconnect</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            key="settings-panel"
            className="absolute inset-0 bg-black/80 z-30 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-lg font-bold">Stream Settings</h3>
                <button 
                  onClick={toggleSettings}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Stream URL
                  </label>
                  <input
                    type="text"
                    value={stream.url}
                    readOnly
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 text-sm font-medium">
                    Auto-reconnect on error
                  </label>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input 
                      type="checkbox" 
                      id={`toggle-reconnect-${stream.id}`}
                      checked={autoReconnect} 
                      onChange={(e) => setAutoReconnect(e.target.checked)}
                      className="sr-only"
                    />
                    <label 
                      htmlFor={`toggle-reconnect-${stream.id}`}
                      className={`block overflow-hidden h-6 rounded-full bg-gray-700 cursor-pointer ${autoReconnect ? 'bg-blue-600' : ''}`}
                    >
                      <span 
                        className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${autoReconnect ? 'translate-x-4' : 'translate-x-0'}`}
                      ></span>
                    </label>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-800">
                  <h4 className="text-gray-300 text-sm font-medium mb-2">Stream Stats</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>Status:</div>
                    <div className="text-right capitalize text-gray-300">{streamStatus}</div>
                    
                    <div>Resolution:</div>
                    <div className="text-right text-gray-300">640 x 480</div>
                    
                    <div>Current FPS:</div>
                    <div className="text-right text-gray-300">{fps}</div>
                    
                    <div>Total Frames:</div>
                    <div className="text-right text-gray-300">{frameCountRef.current}</div>
                    
                    {lastErrorTime && (
                      <>
                        <div>Last Error:</div>
                        <div className="text-right text-gray-300">
                          {new Date(lastErrorTime).toLocaleTimeString()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="pt-4 mt-2">
                  <button
                    onClick={() => {
                      toggleSettings();
                      reconnect();
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium text-sm transition-colors"
                  >
                    Restart Stream
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Stream info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            key="info-panel"
            className="absolute inset-0 bg-black/80 z-30 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-lg font-bold">Stream Information</h3>
                <button 
                  onClick={toggleInfo}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-blue-400 text-sm font-medium">Name</h4>
                  <p className="text-white">{stream.name}</p>
                </div>
                
                {stream.description && (
                  <div>
                    <h4 className="text-blue-400 text-sm font-medium">Description</h4>
                    <p className="text-white">{stream.description}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-blue-400 text-sm font-medium">URL</h4>
                  <p className="text-gray-300 text-sm break-all">{stream.url}</p>
                </div>
                
                <div>
                  <h4 className="text-blue-400 text-sm font-medium">Status</h4>
                  <div className="flex items-center mt-1">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      streamStatus === 'playing' ? 'bg-green-500' : 
                      streamStatus === 'loading' ? 'bg-yellow-500' :
                      streamStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></span>
                    <span className="text-white capitalize">{streamStatus}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-blue-400 text-sm font-medium">Added</h4>
                  <p className="text-white">
                    {formatDate(stream.created_at)} {formatTime(stream.created_at)}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 