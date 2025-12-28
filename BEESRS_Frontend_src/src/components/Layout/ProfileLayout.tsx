import { useState, useEffect } from 'react'
import { Outlet, useLocation } from "react-router-dom"
import { Header } from "@/commonPage/Header/Header"
import { LeftSidebar } from "@/pages/public/Home/components/LeftSidebar"
import { MobileHeader } from "@/pages/public/Home/components/MobileHeader"
import { MobileSidebar } from "@/pages/public/Home/components/MobileSidebar"
import { Toaster } from "@/components/ui/toaster"

export default function ProfileLayout() {
  const location = useLocation()
  const [activeNavItem, setActiveNavItem] = useState('profile')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Update active nav item based on current route
  useEffect(() => {
    const path = location.pathname
    if (path === '/friends') {
      setActiveNavItem('friends')
    } else if (path === '/profile') {
      setActiveNavItem('profile')
    } else if (path === '/change-password') {
      setActiveNavItem('profile') // Change password is part of profile
    } else if (path === '/saved-places') {
      setActiveNavItem('profile')
    } else if (path === '/moderator') {
      setActiveNavItem('moderator')
    }
  }, [location.pathname])


  const contentHeight = 'calc(100vh - 80px)'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />
      
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />
      </div>
      
      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        activeItem={activeNavItem}
        onItemClick={setActiveNavItem}
      />

      <div className="flex w-full">
        {/* Left Sidebar - Desktop Only */}
        <div className="hidden lg:block">
          <LeftSidebar 
            activeItem={activeNavItem} 
            onItemClick={setActiveNavItem} 
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full">
          <div 
            className="max-w-6xl mx-auto p-4 lg:p-6 overflow-y-auto scrollbar-hide"
            style={{ maxHeight: contentHeight, minHeight: contentHeight }}
          >
            <Outlet />
          </div>
        </div>
      </div>
      
      {/* Toaster for notifications */}
      <Toaster />
    </div>
  )
}

