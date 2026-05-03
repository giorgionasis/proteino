"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CategorySlug } from "@/types";

interface ClusterPin {
  lat: number;
  lng: number;
  count: number;
}

interface ItemPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  rating: number;
  ratingCount: number;
  placeholderColor: string;
}

interface ActiveFilter {
  id: string;
  label: string;
}

interface Props {
  category: CategorySlug;
  onSwitchToList: () => void;
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (id: string) => void;
  onOpenFilters?: () => void;
}

const CLUSTER_ZOOM_THRESHOLD = 11;

const CLUSTERS: Record<string, ClusterPin[]> = {
  food: [
    { lat: 37.98, lng: 23.73, count: 168 },
    { lat: 40.64, lng: 22.94, count: 84 },
    { lat: 35.34, lng: 25.14, count: 34 },
    { lat: 40.3, lng: 22.3, count: 112 },
    { lat: 37.5, lng: 22.4, count: 45 },
    { lat: 39.6, lng: 20.8, count: 65 },
    { lat: 37.4, lng: 25.4, count: 77 },
    { lat: 38.3, lng: 21.7, count: 56 },
    { lat: 36.4, lng: 28.2, count: 93 },
    { lat: 36.7, lng: 25.0, count: 168 },
  ],
  bars: [
    { lat: 37.98, lng: 23.73, count: 95 },
    { lat: 40.64, lng: 22.94, count: 42 },
    { lat: 35.34, lng: 25.14, count: 18 },
    { lat: 37.0, lng: 25.5, count: 33 },
    { lat: 38.3, lng: 21.7, count: 27 },
    { lat: 39.6, lng: 20.8, count: 19 },
    { lat: 36.4, lng: 28.2, count: 31 },
  ],
};

const ITEM_PINS: Record<string, ItemPin[]> = {
  food: [
    { id: "f1", lat: 37.975, lng: 23.735, title: "Seaside Fish", rating: 4.74, ratingCount: 123, placeholderColor: "#a5b8c4" },
    { id: "f2", lat: 37.984, lng: 23.728, title: "Ο τζίτζικας και ο μέρμυγκας", rating: 4.74, ratingCount: 123, placeholderColor: "#c4b08a" },
    { id: "f3", lat: 37.990, lng: 23.745, title: "Κουκουβάγια", rating: 4.74, ratingCount: 123, placeholderColor: "#b5a5c4" },
    { id: "f4", lat: 37.968, lng: 23.720, title: "Το μαύρο πρόβατο", rating: 4.80, ratingCount: 201, placeholderColor: "#c4b5a5" },
    { id: "f5", lat: 37.992, lng: 23.715, title: "Sense", rating: 4.55, ratingCount: 87, placeholderColor: "#b5b5a5" },
    { id: "f6", lat: 37.976, lng: 23.750, title: "Ο Γάκιας", rating: 4.80, ratingCount: 201, placeholderColor: "#c4a5a5" },
  ],
  bars: [
    { id: "b1", lat: 37.978, lng: 23.729, title: "The Clumsies", rating: 4.9, ratingCount: 214, placeholderColor: "#4a3a50" },
    { id: "b2", lat: 37.976, lng: 23.725, title: "Baba Au Rum", rating: 4.8, ratingCount: 178, placeholderColor: "#5a4a40" },
    { id: "b3", lat: 37.979, lng: 23.720, title: "Jazz Point", rating: 4.7, ratingCount: 92, placeholderColor: "#403050" },
    { id: "b4", lat: 37.985, lng: 23.740, title: "Noel", rating: 4.6, ratingCount: 67, placeholderColor: "#483040" },
    { id: "b5", lat: 37.982, lng: 23.733, title: "Galaxy Bar", rating: 4.8, ratingCount: 156, placeholderColor: "#3a4050" },
  ],
};

function createClusterIcon(count: number, filtered: boolean): L.DivIcon {
  const bg = filtered ? "#52525B" : "#3F3F46";
  return L.divIcon({
    className: "",
    html: `<div style="width:55px;height:55px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;cursor:pointer;"><span style="font-family:'Open Sans',sans-serif;font-weight:700;font-size:18px;color:#fff;line-height:1;">${count}</span></div>`,
    iconSize: [55, 55],
    iconAnchor: [27, 27],
  });
}

function createItemIcon(item: ItemPin): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="position:relative;width:45px;height:64px;">
          <svg width="45" height="64" viewBox="0 0 45 64" style="position:absolute;top:0;left:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <path d="M22.5 64C22.5 64 0 38 0 22.5C0 10.07 10.07 0 22.5 0C34.93 0 45 10.07 45 22.5C45 38 22.5 64 22.5 64Z" fill="#27272A"/>
          </svg>
          <div style="position:absolute;left:4.5px;top:4px;width:36px;height:36px;border-radius:50%;background:${item.placeholderColor};"></div>
        </div>
        <div style="background:#27272A;border-radius:4px;padding:8px;margin-top:-6px;white-space:nowrap;max-width:160px;">
          <div style="font-family:'Open Sans',sans-serif;font-weight:700;font-size:14px;color:#fff;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.01em;">${item.title}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span style="font-family:'Open Sans',sans-serif;font-weight:600;font-size:14px;color:#fff;">${item.rating.toFixed(2)}</span>
            <span style="font-family:'Open Sans',sans-serif;font-weight:500;font-size:14px;color:#fff;">(${item.ratingCount})</span>
          </div>
        </div>
      </div>
    `,
    iconSize: [160, 130],
    iconAnchor: [80, 64],
  });
}

export function CategoryMapView({
  category,
  onSwitchToList,
  activeFilters = [],
  onRemoveFilter,
  onOpenFilters,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const [zoom, setZoom] = useState(6);
  const isFiltered = activeFilters.length > 0;

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [38.5, 24.0],
      zoom: 6,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 },
    ).addTo(map);

    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    map.on("zoomend", () => setZoom(map.getZoom()));

    return () => {
      map.remove();
      mapInstance.current = null;
      markersLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = markersLayer.current;
    if (!layer) return;
    layer.clearLayers();

    if (zoom >= CLUSTER_ZOOM_THRESHOLD) {
      const items = ITEM_PINS[category] ?? [];
      items.forEach((item) => {
        L.marker([item.lat, item.lng], { icon: createItemIcon(item) }).addTo(layer);
      });
    } else {
      const clusters = CLUSTERS[category] ?? [];
      clusters.forEach((c) => {
        const marker = L.marker([c.lat, c.lng], {
          icon: createClusterIcon(c.count, isFiltered),
        });
        marker.on("click", () => {
          mapInstance.current?.setView([c.lat, c.lng], 12, { animate: true });
        });
        marker.addTo(layer);
      });
    }
  }, [zoom, category, isFiltered]);

  return (
    <div
      className="relative"
      style={{
        height: "calc(100dvh - 64px)",
        marginBottom: "calc(-64px - env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div ref={mapRef} className="absolute inset-0" />

      {/* "Εμφάνιση σε λίστα" floating button — top center */}
      <button
        onClick={onSwitchToList}
        className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center justify-center gap-3 h-11 rounded-full active:opacity-80 transition-opacity select-none"
        style={{ background: "rgba(63,63,70,0.9)", padding: "0 12px", width: 200 }}
      >
        <ListToggleIcon />
        <span style={{ fontFamily: "'Open Sans',sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", lineHeight: "120%" }}>
          Εμφάνιση σε λίστα
        </span>
      </button>

      {/* Floating bottom bar: Φίλτρα + active chips */}
      <div
        className="absolute left-0 right-0 z-[1000] flex items-center justify-center gap-3 px-5"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        {/* Filter button */}
        <button
          onClick={onOpenFilters}
          className="shrink-0 flex items-center gap-2 rounded-full active:opacity-80 transition-opacity select-none"
          style={{
            background: "#18181B",
            boxShadow: "0px 0px 20px -3px rgba(0,0,0,0.49)",
            padding: "14px 16px",
            height: 44,
          }}
        >
          <FilterSliderIcon />
          <span style={{ fontFamily: "'Open Sans',sans-serif", fontWeight: 700, fontSize: 16, color: "#FAFAFA", lineHeight: "20px", letterSpacing: "0.01em" }}>
            Φίλτρα
          </span>
          {activeFilters.length > 0 && (
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 28, height: 28, background: "#FFF2F1", fontFamily: "'Open Sans',sans-serif", fontWeight: 700, fontSize: 16, color: "#000", lineHeight: "20px" }}
            >
              {activeFilters.length}
            </span>
          )}
        </button>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            {activeFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => onRemoveFilter?.(f.id)}
                className="shrink-0 flex items-center gap-2 rounded-full active:opacity-80 transition-opacity select-none"
                style={{ background: "#E4E4E7", padding: "4px 16px", height: 44 }}
              >
                <span style={{ fontFamily: "'Open Sans',sans-serif", fontWeight: 700, fontSize: 14, color: "#3F3F46", lineHeight: "20px" }}>
                  {f.label}
                </span>
                <CloseChipIcon />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListToggleIcon() {
  return (
    <svg width="19" height="14" viewBox="0 0 19 14" fill="none" aria-hidden>
      <circle cx="1.25" cy="1.25" r="1.25" fill="#fff" />
      <circle cx="1.25" cy="7" r="1.25" fill="#fff" />
      <circle cx="1.25" cy="12.75" r="1.25" fill="#fff" />
      <rect x="4.3" y="0.32" width="14.3" height="1.86" rx="0.93" fill="#fff" />
      <rect x="4.3" y="6.07" width="14.3" height="1.86" rx="0.93" fill="#fff" />
      <rect x="4.3" y="11.82" width="14.3" height="1.86" rx="0.93" fill="#fff" />
    </svg>
  );
}

function FilterSliderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="0.68" y="0.59" width="16.64" height="5.34" rx="2.67" stroke="#FAFAFA" strokeWidth="1.2" />
      <rect x="0.68" y="6.33" width="16.64" height="5.34" rx="2.67" stroke="#FAFAFA" strokeWidth="1.2" />
      <rect x="0.68" y="12.07" width="16.64" height="5.34" rx="2.67" stroke="#FAFAFA" strokeWidth="1.2" />
    </svg>
  );
}

function CloseChipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="8" fill="#FAFAFA" />
      <path d="M5.17 5.17L10.83 10.83M10.83 5.17L5.17 10.83" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
