// src/components/Chat/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { PaperAirplaneIcon, MapPinIcon, ExclamationCircleIcon, MapIcon, PencilSquareIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/solid';
import type { UserLocation } from '../../types/chat.types';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { LocationPickerModal } from '../../components/FloatingChat/LocationPickerModal';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface ChatInputProps {
  onSendMessage: (text: string, location?: UserLocation) => Promise<void>;
  onMediaSelect?: (media: any) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onMediaSelect,
  disabled,
}) => {
  const [message, setMessage] = useState('');
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<UserLocation | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'map' | 'manual' | 'ip' | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleSend = async () => {
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);

    try {
      let location: UserLocation | undefined;

      if (isLocationEnabled) {
        if (currentLocation) {
          location = currentLocation;
        } else {
          try {
            location = await getCurrentLocation();
            setCurrentLocation(location);
            setLocationError(null);
          } catch (error: any) {
            toast.error('Unable to get location. Message will be sent without location.', {
              duration: 3000,
            });
            setLocationError(error.message || 'Unable to get location');
            location = undefined;
          }
        }
      }

      await onSendMessage(message, location);
      setMessage('');

      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
        textareaRef.current.style.overflowY = 'hidden';
      }
    } catch (error) {
      toast.error('Unable to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, 120);
    e.target.style.height = `${newHeight}px`;
    e.target.style.overflowY = newHeight >= 120 ? 'auto' : 'hidden';
  };

  const getCurrentLocation = (): Promise<UserLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'You denied location access';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  };

  const handleLocationToggle = async () => {
    if (!isLocationEnabled) {
      setIsLocationEnabled(true);
      setLocationError(null);
      try {
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        setLocationSource('gps');
        toast.success('GPS location enabled successfully!', {
          icon: 'ðŸ“',
          duration: 2000,
        });
      } catch (error: any) {
        setLocationError(error.message || 'Unable to get location');
        toast.error(
          <div>
            <div className="font-semibold">Unable to get GPS location</div>
            <div className="text-xs mt-1">Try choosing a location on the map</div>
          </div>,
          { duration: 4000 }
        );
      }
    } else {
      setIsLocationEnabled(false);
      setCurrentLocation(null);
      setLocationError(null);
      setLocationSource(null);
    }
  };

  const handleMapLocationSelect = (location: UserLocation) => {
    setCurrentLocation(location);
    setLocationSource('map');
    setIsLocationEnabled(true);
    setLocationError(null);
    toast.success('Location selected from map!', {
      icon: 'ðŸ—ºï¸',
      duration: 2000,
    });
  };

  const handleOpenMapPicker = () => {
    setIsMapModalOpen(true);
  };

  const getLocationFromIP = async (): Promise<UserLocation | null> => {
    const cacheKey = 'ip_location_cache';
    const cacheTimeKey = 'ip_location_cache_time';
    const cachedLocation = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(cacheTimeKey);
    
    if (cachedLocation && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 3600000) {
        return JSON.parse(cachedLocation);
      }
    }

    const providers = [
      async () => {
        const response = await fetch('http://ip-api.com/json/?fields=status,lat,lon');
        const data = await response.json();
        if (data.status === 'success' && data.lat && data.lon) {
          return { latitude: data.lat, longitude: data.lon };
        }
        return null;
      },
      async () => {
        const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const data = await response.json();
        if (data.latitude && data.longitude) {
          return { latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude) };
        }
        return null;
      }
    ];

    for (const provider of providers) {
      try {
        const location = await provider();
        if (location) {
          localStorage.setItem(cacheKey, JSON.stringify(location));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
          return location;
        }
      } catch (error) {}
    }
    return null;
  };

  const handleIPLocation = async () => {
    const loadingToast = toast.loading('Checking IP location providers...');
    try {
      const location = await getLocationFromIP();
      if (location) {
        setCurrentLocation(location);
        setLocationSource('ip');
        setIsLocationEnabled(true);
        setLocationError(null);
        toast.success(
          <div>
            <div className="font-semibold">âœ… Location retrieved via IP</div>
            <div className="text-xs mt-1">Accuracy: approx. city/district</div>
          </div>,
          { id: loadingToast, duration: 3000 }
        );
      } else {
        throw new Error('All IP location providers failed');
      }
    } catch (error: any) {
      toast.error(
        <div>
          <div className="font-semibold">âŒ Unable to get IP-based location</div>
          <div className="text-xs mt-1">Try â€œPick on mapâ€ or â€œEnter coordinates manuallyâ€</div>
        </div>,
        { id: loadingToast, duration: 4000 }
      );
    }
  };

  const handleManualLocationSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Coordinates are invalid');
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Coordinates are out of range');
      return;
    }
    setCurrentLocation({ latitude: lat, longitude: lng });
    setLocationSource('manual');
    setIsLocationEnabled(true);
    setLocationError(null);
    setShowManualInput(false);
    setManualLat('');
    setManualLng('');
    toast.success('Manual coordinates saved successfully!', {
      icon: 'âœï¸',
      duration: 2000,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };

    const updateMenuPosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const bottom = window.innerHeight - rect.top + 8;
        setMenuPosition({ top: bottom, left: rect.left });
      }
    };

    if (isActionsMenuOpen) {
      updateMenuPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updateMenuPosition);
      window.addEventListener('scroll', updateMenuPosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isActionsMenuOpen]);

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        {onMediaSelect && (
          <>
            <div className="relative flex-shrink-0">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                disabled={disabled || isSending}
                className="h-10 w-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-white border border-gray-200 transition-all disabled:opacity-50"
                title="More options"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>
            </div>

            {isActionsMenuOpen && createPortal(
              <AnimatePresence>
                {isActionsMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    ref={menuRef}
                    className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[10000] w-48"
                    style={{
                      top: 'auto',
                      bottom: `${menuPosition.top}px`,
                      left: `${menuPosition.left}px`
                    }}
                  >
                    <button
                      onClick={() => {
                        handleLocationToggle();
                        setIsActionsMenuOpen(false);
                      }}
                      className={clsx(
                        'w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors text-sm',
                        isLocationEnabled && currentLocation
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      )}
                    >
                      {locationError ? (
                        <ExclamationCircleIcon className="w-4 h-4 text-amber-600" />
                      ) : (
                        <MapPinIcon className={clsx('w-4 h-4', isLocationEnabled && currentLocation ? 'text-blue-600' : 'text-gray-600')} />
                      )}
                      <span className="flex-1">
                        {isLocationEnabled && currentLocation ? 'Location Enabled' : 'Enable GPS Location'}
                      </span>
                      {isLocationEnabled && currentLocation && (
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body
            )}
          </>
        )}

        <div className="flex-1 relative min-w-0">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Message BEESRS AI..."
            disabled={disabled || isSending}
            rows={1}
            className="w-full min-h-[40px] max-w-full resize-none rounded-lg border-2 border-gray-200/50 bg-white/80 backdrop-blur-sm px-3 py-2 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50 transition-all duration-200 text-sm leading-tight overflow-y-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!message.trim() || disabled || isSending}
          className={clsx(
            'h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-200 transform',
            !message.trim() || disabled || isSending
              ? 'bg-gray-200 text-gray-400'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/50 hover:scale-105 active:scale-95'
          )}
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <PaperAirplaneIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {isLocationEnabled && currentLocation && (
        <p className="text-xs text-green-600 mt-2 flex items-center gap-1.5 bg-green-50 rounded-lg px-2 py-1.5">
          {locationSource === 'gps' && <MapPinIcon className="w-3 h-3" />}
          {locationSource === 'map' && <MapIcon className="w-3 h-3" />}
          {locationSource === 'manual' && <PencilSquareIcon className="w-3 h-3" />}
          {locationSource === 'ip' && <span className="text-[10px]">ðŸŒ</span>}
          <span>
            A {
              locationSource === 'gps' ? 'GPS' :
              locationSource === 'map' ? 'map-based' :
              locationSource === 'manual' ? 'manual' :
              locationSource === 'ip' ? 'IP-based' : ''
            } location will be attached to this message
            {locationSource === 'ip' && <span className="text-amber-600 ml-1">(low accuracy)</span>}
          </span>
          <span className="text-green-700 font-mono text-[10px]">
            ({currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)})
          </span>
        </p>
      )}
      
      {isLocationEnabled && locationError && !showManualInput && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-amber-600 flex items-center gap-1.5 bg-amber-50 rounded-lg px-2 py-1.5">
            <ExclamationCircleIcon className="w-3 h-3" />
            <span className="font-medium">{locationError}</span>
          </p>
          <div className="text-xs text-gray-600 bg-blue-50 rounded-lg px-3 py-2">
            <p className="font-semibold text-blue-900 mb-2">ðŸ’¡ Other ways to share your location:</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleOpenMapPicker}
                className="w-full text-blue-700 bg-white hover:bg-blue-100 rounded-lg px-3 py-2.5 flex items-center gap-2 transition-all border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow group"
              >
                <MapIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <div className="text-left flex-1">
                  <div className="font-semibold">Pick on map</div>
                  <div className="text-[10px] text-blue-600">Click the map or search for a place</div>
                </div>
                <span className="text-blue-500 text-lg group-hover:translate-x-1 transition-transform">â†’</span>
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                className="w-full text-purple-700 bg-white hover:bg-purple-50 rounded-lg px-3 py-2.5 flex items-center gap-2 transition-all border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow group"
              >
                <PencilSquareIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <div className="text-left flex-1">
                  <div className="font-semibold">Enter coordinates manually</div>
                  <div className="text-[10px] text-purple-600">Provide latitude and longitude</div>
                </div>
                <span className="text-purple-500 text-lg group-hover:translate-x-1 transition-transform">â†’</span>
              </button>
              <button
                onClick={handleIPLocation}
                className="w-full text-gray-700 bg-white hover:bg-gray-100 rounded-lg px-3 py-2.5 flex items-center gap-2 transition-all border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow group"
              >
                <span className="text-lg">ðŸŒ</span>
                <div className="text-left flex-1">
                  <div className="font-semibold">Estimate from IP</div>
                  <div className="text-[10px] text-gray-600">4 providers â€¢ Cache 1h â€¢ Low accuracy</div>
                </div>
                <span className="text-gray-500 text-lg group-hover:translate-x-1 transition-transform">â†’</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualInput && (
        <div className="mt-2 bg-purple-50 rounded-lg px-3 py-3 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-purple-900">âœï¸ Enter manual coordinates</p>
            <button
              onClick={() => {
                setShowManualInput(false);
                setManualLat('');
                setManualLng('');
              }}
              className="text-purple-600 hover:text-purple-800"
            >
              <span className="text-sm">âœ•</span>
            </button>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Latitude (e.g. 10.7769)"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-purple-200 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
            <input
              type="text"
              placeholder="Longitude (e.g. 106.7010)"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-purple-200 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
            <button
              onClick={handleManualLocationSubmit}
              disabled={!manualLat || !manualLng}
              className={clsx(
                "w-full px-3 py-2 text-xs font-semibold rounded-lg transition-all",
                manualLat && manualLng
                  ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow"
                  : "bg-purple-200 text-purple-400 cursor-not-allowed"
              )}
            >
              Confirm coordinates
            </button>
          </div>
        </div>
      )}

      <LocationPickerModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onLocationSelect={handleMapLocationSelect}
      />
    </div>
  );
};
