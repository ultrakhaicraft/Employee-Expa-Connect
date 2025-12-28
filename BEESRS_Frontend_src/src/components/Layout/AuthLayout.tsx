import { Outlet } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}

