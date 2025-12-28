import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { toast } from 'sonner';
import eventService from '../../../services/eventService';
import EventAnalyticsCard from '../../../components/Event/EventAnalyticsCard';
import OrganizerAnalyticsCard from '../../../components/Event/OrganizerAnalyticsCard';
// Note: Install recharts for charts: npm install recharts
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const EventAnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'event' | 'organizer' | 'trends'>('event');
  const [eventAnalytics, setEventAnalytics] = useState<any>(null);
  const [organizerAnalytics, setOrganizerAnalytics] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'event' && id) {
      fetchEventAnalytics();
    } else if (activeTab === 'organizer') {
      fetchOrganizerAnalytics();
    } else if (activeTab === 'trends') {
      fetchTrends();
    }
  }, [activeTab, id]);

  const fetchEventAnalytics = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await eventService.getEventAnalytics(id);
      setEventAnalytics(data);
    } catch (error: any) {
      toast.error('Failed to load event analytics: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizerAnalytics = async () => {
    try {
      setLoading(true);
      const data = await eventService.getOrganizerAnalytics();
      setOrganizerAnalytics(data);
    } catch (error: any) {
      toast.error('Failed to load organizer analytics: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const data = await eventService.getEventTrends(6);
      setTrends(data);
    } catch (error: any) {
      toast.error('Failed to load trends: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Event Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into your events</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="event" disabled={!id}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Event Analytics
          </TabsTrigger>
          <TabsTrigger value="organizer">
            <Calendar className="h-4 w-4 mr-2" />
            Organizer Overview
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="event" className="space-y-4">
          {eventAnalytics ? (
            <EventAnalyticsCard analytics={eventAnalytics} />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No event selected. Please select an event to view analytics.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="organizer" className="space-y-4">
          {organizerAnalytics ? (
            <OrganizerAnalyticsCard analytics={organizerAnalytics} />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Loading organizer analytics...
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {trends.length > 0 ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Trends (Last 6 Months)</CardTitle>
                  <CardDescription>Monthly event statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-semibold">{trend.month}</p>
                          <p className="text-sm text-muted-foreground">
                            {trend.eventCount} events • {trend.participantCount} participants
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">Rating: {trend.averageRating.toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Uncomment when recharts is installed:
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="eventCount" stroke="#8884d8" name="Events" />
                      <Line type="monotone" dataKey="participantCount" stroke="#82ca9d" name="Participants" />
                    </LineChart>
                  </ResponsiveContainer>
                  */}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No trend data available
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventAnalyticsPage;

