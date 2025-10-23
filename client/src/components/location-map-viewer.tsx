import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

interface LocationMapViewerProps {
  locations: Array<{
    lat: number;
    lng: number;
    label: string;
    color?: string;
  }>;
  className?: string;
}

export function LocationMapViewer({ locations, className = "" }: LocationMapViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || locations.length === 0) {
      return;
    }

    // Cleanup existing map instance
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Wait for container to be ready (same as existing implementation)
    const initMap = setTimeout(() => {
      if (!mapContainerRef.current) return;

      try {
        // Calculate center point from all locations
        const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
        const avgLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;

        // Create map instance (READ-ONLY mode - no user interaction)
        const map = L.map(mapContainerRef.current, {
          center: [avgLat, avgLng],
          zoom: 13,
          zoomControl: true, // Keep zoom buttons for viewing
          dragging: false, // Disable dragging
          touchZoom: false, // Disable touch zoom
          scrollWheelZoom: false, // Disable scroll wheel zoom
          doubleClickZoom: false, // Disable double-click zoom
          boxZoom: false, // Disable box zoom
          keyboard: false, // Disable keyboard navigation
        });

        // Add OpenStreetMap tiles (same as existing implementation)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Add markers for each location (NON-DRAGGABLE - read-only)
        locations.forEach((location) => {
          const iconColor = location.color || "#3b82f6";
          
          // Create custom colored icon
          const customIcon = L.divIcon({
            className: "custom-marker",
            html: `
              <div style="
                background-color: ${iconColor};
                width: 32px;
                height: 32px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 18px;">
                  📍
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          const marker = L.marker([location.lat, location.lng], {
            icon: customIcon,
            draggable: false, // READ-ONLY: no dragging allowed
          }).addTo(map);

          // Add popup with label
          marker.bindPopup(`<strong>${location.label}</strong>`);
        });

        // Fit map to show all markers
        if (locations.length > 1) {
          const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
          map.fitBounds(bounds, { padding: [50, 50] });
        }

        // Force resize after initial render (same as existing implementation)
        setTimeout(() => {
          map.invalidateSize();
        }, 100);

        mapRef.current = map;
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    }, 150); // Same 150ms delay as existing implementation

    return () => {
      clearTimeout(initMap);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className={`flex items-center justify-center h-80 bg-muted rounded-lg ${className}`}>
        <div className="text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No location data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Leaflet Map Container (same styling as existing implementation) */}
      <div
        ref={mapContainerRef}
        className="h-80 w-full rounded-lg border-2 border-border overflow-hidden"
        style={{ minHeight: "320px", position: "relative", zIndex: 1 }}
        data-testid="location-map-viewer"
      />

      {/* Display locations legend */}
      <div className="mt-3 space-y-2">
        {locations.map((location, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: location.color || "#3b82f6" }}
            />
            <span className="font-medium">{location.label}:</span>
            <span className="text-muted-foreground">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
