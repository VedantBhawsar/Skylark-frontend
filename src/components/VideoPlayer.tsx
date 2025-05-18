import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface VideoPlayerProps {
  streamUrl?: string;
  isPlaying: boolean;
  isLoading: boolean;
  error?: string;
}

export const VideoPlayer = ({ 
  streamUrl, 
  isPlaying, 
  isLoading, 
  error 
}: VideoPlayerProps) => {
  const playerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!playerRef.current || !streamUrl || !isPlaying) return;
    
    // In a real implementation, this would use a library like JSMpeg or similar
    // to connect to the WebSocket stream and play the video
    // For this example, we're just showing a placeholder
    
    // Simulated connection code:
    // const player = new JSMpeg.Player(streamUrl, {
    //   canvas: playerRef.current.querySelector('canvas'),
    //   autoplay: true,
    //   audio: true,
    //   loop: false
    // });
    
    // Clean up function
    return () => {
      // In a real implementation:
      // player.stop();
      // player.destroy();
    };
  }, [streamUrl, isPlaying]);
  
  return (
    <motion.div 
      ref={playerRef}
      className="relative w-full h-full bg-black rounded-lg overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-white border-r-transparent" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="text-white ml-4 text-lg">Connecting to stream...</p>
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex items-center justify-center flex-col text-center p-8">
          <div className="text-red-500 bg-red-100 rounded-full p-3 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Stream Error</h3>
          <p className="text-gray-300">{error}</p>
        </div>
      ) : !isPlaying || !streamUrl ? (
        <div className="absolute inset-0 flex items-center justify-center flex-col text-center">
          <div className="bg-gray-700 rounded-full p-4 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-300">No Stream Selected</h3>
          <p className="text-gray-400 mt-2">Select a stream from the list to start viewing</p>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* In a real implementation, this would be the video canvas */}
          <canvas className="w-full h-full" />
          
          {/* Fallback image for this example */}
          <img 
            src="https://images.unsplash.com/photo-1626544827763-d516dce335e2?q=80&w=1000&auto=format&fit=crop" 
            alt="Stream preview" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 rounded-lg px-3 py-1 text-white text-sm">
            Live Stream
          </div>
        </div>
      )}
    </motion.div>
  );
}; 