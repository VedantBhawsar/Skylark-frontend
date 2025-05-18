import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { StreamCard } from '../components/StreamCard';
import { VideoPlayer } from '../components/VideoPlayer';
import { StreamForm } from '../components/StreamForm';
import { useStreamStore } from '../store/streamStore';
import { useRtspStream } from '../hooks/useRtspStream';
import type { Stream } from '../types/stream';

export const HomePage = () => {
  const { 
    streams, 
    activeStream, 
    streamStates, 
    loading, 
    error,
    fetchStreams,
    fetchDefaultStreams,
    setActiveStream,
    createStream,
    updateStream
  } = useStreamStore();
  
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Partial<Stream> | null>(null);
  
  // Initialize rtspStream hook with the active stream ID or a placeholder
  const activeStreamId = activeStream?.id || 'placeholder';
  const { 
    status: streamStatus, 
    error: streamError, 
    wsUrl,
    startStream, 
    stopStream, 
    isConnected 
  } = useRtspStream(activeStreamId);
  
  // Fetch streams on component mount
  useEffect(() => {
    fetchStreams().catch(() => {
      // If regular streams fail, fetch default streams
      fetchDefaultStreams();
    });
  }, [fetchStreams, fetchDefaultStreams]);
  
  // Handler for playing a stream
  const handlePlayStream = (stream: Stream) => {
    setActiveStream(stream);
    startStream(stream.url);
  };
  
  // Handler for stopping a stream
  const handleStopStream = (stream: Stream) => {
    stopStream();
  };
  
  // Handler for editing a stream
  const handleEditStream = (stream: Stream) => {
    setEditingStream(stream);
    setFormModalOpen(true);
  };
  
  // Handler for adding a new stream
  const handleAddStream = () => {
    setEditingStream(null);
    setFormModalOpen(true);
  };
  
  // Handler for form submission
  const handleFormSubmit = async (streamData: Omit<Stream, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingStream?.id) {
      await updateStream(editingStream.id, streamData);
    } else {
      await createStream(streamData);
    }
    setFormModalOpen(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 flex flex-col">
      <Navbar onAddStream={handleAddStream} />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden">
              <div className="aspect-video relative">
                <VideoPlayer 
                  streamUrl={wsUrl}
                  isPlaying={streamStatus === 'playing'}
                  isLoading={streamStatus === 'loading'}
                  error={streamError || undefined}
                />
              </div>
              
              {activeStream && (
                <div className="p-4">
                  <h2 className="text-xl font-bold dark:text-white">{activeStream.name}</h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">{activeStream.description}</p>
                  <div className="flex items-center mt-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${streamStatus === 'playing' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {streamStatus === 'playing' ? 'Live' : streamStatus === 'loading' ? 'Connecting...' : 'Ready'}
                    </span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      {activeStream.url}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Stream List Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold dark:text-white">Stream List</h2>
                <button 
                  onClick={handleAddStream}
                  className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
                >
                  Add New
                </button>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500">{error}</p>
                  <button 
                    onClick={() => fetchDefaultStreams()}
                    className="mt-2 text-indigo-600 hover:text-indigo-800"
                  >
                    Load Default Streams
                  </button>
                </div>
              ) : streams.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="text-gray-500 dark:text-gray-400">No streams available.</p>
                  <button 
                    onClick={handleAddStream}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Add Your First Stream
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 pr-2">
                  {streams.map((stream) => (
                    <StreamCard
                      key={stream.id}
                      stream={stream}
                      onPlay={handlePlayStream}
                      onStop={handleStopStream}
                      onEdit={handleEditStream}
                      isPlaying={activeStream?.id === stream.id && streamStatus === 'playing'}
                      isLoading={activeStream?.id === stream.id && streamStatus === 'loading'}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Stream Form Modal */}
      <StreamForm 
        stream={editingStream || undefined}
        onSubmit={handleFormSubmit}
        onCancel={() => setFormModalOpen(false)}
        isOpen={formModalOpen}
      />
    </div>
  );
}; 