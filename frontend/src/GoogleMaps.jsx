
import { useEffect, useRef } from "react";
import * as turf from "@turf/turf";

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
  const polygonsRef = useRef([]);
  const infoWindowRef = useRef(null);

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
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
    return () => {
      // cleanup script if needed
    };
  }, []);

  // Initialize map and load data
  function initMap() {
    if (!containerRef.current) return;
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
  }

  async function fetchAndRender() {
    try {
      const res = await fetch(DATA_URL, {
        // If you have an app token, set header:
        // headers: { "X-App-Token": "YOUR_APP_TOKEN" }
      });
      const data = await res.json();
      if (!data) return;

      // If the response is GeoJSON-like (has "type" & "features"), add directly
      if (data.type && data.features) {
        // data is GeoJSON
        mapRef.current.data.addGeoJson(data);
        styleDataLayer();

        // show properties in an InfoWindow when a feature is clicked
        mapRef.current.data.addListener("click", (event) => {
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
      const coords = hull.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }));

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
      polygon.setMap(mapRef.current);
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

      // Fit map to polygon bounds
      const bounds = new window.google.maps.LatLngBounds();
      coords.forEach((p) => bounds.extend(new window.google.maps.LatLng(p.lat, p.lng)));
      mapRef.current.fitBounds(bounds);
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