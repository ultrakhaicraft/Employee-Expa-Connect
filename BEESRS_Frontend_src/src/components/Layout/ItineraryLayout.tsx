import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Header } from "@/commonPage/Header/Header"
import { MobileHeader } from "@/pages/public/Home/components/MobileHeader"
import { LeftSidebar } from "@/pages/public/Home/components/LeftSidebar"
import { MobileSidebar } from "@/pages/public/Home/components/MobileSidebar"
import { Toaster } from "@/components/ui/toaster"

export default function ItineraryLayout() {
  const [activeNavItem, setActiveNavItem] = useState('itinerary')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>
      
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50">
        <MobileHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />
      </div>
      
      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        activeItem={activeNavItem}
        onItemClick={setActiveNavItem}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Desktop only */}
        <div className="hidden lg:flex w-64 flex-shrink-0 border-r border-gray-200 bg-white">
          <div className="h-full overflow-y-auto">
            <LeftSidebar 
              activeItem={activeNavItem}
              onItemClick={setActiveNavItem}
            />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
          <Outlet />
        </main>
      </div>
      
      <Toaster />
    </div>
  )
}

