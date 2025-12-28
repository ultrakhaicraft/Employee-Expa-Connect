import { useToasterContext } from "./toast"

export function useToast() {
  const { add } = useToasterContext()
  return {
    toast: (opts: { title?: string; description?: string; variant?: "default" | "destructive" }) => add(opts),
  }
}

export default useToast


