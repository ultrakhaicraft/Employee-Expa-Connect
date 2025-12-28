import { useEffect, useMemo, useState, type PropsWithChildren } from "react"

type PageTransitionProps = PropsWithChildren<{
  delayMs?: number
  durationMs?: number
  yOffset?: number
  xOffset?: number
  /** "fade", "slide-up", "slide-down", "slide-left", "slide-right", "zoom" */
  variant?: "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "zoom"
  className?: string
}>;

export function PageTransition({
  children,
  delayMs = 0,
  durationMs = 500,
  yOffset = 12,
  xOffset = 0,
  variant = "slide-up",
  className = "",
}: PageTransitionProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setIsMounted(true), delayMs)
    return () => clearTimeout(id)
  }, [delayMs])

  const hiddenTransform = useMemo(() => {
    switch (variant) {
      case "slide-up":
        return `translate3d(0, ${yOffset}px, 0)`
      case "slide-down":
        return `translate3d(0, -${yOffset}px, 0)`
      case "slide-left":
        return `translate3d(${xOffset}px, 0, 0)`
      case "slide-right":
        return `translate3d(-${xOffset}px, 0, 0)`
      case "zoom":
        return "scale(0.97)"
      case "fade":
      default:
        return "none"
    }
  }, [variant, yOffset, xOffset])

  const visibleTransform = useMemo(() => {
    switch (variant) {
      case "zoom":
        return "scale(1)"
      default:
        return "translate3d(0, 0, 0)"
    }
  }, [variant])

  return (
    <div
      style={{
        opacity: isMounted ? 1 : 0,
        transform: isMounted ? visibleTransform : hiddenTransform,
        transitionProperty: "opacity, transform",
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "opacity, transform",
      }}
      className={className}
    >
      {children}
    </div>
  )
}

export default PageTransition


