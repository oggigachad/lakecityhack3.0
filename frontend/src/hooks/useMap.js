import { useEffect, useRef } from 'react'

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }

function loadGoogleMapsScript() {
    if (window.google?.maps) return Promise.resolve()
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-verisignal-maps="true"]')
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true })
            existing.addEventListener('error', () => reject(new Error('Maps script failed')), { once: true })
            return
        }

        const key =
            import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        if (!key) {
            reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'))
            return
        }

        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=visualization`
        script.async = true
        script.defer = true
        script.dataset.verisignalMaps = 'true'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Google Maps script failed to load'))
        document.head.appendChild(script)
    })
}

export function useMap({
    mapRef,
    center = DEFAULT_CENTER,
    zoom = 5,
    pins = [],
    clickable = false,
    onMapClick,
    heatmap = false,
}) {
    const mapInstanceRef = useRef(null)
    const markerRefs = useRef([])
    const heatmapRef = useRef(null)

    useEffect(() => {
        let mounted = true
        loadGoogleMapsScript()
            .then(() => {
                if (!mounted || !mapRef.current || mapInstanceRef.current) return
                const map = new window.google.maps.Map(mapRef.current, {
                    center,
                    zoom,
                    styles: [
                        { elementType: 'geometry', stylers: [{ color: '#0A1628' }] },
                        { elementType: 'labels.text.fill', stylers: [{ color: '#B8C5D3' }] },
                        { elementType: 'labels.text.stroke', stylers: [{ color: '#0A1628' }] },
                        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050E1A' }] },
                        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1E3A5F' }] },
                    ],
                })
                if (clickable && onMapClick) {
                    map.addListener('click', (e) => {
                        onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() })
                    })
                }
                mapInstanceRef.current = map
            })
            .catch(() => {
                // Map renders fallback state in component if script/key is unavailable.
            })

        return () => {
            mounted = false
        }
    }, [mapRef, center.lat, center.lng, zoom, clickable, onMapClick])

    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map || !window.google?.maps) return

        markerRefs.current.forEach((marker) => marker.setMap(null))
        markerRefs.current = pins.map((pin) => new window.google.maps.Marker({
            map,
            position: { lat: pin.lat, lng: pin.lng },
            title: pin.title || '',
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: pin.severity === 'CRITICAL' ? '#C0392B' : pin.severity === 'MEDIUM' ? '#E67E22' : '#27AE60',
                fillOpacity: 0.95,
                strokeColor: '#ffffff',
                strokeWeight: 1.5,
            },
        }))

        if (heatmap) {
            if (!heatmapRef.current) {
                heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({ map })
            }
            heatmapRef.current.setData(
                pins.map((pin) => new window.google.maps.LatLng(pin.lat, pin.lng))
            )
            heatmapRef.current.set('radius', 24)
        } else if (heatmapRef.current) {
            heatmapRef.current.setMap(null)
            heatmapRef.current = null
        }
    }, [pins, heatmap])
}
