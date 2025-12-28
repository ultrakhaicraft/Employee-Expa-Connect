import React, { useState } from 'react';
import { CheckCircle, MapPin, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import eventService from '../../services/eventService';

interface CheckInButtonProps {
  eventId: string;
  onCheckedIn?: () => void;
  isCheckedIn?: boolean;
  venueLocation?: {
    latitude: number;
    longitude: number;
  };
  checkInRadiusMeters?: number; // Default 200 meters
}

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

const CheckInButton: React.FC<CheckInButtonProps> = ({
  eventId,
  onCheckedIn,
  isCheckedIn = false,
  venueLocation,
  checkInRadiusMeters = 200, // Default 200 meters
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);

  const handleCheckIn = async (useLocation: boolean = false) => {
    setIsLoading(true);
    
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (useLocation) {
        setIsCheckingLocation(true);
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });
          
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;

          // Validate location if venue location is provided
          if (venueLocation && latitude && longitude) {
            const distance = calculateDistance(
              latitude,
              longitude,
              venueLocation.latitude,
              venueLocation.longitude
            );

            if (distance > checkInRadiusMeters) {
              toast.error(
                `Bạn đang cách địa điểm ${Math.round(distance)}m. Vui lòng đến gần địa điểm trong bán kính ${checkInRadiusMeters}m để check-in.`
              );
              setIsLoading(false);
              setIsCheckingLocation(false);
              return;
            }

            toast.success(`Bạn đang ở cách địa điểm ${Math.round(distance)}m. Check-in thành công!`);
          } else if (venueLocation) {
            // Venue location is required for location-based check-in
            toast.error('Không thể xác định vị trí của bạn. Vui lòng thử lại hoặc sử dụng check-in thủ công.');
            setIsLoading(false);
            setIsCheckingLocation(false);
            return;
          }
        } catch (geoError) {
          toast.error('Không thể lấy vị trí của bạn. Vui lòng sử dụng check-in thủ công.');
          setIsLoading(false);
          setIsCheckingLocation(false);
          return;
        } finally {
          setIsCheckingLocation(false);
        }
      }

      await eventService.checkInEvent(
        eventId,
        latitude,
        longitude,
        useLocation ? 'location' : 'manual'
      );

      toast.success('Checked in successfully!');
      if (onCheckedIn) {
        onCheckedIn();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to check in';
      
      // If already checked in, update state to hide button
      if (errorMessage.toLowerCase().includes('already checked in')) {
        if (onCheckedIn) {
          onCheckedIn();
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Hide completely if already checked in
  if (isCheckedIn) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={() => handleCheckIn(false)}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading && !isCheckingLocation ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Checking In...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Check In
          </>
        )}
      </Button>
      
      <Button
        onClick={() => handleCheckIn(true)}
        disabled={isLoading || !venueLocation}
        variant="outline"
        className="w-full"
        title={!venueLocation ? 'Venue location is not available. Please use manual check-in.' : undefined}
      >
        {isCheckingLocation ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Getting Location...
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4 mr-2" />
            Check In with Location
            {!venueLocation && (
              <span className="ml-2 text-xs opacity-70">(Not available)</span>
            )}
          </>
        )}
      </Button>
    </div>
  );
};

export default CheckInButton;

