import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { NormalizedPlace, CurrentUserLocation, SearchLocation } from '../../types';
import {
  Navigation, MapPin, Compass, Car, Footprints, X, Route, Loader2,
} from 'lucide-react';

// ── Token from environment variable – never hardcoded ──────────────────────
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

// ── Turn-by-turn maneuver icon helper ──────────────────────────────────────
const getManeuverIcon = (instruction: string, stepName?: string): string => {
  const combined = `${instruction} ${stepName || ''}`.toLowerCase();
  if (combined.includes('arrive') || combined.includes('destination') || combined.includes('reached')) return '🏁';
  if (combined.includes('depart') || combined.includes('start')) return '📍';
  if (combined.includes('u-turn') || combined.includes('uturn')) return '↩';
  if (combined.includes('sharp left')) return '⮌';
  if (combined.includes('sharp right')) return '⮎';
  if (combined.includes('slight left') || combined.includes('fork left') || combined.includes('keep left')) return '↖';
  if (combined.includes('slight right') || combined.includes('fork right') || combined.includes('keep right')) return '↗';
  if (combined.includes('left')) return '↰';
  if (combined.includes('right')) return '↱';
  if (combined.includes('roundabout') || combined.includes('rotary')) return '🔄';
  return '⬆';
};

// ── Props ──────────────────────────────────────────────────────────────────
interface MapViewProps {
  places: NormalizedPlace[];
  selectedPlace: NormalizedPlace | null;
  hoveredPlace: NormalizedPlace | null;
  onSelectPlace: (place: NormalizedPlace) => void;
  onDeselectPlace?: () => void;
  searchLocation?: SearchLocation;
  currentUserGps?: CurrentUserLocation | null;
  onQuickFilter?: (filterType: 'all' | 'best' | 'closest' | 'rating' | 'cheapest' | 'openNow') => void;
  onExploreArea?: (coords: { latitude: number; longitude: number }) => void;
  activeRoutePlace?: NormalizedPlace | null;
  onCloseRoute?: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────
export const MapView: React.FC<MapViewProps> = ({
  places,
  selectedPlace,
  hoveredPlace,
  onSelectPlace,
  onDeselectPlace,
  searchLocation,
  currentUserGps,
  onQuickFilter,
  onExploreArea,
  activeRoutePlace,
  onCloseRoute,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const routeCacheRef = useRef<Map<string, [number, number][]>>(new Map());

  const [activeFilter, setActiveFilter] = useState<'all' | 'best' | 'closest' | 'rating' | 'cheapest' | 'openNow'>('all');
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);
  const currentCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  // Navigation state
  const [inAppNavPlace, setInAppNavPlace] = useState<NormalizedPlace | null>(activeRoutePlace || null);
  const [navMode, setNavMode] = useState<'driving' | 'walking'>('driving');
  const [routeSteps, setRouteSteps] = useState<Array<{ instruction: string; name: string; distance: number }> | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isTurnByTurnActive, setIsTurnByTurnActive] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [mapPerspective, setMapPerspective] = useState<'user' | 'overview'>('user');

  // Keep callbacks stable inside event listeners
  const onSelectPlaceRef = useRef(onSelectPlace);
  onSelectPlaceRef.current = onSelectPlace;
  const onDeselectPlaceRef = useRef(onDeselectPlace);
  onDeselectPlaceRef.current = onDeselectPlace;

  // Route origin: real GPS preferred, else search location centroid
  const routeOriginLng = currentUserGps?.longitude ?? searchLocation?.longitude ?? (places[0]?.longitude ?? 78.486);
  const routeOriginLat = currentUserGps?.latitude  ?? searchLocation?.latitude  ?? (places[0]?.latitude  ?? 17.385);
  const initLng = searchLocation?.longitude ?? (places[0]?.longitude ?? 78.486);
  const initLat = searchLocation?.latitude  ?? (places[0]?.latitude  ?? 17.385);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const zoomToMyLocation = () => {
    mapRef.current?.flyTo({ center: [routeOriginLng, routeOriginLat], zoom: 17, speed: 1.2 });
    setMapPerspective('user');
  };

  const zoomToRouteOverview = () => {
    const map = mapRef.current;
    if (!map || !inAppNavPlace) return;
    const bounds = new mapboxgl.LngLatBounds(
      [routeOriginLng, routeOriginLat],
      [inAppNavPlace.longitude, inAppNavPlace.latitude],
    );
    map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    setMapPerspective('overview');
  };

  // Fetch road route via OSRM (free, no billing)
  const fetchRoadRoute = async (
    fromLng: number, fromLat: number,
    toLng: number, toLat: number,
    mode: 'driving' | 'foot' = 'driving',
  ): Promise<[number, number][] | null> => {
    const key = `${mode}:${fromLat.toFixed(4)},${fromLng.toFixed(4)}->${toLat.toFixed(4)},${toLng.toFixed(4)}`;
    if (routeCacheRef.current.has(key)) return routeCacheRef.current.get(key)!;
    try {
      const url = `https://router.project-osrm.org/route/v1/${mode}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&steps=true&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const route = data.routes?.[0];
      if (!route) return null;
      const coords: [number, number][] = route.geometry.coordinates; // already [lng, lat]
      routeCacheRef.current.set(key, coords);
      return coords;
    } catch {
      return null;
    }
  };

  // Draw the active navigation route on the map
  const drawNavRoute = (coords: [number, number][]) => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing layers/sources
    ['nav-route-casing', 'nav-route-core'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('nav-route')) map.removeSource('nav-route');

    map.addSource('nav-route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      },
    });

    map.addLayer({
      id: 'nav-route-casing',
      type: 'line',
      source: 'nav-route',
      paint: { 'line-color': '#0284c7', 'line-width': 10, 'line-opacity': 0.9 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });

    map.addLayer({
      id: 'nav-route-core',
      type: 'line',
      source: 'nav-route',
      paint: { 'line-color': '#00f0ff', 'line-width': 6, 'line-opacity': 1 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
  };

  const clearNavRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    ['nav-route-casing', 'nav-route-core'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('nav-route')) map.removeSource('nav-route');
  };

  // Draw a dashed selection route between origin and a place
  const drawSelectionRoute = (place: NormalizedPlace) => {
    const map = mapRef.current;
    if (!map) return;

    ['sel-route'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('sel-route')) map.removeSource('sel-route');

    map.addSource('sel-route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [[routeOriginLng, routeOriginLat], [place.longitude, place.latitude]],
        },
      },
    });

    map.addLayer({
      id: 'sel-route',
      type: 'line',
      source: 'sel-route',
      paint: { 'line-color': '#f59e0b', 'line-width': 3, 'line-opacity': 0.9, 'line-dasharray': [5, 8] },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });

    // Upgrade to real road geometry async
    fetchRoadRoute(routeOriginLng, routeOriginLat, place.longitude, place.latitude).then(coords => {
      if (!coords) return;
      const src = map.getSource('sel-route') as mapboxgl.GeoJSONSource | undefined;
      src?.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      });
    });
  };

  const clearSelectionRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer('sel-route')) map.removeLayer('sel-route');
    if (map.getSource('sel-route')) map.removeSource('sel-route');
  };

  // ── Map Initialisation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) {
      console.error('[MapView] VITE_MAPBOX_TOKEN is not set.');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [initLng, initLat],
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('click', () => { onDeselectPlaceRef.current?.(); });

    map.on('moveend', () => {
      const c = map.getCenter();
      currentCenterRef.current = { lat: c.lat, lng: c.lng };
      const dist = Math.hypot(c.lat - initLat, c.lng - initLng);
      if (dist > 0.03) setShowSearchAreaBtn(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── User GPS Marker ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!currentUserGps?.latitude || !currentUserGps?.longitude) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    const el = document.createElement('div');
    el.className = 'user-gps-dot';
    el.innerHTML = `
      <div class="relative flex items-center justify-center">
        <div class="absolute -inset-3 rounded-full bg-cyan-400/30 animate-ping"></div>
        <div class="relative w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 via-cyan-500 to-cyan-300 border-2 border-white shadow-2xl flex items-center justify-center text-white text-[10px] font-black">●</div>
        <div class="absolute -bottom-5 px-2 py-0.5 rounded-full bg-slate-950/95 border border-cyan-400/60 text-[10px] font-black text-cyan-300 whitespace-nowrap shadow-xl">YOU ARE HERE</div>
      </div>`;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([currentUserGps.longitude, currentUserGps.latitude]);
    } else {
      userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([currentUserGps.longitude, currentUserGps.latitude])
        .addTo(map);
    }

    if (isTurnByTurnActive && mapPerspective === 'user') {
      map.panTo([currentUserGps.longitude, currentUserGps.latitude], { animate: true, duration: 800 });
    }
  }, [currentUserGps, isTurnByTurnActive, mapPerspective]);

  // ── Restaurant Markers ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

    const bounds = new mapboxgl.LngLatBounds();

    places.forEach((place, index) => {
      const rankNumber = index + 1;
      const isBest = index === 0;
      const isSelected = selectedPlace?.id === place.id;

      // Custom marker element
      const el = document.createElement('div');
      el.className = 'mapbox-place-marker';
      el.innerHTML = `
        <div class="relative flex items-center justify-center transition-all duration-300 cursor-pointer ${isSelected ? 'scale-125' : 'scale-100 hover:scale-110'}">
          <div class="px-2.5 py-1 rounded-full text-xs font-black shadow-2xl flex items-center gap-1.5 border ${
            isBest
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-200 ring-4 ring-amber-400/40'
              : isSelected
              ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/30'
              : 'bg-slate-950 text-white border-slate-700 hover:border-amber-400'
          }">
            <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${isBest ? 'bg-slate-950 text-amber-400' : isSelected ? 'bg-slate-900 text-white' : 'bg-slate-800 text-amber-400'}">
              ${isBest ? '🏆' : rankNumber}
            </span>
            <span>${isBest ? 'Best' : `${place.rating}★`}</span>
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isBest || isSelected ? 'bg-amber-400' : 'bg-slate-950'}"></div>
        </div>`;

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectPlaceRef.current(place);

        // Popup
        if (popupRef.current) { popupRef.current.remove(); }
        const driveTime = place.travelTime?.drivingMinutes ?? Math.max(3, Math.round((place.distance ?? 1.5) * 3));
        const searchedItem = place.foodItems?.[0];

        const popup = new mapboxgl.Popup({ closeButton: false, offset: 10, maxWidth: '280px' })
          .setLngLat([place.longitude, place.latitude])
          .setHTML(`
            <div style="font-family: inherit; color: #f8fafc; min-width: 220px; padding: 4px;">
              <div style="position: relative; height: 95px; border-radius: 12px; overflow: hidden; margin-bottom: 8px;">
                <img src="${place.image}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'" />
                <div style="position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.85); color: #f59e0b; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; border: 1px solid rgba(245,158,11,0.4);">
                  #${rankNumber} ${isBest ? '🏆 Best Match' : `${place.rating} ★`}
                </div>
              </div>
              <h4 style="font-weight: 800; margin: 0 0 2px; font-size: 14px; color: #fff;">${place.name}</h4>
              <p style="margin: 0 0 6px; font-size: 11px; color: #94a3b8; line-height: 1.3;">${place.address}</p>
              ${searchedItem ? `
                <div style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); border-radius: 8px; padding: 4px 8px; margin-bottom: 6px; display: flex; justify-content: space-between; font-size: 11px;">
                  <span style="color: #fbbf24; font-weight: 700;">🍛 ${searchedItem.name}</span>
                  ${searchedItem.price ? `<span style="color: #fff; font-weight: 800;">₹${searchedItem.price}</span>` : ''}
                </div>` : ''}
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 8px;">
                <span style="color: #38bdf8;">📍 ${place.distance ?? 1.4} km</span>
                <span style="color: #4ade80;">🚗 ${driveTime} min</span>
              </div>
              <button
                id="mapbox-nav-btn-${place.id}"
                style="width: 100%; background: linear-gradient(135deg, #f59e0b, #d97706); color: #020617; border: none; padding: 7px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 2px 8px rgba(245,158,11,0.35);">
                🚗 Directions in App
              </button>
            </div>`)
          .addTo(map);

        popupRef.current = popup;

        // Wire up direction button after popup renders
        setTimeout(() => {
          const btn = document.getElementById(`mapbox-nav-btn-${place.id}`);
          if (btn) {
            btn.onclick = (ev) => {
              ev.stopPropagation();
              onSelectPlaceRef.current(place);
              setInAppNavPlace(place);
              popup.remove();
            };
          }
        }, 50);
      });

      markersRef.current.set(place.id, marker);
      bounds.extend([place.longitude, place.latitude]);
    });

    // Fit bounds on fresh results
    if (places.length > 0 && !selectedPlace && !inAppNavPlace) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  // ── Selected place sync ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!selectedPlace || inAppNavPlace || activeRoutePlace) {
      clearSelectionRoute();
      return;
    }

    map.flyTo({ center: [selectedPlace.longitude, selectedPlace.latitude], zoom: 14, speed: 0.9 });
    drawSelectionRoute(selectedPlace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlace, inAppNavPlace, activeRoutePlace]);

  // ── activeRoutePlace prop sync ───────────────────────────────────────────
  useEffect(() => {
    if (activeRoutePlace) {
      setInAppNavPlace(activeRoutePlace);
      setIsTurnByTurnActive(true);
      setCurrentStepIdx(0);
      setMapPerspective('user');
      mapRef.current?.flyTo({ center: [routeOriginLng, routeOriginLat], zoom: 17, speed: 1.2 });
    }
  }, [activeRoutePlace, routeOriginLat, routeOriginLng]);

  // ── Navigation route fetcher ─────────────────────────────────────────────
  useEffect(() => {
    if (!inAppNavPlace) {
      clearNavRoute();
      setRouteSteps(null);
      setRouteDurationMin(null);
      setRouteDistanceKm(null);
      setIsTurnByTurnActive(false);
      return;
    }

    const map = mapRef.current;
    if (!map) return;

    setIsLoadingRoute(true);
    const mode = navMode === 'walking' ? 'foot' : 'driving';
    const url = `https://router.project-osrm.org/route/v1/${mode}/${routeOriginLng},${routeOriginLat};${inAppNavPlace.longitude},${inAppNavPlace.latitude}?overview=full&steps=true&geometries=geojson`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        const route = data.routes?.[0];
        if (!route) return;

        // Wait until map style is loaded before drawing
        const doDraw = () => {
          drawNavRoute(route.geometry.coordinates);
          setRouteDistanceKm(parseFloat((route.distance / 1000).toFixed(1)));
          setRouteDurationMin(Math.max(1, Math.round(route.duration / 60)));

          const steps: Array<{ instruction: string; name: string; distance: number }> = [];
          for (const s of route.legs?.[0]?.steps ?? []) {
            const m = s.maneuver;
            let inst = 'Continue';
            if (m?.type === 'depart') inst = 'Depart from your location';
            else if (m?.type === 'arrive') inst = `Arrive at ${inAppNavPlace.name}`;
            else if (m?.modifier) inst = `Turn ${m.modifier}`;
            else if (m?.type) inst = m.type;
            steps.push({ instruction: inst, name: s.name || '', distance: Math.round(s.distance || 0) });
          }
          setRouteSteps(steps.length > 0 ? steps : null);

          setTimeout(() => {
            mapRef.current?.flyTo({ center: [routeOriginLng, routeOriginLat], zoom: 17, speed: 1.2 });
          }, 100);

          setIsTurnByTurnActive(true);
          setMapPerspective('user');
        };

        if (map.isStyleLoaded()) {
          doDraw();
        } else {
          map.once('load', doDraw);
        }
      })
      .catch(err => console.warn('Nav route error:', err))
      .finally(() => setIsLoadingRoute(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inAppNavPlace, navMode, routeOriginLat, routeOriginLng]);

  // ── Distances for legend ─────────────────────────────────────────────────
  const distances = places.map(p => p.distance ?? 1.5).sort((a, b) => a - b);
  const minDist = distances[0] ?? 1.2;
  const maxDist = distances[distances.length - 1] ?? minDist;

  const handleFilterClick = (filter: typeof activeFilter) => {
    setActiveFilter(filter);
    onQuickFilter?.(filter);
  };

  const handleExploreArea = () => {
    if (currentCenterRef.current && onExploreArea) {
      onExploreArea({ latitude: currentCenterRef.current.lat, longitude: currentCenterRef.current.lng });
      setShowSearchAreaBtn(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full min-h-[440px] lg:min-h-[640px] rounded-3xl overflow-hidden border border-surface-border shadow-card flex flex-col bg-[#0b0e14]">

      {/* ── Header ── */}
      <div className="z-10 px-4 py-3 bg-surface-card/95 border-b border-surface-border backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-extrabold text-sm text-white tracking-tight">
              ✦ {places.length} {places.length === 1 ? 'Verified Match' : 'Verified Matches'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-cyan-400" />
            <span>
              {searchLocation?.name ? `In ${searchLocation.name}` : 'Search Area'} • {minDist}–{maxDist} km
            </span>
          </p>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'best', label: '🏆 Best Match' },
            { id: 'closest', label: '📍 Closest' },
            { id: 'rating', label: '⭐ Highest Rated' },
            { id: 'openNow', label: '🟢 Open Now' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleFilterClick(f.id as typeof activeFilter)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-amber-400 text-slate-950 shadow-glow'
                  : 'bg-surface-dark text-slate-300 hover:text-white border border-surface-border'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Map Container ── */}
      <div className="relative flex-1 w-full min-h-[520px] sm:min-h-[580px] h-[calc(100vh-160px)] max-h-[720px]">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Navigation HUD – top banner */}
        {inAppNavPlace && (
          <div className="absolute top-3 left-3 right-3 z-[500] max-w-lg mx-auto bg-gradient-to-r from-emerald-700 via-green-700 to-emerald-800 text-white rounded-2xl p-2.5 sm:p-3 shadow-2xl border border-emerald-400/40 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-black/25 flex items-center justify-center text-2xl font-black shrink-0 border border-white/20">
                {routeSteps?.length ? getManeuverIcon(routeSteps[currentStepIdx]?.instruction, routeSteps[currentStepIdx]?.name) : '🚗'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200">
                  {isLoadingRoute ? (
                    <span className="flex items-center gap-1 text-amber-300">
                      <Loader2 className="w-3 h-3 animate-spin" /> Calculating route…
                    </span>
                  ) : (
                    <>
                      <span>Step {currentStepIdx + 1} of {routeSteps?.length ?? 1}</span>
                      {(routeSteps?.[currentStepIdx]?.distance ?? 0) > 0 && (
                        <span className="bg-black/25 px-1.5 py-0.5 rounded text-white font-black text-[9px]">
                          {routeSteps![currentStepIdx].distance >= 1000
                            ? `${(routeSteps![currentStepIdx].distance / 1000).toFixed(1)} km`
                            : `${routeSteps![currentStepIdx].distance} m`}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="text-sm font-black text-white capitalize truncate drop-shadow-sm">
                  {routeSteps?.[currentStepIdx]?.instruction ?? `Navigate to ${inAppNavPlace.name}`}
                </div>
                <div className="text-[11px] text-emerald-100 font-medium truncate">
                  {routeSteps?.[currentStepIdx]?.name ? `onto ${routeSteps[currentStepIdx].name}` : inAppNavPlace.address}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {routeSteps && routeSteps.length > 1 && (
                  <div className="flex items-center gap-0.5 bg-black/25 rounded-lg p-0.5 border border-white/10">
                    <button
                      type="button"
                      disabled={currentStepIdx === 0}
                      onClick={() => setCurrentStepIdx(i => Math.max(0, i - 1))}
                      className="w-6 h-6 rounded-md hover:bg-black/30 disabled:opacity-30 flex items-center justify-center text-xs font-bold text-white transition-all cursor-pointer"
                    >◀</button>
                    <button
                      type="button"
                      disabled={currentStepIdx >= routeSteps.length - 1}
                      onClick={() => setCurrentStepIdx(i => Math.min(routeSteps!.length - 1, i + 1))}
                      className="w-6 h-6 rounded-md hover:bg-black/30 disabled:opacity-30 flex items-center justify-center text-xs font-bold text-white transition-all cursor-pointer"
                    >▶</button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setNavMode(m => m === 'driving' ? 'walking' : 'driving')}
                  className="p-1.5 rounded-lg bg-black/25 hover:bg-black/40 text-white border border-white/10 transition-all cursor-pointer"
                  title={`Switch to ${navMode === 'driving' ? 'walking' : 'driving'}`}
                >
                  {navMode === 'driving' ? <Car className="w-3.5 h-3.5" /> : <Footprints className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => { setInAppNavPlace(null); onCloseRoute?.(); }}
                  className="p-1.5 rounded-lg bg-black/25 hover:bg-rose-500/80 text-white border border-white/10 transition-all cursor-pointer"
                  title="Exit Navigation"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation – bottom action bar */}
        {inAppNavPlace && (
          <div className="absolute bottom-3 left-3 right-3 z-[500] max-w-lg mx-auto bg-slate-950/95 backdrop-blur-xl border border-surface-border rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-2 text-white animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{navMode === 'driving' ? '🚗' : '🚶'}</span>
              <div className="min-w-0">
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>{routeDurationMin !== null ? `${routeDurationMin} min` : `${inAppNavPlace.travelTime?.drivingMinutes ?? 15} min`}</span>
                  <span className="text-[10px] text-cyan-400 font-bold">
                    ({routeDistanceKm !== null ? `${routeDistanceKm} km` : `${inAppNavPlace.distance ?? 1.5} km`})
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">via real road network</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={zoomToMyLocation}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  mapPerspective === 'user'
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300'
                    : 'bg-surface-dark border-surface-border text-slate-300 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="hidden sm:inline">My Location</span>
                <span className="sm:hidden">GPS</span>
              </button>

              <button
                type="button"
                onClick={zoomToRouteOverview}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  mapPerspective === 'overview'
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                    : 'bg-surface-dark border-surface-border text-slate-300 hover:text-white'
                }`}
              >
                <Route className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Route</span>
              </button>

              {routeSteps && routeSteps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsStepsExpanded(v => !v)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isStepsExpanded
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-surface-dark border-surface-border text-slate-300 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{routeSteps.length} Turns</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => { setInAppNavPlace(null); onCloseRoute?.(); }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <span>Exit</span>
              </button>
            </div>
          </div>
        )}

        {/* Collapsible turn list */}
        {inAppNavPlace && isStepsExpanded && routeSteps && routeSteps.length > 0 && (
          <div className="absolute inset-x-3 bottom-16 z-[550] max-w-lg mx-auto bg-slate-950/98 backdrop-blur-2xl border border-surface-border rounded-2xl p-3 shadow-2xl text-white max-h-56 overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border mb-2">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                <span>Full Turn-by-Turn Route ({routeSteps.length} turns)</span>
              </span>
              <button type="button" onClick={() => setIsStepsExpanded(false)} className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer">✕ Close</button>
            </div>
            <div className="space-y-1.5 text-[11px]">
              {routeSteps.map((step, idx) => (
                <div
                  key={`step-${idx}`}
                  onClick={() => setCurrentStepIdx(idx)}
                  className={`p-2 rounded-xl border flex items-start gap-2 transition-all cursor-pointer ${
                    currentStepIdx === idx
                      ? 'bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400/40'
                      : 'bg-surface-dark border-surface-border text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-black/40 text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {getManeuverIcon(step.instruction, step.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold capitalize truncate">{step.instruction}</div>
                    {step.name && <div className="text-slate-400 text-[10px] truncate">onto {step.name}</div>}
                  </div>
                  {step.distance > 0 && (
                    <span className="text-cyan-400 font-semibold text-[10px] shrink-0">
                      {step.distance >= 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${step.distance}m`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* "Search This Area" floating button */}
        {!inAppNavPlace && showSearchAreaBtn && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] animate-bounce">
            <button
              type="button"
              onClick={handleExploreArea}
              className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-2xl flex items-center gap-2 border border-amber-300 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Search This Area</span>
            </button>
          </div>
        )}

        {/* Legend */}
        {!inAppNavPlace && (
          <div className="absolute bottom-4 left-4 z-[400] px-3 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-md text-[11px] text-slate-300 flex flex-wrap items-center gap-3 shadow-xl">
            {currentUserGps && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" />
                <span className="text-[10px]">Your GPS</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[9px] font-black">🏆</span>
              <span className="text-[10px]">Best Match</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-amber-300 flex items-center justify-center text-[9px] font-bold border border-slate-700">①</span>
              <span className="text-[10px]">Ranked</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="font-bold">━━</span>
              <span className="text-[10px] text-slate-400">Route</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
