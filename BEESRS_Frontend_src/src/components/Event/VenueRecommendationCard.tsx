import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  MapPin, 
  Star, 
  DollarSign, 
  Navigation, 
  Clock, 
  ThumbsUp, 
  ThumbsDown,
  Sparkles,
  CheckCircle,
  MessageSquare,
  ExternalLink,
  Plus,
  Phone,
  Globe,
  AlertCircle,
  Clock as ClockIcon,
  XCircle,
  Eye,
  ZoomIn,
  X
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type { VenueOptionResponse, VoteStatisticsResponse } from '../../types/event.types';
import { PlaceDistanceBadge } from './PlaceDistanceBadge';
import ViewReviewsModal from '../../pages/User/ViewProfile/ViewPlace/ViewReviewsModal';

interface VenueRecommendationCardProps {
  recommendation: VenueOptionResponse;
  onVote?: (optionId: string, voteValue: number, comment?: string) => void;
  onFinalize?: (optionId: string) => void;
  onAddToSystem?: (optionId: string) => void;
  voteStats?: VoteStatisticsResponse | null;
}

const VenueRecommendationCard: React.FC<VenueRecommendationCardProps> = ({
  recommendation,
  onVote,
  onFinalize,
  onAddToSystem,
  voteStats
}) => {
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [voteValue, setVoteValue] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isViewReviewsOpen, setIsViewReviewsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Get current user ID from Redux
  const authState = useSelector((state: any) => state.auth);
  const currentUserId = authState.decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || 
    (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}')?.userId : null);

  const voteCount = voteStats?.venueVotes.find(v => v.optionId === recommendation.optionId)?.voteScore || 0;
  
  // Check if this is an external place (not yet in system)
  const isExternalPlace = !recommendation.placeId && recommendation.externalProvider;
  const isInternalPlace = !!recommendation.placeId;
  
  // Verification status (only for internal places)
  const verificationStatus = recommendation.verificationStatus;
  const isPending = verificationStatus === 'Pending';
  const isRejected = verificationStatus === 'Rejected';
  const isApproved = verificationStatus === 'Approved';
  
  // Business rules based on PlaceVerificationStatus enum:
  // - Pending (0): Can vote, but cannot finalize (needs moderator approval)
  // - Approved (1): Can vote and can finalize ✅
  // - Rejected (2): Cannot vote and cannot finalize ❌
  // - External places (null): Need to be added to system first
  const canVote = !isRejected && onVote; // Pending and Approved can vote
  const canFinalize = isApproved && onFinalize; // Only Approved places can be finalized
  
  // Display data: prioritize system data if available, otherwise use external data
  // If placeId exists, use ONLY internal data (from system)
  // If no placeId, use ONLY external data (from TrackAsia)
  const displayName = isInternalPlace 
    ? (recommendation.placeName || 'Unknown Place')
    : (recommendation.externalPlaceName || 'Unknown Place');
  const displayAddress = isInternalPlace
    ? (recommendation.placeAddress || '')
    : (recommendation.externalAddress || '');
  const displayRating = isInternalPlace
    ? (recommendation.averageRating || 0)
    : (recommendation.externalRating || 0);
  const displayReviews = isInternalPlace
    ? (recommendation.totalReviews || 0)
    : (recommendation.externalTotalReviews || 0);
  const displayCategory = isInternalPlace
    ? recommendation.placeCategory
    : recommendation.externalCategory;

  // Distance data from TrackAsia API (if calculated)
  const hasDistance = 'distance' in recommendation && recommendation.distance !== undefined;
  const distance = hasDistance ? (recommendation as any).distance : undefined;
  const duration = hasDistance ? (recommendation as any).duration : undefined;
  const distanceText = hasDistance ? (recommendation as any).distanceText : undefined;
  const durationText = hasDistance ? (recommendation as any).durationText : undefined;

  const handleVoteSubmit = () => {
    if (onVote) {
      onVote(recommendation.optionId, voteValue, comment || undefined);
      setShowVoteForm(false);
      setComment('');
    }
  };

  const handleUpvote = (rating: number) => {
    setVoteValue(rating);
  };

  // Get image URL - prioritize system place image, fallback to external photo
  const displayImageUrl = isInternalPlace 
    ? recommendation.placeImageUrl 
    : recommendation.externalWebsiteUrl; // TrackAsia places might have ExternalPhotoUrl

  return (
    <Card className={`hover:shadow-xl transition-all duration-300 ${
      isInternalPlace && isApproved 
        ? 'border-2 border-green-200 bg-gradient-to-br from-white to-green-50/30' 
        : 'hover:shadow-lg'
    }`}>
      {/* Image Section - Only for System Places */}
      {isInternalPlace && displayImageUrl && (
        <div 
          className="relative w-full h-48 overflow-hidden rounded-t-lg cursor-pointer group"
          onClick={() => setPreviewImage(displayImageUrl)}
        >
          <img 
            src={displayImageUrl} 
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* Overlay on hover - behind badges */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center pointer-events-none">
            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          {/* Badges - above overlay with z-index */}
          <div className="absolute top-2 right-2 flex gap-2 z-10 pointer-events-none">
            {isApproved && (
              <Badge className="bg-green-600 text-white shadow-lg">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            {recommendation.aiScore && recommendation.aiScore >= 85 && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg">
                <Sparkles className="h-3 w-3 mr-1" />
                Top Pick
              </Badge>
            )}
          </div>
        </div>
      )}
      
      <CardHeader className={isInternalPlace && displayImageUrl ? 'pt-4' : ''}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className={`${isInternalPlace ? 'text-2xl' : 'text-xl'} mb-2 flex items-center flex-wrap gap-2 font-bold`}>
              {displayName}
              {recommendation.aiScore && recommendation.aiScore >= 85 && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Top Pick
                </Badge>
              )}
              {isInternalPlace && (
                <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  System
                </Badge>
              )}
              {isExternalPlace && (
                <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {recommendation.externalProvider}
                </Badge>
              )}
              {/* Verification Status Badges (only for internal places) */}
              {isInternalPlace && isPending && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  Pending Approval
                </Badge>
              )}
              {isInternalPlace && isRejected && (
                <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
                  <XCircle className="h-3 w-3 mr-1" />
                  Rejected
                </Badge>
              )}
              {isInternalPlace && isApproved && (
                <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              )}
            </CardTitle>
            {displayAddress && (
              <p className="text-sm text-gray-600 flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {displayAddress}
              </p>
            )}
            {/* Distance Badge */}
            {hasDistance && distance !== undefined && (
              <div className="mt-2">
                <PlaceDistanceBadge
                  distance={distance}
                  duration={duration}
                  distanceText={distanceText}
                  durationText={durationText}
                  variant="default"
                />
              </div>
            )}
          </div>
          {recommendation.aiScore && (
            <div className="text-center ml-4">
              <div className="text-3xl font-bold text-blue-600">
                {recommendation.aiScore.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">AI Score</div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className={`space-y-4 ${isInternalPlace ? 'bg-white/50' : ''}`}>
        {/* Enhanced Key Metrics for System Places */}
        {isInternalPlace ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            {displayRating > 0 && (
              <button
                onClick={() => isInternalPlace && recommendation.placeId && setIsViewReviewsOpen(true)}
                disabled={!isInternalPlace || !recommendation.placeId}
                className={`flex items-center space-x-2 bg-white/80 p-2 rounded-lg shadow-sm transition-all w-full text-left ${
                  isInternalPlace && recommendation.placeId 
                    ? 'hover:bg-white hover:shadow-md cursor-pointer active:scale-95 disabled:hover:bg-white/80 disabled:hover:shadow-sm' 
                    : 'cursor-default opacity-75'
                }`}
                title={isInternalPlace && recommendation.placeId ? 'Click to view reviews' : 'Reviews not available'}
              >
                <Star className="h-5 w-5 text-yellow-500 flex-shrink-0" fill="currentColor" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{displayRating.toFixed(1)}/5</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-gray-600 truncate">{displayReviews} {displayReviews === 1 ? 'review' : 'reviews'}</p>
                    {isInternalPlace && recommendation.placeId && (
                      <Eye className="h-3 w-3 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </button>
            )}

            {recommendation.estimatedCostPerPerson && (
              <div className="flex items-center space-x-2 bg-white/80 p-2 rounded-lg shadow-sm">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    ${recommendation.estimatedCostPerPerson.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">per person</p>
                </div>
              </div>
            )}

            {recommendation.averageDistance && (
              <div className="flex items-center space-x-2 bg-white/80 p-2 rounded-lg shadow-sm">
                <Navigation className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{recommendation.averageDistance.toFixed(1)} km</p>
                  <p className="text-xs text-gray-600">avg distance</p>
                </div>
              </div>
            )}

            {recommendation.averageDuration && (
              <div className="flex items-center space-x-2 bg-white/80 p-2 rounded-lg shadow-sm">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{recommendation.averageDuration} min</p>
                  <p className="text-xs text-gray-600">travel time</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Standard metrics for external places
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {displayRating > 0 && (
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
                <div>
                  <p className="text-sm font-medium">{displayRating.toFixed(1)}/5</p>
                  <p className="text-xs text-gray-500">{displayReviews} reviews</p>
                </div>
              </div>
            )}

            {recommendation.estimatedCostPerPerson && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">
                    {recommendation.estimatedCostPerPerson.toLocaleString()} USD
                  </p>
                  <p className="text-xs text-gray-500">per person</p>
                </div>
              </div>
            )}

            {recommendation.averageDistance && (
              <div className="flex items-center space-x-2">
                <Navigation className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">{recommendation.averageDistance.toFixed(1)} km</p>
                  <p className="text-xs text-gray-500">avg distance</p>
                </div>
              </div>
            )}

            {recommendation.averageDuration && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">{recommendation.averageDuration} min</p>
                  <p className="text-xs text-gray-500">travel time</p>
                </div>
              </div>
            )}
          </div>
        )}

        {displayCategory && (
          <div>
            <Badge variant="secondary">
              {displayCategory}
            </Badge>
          </div>
        )}

        {/* External place additional info */}
        {isExternalPlace && (
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {recommendation.externalPhoneNumber && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                <a 
                  href={`tel:${recommendation.externalPhoneNumber}`}
                  className="hover:text-blue-600"
                >
                  {recommendation.externalPhoneNumber}
                </a>
              </div>
            )}
            {recommendation.externalWebsiteUrl && (
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-1" />
                <a 
                  href={recommendation.externalWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600"
                >
                  Website
                </a>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Verification Status Warning */}
        {isInternalPlace && isPending && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Awaiting Moderator Approval</p>
                <p className="text-xs text-yellow-700 mt-1">
                  This place is pending verification. You can vote, but cannot finalize until it's approved by a moderator.
                </p>
              </div>
            </div>
          </div>
        )}
        {isInternalPlace && isRejected && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Place Rejected</p>
                <p className="text-xs text-red-700 mt-1">
                  This place has been rejected by a moderator and cannot be used for this event.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Reasoning */}
        {recommendation.aiReasoning && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-900 mb-1">AI Insight</p>
                <p className="text-sm text-gray-700">{recommendation.aiReasoning}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pros & Cons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendation.pros && recommendation.pros.length > 0 && (
            <div>
              <p className="text-sm font-medium text-green-700 mb-2 flex items-center">
                <ThumbsUp className="h-4 w-4 mr-1" />
                Pros
              </p>
              <ul className="space-y-1">
                {recommendation.pros.map((pro, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendation.cons && recommendation.cons.length > 0 && (
            <div>
              <p className="text-sm font-medium text-orange-700 mb-2 flex items-center">
                <ThumbsDown className="h-4 w-4 mr-1" />
                Considerations
              </p>
              <ul className="space-y-1">
                {recommendation.cons.map((con, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="text-orange-600 mr-2">⚠</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Vote Count */}
        {voteStats && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Team Votes</span>
              <Badge variant="outline" className="text-lg font-bold">
                {voteCount}
              </Badge>
            </div>
          </div>
        )}

        {/* Voting Form */}
        {showVoteForm && canVote && (
          <div className="border-t pt-4 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Rate this venue:</p>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={voteValue === rating ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleUpvote(rating)}
                  >
                    {rating} ⭐
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Comment (optional):</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about this venue..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={handleVoteSubmit}
                disabled={voteValue === 0}
                size="sm"
                className="flex-1"
              >
                Submit Vote
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowVoteForm(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        {/* Add to System button for external places */}
        {isExternalPlace && onAddToSystem && (
          <Button 
            variant="default"
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 border-0"
            onClick={() => onAddToSystem(recommendation.optionId)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add to System
          </Button>
        )}

        {canVote && !showVoteForm && (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setShowVoteForm(true)}
            disabled={isRejected}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Vote
          </Button>
        )}
        {!canVote && isRejected && (
          <Button 
            variant="outline" 
            className="flex-1"
            disabled
            title="Cannot vote for rejected places"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Vote (Disabled)
          </Button>
        )}

        {canFinalize && (
          <Button 
            variant="default"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => onFinalize(recommendation.optionId)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Select This Venue
          </Button>
        )}
        {onFinalize && !canFinalize && isInternalPlace && (
          <Button 
            variant="default"
            className="flex-1 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
            disabled
            title={
              isPending 
                ? "Cannot finalize: Place is pending moderator approval" 
                : isRejected 
                ? "Cannot finalize: Place has been rejected" 
                : "Cannot finalize: Place must be approved by moderator"
            }
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Select This Venue (Disabled)
          </Button>
        )}
      </CardFooter>
      
      {/* View Reviews Modal - Only for system places */}
      {isInternalPlace && recommendation.placeId && (
        <ViewReviewsModal
          isOpen={isViewReviewsOpen}
          onClose={() => setIsViewReviewsOpen(false)}
          placeId={recommendation.placeId}
          placeName={displayName}
          currentUserId={currentUserId}
        />
      )}
      
      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => {
        if (!open) {
          setPreviewImage(null);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden rounded-2xl">
          <div className="flex flex-col h-full">
            <DialogHeader className="flex flex-row items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50 space-y-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">Image Preview</DialogTitle>
                  <p className="text-sm text-gray-600 mt-0.5">{displayName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-gray-400 hover:text-gray-600 transition-all duration-200 rounded-full p-2 hover:bg-white hover:scale-110"
                aria-label="Close preview"
              >
                <X className="w-6 h-6" />
              </button>
            </DialogHeader>

            <div className="flex-1 bg-gray-50 p-8 overflow-auto flex items-center justify-center">
              {previewImage && (
                <img
                  src={previewImage}
                  alt={displayName}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VenueRecommendationCard;

















