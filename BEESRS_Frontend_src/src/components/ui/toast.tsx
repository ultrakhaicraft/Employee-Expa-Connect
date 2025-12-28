import * as React from "react"

type Toast = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

type ToasterContextValue = {
  toasts: Toast[]
  add: (toast: Omit<Toast, "id">) => string
  remove: (id: string) => void
}

const ToasterContext = React.createContext<ToasterContextValue | null>(null)

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, ...toast }])
    // auto dismiss after 4s
    window.setTimeout(() => remove(id), 4000)
    return id
  }, [remove])

  const value = React.useMemo(() => ({ toasts, add, remove }), [toasts, add, remove])

  return <ToasterContext.Provider value={value}>{children}</ToasterContext.Provider>
}

export function useToasterContext() {
  const ctx = React.useContext(ToasterContext)
  if (!ctx) throw new Error("useToasterContext must be used within ToasterProvider")
  return ctx
}

export function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const color = toast.variant === "destructive" ? "bg-red-600 text-white" : "bg-foreground text-background"
  return (
    <div className={`pointer-events-auto w-full max-w-sm rounded-md shadow-lg ${color} border border-border`}>      
      <div className="p-4">
        {toast.title && <div className="font-semibold mb-1">{toast.title}</div>}
        {toast.description && <div className="text-sm opacity-90">{toast.description}</div>}
      </div>
      <button onClick={() => onClose(toast.id)} className="absolute top-2 right-2 text-sm opacity-80 hover:opacity-100">×</button>
    </div>
  )
}


