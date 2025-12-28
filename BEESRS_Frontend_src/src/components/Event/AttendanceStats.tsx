import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import eventService from '../../services/eventService';

interface AttendanceStatsProps {
  eventId: string;
  isOrganizer: boolean;
}

const AttendanceStats: React.FC<AttendanceStatsProps> = ({ eventId, isOrganizer }) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOrganizer) {
      fetchStats();
    }
  }, [eventId, isOrganizer]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await eventService.getParticipationStats(eventId);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOrganizer || isLoading || !stats) {
    return null;
  }

  const checkInRate = stats.totalParticipants > 0
    ? (stats.checkedInCount / stats.totalParticipants) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Attendance Statistics
        </CardTitle>
        <CardDescription>Real-time check-in data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.checkedInCount}
            </div>
            <div className="text-xs text-muted-foreground">Checked In</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.noShowCount}
            </div>
            <div className="text-xs text-muted-foreground">No Show</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Check-in Rate</span>
            <span className="font-medium">{checkInRate.toFixed(1)}%</span>
          </div>
          <Progress value={checkInRate} className="h-2" />
        </div>

        {stats.participantDetails && stats.participantDetails.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Participant Details</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {stats.participantDetails.map((participant: any) => (
                <div
                  key={participant.userId}
                  className="flex items-center justify-between p-2 text-sm border rounded"
                >
                  <span>{participant.userName}</span>
                  {participant.hasCheckedIn ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceStats;

