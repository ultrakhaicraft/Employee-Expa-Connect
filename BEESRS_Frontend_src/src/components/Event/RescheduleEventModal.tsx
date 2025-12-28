import React, { useState } from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import eventService from '../../services/eventService';
import { format } from 'date-fns';

interface RescheduleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  currentDate: string;
  currentTime: string;
  onRescheduled: () => void;
}

const RescheduleEventModal: React.FC<RescheduleEventModalProps> = ({
  isOpen,
  onClose,
  eventId,
  currentDate,
  currentTime,
  onRescheduled,
}) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDate || !newTime) {
      toast.error('Please select both date and time');
      return;
    }

    setIsLoading(true);
    try {
      await eventService.rescheduleEvent(eventId, newDate, newTime, reason);
      toast.success('Event rescheduled successfully!');
      onRescheduled();
      onClose();
      // Reset form
      setNewDate('');
      setNewTime('');
      setReason('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reschedule event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reschedule Event
          </DialogTitle>
          <DialogDescription>
            Update the date and time for this event. All participants will be notified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Current Schedule */}
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Current Schedule</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(currentDate), 'EEEE, MMMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4" />
                <span>{currentTime}</span>
              </div>
            </div>

            {/* New Date */}
            <div className="space-y-2">
              <Label htmlFor="newDate">
                New Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewDate(event.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* New Time */}
            <div className="space-y-2">
              <Label htmlFor="newTime">
                New Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newTime"
                type="time"
                value={newTime}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewTime(event.target.value)}
                required
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value)}
                placeholder="Explain why you're rescheduling this event..."
                rows={3}
              />
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                All participants will receive an email notification about this change.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Rescheduling...' : 'Reschedule Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleEventModal;

