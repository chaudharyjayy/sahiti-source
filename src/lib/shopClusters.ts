import type { Shop } from "@/data/shops";

/**
 * Zoom-aware grouping for shop pins.
 *
 * Lohegaon market holds twenty-odd shops inside about 200 m, which renders as
 * an unreadable pile of dots. Nearby shops therefore fold into a single count
 * bubble until the user zooms in far enough to tell them apart.
 *
 * The grid is in degrees rather than metres, which keeps the maths trivial and
 * good enough at Pune's latitude: one degree of latitude is about 111 km, and
 * one degree of longitude about 105 km.
 */

/** Cell size in degrees for a given zoom. Zero means "stop clustering". */
export function clusterCellSize(zoom: number): number {
  if (zoom <= 11) return 0.08;
  if (zoom === 12) return 0.03;
  if (zoom === 13) return 0.015;
  if (zoom === 14) return 0.007;
  if (zoom === 15) return 0.0035;
  if (zoom === 16) return 0.0008;
  if (zoom === 17) return 0.0004;
  // 18 and beyond: individual pins, so the user can read every shop.
  return 0;
}

export type ShopGroup = {
  /** Stable React key. Single shops reuse their id; clusters key off the cell. */
  key: string;
  lat: number;
  lng: number;
  shops: Shop[];
};

/**
 * Groups shops into grid cells for the given zoom.
 *
 * A group of one is a normal pin. Anything larger becomes a cluster bubble, so
 * callers can branch on `shops.length`.
 */
export function groupShops(shops: Shop[], zoom: number): ShopGroup[] {
  const cell = clusterCellSize(zoom);

  if (cell === 0) {
    return shops.map((shop) => ({
      key: shop.id,
      lat: shop.lat,
      lng: shop.lng,
      shops: [shop],
    }));
  }

  const cells = new Map<string, Shop[]>();
  for (const shop of shops) {
    const key = `${Math.floor(shop.lat / cell)}:${Math.floor(shop.lng / cell)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(shop);
    else cells.set(key, [shop]);
  }

  return [...cells.entries()].map(([key, group]) => ({
    // A lone shop keeps its own id as the key. A cell-derived key would change
    // with every zoom step, making React tear down and rebuild the marker.
    key: group.length === 1 ? group[0]!.id : key,
    // Average position, so the bubble sits among its shops rather than on the
    // cell corner.
    lat: group.reduce((total, shop) => total + shop.lat, 0) / group.length,
    lng: group.reduce((total, shop) => total + shop.lng, 0) / group.length,
    shops: group,
  }));
}

export type ShopFocus = { lat: number; lng: number; zoom: number };

/**
 * Centre and zoom that frame a set of shops comfortably. Used when a locality
 * filter is picked, so the map moves to match the list underneath it.
 */
export function focusForShops(shops: Shop[]): ShopFocus | null {
  if (shops.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const shop of shops) {
    if (shop.lat < minLat) minLat = shop.lat;
    if (shop.lat > maxLat) maxLat = shop.lat;
    if (shop.lng < minLng) minLng = shop.lng;
    if (shop.lng > maxLng) maxLng = shop.lng;
  }

  // A floor on the span stops a single shop zooming to street level, and the
  // factor leaves a little breathing room around the outermost pins.
  const span = Math.max(maxLat - minLat, maxLng - minLng, 0.004);
  // A web-mercator zoom level spans roughly 360 / 2^zoom degrees of longitude.
  const zoom = Math.min(16, Math.max(11, Math.round(Math.log2(360 / (span * 2)))));

  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2, zoom };
}

/** Category makeup of a cluster, used for the bubble's colour mix. */
export function dominantCategory(shops: Shop[]): Shop["category"] {
  const tally = new Map<Shop["category"], number>();
  for (const shop of shops) tally.set(shop.category, (tally.get(shop.category) ?? 0) + 1);
  let best = shops[0]!.category;
  for (const [category, count] of tally) {
    if (count > (tally.get(best) ?? 0)) best = category;
  }
  return best;
}
