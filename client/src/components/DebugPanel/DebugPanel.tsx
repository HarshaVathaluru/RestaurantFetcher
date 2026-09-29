import React, { useState } from 'react';
import { SearchResponse, CurrentUserLocation, SearchLocation } from '../../types';
import { Terminal, ChevronUp, ChevronDown, CheckCircle2, ShieldCheck, Database, MapPin, Hash, Sparkles } from 'lucide-react';

interface DebugPanelProps {
  searchResult: SearchResponse | null;
  activeQuery: string;
  searchLocation: SearchLocation;
  currentUserGps: CurrentUserLocation | null;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  searchResult,
  activeQuery,
  searchLocation,
  currentUserGps,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // If no debug payload exists yet, render compact standby pill
  const debug = searchResult?.debug;

  return (
    <aside aria-label="Development Telemetry" className="fixed bottom-3 right-3 z-40 max-w-md w-[calc(100vw-24px)] sm:w-96 text-xs font-mono select-text">
      {/* Toggle button */}
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-amber-400 font-sans text-[11px] font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>GourmetAI Telemetry</span>
          {debug && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
              {debug.validatedCount} places
            </span>
          )}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded telemetry console */}
      {isOpen && (
        <div className="p-4 rounded-2xl bg-[#080b11]/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl text-slate-300 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-sans">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Engine Telemetry</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Dev Mode
            </span>
          </div>

          {/* Active Query & Request ID */}
          <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Query:</span>
              <span className="font-bold text-amber-300 truncate max-w-[200px]">
                {activeQuery || 'None (Initial state)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Request ID:</span>
              <span className="text-slate-300 truncate max-w-[200px]">
                {searchResult?.requestId || debug?.requestId || 'N/A'}
              </span>
            </div>
          </div>

          {/* Location Architecture State */}
          <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400" /> Location Architecture
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Search Area:</span>
              <span className="text-cyan-300 font-bold truncate max-w-[180px]">
                {searchLocation.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">GPS Hardware:</span>
              {currentUserGps ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Live GPS Active ({currentUserGps.latitude.toFixed(4)}, {currentUserGps.longitude.toFixed(4)})
                </span>
              ) : (
                <span className="text-slate-400">Unavailable / Not Granted</span>
              )}
            </div>
          </div>

          {/* Pipeline Counts & Deduplication */}
          {debug ? (
            <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Pipeline Deduplication
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Raw Places</div>
                  <div className="font-extrabold text-white text-sm">{debug.rawCount}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Duplicates Purged</div>
                  <div className="font-extrabold text-amber-400 text-sm">{debug.duplicatesRemoved}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Invalid Coordinates</div>
                  <div className="font-extrabold text-rose-400 text-sm">{debug.invalidRemoved}</div>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Validated & Ranked</div>
                  <div className="font-extrabold text-emerald-400 text-sm">{debug.validatedCount}</div>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-amber-300 font-bold">
                <span>Exact Food Matches:</span>
                <span>{debug.exactFoodMatches}</span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-center text-[11px]">
              Perform a search to see the deduplication & validation telemetry.
            </div>
          )}

          {/* Parsed Intent Highlights */}
          {searchResult?.intent && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 text-[11px]">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Parsed Intent
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Food Items:</span>
                <span className="text-amber-300 font-bold">
                  {searchResult.intent.foodItems?.map(f => f.name).join(', ') || 'Any'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Budget:</span>
                <span className="text-white">
                  {searchResult.intent.budget?.maximum ? `₹${searchResult.intent.budget.maximum}` : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Min Rating:</span>
                <span className="text-white">
                  {searchResult.intent.rating?.minimum ? `${searchResult.intent.rating.minimum}★` : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Result Count:</span>
                <span className="text-white">
                  {searchResult.intent.resultCount || 'All (Default)'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
