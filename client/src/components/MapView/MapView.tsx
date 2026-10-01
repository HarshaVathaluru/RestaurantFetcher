import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { NormalizedPlace, CurrentUserLocation, SearchLocation } from '../../types';
import {
  Navigation, MapPin, Compass, Car, Footprints, X, Route, Loader2,
} from 'lucide-react';

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
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const navRouteLayerRef = useRef<L.LayerGroup | null>(null);
  const selRouteLayerRef = useRef<L.Polyline | null>(null);
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

  // Stable callback refs
  const onSelectPlaceRef = useRef(onSelectPlace);
  onSelectPlaceRef.current = onSelectPlace;
  const onDeselectPlaceRef = useRef(onDeselectPlace);
  onDeselectPlaceRef.current = onDeselectPlace;

  // Origin: genuine GPS preferred, else search location
  const routeOriginLat = currentUserGps?.latitude ?? searchLocation?.latitude ?? (places[0]?.latitude ?? 17.385);
  const routeOriginLng = currentUserGps?.longitude ?? searchLocation?.longitude ?? (places[0]?.longitude ?? 78.486);
  const initLat = searchLocation?.latitude ?? (places[0]?.latitude ?? 17.385);
  const initLng = searchLocation?.longitude ?? (places[0]?.longitude ?? 78.486);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const zoomToMyLocation = () => {
    mapRef.current?.flyTo([routeOriginLat, routeOriginLng], 16, { duration: 1 });
    setMapPerspective('user');
  };

  const zoomToRouteOverview = () => {
    const map = mapRef.current;
    if (!map || !inAppNavPlace) return;
    const bounds = L.latLngBounds([
      [routeOriginLat, routeOriginLng],
      [inAppNavPlace.latitude, inAppNavPlace.longitude],
    ]);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    setMapPerspective('overview');
  };

  // Fetch road route via OSRM (100% free, no billing, no key needed)
  const fetchRoadRoute = async (
    fromLat: number, fromLng: number,
    toLat: number, toLng: number,
    mode: 'driving' | 'foot' = 'driving'
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
      // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
      const coords: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );
      routeCacheRef.current.set(key, coords);
      return coords;
    } catch {
      return null;
    }
  };

  // Draw navigation route
  const drawNavRoute = (latlngs: [number, number][]) => {
    const map = mapRef.current;
    if (!map) return;

    if (navRouteLayerRef.current) {
      map.removeLayer(navRouteLayerRef.current);
      navRouteLayerRef.current = null;
    }

    const group = L.layerGroup();
    // Outer glow casing
    L.polyline(latlngs, {
      color: '#0284c7',
      weight: 10,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(group);

    // Inner bright core
    L.polyline(latlngs, {
      color: '#00f0ff',
      weight: 5,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(group);

    group.addTo(map);
    navRouteLayerRef.current = group;
  };

  const clearNavRoute = () => {
    const map = mapRef.current;
    if (!map || !navRouteLayerRef.current) return;
    map.removeLayer(navRouteLayerRef.current);
    navRouteLayerRef.current = null;
  };

  // Draw selection route dashed
  const drawSelectionRoute = (place: NormalizedPlace) => {
    const map = mapRef.current;
    if (!map) return;
    if (selRouteLayerRef.current) {
      map.removeLayer(selRouteLayerRef.current);
      selRouteLayerRef.current = null;
    }

    fetchRoadRoute(routeOriginLat, routeOriginLng, place.latitude, place.longitude, 'driving')
      .then(roadCoords => {
        if (!mapRef.current) return;
        const coords = roadCoords || [
          [routeOriginLat, routeOriginLng],
          [place.latitude, place.longitude],
        ];
        const line = L.polyline(coords, {
          color: '#fbbf24',
          weight: 4,
          opacity: 0.9,
          dashArray: '8, 8',
        }).addTo(mapRef.current);
        selRouteLayerRef.current = line;
      })
      .catch(() => {});
  };

  const clearSelectionRoute = () => {
    const map = mapRef.current;
    if (!map || !selRouteLayerRef.current) return;
    map.removeLayer(selRouteLayerRef.current);
    selRouteLayerRef.current = null;
  };

  // ── Map Initialization (Leaflet with CartoDB Dark Matter) ─────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [initLat, initLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark-themed tiles: CartoDB Dark Matter (100% free, reliable, no token needed)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Zoom controls at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('click', () => {
      onDeselectPlaceRef.current?.();
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      currentCenterRef.current = { lat: center.lat, lng: center.lng };
      const dist = Math.hypot(center.lat - initLat, center.lng - initLng);
      if (dist > 0.03) setShowSearchAreaBtn(true);
    });

    mapRef.current = map;

    // Invalidate size to ensure container rendered properly
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── User GPS Pulsing Dot ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!currentUserGps?.latitude || !currentUserGps?.longitude) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    const iconHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <div class="absolute w-8 h-8 rounded-full bg-cyan-400/30 animate-ping"></div>
        <div class="relative w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 via-cyan-500 to-cyan-300 border-2 border-white shadow-2xl flex items-center justify-center text-white text-[9px] font-black">●</div>
        <div class="absolute -bottom-5 px-1.5 py-0.5 rounded-full bg-slate-950/95 border border-cyan-400/60 text-[9px] font-black text-cyan-300 whitespace-nowrap shadow-xl">YOU</div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: iconHtml,
      className: 'user-gps-leaflet-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([currentUserGps.latitude, currentUserGps.longitude]);
    } else {
      userMarkerRef.current = L.marker(
        [currentUserGps.latitude, currentUserGps.longitude],
        { icon: userIcon, zIndexOffset: 1000 }
      ).addTo(map);
    }

    if (isTurnByTurnActive && mapPerspective === 'user') {
      map.panTo([currentUserGps.latitude, currentUserGps.longitude], { animate: true, duration: 0.8 });
    }
  }, [currentUserGps, isTurnByTurnActive, mapPerspective]);

  // ── Restaurant Markers ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    const bounds = L.latLngBounds([]);

    places.forEach((place, index) => {
      const rankNumber = index + 1;
      const isBest = index === 0;
      const isSelected = selectedPlace?.id === place.id;
      const isHovered = hoveredPlace?.id === place.id;

      const markerHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full transition-transform duration-200 cursor-pointer ${
          isSelected ? 'scale-125' : isHovered ? 'scale-110' : 'scale-100 hover:scale-105'
        }">
          <div class="px-2.5 py-1 rounded-full text-xs font-black shadow-2xl flex items-center gap-1.5 border ${
            isBest
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-200 ring-4 ring-amber-400/40'
              : isSelected
              ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/30'
              : 'bg-slate-950 text-white border-slate-700 hover:border-amber-400'
          }">
            <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
              isBest ? 'bg-slate-950 text-amber-400' : isSelected ? 'bg-slate-900 text-white' : 'bg-slate-800 text-amber-400'
            }">
              ${isBest ? '🏆' : rankNumber}
            </span>
            <span>${isBest ? 'Best' : `${place.rating}★`}</span>
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
            isBest || isSelected ? 'bg-amber-400' : 'bg-slate-950'
          }"></div>
        </div>
      `;

      const placeIcon = L.divIcon({
        html: markerHtml,
        className: 'restaurant-leaflet-marker',
        iconSize: [80, 36],
        iconAnchor: [40, 36],
      });

      const marker = L.marker([place.latitude, place.longitude], {
        icon: placeIcon,
        zIndexOffset: isSelected ? 800 : isBest ? 500 : 100,
      }).addTo(map);

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectPlaceRef.current(place);
      });

      markersRef.current.set(place.id, marker);
      bounds.extend([place.latitude, place.longitude]);
    });

    // Auto-fit bounds if we have places and no active navigation
    if (places.length > 0 && !inAppNavPlace && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [places, selectedPlace?.id, hoveredPlace?.id, inAppNavPlace]);

  // ── Sync Active Route Place Prop ──────────────────────────────────────────
  useEffect(() => {
    if (activeRoutePlace) {
      setInAppNavPlace(activeRoutePlace);
    }
  }, [activeRoutePlace]);

  // ── In-App Routing Engine ─────────────────────────────────────────────────
  useEffect(() => {
    if (!inAppNavPlace) {
      clearNavRoute();
      setRouteSteps(null);
      setRouteDurationMin(null);
      setRouteDistanceKm(null);
      setIsTurnByTurnActive(false);
      return;
    }

    clearSelectionRoute();
    setIsLoadingRoute(true);
    const osrmMode = navMode === 'walking' ? 'foot' : 'driving';

    fetchRoadRoute(routeOriginLat, routeOriginLng, inAppNavPlace.latitude, inAppNavPlace.longitude, osrmMode)
      .then(async roadCoords => {
        setIsLoadingRoute(false);
        const map = mapRef.current;
        if (!map) return;

        const coords = roadCoords || [
          [routeOriginLat, routeOriginLng],
          [inAppNavPlace.latitude, inAppNavPlace.longitude],
        ];

        drawNavRoute(coords);

        const bounds = L.latLngBounds([
          [routeOriginLat, routeOriginLng],
          [inAppNavPlace.latitude, inAppNavPlace.longitude],
        ]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });

        // Calculate travel time and distance
        const distKm = Math.round(
          (inAppNavPlace.distance ||
            L.latLng(routeOriginLat, routeOriginLng).distanceTo([inAppNavPlace.latitude, inAppNavPlace.longitude]) / 1000) * 10
        ) / 10;
        const durMin = navMode === 'walking' ? Math.max(5, Math.round(distKm * 12)) : Math.max(3, Math.round(distKm * 2.8 + 2));

        setRouteDistanceKm(distKm);
        setRouteDurationMin(durMin);

        // Fetch detailed step instructions
        try {
          const detailUrl = `https://router.project-osrm.org/route/v1/${osrmMode}/${routeOriginLng},${routeOriginLat};${inAppNavPlace.longitude},${inAppNavPlace.latitude}?steps=true&overview=false`;
          const detailRes = await fetch(detailUrl);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const legs = detailData.routes?.[0]?.legs?.[0];
            if (legs && Array.isArray(legs.steps)) {
              const parsedSteps = legs.steps.map((st: any) => ({
                instruction: st.maneuver?.type ? `${st.maneuver.type} ${st.maneuver.modifier || ''}`.trim() : 'Proceed along road',
                name: st.name || '',
                distance: Math.round(st.distance || 0),
              }));
              setRouteSteps(parsedSteps);
              setIsTurnByTurnActive(true);
            }
          }
        } catch {
          setRouteSteps([
            { instruction: 'Head toward destination', name: inAppNavPlace.address || '', distance: Math.round(distKm * 1000) },
            { instruction: `Arrive at ${inAppNavPlace.name}`, name: '', distance: 0 },
          ]);
        }
      })
      .catch(() => {
        setIsLoadingRoute(false);
      });
  }, [inAppNavPlace, navMode, routeOriginLat, routeOriginLng]);

  // ── Selected Place Route ──────────────────────────────────────────────────
  useEffect(() => {
    if (inAppNavPlace) return; // In-app nav takes precedence
    if (selectedPlace) {
      drawSelectionRoute(selectedPlace);
      mapRef.current?.flyTo([selectedPlace.latitude, selectedPlace.longitude], 15, { duration: 0.8 });
    } else {
      clearSelectionRoute();
    }
  }, [selectedPlace?.id, inAppNavPlace]);

  // Quick filter handler
  const handleFilterClick = (type: 'all' | 'best' | 'closest' | 'rating' | 'cheapest' | 'openNow') => {
    setActiveFilter(type);
    onQuickFilter?.(type);
  };

  const handleExploreArea = () => {
    setShowSearchAreaBtn(false);
    if (currentCenterRef.current) {
      onExploreArea?.({
        latitude: currentCenterRef.current.lat,
        longitude: currentCenterRef.current.lng,
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden border border-surface-border shadow-2xl bg-[#0b0e14]">
      {/* Mapbox/Leaflet container */}
      <div ref={containerRef} className="w-full h-full min-h-[420px]" />

      {/* Floating Controls Overlay */}
      <div className="absolute inset-0 pointer-events-none z-[400] flex flex-col justify-between p-3 sm:p-4">
        {/* Top Controls: Quick Filter Chips */}
        <div className="flex items-center justify-between gap-2 pointer-events-auto flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/90 border border-slate-800 rounded-2xl backdrop-blur-xl shadow-2xl overflow-x-auto max-w-full">
            {(
              [
                { id: 'all', label: 'All Places' },
                { id: 'best', label: '🏆 Best Match' },
                { id: 'closest', label: '📍 Closest' },
                { id: 'rating', label: '⭐ 4.5+ Rating' },
                { id: 'cheapest', label: '💰 Budget' },
                { id: 'openNow', label: '🟢 Open Now' },
              ] as const
            ).map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFilterClick(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Quick GPS Recenter Button */}
          <button
            type="button"
            onClick={zoomToMyLocation}
            className="p-2.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 shadow-2xl backdrop-blur-xl transition-all cursor-pointer group"
            title="Recenter to my location"
          >
            <Compass className="w-4 h-4 group-hover:rotate-45 transition-transform" />
          </button>
        </div>

        {/* Turn-by-Turn Navigation Overlay Banner (When active) */}
        {inAppNavPlace && (
          <div className="pointer-events-auto bg-slate-950/95 border border-cyan-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl text-white flex items-center justify-between gap-3 animate-in fade-in duration-300 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-slate-950 font-black shrink-0 shadow-glow">
                <Navigation className="w-5 h-5 text-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm truncate text-white">{inAppNavPlace.name}</span>
                  {isLoadingRoute && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                  <span className="font-black text-cyan-300">{routeDurationMin ? `${routeDurationMin} min` : 'Calculating...'}</span>
                  <span>•</span>
                  <span>{routeDistanceKm ? `${routeDistanceKm} km away` : 'In app route'}</span>
                  <span>•</span>
                  <span className="capitalize">{navMode}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Travel mode toggles */}
              <div className="flex bg-surface-dark border border-surface-border rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setNavMode('driving')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${navMode === 'driving' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                  title="Driving Mode"
                >
                  <Car className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setNavMode('walking')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${navMode === 'walking' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                  title="Walking Mode"
                >
                  <Footprints className="w-3.5 h-3.5" />
                </button>
              </div>

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
                <span className="hidden sm:inline">My Spot</span>
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
                <span className="hidden sm:inline">Overview</span>
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
          <div className="pointer-events-auto absolute inset-x-3 bottom-16 z-[550] max-w-lg mx-auto bg-slate-950/98 backdrop-blur-2xl border border-surface-border rounded-2xl p-3 shadow-2xl text-white max-h-56 overflow-y-auto animate-in slide-in-from-bottom duration-200">
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
          <div className="pointer-events-auto absolute top-14 left-1/2 -translate-x-1/2 z-[500] animate-bounce">
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
          <div className="pointer-events-auto px-3 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-md text-[11px] text-slate-300 flex flex-wrap items-center gap-3 shadow-xl w-fit">
            {currentUserGps && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-white" />
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
