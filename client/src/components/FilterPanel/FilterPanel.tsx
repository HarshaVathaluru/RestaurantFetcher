import React from 'react';
import { SlidersHorizontal, Star, Wine, Beer, Clock, DollarSign, X } from 'lucide-react';
import { SearchIntent } from '../../types';

interface FilterPanelProps {
  intent: SearchIntent | null;
  onUpdateFilters: (updatedIntent: SearchIntent) => void;
  onReset: () => void;
  totalResults: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  intent,
  onUpdateFilters,
  onReset,
  totalResults,
}) => {
  if (!intent) return null;

  const currentMinRating = intent.rating?.minimum || 0;
  const currentMaxBudget = intent.budget?.maximum;
  const alcohol = intent.alcohol;
  const openNow = intent.openNow;

  const handleRatingChange = (val: number) => {
    onUpdateFilters({
      ...intent,
      rating: val === currentMinRating ? undefined : { minimum: val },
    });
  };

  const handleBudgetChange = (max: number | undefined) => {
    onUpdateFilters({
      ...intent,
      budget: max ? { maximum: max, currency: 'INR' } : undefined,
    });
  };

  const toggleAlcohol = (type: 'beer' | 'wine' | 'cocktails') => {
    const updated = {
      ...alcohol,
      [type]: !alcohol[type],
    };
    updated.required = updated.beer || updated.wine || updated.cocktails;
    onUpdateFilters({
      ...intent,
      alcohol: updated,
    });
  };

  const toggleOpenNow = () => {
    onUpdateFilters({
      ...intent,
      openNow: !openNow,
    });
  };

  const toggleDietary = (diet: string) => {
    const current = intent.dietary || [];
    const exists = current.includes(diet);
    onUpdateFilters({
      ...intent,
      dietary: exists ? current.filter(d => d !== diet) : [...current, diet],
    });
  };

  const toggleAtmosphere = (atmo: string) => {
    const current = intent.atmosphere || [];
    const exists = current.includes(atmo);
    onUpdateFilters({
      ...intent,
      atmosphere: exists ? current.filter(a => a !== atmo) : [...current, atmo],
    });
  };

  return (
    <div className="bg-surface-card p-5 rounded-3xl border border-surface-border space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-sm text-white">Active Intent & Filters</h3>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Minimum Rating */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Minimum Rating
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 4.0, 4.2, 4.5].map(val => (
            <button
              key={val}
              type="button"
              onClick={() => handleRatingChange(val)}
              className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all ${
                (val === 0 && currentMinRating === 0) || (val > 0 && currentMinRating === val)
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                  : 'bg-surface-dark text-slate-300 border-surface-border hover:border-slate-700'
              }`}
            >
              {val === 0 ? 'Any' : `${val}+ ★`}
            </button>
          ))}
        </div>
      </div>

      {/* Budget / Price Ceiling */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Budget Ceiling
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Any', val: undefined },
            { label: '≤ ₹500', val: 500 },
            { label: '≤ ₹1000', val: 1000 },
            { label: '≤ ₹1500', val: 1500 },
            { label: '≤ ₹2500', val: 2500 },
            { label: 'Fine Dine', val: 4000 },
          ].map((b, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleBudgetChange(b.val)}
              className={`py-1.5 px-2 text-xs font-semibold rounded-xl border transition-all ${
                currentMaxBudget === b.val
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                  : 'bg-surface-dark text-slate-300 border-surface-border hover:border-slate-700'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Dietary Requirements
        </label>
        <div className="flex flex-wrap gap-1.5">
          {['vegetarian', 'vegan', 'halal'].map(diet => {
            const active = intent.dietary?.includes(diet);
            return (
              <button
                key={diet}
                type="button"
                onClick={() => toggleDietary(diet)}
                className={`py-1 px-3 text-xs rounded-full border transition-all capitalize ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                    : 'bg-surface-dark text-slate-400 border-surface-border hover:text-slate-200'
                }`}
              >
                {diet}
              </button>
            );
          })}
        </div>
      </div>

      {/* Atmosphere / Mood */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Atmosphere & Setting
        </label>
        <div className="flex flex-wrap gap-1.5">
          {['rooftop', 'romantic', 'family', 'outdoor seating', 'quiet', 'luxury'].map(atmo => {
            const active = intent.atmosphere?.includes(atmo) || intent.features?.includes(atmo) || intent.audience?.includes(atmo);
            return (
              <button
                key={atmo}
                type="button"
                onClick={() => toggleAtmosphere(atmo)}
                className={`py-1 px-3 text-xs rounded-full border transition-all capitalize ${
                  active
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-surface-dark text-slate-400 border-surface-border hover:text-slate-200'
                }`}
              >
                {atmo}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alcohol & Bar Options */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Bar & Drinks (Verified only)
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => toggleAlcohol('cocktails')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1 transition-all ${
              alcohol.cocktails
                ? 'bg-purple-500 text-white border-purple-400'
                : 'bg-surface-dark text-slate-400 border-surface-border hover:text-slate-200'
            }`}
          >
            <Wine className="w-3 h-3" /> Cocktails
          </button>
          <button
            type="button"
            onClick={() => toggleAlcohol('beer')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1 transition-all ${
              alcohol.beer
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-surface-dark text-slate-400 border-surface-border hover:text-slate-200'
            }`}
          >
            <Beer className="w-3 h-3" /> Beer
          </button>
          <button
            type="button"
            onClick={() => toggleAlcohol('wine')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1 transition-all ${
              alcohol.wine
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-surface-dark text-slate-400 border-surface-border hover:text-slate-200'
            }`}
          >
            Wine
          </button>
        </div>
      </div>

      {/* Open Now Toggle */}
      <div className="pt-2 border-t border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white">Open Now Only</span>
        </div>
        <button
          type="button"
          onClick={toggleOpenNow}
          className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
            openNow ? 'bg-emerald-500' : 'bg-slate-800'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
              openNow ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
