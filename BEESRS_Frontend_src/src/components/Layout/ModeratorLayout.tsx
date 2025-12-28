import { Outlet } from "react-router-dom"
import { Header } from "@/commonPage/Header/Header"

export default function ModeratorLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}

