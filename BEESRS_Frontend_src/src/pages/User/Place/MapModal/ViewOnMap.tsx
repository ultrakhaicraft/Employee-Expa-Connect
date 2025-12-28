import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, X, Navigation } from 'lucide-react'

interface ViewOnMapProps {
  isOpen: boolean
  onClose: () => void
  placeName: string
  latitude: number | undefined
  longitude: number | undefined
  address?: string
}

function loadTrackAsiaOnce(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).trackasiagl) return resolve((window as any).trackasiagl)

    if (!document.getElementById('trackasia-gl-css')) {
      const link = document.createElement('link')
      link.id = 'trackasia-gl-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/trackasia-gl@latest/dist/trackasia-gl.css'
      document.head.appendChild(link)
    }

    const existing = document.getElementById('trackasia-gl-js')
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).trackasiagl))
      existing.addEventListener('error', () => reject(new Error('Load TrackAsia failed')))
      return
    }

    const script = document.createElement('script')
    script.id = 'trackasia-gl-js'
    script.src = 'https://unpkg.com/trackasia-gl@latest/dist/trackasia-gl.js'
    script.async = true
    script.onload = () => resolve((window as any).trackasiagl)
    script.onerror = () => reject(new Error('Load TrackAsia failed'))
    document.body.appendChild(script)
  })
}

export default function ViewOnMap({ isOpen, onClose, placeName, latitude, longitude, address }: ViewOnMapProps) {
  const mapRef = useRef<any | null>(null)
  const markerRef = useRef<any | null>(null)
  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const KEY = import.meta.env.VITE_TRACKASIA_KEY as string
  const styleUrl = `https://maps.track-asia.com/styles/v2/streets.json?key=${KEY}`

  // Initialize map and marker
  useEffect(() => {
    if (!isOpen || !latitude || !longitude) return

    let disposed = false

    const initMap = async () => {
      // Wait for mapDivRef to be available
      let retries = 0
      while (!mapDivRef.current && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        retries++
      }

      if (disposed || !mapDivRef.current) return

      try {
        const ta = await loadTrackAsiaOnce()
        if (disposed || !mapDivRef.current) return

        const center: [number, number] = [longitude, latitude]

        const map = new ta.Map({
          container: mapDivRef.current,
          style: styleUrl,
          center,
          zoom: 15,
        })

        mapRef.current = map

        map.on('load', () => {
          if (disposed) return
          
          // Add marker at place location
          if (markerRef.current) {
            markerRef.current.remove()
          }

          // Create a custom HTML marker
          const el = document.createElement('div')
          el.className = 'custom-marker'
          el.style.width = '40px'
          el.style.height = '40px'
          el.style.backgroundImage = 'url(https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png)'
          el.style.backgroundSize = 'contain'
          el.style.backgroundRepeat = 'no-repeat'
          el.style.backgroundPosition = 'center'
          el.style.cursor = 'pointer'

          markerRef.current = new ta.Marker({
            element: el,
            anchor: 'bottom'
          })
            .setLngLat(center)
            .addTo(map)

          // Add popup to marker
          const popup = new ta.Popup({ offset: 25, closeOnClick: false })
            .setLngLat(center)
            .setHTML(`
              <div style="padding: 8px; max-width: 200px;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #1f2937;">${placeName}</div>
                ${address ? `<div style="font-size: 12px; color: #6b7280;">${address}</div>` : ''}
              </div>
            `)
          
          markerRef.current.setPopup(popup)

          setMapLoaded(true)
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.resize()
            }
          }, 100)
        })

        const onResize = () => {
          if (mapRef.current) {
            mapRef.current.resize()
          }
        }
        window.addEventListener('resize', onResize)

        return () => {
          window.removeEventListener('resize', onResize)
        }
      } catch (e) {
        console.error('[ViewOnMap] init failed:', e)
        setMapLoaded(false)
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initMap()
    }, 100)

    return () => {
      clearTimeout(timer)
      disposed = true
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      setMapLoaded(false)
    }
  }, [isOpen, latitude, longitude, placeName, address, styleUrl])

  // Resize map when modal opens
  useEffect(() => {
    if (isOpen && mapRef.current && mapLoaded) {
      setTimeout(() => mapRef.current.resize(), 100)
    }
  }, [isOpen, mapLoaded])

  const handleGetDirections = () => {
    if (latitude && longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  if (!latitude || !longitude) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-3 text-slate-900">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold">{placeName}</div>
                {address && (
                  <div className="text-sm font-normal text-slate-600 mt-0.5">{address}</div>
                )}
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGetDirections}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 border-none shadow-sm"
              >
                <Navigation className="w-4 h-4" />
                Get Directions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 p-6">
          {/* Map Container */}
          <Card className="h-full min-h-0 border border-slate-200 shadow-lg overflow-hidden">
            <CardContent className="p-0 h-full relative">
              <div
                ref={mapDivRef}
                className="w-full h-full rounded-lg overflow-hidden bg-slate-100"
              />
              
              {/* Loading overlay */}
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 backdrop-blur-sm z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="spinner-gradient h-10 w-10"></div>
                    <p className="text-sm text-slate-600 font-medium">Loading map...</p>
                  </div>
                </div>
              )}

              {/* Coordinates Info */}
              {mapLoaded && (
                <div className="absolute bottom-4 left-4 rounded-xl border border-white/60 bg-white/90 backdrop-blur p-3 shadow-xl space-y-1 text-xs text-slate-700">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Location</p>
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">Latitude:</span>
                    <span className="text-slate-900">{latitude.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">Longitude:</span>
                    <span className="text-slate-900">{longitude.toFixed(6)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
