import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, MapPinIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import type { Place } from '../../types/chat.types';
import clsx from 'clsx';
import { createPortal } from 'react-dom';

interface MapViewProps {
  places: Place[];
  isOpen: boolean;
  onClose: () => void;
  onGetDirections?: (place: Place) => void;
  className?: string;
}

// Load TrackAsia GL SDK
function loadTrackAsiaOnce(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).trackasiagl) return resolve((window as any).trackasiagl);

    if (!document.getElementById("trackasia-gl-css")) {
      const link = document.createElement("link");
      link.id = "trackasia-gl-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/trackasia-gl@latest/dist/trackasia-gl.css";
      document.head.appendChild(link);
    }

    const existing = document.getElementById("trackasia-gl-js");
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).trackasiagl));
      existing.addEventListener("error", () => reject(new Error("Load TrackAsia failed")));
      return;
    }

    const script = document.createElement("script");
    script.id = "trackasia-gl-js";
    script.src = "https://unpkg.com/trackasia-gl@latest/dist/trackasia-gl.js";
    script.async = true;
    script.onload = () => resolve((window as any).trackasiagl);
    script.onerror = () => reject(new Error("Load TrackAsia failed"));
    document.body.appendChild(script);
  });
}

export const MapView: React.FC<MapViewProps> = ({
  places,
  isOpen,
  onClose,
  onGetDirections,
  className
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const selectedMarkerRef = useRef<any>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const KEY = import.meta.env.VITE_TRACKASIA_KEY as string;
  const styleUrl = `https://maps.track-asia.com/styles/v2/streets.json?key=${KEY}`;

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || places.length === 0) return;

    let disposed = false;

    (async () => {
      try {
        const ta = await loadTrackAsiaOnce();
        if (disposed || !mapContainerRef.current) return;

        // Calculate center from places
        const avgLat = places.reduce((sum, p) => sum + p.latitude, 0) / places.length;
        const avgLng = places.reduce((sum, p) => sum + p.longitude, 0) / places.length;

        // Initialize map
        const map = new ta.Map({
          container: mapContainerRef.current,
          style: styleUrl,
          center: [avgLng, avgLat],
          zoom: places.length === 1 ? 15 : 13,
        });

        mapInstanceRef.current = map;

        // Wait for map to load
        map.on("load", () => {
          if (disposed) return;

          // Clear existing markers
          markersRef.current.forEach(({ marker }) => marker.remove());
          markersRef.current = [];
          // Clear selected marker
          if (selectedMarkerRef.current) {
            selectedMarkerRef.current.remove();
            selectedMarkerRef.current = null;
          }

          // Add styles once (if not already added)
          if (!document.getElementById('marker-styles')) {
            const style = document.createElement('style');
            style.id = 'marker-styles';
            style.textContent = `
              .custom-marker {
                position: relative;
                cursor: pointer;
              }
              .marker-content {
                position: relative;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0,0,0,0.2);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1;
              }
              .custom-marker:hover .marker-content {
                transform: scale(1.15);
                box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5), 0 4px 8px rgba(0,0,0,0.3);
              }
              .custom-marker.selected .marker-content {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                transform: scale(1.2);
                box-shadow: 0 8px 20px rgba(37, 99, 235, 0.6), 0 4px 8px rgba(0,0,0,0.3);
              }
              .selected-location-marker {
                font-size: 40px;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                z-index: 2000;
                cursor: pointer;
                animation: markerBounce 0.6s ease-out;
              }
              @keyframes markerBounce {
                0% {
                  opacity: 0;
                  transform: translateY(-20px) scale(0.3);
                }
                50% {
                  transform: translateY(5px) scale(1.1);
                }
                100% {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `;
            document.head.appendChild(style);
          }

          
          // Add markers for each place
          places.forEach((place, index) => {
            const el = document.createElement('div');
            el.className = 'custom-marker';
            // Set animation delay for bounce effect
            el.style.animation = `markerBounce 0.6s ease-out ${index * 0.1}s both`;
            
            // Create marker without pulse animation
            const markerInner = document.createElement('div');
            markerInner.className = 'marker-inner';
            markerInner.innerHTML = `
              <div class="marker-content">
                ${index + 1}
              </div>
            `;
            
            el.appendChild(markerInner);

            const marker = new ta.Marker({ element: el })
              .setLngLat([place.longitude, place.latitude])
              .addTo(map);

            // Add click handler to marker with ripple effect
            el.addEventListener('click', () => {
              setSelectedPlace(place);
              map.flyTo({
                center: [place.longitude, place.latitude],
                zoom: 16,
                duration: 1000
              });
              
              // Add ripple effect
              const ripple = document.createElement('div');
              ripple.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                border-radius: 50%;
                background: rgba(59, 130, 246, 0.6);
                transform: translate(-50%, -50%);
                pointer-events: none;
                animation: ripple 0.6s ease-out;
              `;
              
              const rippleStyle = document.createElement('style');
              if (!document.getElementById('ripple-styles')) {
                rippleStyle.id = 'ripple-styles';
                rippleStyle.textContent = `
                  @keyframes ripple {
                    to {
                      width: 80px;
                      height: 80px;
                      opacity: 0;
                    }
                  }
                `;
                document.head.appendChild(rippleStyle);
              }
              
              el.appendChild(ripple);
              setTimeout(() => ripple.remove(), 600);
            });
            
            // Add hover effect
            el.addEventListener('mouseenter', () => {
              el.style.zIndex = '1000';
            });
            el.addEventListener('mouseleave', () => {
              if (selectedPlace?.id !== place.id) {
                el.style.zIndex = '1';
              }
            });

            markersRef.current.push({ marker, place });
          });

          // Fit bounds to show all places if more than one
          if (places.length > 1) {
            const bounds = new ta.LngLatBounds();
            places.forEach(place => {
              bounds.extend([place.longitude, place.latitude]);
            });
            map.fitBounds(bounds, {
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
              duration: 1000
            });
          }

          // Resize map after a short delay to ensure proper rendering
          setTimeout(() => {
            if (map && !disposed) {
              map.resize();
            }
          }, 100);
        });

        // Handle window resize
        const handleResize = () => {
          if (map && !disposed) {
            map.resize();
          }
        };
        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
        };
      } catch (e) {
        console.error("[MapView] init failed:", e);
      }
    })();

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current = [];
        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.remove();
          selectedMarkerRef.current = null;
        }
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, places, styleUrl, KEY]);

  // Update markers when selectedPlace changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isOpen || places.length === 0) return;

    markersRef.current.forEach(({ marker, place }) => {
      if (marker && marker.getElement) {
        const el = marker.getElement();
        if (el) {
          const isSelected = selectedPlace?.id === place.id;
          if (isSelected) {
            el.classList.add('selected');
            el.style.zIndex = '1000';
          } else {
            el.classList.remove('selected');
            el.style.zIndex = '1';
          }
        }
      }
    });
  }, [selectedPlace, isOpen, places]);

  // Fly to place when selected from list and add 📍 marker
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedPlace) {
      // Remove selected marker if no place is selected
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
        selectedMarkerRef.current = null;
      }
      return;
    }

    const ta = (window as any).trackasiagl;
    if (!ta) return;

    // Remove previous selected marker
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    // Create 📍 marker for selected place
    const selectedMarkerEl = document.createElement('div');
    selectedMarkerEl.className = 'selected-location-marker';
    selectedMarkerEl.innerHTML = '📍';
    selectedMarkerEl.style.cssText = `
      font-size: 40px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      z-index: 2000;
      cursor: pointer;
      animation: markerBounce 0.6s ease-out;
    `;

    // Add the selected marker
    selectedMarkerRef.current = new ta.Marker({ element: selectedMarkerEl })
      .setLngLat([selectedPlace.longitude, selectedPlace.latitude])
      .addTo(mapInstanceRef.current);

    // Fly to the selected place
    mapInstanceRef.current.flyTo({
      center: [selectedPlace.longitude, selectedPlace.latitude],
      zoom: 16,
      duration: 1000
    });
  }, [selectedPlace]);

  // Resize map when modal opens
  useEffect(() => {
    if (isOpen && mapInstanceRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.resize();
        }
      }, 100);
    }
  }, [isOpen]);

  const handleGetDirections = (place: Place) => {
    // Open Google Maps with directions
    // Use address if available, otherwise use coordinates
    let googleMapsUrl: string;
    
    if (place.address) {
      // Use address for better accuracy
      const encodedAddress = encodeURIComponent(place.address);
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    } else {
      // Fallback to coordinates
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    }
    
    // Open in new tab
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    
    // Also call the callback if provided
    onGetDirections?.(place);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={clsx(
          'fixed inset-0 z-[10000] bg-black bg-opacity-50 flex items-center justify-center p-4',
          className
        )}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Location map
              </h2>
              <p className="text-sm text-gray-500">
                {places.length} places found
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Map Area */}
            <div className="flex-1 relative">
              <div
                ref={mapContainerRef}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
              />
              {places.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center text-gray-500">
                    <MapPinIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No places to display</p>
                  </div>
                </div>
              )}
            </div>

            {/* Places List */}
            <div className="w-72 border-l border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Place list</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {places.map((place, index) => (
                  <motion.div
                    key={place.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={clsx(
                      'p-4 border-b border-gray-100 cursor-pointer transition-colors',
                      selectedPlace?.id === place.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    )}
                    onClick={() => setSelectedPlace(place)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {place.name}
                        </h4>
                        <p className="text-sm text-gray-500 truncate">
                          {place.address}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-blue-600 font-medium">
                            {place.distanceText}
                          </span>
                          <span className="text-xs text-gray-500">
                            {place.durationText}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Place Actions */}
          {selectedPlace && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-t border-gray-200 bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {selectedPlace.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedPlace.address}
                  </p>
                </div>
                <button
                  onClick={() => handleGetDirections(selectedPlace)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  <span>Get directions</span>
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};


