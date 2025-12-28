import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { BarChart3, Calendar, CheckCircle, XCircle, Clock, Star } from 'lucide-react';

interface OrganizerAnalyticsProps {
  analytics: {
    organizerId: string;
    totalEvents: number;
    completedEvents: number;
    cancelledEvents: number;
    upcomingEvents: number;
    averageAttendanceRate: number;
    averageRating: number;
    totalParticipants: number;
    totalUniqueParticipants: number;
    eventsByType: Record<string, number>;
    eventsByStatus: Record<string, number>;
  };
}

const OrganizerAnalyticsCard: React.FC<OrganizerAnalyticsProps> = ({ analytics }) => {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{analytics.totalEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{analytics.completedEvents}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.upcomingEvents}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{analytics.cancelledEvents}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Attendance</span>
                <span className="text-sm font-semibold">{analytics.averageAttendanceRate.toFixed(1)}%</span>
              </div>
              <Progress value={analytics.averageAttendanceRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold">
                    {analytics.averageRating > 0 ? analytics.averageRating.toFixed(1) : 'N/A'}
                  </span>
                </div>
              </div>
              <Progress value={(analytics.averageRating / 5) * 100} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Unique Participants</span>
                <span className="text-sm font-semibold">{analytics.totalUniqueParticipants}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Total: {analytics.totalParticipants}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events by Type */}
      {Object.keys(analytics.eventsByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Events by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.eventsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{type}</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(count / analytics.totalEvents) * 100} 
                      className="w-32 h-2" 
                    />
                    <span className="text-sm font-semibold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events by Status */}
      {Object.keys(analytics.eventsByStatus).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Events by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.eventsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(count / analytics.totalEvents) * 100} 
                      className="w-32 h-2" 
                    />
                    <span className="text-sm font-semibold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrganizerAnalyticsCard;

