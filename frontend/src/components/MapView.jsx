import { useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api'

const GOOGLE_MAPS_API_KEY = "AIzaSyBgiw1hRkk_bxAyKHug9-1zAxohiIhsWDE"

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 }

const SEVERITY_COLORS = {
  CRITICAL: '#C0392B',
  MEDIUM: '#E67E22',
  LOW: '#27AE60',
}

const SEVERITY_RADIUS = {
  CRITICAL: 14000, // meters for circle
  MEDIUM: 10000,
  LOW: 7000,
}

// Dark theme for Google Maps
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
]

export default function MapView({ incidents = [], height = 320 }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  })

  const [map, setMap] = useState(null)
  const [selectedIncident, setSelectedIncident] = useState(null)

  const onLoad = useCallback(function callback(mapInstance) {
    setMap(mapInstance)
  }, [])

  const onUnmount = useCallback(function callback() {
    setMap(null)
  }, [])

  const validIncidents = incidents.filter(inc => inc.location?.lat && inc.location?.lng)

  if (!isLoaded) return <div style={{ width: '100%', height, backgroundColor: '#050E1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A9BB0', fontFamily: 'IBM Plex Mono' }}>Loading Google Maps...</div>

  return (
    <div style={{ position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={INDIA_CENTER}
        zoom={5}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: darkMapStyle,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        {validIncidents.map(inc => {
          const color = SEVERITY_COLORS[inc.severity] || '#B8C5D3'
          const radius = SEVERITY_RADIUS[inc.severity] || 7000
          
          return (
            <div key={inc.id || Math.random()}>
              {/* Outer pulsing effect for CRITICAL */}
              {inc.severity === 'CRITICAL' && (
                <Circle
                  center={{ lat: inc.location.lat, lng: inc.location.lng }}
                  radius={radius * 1.5}
                  options={{
                    fillColor: 'transparent',
                    fillOpacity: 0,
                    strokeColor: color,
                    strokeOpacity: 0.5,
                    strokeWeight: 1,
                  }}
                />
              )}
              
              <Circle
                center={{ lat: inc.location.lat, lng: inc.location.lng }}
                radius={radius}
                options={{
                  fillColor: color,
                  fillOpacity: 0.85,
                  strokeColor: '#0A1628',
                  strokeOpacity: 1,
                  strokeWeight: 1.5,
                }}
                onClick={() => setSelectedIncident(inc)}
              />
            </div>
          )
        })}

        {selectedIncident && (
          <InfoWindow
            position={{ lat: selectedIncident.location.lat, lng: selectedIncident.location.lng }}
            onCloseClick={() => setSelectedIncident(null)}
          >
            <div style={{ background: '#0F1E38', border: '1px solid #1A2E4A', padding: '12px', minWidth: '200px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <div style={{ fontSize: '9px', fontFamily: "'IBM Plex Mono', monospace", color: SEVERITY_COLORS[selectedIncident.severity] || '#B8C5D3', letterSpacing: '0.1em', marginBottom: '4px', textTransform: 'uppercase' }}>
                {selectedIncident.severity || 'LOW'} · {(selectedIncident.type || 'other').toUpperCase()}
              </div>
              <div style={{ fontSize: '12px', color: '#F0F4F8', marginBottom: '6px', lineHeight: '1.4' }}>
                {(selectedIncident.title || '').slice(0, 80)}
              </div>
              <div style={{ fontSize: '10px', color: '#8A9BB0', fontFamily: "'IBM Plex Mono', monospace" }}>
                {selectedIncident.source || ''} · {selectedIncident.status || 'open'}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 24, right: 10, zIndex: 1,
        backgroundColor: 'rgba(10,22,40,0.92)', border: '1px solid #1A2E4A',
        padding: '6px 10px', display: 'flex', gap: 12,
      }}>
        {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 8, color: '#8A9BB0', letterSpacing: '0.06em' }}>
              {sev}
            </span>
          </div>
        ))}
      </div>
      
      {/* Dark popup overrides */}
      <style>{`
        .gm-style .gm-style-iw-c {
          background-color: #0F1E38 !important;
          border: 1px solid #1A2E4A !important;
          padding: 0 !important;
          border-radius: 2px !important;
        }
        .gm-style .gm-style-iw-tc::after {
          background-color: #0F1E38 !important;
        }
        .gm-style .gm-style-iw-d {
          overflow: hidden !important;
        }
        .gm-ui-hover-effect {
          filter: invert(1);
          top: 0 !important;
          right: 0 !important;
        }
      `}</style>
    </div>
  )
}
