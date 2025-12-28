import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  FileText,
  Share2,
  CheckCircle,
  ArrowLeft,
  Calendar,
  Users,
  Target,
  Award,
  Zap,
  Star,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { useToast } from "../../../components/ui/use-toast";
import {
  getUserStatistics,
} from "../../../services/itineraryService";
import type { UserStatistics } from "../../../types/itinerary.types";

export default function ItineraryAnalytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStatistics | null>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const data = await getUserStatistics();
      setStats(data);
    } catch (error) {
      console.error("Failed to load statistics:", error);
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-400 opacity-20 blur-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <p className="mt-6 text-gray-700 font-medium">Loading your travel statistics...</p>
        </motion.div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No statistics available</p>
          <Button onClick={() => navigate("/itinerary")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Itineraries
          </Button>
        </div>
      </div>
    );
  }

  const totalItineraries = stats.itnerariesCreated || 0;
  const completionRate = totalItineraries > 0
    ? Math.round((stats.itinerariesCompleted / totalItineraries) * 100)
    : 0;

  const statCards = [
    {
      title: "Total Itineraries",
      value: stats.itnerariesCreated,
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Templates Created",
      value: stats.templatesCreated,
      icon: Calendar,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Completed",
      value: stats.itinerariesCompleted,
      icon: CheckCircle,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Shared",
      value: stats.itinerariesShared,
      icon: Share2,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  // Get achievement badges
  const getAchievements = () => {
    const achievements = [];
    if (totalItineraries >= 10) achievements.push({ icon: Star, label: "Travel Expert", color: "text-yellow-500" });
    if (stats.templatesCreated >= 5) achievements.push({ icon: Award, label: "Template Master", color: "text-purple-500" });
    if (completionRate >= 80) achievements.push({ icon: Target, label: "High Achiever", color: "text-green-500" });
    if (stats.itinerariesShared >= 5) achievements.push({ icon: Users, label: "Social Planner", color: "text-blue-500" });
    return achievements;
  };

  const achievements = getAchievements();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[95%] lg:max-w-[1600px]">
        {/* Header */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-5 sm:p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/itinerary")}
                  className="border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-400"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Itineraries
                </Button>
                
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      Your Travel Statistics
                    </h1>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Overview of your itinerary planning journey
                    </p>
                  </div>
                </div>
              </div>
              
              {achievements.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {achievements.map((achievement, idx) => {
                    const Icon = achievement.icon;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 + 0.3 }}
                      >
                        <Badge 
                          className="px-2.5 py-1 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm"
                          variant="outline"
                        >
                          <Icon className={`h-3.5 w-3.5 mr-1.5 ${achievement.color}`} />
                          <span className="text-xs font-medium">{achievement.label}</span>
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid - Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.2, duration: 0.3 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
                  <div className="p-4 relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2.5 ${stat.bgColor} rounded-lg shadow-sm`}>
                        <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                      </div>
                      <Star className={`h-3.5 w-3.5 ${stat.iconColor} opacity-30`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                        {stat.title}
                      </p>
                      <motion.p 
                        className="text-2xl sm:text-3xl font-bold text-gray-900"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 + 0.4, type: "spring" }}
                      >
                        {stat.value}
                      </motion.p>
                    </div>
                  </div>
                  
                  {/* Bottom accent line */}
                  <motion.div 
                    className={`h-1 bg-gradient-to-r ${stat.color}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.05 + 0.5, duration: 0.4 }}
                  />
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Completion Rate Card - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="mb-6"
        >
          <Card className="relative overflow-hidden p-6 border-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-xl">
            <div className="relative z-10 grid md:grid-cols-2 gap-6 items-center">
              {/* Circular Progress - Compact */}
              <div className="flex justify-center md:justify-start">
                <div className="relative">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="12"
                      fill="none"
                    />
                    <motion.circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="white"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: 440 }}
                      animate={{ strokeDashoffset: 440 - (440 * completionRate / 100) }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                      style={{ strokeDasharray: "440" }}
                    />
                  </svg>
                  <motion.div 
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, type: "spring" }}
                  >
                    <motion.span 
                      className="text-4xl font-bold text-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.2 }}
                    >
                      {completionRate}%
                    </motion.span>
                    <span className="text-white/80 text-xs mt-0.5">Completion</span>
                  </motion.div>
                </div>
              </div>

              {/* Text content - Compact */}
              <div className="text-white space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">
                    Your Progress
                  </h3>
                </div>
                
                <p className="text-sm text-white/90">
                  Completed <span className="font-bold text-white">{stats.itinerariesCompleted}</span> of{" "}
                  <span className="font-bold text-white">{totalItineraries}</span> itineraries
                </p>

                <div className="flex gap-3 pt-2">
                  <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-lg p-3">
                    <CheckCircle className="h-5 w-5 mb-1.5 text-green-200" />
                    <div className="text-xl font-bold">{stats.itinerariesCompleted}</div>
                    <div className="text-xs text-white/70">Completed</div>
                  </div>
                  <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-lg p-3">
                    <Zap className="h-5 w-5 mb-1.5 text-yellow-200" />
                    <div className="text-xl font-bold">{totalItineraries - stats.itinerariesCompleted}</div>
                    <div className="text-xs text-white/70">In Progress</div>
                  </div>
                </div>

                {completionRate >= 80 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg p-2.5 mt-3"
                  >
                    <Award className="h-4 w-4 text-yellow-200" />
                    <span className="text-xs font-medium">Outstanding performance! Keep it up!</span>
                  </motion.div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}

