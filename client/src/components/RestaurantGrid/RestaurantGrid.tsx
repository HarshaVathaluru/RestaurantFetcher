import React, { useState } from 'react';
import { Sparkles, ArrowUpDown, Map, List, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { NormalizedPlace, SearchIntent } from '../../types';
import { RestaurantCard } from '../RestaurantCard/RestaurantCard';

interface RestaurantGridProps {
  places: NormalizedPlace[];
  allPlaces?: NormalizedPlace[];
  intent: SearchIntent | null;
  selectedPlace: NormalizedPlace | null;
  hoveredPlace: NormalizedPlace | null;
  savedPlaceIds: Set<string>;
  onSelectPlace: (place: NormalizedPlace) => void;
  onOpenDetails?: (place: NormalizedPlace) => void;
  onShowDirections?: (place: NormalizedPlace) => void;
  onHoverPlace: (place: NormalizedPlace | null) => void;
  onToggleSave: (place: NormalizedPlace) => void;
  onSortChange: (sort: 'relevance' | 'rating' | 'distance' | 'price') => void;
  viewMode: 'split' | 'list' | 'map';
  onViewModeChange: (mode: 'split' | 'list' | 'map') => void;
}

export const RestaurantGrid: React.FC<RestaurantGridProps> = ({
  places,
  allPlaces,
  intent,
  selectedPlace,
  hoveredPlace,
  savedPlaceIds,
  onSelectPlace,
  onOpenDetails,
  onShowDirections,
  onHoverPlace,
  onToggleSave,
  onSortChange,
  viewMode,
  onViewModeChange,
}) => {
  const [showOtherMatches, setShowOtherMatches] = useState(false);

  const isSingleResultMode = places.length === 1;
  const otherMatches = allPlaces ? allPlaces.filter(p => p.id !== places[0]?.id) : [];

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-card border border-surface-border">
        {/* Count & Intent Badges */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-extrabold text-white text-base">
              {isSingleResultMode ? '🏆 Your Best Matching Place' : `${places.length} Places Match Your Search`}
            </span>
            {intent && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Ranked by AI Relevance
              </span>
            )}
          </div>

          {/* Active Intent tags */}
          {intent && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {intent.foodItems?.map((f, i) => {
                const name = typeof f === 'string' ? f : f?.name;
                if (!name) return null;
                return (
                  <span key={`f-${i}`} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-bold border border-amber-500/25">
                    🍛 {name}
                  </span>
                );
              })}
              {Array.isArray(intent.cuisine) && intent.cuisine.map((c, i) => (
                <span key={`c-${i}`} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 capitalize">
                  {c}
                </span>
              ))}
              {intent.rating?.minimum ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-medium">
                  Rating ≥ {intent.rating.minimum}★
                </span>
              ) : null}
              {intent.budget?.maximum ? (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-medium">
                  Budget ≤ ₹{intent.budget.maximum}
                </span>
              ) : null}
              {intent.alcohol?.required && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-medium">
                  Drinks & Bar
                </span>
              )}
              {Array.isArray(intent.dietary) && intent.dietary.map((d, i) => (
                <span key={`d-${i}`} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 capitalize">
                  {typeof d === 'string' ? d : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Controls: Sort & Mobile View toggles */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* View Mode Toggle (Mobile / Tablet) */}
          <div className="flex lg:hidden items-center bg-surface-dark rounded-xl p-1 border border-surface-border">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold ${viewMode === 'list' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('map')}
              className={`p-1.5 rounded-lg text-xs font-semibold ${viewMode === 'map' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
              title="Map View"
            >
              <Map className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-surface-dark px-3 py-1.5 rounded-xl border border-surface-border text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={intent?.sort || 'relevance'}
              onChange={e => onSortChange(e.target.value as any)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="relevance" className="bg-slate-900 text-white">Best Match</option>
              <option value="rating" className="bg-slate-900 text-white">Highest Rating</option>
              <option value="distance" className="bg-slate-900 text-white">Nearest Distance</option>
              <option value="price" className="bg-slate-900 text-white">Price: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards List */}
      {places.length === 0 ? (
        <div className="p-12 rounded-3xl bg-surface-card border border-surface-border text-center">
          <p className="text-white font-bold text-lg mb-2">No matching restaurants found</p>
          <p className="text-slate-400 text-xs max-w-md mx-auto mb-4">
            Try loosening strict constraints (e.g. increasing budget limit or expanding radius) using the refinement bar below.
          </p>
        </div>
      ) : isSingleResultMode ? (
        /* SINGLE RESULT HERO CARD (Section 23 & 24) */
        <div className="space-y-4">
          <div className="p-2 sm:p-3 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2 px-2 text-xs font-black uppercase tracking-wider text-amber-400">
              <Award className="w-4 h-4" />
              <span>🏆 Best Match For Your Request</span>
            </div>
            <RestaurantCard
              place={places[0]}
              rankNumber={1}
              isSelected={selectedPlace?.id === places[0].id}
              isHovered={hoveredPlace?.id === places[0].id}
              isSaved={savedPlaceIds.has(places[0].id)}
              searchedFoodItems={intent?.foodItems}
              onSelect={onSelectPlace}
              onOpenDetails={onOpenDetails}
              onShowDirections={onShowDirections}
              onHover={onHoverPlace}
              onToggleSave={onToggleSave}
            />
          </div>

          {/* Section 24: Collapsible Other Options */}
          {otherMatches.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOtherMatches(!showOtherMatches)}
                className="w-full py-3 px-4 rounded-2xl bg-surface-card hover:bg-surface-hover border border-surface-border text-xs font-bold text-slate-300 hover:text-white flex items-center justify-between transition-all cursor-pointer shadow-sm"
              >
                <span>Show {otherMatches.length} Other Matching Options</span>
                {showOtherMatches ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showOtherMatches && (
                <div className="grid grid-cols-1 gap-4 mt-3 animate-fadeIn">
                  {otherMatches.map((place, idx) => (
                    <RestaurantCard
                      key={place.id}
                      place={place}
                      rankNumber={idx + 2}
                      isSelected={selectedPlace?.id === place.id}
                      isHovered={hoveredPlace?.id === place.id}
                      isSaved={savedPlaceIds.has(place.id)}
                      searchedFoodItems={intent?.foodItems}
                      onSelect={onSelectPlace}
                      onOpenDetails={onOpenDetails}
                      onShowDirections={onShowDirections}
                      onHover={onHoverPlace}
                      onToggleSave={onToggleSave}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* MULTI-RESULT GRID (Single column in 3-column desktop layout for ample breathing room) */
        <div className="grid grid-cols-1 gap-5">
          {places.map((place, idx) => (
            <RestaurantCard
              key={place.id}
              place={place}
              rankNumber={idx + 1}
              isSelected={selectedPlace?.id === place.id}
              isHovered={hoveredPlace?.id === place.id}
              isSaved={savedPlaceIds.has(place.id)}
              searchedFoodItems={intent?.foodItems}
              onSelect={onSelectPlace}
              onOpenDetails={onOpenDetails}
              onShowDirections={onShowDirections}
              onHover={onHoverPlace}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
};
