import { Menu } from 'lucide-react'

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">Home</span>
        </div>

        {/* Menu button only for mobile nav */}
        <button 
          onClick={onMenuClick}
          className="p-2 text-gray-600 hover:text-gray-900"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
