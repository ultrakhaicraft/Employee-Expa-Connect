import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { BarChart3, Users, CheckCircle, Star, TrendingUp, Share2, MessageSquare } from 'lucide-react';

interface EventAnalyticsProps {
  analytics: {
    eventId: string;
    eventTitle: string;
    totalInvited: number;
    totalAccepted: number;
    totalDeclined: number;
    totalPending: number;
    totalCheckedIn: number;
    totalNoShow: number;
    acceptanceRate: number;
    checkInRate: number;
    averageVenueRating: number;
    averageFoodRating: number;
    averageOverallRating: number;
    totalFeedbacks: number;
    wouldAttendAgainPercentage: number;
    totalVotes: number;
    totalShares: number;
  };
}

const EventAnalyticsCard: React.FC<EventAnalyticsProps> = ({ analytics }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Event Analytics
        </CardTitle>
        <CardDescription>Detailed statistics for {analytics.eventTitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Participation Stats */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide">Participation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Invited
              </div>
              <div className="text-2xl font-bold">{analytics.totalInvited}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Accepted
              </div>
              <div className="text-2xl font-bold text-green-600">{analytics.totalAccepted}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                Checked In
              </div>
              <div className="text-2xl font-bold text-blue-600">{analytics.totalCheckedIn}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-orange-500" />
                No Show
              </div>
              <div className="text-2xl font-bold text-orange-600">{analytics.totalNoShow}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Acceptance Rate</span>
              <span className="font-semibold">{analytics.acceptanceRate.toFixed(1)}%</span>
            </div>
            <Progress value={analytics.acceptanceRate} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Check-in Rate</span>
              <span className="font-semibold">{analytics.checkInRate.toFixed(1)}%</span>
            </div>
            <Progress value={analytics.checkInRate} className="h-2" />
          </div>
        </div>

        {/* Ratings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide">Ratings</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Venue</div>
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold">
                  {analytics.averageVenueRating > 0 ? analytics.averageVenueRating.toFixed(1) : 'N/A'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Food</div>
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold">
                  {analytics.averageFoodRating > 0 ? analytics.averageFoodRating.toFixed(1) : 'N/A'}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Overall</div>
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold">
                  {analytics.averageOverallRating > 0 ? analytics.averageOverallRating.toFixed(1) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          
          {analytics.totalFeedbacks > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Would Attend Again</span>
                <span className="font-semibold">{analytics.wouldAttendAgainPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={analytics.wouldAttendAgainPercentage} className="h-2" />
            </div>
          )}
        </div>

        {/* Engagement */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide">Engagement</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                Feedbacks
              </div>
              <div className="text-2xl font-bold">{analytics.totalFeedbacks}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Votes
              </div>
              <div className="text-2xl font-bold">{analytics.totalVotes}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Share2 className="h-4 w-4" />
                Shares
              </div>
              <div className="text-2xl font-bold">{analytics.totalShares}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventAnalyticsCard;

