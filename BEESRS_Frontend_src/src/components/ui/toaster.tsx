import { Fragment } from "react"
import { ToastItem, useToasterContext } from "./toast"

function ToasterViewport() {
  const { toasts, remove } = useToasterContext()
  return (
    <div className="fixed z-[60] top-4 right-4 flex flex-col gap-3">
      {toasts.map((t) => (
        <Fragment key={t.id}>
          <ToastItem toast={t} onClose={remove} />
        </Fragment>
      ))}
    </div>
  )
}

export function Toaster() {
  return <ToasterViewport />
}

export default Toaster


