import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/commonPage/Header/Header'
import { LeftSidebar } from '@/pages/public/Home/components/LeftSidebar'
import { MobileHeader } from '@/pages/public/Home/components/MobileHeader'
import { MobileSidebar } from '@/pages/public/Home/components/MobileSidebar'
import { Toaster } from '@/components/ui/toaster'

export default function ViewMoreOthersLayout() {
  const [activeNavItem, setActiveNavItem] = useState('home')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        {/* Left Sidebar - Desktop Only - Fixed Position */}
        <div className="hidden lg:block lg:fixed lg:left-0 lg:top-[80px] lg:bottom-0 lg:w-64 lg:overflow-y-auto scrollbar-hide" style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <LeftSidebar 
            activeItem={activeNavItem} 
            onItemClick={setActiveNavItem} 
          />
        </div>

        {/* Main Content - With left margin to account for fixed sidebar */}
        <div className="flex-1 w-full lg:ml-64">
          <Outlet />
        </div>
      </div>
      
      {/* Toaster for notifications */}
      <Toaster />
    </div>
  )
}

















