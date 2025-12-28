// src/components/FloatingChat/LocationPickerModal.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import { TrackMap } from '../../pages/User/Place/TrackMap';
import type { UserLocation } from '../../types/chat.types';
import { reverseGeocode } from '../../utils/geocoding';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: UserLocation) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<UserLocation | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [addressDetails, setAddressDetails] = useState<{
    address: string;
    houseNumber?: string;
    streetName?: string;
    ward?: string;
    district?: string;
    city?: string;
  } | null>(null);

  const handleMapPick = async (
    lat: number,
    lng: number,
    address?: string,
    city?: string,
    state?: string,
  ) => {
    setSelectedLocation({
      latitude: lat,
      longitude: lng,
    });
    
    setIsLoadingAddress(true);
    setAddressDetails(null);
    
    // Try to get detailed address from reverse geocoding
    try {
      const result = await reverseGeocode(lat, lng);
      if (result && result.address) {
        setAddressDetails(result);
        setSelectedAddress(result.address);
        setLocationName(result.address);
      } else {
        // Fallback to map data if reverse geocoding fails
        const addressParts: string[] = [];
        if (address && address !== 'undefined') {
          addressParts.push(address);
        }
        if (city) {
          addressParts.push(city);
        }
        if (state) {
          addressParts.push(state);
        }
        
        const fullAddress = addressParts.length > 0 
          ? addressParts.join(', ')
          : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        setSelectedAddress(fullAddress);
        setLocationName(fullAddress);
      }
    } catch (error) {
      // Fallback to coordinates
      const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setSelectedAddress(fallbackAddress);
      setLocationName(fallbackAddress);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      // Use the address field from UserLocation interface
      onLocationSelect({
        ...selectedLocation,
        address: selectedAddress
      });
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedLocation(null);
    setLocationName('');
    setSelectedAddress('');
    setAddressDetails(null);
    setIsLoadingAddress(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const originalPosition = style.position;
    const originalTop = style.top;
    const originalWidth = style.width;
    const originalOverflow = style.overflow;

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';
    style.overflow = 'hidden';

    return () => {
      style.position = originalPosition || '';
      style.top = originalTop || '';
      style.width = originalWidth || '';
      style.overflow = originalOverflow || '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10050]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[700px] h-[85vh] max-h-[700px] bg-white rounded-2xl shadow-2xl z-[10051] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
              <div>
                <h3 className="text-lg font-semibold">Choose your location</h3>
                <p className="text-xs text-blue-100 mt-1">
                  Click the map or search for a place
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Selected Location Info */}
              {selectedLocation && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-green-900 mb-2">
                        Selected location
                      </p>
                      {isLoadingAddress ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-green-700">Đang tải địa chỉ...</span>
                        </div>
                      ) : addressDetails ? (
                        <div className="space-y-1">
                          {/* Display house number and street name prominently if available */}
                          {(addressDetails.houseNumber || addressDetails.streetName) && (
                            <p className="text-sm text-green-900 font-semibold break-words leading-relaxed">
                              {[addressDetails.houseNumber, addressDetails.streetName].filter(Boolean).join(' ')}
                            </p>
                          )}
                          <p className="text-sm text-green-800 font-medium break-words leading-relaxed">
                            {addressDetails.address}
                          </p>
                          {(addressDetails.ward || addressDetails.district || addressDetails.city) && (
                            <div className="text-xs text-green-700 mt-2 space-y-0.5">
                              {addressDetails.ward && <p>Phường/Xã: {addressDetails.ward}</p>}
                              {addressDetails.district && <p>Quận/Huyện: {addressDetails.district}</p>}
                              {addressDetails.city && <p>Thành phố/Tỉnh: {addressDetails.city}</p>}
                            </div>
                          )}
                          <p className="text-xs text-green-600 font-mono mt-2 pt-2 border-t border-green-200">
                            Tọa độ: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm text-green-800 font-medium break-words">
                            {locationName || `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}
                          </p>
                          <p className="text-xs text-green-600 font-mono mt-1">
                            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Map */}
              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <TrackMap
                  onPick={handleMapPick}
                  visible={isOpen}
                  zoom={13}
                />
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-900 font-medium mb-2">💡 Tips:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Click anywhere on the map to choose a location</li>
                  <li>• Or search for a place using the input above</li>
                  <li>• Your current location will be focused automatically (when permitted)</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedLocation}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedLocation
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:shadow-blue-500/50'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Confirm location
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

