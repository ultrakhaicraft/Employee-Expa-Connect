import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { AlertTriangle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import eventService from '../../services/eventService';
import { checkConflictWithParticipatingEvents, formatConflictingEvents } from '../../utils/eventConflictChecker';
import type { EventResponse } from '../../types/event.types';

interface EventTemplate {
  templateId: string;
  templateName: string;
  title: string;
  eventType: string;
  estimatedDuration?: number;
}

interface CreateEventFromTemplateModalProps {
  template: EventTemplate;
  open: boolean;
  onClose: () => void;
  onCreate: (scheduledDate: string, scheduledTime: string) => Promise<void>;
}

const CreateEventFromTemplateModal: React.FC<CreateEventFromTemplateModalProps> = ({
  template,
  open,
  onClose,
  onCreate,
}) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{ hasConflict: boolean; conflictingEvents: EventResponse[] } | null>(null);
  const [participatingEvents, setParticipatingEvents] = useState<EventResponse[]>([]);

  // Load participating events when modal opens
  useEffect(() => {
    if (open) {
      loadParticipatingEvents();
    }
  }, [open]);

  // Check conflicts when date/time changes
  useEffect(() => {
    if (scheduledDate && scheduledTime && participatingEvents.length > 0) {
      checkConflicts();
    } else {
      setConflictInfo(null);
    }
  }, [scheduledDate, scheduledTime, participatingEvents]);

  const loadParticipatingEvents = async () => {
    try {
      const events = await eventService.getParticipatingEvents();
      // Filter only upcoming events (not cancelled, not draft)
      const upcomingEvents = events.filter(e => 
        e.status !== 'cancelled' && 
        e.status !== 'draft' &&
        new Date(`${e.scheduledDate}T${e.scheduledTime}`) >= new Date()
      );
      setParticipatingEvents(upcomingEvents);
    } catch (error) {
      console.error('Failed to load participating events:', error);
    }
  };

  const checkConflicts = async () => {
    if (!scheduledDate || !scheduledTime) {
      setConflictInfo(null);
      return;
    }

    setCheckingConflict(true);
    try {
      const conflict = checkConflictWithParticipatingEvents(
        scheduledDate,
        scheduledTime,
        template.estimatedDuration,
        participatingEvents
      );
      setConflictInfo(conflict);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scheduledDate || !scheduledTime) {
      return;
    }

    // Validate time range (7:00 AM - 10:00 PM)
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;
    const minMinutes = 7 * 60; // 7:00 AM
    const maxMinutes = 22 * 60; // 10:00 PM (22:00)
    
    if (totalMinutes < minMinutes || totalMinutes > maxMinutes) {
      toast.error("Time must be between 7:00 AM and 10:00 PM");
      return;
    }

    // Check for conflicts before creating
    if (conflictInfo?.hasConflict) {
      const confirmMessage = `This event conflicts with ${formatConflictingEvents(conflictInfo.conflictingEvents)}. Do you still want to create it?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    try {
      setLoading(true);
      await onCreate(scheduledDate, scheduledTime);
    } catch (error) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Event from Template</DialogTitle>
          <DialogDescription>
            Create a new event using the template "{template.templateName}"
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={template.title}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Input
                id="eventType"
                value={template.eventType}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Scheduled Date *</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledTime">Scheduled Time *</Label>
              <Input
                id="scheduledTime"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min="07:00"
                max="22:00"
                required
              />
            </div>

            {/* Conflict Warning */}
            {checkingConflict && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 animate-pulse" />
                Checking for conflicts...
              </div>
            )}

            {conflictInfo?.hasConflict && !checkingConflict && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Time Conflict Detected!</strong>
                  <br />
                  This event conflicts with: {formatConflictingEvents(conflictInfo.conflictingEvents)}
                  <br />
                  <span className="text-xs mt-1 block">You can still create the event, but you may not be able to attend both.</span>
                </AlertDescription>
              </Alert>
            )}

            {conflictInfo && !conflictInfo.hasConflict && !checkingConflict && scheduledDate && scheduledTime && (
              <Alert className="border-green-200 bg-green-50">
                <Calendar className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  No conflicts detected with your participating events.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !scheduledDate || !scheduledTime || checkingConflict}
              className={conflictInfo?.hasConflict ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              {loading ? 'Creating...' : conflictInfo?.hasConflict ? 'Create Anyway' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventFromTemplateModal;

