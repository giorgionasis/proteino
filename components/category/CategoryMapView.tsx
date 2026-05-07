"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from "supercluster";
import Link from "next/link";
import type { CategorySlug } from "@/types";
import type { CategoryItem } from "./CategoryCard";

interface ActiveFilter {
  id: string;
  label: string;
}

interface Props {
  category: CategorySlug;
  items: CategoryItem[];
  onSwitchToList: () => void;
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (id: string) => void;
  onOpenFilters?: () => void;
}

// Carto's free vector "voyager" style — clean, modern, well-suited for
// venue browsing. Swap to another tile provider by changing this URL.
const TILE_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// Greece bounding box — used as the default view when we have no items
// to fit to (e.g. category with zero geocoded venues).
const GREECE_BOUNDS: LngLatBoundsLike = [
  [19.3, 34.8], // SW
  [29.7, 41.8], // NE
];

const CLUSTER_BUCKET_BG = (count: number): string => {
  // Color steps mirror Mapbox's example clustering tutorial — small clusters
  // are the lightest, big clusters get a deeper coral.
  if (count >= 100) return "#FE6F5E";
  if (count >= 25) return "#FF8B7A";
  if (count >= 10) return "#FFA294";
  return "#FFB4A7";
};

const CLUSTER_BUCKET_SIZE = (count: number): number => {
  if (count >= 100) return 56;
  if (count >= 25) return 48;
  if (count >= 10) return 42;
  return 36;
};

interface ClusterFeature {
  type: "Feature";
  properties: {
    cluster?: boolean;
    cluster_id?: number;
    point_count?: number;
    item?: CategoryItem;
  };
  geometry: { type: "Point"; coordinates: [number, number] };
}

export function CategoryMapView({
  category,
  items,
  onSwitchToList,
  activeFilters = [],
  onRemoveFilter,
  onOpenFilters,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [zoom, setZoom] = useState(6);
  const [bounds, setBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null);
  const [selected, setSelected] = useState<CategoryItem | null>(null);

  // Filter items down to those with valid coordinates — only pinnable ones go on the map.
  const geoItems = useMemo(
    () => items.filter((i) => typeof i.lat === "number" && typeof i.lng === "number"),
    [items],
  );

  // Build supercluster index. Recomputed when items change.
  const cluster = useMemo(() => {
    const idx = new Supercluster<{ item: CategoryItem }, { item: CategoryItem }>({
      radius: 60,
      maxZoom: 16,
    });
    const points = geoItems.map((i) => ({
      type: "Feature" as const,
      properties: { item: i },
      geometry: { type: "Point" as const, coordinates: [i.lng!, i.lat!] as [number, number] },
    }));
    idx.load(points);
    return idx;
  }, [geoItems]);

  // Initialize the map once.
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let map: Map;
    try {
      map = new maplibregl.Map({
        container: mapRef.current,
        style: TILE_STYLE,
        center: [24.5, 38.5],
        zoom: 6,
        attributionControl: false,
      });
    } catch (err) {
      console.error("[CategoryMapView] Failed to init MapLibre:", err);
      return;
    }

    // Surface tile/style/runtime errors that would otherwise silently leave a blank map.
    map.on("error", (e: any) => {
      console.error("[CategoryMapView] map error:", e?.error ?? e);
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      // Force a resize in case the container had 0 dimensions during init
      // (common when the parent uses dynamic-imported components or layout
      // is still settling).
      map.resize();
      const updateState = () => {
        const b = map.getBounds();
        setZoom(map.getZoom());
        setBounds({
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        });
      };
      updateState();
      map.on("moveend", updateState);
      map.on("zoomend", updateState);
    });

    // Also resize when the window resizes (orientation change, sidebar collapse, etc.)
    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);

    mapInstance.current = map;

    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Auto-fit to items when the dataset changes (filters applied/cleared).
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (geoItems.length === 0) {
      map.fitBounds(GREECE_BOUNDS, { padding: 40, animate: true, duration: 600 });
      return;
    }
    if (geoItems.length === 1) {
      const i = geoItems[0];
      map.flyTo({ center: [i.lng!, i.lat!], zoom: 14, duration: 600 });
      return;
    }
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    for (const i of geoItems) {
      if (i.lng! < west)  west  = i.lng!;
      if (i.lng! > east)  east  = i.lng!;
      if (i.lat! < south) south = i.lat!;
      if (i.lat! > north) north = i.lat!;
    }
    map.fitBounds(
      [[west, south], [east, north]],
      { padding: { top: 80, bottom: 200, left: 40, right: 40 }, animate: true, duration: 600, maxZoom: 13 },
    );
  }, [geoItems]);

  // Render markers (clusters + individual pins) every time zoom/bounds change.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !bounds) return;

    // Clear previous markers
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];

    const clusters = cluster.getClusters(
      [bounds.west, bounds.south, bounds.east, bounds.north],
      Math.floor(zoom),
    ) as ClusterFeature[];

    for (const c of clusters) {
      const [lng, lat] = c.geometry.coordinates;

      if (c.properties.cluster) {
        const count = c.properties.point_count!;
        const size = CLUSTER_BUCKET_SIZE(count);
        const bg = CLUSTER_BUCKET_BG(count);
        const el = document.createElement("div");
        el.style.cssText = `
          width: ${size}px; height: ${size}px; border-radius: 50%;
          background: ${bg};
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 700; font-size: ${Math.min(18, size / 3)}px;
          font-family: 'Open Sans', sans-serif;
          cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          border: 3px solid white;
        `;
        el.textContent = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
        el.addEventListener("click", () => {
          const expansionZoom = Math.min(cluster.getClusterExpansionZoom(c.properties.cluster_id!), 17);
          map.flyTo({ center: [lng, lat], zoom: expansionZoom, duration: 500 });
        });
        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        markersRef.current.push(marker);
      } else {
        const item = c.properties.item!;
        const el = document.createElement("div");
        el.style.cssText = `
          display: flex; flex-direction: column; align-items: center;
          cursor: pointer; pointer-events: auto;
        `;
        el.innerHTML = `
          <div style="position:relative;width:36px;height:50px;">
            <svg width="36" height="50" viewBox="0 0 45 64" style="position:absolute;top:0;left:0;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <path d="M22.5 64C22.5 64 0 38 0 22.5C0 10.07 10.07 0 22.5 0C34.93 0 45 10.07 45 22.5C45 38 22.5 64 22.5 64Z" fill="#27272A"/>
              <circle cx="22.5" cy="22.5" r="9" fill="white"/>
            </svg>
          </div>
          <div style="background:#27272A;border-radius:4px;padding:4px 8px;margin-top:-4px;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;">
            <span style="font-family:'Open Sans',sans-serif;font-weight:700;font-size:12px;color:#fff;">${escapeHtml(item.title)}</span>
          </div>
        `;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelected(item);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([lng, lat]).addTo(map);
        markersRef.current.push(marker);
      }
    }
  }, [cluster, bounds, zoom]);

  const isFiltered = activeFilters.length > 0;

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

      {/* Empty state badge */}
      {geoItems.length === 0 && items.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur px-4 py-2 rounded-full text-sm font-medium text-zinc-700 shadow-sm">
          Δεν υπάρχουν γεωκωδικοποιημένα στοιχεία για τα φίλτρα αυτά
        </div>
      )}

      {/* Floating bottom bar: Φίλτρα + active chips */}
      {!selected && (
        <div
          className="absolute left-0 right-0 z-[1000] flex items-center justify-center gap-3 px-5"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
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
            {isFiltered && (
              <span
                className="flex items-center justify-center rounded-full"
                style={{ width: 28, height: 28, background: "#FFF2F1", fontFamily: "'Open Sans',sans-serif", fontWeight: 700, fontSize: 16, color: "#000", lineHeight: "20px" }}
              >
                {activeFilters.length}
              </span>
            )}
          </button>

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
      )}

      {/* Bottom card on pin tap */}
      {selected && (
        <BottomCard
          item={selected}
          category={category}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function BottomCard({ item, category, onClose }: { item: CategoryItem; category: CategorySlug; onClose: () => void }) {
  return (
    <div
      className="absolute left-0 right-0 z-[1100] bg-white rounded-t-2xl shadow-xl"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
    >
      <button
        onClick={onClose}
        aria-label="Κλείσιμο"
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#27272a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="flex gap-3 p-4 pr-12">
        <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-zinc-200">
          {item.cover_url ? (
            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: item.placeholder_color ?? "#a1a1aa" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-zinc-900 truncate">{item.title}</div>
          {item.area && <div className="text-[13px] text-zinc-500 truncate mt-0.5">{item.area}</div>}
          <div className="flex items-center gap-1 mt-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#FE6F5E"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span className="text-[13px] font-semibold text-zinc-900">{item.avg_rating.toFixed(2)}</span>
            <span className="text-[13px] text-zinc-500">({item.rating_count})</span>
          </div>
          <Link
            href={`/${category}/${item.slug ?? item.id}`}
            className="inline-flex items-center mt-2 text-[13px] font-semibold text-coral-600 active:opacity-70"
            style={{ color: "#FE6F5E" }}
          >
            Δες περισσότερα
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FE6F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]!);
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
