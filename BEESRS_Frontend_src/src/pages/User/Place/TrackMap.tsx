// src/components/TrackMap.tsx
import { useEffect, useRef, useState } from "react";
import { Search, X, MapPin } from "lucide-react";

type PlaceMarker = {
  placeId: string;
  latitude: number;
  longitude: number;
  categoryName: string;
};

type Props = {
  onPick: (
    lat: number,
    lng: number,
    address?: string,
    city?: string,
    stateProvince?: string,
    googlePlaceId?: string
  ) => void;
  onBoundsChanged?: (minLat: number, maxLat: number, minLng: number, maxLng: number) => void;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  visible?: boolean; // true khi modal map đang mở
  places?: PlaceMarker[]; // Places to display as markers
  onPlaceClick?: (placeId: string) => void; // Callback when marker is clicked
  getCategoryIcon?: (categoryName: string) => string; // Function to get icon for category
};

// nạp SDK TrackAsia 1 lần
function loadTrackAsiaOnce(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).trackasiagl) return resolve((window as any).trackasiagl);

    if (!document.getElementById("trackasia-gl-css")) {
      const link = document.createElement("link");
      link.id = "trackasia-gl-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/trackasia-gl@latest/dist/trackasia-gl.css";
      document.head.appendChild(link);
    }

    const existing = document.getElementById("trackasia-gl-js");
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).trackasiagl));
      existing.addEventListener("error", () => reject(new Error("Load TrackAsia failed")));
      return;
    }

    const script = document.createElement("script");
    script.id = "trackasia-gl-js";
    script.src = "https://unpkg.com/trackasia-gl@latest/dist/trackasia-gl.js";
    script.async = true;
    script.onload = () => resolve((window as any).trackasiagl);
    script.onerror = () => reject(new Error("Load TrackAsia failed"));
    document.body.appendChild(script);
  });
}

function extractCityState(result: any) {
  const out: { address?: string; city?: string; state?: string } = {};
  out.address = result?.formatted_address || result?.formattedAddress;

  const comps = result?.address_components || result?.addressComponents || result?.components;
  if (Array.isArray(comps)) {
    for (const c of comps) {
      const types: string[] = c.types || (c.type ? [c.type] : []);
      if (types.includes("administrative_area_level_1") || types.includes("state")) {
        out.state = c.long_name || c.name || c.text;
      }
      if (
        types.includes("administrative_area_level_2") ||
        types.includes("administrative_area_level_3") ||
        types.includes("district") ||
        types.includes("city") ||
        types.includes("locality")
      ) {
        out.city = c.long_name || c.name || c.text;
      }
    }
  } else {
    out.city = result?.city || result?.district || out.city;
    out.state = result?.state || result?.province || out.state;
  }
  return out;
}

async function reverseGeocode(lat: number, lng: number, KEY: string) {
  const url = `https://maps.track-asia.com/api/v2/geocode/reverse/json?latlng=${lat},${lng}&new_admin=true&key=${KEY}`;
  const r = await fetch(url);
  const j = await r.json();
  const first = j?.results?.[0];
  const { address, city, state } = extractCityState(first || {});
  return { address, city, state };
}

async function autocomplete(input: string, KEY: string) {
  const url = `https://maps.track-asia.com/api/v2/place/autocomplete/json?input=${encodeURIComponent(
    input
  )}&size=8&key=${KEY}`;
  const r = await fetch(url);
  const j = await r.json();
  const list = j?.predictions || j?.results || [];
  return list.map((p: any) => ({
    place_id: p.place_id || p.placeId || p.id,
    description: p.description || p.text || p.name,
  }));
}

async function placeDetails(placeId: string, KEY: string) {
  const url = `https://maps.track-asia.com/api/v2/place/details/json?place_id=${encodeURIComponent(
    placeId
  )}&key=${KEY}`;
  const r = await fetch(url);
  const j = await r.json();
  const res = j?.result || j?.data || {};

  const loc =
    res?.geometry?.location ||
    res?.geometry?.coordinates ||
    (Array.isArray(res?.center) ? { lng: res.center[0], lat: res.center[1] } : undefined);

  const lat = loc?.lat ?? (typeof loc?.[1] === "number" ? loc[1] : undefined);
  const lng = loc?.lng ?? (typeof loc?.[0] === "number" ? loc[0] : undefined);

  const { address, city, state } = extractCityState(res);
  return { lat, lng, address, city, state, googlePlaceId: placeId };
}

export function TrackMap({
  onPick,
  onBoundsChanged,
  center = [106.700981, 10.776889],
  zoom = 12,
  visible = true,
  places = [],
  onPlaceClick,
  getCategoryIcon,
}: Props) {
  const KEY = import.meta.env.VITE_TRACKASIA_KEY as string;
  const styleUrl = `https://maps.track-asia.com/styles/v2/streets.json?key=${KEY}`;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);
  const placeMarkersRef = useRef<any[]>([]);
  const mapLoadedRef = useRef<boolean>(false);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [sugs, setSugs] = useState<Array<{ place_id: string; description: string }>>([]);
  const [loadingSug, setLoadingSug] = useState(false);

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const ta = await loadTrackAsiaOnce();
        if (disposed || !mapDivRef.current) return;

        const map = new ta.Map({
          container: mapDivRef.current,
          style: styleUrl,
          center,
          zoom,
        });
        mapRef.current = map;

        const putMarker = (lng: number, lat: number) => {
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = new ta.Marker().setLngLat([lng, lat]).addTo(map);
        };

        map.on("load", () => {
          mapLoadedRef.current = true;
          setTimeout(() => {
            map.resize();
            // Ensure map canvas doesn't block search input
            if (mapDivRef.current) {
              const mapRect = mapDivRef.current.getBoundingClientRect();
              const canvas = mapDivRef.current.querySelector('canvas');
              if (canvas) {
                const canvasEl = canvas as HTMLElement;
                canvasEl.style.zIndex = '1';
                // Make canvas not intercept pointer events in the top area where search box is
                // We'll use CSS to create a "hole" for the search box
              }
              // Find all child elements and ensure they don't block search
              const allChildren = mapDivRef.current.querySelectorAll('*');
              allChildren.forEach((el) => {
                const htmlEl = el as HTMLElement;
                if (htmlEl.tagName === 'CANVAS') {
                  htmlEl.style.zIndex = '1';
                } else {
                  // Ensure other map controls don't block search
                  const rect = htmlEl.getBoundingClientRect();
                  // If element is in top 80px area (where search box is), lower its z-index
                  if (rect.top < mapRect.top + 80) {
                    htmlEl.style.zIndex = '1';
                  }
                }
              });
            }
            // Force search box to be on top
            const searchInput = document.getElementById('trackmap-search-input');
            if (searchInput && searchInput.parentElement) {
              const parent = searchInput.parentElement as HTMLElement;
              parent.style.zIndex = '99999';
              parent.style.pointerEvents = 'auto';
              (searchInput as HTMLElement).style.zIndex = '100000';
              (searchInput as HTMLElement).style.pointerEvents = 'auto';
            }
            if (onBoundsChanged) {
              try {
                const b = map.getBounds();
                const minLat = b.getSouth();
                const maxLat = b.getNorth();
                const minLng = b.getWest();
                const maxLng = b.getEast();
                onBoundsChanged(minLat, maxLat, minLng, maxLng);
              } catch {}
            }
          }, 100);
        });

        if (onBoundsChanged) {
          const triggerBoundsChange = () => {
            try {
              const b = map.getBounds();
              const minLat = b.getSouth();
              const maxLat = b.getNorth();
              const minLng = b.getWest();
              const maxLng = b.getEast();
              onBoundsChanged(minLat, maxLat, minLng, maxLng);
            } catch (e) {
              console.error('TrackMap: error getting bounds', e);
            }
          };

          map.on("moveend", triggerBoundsChange);
          map.on("zoomend", triggerBoundsChange);
          map.on("dragend", triggerBoundsChange);
        }

        map.on("click", async (e: any) => {
          const { lng, lat } = e.lngLat;
          putMarker(lng, lat);
          try {
            const { address, city, state } = await reverseGeocode(lat, lng, KEY);
            onPick(lat, lng, address, city, state);
          } catch {
            onPick(lat, lng);
          }
        });

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (r) => map.flyTo({ center: [r.coords.longitude, r.coords.latitude], zoom: 15 }),
            () => {}
          );
        }

        const onResize = () => map.resize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
      } catch (e) {
        console.error("[TrackMap] init failed:", e);
      }
    })();
    return () => {
      disposed = true;
      mapLoadedRef.current = false;
      // Clean up place markers
      placeMarkersRef.current.forEach(marker => {
        if (marker) marker.remove();
      });
      placeMarkersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [styleUrl, center?.[0], center?.[1], zoom]);

  // Update place markers when places change
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current || !places.length || !getCategoryIcon) return;

    const ta = (window as any).trackasiagl;
    if (!ta) return;

    // Remove existing place markers
    placeMarkersRef.current.forEach(marker => {
      if (marker) marker.remove();
    });
    placeMarkersRef.current = [];

    // Add new markers for each place
    places.forEach((place) => {
      if (typeof place.latitude !== 'number' || typeof place.longitude !== 'number') return;

      const icon = getCategoryIcon(place.categoryName);
      
      // Create wrapper div with fixed size to prevent marker movement
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
      `;
      
      // Create inner element for icon with hover effect
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = icon;
      el.style.cssText = `
        font-size: 24px;
        transition: transform 0.2s ease;
        transform-origin: center center;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      wrapper.appendChild(el);
      
      wrapper.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
      });
      wrapper.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });
      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onPlaceClick) {
          onPlaceClick(place.placeId);
        }
      });

      const marker = new ta.Marker({ element: wrapper })
        .setLngLat([place.longitude, place.latitude])
        .addTo(mapRef.current);
      
      placeMarkersRef.current.push(marker);
    });
  }, [places, getCategoryIcon, onPlaceClick]);

  useEffect(() => {
    if (visible && mapRef.current) setTimeout(() => mapRef.current.resize(), 10);
  }, [visible]);

  // Autocomplete
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!query || query.length < 2) {
        setSugs([]);
        return;
      }
      setLoadingSug(true);
      try {
        const list = await autocomplete(query, KEY);
        if (!cancelled) setSugs(list);
      } catch {
        if (!cancelled) setSugs([]);
      } finally {
        if (!cancelled) setLoadingSug(false);
      }
    };
    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, KEY]);

  const chooseSuggestion = async (s: { place_id: string; description: string }) => {
    setQuery(s.description);
    setSugs([]);
    try {
      const det = await placeDetails(s.place_id, KEY);
      if (typeof det.lat === "number" && typeof det.lng === "number" && mapRef.current) {
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = new (window as any).trackasiagl.Marker()
          .setLngLat([det.lng, det.lat])
          .addTo(mapRef.current);
        mapRef.current.flyTo({ center: [det.lng, det.lat], zoom: 16 });
        onPick(det.lat, det.lng, det.address, det.city, det.state, det.googlePlaceId);
      }
    } catch (e) {
      console.warn("place details failed", e);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Search Box - Outside map container to avoid canvas blocking */}
      <div style={{ marginBottom: "12px" }}>
        <div 
          style={{ 
            position: "relative",
            display: "flex",
            alignItems: "center",
            background: "white",
            borderRadius: "12px",
            border: focused ? "2px solid #3b82f6" : "2px solid #e5e7eb",
            boxShadow: focused 
              ? "0 4px 12px rgba(59, 130, 246, 0.15)" 
              : "0 2px 8px rgba(0, 0, 0, 0.08)",
            transition: "all 0.2s ease",
            overflow: "hidden",
          }}
        >
          {/* Search Icon */}
          <div style={{ 
            padding: "0 12px", 
            display: "flex", 
            alignItems: "center",
            color: "#6b7280"
          }}>
            <Search size={20} />
          </div>

          {/* Input Field */}
          <input
            id="trackmap-search-input"
            name="trackmap-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search address or place…"
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            style={{
              flex: 1,
              padding: "12px 8px",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "15px",
              color: "#1f2937",
              cursor: "text",
            }}
          />

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery("");
                const input = document.getElementById('trackmap-search-input') as HTMLInputElement;
                if (input) input.focus();
              }}
              style={{
                padding: "8px",
                display: "flex",
                alignItems: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6b7280",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#6b7280";
              }}
            >
              <X size={18} />
            </button>
          )}

          {/* Loading Indicator */}
          {loadingSug && (
            <div style={{ 
              padding: "0 12px", 
              display: "flex", 
              alignItems: "center",
              color: "#6b7280"
            }}>
              <div style={{
                width: "16px",
                height: "16px",
                border: "2px solid #e5e7eb",
                borderTop: "2px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite"
              }} />
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {focused && sugs.length > 0 && (
          <div
            style={{
              marginTop: "8px",
              background: "white",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
              overflow: "hidden",
              maxHeight: "300px",
              overflowY: "auto",
              zIndex: 1000,
              position: "relative",
            }}
          >
            {sugs.map((s, index) => (
              <button
                key={s.place_id}
                type="button"
                onClick={() => chooseSuggestion(s)}
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 16px",
                  cursor: "pointer",
                  border: "none",
                  background: "white",
                  borderBottom: index < sugs.length - 1 ? "1px solid #f3f4f6" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                }}
              >
                <MapPin size={18} style={{ color: "#6b7280", flexShrink: 0 }} />
                <span style={{ 
                  color: "#1f2937", 
                  fontSize: "14px",
                  flex: 1,
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap"
                }}>
                  {s.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapDivRef}
        style={{ 
          width: "100%", 
          height: 480, 
          borderRadius: 12, 
          overflow: "hidden", 
          background: "#f3f4f6",
          position: "relative",
          zIndex: 1
        }}
      />
      
      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// cung cấp cả default lẫn named export để import cách nào cũng được
export default TrackMap;
