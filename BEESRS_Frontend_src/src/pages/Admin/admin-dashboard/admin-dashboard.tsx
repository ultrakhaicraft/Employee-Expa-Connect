"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Users,
  Home,
  Menu,
  X,
  Building2,
  UserPlus,
  Activity,
  Code,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  Tag,
  Hash,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDispatch } from "react-redux"
import { logout } from "@/redux/authSlice"
import { useNavigate, useLocation } from "react-router-dom"
import PageTransition from "@/components/Transition/PageTransition"
import ViewUsers from "../ViewUsers/ViewUsers"
import ViewBranchs from "../ViewBranchs/ViewBranchs"
import ViewEmpCode from "../ViewEmpCode/ViewEmpCode"
import ViewCategories from "../ViewCategories/ViewCategories"
import ViewTags from "../ViewTags/ViewTags"
import { GetAllBranch, GetEmployeeCodes, ViewUsers as ViewUsersAPI, GetCategories, GetTags } from "@/services/adminService"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface DashboardUser {
  userId: string
  createdAt: string
  fullName: string
  email: string
  roleName?: string
  currentBranchName?: string | null
  branchName?: string | null
}

interface DashboardEmployeeCode {
  employeeId: string
  employeeCode: string
  createdAt?: string
  expiresAt?: string
  status?: string
}

interface DashboardBranch {
  branchId: string
  name: string
}

interface DashboardCategory {
  categoryId: number
  name: string
  description: string
}

interface DashboardTag {
  tagId: number
  name: string
  description: string
  isActive: boolean
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [usersData, setUsersData] = useState<DashboardUser[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [employeeCodes, setEmployeeCodes] = useState<DashboardEmployeeCode[]>([])
  const [totalCodes, setTotalCodes] = useState(0)
  const [branches, setBranches] = useState<DashboardBranch[]>([])
  const [categories, setCategories] = useState<DashboardCategory[]>([])
  const [totalCategories, setTotalCategories] = useState(0)
  const [tags, setTags] = useState<DashboardTag[]>([])
  const [totalTags, setTotalTags] = useState(0)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const loadDashboardData = useCallback(async () => {
    try {
      setDashboardLoading(true)
      setDashboardError(null)

      const [usersResp, codesResp, branchesResp, categoriesResp, tagsResp] = await Promise.all([
        ViewUsersAPI(),
        GetEmployeeCodes({ page: 1, pageSize: 200, includeExpired: true }),
        GetAllBranch(1, 200),
        GetCategories(),
        GetTags(),
      ])

      const userItems: DashboardUser[] = usersResp?.items ?? []
      setUsersData(userItems)
      setTotalUsers(usersResp?.totalItems ?? userItems.length)

      const codeItems: DashboardEmployeeCode[] =
        codesResp?.data?.items ?? codesResp?.items ?? codesResp ?? []
      setEmployeeCodes(codeItems)
      setTotalCodes(codesResp?.data?.total ?? codesResp?.total ?? codeItems.length)

      const branchItems: DashboardBranch[] = branchesResp?.items ?? []
      setBranches(branchItems)

      const categoryItems: DashboardCategory[] = categoriesResp?.items ?? categoriesResp ?? []
      setCategories(categoryItems)
      setTotalCategories(categoriesResp?.totalItems ?? categoryItems.length)

      const tagItems: DashboardTag[] = tagsResp?.items ?? tagsResp ?? []
      setTags(tagItems)
      setTotalTags(tagsResp?.totalItems ?? tagItems.length)
    } catch (error) {
      console.error("Failed to load dashboard data", error)
      setDashboardError("Unable to load dashboard data right now.")
    } finally {
      setDashboardLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const handleLogout = () => {
    dispatch(logout())
    if (location.pathname === "/") {
      window.location.reload()
    } else {
      navigate("/")
    }
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "employeeCodes", label: "Employee Codes", icon: Code },
    { id: "users", label: "Users", icon: Users },
    { id: "branchs", label: "Branches", icon: Building2 },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "tags", label: "Tags", icon: Hash },
  ]

  const startOfDay = (offset = 0) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + offset)
    return date
  }

  const between = (value: string | undefined, start: Date, end?: Date) => {
    if (!value) return false
    const parsed = new Date(value)
    if (isNaN(parsed.getTime())) return false
    if (parsed < start) return false
    if (end && parsed >= end) return false
    return true
  }

  const newUsersToday = useMemo(
    () => usersData.filter((user) => between(user.createdAt, startOfDay(0))).length,
    [usersData]
  )
  const newUsersYesterday = useMemo(
    () => usersData.filter((user) => between(user.createdAt, startOfDay(-1), startOfDay(0))).length,
    [usersData]
  )
  const lastWeekUsers = useMemo(
    () => usersData.filter((user) => between(user.createdAt, startOfDay(-7), startOfDay(0))).length,
    [usersData]
  )
  const prevWeekUsers = useMemo(
    () => usersData.filter((user) => between(user.createdAt, startOfDay(-14), startOfDay(-7))).length,
    [usersData]
  )
  const userTrendPercent = useMemo(() => {
    if (prevWeekUsers === 0) return lastWeekUsers > 0 ? 100 : 0
    return Math.round(((lastWeekUsers - prevWeekUsers) / prevWeekUsers) * 100)
  }, [lastWeekUsers, prevWeekUsers])

  const activeCodes = useMemo(
    () =>
      employeeCodes.filter((code) => (code.status ?? "").toLowerCase() === "active").length,
    [employeeCodes]
  )

  const activeTags = useMemo(
    () => tags.filter((tag) => tag.isActive).length,
    [tags]
  )

  const branchDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    usersData.forEach((user) => {
      const name = user.currentBranchName || user.branchName || "Unassigned"
      counts[name] = (counts[name] || 0) + 1
    })

    const data = branches.map((branch) => ({
      name: branch.name,
      count: counts[branch.name] || 0,
    }))

    if (counts["Unassigned"]) {
      data.push({ name: "Unassigned", count: counts["Unassigned"] })
    }

    return data.sort((a, b) => b.count - a.count).slice(0, 8)
  }, [branches, usersData])

  // Prepare chart data for recharts
  const chartData = useMemo(() => {
    return branchDistribution.map((branch) => ({
      name: branch.name,
      users: branch.count,
    }))
  }, [branchDistribution])

  const recentUsers = useMemo(
    () =>
      [...usersData]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [usersData]
  )

  const recentCodes = useMemo(
    () =>
      [...employeeCodes]
        .sort((a, b) => {
          const dateA = new Date(a.createdAt ?? a.expiresAt ?? "").getTime()
          const dateB = new Date(b.createdAt ?? b.expiresAt ?? "").getTime()
          return dateB - dateA
        })
        .slice(0, 5),
    [employeeCodes]
  )

  const recentCategories = useMemo(
    () =>
      [...categories]
        .sort((a, b) => b.categoryId - a.categoryId)
        .slice(0, 5),
    [categories]
  )

  const recentTags = useMemo(
    () =>
      [...tags]
        .filter((tag) => tag.isActive)
        .sort((a, b) => b.tagId - a.tagId)
        .slice(0, 5),
    [tags]
  )

  const metrics = [
    {
      label: "New Users Today",
      value: newUsersToday,
      subtitle: `${newUsersYesterday} yesterday`,
      trendingUp: newUsersToday >= newUsersYesterday,
      icon: UserPlus,
    },
    {
      label: "Total Users",
      value: totalUsers,
      subtitle: `${userTrendPercent >= 0 ? "+" : ""}${userTrendPercent}% vs. last week`,
      trendingUp: userTrendPercent >= 0,
      icon: Users,
    },
    {
      label: "Total Employee Codes",
      value: totalCodes,
      subtitle: `${activeCodes} active`,
      trendingUp: true,
      icon: Layers,
    },
    {
      label: "Active Codes",
      value: activeCodes,
      subtitle: `${totalCodes - activeCodes} inactive`,
      trendingUp: activeCodes >= totalCodes - activeCodes,
      icon: Activity,
    },
    {
      label: "Total Categories",
      value: totalCategories,
      subtitle: `${categories.length} in system`,
      trendingUp: true,
      icon: Tag,
    },
    {
      label: "Total Tags",
      value: totalTags,
      subtitle: `${activeTags} active`,
      trendingUp: activeTags >= totalTags - activeTags,
      icon: Hash,
    },
  ]

  const renderDashboard = () => (
    <PageTransition>
      <div className="space-y-6">
        
        {dashboardLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D9822B]" />
          </div>
        ) : dashboardError ? (
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-red-600 font-medium">{dashboardError}</p>
              <Button onClick={loadDashboardData} className="bg-[#D9822B] hover:bg-[#c17424] text-white">
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
              {metrics.map((metric) => {
                const Icon = metric.icon
                return (
                  <Card key={metric.label} className="border border-[#E5E7EB] shadow-sm bg-white">
                    <CardContent className="p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-sm text-[#7A869A] whitespace-nowrap overflow-hidden text-ellipsis" 
                            title={metric.label}
                          >
                            {metric.label}
                          </p>
                          <p className="text-3xl font-semibold text-[#111827] mt-1">{metric.value}</p>
                        </div>
                        <span className="h-12 w-12 rounded-full bg-[#FEF4E6] flex items-center justify-center text-[#D9822B] flex-shrink-0 ml-2">
                          <Icon size={22} />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`flex items-center gap-1 ${
                            metric.trendingUp ? "text-emerald-600" : "text-rose-500"
                          }`}
                        >
                          {metric.trendingUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          {metric.subtitle}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border border-[#E5E7EB] bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#7A869A]">Branch Overview</p>
                      <p className="text-xl text-[#1F2937] font-semibold">
                        {branches.length} branches
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadDashboardData}
                      className="text-[#7A869A]"
                    >
                      <RefreshCcw size={16} className="mr-1" />
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {branchDistribution.length === 0 ? (
                    <p className="text-center text-[#9AA3B5] py-12">
                      No branch distribution data yet
                    </p>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "#7A869A" }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: "#7A869A" }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1F2937",
                              border: "none",
                              borderRadius: "8px",
                              color: "#fff",
                              fontSize: "12px",
                            }}
                            formatter={(value: number) => [`${value} ${value === 1 ? "user" : "users"}`, "Users"]}
                            labelStyle={{ color: "#fff", fontWeight: "bold" }}
                          />
                          <Bar
                            dataKey="users"
                            fill="#60a5fa"
                            radius={[8, 8, 0, 0]}
                            stroke="#3b82f6"
                            strokeWidth={1}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border border-[#E5E7EB] bg-white">
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentUsers.length === 0 ? (
                    <p className="text-center text-[#9AA3B5] py-6">No new users</p>
                  ) : (
                    recentUsers.map((user) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#FEF4E6] text-[#D9822B] flex items-center justify-center font-semibold">
                            {user.fullName?.charAt(0) ?? "U"}
                          </div>
                          <div>
                            <p className="font-medium text-[#1F2937]">{user.fullName}</p>
                            <p className="text-xs text-[#7A869A]">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-[#7A869A]">{user.roleName ?? "User"}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="border border-[#E5E7EB] bg-white">
                <CardHeader>
                  <CardTitle>Recent Employee Codes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentCodes.length === 0 ? (
                    <p className="text-center text-[#9AA3B5] py-6">No employee codes yet</p>
                  ) : (
                    recentCodes.map((code) => {
                      const isActive = (code.status ?? "").toLowerCase() === "active"
                      return (
                        <div
                          key={`${code.employeeId}-${code.employeeCode}`}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-[#1F2937]">{code.employeeCode}</p>
                            <p className="text-xs text-[#7A869A]">
                              {code.employeeId} •{" "}
                              {code.createdAt
                                ? new Date(code.createdAt).toLocaleDateString()
                                : "N/A"}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              isActive ? "text-emerald-600" : "text-rose-500"
                            }`}
                          >
                            {isActive ? "+ Active" : "- Inactive"}
                          </span>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
              <Card className="lg:col-span-2 border border-[#E5E7EB] bg-white">
                <CardHeader>
                  <CardTitle>System Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-[#4B5563]">
                  <p>• A total of {totalUsers} users have been created in the system.</p>
                  <p>
                    • {branches.length} branches are configured; the chart highlights the busiest ones.
                  </p>
                  <p>
                    • {activeCodes} employee codes are active while {totalCodes - activeCodes} are inactive or expired.
                  </p>
                  <p>
                    • {totalCategories} place categories and {totalTags} place tags are available in the system.
                  </p>
                  <p>
                    • {activeTags} tags are currently active out of {totalTags} total tags.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border border-[#E5E7EB] bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-[#D9822B]" />
                    Recent Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentCategories.length === 0 ? (
                    <p className="text-center text-[#9AA3B5] py-6">No categories yet</p>
                  ) : (
                    recentCategories.map((category) => (
                      <div key={category.categoryId} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-[#1F2937]">{category.name}</p>
                          <p className="text-xs text-[#7A869A] truncate">
                            {category.description || "No description"}
                          </p>
                        </div>
                        <span className="text-xs text-[#7A869A] ml-2">ID: {category.categoryId}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="border border-[#E5E7EB] bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-[#D9822B]" />
                    Recent Active Tags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentTags.length === 0 ? (
                    <p className="text-center text-[#9AA3B5] py-6">No active tags yet</p>
                  ) : (
                    recentTags.map((tag) => (
                      <div key={tag.tagId} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-[#1F2937]">{tag.name}</p>
                          <p className="text-xs text-[#7A869A] truncate">
                            {tag.description || "No description"}
                          </p>
                        </div>
                        <span className="text-xs text-emerald-600 ml-2 font-medium">Active</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  )

  const renderUsers = () => <ViewUsers />
  const renderBranchs = () => <ViewBranchs />
  const renderEmployeeCodes = () => <ViewEmpCode />
  const renderCategories = () => <ViewCategories />
  const renderTags = () => <ViewTags />

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboard()
      case "employeeCodes":
        return renderEmployeeCodes()
      case "users":
        return renderUsers()
      case "branchs":
        return renderBranchs()
      case "categories":
        return renderCategories()
      case "tags":
        return renderTags()
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden bg-[#F9F9F9]">
      <div
        className={`${
          sidebarOpen ? "w-[250px]" : "w-20"
        } bg-[#0B1F3A] text-white transition-all duration-300 flex flex-col border-r border-gray-700`}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between gap-3">
            {sidebarOpen && (
              <div>
                <h2 className="text-xl font-bold text-white">System management</h2>
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

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#D9822B] text-white"
                      : "text-gray-300 hover:bg-[#D9822B]/20 hover:text-white"
                  }`}
                >
                  <Icon size={20} />
                  {sidebarOpen && (
                    <div className="text-left">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-white/40">
                        {item.id === "dashboard"
                          ? "Unified overview"
                          : item.id === "employeeCodes"
                          ? "Manage employee codes"
                          : item.id === "users"
                          ? "Manage accounts"
                          : item.id === "branchs"
                          ? "Branch controls"
                          : item.id === "categories"
                          ? "Manage place categories"
                          : "Manage place tags"}
                      </p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        <div className={`${sidebarOpen ? "px-4" : "px-3"} py-4 border-t border-gray-700`}>
          <Button
            onClick={handleLogout}
            className={`${sidebarOpen ? "w-full" : "w-12 h-12 p-0"} bg-[#D9822B] hover:bg-[#c17424] text-white flex items-center justify-center`}
            title="Sign out"
          >
            {sidebarOpen ? (
              "Sign Out"
            ) : (
              <LogOut size={18} />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6">{renderContent()}</div>
      </div>
    </div>
  )
}