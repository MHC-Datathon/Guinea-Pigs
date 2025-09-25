const _routeColorCache = {};

export function getColorForBusRoute(routeId) {
  try {
    if (!routeId) return null;
    const custom = window && window.GP_ROUTE_COLORS;
    if (custom && custom[routeId]) return custom[routeId];
    if (_routeColorCache[routeId]) return _routeColorCache[routeId];
    
    let h = 0;
    for (let i = 0; i < routeId.length; i++) {
      h = (h << 5) - h + routeId.charCodeAt(i);
      h |= 0;
    }

    const buckets = 39;
    const idx = Math.abs(h) % buckets;
    const GOLDEN_ANGLE = 137.50776405003785;
    const hue = Math.round((idx * GOLDEN_ANGLE) % 360);
    
    const saturation = 60;
    const tier = idx % 3;
    const lightness = 44 + tier * 6;
    const color = `hsl(${hue},${saturation}%,${lightness}%)`;
    
    _routeColorCache[routeId] = color;
    return color;
  } catch (e) {
    return null;
  }
}