import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Home, 
  Bell, 
  Mail, 
  User, 
  Users,
  Map,
  Calendar,
  MoreHorizontal,
  Plus,
  Edit3,
  X,
  LogOut,
  Settings
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/redux/store'
import { logout } from '@/redux/authSlice'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { LoginRequiredModal } from '@/pages/public/Home/LoginRequiredModal'
import { colors, buttonStyles } from '@/lib/colors'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
  activeItem: string
  onItemClick: (item: string) => void
}

export function MobileSidebar({ isOpen, onClose, activeItem, onItemClick }: MobileSidebarProps) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, userProfile, decodedToken, roleName } = useSelector((state: RootState) => state.auth)
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    onClose() // Close mobile sidebar after logout
    // Nếu đang ở trang home thì refresh, nếu không thì navigate về home
    if (location.pathname === '/') {
      window.location.reload()
    } else {
      navigate('/')
    }
  }

  const handleNavigationClick = (item: any) => {
    // Allow home navigation without login
    if (item.id === 'home') {
      navigate('/')
      onClose()
      return
    }

    // Check if user is authenticated for other items
    if (!isAuthenticated) {
      setIsLoginRequiredModalOpen(true)
      onClose() // Close mobile sidebar
      return
    }

    // If authenticated, proceed with normal navigation
    if (item.href) {
      // This will be handled by Link component
      onClose() // Close mobile sidebar
      return
    }
    onItemClick(item.id)
    onClose() // Close mobile sidebar
  }
  
  const navigationItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'notifications', icon: Bell, label: 'Notifications', href: '/notification' },
    { id: 'messages', icon: Mail, label: 'Messages', href: '/conversations' },
    { id: 'friends', icon: Users, label: 'Friends', href: '/friends' },
    { id: 'itinerary', icon: Map, label: 'Itinerary', href: '/itinerary' },
    { id: 'events', icon: Calendar, label: 'Events', href: '/user/events' },
    { id: 'profile', icon: User, label: 'Profile', href: '/profile' },
  ]

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 lg:hidden transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-64 bg-white z-50 lg:hidden transform transition-transform duration-300 ease-in-out shadow-lg">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-end mb-8">
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const isHome = item.id === 'home'
              const baseClasses = isHome
                ? 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors'
                : 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left'
              const stateClasses = (active: boolean) => active
                ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                : (isHome ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-700')
              if (item.href) {
                // For items with href (like Profile), check authentication
                if (isAuthenticated) {
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => {
                        onItemClick(item.id)
                        onClose()
                      }}
                      className={`${baseClasses} ${stateClasses(activeItem === item.id)}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  )
                } else {
                  // Show as button for non-authenticated users
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigationClick(item)}
                      className={`${baseClasses} ${stateClasses(activeItem === item.id)}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  )
                }
              }
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigationClick(item)}
                  className={`${baseClasses} ${stateClasses(activeItem === item.id)}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            <Button 
              onClick={() => {
                navigate('/create-place')
                onClose()
              }}
              className={`w-full ${buttonStyles.primary}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Place
            </Button>
            <Button className={`w-full ${buttonStyles.secondary}`}>
              <Edit3 className="w-4 h-4 mr-2" />
              Blog Post
            </Button>
          </div>

          {/* User Menu */}
          {isAuthenticated && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer w-full">
                    {userProfile?.profilePictureUrl ? (
                      <img 
                        src={userProfile.profilePictureUrl} 
                        alt={userProfile.fullName || "User"} 
                        className="w-8 h-8 rounded-full object-cover"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement
                          if (fallback) {
                            fallback.style.display = 'flex'
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ 
                        background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                        display: userProfile?.profilePictureUrl ? 'none' : 'flex'
                      }}
                    >
                      <span className="text-white font-bold text-sm">
                        {(userProfile?.fullName || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || "User").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {userProfile?.fullName || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || "User"}
                      </p>
                      <p className="text-gray-500 text-xs">
                        @{(userProfile?.fullName || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || "user").toLowerCase().replace(/\s+/g, '')}
                      </p>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userProfile?.fullName || decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {roleName}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/change-password" className="flex items-center" onClick={onClose}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Change Password</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      
      {/* Login Required Modal */}
      <LoginRequiredModal 
        isOpen={isLoginRequiredModalOpen} 
        onClose={() => setIsLoginRequiredModalOpen(false)} 
      />
    </>
  )
}
