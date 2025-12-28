import React, { useState } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface CancelEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  eventTitle?: string;
}

const CancelEventModal: React.FC<CancelEventModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  eventTitle,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MIN_LENGTH = 10;
  const MAX_LENGTH = 500;
  const currentLength = reason.trim().length;
  const isValidLength = currentLength >= MIN_LENGTH && currentLength <= MAX_LENGTH;

  const getValidationError = (): string | null => {
    if (!reason.trim()) {
      return 'Please provide a reason for cancellation';
    }
    if (currentLength < MIN_LENGTH) {
      return `Reason must be at least ${MIN_LENGTH} characters (${currentLength}/${MIN_LENGTH})`;
    }
    if (currentLength > MAX_LENGTH) {
      return `Reason must not exceed ${MAX_LENGTH} characters (${currentLength}/${MAX_LENGTH})`;
    }
    return null;
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    // Clear server errors when user types (keep validation errors)
    if (error) {
      // Only clear if it's a server error (doesn't contain validation keywords)
      if (!error.includes('characters') && !error.includes('at least') && !error.includes('not exceed')) {
        setError(null);
      }
    }
  };

  const displayError = (): string | null => {
    // Only show validation errors if user has typed something
    if (reason.trim().length > 0) {
      const validationError = getValidationError();
      if (validationError) {
        return validationError;
      }
    }
    // Show server error (from API response)
    return error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm(reason.trim());
      // Reset form on success
      setReason('');
      onClose();
    } catch (err: any) {
      // Extract error message from response
      const errorMessage = err.response?.data?.message || err.message || 'Failed to cancel event';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gray-700">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                Cancel Event
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-1">
                {eventTitle && (
                  <span className="block">Event: {eventTitle}</span>
                )}
                This action cannot be undone. Please provide a reason for cancellation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-gray-300">
              Cancellation Reason <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              placeholder="Please explain why you are cancelling this event (minimum 10 characters)..."
              className={`min-h-[120px] bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 resize-none ${
                reason.trim() && !isValidLength ? 'border-red-500 focus:border-red-500' : ''
              }`}
              disabled={loading}
              required
            />
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {displayError() && (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{displayError()}</span>
                  </div>
                )}
              </div>
              <div className={`text-xs ml-2 ${isValidLength ? 'text-gray-400' : currentLength < MIN_LENGTH ? 'text-yellow-400' : 'text-red-400'}`}>
                {currentLength}/{MAX_LENGTH}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Keep Event
            </Button>
            <Button
              type="submit"
              disabled={loading || !isValidLength}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CancelEventModal;




