import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPinIcon, ClockIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import type { UserLocation } from '../../types/chat.types';
import clsx from 'clsx';
import { reverseGeocode } from '../../utils/geocoding';

interface LocationCardProps {
  location: UserLocation;
  locationName?: string;
  timestamp?: string;
  className?: string;
  showMap?: boolean;
  onGetDirections?: () => void;
  onViewOnMap?: () => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  location,
  locationName,
  timestamp,
  className,
  showMap = true,
  onGetDirections,
  onViewOnMap,
}) => {
  const [address, setAddress] = useState<string>(locationName || '');
  const [isLoadingAddress, setIsLoadingAddress] = useState(!locationName);
  const [addressDetails, setAddressDetails] = useState<{
    houseNumber?: string;
    streetName?: string;
    ward?: string;
    district?: string;
    city?: string;
  } | null>(null);

  // Get address from coordinates if not provided
  useEffect(() => {
    if (!locationName && location.latitude && location.longitude) {
      setIsLoadingAddress(true);
      
      reverseGeocode(location.latitude, location.longitude)
        .then((result) => {
          if (result && result.address) {
            setAddress(result.address);
            setAddressDetails({
              houseNumber: result.houseNumber,
              streetName: result.streetName,
              ward: result.ward,
              district: result.district,
              city: result.city
            });
          } else {
            setAddress(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
          }
          setIsLoadingAddress(false);
        })
        .catch((error) => {
          console.warn('Failed to reverse geocode:', error);
          setAddress(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
          setIsLoadingAddress(false);
        });
    }
  }, [location.latitude, location.longitude, locationName]);

  const handleGetDirections = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Open Google Maps with directions
    let googleMapsUrl: string;
    
    if (locationName) {
      const encodedAddress = encodeURIComponent(locationName);
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    } else {
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    }
    
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    
    // Also call the callback if provided
    onGetDirections?.();
  };

  const handleViewOnMap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onViewOnMap?.();
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200 group overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100/50">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
            <MapPinIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-xs">
              Shared location
            </h3>
            {timestamp && (
              <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                <ClockIcon className="w-2.5 h-2.5" />
                {timestamp}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <MapPinIcon className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {isLoadingAddress ? (
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                <span className="text-xs text-gray-500">Retrieving address...</span>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Display house number and street name prominently if available */}
                {(addressDetails?.houseNumber || addressDetails?.streetName) && (
                  <p className="text-xs text-gray-800 leading-relaxed break-words font-semibold">
                    {[addressDetails.houseNumber, addressDetails.streetName].filter(Boolean).join(' ')}
                  </p>
                )}
                <p className="text-xs text-gray-700 leading-relaxed break-words font-medium">
                  {address || 'Unknown address'}
                </p>
                {addressDetails && (addressDetails.ward || addressDetails.district || addressDetails.city) && (
                  <div className="text-[10px] text-gray-600 mt-1 space-y-0.5">
                    {addressDetails.ward && <p>Phường/Xã: {addressDetails.ward}</p>}
                    {addressDetails.district && <p>Quận/Huyện: {addressDetails.district}</p>}
                    {addressDetails.city && <p>Thành phố/Tỉnh: {addressDetails.city}</p>}
                  </div>
                )}
                {address && address !== 'Unknown address' && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>Exact location</span>
                  </div>
                )}
              </div>
            )}
            <div className="mt-2 p-1.5 bg-gray-50/50 rounded-lg">
              <p className="text-[10px] text-gray-500 font-mono">
                Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Map */}
      {showMap && (
        <div className="px-3 pb-3">
          <div className="relative h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200/50">
            {/* Google Maps Embed */}
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBvOkBwJ1Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3'}&q=${location.latitude},${location.longitude}&zoom=15&maptype=roadmap`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-lg"
            />
            
            {/* Fallback if iframe fails */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-500">
                <MapPinIcon className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                <p className="text-[10px]">Mini map</p>
                <p className="text-[10px] text-gray-400">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-3 pb-3">
        <div className="flex gap-2">
          <button
            onClick={handleGetDirections}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-600 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm hover:shadow"
          >
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            <span>Get directions</span>
          </button>
          <button
            onClick={handleViewOnMap}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-600 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm hover:shadow"
          >
            <MapPinIcon className="w-3.5 h-3.5" />
            <span>View map</span>
          </button>
          <button
            onClick={openInGoogleMaps}
            className="px-2.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors text-xs font-medium"
            title="Open in Google Maps"
          >
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
