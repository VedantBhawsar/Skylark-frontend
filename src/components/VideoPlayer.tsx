import { useEffect, useRef, useState, memo } from 'react';
import { motion } from 'framer-motion';

interface VideoPlayerProps {
  streamUrl?: string; // For context, might not be directly used if frameData is primary
  isPlaying: boolean;
  isLoading: boolean;
  error?: string; // Error from the WebSocket connection
  frameData?: string | null; // Expected to be a pure base64 encoded JPEG string
}

export const VideoPlayer = memo(({ 
  isPlaying, 
  isLoading, 
  error: connectionError, // Renamed to avoid confusion with internal imageError
  frameData
}: VideoPlayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null); // To hold the Image object
  
  const [internalImageError, setInternalImageError] = useState<string | null>(null);
  const [lastFrameTime, setLastFrameTime] = useState<number>(0);

  // Initialize and clean up the Image object
  useEffect(() => {
    // Create a new Image object when the component mounts
    imageRef.current = new Image();
    const img = imageRef.current;

    img.onload = () => {
      if (!canvasRef.current || !img) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error("VideoPlayer: Canvas 2D context not available.");
        setInternalImageError("Canvas rendering error.");
        return;
      }

      // Set canvas dimensions to the natural dimensions of the loaded image
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      } else {
        // Fallback if image somehow loads with 0 dimensions (should be rare)
        console.warn("VideoPlayer: Image loaded with 0 dimensions, using fallback 640x480.");
        canvas.width = 640;
        canvas.height = 480;
      }
      
      // Style the canvas to fit its container while maintaining aspect ratio
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.objectFit = 'contain'; // 'cover' or 'fill' are other options

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setInternalImageError(null); // Clear any previous image loading error
      setLastFrameTime(Date.now());
    };

    img.onerror = (event) => {
      console.error("VideoPlayer: Error loading image data into Image object.", event);
      console.error("VideoPlayer: Failing img.src was:", img.src.substring(0,100) + "..."); // Log the problematic src
      setInternalImageError("Failed to load video frame. Data might be corrupted or invalid.");
    };

    return () => {
      // Cleanup: remove event listeners and nullify src if the Image object exists
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
        imageRef.current.src = ''; // Prevent further loading/errors
        imageRef.current = null;
      }
    };
  }, []); // Empty dependency array: runs once on mount and cleanup on unmount

  // Effect to update image source when frameData changes
  useEffect(() => {
    if (!frameData || !imageRef.current) {
      // If no frame data, or image object not ready, do nothing or clear
      if (!frameData && canvasRef.current && isPlaying) {
          // Optional: Clear canvas if stream is playing but no frame data arrives for a while
          // This depends on desired behavior for "stale" frames.
      }
      return;
    }

    if (typeof frameData !== 'string' || frameData.trim() === "") {
        console.warn("VideoPlayer: Received empty or invalid frameData type.");
        setInternalImageError("Received invalid frame data format.");
        return;
    }
    
    // IMPORTANT: Construct the data URL assuming frameData is PURE base64
    // Do not add any cache-busting query parameters here.
    const dataUrl = `data:image/jpeg;base64,${frameData}`;
    
    // Assign to the Image object's src. The 'onload' or 'onerror' handlers (defined above) will fire.
    imageRef.current.src = dataUrl;

  }, [frameData, isPlaying]); // Re-run when frameData or isPlaying status changes

  // Determine the overall error message to display
  const displayError = connectionError || internalImageError;

  // UI Rendering Logic
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="ml-3 text-lg">Connecting...</p>
        </div>
      );
    }

    if (displayError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center flex-col text-center p-4">
          <div className="text-red-500 bg-red-100 rounded-full p-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-md font-semibold text-white mb-1">Stream Error</h3>
          <p className="text-gray-300 text-sm">{displayError}</p>
        </div>
      );
    }

    if (!isPlaying && !frameData) { // Show "No Stream" only if not playing AND no residual frame
      return (
        <div className="absolute inset-0 flex items-center justify-center flex-col text-center">
          <div className="bg-gray-700 rounded-full p-3 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-md font-semibold text-gray-300">Stream Paused or Stopped</h3>
          <p className="text-gray-400 text-sm mt-1">Press play to start viewing.</p>
        </div>
      );
    }

    // If playing or has frame data, the canvas will be used.
    // We add a "Live" indicator or stale frame indicator.
    const now = Date.now();
    const isFrameStale = isPlaying && lastFrameTime > 0 && (now - lastFrameTime > 5000); // Frame older than 5s

    return (
      <>
        <canvas 
          ref={canvasRef} 
          className="w-full h-full" // CSS will make it fit, object-fit on canvas ensures aspect ratio
          style={{ display: 'block', backgroundColor: 'black' }} 
        />
        {isPlaying && !internalImageError && (
          <div className={`absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded ${isFrameStale ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'}`}>
            {isFrameStale ? 'STALE' : 'LIVE'}
          </div>
        )}
      </>
    );
  };

  return (
    <motion.div 
      className="relative w-full h-full bg-black rounded-lg overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {renderContent()}
    </motion.div>
  );
});

// Optional: Add displayName for better debugging in React DevTools
VideoPlayer.displayName = 'VideoPlayer';