import { Route, Routes, Navigate } from "react-router-dom"
import Layout from "./components/Layout/Layout"
import AuthLayout from "./components/Layout/AuthLayout"
import ProfileLayout from "./components/Layout/ProfileLayout"
import ItineraryLayout from "./components/Layout/ItineraryLayout"
import EventLayout from "./components/Layout/EventLayout"
import ViewMoreOthersLayout from "./components/Layout/ViewMoreOthersLayout"
import Login from "./pages/public/Login/Login"
import Register from "./pages/public/Register/Register"
import NewHomePage from "./pages/public/Home/NewHomePage"
import AdminDashboard from "./pages/Admin/admin-dashboard/admin-dashboard"
import ViewProfile from "./pages/User/ViewProfile/ViewProfile"
import ChangePassword from "./pages/User/ChangePassword/ChangePassword"
import ForgotPassword from "./pages/User/ForgotPassword/ForgotPassword"
import ResetPassword from "./pages/User/ForgotPassword/ResetPassword"
import ViewAllFriends from "./pages/User/Friends/ViewAllFriends"
import ViewMoreOthers from "./pages/User/Friends/ViewMoreOthers"
import ViewOtherProfile from "./pages/User/Friends/ViewOtherProfile"
import CreateNewPlacePage from "./pages/User/Place/CreateNewPlacePage"
import PlaceDetailPage from "./pages/User/Place/PlaceDetailPage"
import ViewSearchPlaceDetail from "./pages/User/Place/SearchPlace/ViewSearchPlaceDetail"
import ViewSearchPlaceResult from "./pages/User/Place/SearchPlace/ViewSearchPlaceResult"
import ViewSavedPlaces from "./pages/User/ViewProfile/ViewPlace/ViewSavedPlaces"

import { ChatPage } from "./pages/User/ChatPage"
import ItineraryList from "./pages/User/Itinerary/ItineraryList"
import CreateItinerary from "./pages/User/Itinerary/CreateItinerary"
import ItineraryDetail from "./pages/User/Itinerary/ItineraryDetail"
import TemplateGallery from "./pages/User/Itinerary/TemplateGallery"
import ItineraryAnalytics from "./pages/User/Itinerary/ItineraryAnalytics"
import ItineraryDetailStatistics from "./pages/User/Itinerary/ItineraryDetailStatistics"
import { FloatingChatWidget } from "./components/FloatingChat/FloatingChatWidget"
import { ConversationsPage } from "./pages/User/Conversations"
import CreateEventPage from "./pages/User/Events/CreateEventPage"
import EventListPage from "./pages/User/Events/EventListPage"
import EventDetailPage from "./pages/User/Events/EventDetailPage"
import EventAnalyticsPage from "./pages/User/Events/EventAnalyticsPage"
import EventTemplatesPage from "./pages/User/Events/EventTemplatesPage"
import EventChatPage from "./pages/User/Events/EventChatPage"
import RecurringEventsPage from "./pages/User/Events/RecurringEventsPage"
import EventWaitlistPage from "./pages/User/Events/EventWaitlistPage"
import BranchEventsSummaryPage from "./pages/User/Events/BranchEventsSummaryPage"
import LandingPage from "./pages/public/LandingPage/LandingPage"

import RoleBasedRoute from "./authentication/RoleBasedRoute"
import NotAuthorized from "./authentication/NotAuthorized"
import ModeratorDashboard from "./pages/Moderator/moderator-dashboard/ModeratorDashboard"
import ModeratorLayout from "./components/Layout/ModeratorLayout"

import notificationService from "./services/notificationService"
import { useEffect, useState, useRef } from "react"
import type { ReactElement } from "react"
import { useSelector } from "react-redux"
import NotificationMainPage from "./pages/User/Notification/NotificationMainPage"
import NotificationLayout from "./components/Layout/NotificationLayout"
import NotificationDetailPage from "./pages/User/Notification/NotificationDetailPage"
import type { RootState } from "./redux/store"
import LoginLoadingScreen from "./components/Transition/LoginLoadingScreen"

function ProtectedRoute({ element }: { element: ReactElement }) {
  const { isAuthenticated, accessToken } = useSelector((state: RootState) => state.auth)
  const persistedToken = accessToken || localStorage.getItem("accessToken") || localStorage.getItem("access_token")

  if (!isAuthenticated && !persistedToken) {
    // If user is not authenticated, always send them back to the landing page
    return <Navigate to="/" replace />
  }

  return element
}

// Routes that should only be accessible when NOT authenticated
function GuestRoute({ element }: { element: ReactElement }) {
  const { isAuthenticated, accessToken } = useSelector((state: RootState) => state.auth)
  const persistedToken = accessToken || localStorage.getItem("accessToken") || localStorage.getItem("access_token")

  if (isAuthenticated || persistedToken) {
    // User is already logged in → send them to home
    return <Navigate to="/" replace />
  }

  return element
}

function App() {
  const [showLoginLoading, setShowLoginLoading] = useState(false)
  const isMountedRef = useRef(true);

  //Setup global notification
  useEffect(() => {
    isMountedRef.current = true;
    
    const setupConnection = async () => {
      // Small delay to let React Strict Mode settle
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (isMountedRef.current) {
        try {
          await notificationService.connect();
        } catch (error) {
          // Only log if component is still mounted
          if (isMountedRef.current) {
            console.error('Failed to connect to notification service:', error);
          }
        }
      }
    };
    
    setupConnection();
    
    return () => {
      isMountedRef.current = false;
      // Cleanup on unmount - notificationService will handle race conditions
      notificationService.disconnect().catch(err => {
        // Ignore errors during cleanup
      });
    };
  }, []);

  // Check for login loading screen flag
  useEffect(() => {
    const checkLoading = () => {
      const shouldShow = localStorage.getItem('showLoginLoading') === 'true'
      if (shouldShow && !showLoginLoading) {
        setShowLoginLoading(true)
      }
    }
    
    checkLoading()
    // Check periodically in case flag is set after component mounts
    const interval = setInterval(checkLoading, 100)
    return () => clearInterval(interval)
  }, [showLoginLoading])

  // Handle loading screen completion
  const handleLoadingComplete = () => {
    localStorage.removeItem('showLoginLoading')
    const pendingRoleName = localStorage.getItem('pendingRoleName')
    localStorage.removeItem('pendingRoleName')
    setShowLoginLoading(false)
    
    // Navigate based on role using window.location to avoid Router context issues
    setTimeout(() => {
      if (pendingRoleName === "Admin") {
        window.location.href = "/admin"
      } else if (pendingRoleName === "Moderator") {
        window.location.href = "/moderator"
      } else {
        window.location.href = "/"
      }
    }, 100)
  }

  const { isAuthenticated, roleName } = useSelector((state: RootState) => state.auth)

  return (
    <>
      <Routes>
      {/* Homepage with new design - redirect admin/moderator to their dashboards */}
      <Route
        path="/"
        element={
          !isAuthenticated
            ? <LandingPage />
            : (roleName === "Admin" || roleName === "admin")
              ? <Navigate to="/admin" replace />
              : (roleName === "Moderator" || roleName === "moderator")
                ? <Navigate to="/moderator" replace />
                : <NewHomePage />
        }
      />
      
      {/* Other pages with layout wrapper */}
      
      
      <Route path="/login" element={<GuestRoute element={<AuthLayout />} />}>
        <Route index element={<Login />} />
      </Route>
      
      {/* Moderator Routes */}
      <Route path="/moderator" element={<ModeratorLayout />}>
        <Route
          index
          element={
            <RoleBasedRoute
              requiredRole={['2','moderator']}
              element={<ModeratorDashboard />}
            />
          }
        />
      </Route>

      <Route path="/register" element={<GuestRoute element={<AuthLayout />} />}>
        <Route index element={<Register />} />
      </Route>
      
      <Route path="/forgot-password" element={<GuestRoute element={<AuthLayout />} />}>
        <Route index element={<ForgotPassword />} />
      </Route>
      
      <Route path="/reset-password" element={<GuestRoute element={<AuthLayout />} />}>
        <Route index element={<ResetPassword />} />
      </Route>
      
      <Route path="/admin" element={<Layout />}>
        <Route
          index
          element={
            <RoleBasedRoute
              requiredRole={['1','admin','administrator']}
              element={<AdminDashboard />}
            />
          }
        />
      </Route>
      
      <Route path="/profile" element={<ProtectedRoute element={<ProfileLayout />} />}>
        <Route index element={<ViewProfile />} />
      </Route>
      
      <Route path="/create-place" element={<ProtectedRoute element={<CreateNewPlacePage />} />} />
      <Route path="/place/:id" element={<ProtectedRoute element={<PlaceDetailPage />} />} />
      <Route path="/search-places" element={<ProtectedRoute element={<ViewSearchPlaceDetail />} />} />
      <Route path="/search-places-result" element={<ProtectedRoute element={<ViewSearchPlaceResult />} />} />
      
      <Route path="/change-password" element={<ProtectedRoute element={<ProfileLayout />} />}>
        <Route index element={<ChangePassword />} />
      </Route>

      <Route path="/saved-places" element={<ProtectedRoute element={<ProfileLayout />} />}>
        <Route index element={<ViewSavedPlaces />} />
      </Route>
      
      <Route path="/friends" element={<ProtectedRoute element={<ProfileLayout />} />}>
        <Route index element={<ViewAllFriends />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="profile" element={<ViewProfile />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="chat" element={<ChatPage />} />
      </Route>

      {/* View More Others - require authentication */}
      <Route path="/view-more-others" element={<ProtectedRoute element={<ViewMoreOthersLayout />} />}>
        <Route index element={<ViewMoreOthers />} />
      </Route>

      {/* View Other Profile - require authentication */}
      <Route path="/view-other-profile/:userId" element={<ProtectedRoute element={<ViewMoreOthersLayout />} />}>
        <Route index element={<ViewOtherProfile />} />
      </Route>

      {/* Itinerary Routes */}
      <Route path="/itinerary" element={<ProtectedRoute element={<ItineraryLayout />} />}>
        <Route index element={<ItineraryList />} />
        <Route path="create" element={<CreateItinerary />} />
        <Route path="templates" element={<TemplateGallery />} />
        <Route path="analytics" element={<ItineraryAnalytics />} />
        <Route path=":id" element={<ItineraryDetail />} />
        <Route path=":id/statistics" element={<ItineraryDetailStatistics />} />
      </Route>

      {/* Notification Routes */}
      <Route path="/notification" element={<ProtectedRoute element={<NotificationLayout/>} />}>
        <Route index element={<NotificationMainPage/>} />
        <Route path =":notificationId" element= {<NotificationDetailPage/>}/>
      </Route>

      {/* Authorization handling */}
      <Route path="/unauthorized" element={<NotAuthorized />} />

      {/* Conversations Routes - Real-time user-to-user chat */}
      <Route
        path="/conversations"
        element={<ProtectedRoute element={<ConversationsPage />} />}
      />
      <Route
        path="/conversations/:conversationId"
        element={<ProtectedRoute element={<ConversationsPage />} />}
      />

      {/* Event Routes - Group event planning with AI */}
      <Route path="/user/events" element={<ProtectedRoute element={<EventLayout />} />}>
        <Route index element={<EventListPage />} />
        <Route path="create" element={<CreateEventPage />} />
        <Route path="templates" element={<EventTemplatesPage />} />
        <Route path="analytics" element={<EventAnalyticsPage />} />
        <Route path="recurring" element={<RecurringEventsPage />} />
        <Route path="branch-summary" element={<BranchEventsSummaryPage />} />
        <Route path=":id" element={<EventDetailPage />} />
        <Route path=":id/analytics" element={<EventAnalyticsPage />} />
        <Route path=":id/chat" element={<EventChatPage />} />
        <Route path=":id/waitlist" element={<EventWaitlistPage />} />
      </Route>
    </Routes>
    
    {/* Floating Chat Widget - Global for all pages */}
    {/* <ToastContainer 
      position="top-right"
      autoClose={3000}
      theme="dark"
      transition={Slide}
    /> */}
    <FloatingChatWidget />
    
    {/* Global Login Loading Screen - Rendered at App level to persist across route changes */}
    {showLoginLoading && (
      <LoginLoadingScreen 
        onComplete={handleLoadingComplete}
        duration={2000}
        show={showLoginLoading}
      />
    )}
    </>
  )
}

export default App