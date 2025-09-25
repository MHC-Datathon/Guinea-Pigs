import { useEffect, useRef } from "react";
import * as turf from "@turf/turf";
import { getColorForBusRoute } from "./utils";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const DATA_URL = "https://data.cityofnewyork.us/resource/f72k-2u3b.geojson";

// Default mapping from zone string -> color. You can override at runtime by
// setting `window.GP_ZONE_COLORS = { "Zone 1": "#...", ... }` before the
// map is initialized.
const ZONE_COLORS = {
  "Zone 1": "rgba(213, 78, 94, .3)",
  "Zone 2": "rgba(229, 117, 95, .3)",
  "Zone 3": "rgba(235, 163, 120, .3)",
  "Zone M1": "rgba(86, 38, 101, .3)",
  "Zone M2": "rgba(131, 47, 112, .3)",
  "Zone M3": "rgba(169, 57, 109, .3)",
  // fallback
  default: "#FF8C00",
};

function getColorForZone(zone) {
  try {
    const custom = window && window.GP_ZONE_COLORS;
    const map = custom && typeof custom === "object" ? { ...ZONE_COLORS, ...custom } : ZONE_COLORS;
    if (!zone) return map.default || ZONE_COLORS.default;
    // exact match first
    if (map[zone]) return map[zone];
    // try to match by prefix (e.g., "Zone 3 - ..." begins with "Zone 3")
    const keys = Object.keys(map).filter((k) => k !== "default");
    for (const k of keys) {
      if (zone.indexOf(k) === 0) return map[k];
    }
    return map.default || ZONE_COLORS.default;
  } catch (e) {
    return ZONE_COLORS.default;
  }
}

export default function GoogleMapsPolygons() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const dataListenerRef = useRef(null);
  const scriptId = "gp-gmaps-script";
  const polygonsRef = useRef([]);
  const infoWindowRef = useRef(null);
  const clusterMarkersRef = useRef([]);

  // Load Google Maps JS API dynamically
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("VITE_GOOGLE_MAPS_API_KEY not set");
      return;
    }
    if (window.google && window.google.maps) {
      initMap();
      return;
    }
    // Avoid inserting the Maps script multiple times
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      // script already on the page but maps may not be ready yet; wait briefly
      const t = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(t);
          initMap();
        }
      }, 100);
    }
    return () => {
      // cleanup script if needed
    };
  }, []);

  // Initialize map and load data
  function initMap() {
  if (!containerRef.current) return;
  // guard against double initialization
  if (mapRef.current) return;
  mapRef.current = new window.google.maps.Map(containerRef.current, {
      center: { lat: 40.7128, lng: -74.0060 },
      zoom: 11,
      mapId: "181496049de10d4f8807568e",
    });
  // single InfoWindow instance for feature/polygon clicks
  infoWindowRef.current = new window.google.maps.InfoWindow();
    // Inject a small stylesheet to ensure InfoWindow text (and try to influence the close icon)
    // are rendered in black. This is a lightweight override and safe to keep.
    try {
      const _s = document.createElement("style");
      _s.id = "gp-infowindow-style";
      _s.innerHTML = `
        .gm-style .gm-style-iw, .gm-style .gm-style-iw * { color: #000 !important; }
        /* try to neutralize filters on the default close button image */
        .gm-style .gm-ui-hover-effect img { filter: none !important; }
      `;
      if (!document.getElementById(_s.id)) document.head.appendChild(_s);
    } catch (e) {
      // non-fatal
      console.warn("Could not inject InfoWindow styles:", e);
    }
  fetchAndRender();

    // listen for violations data updates to render clusters
    try {
      window.addEventListener("gp-violations-updated", handleViolationsUpdated);
    } catch (e) {}

    // create a debug/test cluster in the middle of NYC so you can verify clustering
    try {
      createTestCluster();
    } catch (e) {
      // ignore
    }
    // If violations were fetched before the map initialized, render them now
    try {
      const cached = window.__GP_VIOLATIONS;
      if (cached && Array.isArray(cached) && cached.length > 0) {
        // small timeout to ensure map is fully ready
        setTimeout(() => {
          try { renderClusters(cached); } catch (e) { console.warn('renderClusters on init failed', e); }
        }, 50);
      }
    } catch (e) {}
  }

  function handleViolationsUpdated(e) {
    const violations = (e && e.detail && e.detail.violations) || window.__GP_VIOLATIONS || [];
    console.log("gp-violations-updated received, count=", (violations && violations.length) || 0, "event detail:", e && e.detail);
    try {
      renderClusters(violations);
    } catch (err) {
      console.warn("Cluster render failed:", err);
    }
  }

  function clearClusterMarkers() {
    try {
      // Preserve any markers intentionally marked as persistent (e.g., test marker)
      const keep = [];
      for (const m of clusterMarkersRef.current || []) {
        try {
          if (m && m.__gp_persistent) {
            // keep on-map and in the array
            keep.push(m);
            continue;
          }
          try { m.setMap(null); } catch (e) {}
        } catch (e) {}
      }
      clusterMarkersRef.current = keep;
    } finally {
      if (!clusterMarkersRef.current) clusterMarkersRef.current = [];
    }
  }

  // Choose a color for a cluster marker based on how many items it represents.
  // Small: green, medium: orange, large: red. Tweak thresholds as needed.

  // Naive clustering: bucket points into screen-space grid cells
  function renderClusters(violations) {
    if (!mapRef.current) return;
    clearClusterMarkers();
    console.log("renderClusters called, violations length:", violations && violations.length);
    if (!violations || violations.length === 0) return;

    // Use simple grid in lat/lng space as fallback
  // even smaller grid to produce denser clusters (~500m). Reduce to taste.
  const gridSizeDeg = 0.005; // roughly ~0.5km grid
    const buckets = new Map();

    const extractLatLng = (v) => {
      const toNum = (x) => {
        const n = parseFloat(x);
        return Number.isFinite(n) ? n : null;
      };
      if (v == null) return null;
      // various common shapes
      if (v.latitude && v.longitude) {
        const lat = toNum(v.latitude);
        const lng = toNum(v.longitude);
        if (lat !== null && lng !== null) return { lat, lng };
      }
      // dataset uses violation_latitude / violation_longitude
      if (v.violation_latitude && v.violation_longitude) {
        const lat = toNum(v.violation_latitude);
        const lng = toNum(v.violation_longitude);
        if (lat !== null && lng !== null) return { lat, lng };
      }
      if (v.lat && v.lng) {
        const lat = toNum(v.lat);
        const lng = toNum(v.lng);
        if (lat !== null && lng !== null) return { lat, lng };
      }
      if (v.location && (v.location.latitude || v.location.lat || v.location.longitude || v.location.lon)) {
        const lat = toNum(v.location.latitude || v.location.lat);
        const lng = toNum(v.location.longitude || v.location.lon || v.location.lng);
        if (lat !== null && lng !== null) return { lat, lng };
      }
      // violation_georeference or bus_stop_georeference { type: 'Point', coordinates: [lng, lat] }
      if (v.violation_georeference && Array.isArray(v.violation_georeference.coordinates)) {
        const c = v.violation_georeference.coordinates;
        const lat = toNum(c[1]);
        const lng = toNum(c[0]);
        if (lat !== null && lng !== null) return { lat, lng };
      }
      if (v.bus_stop_georeference && Array.isArray(v.bus_stop_georeference.coordinates)) {
        const c = v.bus_stop_georeference.coordinates;
        const lat = toNum(c[1]);
        const lng = toNum(c[0]);
        if (lat !== null && lng !== null) return { lat, lng };
      }
      // also try bus_stop_latitude / bus_stop_longitude
      if (v.bus_stop_latitude && v.bus_stop_longitude) {
        const lat = toNum(v.bus_stop_latitude);
        const lng = toNum(v.bus_stop_longitude);
        if (lat !== null && lng !== null) return { lat, lng };
      }
      // Socrata-like the_geom: [lng, lat] or nested
      if (v.the_geom && v.the_geom.coordinates) {
        const c = v.the_geom.coordinates;
        // Point
        if (typeof c[0] === 'number' && typeof c[1] === 'number') {
          return { lat: toNum(c[1]), lng: toNum(c[0]) };
        }
        // nested arrays (Polygon / MultiPolygon), try to find first numeric pair
        const findFirstPair = (arr) => {
          if (!Array.isArray(arr)) return null;
          for (const item of arr) {
            if (Array.isArray(item) && typeof item[0] === 'number' && typeof item[1] === 'number') return item;
            const found = findFirstPair(item);
            if (found) return found;
          }
          return null;
        };
        const p = findFirstPair(c);
        if (p) return { lat: toNum(p[1]), lng: toNum(p[0]) };
      }
      // as a last resort, try top-level numeric fields named x/y
      if (v.x && v.y) {
        const lat = toNum(v.y);
        const lng = toNum(v.x);
        if (lat !== null && lng !== null) return { lat, lng };
      }
      return null;
    };

    let extracted = 0;
    for (const v of violations) {
      const pt = extractLatLng(v);
      if (pt && Number.isFinite(pt.lat) && Number.isFinite(pt.lng)) {
        extracted += 1;
        const key = `${Math.round(pt.lat / gridSizeDeg)}_${Math.round(pt.lng / gridSizeDeg)}`;
        if (!buckets.has(key)) buckets.set(key, { latSum: 0, lngSum: 0, count: 0, items: [] });
        const b = buckets.get(key);
        b.latSum += pt.lat; b.lngSum += pt.lng; b.count += 1; b.items.push(v);
      }
    }

    console.log("extracted points:", extracted, "buckets:", buckets.size);

    for (const [k, b] of buckets.entries()) {
      const avgLat = b.latSum / b.count;
      const avgLng = b.lngSum / b.count;
      // pick the most common bus_route_id in this bucket if available
      let modeRoute = null;
      try {
        const rc = {};
        for (const it of b.items) {
          const rid = (it && (it.bus_route_id || it.busRouteId || it.route)) || null;
          if (!rid) continue;
          rc[rid] = (rc[rid] || 0) + 1;
        }
        modeRoute = Object.keys(rc).sort((a, b2) => rc[b2] - rc[a])[0] || null;
      } catch (e) { modeRoute = null; }
      const routeColor = modeRoute ? getColorForBusRoute(modeRoute) : null;
      const color = routeColor || getClusterColor(b.count);
      // build compact SVG icon with centered count text for maximum readability
      const size = Math.max(14, Math.min(34, Math.round(14 + Math.sqrt(b.count) * 1.8)));
      const fontSize = Math.max(8, Math.round(size / 2.8));
      const svg = `
        <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
          <circle cx='${size / 2}' cy='${size / 2}' r='${size / 2 - 1}' fill='${color}' stroke='white' stroke-width='2' />
          <text x='50%' y='50%' dy='.35em' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='${fontSize}' fill='#ffffff'>${b.count}</text>
        </svg>`;
      const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
      const marker = new window.google.maps.Marker({
        position: { lat: avgLat, lng: avgLng },
        map: mapRef.current,
        title: `${b.count} violations`,
        icon: {
          url,
          scaledSize: new window.google.maps.Size(size, size),
        },
      });
      marker.addListener("click", () => {
        // Build cluster info: count + bus route + stop name, omit violation_type if 'exempt'
        const sample = b.items[0] || {};
        const parts = [];
        parts.push(`<div><strong>Violations: ${b.count}</strong></div>`);
        if (sample.bus_route_id) parts.push(`<div><strong>Bus route:</strong> ${sample.bus_route_id}</div>`);
        if (sample.stop_name) parts.push(`<div><strong>Stop:</strong> ${sample.stop_name}</div>`);
        if (sample.violation_type && typeof sample.violation_type === 'string' && !sample.violation_type.toLowerCase().includes('exempt')) {
          parts.push(`<div><strong>Type:</strong> ${sample.violation_type}</div>`);
        }
        const content = `<div>${parts.join('')}</div>`;
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.setPosition({ lat: avgLat, lng: avgLng });
          infoWindowRef.current.open(mapRef.current);
        }
      });
      clusterMarkersRef.current.push(marker);
    }
    if (extracted === 0) {
      console.warn("No valid lat/lng could be extracted from violations array. Check field names and data shape. Example violation:", violations[0]);
    }
  }


  async function fetchAndRender() {
    try {
      const res = await fetch(DATA_URL, {
        // If you have an app token, set header:
        // headers: { "X-App-Token": "YOUR_APP_TOKEN" }
      });
      const data = await res.json();
      if (!data) return;

      // clear previous data layer and polygons
      try {
        mapRef.current.data && mapRef.current.data.forEach && mapRef.current.data.forEach((f) => mapRef.current.data.remove(f));
      } catch (e) {}
      // remove previous generated polygons
      try {
        for (const p of polygonsRef.current || []) {
          try { p.setMap(null); } catch (e) {}
        }
        polygonsRef.current = [];
      } catch (e) {}

      // If the response is GeoJSON-like (has "type" & "features"), add directly
      if (data.type && data.features) {
        // data is GeoJSON
        mapRef.current.data.addGeoJson(data);
        styleDataLayer();

        // show properties in an InfoWindow when a feature is clicked
        // remove any previously attached click listener on data
        try {
          if (dataListenerRef.current && dataListenerRef.current.remove) dataListenerRef.current.remove();
        } catch (e) {}
        dataListenerRef.current = mapRef.current.data.addListener("click", (event) => {
          const f = event.feature;
          // requested properties
          // include the actual property names present in the GeoJSON (case-sensitive)
          const keys = ["boro_name", "zone", "zone_name", "rate_zone"];
          const rows = [];
          for (const k of keys) {
            const v = f.getProperty(k);
            if (v !== undefined && v !== null) rows.push(`<div><strong>${k}:</strong> ${v}</div>`);
          }
          // if none of the desired keys are present, show all properties (small fallback)
          if (rows.length === 0) {
            const props = f.getProperties ? f.getProperties() : {};
            for (const k of Object.keys(props)) rows.push(`<div><strong>${k}:</strong> ${props[k]}</div>`);
          }
          const content = `<div style="min-width:140px">${rows.join("")}</div>`;
          // position may be the clicked location
          const pos = event.latLng || (event.feature && event.feature.getGeometry && event.feature.getGeometry().get());
          infoWindowRef.current.setContent(content);
          if (event.latLng) {
            infoWindowRef.current.setPosition(event.latLng);
          }
          infoWindowRef.current.open(mapRef.current);
  });
        return;
      }

      // Otherwise treat as array of records; try to extract points
      const points = []; // [ [lng, lat], ... ] for turf
      for (const r of data) {
  // Skip records that are marked exempt
  if (r && r.violation_type && typeof r.violation_type === 'string' && r.violation_type.toLowerCase().includes('exempt')) continue;
        // Common Socrata shape: r.location may be object {latitude, longitude} or r.the_geom
        if (r.latitude && r.longitude) {
          const lat = parseFloat(r.latitude);
          const lng = parseFloat(r.longitude);
          if (!isNaN(lat) && !isNaN(lng)) points.push([lng, lat]);
        } else if (r.location && r.location.latitude && r.location.longitude) {
          const lat = parseFloat(r.location.latitude);
          const lng = parseFloat(r.location.longitude);
          if (!isNaN(lat) && !isNaN(lng)) points.push([lng, lat]);
        } else if (r.the_geom && r.the_geom.coordinates) {
          // If record includes GeoJSON point
          const coords = r.the_geom.coordinates;
          if (Array.isArray(coords) && coords.length >= 2) points.push(coords);
        }
        // Add more field heuristics here if your dataset uses different fields
      }

      if (points.length === 0) {
        console.warn("No point coordinates found in data - inspect the records to find lat/lon fields.");
        return;
      }

      // Build Turf points feature collection
      const turfPts = turf.featureCollection(points.map((c) => turf.point(c)));
      // Make a single polygon using convex hull (switch to turf.concave for tighter bounds)
      const hull = turf.convex(turfPts);
      if (!hull) {
        console.warn("Could not generate a hull from points (maybe too few points).");
        return;
      }

      // Convert turf polygon coords to google.maps.LatLngLiteral array
      // hull may be Polygon or MultiPolygon; find the first linear ring
      let ring = null;
      if (!hull || !hull.geometry) {
        console.warn("Hull geometry missing");
        return;
      }
      if (hull.geometry.type === "Polygon") {
        ring = hull.geometry.coordinates[0];
      } else if (hull.geometry.type === "MultiPolygon") {
        // take the first polygon's outer ring
        ring = hull.geometry.coordinates[0] && hull.geometry.coordinates[0][0];
      } else {
        console.warn("Unsupported hull geometry type:", hull.geometry.type);
        return;
      }
      if (!ring || !Array.isArray(ring) || ring.length === 0) {
        console.warn("No coordinates found in hull");
        return;
      }
      const coords = ring.map(([lng, lat]) => ({ lat, lng }));

      // Determine a representative zone from the records (mode) if possible
      let modeZone = null;
      try {
        const counts = {};
        for (const r of data) {
          const z = (r.zone || r.rate_zone || r.Zone || r.zone_name || "").toString();
          if (!z) continue;
          counts[z] = (counts[z] || 0) + 1;
        }
        modeZone = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || null;
      } catch (e) {
        modeZone = null;
      }

      const polyColor = getColorForZone(modeZone);

      // Draw polygon on the map
      const polygon = new window.google.maps.Polygon({
        paths: coords,
        strokeColor: polyColor,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: polyColor,
        fillOpacity: 0.35,
      });
  if (mapRef.current) polygon.setMap(mapRef.current);
      polygonsRef.current.push(polygon);

      // clicking the generated polygon shows a simple summary (no per-feature props available)
      polygon.addListener("click", (evt) => {
        const content = `<div><strong>Generated polygon</strong><div>Points: ${points.length}</div></div>`;
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(content);
          if (evt && evt.latLng) infoWindowRef.current.setPosition(evt.latLng);
          infoWindowRef.current.open(mapRef.current);
        }
      });

      // Fit map to polygon bounds (only if coords valid and map exists)
      if (coords && coords.length > 0 && mapRef.current) {
        try {
          const bounds = new window.google.maps.LatLngBounds();
          coords.forEach((p) => bounds.extend(new window.google.maps.LatLng(p.lat, p.lng)));
          mapRef.current.fitBounds(bounds);
        } catch (e) {
          console.warn("Could not fit bounds:", e);
        }
      }
    } catch (err) {
      console.error("Failed to fetch or render data:", err);
    }
  }

  function styleDataLayer() {
    // Style GeoJSON features using their `zone` or `rate_zone` property
    mapRef.current.data.setStyle((feature) => {
      const z = feature.getProperty("zone") || feature.getProperty("rate_zone") || feature.getProperty("Zone");
      const color = getColorForZone(z);
      return {
        fillColor: color,
        strokeWeight: 1,
        strokeColor: color,
        fillOpacity: 0.45,
      };
    });
  }

  return <div ref={containerRef} style={{ width: "100vh", height: "100vh" }} />;
}