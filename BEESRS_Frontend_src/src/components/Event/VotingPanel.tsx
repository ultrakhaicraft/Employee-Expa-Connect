import React from 'react';
import { TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import type { VoteStatisticsResponse } from '../../types/event.types';

interface VotingPanelProps {
  voteStats: VoteStatisticsResponse;
}

const VotingPanel: React.FC<VotingPanelProps> = ({ voteStats }) => {
  const sortedVenues = [...voteStats.venueVotes].sort((a, b) => b.voteScore - a.voteScore);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Live Voting Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Participation</span>
            </div>
            <span className="text-sm text-gray-600">
              {voteStats.votedCount} / {voteStats.totalParticipants}
            </span>
          </div>
          <Progress value={voteStats.voteProgress} className="h-2" />
          <p className="text-xs text-gray-500 text-right">
            {voteStats.voteProgress.toFixed(0)}% complete
          </p>
        </div>

        {/* Time Remaining */}
        {voteStats.timeRemaining && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span>
              <span className="font-medium text-yellow-800">Time Remaining:</span> {voteStats.timeRemaining}
            </span>
          </div>
        )}

        {/* Vote Leaderboard */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Vote Standings</h4>
          {sortedVenues.map((venue, index) => (
            <div 
              key={venue.optionId} 
              className={`flex items-center justify-between p-3 rounded-lg ${
                index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Badge variant={index === 0 ? 'default' : 'secondary'} className="w-8 h-8 flex items-center justify-center">
                  {index + 1}
                </Badge>
                <div>
                  <p className="text-sm font-medium">
                    Option {index + 1}
                    {index === 0 && (
                      <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-600" />
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{venue.voteScore}</p>
                <p className="text-xs text-gray-500">votes</p>
              </div>
            </div>
          ))}
        </div>

        {/* Voting Tips */}
        <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 space-y-1">
          <p className="font-medium">💡 Voting Tips:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Rate each venue from 1-5 stars</li>
            <li>Consider AI recommendations and team preferences</li>
            <li>Add comments to share your thoughts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default VotingPanel;





































