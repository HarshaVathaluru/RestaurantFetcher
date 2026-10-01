import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, X, Check, Compass, Loader2, Globe, Building2 } from 'lucide-react';
import { api } from '../../services/api';

export interface LocationOption {
  name: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
}

export const POPULAR_LOCATIONS: LocationOption[] = [
  // Hyderabad
  { name: 'Hyderabad (Central)', area: 'Telangana', city: 'Hyderabad', latitude: 17.385044, longitude: 78.486671 },
  { name: 'Jubilee Hills', area: 'Hyderabad, Telangana', city: 'Hyderabad', latitude: 17.4319, longitude: 78.4073 },
  { name: 'Banjara Hills', area: 'Hyderabad, Telangana', city: 'Hyderabad', latitude: 17.4156, longitude: 78.4350 },
  { name: 'Gachibowli', area: 'Hyderabad, Telangana', city: 'Hyderabad', latitude: 17.4401, longitude: 78.3489 },
  { name: 'HITEC City & Madhapur', area: 'Hyderabad, Telangana', city: 'Hyderabad', latitude: 17.4435, longitude: 78.3772 },
  { name: 'Charminar (Old City)', area: 'Hyderabad, Telangana', city: 'Hyderabad', latitude: 17.361563, longitude: 78.474665 },
  { name: 'Kondapur', area: 'Hyderabad, Telangana', city: 'Hyderabad', latitude: 17.4699, longitude: 78.3578 },
  { name: 'Secunderabad', area: 'Hyderabad, Telangana', city: 'Hyderabad', latitude: 17.4399, longitude: 78.4983 },

  // Tirupati & Andhra Pradesh
  { name: 'Tirupati (Central)', area: 'Andhra Pradesh', city: 'Tirupati', latitude: 13.6288, longitude: 79.4192 },
  { name: 'TP Area & Railway Station', area: 'Tirupati, Andhra Pradesh', city: 'Tirupati', latitude: 13.6272, longitude: 79.4215 },
  { name: 'Tiruchanoor Road', area: 'Tirupati, Andhra Pradesh', city: 'Tirupati', latitude: 13.6247, longitude: 79.4278 },
  { name: 'Alipiri & Kapila Theertham', area: 'Tirupati, Andhra Pradesh', city: 'Tirupati', latitude: 13.6508, longitude: 79.4180 },
  { name: 'Leela Mahal Circle', area: 'Tirupati, Andhra Pradesh', city: 'Tirupati', latitude: 13.6360, longitude: 79.4245 },
  { name: 'Tirumala', area: 'Tirupati, Andhra Pradesh', city: 'Tirupati', latitude: 13.6833, longitude: 79.3500 },

  // Bengaluru
  { name: 'Bengaluru (Central)', area: 'Karnataka', city: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Indiranagar', area: 'Bengaluru, Karnataka', city: 'Bengaluru', latitude: 12.9784, longitude: 77.6408 },
  { name: 'Koramangala', area: 'Bengaluru, Karnataka', city: 'Bengaluru', latitude: 12.9352, longitude: 77.6245 },
  { name: 'Church Street & MG Road', area: 'Bengaluru, Karnataka', city: 'Bengaluru', latitude: 12.9749, longitude: 77.6053 },
  { name: 'Whitefield', area: 'Bengaluru, Karnataka', city: 'Bengaluru', latitude: 12.9698, longitude: 77.7500 },
  { name: 'HSR Layout', area: 'Bengaluru, Karnataka', city: 'Bengaluru', latitude: 12.9121, longitude: 77.6446 },
  { name: 'JP Nagar', area: 'Bengaluru, Karnataka', city: 'Bengaluru', latitude: 12.9063, longitude: 77.5857 },

  // Mumbai
  { name: 'Mumbai (Central)', area: 'Maharashtra', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Bandra West', area: 'Mumbai, Maharashtra', city: 'Mumbai', latitude: 19.0596, longitude: 72.8295 },
  { name: 'Juhu', area: 'Mumbai, Maharashtra', city: 'Mumbai', latitude: 19.1075, longitude: 72.8263 },
  { name: 'Colaba & Fort', area: 'Mumbai, Maharashtra', city: 'Mumbai', latitude: 18.9067, longitude: 72.8147 },
  { name: 'Lower Parel', area: 'Mumbai, Maharashtra', city: 'Mumbai', latitude: 18.9953, longitude: 72.8306 },
  { name: 'Powai', area: 'Mumbai, Maharashtra', city: 'Mumbai', latitude: 19.1176, longitude: 72.9060 },
  { name: 'Bandra Kurla Complex (BKC)', area: 'Mumbai, Maharashtra', city: 'Mumbai', latitude: 19.0662, longitude: 72.8661 },

  // Delhi / NCR
  { name: 'Delhi (Connaught Place)', area: 'New Delhi', city: 'Delhi', latitude: 28.6315, longitude: 77.2167 },
  { name: 'Hauz Khas Village', area: 'New Delhi', city: 'Delhi', latitude: 28.5494, longitude: 77.2001 },
  { name: 'Khan Market', area: 'New Delhi', city: 'Delhi', latitude: 28.6003, longitude: 77.2272 },
  { name: 'Cyber Hub, Gurugram', area: 'Haryana', city: 'Delhi', latitude: 28.4950, longitude: 77.0895 },
  { name: 'Noida Sector 18', area: 'Uttar Pradesh', city: 'Delhi', latitude: 28.5708, longitude: 77.3261 },

  // Goa
  { name: 'Panaji', area: 'North Goa', city: 'Goa', latitude: 15.4909, longitude: 73.8278 },
  { name: 'Anjuna & Vagator', area: 'North Goa', city: 'Goa', latitude: 15.5866, longitude: 73.7437 },
  { name: 'Candolim & Calangute', area: 'North Goa', city: 'Goa', latitude: 15.5186, longitude: 73.7634 },
  { name: 'Assagao', area: 'North Goa', city: 'Goa', latitude: 15.5911, longitude: 73.7789 },

  // Other Top Indian Hubs
  { name: 'Chennai (Nungambakkam & T. Nagar)', area: 'Tamil Nadu', city: 'Chennai', latitude: 13.0569, longitude: 80.2425 },
  { name: 'Pune (Koregaon Park & Baner)', area: 'Maharashtra', city: 'Pune', latitude: 18.5362, longitude: 73.8940 },
  { name: 'Kolkata (Park Street)', area: 'West Bengal', city: 'Kolkata', latitude: 22.5518, longitude: 88.3524 },
  { name: 'Jaipur (C-Scheme)', area: 'Rajasthan', city: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
  { name: 'Ahmedabad (SG Highway)', area: 'Gujarat', city: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714 },
  { name: 'Chandigarh (Sector 26 & 35)', area: 'Punjab/Haryana', city: 'Chandigarh', latitude: 30.7333, longitude: 76.7794 },
  { name: 'Kochi (Fort Kochi)', area: 'Kerala', city: 'Kochi', latitude: 9.9312, longitude: 76.2673 },
  { name: 'Lucknow (Hazratganj)', area: 'Uttar Pradesh', city: 'Lucknow', latitude: 26.8467, longitude: 80.9462 },

  // International Dining Capitals
  { name: 'Dubai (Downtown & Marina)', area: 'United Arab Emirates', city: 'Global', latitude: 25.2048, longitude: 55.2708 },
  { name: 'London (Soho & Covent Garden)', area: 'United Kingdom', city: 'Global', latitude: 51.5074, longitude: -0.1278 },
  { name: 'New York (Manhattan)', area: 'NY, USA', city: 'Global', latitude: 40.7128, longitude: -74.0060 },
  { name: 'Singapore (Marina Bay)', area: 'Singapore', city: 'Global', latitude: 1.3521, longitude: 103.8198 },
  { name: 'Tokyo (Shibuya & Shinjuku)', area: 'Japan', city: 'Global', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Paris (Le Marais)', area: 'France', city: 'Global', latitude: 48.8566, longitude: 2.3522 },
];

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocationName: string;
  onSelectLocation: (name: string, coords: { latitude: number; longitude: number }) => void;
  onRequestGPS: () => Promise<{ latitude: number; longitude: number; displayName?: string } | null>;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentLocationName,
  onSelectLocation,
  onRequestGPS,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCityTab, setActiveCityTab] = useState<'All' | 'Hyderabad' | 'Tirupati' | 'Bengaluru' | 'Mumbai' | 'Delhi' | 'Goa' | 'Global'>('All');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSuggestions, setOnlineSuggestions] = useState<Array<{ name: string; area: string; latitude: number; longitude: number }>>([]);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live autosuggest via OpenStreetMap Nominatim for any location in the world
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setOnlineSuggestions([]);
      setIsSearchingOnline(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchTerm)}&format=json&addressdetails=1&limit=5`,
          { headers: { 'User-Agent': 'GourmetAI-App/2.0' } }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const formatted = data.map((item: any) => {
              const nameParts = item.display_name.split(',');
              const primary = nameParts[0]?.trim() || item.name || searchTerm;
              const secondary = nameParts.slice(1, 3).map((s: string) => s.trim()).join(', ');
              return {
                name: primary,
                area: secondary || item.type,
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lon),
              };
            });
            setOnlineSuggestions(formatted);
          }
        }
      } catch (err) {
        console.warn('Live geocode suggestion error:', err);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm]);

  if (!isOpen) return null;

  const handleGPS = async () => {
    setIsDetecting(true);
    setGpsError(null);
    try {
      const coords = await onRequestGPS();
      if (coords) {
        onSelectLocation(coords.displayName || 'Current GPS Location', coords);
        onClose();
        setIsDetecting(false);
        return;
      }
    } catch {
      // Browser GPS denied or unavailable
    }

    // Automatic network IP geolocation fallback
    try {
      const netLoc = await api.detectLocationByIP();
      if (netLoc && netLoc.latitude && netLoc.longitude) {
        onSelectLocation(netLoc.displayName, { latitude: netLoc.latitude, longitude: netLoc.longitude });
        onClose();
        setIsDetecting(false);
        return;
      }
    } catch {}

    setGpsError('GPS location access denied in browser. Click the lock 🔒 icon in your browser address bar to allow location.');
    setIsDetecting(false);
  };

  const handleSelect = (name: string, area: string, coords: { latitude: number; longitude: number }) => {
    const formatted = area ? `${name}, ${area}` : name;
    onSelectLocation(formatted, coords);
    onClose();
  };

  // Filter curated database by city and search term
  const filteredCurated = POPULAR_LOCATIONS.filter(loc => {
    const matchesCity = activeCityTab === 'All' || loc.city === activeCityTab;
    const matchesTerm = !searchTerm.trim() ||
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCity && matchesTerm;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-surface-card border border-surface-border rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-6 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shadow-sm">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Select Any Dining Location</h3>
              <p className="text-[11px] text-slate-400">Discover authentic restaurants in your chosen city or neighborhood</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-surface-dark hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GPS Live Detection */}
        <div className="shrink-0 mb-3">
          <button
            type="button"
            onClick={handleGPS}
            disabled={isDetecting}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-blue-600/20 hover:from-blue-600/30 hover:to-cyan-500/30 border border-blue-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {isDetecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Acquiring Exact GPS Coordinates...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>🎯 Use My Current Live Location</span>
              </>
            )}
          </button>

          {gpsError && (
            <div className="mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {gpsError}
            </div>
          )}
        </div>

        {/* Live Search Input with Instant Autosuggest */}
        <div className="relative mb-3 shrink-0">
          <div className="flex items-center bg-surface-dark border border-surface-border rounded-2xl px-3.5 py-2.5 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/30 transition-all">
            <Search className="w-4 h-4 text-amber-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search any neighborhood, area or city (e.g. Indiranagar, Bandra, Goa)"
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            {isSearchingOnline && <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0 ml-2" />}
            {searchTerm && !isSearchingOnline && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-400 hover:text-white ml-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* City Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 shrink-0 scrollbar-none">
          {(['All', 'Hyderabad', 'Tirupati', 'Bengaluru', 'Mumbai', 'Delhi', 'Goa', 'Global'] as const).map(city => (
            <button
              key={city}
              type="button"
              onClick={() => setActiveCityTab(city)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeCityTab === city
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'bg-surface-dark text-slate-400 hover:text-white border border-surface-border'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Scrollable Locations Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none">
          {/* Live Online Suggestions (if user typed something not matching curated) */}
          {onlineSuggestions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-black text-cyan-400 tracking-wider mb-1.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-cyan-400" /> Live Search Suggestions
              </div>
              <div className="space-y-1.5">
                {onlineSuggestions.map((loc, idx) => (
                  <button
                    key={`online-${idx}`}
                    type="button"
                    onClick={() => handleSelect(loc.name, loc.area, { latitude: loc.latitude, longitude: loc.longitude })}
                    className="w-full p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 hover:bg-cyan-900/30 flex items-center justify-between text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-extrabold text-xs text-white">{loc.name}</div>
                        <div className="text-[10px] text-cyan-300/70 line-clamp-1">{loc.area}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Curated Popular Dining Districts */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" /> Prominent Dining Hotspots ({filteredCurated.length})
            </div>

            {filteredCurated.length === 0 && onlineSuggestions.length === 0 && !isSearchingOnline && (
              <div className="p-6 text-center text-slate-500 text-xs">
                No matching hotspots found. Try searching by city name above.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredCurated.map(loc => {
                const isSelected = currentLocationName.toLowerCase().includes(loc.name.toLowerCase());
                return (
                  <button
                    key={`${loc.city}-${loc.name}`}
                    type="button"
                    onClick={() => handleSelect(loc.name, loc.area, { latitude: loc.latitude, longitude: loc.longitude })}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-400/30'
                        : 'bg-surface-dark hover:bg-slate-800/80 border-surface-border text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{loc.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{loc.area}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
