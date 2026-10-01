import React, { useState } from 'react';
import { MessageSquarePlus, Sparkles, Send, Loader2, ChevronUp, ChevronDown, Check, X, RotateCcw } from 'lucide-react';
import { SearchIntent } from '../../types';

interface ConversationalRefinementBarProps {
  currentIntent: SearchIntent | null;
  onRefine: (refinementText: string) => void;
  isLoading: boolean;
  resultCount?: number;
}

type SuggestionCategory = 'all' | 'rating_budget' | 'dietary' | 'vibe' | 'drinks';

interface SuggestionChip {
  label: string;
  query: string;
  category: 'rating_budget' | 'dietary' | 'vibe' | 'drinks';
}

export const ConversationalRefinementBar: React.FC<ConversationalRefinementBarProps> = ({
  currentIntent,
  onRefine,
  isLoading,
  resultCount,
}) => {
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SuggestionCategory>('all');

  if (!currentIntent) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading) return;
    onRefine(text.trim());
    setText('');
    // Keep console open so user can see active criteria and continue refining
  };

  const handleChipClick = (query: string) => {
    if (isLoading) return;
    onRefine(query);
    // Keep console open so user can multi-select and accumulate criteria!
  };

  // Compile active filters list
  const activeFilters: Array<{ id: string; label: string; removeQuery: string; badgeClass: string }> = [];

  if (currentIntent.foodItems && currentIntent.foodItems.length > 0) {
    currentIntent.foodItems.forEach(f => {
      activeFilters.push({
        id: `food-${f.name}`,
        label: `🍛 ${f.name}`,
        removeQuery: `Remove ${f.name}`,
        badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      });
    });
  }

  if (currentIntent.budget?.maximum) {
    const symbol = currentIntent.budget?.currency === 'USD' ? '$' :
      currentIntent.budget?.currency === 'GBP' ? '£' :
      currentIntent.budget?.currency === 'EUR' ? '€' :
      currentIntent.budget?.currency === 'AED' ? 'AED ' :
      currentIntent.budget?.currency === 'INR' ? '₹' :
      (currentIntent.budget?.currency || '');
    activeFilters.push({
      id: 'budget',
      label: `💰 Under ${symbol}${currentIntent.budget.maximum}`,
      removeQuery: 'Remove budget limit',
      badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    });
  }

  if (currentIntent.rating?.minimum) {
    activeFilters.push({
      id: 'rating',
      label: `⭐ ${currentIntent.rating.minimum}+`,
      removeQuery: 'Remove rating limit',
      badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    });
  }

  if (currentIntent.dietary && currentIntent.dietary.length > 0) {
    currentIntent.dietary.forEach(d => {
      activeFilters.push({
        id: `diet-${d}`,
        label: `🥗 ${d.charAt(0).toUpperCase() + d.slice(1)}`,
        removeQuery: `Remove ${d}`,
        badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
      });
    });
  }

  if (currentIntent.atmosphere && currentIntent.atmosphere.length > 0) {
    currentIntent.atmosphere.forEach(a => {
      activeFilters.push({
        id: `atmo-${a}`,
        label: `✨ ${a.charAt(0).toUpperCase() + a.slice(1)}`,
        removeQuery: `Remove ${a}`,
        badgeClass: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
      });
    });
  }

  if (currentIntent.features && currentIntent.features.length > 0) {
    currentIntent.features.forEach(f => {
      activeFilters.push({
        id: `feat-${f}`,
        label: `🌿 ${f.charAt(0).toUpperCase() + f.slice(1)}`,
        removeQuery: `Remove ${f}`,
        badgeClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
      });
    });
  }

  if (currentIntent.alcohol?.cocktails) {
    activeFilters.push({
      id: 'cocktails',
      label: '🍸 Cocktails',
      removeQuery: 'Remove cocktail',
      badgeClass: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    });
  }

  if (currentIntent.alcohol?.beer) {
    activeFilters.push({
      id: 'beer',
      label: '🍺 Craft Beer',
      removeQuery: 'Remove beer',
      badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    });
  }

  if (currentIntent.alcohol?.wine) {
    activeFilters.push({
      id: 'wine',
      label: '🍷 Wine',
      removeQuery: 'Remove wine',
      badgeClass: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    });
  }

  if (currentIntent.openNow) {
    activeFilters.push({
      id: 'opennow',
      label: '🟢 Open Now',
      removeQuery: 'Remove open now',
      badgeClass: 'border-green-500/40 bg-green-500/10 text-green-300',
    });
  }

  if (currentIntent.resultCount && currentIntent.resultCount < 10) {
    activeFilters.push({
      id: 'count',
      label: `🏆 ${currentIntent.resultCount === 1 ? 'Best 1 Only' : `Top ${currentIntent.resultCount}`}`,
      removeQuery: 'Show all',
      badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    });
  }

  // Build dynamic suggestions based on what is NOT already active in current intent
  const chips: SuggestionChip[] = [];

  // 1. Rating & Budget
  if (!currentIntent.rating?.minimum || currentIntent.rating.minimum < 4.5) {
    chips.push({ label: '⭐ Rating 4.5+', query: 'Rating 4.5+', category: 'rating_budget' });
  }
  if (!currentIntent.rating?.minimum || currentIntent.rating.minimum < 4.2) {
    chips.push({ label: '⭐ Rating 4.2+', query: 'Rating 4.2+', category: 'rating_budget' });
  }
  if (!currentIntent.budget?.maximum || currentIntent.budget.maximum > 500) {
    chips.push({ label: '💰 Budget-Friendly', query: 'Budget friendly options', category: 'rating_budget' });
  }
  if (!currentIntent.budget?.maximum || currentIntent.budget.maximum > 1000) {
    chips.push({ label: '💵 Moderate Price', query: 'Moderate price range', category: 'rating_budget' });
  }
  if (!currentIntent.atmosphere?.includes('fine dining')) {
    chips.push({ label: '🥂 Fine Dining', query: 'Fine dining luxury', category: 'rating_budget' });
  }

  // 2. Dietary
  if (!currentIntent.dietary?.includes('vegetarian')) {
    chips.push({ label: '🥗 Pure Veg', query: 'Pure vegetarian', category: 'dietary' });
  }
  if (!currentIntent.dietary?.includes('vegan')) {
    chips.push({ label: '🌱 Vegan', query: 'Vegan', category: 'dietary' });
  }
  if (!currentIntent.dietary?.includes('halal')) {
    chips.push({ label: '🥩 Halal Verified', query: 'Halal', category: 'dietary' });
  }

  // 3. Vibe & Setting
  if (!currentIntent.atmosphere?.includes('rooftop')) {
    chips.push({ label: '🌆 Rooftop', query: 'Rooftop', category: 'vibe' });
  }
  if (!currentIntent.atmosphere?.includes('romantic')) {
    chips.push({ label: '🕯 Romantic', query: 'Romantic atmosphere', category: 'vibe' });
  }
  if (!currentIntent.audience?.includes('family')) {
    chips.push({ label: '👨‍👩‍👧 Family Friendly', query: 'Family friendly', category: 'vibe' });
  }
  if (!currentIntent.features?.includes('outdoor seating')) {
    chips.push({ label: '🌿 Outdoor Seating', query: 'Outdoor seating', category: 'vibe' });
  }
  if (!currentIntent.atmosphere?.includes('quiet')) {
    chips.push({ label: '🤫 Quiet & Cozy', query: 'Quiet cafe', category: 'vibe' });
  }
  if (!currentIntent.atmosphere?.includes('luxury')) {
    chips.push({ label: '✨ Luxury Setting', query: 'Luxury', category: 'vibe' });
  }

  // 4. Drinks & Bar
  if (!currentIntent.alcohol?.beer) {
    chips.push({ label: '🍺 Craft Beer', query: 'Craft beer', category: 'drinks' });
  }
  if (!currentIntent.alcohol?.cocktails) {
    chips.push({ label: '🍸 Cocktails', query: 'Cocktails', category: 'drinks' });
  }
  if (!currentIntent.alcohol?.wine) {
    chips.push({ label: '🍷 Fine Wine', query: 'Wine', category: 'drinks' });
  }

  // 5. General / Results
  if (!currentIntent.openNow) {
    chips.push({ label: '🟢 Open Now', query: 'Open now', category: 'rating_budget' });
  }
  if (currentIntent.resultCount !== 1) {
    chips.push({ label: '🏆 Only 1 Best Match', query: 'Best one only', category: 'rating_budget' });
  }
  if (currentIntent.resultCount !== 3) {
    chips.push({ label: 'Show 3 Options', query: 'Show 3 options', category: 'rating_budget' });
  }
  if (currentIntent.resultCount !== 5) {
    chips.push({ label: 'Show 5 Options', query: 'Show 5 options', category: 'rating_budget' });
  }

  const filteredChips = activeCategory === 'all'
    ? chips
    : chips.filter(c => c.category === activeCategory);

  if (!isExpanded) {
    return (
      <div className="fixed bottom-5 right-6 z-40">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-surface-card/95 hover:bg-slate-900 border border-amber-500/40 rounded-full px-5 py-3 shadow-2xl backdrop-blur-xl ring-2 ring-amber-500/20 flex items-center gap-2.5 text-amber-400 hover:text-amber-300 transition-all cursor-pointer group hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="text-xs sm:text-sm font-black tracking-wide">Refine Search</span>
          {activeFilters.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/40">
              {activeFilters.length} active
            </span>
          )}
          {typeof resultCount === 'number' && (
            <span className="text-slate-400 text-xs font-medium">
              ({resultCount} places)
            </span>
          )}
          <ChevronUp className="w-4 h-4 text-amber-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 left-0 right-0 z-40 px-4 sm:px-6 pointer-events-none animate-slideUp">
      <div className="max-w-4xl mx-auto pointer-events-auto relative">
        <div className="bg-surface-card/98 border border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-2xl ring-2 ring-amber-500/20 space-y-3.5">
          {/* Header & Done Button */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-extrabold text-white">AI Search Refinement</h4>
                  {typeof resultCount === 'number' && (
                    <span className="text-[11px] font-bold text-amber-400">
                      • {resultCount} {resultCount === 1 ? 'place' : 'places'} found
                    </span>
                  )}
                  {isLoading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 ml-1" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Click chips or type to add/remove filters dynamically</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'rating_budget', label: '💰 Budget & Rating' },
                  { id: 'dietary', label: '🥗 Dietary' },
                  { id: 'vibe', label: '✨ Vibe' },
                  { id: 'drinks', label: '🍸 Drinks' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id as SuggestionCategory)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeCategory === cat.id
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-surface-dark text-slate-400 hover:text-white border border-surface-border'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* View Results / Close Button */}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          </div>

          {/* ACTIVE CRITERIA BAR (inside the console so user sees what is applied) */}
          {activeFilters.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-surface-dark/80 border border-surface-border/60">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                <span className="uppercase tracking-wider">Active Filters ({activeFilters.length}):</span>
                <button
                  type="button"
                  onClick={() => onRefine('Reset all filters')}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Clear All</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                {activeFilters.map(af => (
                  <span
                    key={af.id}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${af.badgeClass}`}
                  >
                    <span>{af.label}</span>
                    <button
                      type="button"
                      onClick={() => onRefine(af.removeQuery)}
                      disabled={isLoading}
                      className="text-slate-400 hover:text-white ml-0.5 text-sm leading-none cursor-pointer"
                      title={`Remove ${af.label}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestion Chips Scroll Area */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {filteredChips.length === 0 ? (
              <span className="text-xs text-slate-500 py-1">All standard options in this category are active</span>
            ) : (
              filteredChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip.query)}
                  disabled={isLoading}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-surface-dark hover:bg-slate-800 text-slate-200 hover:text-amber-300 border border-surface-border hover:border-amber-500/50 shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 active:scale-95"
                >
                  <span className="text-amber-400 font-bold">+</span>
                  <span className="font-semibold">{chip.label}</span>
                </button>
              ))
            )}
          </div>

          {/* Natural Language Refinement Form */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
            <div className="relative flex-1 flex items-center bg-surface-dark rounded-2xl px-3.5 py-2.5 border border-surface-border focus-within:border-amber-500/60 focus-within:ring-1 focus-within:ring-amber-500/30 transition-all">
              <MessageSquarePlus className="w-4 h-4 text-amber-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder='Type custom thought (e.g. "Only rooftop places under ₹1000", "Show top 3", "and kebabs")'
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <span>Refine</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
