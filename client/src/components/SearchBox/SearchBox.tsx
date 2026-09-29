import React, { useState } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';

interface SearchBoxProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const SUGGESTIONS = [
  { label: '🍛 Best Mutton Biryani', query: 'Best mutton biryani with high rating' },
  { label: '🍲 Spicy Biryani under ₹500', query: 'Spicy chicken biryani under ₹500 above 4.2 rating' },
  { label: '❤️ Romantic Rooftop', query: 'Romantic rooftop restaurant with cocktails and outdoor seating' },
  { label: '🍻 Pubs & Craft Beer', query: 'Find pubs with craft beer and live music' },
  { label: '👨‍👩‍👧 Authentic South Indian', query: 'Family restaurant with authentic South Indian food' },
  { label: '🌱 Pure Vegetarian', query: 'Highly rated pure vegetarian dining under ₹800' },
  { label: '🏆 Best Place for Dinner', query: 'Best restaurant for dinner' },
];

export const SearchBox: React.FC<SearchBoxProps> = ({
  onSearch,
  isLoading,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query.trim());
  };

  const handleSuggestionClick = (suggestionQuery: string) => {
    setQuery(suggestionQuery);
    onSearch(suggestionQuery);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Top Banner Tagline */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          Next-Gen Conversational Dining AI
        </span>
      </div>

      <h1 className="text-3xl sm:text-5xl font-extrabold text-center tracking-tight text-white mb-3">
        Discover your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400">next place</span>
      </h1>
      <p className="text-sm sm:text-base text-slate-400 text-center mb-8 max-w-xl mx-auto">
        Speak your mind in plain English. We extract taste, price, mood, alcohol, and verified seating in seconds.
      </p>

      {/* Main Search Input Form */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-orange-500/20 to-amber-500/30 rounded-3xl blur-lg opacity-60 group-hover:opacity-100 transition duration-500" />

        <div className="relative flex flex-col sm:flex-row items-center bg-surface-card/95 border border-surface-border rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center w-full px-3 py-2 flex-1">
            <Search className="w-5 h-5 text-amber-400 shrink-0 mr-3" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search what you're craving (e.g. “best mutton biryani in Tirupati”)..."
              className="w-full bg-transparent text-white placeholder-slate-500 text-base sm:text-lg focus:outline-none"
              disabled={isLoading}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-border sm:border-l sm:pl-3 justify-end">
            {/* Submit Button */}
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm tracking-wide shadow-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Suggested Quick Chips */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-slate-500 font-medium mr-1">Popular searches:</span>
        {SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSuggestionClick(item.query)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full bg-surface-card hover:bg-surface-hover text-slate-300 hover:text-amber-300 border border-surface-border hover:border-amber-500/30 transition-all duration-150 cursor-pointer shadow-sm"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
