import { Button } from '@/components/ui/button'
import { 
  Home, 
  Bell, 
  Mail, 
  Users,
  Map,
  Calendar,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LoginRequiredModal } from '@/pages/public/Home/LoginRequiredModal'
import { buttonStyles } from '@/lib/colors'
import notificationService from '@/services/notificationService'

interface LeftSidebarProps {
  activeItem: string
  onItemClick: (item: string) => void
}

export function LeftSidebar({ activeItem, onItemClick }: LeftSidebarProps) {
  const navigate = useNavigate()
  const { isAuthenticated, roleName } = useSelector((state: RootState) => state.auth as any)
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread count
  useEffect(() => {
    if (isAuthenticated) {
      const fetchUnreadCount = async () => {
        try {
          const count = await notificationService.getUnreadCount()
          setUnreadCount(count)
        } catch (error) {
          console.error('Failed to fetch unread count:', error)
        }
      }

      fetchUnreadCount()
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      
      // Refresh on window focus
      const handleFocus = () => fetchUnreadCount()
      window.addEventListener('focus', handleFocus)

      return () => {
        clearInterval(interval)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [isAuthenticated])

  const handleNavigationClick = (item: any) => {
    // Allow home navigation without login
    if (item.id === 'home') {
      navigate('/')
      return
    }
    // Check if user is authenticated for other items
    if (!isAuthenticated) {
      setIsLoginRequiredModalOpen(true)
      return
    }
    // If authenticated, proceed with normal navigation
    if (item.href) {
      // This will be handled by Link component
      return
    }
    onItemClick(item.id)
  }
  
  const normalizedRole = String(roleName || '').toLowerCase()
  const dashboardNavItem =
    normalizedRole === 'moderator'
      ? { id: 'moderator', icon: ShieldCheck, label: 'Dashboard', href: '/moderator' } as const
      : normalizedRole === 'admin'
      ? { id: 'admin-dashboard', icon: ShieldCheck, label: 'Dashboard', href: '/admin' } as const
      : null

  const navigationItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'notifications', icon: Bell, label: 'Notifications', href: '/notification' },
    { id: 'messages', icon: Mail, label: 'Messages', href: '/conversations' },
    { id: 'friends', icon: Users, label: 'Friends', href: '/friends' },
    { id: 'itinerary', icon: Map, label: 'Itinerary', href: '/itinerary' },
    { id: 'events', icon: Calendar, label: 'Events', href: '/user/events' },
  ].concat(isAuthenticated && dashboardNavItem ? [dashboardNavItem] : [])

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full">
      <style>{`
        .left-sidebar-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .left-sidebar-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="p-6 space-y-8 overflow-y-auto left-sidebar-scroll">
        {/* Navigation */}
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const isHome = item.id === 'home'
            const isMessages = item.id === 'messages'
            const baseClasses = isHome
              ? 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200'
              : isMessages
              ? 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-none hover:bg-transparent focus:outline-none focus:ring-0 active:scale-100'
              : 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left'
            const stateClasses = (active: boolean) => active
              ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
              : (isHome ? 'text-gray-700 hover:bg-gray-200' : isMessages ? 'text-gray-700 hover:bg-transparent' : 'text-gray-700')
            if (item.href) {
              // For items with href (like Profile), check authentication
              if (isAuthenticated) {
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={() => onItemClick(item.id)}
                    className={`${baseClasses} ${stateClasses(activeItem === item.id)} ${isMessages ? 'no-underline focus-visible:outline-none focus:outline-none' : ''}`}
                    style={isMessages ? { transition: 'none' } : undefined}
                  >
                    <item.icon className={`w-5 h-5 ${isMessages ? 'transition-none' : ''}`} />
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="ml-auto px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full min-w-[24px] text-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )
              } else {
                // Show as button for non-authenticated users
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigationClick(item)}
                    className={`${baseClasses} ${stateClasses(activeItem === item.id)} ${isMessages ? 'no-underline focus-visible:outline-none focus:outline-none' : ''}`}
                    style={isMessages ? { transition: 'none' } : undefined}
                  >
                    <item.icon className={`w-5 h-5 ${isMessages ? 'transition-none' : ''}`} />
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="ml-auto px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full min-w-[24px] text-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                )
              }
            }
            return (
              <button
                key={item.id}
                onClick={() => handleNavigationClick(item)}
                className={`${baseClasses} ${stateClasses(activeItem === item.id)} ${isMessages ? 'no-underline focus-visible:outline-none focus:outline-none' : ''}`}
                style={isMessages ? { transition: 'none' } : undefined}
              >
                <item.icon className={`w-5 h-5 ${isMessages ? 'transition-none' : ''}`} />
                <span className="font-medium">{item.label}</span>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className="ml-auto px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full min-w-[24px] text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <Button 
            onClick={() => {
              if (!isAuthenticated) {
                setIsLoginRequiredModalOpen(true)
              } else {
                navigate('/create-place')
              }
            }}
            className={`w-full ${buttonStyles.primary}`.replace('transition-all duration-200', '')}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Place
          </Button>
          <Button 
            onClick={() => {
              if (!isAuthenticated) {
                setIsLoginRequiredModalOpen(true)
              } else {
                navigate('/user/events/create')
              }
            }}
            className={`w-full ${buttonStyles.secondary}`.replace('transition-all duration-200', '')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </div>

      </div>
      
      {/* Login Required Modal */}
      <LoginRequiredModal 
        isOpen={isLoginRequiredModalOpen} 
        onClose={() => setIsLoginRequiredModalOpen(false)} 
      />
    </div>
  )
}
