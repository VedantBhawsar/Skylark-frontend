import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStreamStore } from '../store/streamStore';
import { StreamPlayer } from '../components/StreamPlayer';
import { StreamForm } from '../components/StreamForm';
import type { Stream } from '../types/stream';
import { safeStreamId } from '../utils/streamUtils';

// Lucide React Icons
import {
  Search,
  PlusCircle,
  Edit3,
  Trash2,
  Video,
  AlertTriangle,
  Play,
  MonitorPlay,
  Loader2,
  X,
  Filter,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';

export function HomePage() {
  const {
    streams,
    isLoading,
    error,
    selectedStreamId,
    fetchStreams,
    selectStream,
    getSelectedStream,
    removeStream,
    addStream,
    updateStream
  } = useStreamStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  
  const selectedStream = getSelectedStream();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch streams on mount
  useEffect(() => {
    fetchStreams().catch(console.error);
  }, [fetchStreams]);

  const handleOpenModal = (streamToEdit: Stream | null = null) => {
    setEditingStream(streamToEdit);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStream(null);
  };

  const handleFormSubmit = async (formData: Omit<Stream, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingStream?.id) {
        await updateStream(safeStreamId(editingStream.id), formData);
      } else {
        await addStream(formData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleDeleteStream = async (streamId: string | number) => {
    if (window.confirm('Are you sure you want to delete this stream?')) {
      await removeStream(streamId);
    }
  };

  // Filter streams based on search query and filters
  const filteredStreams = streams.filter((stream) => {
    // Filter by search query
    const matchesSearch = !searchQuery || 
      stream.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stream.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      
    // Filter by active status
    const matchesActiveFilter = activeFilter === null || stream.active === activeFilter;
    
    return matchesSearch && matchesActiveFilter;
  });

  const fadeInUpVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    }
  };

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (index: number) => ({ 
      opacity: 1, 
      x: 0,
      transition: { 
        type: "spring", 
        delay: 0.05 * index,
        duration: 0.3, 
        damping: 25,
        stiffness: 300
      }
    }),
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
  };

  const handleToggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Update HTML element class and localStorage
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.setAttribute('data-theme', 'light');
    }
    
    localStorage.setItem('darkMode', String(newDarkMode));
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 text-gray-800 dark:text-gray-200 transition-colors duration-300`}>
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          type: "spring",
          duration: 0.6,
          bounce: 0.2
        }}
        className="relative bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg shadow-md">
                <MonitorPlay className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-500">
                RTSP Stream Viewer
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleDarkMode}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleOpenModal()}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 transition-all duration-150 ease-in-out shadow-md shadow-blue-500/20"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Add Stream
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8" ref={containerRef}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Streams List */}
          <motion.div 
            variants={fadeInUpVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-4 flex flex-col"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Available Streams
                </h2>
                
                {/* Search and filter bar */}
                <div className="mt-4 flex flex-col space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search streams..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Filter className="h-3.5 w-3.5 mr-1" />
                      Filters
                      <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {streams.length > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {filteredStreams.length} of {streams.length} streams
                      </span>
                    )}
                  </div>
                  
                  {/* Filter options */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2 pt-1"
                      >
                        <button
                          onClick={() => setActiveFilter(null)}
                          className={`px-3 py-1 text-xs rounded-full border ${
                            activeFilter === null 
                              ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                              : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setActiveFilter(true)}
                          className={`px-3 py-1 text-xs rounded-full border ${
                            activeFilter === true
                              ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300'
                              : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Active
                        </button>
                        <button
                          onClick={() => setActiveFilter(false)}
                          className={`px-3 py-1 text-xs rounded-full border ${
                            activeFilter === false
                              ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300'
                              : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Inactive
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="flex flex-col justify-center items-center py-16 space-y-3">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-10 w-10 text-blue-500" />
                    </motion.div>
                    <p className="text-gray-500 dark:text-gray-400">Fetching streams...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-10 px-4 m-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50">
                    <div className="bg-red-100 dark:bg-red-800/30 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-1">Error Occurred</h3>
                    <p className="text-red-600/80 dark:text-red-300/80 text-sm mb-4">{error}</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fetchStreams()}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm rounded-lg hover:from-red-600 hover:to-orange-600 focus:outline-none shadow-md shadow-red-500/20"
                    >
                      Try Again
                    </motion.button>
                  </div>
                ) : filteredStreams.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    {streams.length === 0 ? (
                      <>
                        <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                          <Video className="h-10 w-10 text-gray-500 dark:text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Streams Found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto text-sm">
                          It looks like you haven't added any streams yet.
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleOpenModal()}
                          className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none shadow-md shadow-blue-500/20"
                        >
                          <PlusCircle className="h-5 w-5 mr-2" />
                          Add Your First Stream
                        </motion.button>
                      </>
                    ) : (
                      <>
                        <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                          <Search className="h-10 w-10 text-gray-500 dark:text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Matching Streams</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto text-sm">
                          No streams match your current search or filters.
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setActiveFilter(null);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                        >
                          Clear all filters
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-4 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <AnimatePresence>
                      {filteredStreams.map((stream, index) => (
                        <motion.div
                          key={stream.id}
                          custom={index}
                          variants={listItemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                          className={`rounded-xl transition-all duration-200 ease-in-out cursor-pointer hover:shadow-md border shadow-sm
                            ${
                              selectedStreamId === stream.id
                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/40 dark:ring-blue-700/40'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                            }`}
                          onClick={() => selectStream(stream.id || null)}
                        >
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className={`font-semibold text-base leading-tight truncate pr-2 ${
                                selectedStreamId === stream.id 
                                  ? 'text-blue-700 dark:text-blue-400' 
                                  : 'text-gray-800 dark:text-white'
                              }`}>
                                {stream.name}
                              </h3>
                              <motion.span 
                                whileHover={{ scale: 1.1 }}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap 
                                  ${stream.active
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
                                  }
                                `}
                              >
                                {stream.active ? 'Active' : 'Inactive'}
                              </motion.span>
                            </div>
                            {stream.description && (
                              <p className={`text-sm mt-1 line-clamp-2 ${
                                selectedStreamId === stream.id 
                                  ? 'text-blue-600/80 dark:text-blue-300/80' 
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {stream.description}
                              </p>
                            )}
                            <div className={`flex justify-end items-center mt-3 space-x-2 pt-2 border-t ${
                              selectedStreamId === stream.id 
                                ? 'border-blue-200 dark:border-blue-800/50' 
                                : 'border-gray-200 dark:border-gray-700'
                            }`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenModal(stream); }}
                                className={`h-8 px-2.5 text-xs rounded-lg flex items-center ${
                                  selectedStreamId === stream.id 
                                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30' 
                                    : 'text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/50 dark:hover:bg-blue-900/20'
                                }`}
                              >
                                <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (stream.id) handleDeleteStream(stream.id); }}
                                className={`h-8 px-2.5 text-xs rounded-lg flex items-center
                                  text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30`}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stream Player */}
          <motion.div 
            variants={fadeInUpVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="lg:col-span-8"
          >
            {selectedStream ? (
              <div className="bg-black rounded-2xl shadow-2xl overflow-hidden relative border border-gray-200 dark:border-gray-700">
                <StreamPlayer stream={selectedStream} />
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl h-full flex items-center justify-center aspect-video min-h-[300px] lg:min-h-0 p-6 border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <div className="text-center px-4 py-8 sm:px-6 sm:py-12 max-w-lg">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 p-4 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Play className="h-12 w-12 text-blue-500 dark:text-blue-400 ml-1" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">No Stream Selected</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                    {streams.length > 0
                        ? "Choose a stream from the list to begin viewing the live video feed."
                        : "Add your first stream to start monitoring your video feeds."
                    }
                  </p>
                  {streams.length > 0 && streams[0]?.id && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectStream(streams[0].id!)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none shadow-lg shadow-blue-500/20 font-medium"
                    >
                      View First Stream
                    </motion.button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Stream Form Modal */}
      <StreamForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        stream={editingStream || undefined}
      />
      
      <style>
        {`
        /* Modern scrollbar styles */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }

        /* Smooth transition for all elements */
        * {
          transition-property: background-color, border-color, color, fill, stroke;
          transition-duration: 200ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        `}
      </style>
    </div>
  );
}