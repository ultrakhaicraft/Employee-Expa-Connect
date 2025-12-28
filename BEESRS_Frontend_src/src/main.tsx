import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './redux/store'
import './index.css'
import './styles/color-theme.css'
import App from './App.tsx'
import { ToasterProvider, useToasterContext } from '@/components/ui/toast'

function ToastBridge() {
  const { add } = useToasterContext()
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { title?: string; description?: string; variant?: 'default' | 'destructive' }
      add(detail)
    }
    window.addEventListener('app:toast', handler as EventListener)
    return () => window.removeEventListener('app:toast', handler as EventListener)
  }, [add])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ToasterProvider>
          <ToastBridge />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToasterProvider>
      </PersistGate>
    </Provider>
  </StrictMode>,
)
