"use client";

/**
 * Click-to-pick map for lat/lng input. Uses Leaflet via CDN — no npm
 * dependency, no build-time impact.
 *
 * Click anywhere → marker drops at that point. Drag the marker to fine-tune.
 * Address-search not included (next iteration; would need geocoding API).
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  /** Initial center if no lat/lng yet. Defaults to Athens. */
  defaultCenter?: { lat: number; lng: number };
  height?: string;
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const MARKER_ICON = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const MARKER_SHADOW = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

declare global {
  interface Window {
    L?: any;
  }
}

let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    // JS
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

export function MapPicker({
  lat,
  lng,
  onChange,
  defaultCenter = { lat: 37.9838, lng: 23.7275 },   // Athens
  height = "300px",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        const initLat = lat ?? defaultCenter.lat;
        const initLng = lng ?? defaultCenter.lng;
        const initZoom = lat != null && lng != null ? 13 : 7;

        const map = L.map(containerRef.current).setView([initLat, initLng], initZoom);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        // Custom icon avoids issues with default-icon path resolution under bundlers.
        const icon = L.icon({
          iconUrl: MARKER_ICON,
          shadowUrl: MARKER_SHADOW,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        });

        if (lat != null && lng != null) {
          const m = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
          m.on("dragend", () => {
            const p = m.getLatLng();
            onChange(p.lat, p.lng);
          });
          markerRef.current = m;
        }

        map.on("click", (e: any) => {
          const { lat: clickedLat, lng: clickedLng } = e.latlng;
          if (markerRef.current) {
            markerRef.current.setLatLng([clickedLat, clickedLng]);
          } else {
            const m = L.marker([clickedLat, clickedLng], { draggable: true, icon }).addTo(map);
            m.on("dragend", () => {
              const p = m.getLatLng();
              onChange(p.lat, p.lng);
            });
            markerRef.current = m;
          }
          onChange(clickedLat, clickedLng);
        });

        mapRef.current = map;
      })
      .catch(() => { /* network / offline — silent; user can still type lat/lng */ });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep marker in sync if lat/lng changes from outside (e.g., user types in inputs)
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    if (lat != null && lng != null) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const L = window.L;
        const icon = L.icon({
          iconUrl: MARKER_ICON,
          shadowUrl: MARKER_SHADOW,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
        const m = L.marker([lat, lng], { draggable: true, icon }).addTo(mapRef.current);
        m.on("dragend", () => {
          const p = m.getLatLng();
          onChange(p.lat, p.lng);
        });
        markerRef.current = m;
      }
    }
  }, [lat, lng, onChange]);

  return (
    <div>
      <AddressSearch
        onPick={(lat, lng, label) => {
          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 14);
          }
          onChange(lat, lng);
        }}
      />
      <div
        ref={containerRef}
        style={{ height, width: "100%", borderRadius: "0.5rem", overflow: "hidden", marginTop: "8px" }}
        className="border border-zinc-200 bg-zinc-100"
      />
      <p className="text-xs text-zinc-500 mt-1.5">
        Αναζήτησε διεύθυνση παραπάνω, ή πάτησε στον χάρτη. Σύρε τον δείκτη για ακριβή ρύθμιση.
      </p>
    </div>
  );
}

/* ── Address search via Nominatim (OpenStreetMap) ──────────── */

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number;
}

function AddressSearch({ onPick }: { onPick: (lat: number, lng: number, label: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "8");
        url.searchParams.set("countrycodes", "gr");   // bias to Greece; remove for global
        url.searchParams.set("accept-language", "el");
        const res = await fetch(url.toString());
        const data = await res.json();
        if (Array.isArray(data)) setResults(data);
      } catch {
        /* offline / network — silent */
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="🔍 Αναζήτηση διεύθυνσης (π.χ. Καλάβρυτα, Αχαΐα)"
        className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400"
      />

      {open && (results.length > 0 || loading || query.trim().length >= 3) && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
          {loading && <div className="px-3 py-2 text-xs text-zinc-500">Αναζήτηση...</div>}
          {!loading && results.length === 0 && query.trim().length >= 3 && (
            <div className="px-3 py-2 text-xs text-zinc-500">Δεν βρέθηκαν αποτελέσματα.</div>
          )}
          {results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
                setOpen(false);
                setQuery(r.display_name.split(",").slice(0, 2).join(","));
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 border-b border-zinc-100 last:border-b-0"
            >
              <span className="text-zinc-800">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
