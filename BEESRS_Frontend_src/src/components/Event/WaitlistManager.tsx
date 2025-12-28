import React, { useState, useEffect } from 'react';
import { Users, ArrowUp, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import eventService from '../../services/eventService';
import { format } from 'date-fns';

interface WaitlistManagerProps {
  eventId: string;
  isOrganizer: boolean;
  maxAttendees?: number;
  currentAttendees: number;
}

interface WaitlistItem {
  waitlistId: string;
  userId: string;
  userName: string;
  joinedAt: string;
  status: string;
  priority: number;
  notes?: string;
}

const WaitlistManager: React.FC<WaitlistManagerProps> = ({
  eventId,
  isOrganizer,
  maxAttendees,
  currentAttendees,
}) => {
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    if (maxAttendees && currentAttendees >= maxAttendees) {
      setIsFull(true);
    }
    fetchWaitlist();
  }, [eventId, maxAttendees, currentAttendees]);

  const fetchWaitlist = async () => {
    try {
      const data = await eventService.getEventWaitlist(eventId);
      setWaitlist(data);
    } catch (error: any) {
      if (error.response?.status !== 403) {
        console.error('Failed to fetch waitlist:', error);
      }
    }
  };

  const handlePromote = async (userId: string) => {
    setIsLoading(true);
    try {
      await eventService.promoteFromWaitlist(eventId, userId);
      toast.success('User promoted successfully!');
      fetchWaitlist();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to promote user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setIsLoading(true);
    try {
      await eventService.joinWaitlist(eventId);
      toast.success('Added to waitlist!');
      fetchWaitlist();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to join waitlist');
    } finally {
      setIsLoading(false);
    }
  };

  const waitingList = waitlist.filter((item) => item.status === 'waiting');

  if (!isOrganizer && !isFull) {
    return null; // Don't show waitlist if event is not full
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Waitlist
        </CardTitle>
        <CardDescription>
          {isFull
            ? `Event is full. ${waitingList.length} people waiting.`
            : `${waitingList.length} people on waitlist`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOrganizer && isFull && (
          <Button
            onClick={handleJoinWaitlist}
            disabled={isLoading}
            className="w-full"
          >
            Join Waitlist
          </Button>
        )}

        {waitingList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No one on the waitlist
          </p>
        ) : (
          <div className="space-y-2">
            {waitingList.map((item, index) => (
              <div
                key={item.waitlistId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    <span className="text-sm font-medium">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{item.userName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Joined {format(new Date(item.joinedAt), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                    )}
                  </div>
                </div>
                {isOrganizer && (
                  <Button
                    size="sm"
                    onClick={() => handlePromote(item.userId)}
                    disabled={isLoading}
                  >
                    <ArrowUp className="h-4 w-4 mr-1" />
                    Promote
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WaitlistManager;

