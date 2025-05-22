import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Stream } from '../types/stream';
import socketService from '../services/socketService';

// Lucide React Icons
import { X, Check, AlertCircle, AlertTriangle } from 'lucide-react';

interface StreamFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (streamData: Omit<Stream, 'id' | 'created_at' | 'updated_at'>) => void;
  stream?: Stream;
}

export function StreamForm({ isOpen, onClose, onSubmit, stream }: StreamFormProps) {
  const [formData, setFormData] = useState<Omit<Stream, 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    url: '',
    description: '',
    active: true,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [availableStreams, setAvailableStreams] = useState<Record<string, string>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  // Reset form data when stream changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (stream) {
        setFormData({
          name: stream.name,
          url: stream.url,
          description: stream.description || '',
          active: stream.active,
        });
      } else {
        setFormData({
          name: '',
          url: '',
          description: '',
          active: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, stream]);

  // Fetch available streams from backend when form opens
  useEffect(() => {
    if (isOpen) {
      const handleAvailableStreams = (data: any) => {
        if (data && data.streams) {
          setAvailableStreams(data.streams);
        }
      };
      
      socketService.addEventListener('available_streams', handleAvailableStreams);
      socketService.getAvailableStreams();
      
      return () => {
        socketService.removeEventListener('available_streams', handleAvailableStreams);
      };
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value,
    }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Stream name is required';
    }
    
    if (!formData.url.trim()) {
      newErrors.url = 'Stream URL is required';
    } else if (!formData.url.toLowerCase().startsWith('rtsp://')) {
      newErrors.url = 'URL must be a valid RTSP URL starting with rtsp://';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({
        form: 'An error occurred while saving the stream. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleFocus = (name: string) => {
    setFocused(name);
  };

  const handleBlur = () => {
    setFocused(null);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedKey = e.target.value;
    setSelectedPreset(selectedKey);
    
    if (selectedKey && availableStreams[selectedKey]) {
      // Update form data with selected stream URL
      setFormData(prev => ({
        ...prev,
        url: availableStreams[selectedKey],
        // If name is empty, use the key as the name
        name: prev.name || selectedKey.charAt(0).toUpperCase() + selectedKey.slice(1)
      }));
      
      // Clear URL error if it exists
      if (errors.url) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.url;
          return newErrors;
        });
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 300,
        duration: 0.3 
      } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: -20,
      transition: { 
        duration: 0.2 
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-container"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              key="modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {stream ? 'Edit Stream' : 'Add New Stream'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(0,0,0,0.05)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="rounded-full p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
              
              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                {/* Stream Presets dropdown */}
                <div className="space-y-2">
                  <label htmlFor="preset" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stream Preset
                  </label>
                  <select
                    id="preset"
                    name="preset"
                    value={selectedPreset}
                    onChange={handlePresetChange}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                  >
                    <option value="">-- Select a preset stream --</option>
                    {Object.keys(availableStreams).map((key) => (
                      <option key={key} value={key}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Optional: Select from available stream presets or enter details manually
                  </p>
                </div>
                
                {/* Form-level error */}
                {errors.form && (
                  <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 text-red-500 dark:text-red-400" />
                    <span>{errors.form}</span>
                  </div>
                )}

                {/* Name field */}
                <div className="mb-5">
                  <div className="flex justify-between mb-1.5">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Stream Name <span className="text-red-500">*</span>
                    </label>
                    {errors.name && (
                      <span className="text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        {errors.name}
                      </span>
                    )}
                  </div>
                  <motion.div
                    animate={errors.name ? { x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.5 } } : {}}
                  >
                    <div className={`relative rounded-lg shadow-sm ${errors.name ? 'ring-2 ring-red-500' : ''}`}>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        onFocus={() => handleFocus('name')}
                        onBlur={handleBlur}
                        className={`block w-full px-4 py-2.5 border ${
                          errors.name 
                            ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                        } rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm`}
                        placeholder="Enter a descriptive name"
                      />
                      {focused === 'name' && !errors.name && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Check className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
                
                {/* URL field */}
                <div className="mb-5">
                  <div className="flex justify-between mb-1.5">
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      RTSP URL <span className="text-red-500">*</span>
                    </label>
                    {errors.url && (
                      <span className="text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        {errors.url}
                      </span>
                    )}
                  </div>
                  <motion.div
                    animate={errors.url ? { x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.5 } } : {}}
                  >
                    <div className={`relative rounded-lg shadow-sm ${errors.url ? 'ring-2 ring-red-500' : ''}`}>
                      <input
                        type="text"
                        id="url"
                        name="url"
                        value={formData.url}
                        onChange={handleChange}
                        onFocus={() => handleFocus('url')}
                        onBlur={handleBlur}
                        className={`block w-full px-4 py-2.5 border ${
                          errors.url 
                            ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                        } rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 font-mono text-sm shadow-sm`}
                        placeholder="rtsp://username:password@ip:port/path"
                      />
                      {focused === 'url' && !errors.url && formData.url.startsWith('rtsp://') && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Check className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Example: rtsp://admin:password@192.168.1.100:554/stream
                  </p>
                </div>
                
                {/* Description field */}
                <div className="mb-5">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Description <span className="text-xs text-gray-500 dark:text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                    placeholder="Enter an optional description for this stream"
                  />
                </div>
                
                {/* Active toggle */}
                <div className="mb-6">
                  <div className="flex items-center mt-1">
                    <div className="relative inline-block w-12 mr-3 align-middle select-none">
                      <input
                        type="checkbox"
                        id="active"
                        name="active"
                        checked={formData.active}
                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                        className="absolute block w-6 h-6 bg-white dark:bg-gray-600 rounded-full appearance-none cursor-pointer border-4 border-transparent checked:border-transparent focus:outline-none focus:ring-0 checked:right-0 transition-all duration-200 peer"
                      />
                      <label
                        htmlFor="active"
                        className="block h-6 overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer peer-checked:bg-blue-500"
                      ></label>
                    </div>
                    <label htmlFor="active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Stream is active
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Active streams will be monitored and displayed in the main view
                  </p>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-150 shadow-lg shadow-blue-500/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {stream ? 'Updating...' : 'Creating...'}
                      </div>
                    ) : (
                      <>{stream ? 'Update Stream' : 'Create Stream'}</>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 