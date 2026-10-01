import React, { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import {
  NormalizedPlace,
  SearchResponse,
  SearchIntent,
  SearchHistoryItem,
  CurrentUserLocation,
  SearchLocation,
} from './types';
import { Navbar } from './components/Navbar/Navbar';
import { SearchBox } from './components/SearchBox/SearchBox';
import { SearchAnimation } from './components/SearchAnimation/SearchAnimation';
import { RestaurantGrid } from './components/RestaurantGrid/RestaurantGrid';
import { MapView } from './components/MapView/MapView';
import { RestaurantDetailsModal } from './components/RestaurantDetails/RestaurantDetailsModal';
import { ConversationalRefinementBar } from './components/ConversationalRefinement/ConversationalRefinementBar';
import { SavedPlacesDrawer } from './components/SavedPlacesDrawer/SavedPlacesDrawer';
import { LocationModal } from './components/LocationModal/LocationModal';
import { Sparkles, Utensils, Compass, Flame, ShieldAlert, RotateCcw } from 'lucide-react';

export default function App() {
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [activeQuery, setActiveQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dual-Location Architecture:
  // A. currentUserGps: Genuine device GPS from navigator.geolocation ONLY (never guessed, never set to city centroid)
  const [currentUserGps, setCurrentUserGps] = useState<CurrentUserLocation | null>(null);

  // B. searchLocation: The target area user is searching in (dynamically detected from real-time GPS or user chosen)
  const [searchLocation, setSearchLocation] = useState<SearchLocation>({
    name: 'Current GPS Location',
    latitude: 17.385044,
    longitude: 78.486671,
    source: 'detected',
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Interactive sync states
  const [selectedMapPlace, setSelectedMapPlace] = useState<NormalizedPlace | null>(null);
  const [detailModalPlace, setDetailModalPlace] = useState<NormalizedPlace | null>(null);
  const [hoveredPlace, setHoveredPlace] = useState<NormalizedPlace | null>(null);

  // Saved / Favorites
  const [savedPlaces, setSavedPlaces] = useState<NormalizedPlace[]>([]);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);

  // Search History
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Mobile view mode toggle
  const [mobileViewMode, setMobileViewMode] = useState<'split' | 'list' | 'map'>('split');

  // Active in-app directions target place
  const [activeDirectionsPlace, setActiveDirectionsPlace] = useState<NormalizedPlace | null>(null);

  // Request deduplication ref
  const latestRequestIdRef = useRef<string>('');

  // Load saved places & history on mount, plus attempt non-blocking GPS detection
  useEffect(() => {
    api.getSavedPlaces().then(places => setSavedPlaces(places)).catch(() => {});
    api.getSearchHistory().then(hist => setSearchHistory(hist)).catch(() => {});

    // Live real-time device location detection & continuous movement tracking
    if ('geolocation' in navigator) {
      let isInitialGeocodeDone = false;

      const handlePositionUpdate = async (pos: GeolocationPosition) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCurrentUserGps({
          latitude: lat,
          longitude: lon,
          accuracy: pos.coords.accuracy,
          source: 'gps',
        });

        // Immediately update search coordinates to user's real GPS position
        setSearchLocation(prev => ({
          name: prev.source === 'user-selected' ? prev.name : 'Current GPS Location',
          latitude: prev.source === 'user-selected' ? prev.latitude : lat,
          longitude: prev.source === 'user-selected' ? prev.longitude : lon,
          source: prev.source,
        }));

        // Reverse geocode once for default search area
        if (!isInitialGeocodeDone) {
          isInitialGeocodeDone = true;
          try {
            const loc = await api.reverseGeocode(lat, lon);
            if (loc?.displayName) {
              setSearchLocation(prev => ({
                name: prev.source === 'user-selected' ? prev.name : loc.displayName,
                latitude: prev.source === 'user-selected' ? prev.latitude : lat,
                longitude: prev.source === 'user-selected' ? prev.longitude : lon,
                source: prev.source,
              }));
            }
          } catch (err) {
            console.warn('Real-time location reverse geocode failed:', err);
          }
        }
      };

      navigator.geolocation.getCurrentPosition(
        handlePositionUpdate,
        async (err) => {
          console.warn('Browser GPS denied or unavailable, auto-detecting via network IP:', err);
          try {
            const netLoc = await api.detectLocationByIP();
            if (netLoc) {
              setCurrentUserGps({
                latitude: netLoc.latitude,
                longitude: netLoc.longitude,
                source: 'gps',
              });
              setSearchLocation(prev => ({
                name: prev.source === 'user-selected' ? prev.name : netLoc.displayName,
                latitude: prev.source === 'user-selected' ? prev.latitude : netLoc.latitude,
                longitude: prev.source === 'user-selected' ? prev.longitude : netLoc.longitude,
                source: prev.source,
              }));
            }
          } catch (e) {
            console.warn('Network location detection failed:', e);
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      // Continuous movement watcher: updates position as user moves
      const watchId = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        err => console.warn('GPS continuous tracking error:', err),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, []);

  // Trigger in-app turn-by-turn navigation directly on the map (no external tab jumping)
  const handleShowDirections = (place: NormalizedPlace) => {
    setSelectedMapPlace(place);
    setActiveDirectionsPlace({ ...place });
    setMobileViewMode('map');
    const mapEl = document.getElementById('interactive-map-section');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // When user selects a location from LocationModal:
  // Updates searchLocation ONLY. Never overwrites genuine currentUserGps.
  const handleSelectLocation = (name: string, coords: { latitude: number; longitude: number }) => {
    setSearchLocation({
      name,
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: 'user-selected',
    });
    if (activeQuery) {
      handleSearch(activeQuery, coords, name);
    }
  };

  // Request browser geolocation on explicit button click
  const handleRequestCoords = async (): Promise<{ latitude: number; longitude: number; displayName?: string } | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setCurrentUserGps({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            source: 'gps',
          });
          let displayName = 'Current GPS Location';
          try {
            const loc = await api.reverseGeocode(coords.latitude, coords.longitude);
            if (loc?.displayName) {
              displayName = loc.displayName;
            }
          } catch {}
          setSearchLocation({
            name: displayName,
            latitude: coords.latitude,
            longitude: coords.longitude,
            source: 'detected',
          });
          resolve({ ...coords, displayName });
        },
        async (err) => {
          console.warn('Browser GPS prompt error, falling back to IP geolocation:', err);
          try {
            const netLoc = await api.detectLocationByIP();
            if (netLoc) {
              setCurrentUserGps({
                latitude: netLoc.latitude,
                longitude: netLoc.longitude,
                source: 'gps',
              });
              setSearchLocation({
                name: netLoc.displayName,
                latitude: netLoc.latitude,
                longitude: netLoc.longitude,
                source: 'detected',
              });
              resolve({
                latitude: netLoc.latitude,
                longitude: netLoc.longitude,
                displayName: netLoc.displayName,
              });
              return;
            }
          } catch {}
          resolve(null);
        },
        { timeout: 7000 }
      );
    });
  };

  // Perform full search with request ID deduplication
  const handleSearch = async (
    query: string,
    coordsOverride?: { latitude: number; longitude: number },
    locationNameOverride?: string
  ) => {
    setIsLoading(true);
    setError(null);
    setActiveQuery(query);

    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    latestRequestIdRef.current = reqId;

    try {
      const coordsToSend = coordsOverride || (
        (currentUserGps && searchLocation.source !== 'user-selected')
          ? { latitude: currentUserGps.latitude, longitude: currentUserGps.longitude }
          : { latitude: searchLocation.latitude, longitude: searchLocation.longitude }
      );
      const locationNameToSend = locationNameOverride || searchLocation.name;

      const response = await api.search(query, coordsToSend, locationNameToSend, reqId);

      // Stale response guard
      if (latestRequestIdRef.current !== reqId) {
        return;
      }

      setSearchResult(response);

      // Only update searchLocation if the user explicitly searched for a destination city in their query (e.g. "Tirupati" or "Bangalore")
      // Do NOT replace the user's selected/current location on ordinary item searches (e.g. "mysore bonda near me")
      const isExplicitDestinationQuery = Boolean(
        response.intent?.location?.query &&
        !/^(near me|nearby|around here|close by|closest|my location|current location|here)$/i.test(response.intent.location.query.trim()) &&
        (response.intent.location.type === 'city' || response.intent.location.type === 'destination')
      );

      if (isExplicitDestinationQuery && response.resolvedLocation?.displayName) {
        setSearchLocation({
          name: response.resolvedLocation.displayName,
          latitude: response.resolvedLocation.latitude,
          longitude: response.resolvedLocation.longitude,
          source: 'detected',
        });
      }

      // Refresh history
      api.getSearchHistory().then(hist => setSearchHistory(hist)).catch(() => {});
    } catch (err: any) {
      if (latestRequestIdRef.current === reqId) {
        setError(err.message || 'Failed to search places');
      }
    } finally {
      if (latestRequestIdRef.current === reqId) {
        setIsLoading(false);
      }
    }
  };

  // Conversational Refinement with request ID deduplication
  const handleRefine = async (refinementText: string) => {
    if (!searchResult) return;
    setIsLoading(true);
    setError(null);

    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    latestRequestIdRef.current = reqId;

    try {
      const coordsToSend = {
        latitude: searchLocation.latitude,
        longitude: searchLocation.longitude,
      };

      const response = await api.refine(
        searchResult.intent,
        refinementText,
        coordsToSend,
        searchLocation.name,
        reqId
      );

      // Stale response guard
      if (latestRequestIdRef.current !== reqId) {
        return;
      }

      setSearchResult(response);
      setActiveQuery(prev => `${prev} -> ${refinementText}`);

      const isExplicitDestinationQuery = Boolean(
        response.intent?.location?.query &&
        !/^(near me|nearby|around here|close by|closest|my location|current location|here)$/i.test(response.intent.location.query.trim()) &&
        (response.intent.location.type === 'city' || response.intent.location.type === 'destination')
      );

      if (isExplicitDestinationQuery && response.resolvedLocation?.displayName) {
        setSearchLocation({
          name: response.resolvedLocation.displayName,
          latitude: response.resolvedLocation.latitude,
          longitude: response.resolvedLocation.longitude,
          source: 'detected',
        });
      }
    } catch (err: any) {
      if (latestRequestIdRef.current === reqId) {
        setError(err.message || 'Failed to refine search');
      }
    } finally {
      if (latestRequestIdRef.current === reqId) {
        setIsLoading(false);
      }
    }
  };

  // Toggle Save / Bookmark
  const handleToggleSave = async (place: NormalizedPlace) => {
    const isSaved = savedPlaces.some(p => p.id === place.id);
    if (isSaved) {
      setSavedPlaces(prev => prev.filter(p => p.id !== place.id));
      await api.removeSavedPlace(place.id);
    } else {
      setSavedPlaces(prev => [...prev, place]);
      await api.savePlace(place);
    }
  };

  // Saved place IDs set for fast O(1) checks
  const savedPlaceIds = new Set(savedPlaces.map(p => p.id));

  // Reset to initial home
  const handleResetToHome = () => {
    setSearchResult(null);
    setActiveQuery('');
    setError(null);
    setSelectedMapPlace(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-slate-100 antialiased selection:bg-amber-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        savedCount={savedPlaces.length}
        onOpenSaved={() => setIsSavedDrawerOpen(true)}
        searchHistory={searchHistory}
        onSelectHistory={q => handleSearch(q)}
        resolvedLocationName={searchLocation.name}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onResetToHome={handleResetToHome}
      />

      {/* Main Content Area */}
      <main
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedMapPlace(null);
          }
        }}
        className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 pb-28"
      >
        {/* Error notification banner if any */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. INITIAL LANDING SEARCH HEADER */}
        <section className={`transition-all duration-500 ${searchResult ? 'mb-8' : 'my-12 sm:my-16'}`}>
          <SearchBox
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </section>

        {/* 2. ANIMATED SEARCH PROGRESS */}
        {isLoading && (
          <SearchAnimation query={activeQuery} />
        )}

        {/* 3. SEARCH RESULTS PRESENTATION */}
        {!isLoading && searchResult && (
          <div className="space-y-6">
            {(() => {
              const displayPlaces = searchResult.intent.resultCount
                ? searchResult.places.slice(0, searchResult.intent.resultCount)
                : searchResult.places;
              return (
                <>
                  {/* SEARCH SUMMARY */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-surface-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Search & Refinements</div>
                      <button
                        type="button"
                        onClick={() => handleRefine('Reset all filters')}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Filters</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm font-semibold text-white">
                      {searchResult.intent.foodItems?.map((f, idx) => {
                        const fName = typeof f === 'string' ? f : f?.name;
                        if (!fName) return null;
                        return (
                          <span key={`f-${idx}-${fName}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-amber-500/30 text-amber-300 shadow-sm">
                            <span>🍛</span> {fName}
                            <button type="button" onClick={() => handleRefine(`Remove ${fName}`)} className="text-slate-500 hover:text-amber-400 ml-1 text-base cursor-pointer">×</button>
                          </span>
                        );
                      })}
                      {searchResult.resolvedLocation?.displayName && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-surface-border">
                          <span>📍</span> {searchResult.resolvedLocation.displayName}
                          <button type="button" onClick={() => handleRefine(`Remove location`)} className="text-slate-500 hover:text-amber-400 ml-1 text-base cursor-pointer">×</button>
                        </span>
                      )}
                      {searchResult.intent.rating?.minimum ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-amber-500/30 text-amber-300 shadow-sm">
                          <span>⭐</span> {searchResult.intent.rating.minimum}+
                          <button type="button" onClick={() => handleRefine(`Remove rating limit`)} className="text-slate-500 hover:text-amber-400 ml-1 text-base cursor-pointer">×</button>
                        </span>
                      ) : null}
                      {searchResult.intent.budget?.maximum ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-amber-500/30 text-amber-300 shadow-sm">
                          <span>💰</span> Under ₹{searchResult.intent.budget.maximum}
                          <button type="button" onClick={() => handleRefine(`Remove budget limit`)} className="text-slate-500 hover:text-amber-400 ml-1 text-base cursor-pointer">×</button>
                        </span>
                      ) : null}
                      {Array.isArray(searchResult.intent.dietary) && searchResult.intent.dietary.map((d, idx) => {
                        if (typeof d !== 'string') return null;
                        return (
                          <span key={`d-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-emerald-500/30 text-emerald-300 shadow-sm">
                            <span>🥗</span> {d.charAt(0).toUpperCase() + d.slice(1)}
                            <button type="button" onClick={() => handleRefine(`Remove ${d}`)} className="text-slate-500 hover:text-emerald-400 ml-1 text-base cursor-pointer">×</button>
                          </span>
                        );
                      })}
                      {Array.isArray(searchResult.intent.atmosphere) && searchResult.intent.atmosphere.map((a, idx) => {
                        if (typeof a !== 'string') return null;
                        return (
                          <span key={`a-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-purple-500/30 text-purple-300 shadow-sm">
                            <span>✨</span> {a.charAt(0).toUpperCase() + a.slice(1)}
                            <button type="button" onClick={() => handleRefine(`Remove ${a}`)} className="text-slate-500 hover:text-purple-400 ml-1 text-base cursor-pointer">×</button>
                          </span>
                        );
                      })}
                      {Array.isArray(searchResult.intent.features) && searchResult.intent.features.map((f, idx) => {
                        if (typeof f !== 'string') return null;
                        return (
                          <span key={`feat-${idx}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-cyan-500/30 text-cyan-300 shadow-sm">
                            <span>🌿</span> {f.charAt(0).toUpperCase() + f.slice(1)}
                            <button type="button" onClick={() => handleRefine(`Remove ${f}`)} className="text-slate-500 hover:text-cyan-400 ml-1 text-base cursor-pointer">×</button>
                          </span>
                        );
                      })}
                      {searchResult.intent.alcohol?.cocktails && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-rose-500/30 text-rose-300 shadow-sm">
                          <span>🍸</span> Cocktails
                          <button type="button" onClick={() => handleRefine(`Remove cocktail`)} className="text-slate-500 hover:text-rose-400 ml-1 text-base cursor-pointer">×</button>
                        </span>
                      )}
                      {searchResult.intent.alcohol?.beer && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-amber-500/30 text-amber-300 shadow-sm">
                          <span>🍺</span> Craft Beer
                          <button type="button" onClick={() => handleRefine(`Remove beer`)} className="text-slate-500 hover:text-amber-400 ml-1 text-base cursor-pointer">×</button>
                        </span>
                      )}
                      {searchResult.intent.alcohol?.wine && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-rose-500/30 text-rose-300 shadow-sm">
                          <span>🍷</span> Wine
                          <button type="button" onClick={() => handleRefine(`Remove wine`)} className="text-slate-500 hover:text-rose-400 ml-1 text-base cursor-pointer">×</button>
                        </span>
                      )}
                      {searchResult.intent.openNow && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-green-500/30 text-green-300 shadow-sm">
                          <span>🟢</span> Open Now
                          <button type="button" onClick={() => handleRefine(`Remove open now`)} className="text-slate-500 hover:text-green-400 ml-1 text-base cursor-pointer">×</button>
                        </span>
                      )}
                      {searchResult.intent.location?.radius && searchResult.intent.location.radius <= 10000 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-cyan-500/30 text-cyan-300 shadow-sm">
                          <span>📏</span> Within {(searchResult.intent.location.radius / 1000).toFixed(0)} km
                          <button type="button" onClick={() => handleRefine('Remove radius')} className="text-slate-500 hover:text-cyan-400 ml-1 text-base cursor-pointer">×</button>
                        </span>
                      )}
                      {searchResult.intent.resultCount && searchResult.intent.resultCount < 10 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-amber-500/30 text-amber-300 shadow-sm">
                          <span>🏆</span> {searchResult.intent.resultCount === 1 ? 'Best 1 Only' : `Top ${searchResult.intent.resultCount} Only`}
                          <button type="button" onClick={() => handleRefine(`Show all`)} className="text-slate-500 hover:text-amber-400 ml-1 text-base cursor-pointer">×</button>
                        </span>
                      )}
                    </div>
                    <div className="mt-4 text-base font-bold text-amber-400">
                      → {displayPlaces.length} {displayPlaces.length === 1 ? 'Best Match Found' : 'Best Matches Found'}
                    </div>
                  </div>

                  <div
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        setSelectedMapPlace(null);
                      }
                    }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
                  >
                    {/* Left / Main Column: Restaurant List */}
                    <section
                      className={`lg:col-span-7 xl:col-span-7 ${
                        mobileViewMode === 'map' ? 'hidden lg:block' : 'block'
                      }`}
                    >
                      <RestaurantGrid
                        places={displayPlaces}
                        allPlaces={searchResult.places}
                        intent={searchResult.intent}
                        selectedPlace={selectedMapPlace}
                        hoveredPlace={hoveredPlace}
                        savedPlaceIds={savedPlaceIds}
                        onSelectPlace={setSelectedMapPlace}
                        onOpenDetails={setDetailModalPlace}
                        onShowDirections={handleShowDirections}
                        onHoverPlace={setHoveredPlace}
                        onToggleSave={handleToggleSave}
                        onSortChange={sort => {
                          setSearchResult(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              intent: { ...prev.intent, sort },
                            };
                          });
                        }}
                        viewMode={mobileViewMode}
                        onViewModeChange={setMobileViewMode}
                      />
                    </section>

                    {/* Right Column: Synchronized Interactive Map */}
                    <aside
                      id="interactive-map-section"
                      className={`lg:col-span-5 xl:col-span-5 sticky top-20 ${
                        mobileViewMode === 'list' ? 'hidden lg:block' : 'block'
                      }`}
                    >
                      <MapView
                        places={displayPlaces}
                        selectedPlace={selectedMapPlace}
                        hoveredPlace={hoveredPlace}
                        onSelectPlace={setSelectedMapPlace}
                        onDeselectPlace={() => setSelectedMapPlace(null)}
                        searchLocation={searchLocation}
                        currentUserGps={currentUserGps}
                        activeRoutePlace={activeDirectionsPlace}
                        onCloseRoute={() => setActiveDirectionsPlace(null)}
                        onQuickFilter={(type) => {
                          if (type === 'closest') {
                            handleRefine('Nearest distance');
                          } else if (type === 'rating') {
                            handleRefine('Highest rating');
                          } else if (type === 'cheapest') {
                            handleRefine('Under ₹500');
                          } else if (type === 'openNow') {
                            handleRefine('Open now');
                          } else {
                            handleRefine('Best match');
                          }
                        }}
                        onExploreArea={(coords) => {
                          handleSearch(activeQuery || 'best restaurants here', coords);
                        }}
                      />
                    </aside>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* 4. HERO SHOWCASE (When no search has been performed yet) */}
        {!isLoading && !searchResult && (
          <section className="mt-8 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
              <div className="p-6 rounded-3xl bg-surface-card border border-surface-border text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white mb-1.5">No Filter Friction</h3>
                <p className="text-xs text-slate-400">
                  Express taste, spicy cravings, budget thresholds, and rooftop vibes in one natural sentence.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-surface-card border border-surface-border text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center mb-4">
                  <Flame className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white mb-1.5">Transparent Evidence</h3>
                <p className="text-xs text-slate-400">
                  Every match gives you real verifiable reasons: ratings, confirmed dishes, distance, and verified alcohol menus.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-surface-card border border-surface-border text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center mb-4">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white mb-1.5">Conversational Context</h3>
                <p className="text-xs text-slate-400">
                  Say “only under ₹1000” or “make it outdoor seating” without starting over from scratch.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 5. CONVERSATIONAL REFINEMENT DOCKED BAR */}
      {searchResult && (
        <ConversationalRefinementBar
          currentIntent={searchResult.intent}
          onRefine={handleRefine}
          isLoading={isLoading}
          resultCount={
            searchResult.intent.resultCount
              ? searchResult.places.slice(0, searchResult.intent.resultCount).length
              : searchResult.places.length
          }
        />
      )}

      {/* 6. RESTAURANT DETAILS MODAL */}
      <RestaurantDetailsModal
        place={detailModalPlace}
        onClose={() => setDetailModalPlace(null)}
        isSaved={detailModalPlace ? savedPlaceIds.has(detailModalPlace.id) : false}
        onToggleSave={handleToggleSave}
        searchedFoodItems={searchResult?.intent.foodItems}
        onShowDirections={handleShowDirections}
      />

      {/* 7. SAVED PLACES DRAWER */}
      <SavedPlacesDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        savedPlaces={savedPlaces}
        onSelectPlace={(place) => {
          setSelectedMapPlace(place);
          setDetailModalPlace(place);
        }}
        onRemovePlace={id => {
          setSavedPlaces(prev => prev.filter(p => p.id !== id));
          api.removeSavedPlace(id);
        }}
      />

      {/* 8. DINING LOCATION SELECTOR MODAL */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocationName={searchLocation.name}
        onSelectLocation={handleSelectLocation}
        onRequestGPS={handleRequestCoords}
      />
    </div>
  );
}
