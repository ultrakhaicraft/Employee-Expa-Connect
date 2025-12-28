import { Header } from "@/commonPage/Header/Header"
import { LeftSidebar } from "@/pages/public/Home/components/LeftSidebar"
import { MobileHeader } from "@/pages/public/Home/components/MobileHeader"
import { MobileSidebar } from "@/pages/public/Home/components/MobileSidebar"
import { useState } from "react"
import { Toaster } from "react-hot-toast"
import { Outlet } from "react-router-dom"


export default function NotificationLayout() {
  const [activeNavItem, setActiveNavItem] = useState('notifications')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>
      
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

      <div className="flex">
        {/* Left Sidebar - Desktop only */}
        <div className="hidden lg:block">
          <LeftSidebar 
            activeItem={activeNavItem}
            onItemClick={setActiveNavItem}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      
      <Toaster />
    </div>
  )
}