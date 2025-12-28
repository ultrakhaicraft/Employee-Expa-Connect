// src/components/Chat/MediaUpload.tsx
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { LocationPickerModal } from '../FloatingChat/LocationPickerModal';
import type { UserLocation } from '../../types/chat.types';

interface MediaUploadProps {
  onMediaSelect: (media: {
    type: 'image' | 'video' | 'location';
    file?: File;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    url?: string;
    thumbnailUrl?: string;
    duration?: number;
    locationName?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  disabled?: boolean;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onMediaSelect,
  disabled = false
}) => {
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleLocationClick = () => {
    // Open map picker modal instead of getting GPS directly
    setIsLocationPickerOpen(true);
  };

  const handleLocationSelect = async (location: UserLocation) => {
    const { latitude, longitude, address } = location;
    
    // If address is already provided from map picker, use it
    if (address) {
      onMediaSelect({
        type: 'location',
        locationName: address,
        latitude,
        longitude
      });
      return;
    }
    
    // Otherwise, get detailed location name using reverse geocoding
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      const data = await response.json();
      
      // Build detailed address from multiple sources
      const addressParts: string[] = [];
      
      // Try to get street address first
      if (data.localityInfo?.informative?.[0]?.name) {
        addressParts.push(data.localityInfo.informative[0].name);
      }
      
      // Add locality (ward/district)
      if (data.localityInfo?.administrative?.[2]?.name) {
        addressParts.push(data.localityInfo.administrative[2].name);
      }
      
      // Add city/province
      if (data.localityInfo?.administrative?.[1]?.name) {
        addressParts.push(data.localityInfo.administrative[1].name);
      }
      
      // Add country
      if (data.localityInfo?.administrative?.[0]?.name) {
        addressParts.push(data.localityInfo.administrative[0].name);
      }
      
      // If we have address parts, join them; otherwise use principalSubdivision or country
      let locationName: string;
      if (addressParts.length > 0) {
        locationName = addressParts.join(', ');
      } else if (data.principalSubdivision) {
        locationName = `${data.principalSubdivision}, ${data.countryName || data.countryCode}`;
      } else if (data.countryName) {
        locationName = data.countryName;
      } else {
        locationName = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }

      onMediaSelect({
        type: 'location',
        locationName,
        latitude,
        longitude
      });
    } catch (error) {
      // Fallback: try using Google Geocoding API if available, or just coordinates
      try {
        // Try Google Geocoding as fallback (if API key is available)
        const googleResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=en&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`
        );
        if (googleResponse.ok) {
          const googleData = await googleResponse.json();
          if (googleData.results && googleData.results.length > 0) {
            const formattedAddress = googleData.results[0].formatted_address;
            onMediaSelect({
              type: 'location',
              locationName: formattedAddress,
              latitude,
              longitude
            });
            return;
          }
        }
      } catch (googleError) {
        console.warn('Google Geocoding failed:', googleError);
      }
      
      // Final fallback: coordinates only
      onMediaSelect({
        type: 'location',
        locationName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        latitude,
        longitude
      });
    }
  };


  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }
      const url = URL.createObjectURL(file);
      onMediaSelect({
        type: 'image',
        file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        url
      });
    }
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert('Please select a video file');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert('Video size must be less than 50MB');
        return;
      }
      const url = URL.createObjectURL(file);
      // Create video element to get duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(url);
        const duration = video.duration;
        const newUrl = URL.createObjectURL(file);
        onMediaSelect({
          type: 'video',
          file,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          url: newUrl,
          duration
        });
      };
      video.src = url;
    }
    // Reset input
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Media Upload Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Image Upload */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleImageClick}
          disabled={disabled}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-blue-50 text-blue-600 transition-colors disabled:opacity-50"
          title="Upload image"
        >
          <ImageIcon className="w-5 h-5" />
        </motion.button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
          disabled={disabled}
        />

        {/* Video Upload */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleVideoClick}
          disabled={disabled}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-purple-50 text-purple-600 transition-colors disabled:opacity-50"
          title="Upload video"
        >
          <Video className="w-5 h-5" />
        </motion.button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          className="hidden"
          disabled={disabled}
        />

        {/* Location Share Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleLocationClick}
          disabled={disabled}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-green-50 text-green-600 transition-colors disabled:opacity-50"
          title="Share location"
        >
          <MapPin className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        onLocationSelect={handleLocationSelect}
      />
    </>
  );
};
