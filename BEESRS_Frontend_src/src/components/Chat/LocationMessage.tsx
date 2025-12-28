import React, { useEffect, useState } from 'react';
import { MapPin, ExternalLink, Loader2 } from 'lucide-react';
import { reverseGeocode, parseLocationFromMessage, type ReverseGeocodeResult } from '../../utils/geocoding';

interface LocationMessageProps {
  message: string;
  isMine: boolean;
  timestamp: string;
}

export const LocationMessage: React.FC<LocationMessageProps> = ({
  message,
  isMine,
  timestamp
}) => {
  const [addressData, setAddressData] = useState<ReverseGeocodeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [caption, setCaption] = useState<string>('');

  useEffect(() => {
    const coords = parseLocationFromMessage(message);
    if (coords) {
      setCoordinates(coords);
      setIsLoading(true);
      
      // Extract caption if exists (text after "\n\n")
      const parts = message.split('\n\n');
      if (parts.length > 1) {
        setCaption(parts.slice(1).join('\n\n'));
      }
      
      // Fetch detailed address
      reverseGeocode(coords.latitude, coords.longitude)
        .then((result) => {
          setAddressData(result);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to reverse geocode:', error);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [message]);

  const openInGoogleMaps = () => {
    if (coordinates) {
      const url = `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
      window.open(url, '_blank');
    }
  };

  const getDirections = () => {
    if (coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`;
      window.open(url, '_blank');
    }
  };

  if (!coordinates) {
    // If no coordinates found, display as regular text message
    return (
      <>
        <p className="text-sm break-words px-4 py-3">{message}</p>
        <p
          className={`text-xs px-4 pb-3 ${
            isMine ? 'text-white/70' : 'text-gray-500'
          }`}
        >
          {timestamp}
        </p>
      </>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-2 mb-2">
        <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isMine ? 'text-white/90' : 'text-green-600'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1">
            📍 Địa điểm
          </p>
          {isLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Đang tải địa chỉ...</span>
            </div>
          ) : addressData ? (
            <div className="space-y-1">
              {/* Display house number and street name prominently if available */}
              {(addressData.houseNumber || addressData.streetName) && (
                <p className="text-sm break-words leading-relaxed font-semibold">
                  {[addressData.houseNumber, addressData.streetName].filter(Boolean).join(' ')}
                </p>
              )}
              {/* Display full address */}
              <p className="text-sm break-words leading-relaxed">
                {addressData.address}
              </p>
              {(addressData.ward || addressData.district || addressData.city) && (
                <div className="text-xs opacity-80 mt-1 space-y-0.5">
                  {addressData.ward && <p>Phường/Xã: {addressData.ward}</p>}
                  {addressData.district && <p>Quận/Huyện: {addressData.district}</p>}
                  {addressData.city && <p>Thành phố/Tỉnh: {addressData.city}</p>}
                </div>
              )}
              <div className="text-xs opacity-70 mt-2 font-mono">
                Tọa độ: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
              </div>
            </div>
          ) : (
            <p className="text-sm break-words">
              {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </p>
          )}
          {caption && (
            <div className="mt-3 pt-3 border-t border-current/10">
              <p className="text-sm break-words leading-relaxed">
                {caption}
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 mt-3">
        <button
          onClick={getDirections}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isMine
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
          }`}
        >
          <ExternalLink className="w-3 h-3" />
          Chỉ đường
        </button>
        <button
          onClick={openInGoogleMaps}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isMine
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-green-50 hover:bg-green-100 text-green-600'
          }`}
        >
          <MapPin className="w-3 h-3" />
          Xem bản đồ
        </button>
      </div>
      
      <p
        className={`text-xs mt-2 ${
          isMine ? 'text-white/70' : 'text-gray-500'
        }`}
      >
        {timestamp}
      </p>
    </div>
  );
};

