import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import eventService from '../../services/eventService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSubmitSuccess: () => void;
  existingFeedback?: {
    venueRating: number;
    foodRating: number;
    overallRating: number;
    comments?: string;
    suggestions?: string;
    wouldAttendAgain: boolean;
    submittedAt?: string;
  } | null;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSubmitSuccess,
  existingFeedback,
}) => {
  const [venueRating, setVenueRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [wouldAttendAgain, setWouldAttendAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFeedback, setLoadedFeedback] = useState<any>(null);
  const isEditMode = !!existingFeedback || !!loadedFeedback;

  // Load existing feedback data when modal opens
  useEffect(() => {
    if (isOpen) {
      // Always try to load latest feedback when modal opens
      const loadFeedback = async () => {
        try {
          const feedback = await eventService.getEventFeedback(eventId);
          if (feedback) {
            setLoadedFeedback(feedback);
            setVenueRating(feedback.venueRating);
            setFoodRating(feedback.foodRating);
            setOverallRating(feedback.overallRating);
            setComments(feedback.comments || '');
            setSuggestions(feedback.suggestions || '');
            setWouldAttendAgain(feedback.wouldAttendAgain);
          } else if (existingFeedback) {
            // Use passed existingFeedback if API doesn't return
            setLoadedFeedback(existingFeedback);
            setVenueRating(existingFeedback.venueRating);
            setFoodRating(existingFeedback.foodRating);
            setOverallRating(existingFeedback.overallRating);
            setComments(existingFeedback.comments || '');
            setSuggestions(existingFeedback.suggestions || '');
            setWouldAttendAgain(existingFeedback.wouldAttendAgain);
          } else {
            // Reset form for new feedback
            setLoadedFeedback(null);
            setVenueRating(0);
            setFoodRating(0);
            setOverallRating(0);
            setComments('');
            setSuggestions('');
            setWouldAttendAgain(false);
          }
        } catch (error) {
          // If can't load, use existingFeedback prop or reset
          if (existingFeedback) {
            setLoadedFeedback(existingFeedback);
            setVenueRating(existingFeedback.venueRating);
            setFoodRating(existingFeedback.foodRating);
            setOverallRating(existingFeedback.overallRating);
            setComments(existingFeedback.comments || '');
            setSuggestions(existingFeedback.suggestions || '');
            setWouldAttendAgain(existingFeedback.wouldAttendAgain);
          } else {
            setLoadedFeedback(null);
            setVenueRating(0);
            setFoodRating(0);
            setOverallRating(0);
            setComments('');
            setSuggestions('');
            setWouldAttendAgain(false);
          }
        }
      };
      
      loadFeedback();
    } else {
      // Reset when modal closes
      setLoadedFeedback(null);
    }
  }, [isOpen, eventId, existingFeedback]);

  const StarRating: React.FC<{
    rating: number;
    onRatingChange: (rating: number) => void;
    label: string;
  }> = ({ rating, onRatingChange, label }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              } transition-colors`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
        )}
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (venueRating === 0 || foodRating === 0 || overallRating === 0) {
      toast.error('Please provide all ratings');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode) {
        // Update existing feedback
        await eventService.updateEventFeedback(eventId, {
          venueRating,
          foodRating,
          overallRating,
          comments: comments || undefined,
          suggestions: suggestions || undefined,
          wouldAttendAgain,
        });
        toast.success('Feedback updated successfully!');
      } else {
        // Submit new feedback
        try {
          await eventService.submitEventFeedback(eventId, {
            venueRating,
            foodRating,
            overallRating,
            comments: comments || undefined,
            suggestions: suggestions || undefined,
            wouldAttendAgain,
          });
          toast.success('Thank you for your feedback!');
        } catch (submitError: any) {
          // If feedback already exists, try to update instead
          if (submitError.response?.data?.message?.includes('already submitted') || 
              submitError.response?.status === 400) {
            // Load existing feedback and switch to edit mode
            try {
              const existingFeedback = await eventService.getEventFeedback(eventId);
              if (existingFeedback) {
                // Update existing feedback
                await eventService.updateEventFeedback(eventId, {
                  venueRating,
                  foodRating,
                  overallRating,
                  comments: comments || undefined,
                  suggestions: suggestions || undefined,
                  wouldAttendAgain,
                });
                toast.success('Feedback updated successfully!');
              } else {
                throw submitError; // Re-throw if can't load feedback
              }
            } catch (updateError: any) {
              // If update also fails, show error
              throw submitError;
            }
          } else {
            throw submitError; // Re-throw other errors
          }
        }
      }
      
      // Call onSubmitSuccess callback to refresh feedback status
      onSubmitSuccess();
      
      // Small delay to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onClose();
      
      // Reset form
      setVenueRating(0);
      setFoodRating(0);
      setOverallRating(0);
      setComments('');
      setSuggestions('');
      setWouldAttendAgain(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'submit'} feedback`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(isEditMode || loadedFeedback) ? (
              <>
                <Edit className="h-5 w-5" />
                Edit Feedback
              </>
            ) : (
              <>
                <MessageSquare className="h-5 w-5" />
                Event Feedback
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {(isEditMode || loadedFeedback)
              ? 'Update your feedback to help us improve future events.'
              : 'Share your experience and help us improve future events.'}
            {(existingFeedback?.submittedAt || loadedFeedback?.submittedAt) && (
              <span className="block mt-1 text-xs text-gray-500">
                Submitted on {new Date((existingFeedback?.submittedAt || loadedFeedback?.submittedAt) as string).toLocaleDateString()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Venue Rating */}
            <StarRating
              rating={venueRating}
              onRatingChange={setVenueRating}
              label="Venue Rating"
            />

            {/* Food Rating */}
            <StarRating
              rating={foodRating}
              onRatingChange={setFoodRating}
              label="Food Rating"
            />

            {/* Overall Rating */}
            <StarRating
              rating={overallRating}
              onRatingChange={setOverallRating}
              label="Overall Rating"
            />

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setComments(event.target.value)}
                placeholder="Share your thoughts about the event..."
                rows={4}
              />
            </div>

            {/* Suggestions */}
            <div className="space-y-2">
              <Label htmlFor="suggestions">Suggestions (Optional)</Label>
              <Textarea
                id="suggestions"
                value={suggestions}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setSuggestions(event.target.value)}
                placeholder="Any suggestions for improvement?"
                rows={3}
              />
            </div>

            {/* Would Attend Again */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="wouldAttendAgain"
                checked={wouldAttendAgain}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setWouldAttendAgain(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="wouldAttendAgain" className="cursor-pointer">
                I would attend this type of event again
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? (isEditMode ? 'Updating...' : 'Submitting...') 
                : (isEditMode ? 'Update Feedback' : 'Submit Feedback')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;

