"use client";

import { useEffect, useRef, useState } from "react";
import { STRINGS } from "@/lib/i18n";

export interface MapPoint {
  latitude: number;
  longitude: number;
}

// divIcon marker: avoids the known Leaflet default-icon asset-resolution
// problem under bundlers (no PNG import needed).
function makeIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "",
    html: `<div class="flex h-9 w-9 -translate-x-1/2 -translate-y-full items-center justify-center">
             <div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-primary text-on-primary shadow-md">
               <span class="material-symbols-outlined text-lg" style="font-size:18px">location_on</span>
             </div>
           </div>`,
    iconSize: L.point(0, 0),
  });
}

const DEFAULT_CENTER: [number, number] = [-6.9667, 110.4167]; // Semarang (demo default)

/**
 * Leaflet map picker (T-402 upgrade, DESIGN §4.5): user clicks a point on the
 * map → marker placed → lat/lng emitted and reverse-geocoded to a human
 * location name (Nominatim /osm). No manual lat/lon typing.
 * Leaflet is dynamic-imported so SSR never touches the DOM lib.
 */
export function LandMapPicker({
  initial,
  onChange,
  onResolvedLocation,
}: {
  initial?: MapPoint | null;
  onChange: (point: MapPoint) => void;
  onResolvedLocation?: (name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolving, setResolving] = useState(false);
  // Snap the initial point once: re-rendering with a live form lat/lon would
  // otherwise remount Leaflet on every map click and cancel in-flight fetch.
  const initialRef = useRef(initial);
  if (initialRef.current === undefined) initialRef.current = initial ?? null;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onResolvedLocationRef = useRef(onResolvedLocation);
  onResolvedLocationRef.current = onResolvedLocation;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const seed = initialRef.current;

    let map: import("leaflet").Map | null = null;
    let marker: import("leaflet").Marker | null = null;
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !container) return;

      const center = seed ? [seed.latitude, seed.longitude] : DEFAULT_CENTER;
      map = L.map(container, {
        center: center as [number, number],
        zoom: seed ? 13 : 11,
        scrollWheelZoom: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const mapNow = map;

      if (seed) {
        marker = L.marker([seed.latitude, seed.longitude], {
          icon: makeIcon(L),
        }).addTo(mapNow);
      }

      mapNow.on("click", (event: import("leaflet").LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;
        if (marker) marker.setLatLng(event.latlng);
        else marker = L.marker(event.latlng, { icon: makeIcon(L) }).addTo(mapNow);
        onChangeRef.current({ latitude: lat, longitude: lng });

        setResolving(true);
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((data: unknown) => {
            if (cancelled) return;
            setResolving(false);
            const d = data as { display_name?: string } | null;
            if (d?.display_name) onResolvedLocationRef.current?.(d.display_name.slice(0, 160));
          })
          .catch(() => {
            if (!cancelled) setResolving(false);
          });
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-on-surface">{STRINGS.lands.mapFieldLabel}</p>
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        aria-label={STRINGS.lands.mapFieldAria}
        className="h-56 w-full overflow-hidden rounded-md border border-outline-variant"
        onKeyDown={(event) => {
          // Leaflet handles arrow-key panning natively once focused.
          if (event.key !== "Tab" && event.key !== "Shift") event.preventDefault();
        }}
      />
      <p className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          ads_click
        </span>
        {resolving ? STRINGS.lands.mapFieldResolving : STRINGS.lands.mapFieldHint}
      </p>
    </div>
  );
}