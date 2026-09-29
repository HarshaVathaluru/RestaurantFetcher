import React, { useState } from 'react';
import { Sparkles, UtensilsCrossed, Heart, History, MapPin, X } from 'lucide-react';
import { SearchHistoryItem } from '../../types';

interface NavbarProps {
  savedCount: number;
  onOpenSaved: () => void;
  searchHistory: SearchHistoryItem[];
  onSelectHistory: (query: string) => void;
  resolvedLocationName?: string;
  onOpenLocationModal?: () => void;
  onResetToHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  savedCount,
  onOpenSaved,
  searchHistory,
  onSelectHistory,
  resolvedLocationName,
  onOpenLocationModal,
  onResetToHome,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-surface-card/80 border-b border-surface-border backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo */}
        <div
          onClick={onResetToHome}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-glow group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors">
                Gourmet<span className="text-amber-400">AI</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block -mt-1">
              Natural Language Restaurant Discovery
            </p>
          </div>
        </div>

        {/* Center Location Pill - Clickable to open location picker */}
        <button
          type="button"
          onClick={onOpenLocationModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-dark hover:bg-slate-800 border border-surface-border hover:border-amber-400/50 text-xs text-slate-200 transition-all cursor-pointer shadow-sm group"
          title="Click to change your dining city or neighborhood"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="font-semibold truncate max-w-[160px] sm:max-w-[240px]">
            {resolvedLocationName || 'Choose Location'}
          </span>
          <span className="text-[10px] text-slate-400">▾</span>
        </button>

        {/* Right Actions: History & Saved */}
        <div className="flex items-center gap-2">
          {/* History Popover Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-surface-dark hover:bg-surface-hover text-slate-300 hover:text-white border border-surface-border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Recent Searches"
            >
              <History className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">History</span>
            </button>

            {showHistory && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-surface-card border border-surface-border rounded-2xl shadow-2xl p-4 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-surface-border mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-amber-400" /> Recent Inquiries
                  </span>
                  <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {searchHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No recent searches yet</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {searchHistory.slice(0, 8).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectHistory(item.query);
                          setShowHistory(false);
                        }}
                        className="w-full text-left p-2 rounded-xl bg-surface-dark hover:bg-surface-hover text-xs text-slate-300 hover:text-amber-300 transition-colors truncate block"
                      >
                        {item.query}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Saved Places Trigger */}
          <button
            type="button"
            onClick={onOpenSaved}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Saved places"
          >
            <Heart className="w-4 h-4 fill-current" />
            <span className="hidden sm:inline">Favorites</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
