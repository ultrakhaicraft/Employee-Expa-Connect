import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Share2,
  CheckCircle2,
  TrendingUp,
  Clock,
  Truck,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { useToast } from "../../../components/ui/use-toast";
import {
  getItineraryById,
  getItineraryStatistics,
} from "../../../services/itineraryService";
import type { Itinerary, ItineraryStatistics } from "../../../types/itinerary.types";

export default function ItineraryDetailStatistics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [stats, setStats] = useState<ItineraryStatistics | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [itineraryData, statsData] = await Promise.all([
        getItineraryById(id),
        getItineraryStatistics(id),
      ]);
      setItinerary(itineraryData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "Error",
        description: "Failed to load itinerary statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats || !itinerary) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Statistics not available</p>
          <Button onClick={() => navigate(`/itinerary/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Itinerary
          </Button>
        </div>
      </div>
    );
  }

  const budgetUtilization = stats.totalBudget > 0
    ? Math.round((stats.actualTotalCost / stats.totalBudget) * 100)
    : 0;

  const estimateAccuracy = stats.totalEstimatedCost > 0
    ? Math.round((stats.actualTotalCost / stats.totalEstimatedCost) * 100)
    : 0;

  const statCards = [
    {
      title: "Total Days",
      value: stats.totalDaysPlanned,
      icon: Calendar,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      suffix: "days",
    },
    {
      title: "Total Items",
      value: stats.totalItineraryItems,
      icon: MapPin,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      suffix: "places",
    },
    {
      title: "Times Shared",
      value: stats.shareCount,
      icon: Share2,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      suffix: "shares",
    },
    {
      title: "Completion",
      value: stats.completionRate,
      icon: CheckCircle2,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      suffix: "%",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[95%] lg:max-w-[1600px]">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/itinerary/${id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Itinerary
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900">
                    {itinerary.title}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Detailed statistics and analytics
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Badge>{itinerary.tripType || itinerary.purpose}</Badge>
                {itinerary.status && (
                  <Badge variant="outline">{itinerary.status}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-lg text-gray-500 ml-2">
                        {stat.suffix}
                      </span>
                    )}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Budget Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Budget Overview
                </h3>
                <p className="text-sm text-gray-600">
                  Planned vs Actual spending
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Budget</span>
                  <span className="text-lg font-bold text-gray-900">
                    {stats.totalBudget.toLocaleString()} {itinerary.currency || "USD"}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Estimated Cost</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {stats.totalEstimatedCost.toLocaleString()} {itinerary.currency || "USD"}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Actual Cost</span>
                  <span className="text-lg font-semibold text-green-600">
                    {stats.actualTotalCost.toLocaleString()} {itinerary.currency || "USD"}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Budget Utilization
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    {budgetUtilization}%
                  </span>
                </div>
                <div className="w-full bg-white rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      budgetUtilization > 100
                        ? "bg-red-500"
                        : budgetUtilization > 80
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                  ></div>
                </div>
                {budgetUtilization > 100 && (
                  <p className="text-xs text-red-600 mt-2">
                    ⚠️ Over budget by {budgetUtilization - 100}%
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Cost Breakdown
                </h3>
                <p className="text-sm text-gray-600">
                  Detailed expense analysis
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-700">Transport</span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {stats.totalTransportCost.toLocaleString()} {itinerary.currency || "USD"}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-gray-700">Activities</span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {(stats.actualTotalCost - stats.totalTransportCost).toLocaleString()}{" "}
                  {itinerary.currency || "USD"}
                </span>
              </div>

              {stats.totalEstimatedCost > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Estimate Accuracy
                    </span>
                    <span className="text-xl font-bold text-blue-600">
                      {estimateAccuracy}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {estimateAccuracy < 90
                      ? "Actual cost is lower than estimated"
                      : estimateAccuracy > 110
                      ? "Actual cost exceeded estimate"
                      : "Actual cost is close to estimate"}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Timeline</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDateTime(stats.lastUpdated)}
                </span>
              </div>
              {itinerary.createdAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDateTime(itinerary.createdAt)}
                  </span>
                </div>
              )}
              {itinerary.completedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatDateTime(itinerary.completedAt)}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Progress</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="text-sm font-bold text-blue-600">
                    {stats.completionRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${stats.completionRate}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Track your progress as you complete each item in your itinerary
              </p>
            </div>
          </Card>
        </div>

        {/* Summary Card */}
        <Card className="p-6 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Statistics Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p className="mb-2">
                <strong>Total Days Planned:</strong> {stats.totalDaysPlanned} days
              </p>
              <p className="mb-2">
                <strong>Total Places:</strong> {stats.totalItineraryItems} locations
              </p>
              <p className="mb-2">
                <strong>Sharing:</strong> Shared {stats.shareCount} time(s)
              </p>
            </div>
            <div>
              <p className="mb-2">
                <strong>Budget:</strong> {stats.totalBudget.toLocaleString()} {itinerary.currency || "USD"}
              </p>
              <p className="mb-2">
                <strong>Actual Spending:</strong> {stats.actualTotalCost.toLocaleString()} {itinerary.currency || "USD"}
              </p>
              <p className="mb-2">
                <strong>Status:</strong>{" "}
                <Badge variant="outline">{itinerary.status || "Planning"}</Badge>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}





