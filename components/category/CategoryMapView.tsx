"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from "supercluster";
import Link from "next/link";
import type { CategorySlug } from "@/types";
import type { CategoryItem } from "./CategoryCard";
import { useMapMode } from "@/hooks/useMapMode";

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
  /** True when at least one region sub-area is selected — drives the
   *  "Search this area" hint when the user pans away from the filtered
   *  bounds. Tapping the hint clears the region filter. */
  hasRegionFilter?: boolean;
  onClearRegionFilter?: () => void;
}

// Inline raster style — Carto Voyager raster tiles. Picked over vector
// tiles because MapLibre vector pipeline failed silently in browser tests
// (white canvas, no controls, no console error). Raster has no Web Worker
// or vector decoding step — just PNGs over HTTP — so it's the safest first
// draw. Visual quality is still very good. Swap to vector later once the
// vector pipeline is debugged.
const TILE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-voyager": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-voyager-tiles",
      type: "raster",
      source: "carto-voyager",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

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
  hasRegionFilter = false,
  onClearRegionFilter,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  // StrictMode dev double-invokes effects: mount → cleanup → mount. The
  // straight pattern (create in mount, destroy in cleanup) creates two
  // MapLibre instances per real mount, and the second one ends up with a
  // 0-height canvas because the cleanup of the first leaves the container
  // in a transitional state. Pattern: defer cleanup with a microtask so
  // the second mount can cancel it before it actually destroys the map.
  const cleanupTimeoutRef = useRef<number | null>(null);
  const [zoom, setZoom] = useState(6);
  const [bounds, setBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null);
  const [selected, setSelected] = useState<CategoryItem | null>(null);
  const [userPanned, setUserPanned] = useState(false);
  const [activitiesOn, setActivitiesOn] = useState(false);

  // Mark map mode active so the global FAB hides itself while the user is
  // browsing the map (suggest action doesn't fit map-browse context).
  useEffect(() => {
    useMapMode.getState().setActive(true);
    return () => useMapMode.getState().setActive(false);
  }, []);

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
    // Cancel any pending cleanup from a prior (StrictMode) unmount.
    if (cleanupTimeoutRef.current !== null) {
      window.clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // If the map already exists from a prior mount that we just rescued
    // from cleanup, keep using it.
    if (mapInstance.current) {
      return () => scheduleMapCleanup();
    }

    if (!mapRef.current) return;

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

      // Distinguish user-initiated movement from programmatic fit/fly.
      // `originalEvent` is set only on real input events.
      map.on("movestart", (e: any) => {
        if (e?.originalEvent) setUserPanned(true);
      });
    });

    // Also resize when the window resizes (orientation change, sidebar collapse, etc.)
    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);

    // Stash the resize handler on the map so the deferred cleanup can find it.
    (map as any).__protRsz = onResize;

    mapInstance.current = map;

    return () => scheduleMapCleanup();
  }, []);

  // Helper: defer cleanup so StrictMode's mount→unmount→mount cycle in dev
  // doesn't tear down the map between the two mounts. Real unmount (user
  // navigating away) waits 50ms but still cleans up; StrictMode remount
  // cancels the timeout in time.
  function scheduleMapCleanup() {
    if (cleanupTimeoutRef.current !== null) return;
    cleanupTimeoutRef.current = window.setTimeout(() => {
      const map = mapInstance.current;
      if (map) {
        const rsz = (map as any).__protRsz;
        if (rsz) window.removeEventListener("resize", rsz);
        map.remove();
        mapInstance.current = null;
      }
      cleanupTimeoutRef.current = null;
    }, 50);
  }

  // Auto-fit to items when the dataset changes (filters applied/cleared).
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    setUserPanned(false); // new fit cycle — clear any prior pan signal
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
      <div
        ref={mapRef}
        // Inline styles required: maplibre-gl.css adds .maplibregl-map with
        // `position: relative` to the container, which overrides Tailwind's
        // `.absolute` class (CSS imported after = higher precedence). With
        // relative positioning, `inset-0` does nothing and the canvas-only
        // child contributes 0 to height. Inline styles beat both classes.
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />

      {/* "Λίστα" toggle — top left. Compact since the word is short. */}
      <button
        onClick={onSwitchToList}
        className="absolute top-3 left-3 z-30 flex items-center justify-center gap-1.5 h-10 px-4 rounded-full active:opacity-80 transition-opacity select-none"
        style={{ background: "rgba(63,63,70,0.92)" }}
      >
        <ListToggleIcon />
        <span style={{ fontFamily: "'Open Sans',sans-serif", fontWeight: 700, fontSize: 13, color: "#fff", lineHeight: "120%" }}>
          Λίστα
        </span>
      </button>

      {/* Activities — labeled toggle with iOS-style knob so users see
          immediately it's an on/off switch, not a one-shot button. */}
      <button
        onClick={() => setActivitiesOn((v) => !v)}
        aria-label="Δραστηριότητες"
        aria-pressed={activitiesOn}
        className="absolute top-3 right-3 z-30 flex items-center gap-2 h-10 pl-3 pr-1.5 rounded-full active:opacity-80 transition-all select-none"
        style={{
          background: activitiesOn ? "#FE6F5E" : "rgba(255,255,255,0.95)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        <span style={{ fontFamily: "'Open Sans',sans-serif", fontWeight: 600, fontSize: 12, color: activitiesOn ? "#fff" : "#27272a", lineHeight: "120%", letterSpacing: "0.01em" }}>
          Δραστηριότητες
        </span>
        {/* Toggle knob — visible affordance that this is on/off */}
        <span
          className="relative shrink-0 transition-colors"
          style={{
            width: 30,
            height: 18,
            borderRadius: 999,
            background: activitiesOn ? "rgba(255,255,255,0.4)" : "#d4d4d8",
          }}
        >
          <span
            className="absolute top-0.5 transition-all"
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#fff",
              left: activitiesOn ? 14 : 2,
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          />
        </span>
      </button>

      {/* "Search this area" pill — appears when user pans away from a
          region-filtered view. Solid coral CTA so it reads as a button
          to tap, not an info chip. */}
      {hasRegionFilter && userPanned && onClearRegionFilter && (
        <button
          onClick={() => {
            onClearRegionFilter();
            setUserPanned(false);
          }}
          className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 h-11 pl-4 pr-3 rounded-full active:opacity-80 transition-opacity select-none"
          style={{
            top: 64,
            background: "#FE6F5E",
            boxShadow: "0 6px 20px rgba(254,111,94,0.4), 0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          <SearchHereIcon />
          <span style={{ fontFamily: "'Open Sans',sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", lineHeight: "120%" }}>
            Αναζήτηση σε αυτή την περιοχή
          </span>
          <ChevronWhiteIcon />
        </button>
      )}

      {/* Empty state badge */}
      {geoItems.length === 0 && items.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur px-4 py-2 rounded-full text-sm font-medium text-zinc-700 shadow-sm">
          Δεν υπάρχουν γεωκωδικοποιημένα στοιχεία για τα φίλτρα αυτά
        </div>
      )}

      {/* Floating bottom bar.
          - No filters yet: filter pill is centered with the "Φίλτρα" label
            (inviting empty state).
          - Filters applied: pill shrinks to icon + count, slides left to
            make room for the chip carousel. Chips run to the right edge,
            visibly cut off so the user knows it scrolls. */}
      {!selected && (
        <div
          className={`absolute left-0 right-0 z-30 flex items-center gap-3 ${isFiltered ? "" : "justify-center"}`}
          style={{
            bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 28px)",
            paddingLeft: isFiltered ? 16 : 0,
          }}
        >
          <button
            onClick={onOpenFilters}
            aria-label="Φίλτρα"
            className="shrink-0 flex items-center rounded-full active:opacity-80 transition-all select-none"
            style={{
              background: "#18181B",
              boxShadow: "0px 4px 16px -3px rgba(0,0,0,0.4)",
              paddingLeft: 16,
              paddingRight: isFiltered ? 6 : 18,
              gap: 8,
              height: 44,
            }}
          >
            <FilterSliderIcon />
            {!isFiltered && (
              <span style={{ fontFamily: "'Open Sans',sans-serif", fontWeight: 700, fontSize: 16, color: "#FAFAFA", lineHeight: "20px", letterSpacing: "0.01em" }}>
                Φίλτρα
              </span>
            )}
            {isFiltered && (
              <span
                className="flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, background: "#FFF8F6", fontFamily: "'Open Sans',sans-serif", fontWeight: 700, fontSize: 16, color: "#18181B", lineHeight: "20px" }}
              >
                {activeFilters.length}
              </span>
            )}
          </button>

          {activeFilters.length > 0 && (
            <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 pr-3" style={{ paddingRight: "calc(env(safe-area-inset-right, 0px) + 4px)" }}>
                {activeFilters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onRemoveFilter?.(f.id)}
                    className="shrink-0 flex items-center gap-2 rounded-full active:opacity-80 transition-opacity select-none"
                    style={{ background: "#E4E4E7", paddingLeft: 16, paddingRight: 10, height: 40 }}
                  >
                    <span
                      className="whitespace-nowrap"
                      style={{ fontFamily: "'Open Sans',sans-serif", fontWeight: 700, fontSize: 14, color: "#3F3F46", lineHeight: "20px" }}
                    >
                      {f.label}
                    </span>
                    <CloseChipIcon />
                  </button>
                ))}
              </div>
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
    <Link
      href={`/${category}/${item.slug ?? item.id}`}
      // fixed (not absolute) so the card sits at viewport bottom and
      // covers the BottomNav (z-40). z-50 places it on top of map chrome
      // but below the FilterBottomSheet (z-60).
      className="fixed bottom-0 left-0 right-0 z-50 mx-auto bg-white rounded-t-2xl active:bg-zinc-50 transition-colors"
      style={{
        maxWidth: 390,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        boxShadow: "0 -8px 24px -4px rgba(0,0,0,0.18), 0 -2px 6px rgba(0,0,0,0.06)",
      }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="w-10 h-1 bg-zinc-300 rounded-full" />
      </div>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
        aria-label="Κλείσιμο"
        className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#27272a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="flex gap-3 px-4 pt-2 pb-4 pr-14">
        <div
          className="shrink-0 w-[88px] h-[88px] rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: item.placeholder_color ?? "#e4e4e7" }}
        >
          {item.cover_url ? (
            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[13px] font-bold text-white/70 px-2 text-center line-clamp-2">{item.title}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="text-[16px] font-bold text-zinc-900 truncate leading-tight">{item.title}</div>
            <div className="text-[13px] text-zinc-500 truncate mt-0.5">
              {item.subcategory}{item.area ? ` · ${item.area}` : ""}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FE6F5E"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span className="text-[14px] font-bold text-zinc-900">{item.avg_rating.toFixed(2)}</span>
              <span className="text-[13px] text-zinc-500">({item.rating_count})</span>
            </div>
            <span
              className="inline-flex items-center text-[13px] font-semibold"
              style={{ color: "#FE6F5E" }}
            >
              Δες περισσότερα
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FE6F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]!);
}

function ActivitiesIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Bookmark / pin-flag composite — represents "things to do" */}
      <path d="M12 22s-8-4.5-8-11.5a8 8 0 1 1 16 0c0 7-8 11.5-8 11.5z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SearchHereIcon() {
  // Magnifying glass with a small location pin inside — reads as
  // "search the area" not "loading".
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <circle cx="11" cy="10" r="1.5" fill="#fff" stroke="none" />
    </svg>
  );
}

function ChevronWhiteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
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
