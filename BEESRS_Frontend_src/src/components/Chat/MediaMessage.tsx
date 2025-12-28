import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PlayIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface MediaMessageProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  className?: string;
  isUser?: boolean;
}

export const MediaMessage: React.FC<MediaMessageProps> = ({
  mediaUrl,
  mediaType,
  thumbnailUrl,
  fileName,
  fileSize,
  duration,
  className,
  isUser = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMediaLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleMediaError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const openInNewTab = () => {
    window.open(mediaUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'relative group cursor-pointer',
        className
      )}
      onClick={openInNewTab}
    >
      {/* Media Container */}
      <div className={clsx(
        'relative overflow-hidden rounded-lg border',
        isUser 
          ? 'border-blue-200 bg-blue-50' 
          : 'border-gray-200 bg-white',
        mediaType === 'image' ? 'max-w-[180px]' : 'max-w-[200px]'
      )}>
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
            <div className="w-8 h-8 mb-2">
              {mediaType === 'image' ? (
                <PhotoIcon className="w-full h-full" />
              ) : (
                <VideoCameraIcon className="w-full h-full" />
              )}
            </div>
            <p className="text-xs">Unable to load</p>
          </div>
        )}

        {/* Image Content */}
        {mediaType === 'image' && !hasError && (
          <div className="relative">
            <img
              src={mediaUrl}
              alt={fileName || 'Image'}
              className="w-full h-auto object-cover max-h-32"
              onLoad={handleMediaLoad}
              onError={handleMediaError}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <PhotoIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Video Content */}
        {mediaType === 'video' && !hasError && (
          <div className="relative">
            <video
              src={mediaUrl}
              poster={thumbnailUrl}
              className="w-full h-auto object-cover max-h-32"
              onLoadedData={handleMediaLoad}
              onError={handleMediaError}
              onPlay={handlePlay}
              onPause={handlePause}
              preload="metadata"
            />
            {/* Play Button Overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                <div className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                  <PlayIcon className="w-6 h-6 text-gray-700 ml-0.5" />
                </div>
              </div>
            )}
            {/* Duration Badge */}
            {duration && (
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded">
                {formatDuration(duration)}
              </div>
            )}
          </div>
        )}

        {/* Media Info */}
        <div className={clsx(
          'px-2 py-1 text-xs flex items-center gap-1',
          isUser ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-600'
        )}>
          {mediaType === 'image' ? (
            <PhotoIcon className="w-3 h-3" />
          ) : (
            <VideoCameraIcon className="w-3 h-3" />
          )}
          <span className="font-medium">
        {mediaType === 'image' ? 'Image' : 'Video'}
          </span>
          {fileSize && (
            <span className="text-xs opacity-75">
              • {formatFileSize(fileSize)}
            </span>
          )}
        </div>
      </div>

      {/* File Name Tooltip */}
      {fileName && (
        <div className="absolute -bottom-6 left-0 right-0 text-xs text-gray-500 truncate">
          {fileName}
        </div>
      )}
    </motion.div>
  );
};


