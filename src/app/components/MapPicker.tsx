import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "",
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
      <div style="
        width:36px;height:36px;border-radius:50% 50% 50% 0;
        background:#66FCF1;border:3px solid #0B0C10;
        transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(102,252,241,0.5)
      "></div>
      <div style="width:6px;height:10px;background:#66FCF1;margin-top:-2px;border-radius:0 0 3px 3px;opacity:0.7"></div>
    </div>
  `,
  iconSize: [36, 50],
  iconAnchor: [18, 50],
  popupAnchor: [0, -52],
});

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface MapPickerProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: { lat: number; lng: number };
}

export function MapPicker({ onLocationSelect, initialLocation }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [coords, setCoords] = useState(initialLocation ?? { lat: -6.2088, lng: 106.8456 });
  const [loadingAddress, setLoadingAddress] = useState(false);

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "id" } }
      );
      const data = await res.json();
      return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(
      [coords.lat, coords.lng],
      13
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], { draggable: true, icon: pinIcon }).addTo(map);
    marker.bindPopup("Lokasi jalan rusak").openPopup();

    async function handleMove(lat: number, lng: number) {
      setCoords({ lat, lng });
      setLoadingAddress(true);
      const address = await reverseGeocode(lat, lng);
      setLoadingAddress(false);
      onLocationSelect({ lat, lng, address });
    }

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      handleMove(pos.lat, pos.lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      handleMove(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm text-foreground">Lokasi Jalan Rusak</label>
      <p className="text-xs text-muted-foreground">
        Klik pada peta atau geser marker untuk menandai lokasi
      </p>
      <div
        ref={containerRef}
        className="w-full h-72 rounded-lg border-2 border-border overflow-hidden"
        style={{ zIndex: 0 }}
      />
      <p className="text-xs text-muted-foreground">
        {loadingAddress
          ? "Mengambil alamat..."
          : `Koordinat: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
      </p>
    </div>
  );
}
