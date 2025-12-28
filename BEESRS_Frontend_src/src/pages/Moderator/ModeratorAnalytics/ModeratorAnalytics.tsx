import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Users, 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  TrendingUp,
  ArrowUpRight,
  Star
} from 'lucide-react'
import PageTransition from '@/components/Transition/PageTransition'
import { GetModeratorAnalytics } from '@/services/moderatorService'
import type { ModeratorAnalytics } from '@/services/moderatorService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts'
import { useToast } from '@/components/ui/use-toast'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

export default function ModeratorAnalytics() {
  const [analytics, setAnalytics] = useState<ModeratorAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const data = await GetModeratorAnalytics()
        setAnalytics(data)
      } catch (error) {
        console.error('Error fetching analytics:', error)
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No analytics data available</h3>
      </div>
    )
  }

  const statusData = analytics.eventStats.statusDistribution.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count
  }));

  return (
    <PageTransition delayMs={100} durationMs={600} variant="zoom">
      <div className="space-y-8 pb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-2">Comprehensive overview of activity in your branch</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Users</p>
                  <h3 className="text-3xl font-bold text-gray-900">{analytics.userStats.totalUsers}</h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  {analytics.userStats.activeUsers} Active
                </span>
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-gray-500">{analytics.userStats.inactiveUsers} Inactive</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">Total Events</p>
                  <h3 className="text-3xl font-bold text-gray-900">{analytics.eventStats.totalEvents}</h3>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Calendar className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-emerald-600 font-medium">{analytics.eventStats.upcomingEvents} Upcoming</span>
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-gray-500">{analytics.eventStats.completedEvents} Done</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600 mb-1">Total Places</p>
                  <h3 className="text-3xl font-bold text-gray-900">{analytics.placeStats.totalPlaces}</h3>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <MapPin className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-amber-600 font-medium">{analytics.placeStats.verifiedPlaces} Verified</span>
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-gray-500">{analytics.placeStats.pendingPlaces} Pending</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-rose-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rose-600 mb-1">Pending Reports</p>
                  <h3 className="text-3xl font-bold text-gray-900">{analytics.placeStats.reportedPlaces}</h3>
                </div>
                <div className="p-3 bg-rose-100 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-rose-600 font-medium">Needs Attention</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activity Trend Chart */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Branch Growth Activity
              </CardTitle>
              <CardDescription>Event and user registration trends over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.activityTrends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="eventCount" name="Events Created" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="userRegistrationCount" name="New Users" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Event Status Distribution */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                Event Status Distribution
              </CardTitle>
              <CardDescription>Distribution of events by their current status</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Places Table */}
          <Card className="lg:col-span-2 shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Top Rated Places
              </CardTitle>
              <CardDescription>Most popular destinations in your branch area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.placeStats.topRatedPlaces.map((place, index) => (
                  <div key={place.placeId} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{place.name}</p>
                        <p className="text-xs text-gray-500">{place.totalReviews} reviews</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-bold">{place.rating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
                {analytics.placeStats.topRatedPlaces.length === 0 && (
                  <div className="text-center py-8 text-gray-500 italic">No rated places yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Roles */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                Member Roles
              </CardTitle>
              <CardDescription>User role distribution in branch</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analytics.userStats.roleDistribution.map((role, index) => {
                  const percentage = (role.count / analytics.userStats.totalUsers) * 100;
                  return (
                    <div key={role.roleName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{role.roleName}</span>
                        <span className="text-gray-500 font-semibold">{role.count} ({Math.round(percentage)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
