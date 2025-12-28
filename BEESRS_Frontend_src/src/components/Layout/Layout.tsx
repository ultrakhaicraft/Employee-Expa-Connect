import { Outlet, useLocation } from "react-router-dom"
import { Header } from "@/commonPage/Header/Header"
import { Footer } from "@/commonPage/Footer/Footer"
import { Toaster } from "@/components/ui/toaster"

export default function Layout() {
  const location = useLocation()
  const hideFooter = location.pathname.startsWith('/admin')
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      <Toaster />
    </div>
  )
}
