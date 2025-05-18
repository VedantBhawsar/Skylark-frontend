import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlayIcon, PauseIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/solid';
import type { Stream } from '../types/stream';
import { useStreamStore } from '../store/streamStore';

interface StreamCardProps {
  stream: Stream;
  onPlay: (stream: Stream) => void;
  onStop: (stream: Stream) => void;
  onEdit: (stream: Stream) => void;
  isPlaying: boolean;
  isLoading: boolean;
}

export const StreamCard = ({ 
  stream, 
  onPlay, 
  onStop, 
  onEdit, 
  isPlaying = false,
  isLoading = false,
}: StreamCardProps) => {
  const { deleteStream } = useStreamStore();
  const [isHovered, setIsHovered] = useState(false);
  
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this stream?')) {
      await deleteStream(stream.id!);
    }
  };
  
  return (
    <motion.div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="aspect-video bg-gray-100 dark:bg-gray-900 relative">
        {isHovered && (
          <motion.div 
            className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <button 
              onClick={() => isPlaying ? onStop(stream) : onPlay(stream)}
              className="rounded-full bg-white p-3 mx-2 text-black hover:bg-opacity-90 transition-all"
              aria-label={isPlaying ? "Stop stream" : "Play stream"}
            >
              {isPlaying ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6" />
              )}
            </button>
            
            <button 
              onClick={() => onEdit(stream)}
              className="rounded-full bg-white p-3 mx-2 text-black hover:bg-opacity-90 transition-all"
              aria-label="Edit stream"
            >
              <PencilIcon className="h-6 w-6" />
            </button>
            
            <button 
              onClick={handleDelete}
              className="rounded-full bg-white p-3 mx-2 text-red-500 hover:bg-opacity-90 transition-all"
              aria-label="Delete stream"
            >
              <TrashIcon className="h-6 w-6" />
            </button>
          </motion.div>
        )}
        
        <div className="absolute inset-0 flex items-center justify-center">
          {isLoading ? (
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          ) : !isHovered && (
            <div className="bg-black bg-opacity-50 rounded-full p-3">
              <PlayIcon className="h-10 w-10 text-white" />
            </div>
          )}
        </div>
        
        <div className="w-full h-full bg-cover bg-center" style={{ 
          backgroundImage: `url(https://images.unsplash.com/photo-1585909695387-39963b198428?q=80&w=500&auto=format&fit=crop)` 
        }} />
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-1 truncate dark:text-white">{stream.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{stream.description || 'No description'}</p>
        <div className="mt-2 flex items-center">
          <span className={`px-2 py-1 text-xs rounded-full ${stream.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {stream.active ? 'Active' : 'Inactive'}
          </span>
          {isPlaying && (
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              Playing
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}; 