"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ShieldCheck,
  MapPin,
  Calendar,
  Users,
  Flag,
  BarChart3,
  Menu,
  X,
  Home,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDispatch } from "react-redux"
import { logout } from "@/redux/authSlice"
import { useNavigate, useLocation } from "react-router-dom"
import ManagePlaces from '@/pages/Moderator/ManagePlaces/ManagePlaces'
import ViewReportedReview from '@/pages/Moderator/ViewReportedRevew/ViewReportedRevew'
import ManageEvents from '@/pages/Moderator/ManageEvents/ManageEvents'
import ManageUsers from '@/pages/Moderator/ManageUsers/ManageUsers'
import ModeratorAnalytics from '@/pages/Moderator/ModeratorAnalytics/ModeratorAnalytics'
import PageTransition from '@/components/Transition/PageTransition'
import {
  GetModeratorStatistics,
  ViewAllPendingPlace,
  GetAllReportedPlaces,
  ViewAllReportedReview
} from '@/services/moderatorService'

export default function ModeratorDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [statistics, setStatistics] = useState({
    pendingPlaces: 0,
    areaEvents: 0,
    reportedPlaces: 0,
    reportedReviews: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const loadStatistics = useCallback(async () => {
    const extractItems = (response: any) => {
      if (!response) return []
      if (Array.isArray(response)) return response
      if (Array.isArray(response.items)) return response.items
      if (Array.isArray(response.data?.items)) return response.data.items
      return []
    }

    const extractTotal = (response: any, fallback: number) => {
      if (!response) return fallback
      return (
        response.totalItems ??
        response.total ??
        response.data?.total ??
        response.count ??
        fallback
      )
    }

    try {
      setStatsLoading(true)
      setStatsError(null)
      const [pendingResp, reportedPlacesResp, reportedReviewsResp, stats] = await Promise.all([
        ViewAllPendingPlace(),
        GetAllReportedPlaces(),
        ViewAllReportedReview({ page: 1, pageSize: 1 }),
        GetModeratorStatistics()
      ])

      const pendingPlaces = extractItems(pendingResp).length
      const reportedPlaces = extractTotal(reportedPlacesResp, extractItems(reportedPlacesResp).length)
      const reportedReviews = extractTotal(
        reportedReviewsResp,
        Array.isArray(reportedReviewsResp?.items) ? reportedReviewsResp.items.length : 0
      )

      setStatistics({
        pendingPlaces,
        areaEvents: stats?.totalEvents ?? 0,
        reportedPlaces,
        reportedReviews
      })
      setLastUpdated(new Date())
    } catch (error: any) {
      console.error('Failed to load statistics:', error)
      setStatsError(error?.response?.data?.message || error?.message || 'Unable to load moderation stats.')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "dashboard") {
      loadStatistics()
    }
  }, [activeTab, loadStatistics])

  const handleLogout = () => {
    dispatch(logout())
    if (location.pathname === '/') {
      window.location.reload()
    } else {
      navigate("/")
    }
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "places", label: "Manage Places", icon: MapPin },
    { id: "events", label: "Manage Events", icon: Calendar },
    { id: "users", label: "Manage Users", icon: Users },
    { id: "reviews", label: "Reported Reviews", icon: Flag },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ]

  const renderDashboard = () => {
    const formatNumber = (value: number) => value.toLocaleString("en-US")
    const statsCards = [
      {
        id: "pendingPlaces",
        label: "Pending places",
        helper: "Awaiting verification",
        value: statistics.pendingPlaces,
        icon: MapPin,
        iconClasses: "bg-blue-50 text-blue-600"
      },
      {
        id: "areaEvents",
        label: "Area events",
        helper: "Scheduled in your region",
        value: statistics.areaEvents,
        icon: Calendar,
        iconClasses: "bg-green-50 text-green-600"
      },
      {
        id: "reportedPlaces",
        label: "Reported places",
        helper: "Needs incident review",
        value: statistics.reportedPlaces,
        icon: AlertTriangle,
        iconClasses: "bg-amber-50 text-amber-600"
      },
      {
        id: "reportedReviews",
        label: "Reported reviews",
        helper: "Awaiting moderation",
        value: statistics.reportedReviews,
        icon: Flag,
        iconClasses: "bg-rose-50 text-rose-600"
      }
    ]

    const quickActions = [
      {
        id: "pendingPlaces",
        title: "Review pending submissions",
        description: `${formatNumber(statistics.pendingPlaces)} place${statistics.pendingPlaces === 1 ? "" : "s"} waiting`,
        icon: MapPin,
        targetTab: "places"
      },
      {
        id: "reportedPlaces",
        title: "Investigate reported places",
        description: `${formatNumber(statistics.reportedPlaces)} incident${statistics.reportedPlaces === 1 ? "" : "s"} open`,
        icon: AlertTriangle,
        targetTab: "places"
      },
      {
        id: "reportedReviews",
        title: "Moderate reported reviews",
        description: `${formatNumber(statistics.reportedReviews)} review${statistics.reportedReviews === 1 ? "" : "s"} flagged`,
        icon: Flag,
        targetTab: "reviews"
      },
      {
        id: "events",
        title: "Plan local events",
        description: `${formatNumber(statistics.areaEvents)} event${statistics.areaEvents === 1 ? "" : "s"} scheduled`,
        icon: Calendar,
        targetTab: "events"
      }
    ]

    return (
      <PageTransition delayMs={100} durationMs={600} variant="zoom">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Moderation snapshot</p>
              <p className="text-xs text-gray-500">
                {lastUpdated ? `Last updated ${lastUpdated.toLocaleString()}` : 'Pulling latest data...'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {statsError && (
                <span className="text-sm text-rose-600">{statsError}</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadStatistics}
                disabled={statsLoading}
                className="flex items-center gap-2"
              >
                {statsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {statsCards.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.id}
                  className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-4"
                >
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${card.iconClasses}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-3xl font-semibold text-gray-900 mt-1">{formatNumber(card.value)}</p>
                  </div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">{card.helper}</p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Priority actions</h2>
              <div className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      type="button"
                      key={action.id}
                      className="w-full flex items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white/90 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      onClick={() => setActiveTab(action.targetTab)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{action.title}</p>
                          <p className="text-xs text-gray-500">{action.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Workflow tips</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>• Start with pending places so newly submitted locations can go live quickly.</li>
                <li>• Jump to reported places when the incident queue grows to keep the map trustworthy.</li>
                <li>• Close the loop by moderating reviews flagged by employees or travelers.</li>
              </ul>
              <Button
                variant="default"
                className="bg-[#0B1F3A] hover:bg-[#0b1f3add]"
                onClick={() => setActiveTab("analytics")}
              >
                Open analytics
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  const renderPlaces = () => <ManagePlaces />
  const renderReviews = () => <ViewReportedReview />
  const renderEvents = () => <ManageEvents />
  const renderUsers = () => <ManageUsers />
  const renderAnalytics = () => <ModeratorAnalytics />

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard()
      case "places":
        return renderPlaces()
      case "events":
        return renderEvents()
      case "users":
        return renderUsers()
      case "reviews":
        return renderReviews()
      case "analytics":
        return renderAnalytics()
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-64" : "w-16"} bg-[#0B1F3A] text-white transition-all duration-300 flex flex-col h-full border-r border-gray-700`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-[#D9822B]" />
                <h2 className="text-xl font-bold text-white">Moderator</h2>
              </div>
            )}
            <Button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-[#D9822B] p-2"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? "bg-[#D9822B] text-white"
                      : "text-gray-300 hover:bg-[#D9822B]/20 hover:text-white"
                  }`}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700">
          <Button 
            onClick={handleLogout}
            className="w-full bg-[#D9822B] hover:bg-[#c17424] text-white"
          >
            {sidebarOpen && "Sign Out"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="px-6 pb-6 pt-0">{renderContent()}</div>
      </div>
    </div>
  )
}
